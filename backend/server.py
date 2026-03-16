from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, time


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class UserData(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    credits: int = 18
    is_skipping_tomorrow: bool = False
    address: str
    plan_type: str = "Standard Veg"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserDataCreate(BaseModel):
    name: str
    address: str
    plan_type: str = "Standard Veg"
    credits: int = 18

class UserSkipUpdate(BaseModel):
    is_skipping_tomorrow: bool

class Subscriber(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: str
    status: str = "Active"  # Active, Expired
    skip: bool = False
    plan_type: str = "Standard Veg"
    credits: int = 18
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class SubscriberCreate(BaseModel):
    name: str
    address: str
    plan_type: str = "Standard Veg"
    credits: int = 18

class SubscriberUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None
    skip: Optional[bool] = None
    plan_type: Optional[str] = None
    credits: Optional[int] = None

class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    day: str  # Monday, Tuesday, etc.
    main_dish: str
    accompaniments: str
    is_special: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MenuItemCreate(BaseModel):
    day: str
    main_dish: str
    accompaniments: str
    is_special: bool = False

class PrepStats(BaseModel):
    total_active: int
    total_skipping: int
    total_prep: int
    total_expired: int

class TimeCheck(BaseModel):
    can_modify: bool
    current_hour: int
    cutoff_hour: int = 22
    message: str

# Health check endpoint
@api_router.get("/")
async def root():
    return {"message": "The Dabba API - Halifax's Premium Tiffin Service"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "The Dabba API"}

# Time check for skip modifications
@api_router.get("/time-check", response_model=TimeCheck)
async def check_time_lock():
    current_hour = datetime.now().hour
    can_modify = current_hour < 22
    message = "You can modify your skip status." if can_modify else "Cut-off time (10:00 PM) has passed. Changes locked."
    return TimeCheck(can_modify=can_modify, current_hour=current_hour, message=message)

# User endpoints
@api_router.post("/users", response_model=UserData)
async def create_user(input: UserDataCreate):
    user_dict = input.model_dump()
    user_obj = UserData(**user_dict)
    await db.users.insert_one(user_obj.model_dump())
    return user_obj

@api_router.get("/users/{user_id}", response_model=UserData)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserData(**user)

@api_router.get("/users", response_model=List[UserData])
async def get_all_users():
    users = await db.users.find().to_list(1000)
    return [UserData(**user) for user in users]

@api_router.patch("/users/{user_id}/skip", response_model=UserData)
async def update_user_skip(user_id: str, skip_update: UserSkipUpdate):
    # Check time lock
    current_hour = datetime.now().hour
    if current_hour >= 22:
        raise HTTPException(
            status_code=400, 
            detail="Cut-off time (10:00 PM) has passed. We've already started preparing your fresh meal!"
        )
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "is_skipping_tomorrow": skip_update.is_skipping_tomorrow,
            "updated_at": datetime.utcnow()
        }}
    )
    
    updated_user = await db.users.find_one({"id": user_id})
    return UserData(**updated_user)

# Subscriber endpoints (for admin/owner)
@api_router.post("/subscribers", response_model=Subscriber)
async def create_subscriber(input: SubscriberCreate):
    sub_dict = input.model_dump()
    sub_obj = Subscriber(**sub_dict)
    await db.subscribers.insert_one(sub_obj.model_dump())
    return sub_obj

@api_router.get("/subscribers", response_model=List[Subscriber])
async def get_all_subscribers():
    subscribers = await db.subscribers.find().to_list(1000)
    return [Subscriber(**sub) for sub in subscribers]

