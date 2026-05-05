from fastapi import FastAPI, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

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

    # Mock response for UI rendering (simulating the venue extraction and recommendations)
    mock_accommodations = [
        {"id": 1, "name": "Neon Heights Hotel", "rating": 4.8, "reviews": 124, "distance": "300m", "price": "$120"},
        {"id": 2, "name": "Cyberpunk Inn", "rating": 4.5, "reviews": 89, "distance": "800m", "price": "$85"}
    ] if task_data.needsAccommodation else []

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
