from fastapi import FastAPI, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import os
import requests
from bs4 import BeautifulSoup
import re

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
    departure: Optional[str] = None
    budget: Optional[str] = None
    needsAccommodation: bool = False

@app.post("/tasks")
def create_task(task_data: TaskCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
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

    def scrape_venue_from_tixcraft(url: str) -> str:
        default_venue = "台北流行音樂中心" # Fallback venue
        try:
            headers = {'User-Agent': 'Mozilla/5.0'}
            r = requests.get(url, headers=headers, timeout=5)
            soup = BeautifulSoup(r.text, 'html.parser')
            
            # 尋找 Tixcraft 頁面中的場地資訊
            # 通常在詳細頁面上會有特定的結構或是字眼
            for text in soup.stripped_strings:
                if "高雄巨蛋" in text or "K-Arena" in text:
                    return "高雄巨蛋"
                if "台北小巨蛋" in text or "Taipei Arena" in text:
                    return "台北小巨蛋"
                if "世運主場館" in text or "National Stadium" in text:
                    return "高雄世運主場館"
                if "台北流行音樂中心" in text or "Taipei Music Center" in text:
                    return "台北流行音樂中心"
                    
            # 嘗試解析 meta description
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc and meta_desc.get('content'):
                desc = meta_desc['content']
                if "高雄巨蛋" in desc: return "高雄巨蛋"
                if "台北小巨蛋" in desc: return "台北小巨蛋"
            
            return default_venue
        except Exception as e:
            print(f"Scrape error: {e}")
            return default_venue

    parsed_venue = scrape_venue_from_tixcraft(task_data.url)

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
            
            # 2. Places API (Nearby Lodging)
            places_url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lng}&radius=1000&type=lodging&key={api_key}"
            places_res = requests.get(places_url, timeout=5)
            places_data = places_res.json()
            
            if places_data.get("status") != "OK":
                return []
                
            hotels = []
            for place in places_data.get("results", [])[:3]:
                hotels.append({
                    "id": place.get("place_id"),
                    "name": place.get("name", "Unknown Hotel"),
                    "rating": place.get("rating", "N/A"),
                    "reviews": place.get("user_ratings_total", 0),
                    "distance": "1公里內",
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
            fare = data["routes"][0].get("fare", {}).get("text", "依實際票價為準")
            
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