@api_router.get("/subscribers/{sub_id}", response_model=Subscriber)
async def get_subscriber(sub_id: str):
    sub = await db.subscribers.find_one({"id": sub_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    return Subscriber(**sub)

@api_router.patch("/subscribers/{sub_id}", response_model=Subscriber)
async def update_subscriber(sub_id: str, update: SubscriberUpdate):
    sub = await db.subscribers.find_one({"id": sub_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.subscribers.update_one({"id": sub_id}, {"$set": update_data})
    updated_sub = await db.subscribers.find_one({"id": sub_id})
    return Subscriber(**updated_sub)

@api_router.patch("/subscribers/{sub_id}/skip", response_model=Subscriber)
async def toggle_subscriber_skip(sub_id: str):
    # Check time lock
    current_hour = datetime.now().hour
    if current_hour >= 22:
        raise HTTPException(
            status_code=400, 
            detail="Cut-off time (10:00 PM) has passed. Changes locked."
        )
    
    sub = await db.subscribers.find_one({"id": sub_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    
    new_skip_status = not sub.get("skip", False)
    await db.subscribers.update_one(
        {"id": sub_id},
        {"$set": {
            "skip": new_skip_status,
            "updated_at": datetime.utcnow()
        }}
    )
    
    updated_sub = await db.subscribers.find_one({"id": sub_id})
    return Subscriber(**updated_sub)

@api_router.delete("/subscribers/{sub_id}")
async def delete_subscriber(sub_id: str):
    result = await db.subscribers.delete_one({"id": sub_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    return {"message": "Subscriber deleted successfully"}

# Prep stats for kitchen command
@api_router.get("/prep-stats", response_model=PrepStats)
async def get_prep_stats():
    subscribers = await db.subscribers.find().to_list(1000)
    
    total_active = sum(1 for s in subscribers if s.get("status") == "Active")
    total_skipping = sum(1 for s in subscribers if s.get("status") == "Active" and s.get("skip", False))
    total_expired = sum(1 for s in subscribers if s.get("status") == "Expired")
    total_prep = total_active - total_skipping
    
    return PrepStats(
        total_active=total_active,
        total_skipping=total_skipping,
        total_prep=total_prep,
        total_expired=total_expired
    )

# Menu endpoints
@api_router.post("/menu", response_model=MenuItem)
async def create_menu_item(input: MenuItemCreate):
    menu_dict = input.model_dump()
    menu_obj = MenuItem(**menu_dict)
    await db.menu.insert_one(menu_obj.model_dump())
    return menu_obj

@api_router.get("/menu", response_model=List[MenuItem])
async def get_menu():
    menu_items = await db.menu.find().to_list(100)
    return [MenuItem(**item) for item in menu_items]

@api_router.delete("/menu/{item_id}")
async def delete_menu_item(item_id: str):
    result = await db.menu.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted successfully"}

# Seed initial data
@api_router.post("/seed")
async def seed_data():
    # Clear existing data
    await db.subscribers.delete_many({})
    await db.menu.delete_many({})
    await db.users.delete_many({})
    
    # Create default user
    default_user = UserData(
        id="default-user",
        name="Hetal",
        credits=18,
        is_skipping_tomorrow=False,
        address="Spring Garden Rd, Halifax",
        plan_type="Standard Veg"
    )
    await db.users.insert_one(default_user.model_dump())
    
    # Seed subscribers
    sample_subscribers = [
        Subscriber(name="Amit S.", address="Barrington St", status="Active", skip=False),
        Subscriber(name="Priya K.", address="South Park St", status="Active", skip=True),
        Subscriber(name="Rahul M.", address="Quinpool Rd", status="Active", skip=False),
        Subscriber(name="Sana V.", address="Bedford Hwy", status="Expired", skip=False),
    ]
    
    for sub in sample_subscribers:
        await db.subscribers.insert_one(sub.model_dump())
    
    # Seed menu
    sample_menu = [
        MenuItem(day="Monday", main_dish="Baingan Bharta", accompaniments="Rotis & Pickle", is_special=True),
        MenuItem(day="Tuesday", main_dish="Chole Masala", accompaniments="Rice & Salad", is_special=False),
        MenuItem(day="Wednesday", main_dish="Paneer Butter Masala", accompaniments="Naan & Raita", is_special=False),
        MenuItem(day="Thursday", main_dish="Dal Tadka", accompaniments="Jeera Rice & Papad", is_special=False),
        MenuItem(day="Friday", main_dish="Aloo Gobi", accompaniments="Paratha & Chutney", is_special=True),
    ]
    
    for item in sample_menu:
        await db.menu.insert_one(item.model_dump())
    
    return {"message": "Database seeded successfully", "user_id": "default-user"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
