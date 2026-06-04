from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, HttpUrl, EmailStr, Field
from typing import Optional
import secrets
import uuid
import os
import re
import math
import random
import httpx
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio

import database
import email_service

scheduler = AsyncIOScheduler()
task_error_counts = {}
notifications_cache = []

MAX_CONCURRENT_TASKS = 5

# --- Lightweight HTTP-based ticket checker (no Playwright/Chromium) ---

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
}

async def check_ticket_status(task_id: int, url: str, to_email: str):
    """Lightweight ticket checker using httpx instead of Playwright."""
    try:
        ticket_found = False
        found_tickets_data = []

        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=15) as client:
            resp = await client.get(url)

            if resp.status_code in (403, 429):
                task_error_counts[task_id] = task_error_counts.get(task_id, 0) + 1
                if task_error_counts[task_id] >= 3:
                    print(f"[Task {task_id}] 遭到封鎖 ({resp.status_code}) 達 3 次，延後 30 分鐘。")
                    delay = 1800
                else:
                    print(f"[Task {task_id}] 遭到封鎖 ({resp.status_code})，累計 {task_error_counts[task_id]} 次。")
                    delay = random.randint(60, 180)

                scheduler.add_job(
                    check_ticket_status, 'date',
                    run_date=datetime.now() + timedelta(seconds=delay),
                    args=[task_id, url, to_email],
                    id=f"task_{task_id}", replace_existing=True
                )
                return

            soup = BeautifulSoup(resp.text, 'html.parser')
            title = soup.title.string.strip() if soup.title and soup.title.string else "未知活動"
            plain_text = soup.get_text(separator=' ')

            # === Pattern 1: tixcraft — "X seat(s) remaining" ===
            remaining_en = re.findall(
                r'(\d+)\s*seat\(s\)\s*remaining',
                plain_text
            )
            if remaining_en:
                ticket_found = True
                for seats in remaining_en:
                    found_tickets_data.append({
                        "zone": "", "price": 0, "remaining": int(seats)
                    })
                print(f"[Task {task_id}] 偵測到 {len(remaining_en)} 筆 (seat(s) remaining)")

            # === Pattern 2: tixcraft — "剩餘 X" (Chinese locale) ===
            if not ticket_found:
                remaining_zh = re.findall(r'剩餘\s*(\d+)', plain_text)
                if remaining_zh:
                    ticket_found = True
                    for seats in remaining_zh:
                        found_tickets_data.append({
                            "zone": "", "price": 0, "remaining": int(seats)
                        })
                    print(f"[Task {task_id}] 偵測到 {len(remaining_zh)} 筆 (剩餘模式)")

            # === Pattern 3: tixcraft — "Available" keyword ===
            if not ticket_found:
                avail_count = plain_text.count('Available')
                if avail_count > 0 and 'Sold out' in plain_text:
                    # Page has both available and sold out — real ticket area page
                    ticket_found = True
                    found_tickets_data.append({
                        "zone": "多區域", "price": 0, "remaining": avail_count
                    })
                    print(f"[Task {task_id}] 偵測到 {avail_count} 區可購 (Available)")

            # === Pattern 4: KKTIX — parse ticket JSON in page ===
            if not ticket_found and "kktix" in url.lower():
                inventory_match = re.findall(r'"inventory"\s*:\s*(\d+)', resp.text)
                if inventory_match:
                    total = sum(int(x) for x in inventory_match)
                    if total > 0:
                        ticket_found = True
                        found_tickets_data.append({
                            "zone": "KKTIX", "price": 0, "remaining": total
                        })
                        print(f"[Task {task_id}] KKTIX inventory 偵測到 {total} 張")

            # === Pattern 5: Generic buy keywords ===
            if not ticket_found:
                for kw in ["立即購票", "加入購物車", "選擇座位", "Buy Now"]:
                    if kw in plain_text:
                        ticket_found = True
                        found_tickets_data.append({
                            "zone": "", "price": 0, "remaining": 1
                        })
                        print(f"[Task {task_id}] 偵測到購票關鍵字: {kw}")
                        break

        # --- Process results ---
        if ticket_found:
            print(f"[Task {task_id}] 偵測到釋票特徵！寄送通知。")
            email_service.send_ticket_alert(to_email, url)

            db = database.SessionLocal()
            try:
                now = datetime.now()
                if found_tickets_data:
                    for td in found_tickets_data:
                        z = td.get("zone", "")
                        p = td.get("price", 0)
                        r = td.get("remaining", 1)
                        raw = f"{z} 剩餘 {r}" if z else f"偵測到 {r} 張可購票券"
                        db.add(database.TicketRecord(
                            task_id=task_id, zone=z or None,
                            price=p, remaining=r,
                            raw_text=raw, detected_at=now
                        ))
                else:
                    db.add(database.TicketRecord(
                        task_id=task_id, zone=None, price=None,
                        remaining=None, raw_text="偵測到可購買票券", detected_at=now
                    ))

                db_task = db.query(database.Task).filter(database.Task.id == task_id).first()
                if db_task:
                    db_task.status = "已通知"
                db.commit()
            finally:
                db.close()

            notifications_cache.append({
                "id": f"notif_{task_id}_{int(datetime.now().timestamp())}",
                "task_id": task_id, "title": title,
                "time": "請至購票網頁查看", "url": url,
                "timestamp": datetime.now().isoformat()
            })
            task_error_counts.pop(task_id, None)
            return

        # Not found — schedule next check
        task_error_counts[task_id] = 0
        delay = random.randint(30, 90)
        print(f"[Task {task_id}] 未偵測到票券，{delay}s 後再檢查。")
        scheduler.add_job(
            check_ticket_status, 'date',
            run_date=datetime.now() + timedelta(seconds=delay),
            args=[task_id, url, to_email],
            id=f"task_{task_id}", replace_existing=True
        )

    except Exception as e:
        print(f"[Task {task_id}] 檢查例外: {e}")
        scheduler.add_job(
            check_ticket_status, 'date',
            run_date=datetime.now() + timedelta(seconds=random.randint(60, 120)),
            args=[task_id, url, to_email],
            id=f"task_{task_id}", replace_existing=True
        )


