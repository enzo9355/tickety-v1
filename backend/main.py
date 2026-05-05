from fastapi import FastAPI, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import os
import requests

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

    # Dynamic venue parsing based on url (Mocking actual NLP/Scraping)
    is_kaohsiung = "kaohsiung" in task_data.url.lower() or "k-arena" in task_data.url.lower()
    parsed_venue = "高雄巨蛋" if is_kaohsiung else "台北流行音樂中心"

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

    # Get real recommendations if needed
    mock_accommodations = get_real_accommodations(parsed_venue) if task_data.needsAccommodation else []

    mock_transits = [
        {"id": 1, "title": "捷運直達" if not is_kaohsiung else "捷運轉乘", 
         "description": "搭乘藍線至『科技館站』，從 3 號出口出站步行 5 分鐘即可抵達。" if not is_kaohsiung else "搭乘紅線至巨蛋站，步行 3 分鐘即可抵達。", 
         "duration": "25 分鐘" if not is_kaohsiung else "10 分鐘", 
         "cost": "$30"}
    ]

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
