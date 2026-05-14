from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, HttpUrl, EmailStr, Field
from typing import Optional
import os
import requests
from bs4 import BeautifulSoup
import re
import math
import random
import httpx
import psutil
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from playwright.async_api import async_playwright
import asyncio
from playwright_stealth import stealth_async

import database
import email_service

scheduler = AsyncIOScheduler()
task_error_counts = {}
concerts_cache = {"data": [], "expires": None}
scrape_lock = asyncio.Lock()
notifications_cache = []

MAX_CONCURRENT_TASKS = 5

class BrowserManager:
    _instance = None
    _browser = None
    _playwright = None

    @classmethod
    async def get_browser(cls):
        if cls._browser is None:
            cls._playwright = await async_playwright().start()
            cls._browser = await cls._playwright.chromium.launch(
                headless=True,
                args=[
                    "--disable-gpu",
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                ]
            )
        return cls._browser

    @classmethod
    async def close(cls):
        if cls._browser:
            await cls._browser.close()
            cls._browser = None
        if cls._playwright:
            await cls._playwright.stop()
            cls._playwright = None

    @classmethod
    def get_page_count(cls):
        count = 0
        if cls._browser:
            for context in cls._browser.contexts:
                count += len(context.pages)
        return count

async def block_resources(route):
    if route.request.resource_type in ["image", "stylesheet", "font", "media"]:
        await route.abort()
    else:
        await route.continue_()

async def check_ticket_status(task_id: int, url: str, to_email: str):
    try:
        async with scrape_lock:
            browser = await BrowserManager.get_browser()
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 800},
                locale="zh-TW"
            )
            try:
                await context.route("**/*", block_resources)
                page = await context.new_page()
                await stealth_async(page)
                
                ticket_found = False
                
                async def handle_response(response):
                    nonlocal ticket_found
                    if "api/v1/tickets" in response.url or "ticket" in response.url.lower() or "events" in response.url.lower():
                        if "application/json" in response.headers.get("content-type", ""):
                            try:
                                json_data = await response.json()
                                def check_purchasable(data):
                                    if isinstance(data, dict):
                                        status = data.get("status")
                                        if status in ["available", "on_sale", "purchasable", True, 1, "1", "OK", "BUY", "立即購票"]:
                                            return True
                                        for v in data.values():
                                            if check_purchasable(v): return True
                                    elif isinstance(data, list):
                                        for item in data:
                                            if check_purchasable(item): return True
                                    return False
                                if check_purchasable(json_data):
                                    ticket_found = True
                            except Exception:
                                pass

                page.on("response", handle_response)
                
                response = await page.goto(url, wait_until="networkidle", timeout=15000)
                await asyncio.sleep(random.uniform(2, 5))
                
                if response and response.status in [403, 429]:
                    task_error_counts[task_id] = task_error_counts.get(task_id, 0) + 1
                    if task_error_counts[task_id] >= 3:
                        print(f"[Task {task_id}] 遭到封鎖 ({response.status}) 達 3 次，將下次檢查延後 30 分鐘。")
                        next_run = datetime.now() + timedelta(seconds=1800)
                    else:
                        print(f"[Task {task_id}] 遭到封鎖 ({response.status})，累計 {task_error_counts[task_id]} 次。")
                        next_run = datetime.now() + timedelta(seconds=random.randint(30, 90))
                    
                    scheduler.add_job(
                        check_ticket_status,
                        'date',
                        run_date=next_run,
                        args=[task_id, url, to_email],
                        id=f"task_{task_id}",
                        replace_existing=True
                    )
                    return

                title = await page.title()
                
                if ticket_found:
                    print(f"[Task {task_id}] 偵測到釋票特徵！寄送通知並停止監控。")
                    email_service.send_ticket_alert(to_email, url)
                    
                    notifications_cache.append({
                        "id": f"notif_{task_id}_{int(datetime.now().timestamp())}",
                        "task_id": task_id,
                        "title": title or "未知活動",
                        "time": "請至購票網頁查看",
                        "url": url,
                        "timestamp": datetime.now().isoformat()
                    })
                    
                    db = database.SessionLocal()
                    try:
                        db_task = db.query(database.Task).filter(database.Task.id == task_id).first()
                        if db_task:
                            db_task.status = "已通知"
                            db.commit()
                    finally:
                        db.close()
                        
                    if task_id in task_error_counts:
                        del task_error_counts[task_id]
                    return
                else:
                    task_error_counts[task_id] = 0
                    next_run = datetime.now() + timedelta(seconds=random.randint(30, 90))
                    print(f"[Task {task_id}] 未偵測到票券，下次檢查時間: {next_run.strftime('%H:%M:%S')}")
                    scheduler.add_job(
                        check_ticket_status,
                        'date',
                        run_date=next_run,
                        args=[task_id, url, to_email],
                        id=f"task_{task_id}",
                        replace_existing=True
                    )
            finally:
                await context.close()

    except Exception as e:
        print(f"[Task {task_id}] Playwright Scraper 例外錯誤: {e}")
        next_run = datetime.now() + timedelta(seconds=random.randint(30, 90))
        scheduler.add_job(
            check_ticket_status,
            'date',
            run_date=next_run,
            args=[task_id, url, to_email],
            id=f"task_{task_id}",
            replace_existing=True
        )

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting APScheduler...")
    scheduler.start()
    
    # Optional: 可以從資料庫讀取 status="監控中" 的任務並重新加入排程
    db = database.SessionLocal()
    try:
        active_tasks = db.query(database.Task).filter(database.Task.status == "監控中").all()
        for t in active_tasks:
            # 隨機 5~300 秒內錯開啟動，避免伺服器重啟時同時發送大量請求
            start_delay = random.randint(5, 300)
            scheduler.add_job(
                check_ticket_status,
                'date',
                run_date=datetime.now() + timedelta(seconds=start_delay),
                args=[t.id, t.url, t.email],
                id=f"task_{t.id}",
                replace_existing=True
            )
        print(f"Resumed {len(active_tasks)} active tasks.")
    finally:
        db.close()
        
    yield
    print("Shutting down APScheduler and Browser...")
    scheduler.shutdown()
    await BrowserManager.close()

