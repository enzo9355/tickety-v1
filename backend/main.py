from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import os
import requests
from bs4 import BeautifulSoup
import re
import math
import random
import httpx
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from playwright.async_api import async_playwright

import database
import email_service

scheduler = AsyncIOScheduler()
task_error_counts = {}
concerts_cache = {"data": [], "expires": None}

async def check_ticket_status(task_id: int, url: str, to_email: str):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": "https://www.google.com/"
    }
    keywords = ["立即購票", "加入購物車", "熱賣中", "Buy Now", "Add to Cart", "尚有餘票"]
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=10)
            
            if resp.status_code in [403, 429]:
                task_error_counts[task_id] = task_error_counts.get(task_id, 0) + 1
                if task_error_counts[task_id] >= 3:
                    print(f"[Task {task_id}] 遭到封鎖 ({resp.status_code}) 達 3 次，將下次檢查延後 30 分鐘。")
                    next_run = datetime.now() + timedelta(seconds=1800)
                else:
                    print(f"[Task {task_id}] 遭到封鎖 ({resp.status_code})，累計 {task_error_counts[task_id]} 次。")
                    next_run = datetime.now() + timedelta(seconds=random.randint(300, 600))
                
                scheduler.add_job(
                    check_ticket_status,
                    'date',
                    run_date=next_run,
                    args=[task_id, url, to_email],
                    id=f"task_{task_id}",
                    replace_existing=True
                )
                return

            text = resp.text
            found = any(kw in text for kw in keywords)
            if found:
                print(f"[Task {task_id}] 偵測到釋票關鍵字！寄送通知並停止監控。")
                email_service.send_ticket_alert(to_email, url)
                
                # 更新資料庫狀態
                db = database.SessionLocal()
                try:
                    db_task = db.query(database.Task).filter(database.Task.id == task_id).first()
                    if db_task:
                        db_task.status = "已通知"
                        db.commit()
                finally:
                    db.close()
                    
                # 不再排程，監控結束
                if task_id in task_error_counts:
                    del task_error_counts[task_id]
                return
            else:
                # 沒找到，正常隨機排程下次
                task_error_counts[task_id] = 0 # 重置錯誤
                next_run = datetime.now() + timedelta(seconds=random.randint(300, 600))
                print(f"[Task {task_id}] 未偵測到票券，下次檢查時間: {next_run.strftime('%H:%M:%S')}")
                scheduler.add_job(
                    check_ticket_status,
                    'date',
                    run_date=next_run,
                    args=[task_id, url, to_email],
                    id=f"task_{task_id}",
                    replace_existing=True
                )

    except Exception as e:
        print(f"[Task {task_id}] Scraper 例外錯誤: {e}")
        # 發生錯誤也隨機排程，避免 scheduler 崩潰
        next_run = datetime.now() + timedelta(seconds=random.randint(300, 600))
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
    print("Shutting down APScheduler...")
    scheduler.shutdown()

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
    url: str
    email: str
    venue: Optional[str] = None
    departure: Optional[str] = None
    budget: Optional[str] = None
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

@app.get("/api/concerts")
async def get_concerts():
    global concerts_cache
    if concerts_cache["data"] and concerts_cache["expires"] and datetime.now() < concerts_cache["expires"]:
        return concerts_cache["data"]
        
    url = "https://event.kkbox.com/tw/genre/concert"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=10)
            if resp.status_code != 200:
                return []
                
            soup = BeautifulSoup(resp.text, 'html.parser')
            events = soup.find_all('div', class_='event-card', limit=6)
            
            # If standard class isn't found, try typical structure for KKBOX events
            if not events:
                events = soup.select('.EventCard_eventCard__3TzL8')[:6]
                if not events:
                     events = soup.select('.event-item')[:6]
                     if not events:
                         events = soup.select('a[href*="/tw/event/"]')[:6]
            
            results = []
            for event in events:
                try:
                    title_elem = event.select_one('.title, .EventCard_title__1dZ4X, h3')
                    title = title_elem.text.strip() if title_elem else "未知活動"
                    
                    venue_elem = event.select_one('.location, .EventCard_location__2G_bV, .venue')
                    venue = venue_elem.text.strip() if venue_elem else "未知場地"
                    
                    date_elem = event.select_one('.date, .EventCard_date__1XU1k, .time')
                    date_str = date_elem.text.strip() if date_elem else "即將公佈"
                    
                    # Ensure event is a tag before accessing attrs
                    if event.name == 'a':
                        link = event.get('href', '#')
                    else:
                        link_elem = event.find('a')
                        link = link_elem.get('href', '#') if link_elem else '#'
                        
                    if link.startswith('/'):
                        link = f"https://event.kkbox.com{link}"
                        
                    img_elem = event.find('img')
                    img_url = img_elem.get('src') if img_elem else "https://via.placeholder.com/400x200?text=No+Image"
                    
                    # Only add if title is meaningful
                    if title != "未知活動":
                        results.append({
                            "title": title,
                            "venue": venue,
                            "date": date_str,
                            "url": link,
                            "imageUrl": img_url
                        })
                except Exception as ex:
                    print(f"Error parsing concert card: {ex}")
                    continue
                    
            if results:
                concerts_cache["data"] = results
                concerts_cache["expires"] = datetime.now() + timedelta(hours=12)
                
            return results
    except Exception as e:
        print(f"Failed to scrape concerts: {e}")
        return []

@app.post("/tasks")
async def create_task(task_data: TaskCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    budget_val = None
    if task_data.budget and str(task_data.budget).isdigit():
        budget_val = int(task_data.budget)

    # Save to database
    db_task = database.Task(
        url=task_data.url,
        email=task_data.email,
        departure=task_data.departure,
        budget=budget_val,
        needs_accommodation=task_data.needsAccommodation,
        status="監控中"
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    # Send confirmation email in background
    background_tasks.add_task(email_service.send_task_created_email, db_task.email, db_task.url)

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
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
                page = await context.new_page()
                try:
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
                    await page.close()
                    await browser.close()
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
