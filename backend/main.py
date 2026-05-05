from fastapi import FastAPI, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import os
import requests
from bs4 import BeautifulSoup
import re
import math
from playwright.async_api import async_playwright

import database
import email_service

app = FastAPI(title="Tickety Backend API")

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
            
            transit_steps = [s for s in leg.get("steps", []) if s.get("travel_mode") == "TRANSIT"]
            
            if transit_steps:
                main_transit = transit_steps[0]["transit_details"]
                line_name = main_transit.get("line", {}).get("short_name") or main_transit.get("line", {}).get("name", "大眾運輸")
                vehicle_type = main_transit.get("line", {}).get("vehicle", {}).get("name", "大眾運輸")
                title = f"{vehicle_type} - {line_name}"
                
                departure_stop = main_transit.get("departure_stop", {}).get("name", "")
                arrival_stop = main_transit.get("arrival_stop", {}).get("name", "")
                desc = f"從 {departure_stop} 搭乘至 {arrival_stop}"
            else:
                title = "大眾運輸建議路線"
                instructions = [re.sub(r'<[^>]+>', '', s.get("html_instructions", "")) for s in leg.get("steps", [])]
                desc = " -> ".join([inst for inst in instructions if inst][:3])
                
            return [{
                "id": 1,
                "title": title,
                "description": desc,
                "duration": duration,
                "cost": fare
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
        "needsAccommodation": db_task.needs_accommodation,
        "status": db_task.status,
        "createdAt": db_task.created_at.isoformat() + "Z",
        "venue": parsed_venue,
        "accommodations": mock_accommodations,
        "transits": mock_transits
    }