app = FastAPI(title="Tickety Backend API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

class TaskCreate(BaseModel):
    url: HttpUrl
    email: EmailStr
    venue: Optional[str] = None
    departure: Optional[str] = None
    budget: Optional[int] = Field(None, ge=0)
    needsAccommodation: bool = False

@app.get("/api/reverse-geocode")
def reverse_geocode(lat: float, lng: float):
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Google Maps API Key not configured")
        
    url = f"https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lng}&key={api_key}&language=zh-TW"
    try:
        res = requests.get(url, timeout=5)
        data = res.json()
        if data.get("status") == "OK" and data.get("results"):
            return {"address": data["results"][0]["formatted_address"]}
        else:
            raise HTTPException(status_code=400, detail="無法解析該座標的地址")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/debug/stats")
def get_debug_stats():
    process = psutil.Process(os.getpid())
    mem = process.memory_info()
    return {
        "cpu_percent": process.cpu_percent(interval=0.1),
        "memory_info": {
            "rss": mem.rss,
            "vms": mem.vms
        },
        "playwright_pages_count": BrowserManager.get_page_count()
    }

@app.get("/api/notifications")
def get_notifications():
    # Return last 20 notifications
    return notifications_cache[-20:]

@app.get("/api/concerts")
async def get_concerts():
    global concerts_cache
    if concerts_cache["data"] and concerts_cache["expires"] and datetime.now() < concerts_cache["expires"]:
        return concerts_cache["data"]
        
    url = "https://kktix.com/events"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=15)
            if resp.status_code != 200:
                print(f"KKTIX returned status code: {resp.status_code}")
                return []
                
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # KKTIX usually has events in li within ul
            # We'll select up to 12 events
            events = soup.select('ul.events-list li, ul.ticket-list li, div.event-wrapper, li.event-list-item')
            if not events:
                # Fallback generic selection for KKTIX
                events = soup.select('a.thumbnail, a[href*="/events/"]')
                
            events = events[:12]
            
            results = []
            for event in events:
                try:
                    # Parse link
                    if event.name == 'a':
                        link_elem = event
                    else:
                        link_elem = event.find('a')
                    
                    if not link_elem:
                        continue
                        
                    link = link_elem.get('href', '#')
                    if link.startswith('/'):
                        link = f"https://kktix.com{link}"
                        
                    # Parse Title
                    title_elem = event.select_one('h2, .title, .event-title, h3')
                    if not title_elem and event.name == 'a':
                        title_elem = event.select_one('h2, h3, .title') or event
                    
                    # Ensure title is a string
                    if title_elem and title_elem.text:
                        title = title_elem.text.strip()
                    elif link_elem.get('title'):
                        title = link_elem.get('title').strip()
                    else:
                        title = "KKTIX 精彩活動"
                        
                    # Parse Date
                    date_elem = event.select_one('.date, .time, time')
                    date_str = date_elem.text.strip() if date_elem else "即將公佈"
                    
                    # Parse Venue (KKTIX often combines it or puts it in .location)
                    venue_elem = event.select_one('.location, .venue')
                    venue = venue_elem.text.strip() if venue_elem else "地點詳見官網"
                    
                    # Parse Image
                    img_elem = event.find('img')
                    if img_elem:
                        img_url = img_elem.get('src') or img_elem.get('data-src') or "https://via.placeholder.com/400x200?text=No+Image"
                    else:
                        # Sometimes it's a background image in a div
                        bg_elem = event.select_one('.cover, .image, figure')
                        if bg_elem and bg_elem.get('style') and 'url(' in bg_elem.get('style'):
                            style = bg_elem.get('style')
                            img_url = style.split('url(')[1].split(')')[0].strip('"\'')
                        else:
                            img_url = "https://via.placeholder.com/400x200?text=No+Image"
                    
                    # Filter out purely navigational links
                    if len(title) > 2 and "/events" in link:
                        results.append({
                            "title": title,
                            "venue": venue,
                            "date": date_str,
                            "url": link,
                            "imageUrl": img_url
                        })
                except Exception as ex:
                    print(f"Error parsing KKTIX concert card: {ex}")
                    continue
            
            # Ensure unique results based on URL
            unique_results = {r['url']: r for r in results}.values()
            results = list(unique_results)[:12]
                    
            if results:
                concerts_cache["data"] = results
                concerts_cache["expires"] = datetime.now() + timedelta(hours=12)
                
            return results
    except Exception as e:
        print(f"Failed to scrape concerts: {e}")
        return []