# --- Lightweight venue detection from page HTML ---

async def detect_venue_from_url(url: str) -> str:
    """Extract venue name from page title/body via HTTP (no browser)."""
    fallback = "活動場館"
    try:
        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=10) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return fallback

            text = resp.text[:20000]  # Only scan first 20KB for speed
            venues = [
                "高雄巨蛋", "台北小巨蛋", "台北大巨蛋", "台北流行音樂中心",
                "高雄流行音樂中心", "高雄世運主場館", "台北國際會議中心",
                "新北工商展覽中心", "桃園會展中心", "台中洲際棒球場",
            ]
            for v in venues:
                if v in text:
                    return v
            return fallback
    except Exception:
        return fallback


# --- App lifecycle ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting APScheduler...")
    scheduler.start()
    db = database.SessionLocal()
    try:
        active = db.query(database.Task).filter(database.Task.status == "監控中").all()
        for t in active:
            delay = random.randint(5, 120)
            scheduler.add_job(
                check_ticket_status, 'date',
                run_date=datetime.now() + timedelta(seconds=delay),
                args=[t.id, t.url, t.email],
                id=f"task_{t.id}", replace_existing=True
            )
        print(f"Resumed {len(active)} active tasks.")
    finally:
        db.close()
    yield
    print("Shutting down APScheduler...")
    scheduler.shutdown()