@app.post("/tasks")
async def create_task(task_data: TaskCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # 檢查是否超過並行任務上限
    active_tasks_count = db.query(database.Task).filter(database.Task.status == "監控中").count()
    if active_tasks_count >= MAX_CONCURRENT_TASKS:
        raise HTTPException(status_code=400, detail="伺服器負載已滿")

    # Save to database
    db_task = database.Task(
        url=str(task_data.url),
        email=task_data.email,
        departure=task_data.departure,
        budget=task_data.budget,
        needs_accommodation=task_data.needsAccommodation,
        status="監控中"
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    # Send confirmation email in background
    background_tasks.add_task(email_service.send_task_created_email, db_task.email, str(db_task.url))

    # 將任務加入背景排程 (首次執行設在 5 ~ 60 秒內隨機，之後由 check_ticket_status 遞迴排程)
    first_run_delay = random.randint(5, 60)
    scheduler.add_job(
        check_ticket_status,
        'date',
        run_date=datetime.now() + timedelta(seconds=first_run_delay),
        args=[db_task.id, db_task.url, db_task.email],
        id=f"task_{db_task.id}",
        replace_existing=True
    )
    print(f"[Task {db_task.id}] 任務建立成功，首次檢查預計於 {first_run_delay} 秒後啟動。")

    async def scrape_venue_from_tixcraft(url: str) -> str:
        default_venue = "台北流行音樂中心" # Fallback venue
        try:
            browser = await BrowserManager.get_browser()
            context = await browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
            try:
                await context.route("**/*", block_resources)
                page = await context.new_page()
                
                # 等待 networkidle 確保 JS 已經渲染完成
                await page.goto(url, wait_until="networkidle", timeout=15000)
                
                # 擷取頁面內容
                title = await page.title()
                content = await page.content()
                
                # 尋找場地資訊
                if "高雄巨蛋" in title or "高雄巨蛋" in content or "K-Arena" in title:
                    return "高雄巨蛋"
                if "台北小巨蛋" in title or "台北小巨蛋" in content or "Taipei Arena" in title:
                    return "台北小巨蛋"
                if "世運主場館" in title or "世運主場館" in content or "National Stadium" in title:
                    return "高雄世運主場館"
                if "台北流行音樂中心" in title or "台北流行音樂中心" in content or "Taipei Music Center" in title:
                    return "台北流行音樂中心"
                    
                return default_venue
            finally:
                # 確保資源釋放避免 Memory Leak
                await context.close()
        except Exception as e:
            print(f"Playwright scrape error: {e}")
            return default_venue

    if task_data.venue and task_data.venue.strip():
        parsed_venue = task_data.venue.strip()
        print(f"使用者手動填寫場館名稱: {parsed_venue}")
    else:
        parsed_venue = await scrape_venue_from_tixcraft(task_data.url)
        print(f"爬蟲抓到的場館名稱: {parsed_venue}")

    def get_real_accommodations(venue_name: str) -> list:
        api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
        if not api_key:
            return []
        try:
            # 1. Geocoding
            geocode_url = f"https://maps.googleapis.com/maps/api/geocode/json?address={venue_name}&key={api_key}"
            geo_res = requests.get(geocode_url, timeout=5)
            geo_data = geo_res.json()
            
            if geo_data.get("status") != "OK" or not geo_data.get("results"):
                return []
                
            location = geo_data["results"][0]["geometry"]["location"]
            lat, lng = location["lat"], location["lng"]
            print(f"轉換後的經緯度: {lat}, {lng}")
            
            # 2. Places API (Nearby Lodging)
            places_url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lng}&radius=1000&type=lodging&key={api_key}"
            places_res = requests.get(places_url, timeout=5)
            places_data = places_res.json()
            
            if places_data.get("status") != "OK":
                return []
                
            def haversine(lat1, lon1, lat2, lon2):
                R = 6371000  # Earth radius in meters
                phi1, phi2 = math.radians(lat1), math.radians(lat2)
                delta_phi = math.radians(lat2 - lat1)
                delta_lambda = math.radians(lon2 - lon1)
                a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
                return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

            hotels = []
            for place in places_data.get("results", [])[:3]:
                hotel_lat = place.get("geometry", {}).get("location", {}).get("lat", lat)
                hotel_lng = place.get("geometry", {}).get("location", {}).get("lng", lng)
                dist_m = haversine(lat, lng, hotel_lat, hotel_lng)
                
                if dist_m < 1000:
                    dist_str = f"約 {int(dist_m)} 公尺"
                else:
                    dist_str = f"約 {dist_m/1000:.1f} 公里"

                hotels.append({
                    "id": place.get("place_id"),
                    "name": place.get("name", "Unknown Hotel"),
                    "rating": place.get("rating", "N/A"),
                    "reviews": place.get("user_ratings_total", 0),
                    "distance": dist_str,
                    "price": "依官網為準"
                })
            return hotels
        except Exception as e:
            print(f"Error fetching Google Maps API: {e}")
            return []

    def get_real_transits(venue_name: str, departure: str) -> list:
        if not departure:
            return []
        api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
        if not api_key:
            return []
            
        try:
            url = f"https://maps.googleapis.com/maps/api/directions/json?origin={departure}&destination={venue_name}&mode=transit&language=zh-TW&key={api_key}"
            res = requests.get(url, timeout=5)
            data = res.json()
            
            if data.get("status") != "OK":
                return []
                
            leg = data["routes"][0]["legs"][0]
            duration = leg.get("duration", {}).get("text", "未知")
            
            fare_obj = data["routes"][0].get("fare")
            if fare_obj and "value" in fare_obj:
                fare = f"NT$ {fare_obj['value']}"
            else:
                fare = "請洽官網"
            
            full_steps = []
            for step in leg.get("steps", []):
                mode = step.get("travel_mode", "UNKNOWN")
                instruction = re.sub(r'<[^>]+>', '', step.get("html_instructions", ""))
                step_duration = step.get("duration", {}).get("text", "")
                
                step_info = {
                    "mode": mode,
                    "instruction": instruction,
                    "duration": step_duration
                }
                if mode == "TRANSIT":
                    transit_details = step.get("transit_details", {})
                    line_name = transit_details.get("line", {}).get("short_name") or transit_details.get("line", {}).get("name", "")
                    vehicle = transit_details.get("line", {}).get("vehicle", {}).get("name", "")
                    step_info["line"] = f"{vehicle} {line_name}".strip()
                    step_info["num_stops"] = transit_details.get("num_stops", 0)
                
                full_steps.append(step_info)
                
            return [{
                "id": 1,
                "title": "大眾運輸路線規劃",
                "description": "查看下方完整轉乘步驟",
                "duration": duration,
                "cost": fare,
                "full_steps": full_steps
            }]
        except Exception as e:
            print(f"Error fetching Google Directions API: {e}")
            return []

    # Get real recommendations if needed
    mock_accommodations = get_real_accommodations(parsed_venue) if task_data.needsAccommodation else []
    
    # Get real transit route
    mock_transits = get_real_transits(parsed_venue, task_data.departure)

    return {
        "id": db_task.id,
        "url": db_task.url,
        "email": db_task.email,
        "departure": db_task.departure,
        "budget": db_task.budget,
        "needsAccommodation": db_task.needs_accommodation,
        "status": db_task.status,
        "createdAt": db_task.created_at.isoformat() + "Z",
        "venue": parsed_venue,
        "accommodations": mock_accommodations,
        "transits": mock_transits
    }