app = FastAPI(title="Tickety Backend API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Pydantic models ---

class TaskCreate(BaseModel):
    url: HttpUrl
    email: EmailStr
    venue: Optional[str] = None
    departure: Optional[str] = None
    budget: Optional[int] = Field(None, ge=0)
    needsAccommodation: bool = False


FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://tickety-v1.onrender.com")


async def get_current_user_optional(request: Request, db: Session = Depends(get_db)) -> Optional[database.User]:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    user = db.query(database.User).filter(database.User.session_token == token).first()
    return user


# --- API Routes ---


@app.post("/api/auth/login")
async def auth_login(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    email = body.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    user = db.query(database.User).filter(database.User.email == email).first()
    if not user:
        user = database.User(email=email)
        db.add(user)
        db.commit()
        db.refresh(user)

    magic_token = str(uuid.uuid4())
    user.magic_token = magic_token
    user.magic_token_expires = datetime.now() + timedelta(minutes=15)
    db.commit()

    verify_url = f"{FRONTEND_URL}/?token={magic_token}"
    email_service.send_magic_link(email, verify_url)

    return {"message": "登入連結已發送至您的信箱"}


@app.get("/api/auth/verify")
async def auth_verify(token: str, db: Session = Depends(get_db)):
    user = db.query(database.User).filter(database.User.magic_token == token).first()
    if not user or not user.magic_token_expires or user.magic_token_expires < datetime.now():
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    session_token = secrets.token_urlsafe(32)
    user.session_token = session_token
    user.magic_token = None
    user.magic_token_expires = None
    user.last_login = datetime.now()
    db.commit()

    return {"session_token": session_token, "email": user.email}


@app.get("/api/auth/me")
async def auth_me(request: Request, db: Session = Depends(get_db)):
    user = await get_current_user_optional(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"email": user.email, "id": user.id}


@app.get("/api/tasks")
async def list_tasks(request: Request, email: Optional[str] = None, db: Session = Depends(get_db)):
    user = await get_current_user_optional(request, db)
    if user:
        tasks = db.query(database.Task).filter(database.Task.user_id == user.id).order_by(database.Task.created_at.desc()).all()
    elif email:
        tasks = db.query(database.Task).filter(database.Task.email == email).order_by(database.Task.created_at.desc()).all()
    else:
        return []

    return [{
        "id": t.id,
        "url": t.url,
        "email": t.email,
        "status": t.status,
        "createdAt": t.created_at.isoformat() + "Z" if t.created_at else None,
        "venue": t.departure or "活動場館",
    } for t in tasks]


@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(database.Task).filter(database.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Remove scheduler job if active
    try:
        scheduler.remove_job(f"task_{task_id}")
    except Exception:
        pass

    db.delete(db_task)
    db.commit()
    return {"message": "Task deleted"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/notifications")
def get_notifications():
    return notifications_cache[-20:]

@app.get("/api/tasks/{task_id}/ticket-records")
def get_ticket_records(task_id: int, db: Session = Depends(get_db)):
    records = db.query(database.TicketRecord).filter(
        database.TicketRecord.task_id == task_id
    ).order_by(database.TicketRecord.detected_at.desc()).limit(50).all()
    return [{
        "id": r.id, "task_id": r.task_id,
        "zone": r.zone, "price": r.price, "remaining": r.remaining,
        "raw_text": r.raw_text,
        "detected_at": r.detected_at.isoformat() if r.detected_at else None
    } for r in records]

@app.get("/api/reverse-geocode")
def reverse_geocode(lat: float, lng: float):
    import requests
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Google Maps API Key not configured")
    url = f"https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lng}&key={api_key}&language=zh-TW"
    try:
        res = requests.get(url, timeout=5)
        data = res.json()
        if data.get("status") == "OK" and data.get("results"):
            return {"address": data["results"][0]["formatted_address"]}
        raise HTTPException(status_code=400, detail="無法解析該座標的地址")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/concerts")
async def get_concerts():
    concerts = [
        {"title": "ITZY 2ND WORLD TOUR <BORN TO BE> in TAIPEI", "venue": "台北小巨蛋",
         "date": "2026/07/20", "url": "https://tixcraft.com/activity/detail/24_itzy",
         "imageUrl": "https://images.unsplash.com/photo-1540039155732-d6824b2f155c?w=600&q=80"},
        {"title": "韋禮安「如果可以，我想和你明天再見」演唱會", "venue": "台北小巨蛋",
         "date": "2026/05/30", "url": "https://ticket.ibon.com.tw/",
         "imageUrl": "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&q=80"},
        {"title": "NMIXX THE 1ST FAN CONCERT", "venue": "高雄巨蛋",
         "date": "2026/07/11", "url": "https://tixcraft.com",
         "imageUrl": "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&q=80"},
        {"title": "CNBLUE LIVE 'CNBLUENTITY' IN KAOHSIUNG", "venue": "高雄流行音樂中心",
         "date": "2026/06/13", "url": "https://ticket.com.tw",
         "imageUrl": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&q=80"},
    ]
    today = datetime.now().strftime("%Y/%m/%d")
    return [c for c in concerts if c["date"] >= today]

@app.post("/tasks")
async def create_task(task_data: TaskCreate, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    active_count = db.query(database.Task).filter(database.Task.status == "監控中").count()
    if active_count >= MAX_CONCURRENT_TASKS:
        raise HTTPException(status_code=400, detail="伺服器負載已滿")

    # Try to get current user via auth header
    user = await get_current_user_optional(request, db)
    task_email = user.email if user else task_data.email

    db_task = database.Task(
        url=str(task_data.url), email=task_email,
        departure=task_data.departure, budget=task_data.budget,
        needs_accommodation=task_data.needsAccommodation, status="監控中"
    )
    if user:
        db_task.user_id = user.id
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    background_tasks.add_task(email_service.send_task_created_email, db_task.email, str(db_task.url))

    first_delay = random.randint(5, 30)
    scheduler.add_job(
        check_ticket_status, 'date',
        run_date=datetime.now() + timedelta(seconds=first_delay),
        args=[db_task.id, db_task.url, db_task.email],
        id=f"task_{db_task.id}", replace_existing=True
    )
    print(f"[Task {db_task.id}] 任務建立，首次檢查於 {first_delay}s 後。")

    # --- Venue detection (lightweight HTTP) ---
    if task_data.venue and task_data.venue.strip():
        parsed_venue = task_data.venue.strip()
    else:
        parsed_venue = await detect_venue_from_url(str(task_data.url))

    # --- Google Maps: accommodations ---
    def get_accommodations(venue_name: str) -> list:
        import requests
        api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
        if not api_key:
            return []
        try:
            geo_url = f"https://maps.googleapis.com/maps/api/geocode/json?address={venue_name}&key={api_key}"
            geo = requests.get(geo_url, timeout=5).json()
            if geo.get("status") != "OK" or not geo.get("results"):
                return []
            loc = geo["results"][0]["geometry"]["location"]
            lat, lng = loc["lat"], loc["lng"]

            places_url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lng}&radius=1000&type=lodging&key={api_key}"
            places = requests.get(places_url, timeout=5).json()
            if places.get("status") != "OK":
                return []

            def haversine(la1, lo1, la2, lo2):
                R = 6371000
                p1, p2 = math.radians(la1), math.radians(la2)
                dp, dl = math.radians(la2 - la1), math.radians(lo2 - lo1)
                a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
                return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

            hotels = []
            for p in places.get("results", [])[:3]:
                hl = p.get("geometry", {}).get("location", {})
                d = haversine(lat, lng, hl.get("lat", lat), hl.get("lng", lng))
                hotels.append({
                    "id": p.get("place_id"), "name": p.get("name", "Unknown"),
                    "rating": p.get("rating", "N/A"), "reviews": p.get("user_ratings_total", 0),
                    "distance": f"約 {int(d)} 公尺" if d < 1000 else f"約 {d/1000:.1f} 公里",
                    "price": "依官網為準"
                })
            return hotels
        except Exception as e:
            print(f"Maps API error: {e}")
            return []

    # --- Google Maps: transit ---
    def get_transits(venue_name: str, departure: str) -> list:
        import requests
        if not departure:
            return []
        api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
        if not api_key:
            return []
        try:
            dir_url = f"https://maps.googleapis.com/maps/api/directions/json?origin={departure}&destination={venue_name}&mode=transit&language=zh-TW&key={api_key}"
            data = requests.get(dir_url, timeout=5).json()
            if data.get("status") != "OK":
                return []
            leg = data["routes"][0]["legs"][0]
            duration = leg.get("duration", {}).get("text", "未知")
            fare_obj = data["routes"][0].get("fare")
            fare = f"NT$ {fare_obj['value']}" if fare_obj and "value" in fare_obj else "請洽官網"

            steps = []
            for s in leg.get("steps", []):
                info = {
                    "mode": s.get("travel_mode", "UNKNOWN"),
                    "instruction": re.sub(r'<[^>]+>', '', s.get("html_instructions", "")),
                    "duration": s.get("duration", {}).get("text", "")
                }
                if info["mode"] == "TRANSIT":
                    td = s.get("transit_details", {})
                    ln = td.get("line", {})
                    info["line"] = f"{ln.get('vehicle', {}).get('name', '')} {ln.get('short_name') or ln.get('name', '')}".strip()
                    info["num_stops"] = td.get("num_stops", 0)
                steps.append(info)

            return [{"id": 1, "title": "大眾運輸路線規劃", "description": "查看下方完整轉乘步驟",
                      "duration": duration, "cost": fare, "full_steps": steps}]
        except Exception as e:
            print(f"Directions API error: {e}")
            return []

    accommodations = get_accommodations(parsed_venue) if task_data.needsAccommodation else []
    transits = get_transits(parsed_venue, task_data.departure)

    return {
        "id": db_task.id, "url": db_task.url, "email": db_task.email,
        "departure": db_task.departure, "budget": db_task.budget,
        "needsAccommodation": db_task.needs_accommodation,
        "status": db_task.status,
        "createdAt": db_task.created_at.isoformat() + "Z",
        "venue": parsed_venue,
        "accommodations": accommodations, "transits": transits
    }
