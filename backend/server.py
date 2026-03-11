from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Set
import uuid
from datetime import datetime, timedelta, timezone
import jwt
import hashlib
import math
import json
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'thedabba')]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise ValueError("JWT_SECRET environment variable is required")
JWT_ALGORITHM = "HS256"

# Create the main app
app = FastAPI(title="The Dabba API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# ==================== MODELS ====================

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    phone: str
    address: Optional[str] = ""
    role: Optional[str] = "customer"

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    address: str
    role: str
    created_at: datetime

class SubscriptionCreate(BaseModel):
    plan: str
    delivery_address: str

class SkipMeal(BaseModel):
    date: str
    meal_type: str

class DeliveryStatusUpdate(BaseModel):
    status: str
    photo_base64: Optional[str] = None

class DriverLocationUpdate(BaseModel):
    latitude: float
    longitude: float

class DriverLocationQuery(BaseModel):
    latitude: float
    longitude: float

class MarkReadyForDelivery(BaseModel):
    order_ids: List[str]

# Kitchen Portal Models
class DishCreate(BaseModel):
    name: str
    description: str
    type: str = "vegetarian"
    category: str = "sabji"  # Categories: roti, sabji, dal, rice, salad, extra
    quantity_per_tiffin: float = 1.0  # For prep calculations
    unit: str = "portion"  # portion, pieces, grams, kg
    image_url: Optional[str] = None

class DishUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    quantity_per_tiffin: Optional[float] = None
    unit: Optional[str] = None
    image_url: Optional[str] = None

class MenuDaySet(BaseModel):
    date: str
    dinner_item_ids: List[str]  # Multiple items for modular dinner menu

# Modular Dinner Menu - Multi-select items
class DinnerMenuSet(BaseModel):
    date: str
    item_ids: List[str]  # List of dish IDs for dinner (roti + sabji + dal + etc)

# Platinum Tiffin Models
class SpicePreference(BaseModel):
    level: str  # mild, medium, spicy

class MealRating(BaseModel):
    date: str
    rating: str  # yummy, good, bad
    feedback: Optional[str] = None

class AddOnOrder(BaseModel):
    date: str
    item_id: str
    quantity: int = 1

class ExtraItem(BaseModel):
    name: str
    description: str
    price: float  # CAD
    category: str = "beverage"  # beverage, dessert, snack

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    user = await db.users.find_one({"id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ==================== REAL-TIME WEBSOCKET MANAGER ====================

class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        # Connections organized by role and user_id
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {
            "customer": {},
            "driver": {},
            "kitchen": {}
        }
        self.broadcast_lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket, user_id: str, role: str):
        await websocket.accept()
        if role not in self.active_connections:
            self.active_connections[role] = {}
        self.active_connections[role][user_id] = websocket
        logging.info(f"WebSocket connected: {role}/{user_id}")
    
    def disconnect(self, user_id: str, role: str):
        if role in self.active_connections and user_id in self.active_connections[role]:
            del self.active_connections[role][user_id]
            logging.info(f"WebSocket disconnected: {role}/{user_id}")
    
    async def send_personal_message(self, message: dict, user_id: str, role: str):
        """Send message to a specific user"""
        if role in self.active_connections and user_id in self.active_connections[role]:
            try:
                await self.active_connections[role][user_id].send_json(message)
            except Exception as e:
                logging.error(f"Error sending to {role}/{user_id}: {e}")
                self.disconnect(user_id, role)
    
    async def broadcast_to_role(self, message: dict, role: str):
        """Broadcast message to all users of a specific role"""
        async with self.broadcast_lock:
            if role in self.active_connections:
                disconnected = []
                for user_id, connection in self.active_connections[role].items():
                    try:
                        await connection.send_json(message)
                    except Exception:
                        disconnected.append(user_id)
                # Clean up disconnected
                for user_id in disconnected:
                    self.disconnect(user_id, role)
    
    async def broadcast_all(self, message: dict):
        """Broadcast to all connected clients"""
        for role in self.active_connections:
            await self.broadcast_to_role(message, role)
    
    async def notify_delivery_update(self, delivery_id: str, status: str, customer_id: str, driver_id: str = None):
        """Notify all relevant parties of a delivery status change"""
        event = {
            "event": "delivery_update",
            "data": {
                "delivery_id": delivery_id,
                "status": status,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        }
        # Notify customer
        await self.send_personal_message(event, customer_id, "customer")
        # Notify kitchen
        await self.broadcast_to_role(event, "kitchen")
        # Notify driver if specified
        if driver_id:
            await self.send_personal_message(event, driver_id, "driver")
    
    async def notify_manifest_update(self):
        """Notify kitchen and drivers of manifest changes (skip/reindex)"""
        event = {
            "event": "manifest_update",
            "data": {
                "action": "reindex",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        }
        await self.broadcast_to_role(event, "kitchen")
        await self.broadcast_to_role(event, "driver")

# Global connection manager
ws_manager = ConnectionManager()

# ==================== DYNAMIC INDEXING ENGINE ====================

async def reindex_delivery_sequence(date_str: str):
    """
    Recursive re-indexing when a meal is skipped.
    Ensures perfect 1, 2, 3... sequence with no gaps.
    """
    # Get all active deliveries for the date, excluding skipped
    deliveries = await db.deliveries.find({
        "delivery_date": date_str,
        "status": {"$ne": "skipped"}
    }).sort("sequence_number", 1).to_list(1000)
    
    # Re-assign sequence numbers
    for idx, delivery in enumerate(deliveries, start=1):
        if delivery.get("sequence_number") != idx:
            await db.deliveries.update_one(
                {"id": delivery["id"]},
                {"$set": {"sequence_number": idx, "updated_at": datetime.now(timezone.utc)}}
            )
    
    # Notify all parties of the reindex
    await ws_manager.notify_manifest_update()
    
    logging.info(f"Reindexed {len(deliveries)} deliveries for {date_str}")
    return len(deliveries)

def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two GPS coordinates using Haversine formula"""
    R = 6371  # Earth's radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return round(R * c, 2)

def calculate_eta_minutes(distance_km: float, avg_speed_kmh: float = 30, buffer_minutes: int = 5) -> int:
    """Calculate ETA in minutes: ETA = (Distance / Avg_Speed) * 60 + Buffer"""
    travel_time = (distance_km / avg_speed_kmh) * 60
    return int(travel_time + buffer_minutes)

# ==================== AUTH ROUTES ====================

@api_router.get("/health")
async def health_check():
    """Health check endpoint for Railway/deployment monitoring"""
    try:
        # Quick DB ping
        await db.command("ping")
        return {
            "status": "healthy",
            "service": "The Dabba API",
            "version": "2.0.0",
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "degraded",
            "service": "The Dabba API",
            "version": "2.0.0",
            "database": "disconnected",
            "error": str(e)
        }

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = {
        "id": str(uuid.uuid4()),
        "name": user_data.name,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "phone": user_data.phone,
        "address": user_data.address or "",
        "role": user_data.role or "customer",
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user)
    
    token = create_token(user["id"], user["role"])
    
    # Remove MongoDB _id and password from response
    user_response = {k: v for k, v in user.items() if k not in ["password", "_id"]}
    
    return {"token": token, "user": user_response}

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if user["password"] != hash_password(login_data.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"], user["role"])
    
    # Remove MongoDB _id and password from response
    user_response = {k: v for k, v in user.items() if k not in ["password", "_id"]}
    
    return {"token": token, "user": user_response}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {k: v for k, v in current_user.items() if k not in ["password", "_id"]}

# ==================== MENU ROUTES ====================

@api_router.get("/menu")
async def get_menu():
    # Generate weekly menu
    today = datetime.now().date()
    days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    
    menu_items = [
        {"name": "Dal Tadka", "description": "Yellow lentils tempered with cumin, garlic and spices. Served with Jeera Rice, Papad, and Gulab Jamun", "type": "vegetarian"},
        {"name": "Paneer Butter Masala", "description": "Cottage cheese in rich tomato gravy. Served with Butter Naan, Raita, and Kheer", "type": "vegetarian"},
        {"name": "Chole Bhature", "description": "Spiced chickpea curry with fried bread. Served with Pickle, Onion, and Jalebi", "type": "vegetarian"},
        {"name": "Rajma Chawal", "description": "Kidney beans curry with steamed rice. Served with Salad, Papad, and Rasmalai", "type": "vegetarian"},
        {"name": "Aloo Gobi", "description": "Potato and cauliflower dry curry. Served with Roti, Dal, and Gajar Halwa", "type": "vegetarian"},
        {"name": "Palak Paneer", "description": "Spinach curry with cottage cheese. Served with Jeera Rice, Raita, and Ladoo", "type": "vegetarian"},
        {"name": "Mixed Veg Curry", "description": "Assorted vegetables in spiced gravy. Served with Pulao, Pickle, and Ice Cream", "type": "vegetarian"},
    ]
    
    menu = []
    for i in range(7):
        date = today + timedelta(days=i)
        day_name = days[date.weekday()]
        menu.append({
            "date": date.isoformat(),
            "day": day_name,
            "lunch": menu_items[i % len(menu_items)],
            "dinner": menu_items[(i + 1) % len(menu_items)]
        })
    
    return {"menu": menu}

# ==================== SUBSCRIPTION ROUTES ====================

@api_router.get("/subscription")
async def get_subscription(current_user: dict = Depends(get_current_user)):
    subscription = await db.subscriptions.find_one({"user_id": current_user["id"]})
    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription found")
    # Remove MongoDB _id to prevent serialization error
    return {k: v for k, v in subscription.items() if k != "_id"}

@api_router.post("/subscription")
async def create_subscription(sub_data: SubscriptionCreate, current_user: dict = Depends(get_current_user)):
    # Check existing subscription
    existing = await db.subscriptions.find_one({"user_id": current_user["id"], "status": "active"})
    if existing:
        raise HTTPException(status_code=400, detail="Active subscription already exists")
    
    subscription = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "plan": sub_data.plan,
        "status": "active",
        "start_date": datetime.utcnow().isoformat(),
        "end_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
        "delivery_address": sub_data.delivery_address,
        "skipped_meals": [],
        "created_at": datetime.utcnow().isoformat()
    }
    
    await db.subscriptions.insert_one(subscription)
    # Remove MongoDB _id to prevent serialization error
    return {k: v for k, v in subscription.items() if k != "_id"}

@api_router.post("/subscription/skip")
async def skip_meal(skip_data: SkipMeal, current_user: dict = Depends(get_current_user)):
    subscription = await db.subscriptions.find_one({"user_id": current_user["id"], "status": "active"})
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription found")
    
    # Add to skipped meals
    skipped = {"date": skip_data.date, "meal_type": skip_data.meal_type}
    
    await db.subscriptions.update_one(
        {"id": subscription["id"]},
        {"$push": {"skipped_meals": skipped}}
    )
    
    # Add credit to wallet
    wallet = await db.wallets.find_one({"user_id": current_user["id"]})
    credit_amount = 120
    
    transaction = {
        "id": str(uuid.uuid4()),
        "type": "skip_credit",
        "amount": credit_amount,
        "description": f"Credit for skipping {skip_data.meal_type} on {skip_data.date}",
        "date": datetime.utcnow().isoformat()
    }
    
    if wallet:
        await db.wallets.update_one(
            {"user_id": current_user["id"]},
            {
                "$inc": {"balance": credit_amount},
                "$push": {"transactions": transaction}
            }
        )
    else:
        wallet = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "balance": credit_amount,
            "transactions": [transaction]
        }
        await db.wallets.insert_one(wallet)
    
    return {"message": "Meal skipped successfully", "credit": credit_amount}

# ==================== WALLET ROUTES ====================

@api_router.get("/wallet")
async def get_wallet(current_user: dict = Depends(get_current_user)):
    wallet = await db.wallets.find_one({"user_id": current_user["id"]})
    if not wallet:
        return {"balance": 0, "transactions": []}
    return {"balance": wallet.get("balance", 0), "transactions": wallet.get("transactions", [])}

# ==================== DRIVER ROUTES ====================

# Haversine formula to calculate distance between two coordinates
def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371  # Earth's radius in km
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return round(R * c, 2)

# Sample coordinates for demo addresses (Canadian cities)
ADDRESS_COORDS = {
    "default": {"lat": 44.6488, "lon": -63.5752},  # Halifax default
    "halifax": {"lat": 44.6488, "lon": -63.5752},
    "dartmouth": {"lat": 44.6717, "lon": -63.5732},
    "bedford": {"lat": 44.7328, "lon": -63.6590},
    "toronto": {"lat": 43.6532, "lon": -79.3832},
    "vancouver": {"lat": 49.2827, "lon": -123.1207},
}

def get_coords_for_address(address: str) -> dict:
    """Get approximate coordinates for an address (simplified for demo)"""
    if not address:
        return ADDRESS_COORDS["default"]
    address_lower = address.lower()
    for city, coords in ADDRESS_COORDS.items():
        if city in address_lower:
            return coords
    # Add some variation for demo purposes
    import random
    base = ADDRESS_COORDS["default"]
    return {
        "lat": base["lat"] + random.uniform(-0.05, 0.05),
        "lon": base["lon"] + random.uniform(-0.05, 0.05)
    }

@api_router.get("/driver/deliveries")
async def get_driver_deliveries(
    current_user: dict = Depends(get_current_user),
    lat: Optional[float] = None,
    lon: Optional[float] = None
):
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="Access denied. Driver role required.")
    
    # Get all active subscriptions for today's deliveries
    today = datetime.now().date().isoformat()
    
    subscriptions = await db.subscriptions.find({"status": "active"}).to_list(100)
    
    # Batch fetch all users to avoid N+1 queries
    user_ids = [sub["user_id"] for sub in subscriptions]
    users = await db.users.find({"id": {"$in": user_ids}}).to_list(100)
    user_map = {u["id"]: u for u in users}
    
    deliveries = []
    for sub in subscriptions:
        user = user_map.get(sub["user_id"])
        if user:
            # Check if not skipped
            skipped_today = any(
                s.get("date") == today 
                for s in sub.get("skipped_meals", [])
            )
            
            if not skipped_today:
                address = sub.get("delivery_address", user.get("address", ""))
                delivery_coords = get_coords_for_address(address)
                
                # Calculate distance if driver location provided
                distance = 0
                estimated_time = 5
                if lat is not None and lon is not None:
                    distance = calculate_distance(lat, lon, delivery_coords["lat"], delivery_coords["lon"])
                    estimated_time = max(5, int(distance * 3))  # ~3 mins per km
                else:
                    # Simulate distances if no location
                    import random
                    distance = round(random.uniform(0.5, 5.0), 1)
                    estimated_time = max(5, int(distance * 3))
                
                deliveries.append({
                    "id": str(uuid.uuid4()),
                    "customer_name": user.get("name", "Unknown"),
                    "customer_phone": user.get("phone", ""),
                    "address": address,
                    "meal_type": "dinner",
                    "status": "pending",
                    "subscription_plan": sub.get("plan", "standard"),
                    "latitude": delivery_coords["lat"],
                    "longitude": delivery_coords["lon"],
                    "distance": distance,
                    "estimated_time": estimated_time
                })
    
    # Sort by distance (nearest first)
    deliveries.sort(key=lambda x: x["distance"])
    
    return {"deliveries": deliveries}

@api_router.put("/driver/delivery/{delivery_id}/status")
async def update_delivery_status(delivery_id: str, status_data: DeliveryStatusUpdate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="Access denied. Driver role required.")
    
    # Store delivery completion in DB
    delivery_record = {
        "id": delivery_id,
        "status": status_data.status,
        "driver_id": current_user["id"],
        "driver_name": current_user.get("name", "Unknown"),
        "completed_at": datetime.utcnow().isoformat(),
        "photo_base64": status_data.photo_base64 if status_data.photo_base64 else None
    }
    
    # Upsert into completed_deliveries collection
    await db.completed_deliveries.update_one(
        {"id": delivery_id},
        {"$set": delivery_record},
        upsert=True
    )
    
    return {
        "message": f"Delivery {delivery_id} marked as {status_data.status}",
        "has_photo": status_data.photo_base64 is not None
    }

# ==================== ROOT ROUTE ====================

@api_router.get("/")
async def root():
    return {"message": "Welcome to The Dabba API", "status": "running"}

# ==================== KITCHEN PORTAL ROUTES ====================

# Helper to check kitchen role
async def get_kitchen_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token_data = verify_token(credentials.credentials)
    user = await db.users.find_one({"id": token_data["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("role") not in ["kitchen", "admin"]:
        raise HTTPException(status_code=403, detail="Kitchen access required")
    return user

# Dashboard Stats
@api_router.get("/kitchen/dashboard")
async def kitchen_dashboard(current_user: dict = Depends(get_kitchen_user)):
    total_customers = await db.users.count_documents({"role": "customer"})
    active_subscriptions = await db.subscriptions.count_documents({"status": "active"})
    total_dishes = await db.dishes.count_documents({})
    
    # Today's deliveries
    today = datetime.now().date().isoformat()
    completed_today = await db.completed_deliveries.count_documents({
        "completed_at": {"$regex": f"^{today}"}
    })
    
    return {
        "total_customers": total_customers,
        "active_subscriptions": active_subscriptions,
        "total_dishes": total_dishes,
        "deliveries_today": active_subscriptions,
        "completed_today": completed_today,
        "pending_today": max(0, active_subscriptions - completed_today)
    }

# ==================== DISH MANAGEMENT ====================

@api_router.get("/kitchen/dishes")
async def get_all_dishes(current_user: dict = Depends(get_kitchen_user)):
    dishes = await db.dishes.find({}).to_list(100)
    return {"dishes": [{k: v for k, v in d.items() if k != "_id"} for d in dishes]}

@api_router.post("/kitchen/dishes")
async def create_dish(dish: DishCreate, current_user: dict = Depends(get_kitchen_user)):
    dish_data = {
        "id": str(uuid.uuid4()),
        "name": dish.name,
        "description": dish.description,
        "type": dish.type,
        "category": dish.category,
        "quantity_per_tiffin": dish.quantity_per_tiffin,
        "unit": dish.unit,
        "image_url": dish.image_url,
        "created_at": datetime.utcnow().isoformat(),
        "created_by": current_user["id"]
    }
    await db.dishes.insert_one(dish_data)
    return {"message": "Dish created", "dish": {k: v for k, v in dish_data.items() if k != "_id"}}

@api_router.put("/kitchen/dishes/{dish_id}")
async def update_dish(dish_id: str, dish: DishUpdate, current_user: dict = Depends(get_kitchen_user)):
    update_data = {k: v for k, v in dish.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.utcnow().isoformat()
    result = await db.dishes.update_one({"id": dish_id}, {"$set": update_data})
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Dish not found")
    
    return {"message": "Dish updated"}

@api_router.delete("/kitchen/dishes/{dish_id}")
async def delete_dish(dish_id: str, current_user: dict = Depends(get_kitchen_user)):
    result = await db.dishes.delete_one({"id": dish_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dish not found")
    return {"message": "Dish deleted"}

# ==================== MENU MANAGEMENT ====================

@api_router.get("/kitchen/menu")
async def get_kitchen_menu(current_user: dict = Depends(get_kitchen_user)):
    # Get menu for next 14 days
    today = datetime.now().date()
    menu_items = await db.menu_schedule.find({
        "date": {"$gte": today.isoformat()}
    }).sort("date", 1).to_list(14)
    
    # Get all dishes for reference
    dishes = await db.dishes.find({}).to_list(100)
    dish_map = {d["id"]: d for d in dishes}
    
    result = []
    for item in menu_items:
        # Get dinner items (multi-select)
        dinner_ids = item.get("dinner_item_ids", [])
        dinner_items = [
            {k: v for k, v in dish_map.get(did, {}).items() if k != "_id"} 
            for did in dinner_ids if did in dish_map
        ]
        result.append({
            "date": item["date"],
            "dinner_items": dinner_items,
            # Legacy support
            "dinner": dinner_items[0] if dinner_items else None
        })
    
    # Group dishes by category
    categories = ["roti", "sabji", "dal", "rice", "salad", "extra"]
    dishes_by_category = {cat: [] for cat in categories}
    for d in dishes:
        cat = d.get("category", "sabji")
        if cat in dishes_by_category:
            dishes_by_category[cat].append({k: v for k, v in d.items() if k != "_id"})
    
    return {
        "menu": result, 
        "dishes": [{k: v for k, v in d.items() if k != "_id"} for d in dishes],
        "dishes_by_category": dishes_by_category,
        "categories": categories
    }

@api_router.post("/kitchen/menu")
async def set_menu_day(menu_data: MenuDaySet, current_user: dict = Depends(get_kitchen_user)):
    """Set dinner menu for a day - supports multi-select items"""
    menu_entry = {
        "date": menu_data.date,
        "dinner_item_ids": menu_data.dinner_item_ids,
        "updated_at": datetime.utcnow().isoformat(),
        "updated_by": current_user["id"]
    }
    
    await db.menu_schedule.update_one(
        {"date": menu_data.date},
        {"$set": menu_entry},
        upsert=True
    )
    
    return {"message": f"Dinner menu set for {menu_data.date}", "item_count": len(menu_data.dinner_item_ids)}

# ==================== CUSTOMER MANAGEMENT ====================

@api_router.get("/kitchen/customers")
async def get_all_customers(current_user: dict = Depends(get_kitchen_user)):
    customers = await db.users.find({"role": "customer"}).to_list(200)
    
    # Batch fetch all subscriptions to avoid N+1 queries
    customer_ids = [c["id"] for c in customers]
    subs = await db.subscriptions.find({"user_id": {"$in": customer_ids}}).to_list(200)
    sub_map = {s["user_id"]: s for s in subs}
    
    result = []
    for c in customers:
        sub = sub_map.get(c["id"])
        result.append({
            "id": c["id"],
            "name": c.get("name", ""),
            "email": c.get("email", ""),
            "phone": c.get("phone", ""),
            "address": c.get("address", ""),
            "created_at": c.get("created_at", ""),
            "subscription": {
                "plan": sub.get("plan") if sub else None,
                "status": sub.get("status") if sub else None,
                "delivery_address": sub.get("delivery_address") if sub else None
            } if sub else None
        })
    
    return {"customers": result}

# ==================== ORDER/DELIVERY MANAGEMENT ====================

@api_router.get("/kitchen/orders")
async def get_kitchen_orders(current_user: dict = Depends(get_kitchen_user)):
    today = datetime.now().date().isoformat()
    
    # Get all active subscriptions (today's orders)
    subscriptions = await db.subscriptions.find({"status": "active"}).to_list(200)
    
    # Batch fetch all users to avoid N+1 queries
    user_ids = [sub["user_id"] for sub in subscriptions]
    users = await db.users.find({"id": {"$in": user_ids}}).to_list(200)
    user_map = {u["id"]: u for u in users}
    
    # Get today's delivery queue
    delivery_queue = await db.delivery_queue.find({"date": today}).to_list(200)
    queue_map = {d["subscription_id"]: d for d in delivery_queue}
    
    orders = []
    for sub in subscriptions:
        user = user_map.get(sub["user_id"])
        
        # Check if skipped today
        skipped_today = any(
            s.get("date") == today 
            for s in sub.get("skipped_meals", [])
        )
        
        # Check delivery status
        queue_item = queue_map.get(sub["id"])
        delivery_status = "pending"
        delivery_number = None
        
        if skipped_today:
            delivery_status = "skipped"
        elif queue_item:
            delivery_status = queue_item.get("status", "ready")
            delivery_number = queue_item.get("delivery_number")
        
        if user:
            orders.append({
                "id": sub["id"],
                "customer_name": user.get("name", "Unknown"),
                "customer_phone": user.get("phone", ""),
                "customer_email": user.get("email", ""),
                "plan": sub.get("plan", ""),
                "delivery_address": sub.get("delivery_address", user.get("address", "")),
                "status": delivery_status,
                "delivery_number": delivery_number,
                "skipped": skipped_today
            })
    
    return {"orders": orders, "date": today}

# ==================== SMART DELIVERY SYSTEM ====================

@api_router.post("/kitchen/mark-ready")
async def mark_orders_ready(data: MarkReadyForDelivery, current_user: dict = Depends(get_kitchen_user)):
    """Mark orders as ready for delivery and auto-generate delivery numbers"""
    today = datetime.now().date().isoformat()
    
    # Get current max delivery number for today
    last_delivery = await db.delivery_queue.find_one(
        {"date": today},
        sort=[("delivery_number", -1)]
    )
    next_number = (last_delivery.get("delivery_number", 0) if last_delivery else 0) + 1
    
    ready_orders = []
    for order_id in data.order_ids:
        sub = await db.subscriptions.find_one({"id": order_id})
        if sub:
            user = await db.users.find_one({"id": sub["user_id"]})
            address = sub.get("delivery_address", user.get("address", "") if user else "")
            coords = get_coords_for_address(address)
            
            delivery_item = {
                "id": str(uuid.uuid4()),
                "subscription_id": order_id,
                "user_id": sub["user_id"],
                "date": today,
                "delivery_number": next_number,
                "customer_name": user.get("name", "Unknown") if user else "Unknown",
                "customer_phone": user.get("phone", "") if user else "",
                "address": address,
                "plan": sub.get("plan", ""),
                "latitude": coords["lat"],
                "longitude": coords["lon"],
                "status": "ready",
                "ready_at": datetime.utcnow().isoformat(),
                "created_by": current_user["id"]
            }
            
            await db.delivery_queue.update_one(
                {"subscription_id": order_id, "date": today},
                {"$set": delivery_item},
                upsert=True
            )
            
            ready_orders.append({
                "delivery_number": next_number,
                "customer_name": delivery_item["customer_name"],
                "address": address,
                "plan": delivery_item["plan"]
            })
            next_number += 1
    
    return {"message": f"Marked {len(ready_orders)} orders as ready", "orders": ready_orders}

@api_router.get("/kitchen/print-labels")
async def get_print_labels(current_user: dict = Depends(get_kitchen_user)):
    """Get all ready orders for label printing"""
    today = datetime.now().date().isoformat()
    
    ready_orders = await db.delivery_queue.find({
        "date": today,
        "status": "ready"
    }).sort("delivery_number", 1).to_list(200)
    
    labels = []
    for order in ready_orders:
        labels.append({
            "delivery_number": order.get("delivery_number"),
            "customer_name": order.get("customer_name"),
            "address": order.get("address"),
            "plan": order.get("plan"),
            "phone": order.get("customer_phone", "")
        })
    
    return {"labels": labels, "date": today}

# ==================== DRIVER REAL-TIME TRACKING ====================

@api_router.post("/driver/update-location")
async def update_driver_location(location: DriverLocationUpdate, current_user: dict = Depends(get_current_user)):
    """Update driver's real-time location"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="Driver role required")
    
    location_data = {
        "driver_id": current_user["id"],
        "driver_name": current_user.get("name", "Driver"),
        "latitude": location.latitude,
        "longitude": location.longitude,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    await db.driver_locations.update_one(
        {"driver_id": current_user["id"]},
        {"$set": location_data},
        upsert=True
    )
    
    return {"message": "Location updated", "location": location_data}

@api_router.get("/driver/optimized-route")
async def get_optimized_route(
    lat: float,
    lon: float,
    current_user: dict = Depends(get_current_user)
):
    """Get deliveries sorted by optimized route from driver's current location"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="Driver role required")
    
    today = datetime.now().date().isoformat()
    
    # Get all ready deliveries
    deliveries = await db.delivery_queue.find({
        "date": today,
        "status": {"$in": ["ready", "out_for_delivery"]}
    }).to_list(200)
    
    # Calculate distances and sort
    for delivery in deliveries:
        distance = calculate_distance(
            lat, lon,
            delivery.get("latitude", 0),
            delivery.get("longitude", 0)
        )
        delivery["distance"] = distance
        delivery["estimated_time"] = max(5, int(distance * 3))  # ~3 mins per km
    
    # Sort by distance (nearest first)
    deliveries.sort(key=lambda x: x["distance"])
    
    # Assign route order
    route = []
    for idx, delivery in enumerate(deliveries):
        route.append({
            "route_order": idx + 1,
            "delivery_id": delivery.get("id"),
            "delivery_number": delivery.get("delivery_number"),
            "customer_name": delivery.get("customer_name"),
            "customer_phone": delivery.get("customer_phone"),
            "address": delivery.get("address"),
            "plan": delivery.get("plan"),
            "latitude": delivery.get("latitude"),
            "longitude": delivery.get("longitude"),
            "distance": delivery.get("distance"),
            "estimated_time": delivery.get("estimated_time"),
            "status": delivery.get("status")
        })
    
    return {"route": route, "total_deliveries": len(route)}

@api_router.put("/driver/start-delivery/{delivery_id}")
async def start_delivery(delivery_id: str, current_user: dict = Depends(get_current_user)):
    """Mark delivery as out for delivery"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="Driver role required")
    
    result = await db.delivery_queue.update_one(
        {"id": delivery_id},
        {"$set": {
            "status": "out_for_delivery",
            "driver_id": current_user["id"],
            "driver_name": current_user.get("name"),
            "started_at": datetime.utcnow().isoformat()
        }}
    )
    
    return {"message": "Delivery started", "delivery_id": delivery_id}

@api_router.put("/driver/complete-delivery/{delivery_id}")
async def complete_delivery(
    delivery_id: str,
    status_data: DeliveryStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Mark delivery as completed with photo proof"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="Driver role required")
    
    # Update delivery queue
    await db.delivery_queue.update_one(
        {"id": delivery_id},
        {"$set": {
            "status": "delivered",
            "delivered_at": datetime.utcnow().isoformat(),
            "photo_base64": status_data.photo_base64
        }}
    )
    
    # Also store in completed deliveries
    delivery = await db.delivery_queue.find_one({"id": delivery_id})
    if delivery:
        completion_record = {
            "id": delivery_id,
            "delivery_number": delivery.get("delivery_number"),
            "customer_name": delivery.get("customer_name"),
            "address": delivery.get("address"),
            "driver_id": current_user["id"],
            "driver_name": current_user.get("name"),
            "completed_at": datetime.utcnow().isoformat(),
            "photo_base64": status_data.photo_base64
        }
        await db.completed_deliveries.update_one(
            {"id": delivery_id},
            {"$set": completion_record},
            upsert=True
        )
    
    return {"message": "Delivery completed", "delivery_id": delivery_id}

# Constants for credit system
MEAL_CREDIT_VALUE_CAD = 12.00  # Per meal credit value in CAD

@api_router.put("/driver/fail-delivery/{delivery_id}")
async def fail_delivery(
    delivery_id: str,
    reason: str = "customer_unavailable",
    current_user: dict = Depends(get_current_user)
):
    """Mark delivery as failed and auto-credit customer wallet"""
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="Driver role required")
    
    delivery = await db.delivery_queue.find_one({"id": delivery_id})
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    # Update delivery status
    await db.delivery_queue.update_one(
        {"id": delivery_id},
        {"$set": {
            "status": "failed",
            "failed_at": datetime.utcnow().isoformat(),
            "failure_reason": reason,
            "driver_id": current_user["id"]
        }}
    )
    
    # Auto-credit customer wallet
    customer_id = delivery.get("customer_id")
    if customer_id:
        # Get current wallet balance
        wallet = await db.wallets.find_one({"user_id": customer_id})
        current_balance = wallet.get("balance", 0) if wallet else 0
        new_balance = current_balance + MEAL_CREDIT_VALUE_CAD
        
        await db.wallets.update_one(
            {"user_id": customer_id},
            {"$set": {
                "balance": new_balance,
                "updated_at": datetime.utcnow().isoformat()
            }},
            upsert=True
        )
        
        # Record transaction
        transaction = {
            "id": str(uuid.uuid4()),
            "user_id": customer_id,
            "type": "credit",
            "amount": MEAL_CREDIT_VALUE_CAD,
            "description": f"Failed delivery credit ({reason})",
            "delivery_id": delivery_id,
            "created_at": datetime.utcnow().isoformat()
        }
        await db.wallet_transactions.insert_one(transaction)
        
        # Deduct from kitchen payout (track separately)
        today = datetime.now().date().isoformat()
        await db.kitchen_deductions.insert_one({
            "date": today,
            "amount": MEAL_CREDIT_VALUE_CAD,
            "reason": f"Failed delivery: {reason}",
            "delivery_id": delivery_id,
            "customer_id": customer_id,
            "created_at": datetime.utcnow().isoformat()
        })
    
    return {
        "message": "Delivery marked as failed",
        "customer_credited": MEAL_CREDIT_VALUE_CAD,
        "reason": reason
    }

# ==================== CUSTOMER TRACKING ====================

@api_router.get("/customer/delivery-status")
async def get_customer_delivery_status(current_user: dict = Depends(get_current_user)):
    """Get real-time delivery status for customer"""
    if current_user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Customer role required")
    
    today = datetime.now().date().isoformat()
    
    # Find customer's subscription
    subscription = await db.subscriptions.find_one({
        "user_id": current_user["id"],
        "status": "active"
    })
    
    if not subscription:
        return {"status": "no_subscription", "message": "No active subscription found"}
    
    # Check if skipped today
    skipped = any(
        s.get("date") == today 
        for s in subscription.get("skipped_meals", [])
    )
    
    if skipped:
        return {"status": "skipped", "message": "You skipped today's meal"}
    
    # Get delivery status
    delivery = await db.delivery_queue.find_one({
        "subscription_id": subscription["id"],
        "date": today
    })
    
    if not delivery:
        return {
            "status": "preparing",
            "message": "Your meal is being prepared in the kitchen"
        }
    
    # Get driver location if out for delivery
    driver_location = None
    if delivery.get("status") == "out_for_delivery" and delivery.get("driver_id"):
        driver_loc = await db.driver_locations.find_one({"driver_id": delivery["driver_id"]})
        if driver_loc:
            driver_location = {
                "latitude": driver_loc.get("latitude"),
                "longitude": driver_loc.get("longitude"),
                "updated_at": driver_loc.get("updated_at")
            }
    
    response = {
        "status": delivery.get("status", "pending"),
        "delivery_number": delivery.get("delivery_number"),
        "estimated_time": delivery.get("estimated_time"),
        "driver_name": delivery.get("driver_name"),
        "driver_location": driver_location,
        "message": get_status_message(delivery.get("status"))
    }
    
    if delivery.get("status") == "delivered":
        response["delivered_at"] = delivery.get("delivered_at")
        response["photo_url"] = delivery.get("photo_base64") is not None
    
    return response

def get_status_message(status: str) -> str:
    messages = {
        "pending": "Your order is pending",
        "ready": "Your tiffin is ready for delivery",
        "out_for_delivery": "Driver is on the way with your tiffin!",
        "delivered": "Your tiffin has been delivered. Enjoy!",
    }
    return messages.get(status, "Processing your order")

@api_router.get("/customer/track-driver")
async def track_driver(current_user: dict = Depends(get_current_user)):
    """Get real-time driver location for customer"""
    if current_user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Customer role required")
    
    today = datetime.now().date().isoformat()
    
    subscription = await db.subscriptions.find_one({
        "user_id": current_user["id"],
        "status": "active"
    })
    
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription")
    
    delivery = await db.delivery_queue.find_one({
        "subscription_id": subscription["id"],
        "date": today,
        "status": "out_for_delivery"
    })
    
    if not delivery:
        return {"tracking": False, "message": "Driver not dispatched yet"}
    
    driver_loc = await db.driver_locations.find_one({"driver_id": delivery.get("driver_id")})
    
    if not driver_loc:
        return {"tracking": False, "message": "Driver location not available"}
    
    # Calculate distance to customer
    customer_coords = get_coords_for_address(delivery.get("address", ""))
    distance = calculate_distance(
        driver_loc["latitude"], driver_loc["longitude"],
        customer_coords["lat"], customer_coords["lon"]
    )
    
    return {
        "tracking": True,
        "driver_name": delivery.get("driver_name"),
        "driver_location": {
            "latitude": driver_loc["latitude"],
            "longitude": driver_loc["longitude"]
        },
        "customer_location": {
            "latitude": customer_coords["lat"],
            "longitude": customer_coords["lon"]
        },
        "distance_km": distance,
        "estimated_minutes": max(3, int(distance * 3)),
        "updated_at": driver_loc.get("updated_at")
    }

# ==================== PLATINUM TIFFIN FEATURES ====================

# Spice Preferences
@api_router.get("/customer/preferences")
async def get_customer_preferences(current_user: dict = Depends(get_current_user)):
    """Get customer's spice and dietary preferences"""
    if current_user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Customer role required")
    
    prefs = await db.customer_preferences.find_one({"user_id": current_user["id"]})
    return {
        "spice_level": prefs.get("spice_level", "medium") if prefs else "medium",
        "dietary_notes": prefs.get("dietary_notes", "") if prefs else "",
        "allergies": prefs.get("allergies", []) if prefs else []
    }

@api_router.put("/customer/preferences")
async def update_customer_preferences(
    preferences: SpicePreference,
    current_user: dict = Depends(get_current_user)
):
    """Update customer's spice preference"""
    if current_user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Customer role required")
    
    await db.customer_preferences.update_one(
        {"user_id": current_user["id"]},
        {"$set": {
            "user_id": current_user["id"],
            "spice_level": preferences.level,
            "updated_at": datetime.utcnow().isoformat()
        }},
        upsert=True
    )
    return {"message": "Preferences updated", "spice_level": preferences.level}

# Rate My Dinner
@api_router.post("/customer/rate-meal")
async def rate_meal(rating: MealRating, current_user: dict = Depends(get_current_user)):
    """Quick emoji feedback for a meal"""
    if current_user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Customer role required")
    
    rating_data = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "date": rating.date,
        "rating": rating.rating,  # yummy, good, bad
        "feedback": rating.feedback,
        "created_at": datetime.utcnow().isoformat()
    }
    await db.meal_ratings.insert_one(rating_data)
    
    # If bad rating, could trigger automatic follow-up
    if rating.rating == "bad" and not rating.feedback:
        return {
            "message": "Thanks for your feedback! What could we improve?",
            "needs_feedback": True
        }
    
    return {"message": "Thank you for rating your meal!", "needs_feedback": False}

# Halifax Weather Alert System
HALIFAX_WEATHER_ALERTS = {
    "normal": {"status": "normal", "message": "Deliveries running on schedule", "delay_minutes": 0},
    "light_snow": {"status": "caution", "message": "Light snow: Deliveries may be delayed by 15-30 mins", "delay_minutes": 30},
    "heavy_snow": {"status": "warning", "message": "Heavy snow warning: Deliveries delayed by 30-60 mins. Stay safe!", "delay_minutes": 60},
    "ice_storm": {"status": "severe", "message": "Ice storm alert: Deliveries paused for safety. Credits will be issued.", "delay_minutes": -1},
    "blizzard": {"status": "severe", "message": "Blizzard warning: All deliveries cancelled today. Full credits issued.", "delay_minutes": -1}
}

@api_router.get("/weather-status")
async def get_weather_status():
    """Get current Halifax weather status for delivery alerts"""
    # In production, this would integrate with Environment Canada API
    # For now, check our mock weather status
    weather = await db.system_settings.find_one({"key": "weather_status"})
    
    if weather and weather.get("value") in HALIFAX_WEATHER_ALERTS:
        alert = HALIFAX_WEATHER_ALERTS[weather["value"]]
        return {
            "condition": weather["value"],
            **alert,
            "region": "Halifax Regional Municipality",
            "updated_at": weather.get("updated_at", datetime.utcnow().isoformat())
        }
    
    return {
        "condition": "normal",
        **HALIFAX_WEATHER_ALERTS["normal"],
        "region": "Halifax Regional Municipality",
        "updated_at": datetime.utcnow().isoformat()
    }

@api_router.put("/kitchen/weather-status")
async def set_weather_status(status: str, current_user: dict = Depends(get_kitchen_user)):
    """Kitchen admin can set weather status manually"""
    if status not in HALIFAX_WEATHER_ALERTS:
        raise HTTPException(status_code=400, detail=f"Invalid status. Use: {list(HALIFAX_WEATHER_ALERTS.keys())}")
    
    await db.system_settings.update_one(
        {"key": "weather_status"},
        {"$set": {
            "key": "weather_status",
            "value": status,
            "updated_at": datetime.utcnow().isoformat(),
            "updated_by": current_user["id"]
        }},
        upsert=True
    )
    
    return {"message": f"Weather status set to: {status}", "alert": HALIFAX_WEATHER_ALERTS[status]}

# 7-Day Dinner Discovery
@api_router.get("/customer/weekly-plan")
async def get_weekly_dinner_plan(current_user: dict = Depends(get_current_user)):
    """Get 7-day dinner plan with skip status and menu items"""
    if current_user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Customer role required")
    
    subscription = await db.subscriptions.find_one({
        "user_id": current_user["id"],
        "status": "active"
    })
    
    if not subscription:
        return {"error": "No active subscription", "days": []}
    
    skipped_meals = subscription.get("skipped_meals", [])
    skipped_dates = {s["date"] for s in skipped_meals}
    
    today = datetime.now().date()
    days = []
    
    for i in range(7):
        date = today + timedelta(days=i)
        date_str = date.isoformat()
        
        # Get menu for this day
        menu = await db.menu_schedule.find_one({"date": date_str})
        dinner_items = []
        
        if menu:
            item_ids = menu.get("dinner_item_ids", [])
            if item_ids:
                dishes = await db.dishes.find({"id": {"$in": item_ids}}).to_list(10)
                dinner_items = [
                    {
                        "id": d["id"],
                        "name": d["name"],
                        "category": d.get("category", "sabji"),
                        "quantity": d.get("quantity_per_tiffin", 1),
                        "unit": d.get("unit", "portion")
                    }
                    for d in dishes
                ]
        
        # Get add-ons for this day
        add_ons = await db.customer_addons.find({
            "user_id": current_user["id"],
            "date": date_str
        }).to_list(5)
        
        # Calculate skip deadline (24 hours before 4 PM delivery)
        delivery_time = datetime.combine(date, datetime.min.time()).replace(hour=16)
        cutoff_time = delivery_time - timedelta(hours=24)
        can_skip = datetime.now() < cutoff_time
        
        days.append({
            "date": date_str,
            "day_name": date.strftime("%A"),
            "is_today": i == 0,
            "is_skipped": date_str in skipped_dates,
            "can_skip": can_skip,
            "cutoff_time": cutoff_time.isoformat(),
            "dinner_items": dinner_items,
            "item_summary": ", ".join([f"{d['quantity']}x {d['name']}" for d in dinner_items[:3]]) if dinner_items else "Menu not set",
            "add_ons": [{"name": a.get("item_name"), "price": a.get("price", 0)} for a in add_ons]
        })
    
    return {
        "subscription_plan": subscription.get("plan"),
        "days": days,
        "wallet_balance": (await db.wallets.find_one({"user_id": current_user["id"]}) or {}).get("balance", 0)
    }

# Add-On Marketplace
@api_router.get("/extras")
async def get_extra_items():
    """Get available add-on items"""
    extras = await db.extra_items.find({"is_available": True}).to_list(20)
    
    # Seed default extras if none exist
    if not extras:
        default_extras = [
            {"id": str(uuid.uuid4()), "name": "Cold Mango Lassi", "description": "Refreshing mango yogurt drink", "price": 4.99, "category": "beverage", "is_available": True},
            {"id": str(uuid.uuid4()), "name": "Sweet Lassi", "description": "Traditional sweet yogurt drink", "price": 3.99, "category": "beverage", "is_available": True},
            {"id": str(uuid.uuid4()), "name": "Masala Chai", "description": "Spiced Indian tea", "price": 2.99, "category": "beverage", "is_available": True},
            {"id": str(uuid.uuid4()), "name": "Extra Gulab Jamun (2pc)", "description": "Additional sweet dumplings", "price": 3.99, "category": "dessert", "is_available": True},
            {"id": str(uuid.uuid4()), "name": "Rasmalai (2pc)", "description": "Soft cottage cheese in sweet milk", "price": 4.99, "category": "dessert", "is_available": True},
            {"id": str(uuid.uuid4()), "name": "Samosa (2pc)", "description": "Crispy potato-filled pastries", "price": 3.49, "category": "snack", "is_available": True},
            {"id": str(uuid.uuid4()), "name": "Extra Roti (3pc)", "description": "Additional butter rotis", "price": 2.99, "category": "bread", "is_available": True},
            {"id": str(uuid.uuid4()), "name": "Papad Pack", "description": "Crispy lentil wafers", "price": 1.99, "category": "snack", "is_available": True},
        ]
        for extra in default_extras:
            await db.extra_items.insert_one(extra)
        extras = default_extras
    
    return {"extras": [{k: v for k, v in e.items() if k != "_id"} for e in extras]}

@api_router.post("/customer/add-extra")
async def add_extra_to_day(addon: AddOnOrder, current_user: dict = Depends(get_current_user)):
    """Add an extra item to a specific day's order"""
    if current_user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Customer role required")
    
    # Get the extra item
    extra = await db.extra_items.find_one({"id": addon.item_id})
    if not extra:
        raise HTTPException(status_code=404, detail="Extra item not found")
    
    # Add to customer's order for that day
    order_data = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "date": addon.date,
        "item_id": addon.item_id,
        "item_name": extra["name"],
        "price": extra["price"] * addon.quantity,
        "quantity": addon.quantity,
        "created_at": datetime.utcnow().isoformat()
    }
    await db.customer_addons.insert_one(order_data)
    
    return {
        "message": f"Added {addon.quantity}x {extra['name']} for {addon.date}",
        "total_price": extra["price"] * addon.quantity
    }

# Ingredient Forecast for Kitchen
@api_router.get("/kitchen/ingredient-forecast")
async def get_ingredient_forecast(current_user: dict = Depends(get_kitchen_user)):
    """Generate 7-day procurement list based on upcoming menu and subscriptions"""
    today = datetime.now().date()
    forecast = {}
    daily_breakdown = []
    
    # Get active subscriptions count
    active_subs = await db.subscriptions.find({"status": "active"}).to_list(500)
    
    for i in range(7):
        date = today + timedelta(days=i)
        date_str = date.isoformat()
        
        # Get menu for this day
        menu = await db.menu_schedule.find_one({"date": date_str})
        if not menu:
            daily_breakdown.append({
                "date": date_str,
                "day": date.strftime("%A"),
                "menu_set": False,
                "items": []
            })
            continue
        
        # Count non-skipped orders
        skipped_count = 0
        for sub in active_subs:
            if any(s.get("date") == date_str for s in sub.get("skipped_meals", [])):
                skipped_count += 1
        
        active_orders = len(active_subs) - skipped_count
        
        # Get dishes and calculate quantities
        item_ids = menu.get("dinner_item_ids", [])
        dishes = await db.dishes.find({"id": {"$in": item_ids}}).to_list(20)
        
        day_items = []
        for dish in dishes:
            qty = dish.get("quantity_per_tiffin", 1)
            unit = dish.get("unit", "portion")
            total = qty * active_orders
            
            day_items.append({
                "name": dish["name"],
                "category": dish.get("category", "sabji"),
                "per_tiffin": qty,
                "unit": unit,
                "total_needed": total
            })
            
            # Aggregate for weekly forecast
            key = f"{dish['name']} ({unit})"
            if key not in forecast:
                forecast[key] = {"name": dish["name"], "unit": unit, "total": 0, "category": dish.get("category")}
            forecast[key]["total"] += total
        
        daily_breakdown.append({
            "date": date_str,
            "day": date.strftime("%A"),
            "menu_set": True,
            "active_orders": active_orders,
            "skipped": skipped_count,
            "items": day_items
        })
    
    # Group forecast by category
    by_category = {}
    for key, item in forecast.items():
        cat = item.get("category", "other")
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append({
            "name": item["name"],
            "total": item["total"],
            "unit": item["unit"]
        })
    
    return {
        "period": f"{today.isoformat()} to {(today + timedelta(days=6)).isoformat()}",
        "total_active_subscriptions": len(active_subs),
        "weekly_forecast": list(forecast.values()),
        "by_category": by_category,
        "daily_breakdown": daily_breakdown
    }

# Kitchen Dashboard - Get customer spice preferences
@api_router.get("/kitchen/customer-preferences")
async def get_all_customer_preferences(current_user: dict = Depends(get_kitchen_user)):
    """Get all customer spice preferences for the prep list"""
    prefs = await db.customer_preferences.find({}).to_list(500)
    
    # Get user names
    result = []
    for pref in prefs:
        user = await db.users.find_one({"id": pref["user_id"]})
        if user:
            result.append({
                "customer_name": user.get("name"),
                "customer_id": pref["user_id"],
                "spice_level": pref.get("spice_level", "medium"),
                "allergies": pref.get("allergies", []),
                "dietary_notes": pref.get("dietary_notes", "")
            })
    
    return {"preferences": result}

# Meal Ratings for Kitchen
@api_router.get("/kitchen/meal-ratings")
async def get_meal_ratings(current_user: dict = Depends(get_kitchen_user)):
    """Get recent meal ratings for quality improvement"""
    ratings = await db.meal_ratings.find({}).sort("created_at", -1).to_list(50)
    
    # Aggregate ratings
    total = len(ratings)
    yummy = sum(1 for r in ratings if r.get("rating") == "yummy")
    good = sum(1 for r in ratings if r.get("rating") == "good")
    bad = sum(1 for r in ratings if r.get("rating") == "bad")
    
    # Get bad ratings with feedback for improvement
    bad_feedback = [
        {
            "date": r.get("date"),
            "feedback": r.get("feedback"),
            "user_id": r.get("user_id")
        }
        for r in ratings if r.get("rating") == "bad" and r.get("feedback")
    ]
    
    return {
        "total_ratings": total,
        "summary": {
            "yummy": yummy,
            "good": good, 
            "bad": bad,
            "satisfaction_rate": round((yummy + good) / total * 100, 1) if total > 0 else 0
        },
        "recent_bad_feedback": bad_feedback[:10]
    }

# ==================== SEED DEFAULT DISHES ====================

@api_router.post("/kitchen/seed-dishes")
async def seed_default_dishes(current_user: dict = Depends(get_kitchen_user)):
    """Seed database with default menu items organized by category"""
    default_dishes = [
        # Breads
        {"name": "Bhakhari", "description": "Traditional Gujarati crispy millet flatbread", "type": "Breads", "price": 3, "category": "Breads"},
        {"name": "Fulka Roti", "description": "Soft whole wheat puffed bread", "type": "Breads", "price": 2, "category": "Breads"},
        {"name": "Paratha", "description": "Layered whole wheat flatbread", "type": "Breads", "price": 3, "category": "Breads"},
        {"name": "Puri", "description": "Deep-fried puffed bread", "type": "Breads", "price": 3, "category": "Breads"},
        {"name": "Bread", "description": "Fresh sliced bread", "type": "Breads", "price": 2, "category": "Breads"},
        
        # Rice & Grains
        {"name": "Plain Rice", "description": "Steamed basmati rice", "type": "Rice & Grains", "price": 4, "category": "Rice & Grains"},
        {"name": "Jeera Rice", "description": "Cumin tempered basmati rice", "type": "Rice & Grains", "price": 5, "category": "Rice & Grains"},
        {"name": "Pulav", "description": "Vegetable pulao with fragrant spices", "type": "Rice & Grains", "price": 6, "category": "Rice & Grains"},
        {"name": "Biryani-raita", "description": "Fragrant biryani served with raita", "type": "Rice & Grains", "price": 8, "category": "Rice & Grains"},
        {"name": "Sadi Khichadi", "description": "Simple rice and lentil comfort dish", "type": "Rice & Grains", "price": 5, "category": "Rice & Grains"},
        {"name": "Masala Khichadi", "description": "Spiced rice and lentil dish with vegetables", "type": "Rice & Grains", "price": 6, "category": "Rice & Grains"},
        
        # Main Dishes (Sabji/Curry)
        {"name": "Ringan-bataka", "description": "Eggplant and potato curry", "type": "Main Dishes", "price": 6, "category": "Main Dishes"},
        {"name": "Alu-cauliflower", "description": "Potato and cauliflower dry curry", "type": "Main Dishes", "price": 6, "category": "Main Dishes"},
        {"name": "Rasawala Bataka Tameta", "description": "Potato and tomato curry with gravy", "type": "Main Dishes", "price": 6, "category": "Main Dishes"},
        {"name": "Guvar-bataka Sabji", "description": "Cluster beans with potato", "type": "Main Dishes", "price": 6, "category": "Main Dishes"},
        {"name": "Paneer Butter Masala", "description": "Cottage cheese in rich tomato gravy", "type": "Main Dishes", "price": 8, "category": "Main Dishes"},
        {"name": "Paneer Handi", "description": "Paneer cooked in traditional handi style", "type": "Main Dishes", "price": 8, "category": "Main Dishes"},
        {"name": "Palak Paneer", "description": "Spinach curry with cottage cheese", "type": "Main Dishes", "price": 8, "category": "Main Dishes"},
        {"name": "Sweet Corn Paneer", "description": "Sweet corn and paneer in creamy gravy", "type": "Main Dishes", "price": 8, "category": "Main Dishes"},
        {"name": "Fanasi Sabji", "description": "French beans curry", "type": "Main Dishes", "price": 6, "category": "Main Dishes"},
        {"name": "Sev Tameta", "description": "Tomato curry topped with crispy sev", "type": "Main Dishes", "price": 5, "category": "Main Dishes"},
        {"name": "Lasaniya Bataka", "description": "Garlic flavored baby potato curry", "type": "Main Dishes", "price": 6, "category": "Main Dishes"},
        {"name": "Pav-bhaji", "description": "Spiced mashed vegetable curry with buttered pav", "type": "Main Dishes", "price": 7, "category": "Main Dishes"},
        
        # Dals & Kathol
        {"name": "Gujarati Dal", "description": "Sweet and tangy yellow lentil soup", "type": "Dals & Kathol", "price": 5, "category": "Dals & Kathol"},
        {"name": "Dal Makhani", "description": "Creamy black lentils slow-cooked overnight", "type": "Dals & Kathol", "price": 7, "category": "Dals & Kathol"},
        {"name": "Panchratna Dal", "description": "Five lentil mix dal", "type": "Dals & Kathol", "price": 6, "category": "Dals & Kathol"},
        {"name": "Dal Tadka", "description": "Yellow lentils tempered with cumin and garlic", "type": "Dals & Kathol", "price": 5, "category": "Dals & Kathol"},
        {"name": "Chole", "description": "Spiced chickpea curry", "type": "Dals & Kathol", "price": 6, "category": "Dals & Kathol"},
        {"name": "Rajma", "description": "Kidney beans curry", "type": "Dals & Kathol", "price": 6, "category": "Dals & Kathol"},
        {"name": "Mix Kathol", "description": "Mixed legumes curry", "type": "Dals & Kathol", "price": 6, "category": "Dals & Kathol"},
        {"name": "Kala Chana", "description": "Black chickpea curry", "type": "Dals & Kathol", "price": 6, "category": "Dals & Kathol"},
        {"name": "Whole Masoor", "description": "Whole red lentil curry", "type": "Dals & Kathol", "price": 5, "category": "Dals & Kathol"},
        {"name": "Mug", "description": "Mung bean curry", "type": "Dals & Kathol", "price": 5, "category": "Dals & Kathol"},
        {"name": "Tuar Thoda", "description": "Pigeon pea curry", "type": "Dals & Kathol", "price": 5, "category": "Dals & Kathol"},
        
        # Sides & Drinks
        {"name": "Meethi Kadi", "description": "Sweet and tangy yogurt curry", "type": "Sides & Drinks", "price": 4, "category": "Sides & Drinks"},
        {"name": "Salad", "description": "Fresh vegetable salad", "type": "Sides & Drinks", "price": 3, "category": "Sides & Drinks"},
        {"name": "Chas", "description": "Traditional buttermilk", "type": "Sides & Drinks", "price": 2, "category": "Sides & Drinks"},
        {"name": "Chatni", "description": "Fresh chutney", "type": "Sides & Drinks", "price": 2, "category": "Sides & Drinks"},
        {"name": "Idli-Sambhar", "description": "Steamed rice cakes with lentil soup", "type": "Sides & Drinks", "price": 5, "category": "Sides & Drinks"},
        {"name": "Pani Puri with Mitha Pani", "description": "Crispy puris with sweet tamarind water", "type": "Sides & Drinks", "price": 4, "category": "Sides & Drinks"},
        
        # Desserts
        {"name": "Gulab Jamun", "description": "Sweet milk dumplings in rose syrup", "type": "Desserts", "price": 4, "category": "Desserts"},
        {"name": "Barfi", "description": "Traditional milk fudge sweet", "type": "Desserts", "price": 4, "category": "Desserts"},
    ]
    
    count = 0
    for dish in default_dishes:
        existing = await db.dishes.find_one({"name": dish["name"]})
        if not existing:
            dish["id"] = str(uuid.uuid4())
            dish["created_at"] = datetime.utcnow().isoformat()
            dish["created_by"] = current_user["id"]
            await db.dishes.insert_one(dish)
            count += 1
    
    return {"message": f"Seeded {count} dishes", "total": len(default_dishes)}

# ==================== SUBSCRIPTION PLANS MANAGEMENT ====================

class SubscriptionPlanData(BaseModel):
    name: str
    price: float
    description: Optional[str] = None
    features: Optional[List[str]] = []
    is_active: bool = True

@api_router.get("/plans")
async def get_subscription_plans():
    """Get all subscription plans (public endpoint)"""
    plans = await db.subscription_plans.find({"is_active": True}).to_list(20)
    
    # If no plans exist, seed default plans
    if not plans:
        default_plans = [
            {
                "id": str(uuid.uuid4()),
                "name": "Eco",
                "price": 89.00,
                "description": "Basic vegetarian meals",
                "features": ["Vegetarian only", "1 meal/day", "Standard portions"],
                "icon": "leaf-outline",
                "color": "#10B981",
                "is_active": True,
                "created_at": datetime.utcnow().isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Standard",
                "price": 119.00,
                "description": "Mixed veg & non-veg meals",
                "features": ["Veg & Non-veg", "1 meal/day", "Regular portions", "Weekend specials"],
                "icon": "restaurant-outline",
                "color": "#C41E3A",
                "popular": True,
                "is_active": True,
                "created_at": datetime.utcnow().isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Premium",
                "price": 149.00,
                "description": "Gourmet meals with extras",
                "features": ["Premium ingredients", "1 meal/day", "Large portions", "Dessert included", "Priority delivery"],
                "icon": "star-outline",
                "color": "#8B5CF6",
                "is_active": True,
                "created_at": datetime.utcnow().isoformat()
            }
        ]
        await db.subscription_plans.insert_many(default_plans)
        plans = default_plans
    
    return {"plans": [{k: v for k, v in p.items() if k != "_id"} for p in plans]}

@api_router.get("/kitchen/plans")
async def get_kitchen_plans(current_user: dict = Depends(get_kitchen_user)):
    """Get all subscription plans for kitchen management"""
    plans = await db.subscription_plans.find({}).to_list(20)
    return {"plans": [{k: v for k, v in p.items() if k != "_id"} for p in plans]}

@api_router.post("/kitchen/plans")
async def create_subscription_plan(
    plan_data: SubscriptionPlanData,
    current_user: dict = Depends(get_kitchen_user)
):
    """Create a new subscription plan"""
    plan = {
        "id": str(uuid.uuid4()),
        "name": plan_data.name,
        "price": plan_data.price,
        "description": plan_data.description,
        "features": plan_data.features,
        "is_active": plan_data.is_active,
        "created_at": datetime.utcnow().isoformat(),
        "created_by": current_user["id"]
    }
    await db.subscription_plans.insert_one(plan)
    return {"message": "Plan created", "plan": {k: v for k, v in plan.items() if k != "_id"}}

@api_router.put("/kitchen/plans/{plan_id}")
async def update_subscription_plan(
    plan_id: str,
    plan_data: SubscriptionPlanData,
    current_user: dict = Depends(get_kitchen_user)
):
    """Update a subscription plan"""
    update_data = {
        "name": plan_data.name,
        "price": plan_data.price,
        "description": plan_data.description,
        "features": plan_data.features,
        "is_active": plan_data.is_active,
        "updated_at": datetime.utcnow().isoformat(),
        "updated_by": current_user["id"]
    }
    
    result = await db.subscription_plans.update_one(
        {"id": plan_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return {"message": "Plan updated"}

@api_router.delete("/kitchen/plans/{plan_id}")
async def delete_subscription_plan(
    plan_id: str,
    current_user: dict = Depends(get_kitchen_user)
):
    """Delete a subscription plan"""
    result = await db.subscription_plans.delete_one({"id": plan_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"message": "Plan deleted"}

# ==================== CATEGORIES MANAGEMENT ====================

class CategoryData(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = 0

@api_router.get("/categories")
async def get_categories():
    """Get all dish categories (public endpoint)"""
    categories = await db.categories.find({}).sort("sort_order", 1).to_list(50)
    
    # If no categories exist, seed default categories
    if not categories:
        default_categories = [
            {"id": str(uuid.uuid4()), "name": "Breads", "icon": "restaurant", "sort_order": 1},
            {"id": str(uuid.uuid4()), "name": "Rice & Grains", "icon": "leaf", "sort_order": 2},
            {"id": str(uuid.uuid4()), "name": "Main Dishes", "icon": "flame", "sort_order": 3},
            {"id": str(uuid.uuid4()), "name": "Dals & Kathol", "icon": "water", "sort_order": 4},
            {"id": str(uuid.uuid4()), "name": "Sides & Drinks", "icon": "cafe", "sort_order": 5},
            {"id": str(uuid.uuid4()), "name": "Desserts", "icon": "ice-cream", "sort_order": 6},
        ]
        await db.categories.insert_many(default_categories)
        categories = default_categories
    
    return {"categories": [{k: v for k, v in c.items() if k != "_id"} for c in categories]}

@api_router.get("/kitchen/categories")
async def get_kitchen_categories(current_user: dict = Depends(get_kitchen_user)):
    """Get all categories for kitchen management"""
    categories = await db.categories.find({}).sort("sort_order", 1).to_list(50)
    return {"categories": [{k: v for k, v in c.items() if k != "_id"} for c in categories]}

@api_router.post("/kitchen/categories")
async def create_category(
    category_data: CategoryData,
    current_user: dict = Depends(get_kitchen_user)
):
    """Create a new category"""
    # Check for duplicate name
    existing = await db.categories.find_one({"name": category_data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    category = {
        "id": str(uuid.uuid4()),
        "name": category_data.name,
        "description": category_data.description,
        "icon": category_data.icon or "restaurant",
        "sort_order": category_data.sort_order or 99,
        "created_at": datetime.utcnow().isoformat(),
        "created_by": current_user["id"]
    }
    await db.categories.insert_one(category)
    return {"message": "Category created", "category": {k: v for k, v in category.items() if k != "_id"}}

@api_router.put("/kitchen/categories/{category_id}")
async def update_category(
    category_id: str,
    category_data: CategoryData,
    current_user: dict = Depends(get_kitchen_user)
):
    """Update a category"""
    update_data = {
        "name": category_data.name,
        "description": category_data.description,
        "icon": category_data.icon,
        "sort_order": category_data.sort_order,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    result = await db.categories.update_one(
        {"id": category_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category updated"}

@api_router.delete("/kitchen/categories/{category_id}")
async def delete_category(
    category_id: str,
    current_user: dict = Depends(get_kitchen_user)
):
    """Delete a category"""
    # Check if category has dishes
    dishes_count = await db.dishes.count_documents({"category": category_id})
    if dishes_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category with {dishes_count} dishes. Move dishes first.")
    
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

# ==================== KITCHEN PREPARATION LIST ====================

@api_router.get("/kitchen/preparation-list")
async def get_preparation_list(current_user: dict = Depends(get_kitchen_user)):
    """Get daily preparation list with customer-wise breakdown and totals"""
    today = datetime.now().date().isoformat()
    
    # Get all active subscriptions (not skipped today)
    subscriptions = await db.subscriptions.find({"status": "active"}).to_list(500)
    
    preparation_list = []
    
    # Default items per customer (can be customized per subscription)
    default_items = {
        "roti": 4,
        "sabji": 1,  # portions (227g each)
        "dal": 1,    # portions (227g each)
        "rice": 1,   # portions
        "salad": 1,  # portions
        "bread": 0   # number of breads
    }
    
    for sub in subscriptions:
        # Check if skipped today
        is_skipped = any(
            s.get("date") == today 
            for s in sub.get("skipped_meals", [])
        )
        
        if is_skipped:
            continue
        
        # Get user info
        user = await db.users.find_one({"id": sub.get("user_id")})
        if not user:
            continue
        
        # Get customer preferences if any
        preferences = sub.get("meal_preferences", {})
        
        # Calculate items for this customer
        customer_items = {
            "customer_id": sub.get("user_id"),
            "customer_name": user.get("name", "Unknown"),
            "phone": user.get("phone", ""),
            "address": sub.get("delivery_address", ""),
            "plan": sub.get("plan", "standard"),
            "roti": preferences.get("roti", default_items["roti"]),
            "sabji": preferences.get("sabji", default_items["sabji"]),
            "dal": preferences.get("dal", default_items["dal"]),
            "rice": preferences.get("rice", default_items["rice"]),
            "salad": preferences.get("salad", default_items["salad"]),
            "bread": preferences.get("bread", default_items["bread"]),
            "notes": sub.get("special_notes", "")
        }
        
        preparation_list.append(customer_items)
    
    # Calculate totals
    totals = {
        "total_customers": len(preparation_list),
        "total_roti": sum(c["roti"] for c in preparation_list),
        "total_sabji_portions": sum(c["sabji"] for c in preparation_list),
        "total_sabji_grams": sum(c["sabji"] for c in preparation_list) * 227,
        "total_sabji_kg": round(sum(c["sabji"] for c in preparation_list) * 227 / 1000, 2),
        "total_dal_portions": sum(c["dal"] for c in preparation_list),
        "total_dal_grams": sum(c["dal"] for c in preparation_list) * 227,
        "total_dal_kg": round(sum(c["dal"] for c in preparation_list) * 227 / 1000, 2),
        "total_rice_portions": sum(c["rice"] for c in preparation_list),
        "total_salad_portions": sum(c["salad"] for c in preparation_list),
        "total_bread": sum(c["bread"] for c in preparation_list),
    }
    
    return {
        "date": today,
        "preparation_list": preparation_list,
        "totals": totals
    }

@api_router.put("/kitchen/customer-items/{customer_id}")
async def update_customer_items(
    customer_id: str,
    items: dict,
    current_user: dict = Depends(get_kitchen_user)
):
    """Update meal preferences for a specific customer"""
    # Find subscription
    subscription = await db.subscriptions.find_one({
        "user_id": customer_id,
        "status": "active"
    })
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Active subscription not found")
    
    # Update preferences
    preferences = {
        "roti": items.get("roti", 4),
        "sabji": items.get("sabji", 1),
        "dal": items.get("dal", 1),
        "rice": items.get("rice", 1),
        "salad": items.get("salad", 1),
        "bread": items.get("bread", 0),
    }
    
    await db.subscriptions.update_one(
        {"id": subscription["id"]},
        {"$set": {"meal_preferences": preferences}}
    )
    
    return {"message": "Customer items updated"}

# ==================== TRUST ENGINE - WALLET SYSTEM ====================

class WalletTransaction(BaseModel):
    amount: float
    type: str  # credit, debit
    reason: str
    reference_id: Optional[str] = None

class IssueReport(BaseModel):
    issue_type: str  # cold_food, spilled, missing_item, other
    description: Optional[str] = None
    date: Optional[str] = None

class VacationMode(BaseModel):
    start_date: str
    end_date: str
    active: bool = True

@api_router.get("/wallet")
async def get_wallet(current_user: dict = Depends(get_current_user)):
    """Get customer wallet balance and transaction history"""
    wallet = await db.wallets.find_one({"user_id": current_user["id"]})
    
    if not wallet:
        # Create wallet if doesn't exist
        wallet = {
            "user_id": current_user["id"],
            "balance": 0.0,
            "currency": "CAD",
            "created_at": datetime.utcnow().isoformat()
        }
        await db.wallets.insert_one(wallet)
    
    # Get recent transactions
    transactions = await db.wallet_transactions.find(
        {"user_id": current_user["id"]}
    ).sort("created_at", -1).to_list(50)
    
    return {
        "balance": wallet.get("balance", 0.0),
        "currency": wallet.get("currency", "CAD"),
        "transactions": [{k: v for k, v in t.items() if k != "_id"} for t in transactions]
    }

@api_router.post("/wallet/credit")
async def credit_wallet(
    transaction: WalletTransaction,
    current_user: dict = Depends(get_current_user)
):
    """Add credit to wallet (internal use for skip meals, refunds, etc.)"""
    # Update or create wallet
    result = await db.wallets.update_one(
        {"user_id": current_user["id"]},
        {
            "$inc": {"balance": transaction.amount},
            "$setOnInsert": {"currency": "CAD", "created_at": datetime.utcnow().isoformat()}
        },
        upsert=True
    )
    
    # Record transaction
    tx_record = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "amount": transaction.amount,
        "type": "credit",
        "reason": transaction.reason,
        "reference_id": transaction.reference_id,
        "created_at": datetime.utcnow().isoformat()
    }
    await db.wallet_transactions.insert_one(tx_record)
    
    # Get updated balance
    wallet = await db.wallets.find_one({"user_id": current_user["id"]})
    
    return {
        "message": f"${transaction.amount:.2f} credited to wallet",
        "new_balance": wallet.get("balance", 0.0),
        "transaction_id": tx_record["id"]
    }

@api_router.post("/customer/report-issue")
async def report_issue(
    report: IssueReport,
    current_user: dict = Depends(get_current_user)
):
    """Report food quality issue - auto credits wallet on approval"""
    if current_user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Customer role required")
    
    # Create issue report
    issue = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "user_name": current_user.get("name"),
        "issue_type": report.issue_type,
        "description": report.description,
        "date": report.date or datetime.now().date().isoformat(),
        "status": "pending",  # pending, approved, rejected
        "created_at": datetime.utcnow().isoformat()
    }
    await db.issue_reports.insert_one(issue)
    
    # Auto-credit for certain issues (can be made configurable)
    auto_credit_issues = ["cold_food", "spilled", "missing_item"]
    credit_amounts = {"cold_food": 5.00, "spilled": 10.00, "missing_item": 8.00, "other": 5.00}
    
    if report.issue_type in auto_credit_issues:
        credit_amount = credit_amounts.get(report.issue_type, 5.00)
        
        # Credit wallet
        await db.wallets.update_one(
            {"user_id": current_user["id"]},
            {
                "$inc": {"balance": credit_amount},
                "$setOnInsert": {"currency": "CAD", "created_at": datetime.utcnow().isoformat()}
            },
            upsert=True
        )
        
        # Record transaction
        await db.wallet_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "amount": credit_amount,
            "type": "credit",
            "reason": f"Issue compensation: {report.issue_type}",
            "reference_id": issue["id"],
            "created_at": datetime.utcnow().isoformat()
        })
        
        # Update issue status
        await db.issue_reports.update_one(
            {"id": issue["id"]},
            {"$set": {"status": "approved", "credit_amount": credit_amount}}
        )
        
        return {
            "message": f"Issue reported. ${credit_amount:.2f} has been credited to your wallet.",
            "issue_id": issue["id"],
            "credit_amount": credit_amount
        }
    
    return {
        "message": "Issue reported. Our team will review and respond within 24 hours.",
        "issue_id": issue["id"]
    }

# ==================== SMART PLANNER - VACATION MODE ====================

@api_router.post("/subscription/vacation")
async def set_vacation_mode(
    vacation: VacationMode,
    current_user: dict = Depends(get_current_user)
):
    """Set vacation mode - pause all deliveries for date range"""
    if current_user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Customer role required")
    
    subscription = await db.subscriptions.find_one({
        "user_id": current_user["id"],
        "status": "active"
    })
    
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription found")
    
    # Parse dates
    start = datetime.strptime(vacation.start_date, "%Y-%m-%d").date()
    end = datetime.strptime(vacation.end_date, "%Y-%m-%d").date()
    
    if end < start:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    
    # Generate all dates in range
    vacation_dates = []
    current = start
    while current <= end:
        vacation_dates.append(current.isoformat())
        current += timedelta(days=1)
    
    # Add to skipped meals
    existing_skips = subscription.get("skipped_meals", [])
    new_skips = []
    
    for date in vacation_dates:
        # Skip weekends
        day_of_week = datetime.strptime(date, "%Y-%m-%d").weekday()
        if day_of_week >= 5:  # Saturday=5, Sunday=6
            continue
            
        # Check if already skipped
        already_skipped = any(s.get("date") == date for s in existing_skips)
        if not already_skipped:
            new_skips.append({"date": date, "meal_type": "all", "reason": "vacation"})
    
    # Update subscription
    await db.subscriptions.update_one(
        {"id": subscription["id"]},
        {"$push": {"skipped_meals": {"$each": new_skips}}}
    )
    
    # Calculate credits (e.g., $12 per day)
    credit_per_day = 12.00
    total_credit = len(new_skips) * credit_per_day
    
    if total_credit > 0:
        # Credit wallet
        await db.wallets.update_one(
            {"user_id": current_user["id"]},
            {
                "$inc": {"balance": total_credit},
                "$setOnInsert": {"currency": "CAD", "created_at": datetime.utcnow().isoformat()}
            },
            upsert=True
        )
        
        # Record transaction
        await db.wallet_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "amount": total_credit,
            "type": "credit",
            "reason": f"Vacation mode: {vacation.start_date} to {vacation.end_date}",
            "created_at": datetime.utcnow().isoformat()
        })
    
    return {
        "message": f"Vacation mode set for {len(new_skips)} days",
        "dates_skipped": len(new_skips),
        "credit_amount": total_credit,
        "start_date": vacation.start_date,
        "end_date": vacation.end_date
    }

@api_router.get("/subscription/calendar")
async def get_subscription_calendar(current_user: dict = Depends(get_current_user)):
    """Get 7-day calendar with menu and delivery status"""
    if current_user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Customer role required")
    
    subscription = await db.subscriptions.find_one({
        "user_id": current_user["id"],
        "status": "active"
    })
    
    # Get next 7 days
    today = datetime.now().date()
    calendar = []
    
    for i in range(7):
        day = today + timedelta(days=i)
        day_str = day.isoformat()
        day_name = day.strftime("%A")
        
        # Check if weekend
        is_weekend = day.weekday() >= 5
        
        # Check if skipped
        is_skipped = False
        if subscription:
            is_skipped = any(
                s.get("date") == day_str 
                for s in subscription.get("skipped_meals", [])
            )
        
        # Get menu for the day
        menu_entry = await db.menu_schedule.find_one({"date": day_str})
        menu_info = None
        
        if menu_entry:
            lunch_dish = await db.dishes.find_one({"id": menu_entry.get("lunch_dish_id")})
            dinner_dish = await db.dishes.find_one({"id": menu_entry.get("dinner_dish_id")})
            menu_info = {
                "lunch": {
                    "name": lunch_dish.get("name") if lunch_dish else "TBD",
                    "description": lunch_dish.get("description") if lunch_dish else ""
                } if lunch_dish else None,
                "dinner": {
                    "name": dinner_dish.get("name") if dinner_dish else "TBD",
                    "description": dinner_dish.get("description") if dinner_dish else ""
                } if dinner_dish else None
            }
        
        # Determine status
        status = "scheduled"
        if is_weekend:
            status = "weekend"
        elif is_skipped:
            status = "skipped"
        elif not subscription:
            status = "no_subscription"
        
        calendar.append({
            "date": day_str,
            "day": day_name,
            "is_weekend": is_weekend,
            "is_skipped": is_skipped,
            "status": status,
            "menu": menu_info,
            "can_skip": i >= 1 and not is_weekend and not is_skipped  # Can skip future days only
        })
    
    return {"calendar": calendar}

# ==================== KITCHEN BATCH TOTALS ====================

@api_router.get("/kitchen/batch-totals")
async def get_batch_totals(current_user: dict = Depends(get_kitchen_user)):
    """Get total counts for today's cooking batch"""
    today = datetime.now().date().isoformat()
    
    # Get all active subscriptions
    subscriptions = await db.subscriptions.find({"status": "active"}).to_list(500)
    
    # Count skips for today
    total_active = 0
    skipped_today = 0
    
    for sub in subscriptions:
        is_skipped = any(
            s.get("date") == today 
            for s in sub.get("skipped_meals", [])
        )
        if is_skipped:
            skipped_today += 1
        else:
            total_active += 1
    
    # Get menu for today
    menu = await db.menu_schedule.find_one({"date": today})
    
    # Calculate item counts based on plan types
    plan_counts = {"daily": 0, "weekly": 0, "monthly": 0}
    for sub in subscriptions:
        is_skipped = any(s.get("date") == today for s in sub.get("skipped_meals", []))
        if not is_skipped:
            plan = sub.get("plan", "daily").lower()
            if plan in plan_counts:
                plan_counts[plan] += 1
    
    # Standard items per tiffin
    items_per_tiffin = {
        "rotis": 4,
        "rice_portions": 1,
        "dal_portions": 1,
        "sabzi_portions": 1,
        "salad_portions": 1,
        "dessert_portions": 1
    }
    
    batch_totals = {
        "total_tiffins": total_active,
        "total_rotis": total_active * items_per_tiffin["rotis"],
        "total_rice": total_active * items_per_tiffin["rice_portions"],
        "total_dal": total_active * items_per_tiffin["dal_portions"],
        "total_sabzi": total_active * items_per_tiffin["sabzi_portions"],
        "total_salad": total_active * items_per_tiffin["salad_portions"],
        "total_dessert": total_active * items_per_tiffin["dessert_portions"]
    }
    
    return {
        "date": today,
        "total_orders": total_active,
        "skipped_orders": skipped_today,
        "plan_breakdown": plan_counts,
        "batch_totals": batch_totals,
        "menu": menu
    }

@api_router.post("/kitchen/mark-sold-out")
async def mark_item_sold_out(
    item_data: dict,
    current_user: dict = Depends(get_kitchen_user)
):
    """Mark an item as sold out for today"""
    today = datetime.now().date().isoformat()
    
    sold_out_record = {
        "date": today,
        "item_name": item_data.get("item_name"),
        "marked_by": current_user["id"],
        "marked_at": datetime.utcnow().isoformat()
    }
    
    await db.sold_out_items.update_one(
        {"date": today, "item_name": item_data.get("item_name")},
        {"$set": sold_out_record},
        upsert=True
    )
    
    return {"message": f"{item_data.get('item_name')} marked as sold out for today"}

@api_router.get("/kitchen/sold-out")
async def get_sold_out_items(current_user: dict = Depends(get_kitchen_user)):
    """Get list of sold out items for today"""
    today = datetime.now().date().isoformat()
    items = await db.sold_out_items.find({"date": today}).to_list(50)
    return {"sold_out": [item.get("item_name") for item in items]}

# ==================== HALIFAX TEST DATA SEEDING ====================

HALIFAX_TEST_CUSTOMERS = [
    {"name": "Priya Patel", "email": "priya@test.com", "phone": "902-555-0101", "address": "1505 Barrington St, Halifax, NS", "lat": 44.6488, "lon": -63.5752},
    {"name": "Raj Sharma", "email": "raj@test.com", "phone": "902-555-0102", "address": "6299 Quinpool Rd, Halifax, NS", "lat": 44.6463, "lon": -63.5979},
    {"name": "Anita Singh", "email": "anita@test.com", "phone": "902-555-0103", "address": "210 Chain Lake Dr, Halifax, NS", "lat": 44.6605, "lon": -63.6744},
    {"name": "Vikram Mehta", "email": "vikram@test.com", "phone": "902-555-0104", "address": "5670 Spring Garden Rd, Halifax, NS", "lat": 44.6408, "lon": -63.5787},
    {"name": "Neha Gupta", "email": "neha@test.com", "phone": "902-555-0105", "address": "1595 Bedford Hwy, Bedford, NS", "lat": 44.7175, "lon": -63.6592},
    {"name": "Amit Kumar", "email": "amit@test.com", "phone": "902-555-0106", "address": "90 Alderney Dr, Dartmouth, NS", "lat": 44.6661, "lon": -63.5680},
    {"name": "Sunita Devi", "email": "sunita@test.com", "phone": "902-555-0107", "address": "7001 Mumford Rd, Halifax, NS", "lat": 44.6538, "lon": -63.6313},
    {"name": "Deepak Joshi", "email": "deepak@test.com", "phone": "902-555-0108", "address": "1969 Upper Water St, Halifax, NS", "lat": 44.6488, "lon": -63.5710},
    {"name": "Kavita Rao", "email": "kavita@test.com", "phone": "902-555-0109", "address": "3280 Kempt Rd, Halifax, NS", "lat": 44.6644, "lon": -63.6105},
    {"name": "Suresh Nair", "email": "suresh@test.com", "phone": "902-555-0110", "address": "1000 Micmac Blvd, Dartmouth, NS", "lat": 44.6860, "lon": -63.5410},
]

DEFAULT_DISHES = [
    # Roti
    {"name": "Butter Roti", "description": "Soft wheat flatbread with butter", "type": "vegetarian", "category": "roti", "quantity_per_tiffin": 3, "unit": "pieces"},
    {"name": "Plain Chapati", "description": "Traditional unleavened flatbread", "type": "vegetarian", "category": "roti", "quantity_per_tiffin": 3, "unit": "pieces"},
    {"name": "Garlic Naan", "description": "Leavened bread with garlic", "type": "vegetarian", "category": "roti", "quantity_per_tiffin": 2, "unit": "pieces"},
    {"name": "Paratha", "description": "Layered flatbread", "type": "vegetarian", "category": "roti", "quantity_per_tiffin": 2, "unit": "pieces"},
    # Sabji
    {"name": "Paneer Tikka Masala", "description": "Cottage cheese in spiced tomato gravy", "type": "vegetarian", "category": "sabji", "quantity_per_tiffin": 150, "unit": "grams"},
    {"name": "Aloo Gobi", "description": "Potato and cauliflower curry", "type": "vegetarian", "category": "sabji", "quantity_per_tiffin": 150, "unit": "grams"},
    {"name": "Bhindi Masala", "description": "Spiced okra stir fry", "type": "vegetarian", "category": "sabji", "quantity_per_tiffin": 120, "unit": "grams"},
    {"name": "Mixed Veg Curry", "description": "Assorted vegetables in gravy", "type": "vegetarian", "category": "sabji", "quantity_per_tiffin": 150, "unit": "grams"},
    {"name": "Palak Paneer", "description": "Spinach with cottage cheese", "type": "vegetarian", "category": "sabji", "quantity_per_tiffin": 150, "unit": "grams"},
    # Dal
    {"name": "Tadka Dal", "description": "Yellow lentils with tempering", "type": "vegetarian", "category": "dal", "quantity_per_tiffin": 150, "unit": "ml"},
    {"name": "Dal Makhani", "description": "Creamy black lentils", "type": "vegetarian", "category": "dal", "quantity_per_tiffin": 150, "unit": "ml"},
    {"name": "Chana Dal", "description": "Split chickpea lentils", "type": "vegetarian", "category": "dal", "quantity_per_tiffin": 150, "unit": "ml"},
    # Rice
    {"name": "Jeera Rice", "description": "Cumin flavored basmati rice", "type": "vegetarian", "category": "rice", "quantity_per_tiffin": 150, "unit": "grams"},
    {"name": "Plain Rice", "description": "Steamed basmati rice", "type": "vegetarian", "category": "rice", "quantity_per_tiffin": 150, "unit": "grams"},
    {"name": "Veg Pulao", "description": "Rice with mixed vegetables", "type": "vegetarian", "category": "rice", "quantity_per_tiffin": 180, "unit": "grams"},
    # Salad
    {"name": "Kachumber Salad", "description": "Fresh cucumber, tomato, onion", "type": "vegetarian", "category": "salad", "quantity_per_tiffin": 50, "unit": "grams"},
    {"name": "Green Salad", "description": "Mixed greens with lemon", "type": "vegetarian", "category": "salad", "quantity_per_tiffin": 50, "unit": "grams"},
    {"name": "Raita", "description": "Yogurt with cucumber", "type": "vegetarian", "category": "salad", "quantity_per_tiffin": 80, "unit": "ml"},
    # Extra
    {"name": "Papad", "description": "Crispy lentil wafer", "type": "vegetarian", "category": "extra", "quantity_per_tiffin": 1, "unit": "pieces"},
    {"name": "Pickle", "description": "Spicy mango pickle", "type": "vegetarian", "category": "extra", "quantity_per_tiffin": 15, "unit": "grams"},
    {"name": "Gulab Jamun", "description": "Sweet milk dumplings", "type": "vegetarian", "category": "extra", "quantity_per_tiffin": 2, "unit": "pieces"},
]

@api_router.post("/kitchen/seed-halifax-data")
async def seed_halifax_data(current_user: dict = Depends(get_kitchen_user)):
    """Seed Halifax test customers and modular dishes"""
    
    # Clear existing test data
    await db.users.delete_many({"email": {"$regex": "@test.com$"}})
    await db.subscriptions.delete_many({"user_id": {"$regex": "^halifax-"}})
    
    created_customers = []
    for idx, customer in enumerate(HALIFAX_TEST_CUSTOMERS):
        user_id = f"halifax-{idx+1}"
        user_data = {
            "id": user_id,
            "name": customer["name"],
            "email": customer["email"],
            "password": hash_password("test123"),
            "phone": customer["phone"],
            "address": customer["address"],
            "role": "customer",
            "created_at": datetime.utcnow()
        }
        await db.users.update_one({"id": user_id}, {"$set": user_data}, upsert=True)
        
        # Create subscription
        sub_data = {
            "id": f"sub-halifax-{idx+1}",
            "user_id": user_id,
            "plan": ["daily", "weekly", "monthly"][idx % 3],
            "status": "active",
            "start_date": datetime.utcnow().isoformat(),
            "end_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
            "delivery_address": customer["address"],
            "latitude": customer["lat"],
            "longitude": customer["lon"],
            "skipped_meals": [],
            "created_at": datetime.utcnow().isoformat()
        }
        await db.subscriptions.update_one(
            {"id": f"sub-halifax-{idx+1}"},
            {"$set": sub_data},
            upsert=True
        )
        
        # Create delivery queue entry for today
        today = datetime.now().date().isoformat()
        delivery_data = {
            "id": f"del-halifax-{idx+1}-{today}",
            "subscription_id": f"sub-halifax-{idx+1}",
            "customer_id": user_id,
            "customer_name": customer["name"],
            "customer_phone": customer["phone"],
            "address": customer["address"],
            "latitude": customer["lat"],
            "longitude": customer["lon"],
            "plan": sub_data["plan"],
            "date": today,
            "delivery_number": idx + 1,
            "status": "ready",
            "created_at": datetime.utcnow().isoformat()
        }
        await db.delivery_queue.update_one(
            {"id": f"del-halifax-{idx+1}-{today}"},
            {"$set": delivery_data},
            upsert=True
        )
        
        created_customers.append({"name": customer["name"], "address": customer["address"]})
    
    # Seed dishes by category
    created_dishes = {"roti": 0, "sabji": 0, "dal": 0, "rice": 0, "salad": 0, "extra": 0}
    for dish in DEFAULT_DISHES:
        existing = await db.dishes.find_one({"name": dish["name"]})
        if not existing:
            dish_data = {
                "id": str(uuid.uuid4()),
                **dish,
                "created_at": datetime.utcnow().isoformat(),
                "created_by": current_user["id"]
            }
            await db.dishes.insert_one(dish_data)
            created_dishes[dish["category"]] += 1
    
    return {
        "message": "Halifax test data seeded successfully!",
        "customers_created": len(created_customers),
        "customers": created_customers,
        "dishes_created": created_dishes,
        "total_deliveries_queued": len(HALIFAX_TEST_CUSTOMERS)
    }

@api_router.get("/kitchen/modular-prep-list")
async def get_modular_prep_list(current_user: dict = Depends(get_kitchen_user)):
    """Get detailed preparation list based on modular menu items"""
    today = datetime.now().date().isoformat()
    
    # Get today's menu
    menu = await db.menu_schedule.find_one({"date": today})
    if not menu:
        return {"error": "No menu set for today", "date": today}
    
    dinner_ids = menu.get("dinner_item_ids", [])
    
    # Get all active subscriptions
    subscriptions = await db.subscriptions.find({"status": "active"}).to_list(500)
    
    # Count active orders (not skipped)
    total_orders = 0
    for sub in subscriptions:
        is_skipped = any(s.get("date") == today for s in sub.get("skipped_meals", []))
        if not is_skipped:
            total_orders += 1
    
    # Get dishes and calculate quantities
    dishes = await db.dishes.find({"id": {"$in": dinner_ids}}).to_list(20)
    
    prep_breakdown = []
    category_totals = {}
    
    for dish in dishes:
        qty = dish.get("quantity_per_tiffin", 1)
        unit = dish.get("unit", "portion")
        category = dish.get("category", "sabji")
        total_qty = qty * total_orders
        
        item = {
            "name": dish["name"],
            "category": category,
            "per_tiffin": qty,
            "unit": unit,
            "total_quantity": total_qty,
            "total_display": f"{total_qty} {unit}"
        }
        prep_breakdown.append(item)
        
        # Sum by category
        if category not in category_totals:
            category_totals[category] = []
        category_totals[category].append(item)
    
    return {
        "date": today,
        "total_dinners": total_orders,
        "menu_items": len(dinner_ids),
        "prep_breakdown": prep_breakdown,
        "by_category": category_totals,
        "summary": {
            "total_rotis": sum(d["total_quantity"] for d in prep_breakdown if d["category"] == "roti"),
            "total_sabji_grams": sum(d["total_quantity"] for d in prep_breakdown if d["category"] == "sabji"),
            "total_dal_ml": sum(d["total_quantity"] for d in prep_breakdown if d["category"] == "dal"),
            "total_rice_grams": sum(d["total_quantity"] for d in prep_breakdown if d["category"] == "rice"),
        }
    }

# ==================== MEAL SWAP FUNCTIONALITY ====================

class MealSwap(BaseModel):
    date: str
    original_meal: str
    replacement_meal: str  # "standard_dal", "standard_salad", "skip"

@api_router.post("/subscription/swap-meal")
async def swap_meal(
    swap: MealSwap,
    current_user: dict = Depends(get_current_user)
):
    """Swap a meal for a standard alternative before cutoff"""
    if current_user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Customer role required")
    
    # Check cutoff (10 PM previous day)
    swap_date = datetime.strptime(swap.date, "%Y-%m-%d").date()
    now = datetime.now()
    cutoff = datetime.combine(swap_date - timedelta(days=1), datetime.strptime("22:00", "%H:%M").time())
    
    if now > cutoff:
        raise HTTPException(status_code=400, detail="Cutoff time passed. Cannot swap meal.")
    
    subscription = await db.subscriptions.find_one({
        "user_id": current_user["id"],
        "status": "active"
    })
    
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription")
    
    # Record swap
    swap_record = {
        "id": str(uuid.uuid4()),
        "subscription_id": subscription["id"],
        "user_id": current_user["id"],
        "date": swap.date,
        "original_meal": swap.original_meal,
        "replacement_meal": swap.replacement_meal,
        "created_at": datetime.utcnow().isoformat()
    }
    
    await db.meal_swaps.update_one(
        {"subscription_id": subscription["id"], "date": swap.date},
        {"$set": swap_record},
        upsert=True
    )
    
    return {
        "message": f"Meal swapped to {swap.replacement_meal} for {swap.date}",
        "swap_id": swap_record["id"]
    }

# CORS Middleware (must be before routes)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the website static files
WEBSITE_DIR = Path(__file__).parent.parent / "website"
APP_DIR = WEBSITE_DIR / "app"

if WEBSITE_DIR.exists():
    app.mount("/css", StaticFiles(directory=WEBSITE_DIR / "css"), name="css")
    app.mount("/js", StaticFiles(directory=WEBSITE_DIR / "js"), name="js")
    app.mount("/assets", StaticFiles(directory=WEBSITE_DIR / "assets"), name="assets")
    
    @app.get("/")
    async def serve_homepage():
        return FileResponse(WEBSITE_DIR / "index.html")
    
    @app.get("/privacy.html")
    async def serve_privacy():
        return FileResponse(WEBSITE_DIR / "privacy.html")
    
    @app.get("/terms.html")
    async def serve_terms():
        return FileResponse(WEBSITE_DIR / "terms.html")
    
    @app.get("/support.html")
    async def serve_support():
        return FileResponse(WEBSITE_DIR / "support.html")

# Mount the mobile app web version
if APP_DIR.exists():
    # Mount static directories first
    app.mount("/app/_expo", StaticFiles(directory=APP_DIR / "_expo"), name="app_expo")
    app.mount("/app/assets", StaticFiles(directory=APP_DIR / "assets"), name="app_assets")
    
# App routes - Serve specific HTML files for the Expo web export
@app.get("/app/login")
async def serve_app_login():
    return FileResponse(APP_DIR / "login.html")

@app.get("/app/register")
async def serve_app_register():
    return FileResponse(APP_DIR / "register.html")

@app.get("/app/customer")
async def serve_app_customer():
    return FileResponse(APP_DIR / "(customer)" / "index.html")

@app.get("/app/customer/menu")
async def serve_app_customer_menu():
    return FileResponse(APP_DIR / "(customer)" / "menu.html")

@app.get("/app/customer/subscription")
async def serve_app_customer_subscription():
    return FileResponse(APP_DIR / "(customer)" / "subscription.html")

@app.get("/app/customer/wallet")
async def serve_app_customer_wallet():
    return FileResponse(APP_DIR / "(customer)" / "wallet.html")

@app.get("/app/customer/profile")
async def serve_app_customer_profile():
    return FileResponse(APP_DIR / "(customer)" / "profile.html")

@app.get("/app/driver")
async def serve_app_driver():
    return FileResponse(APP_DIR / "(driver)" / "index.html")

@app.get("/app/driver/profile")
async def serve_app_driver_profile():
    return FileResponse(APP_DIR / "(driver)" / "profile.html")

@app.get("/app/kitchen")
async def serve_app_kitchen():
    return FileResponse(APP_DIR / "(kitchen)" / "index.html")

@app.get("/app/kitchen/menu")
async def serve_app_kitchen_menu():
    return FileResponse(APP_DIR / "(kitchen)" / "menu.html")

@app.get("/app/kitchen/orders")
async def serve_app_kitchen_orders():
    return FileResponse(APP_DIR / "(kitchen)" / "orders.html")

@app.get("/app/kitchen/dishes")
async def serve_app_kitchen_dishes():
    return FileResponse(APP_DIR / "(kitchen)" / "dishes.html")

@app.get("/app/kitchen/customers")
async def serve_app_kitchen_customers():
    return FileResponse(APP_DIR / "(kitchen)" / "customers.html")

# Catch-all for /app - serve index.html
@app.get("/app")
@app.get("/app/")
async def serve_app_home():
    return FileResponse(APP_DIR / "index.html")

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== TIFFIN CONCIERGE AI CHATBOT ====================

from emergentintegrations.llm.chat import LlmChat, UserMessage

CONCIERGE_SYSTEM_PROMPT = """You are the Tiffin Concierge, a friendly AI assistant for "The Dabba" - Halifax's premium tiffin delivery service. 

**Your Personality:**
- Warm, professional, and Halifax-local (you know the streets!)
- Concise but helpful - don't ramble
- Always discuss money in CAD ($)

**Your Capabilities (you can DO these things, not just talk about them):**
1. SKIP MEALS: If customer wants to skip a meal, confirm the date and execute it
2. UPDATE SPICE: If food was too spicy/mild, update their preference
3. TRACK DELIVERY: Check real-time driver location and ETA
4. CHECK WALLET: Tell them their credit balance
5. VIEW MENU: Tell them what's for dinner today/this week
6. ADD EXTRAS: Help them add Lassi, Gulab Jamun, etc to their order
7. WEATHER ALERTS: Explain any delivery delays due to Halifax weather

**Action Format:**
When you need to perform an action, respond with JSON in this exact format:
{"action": "ACTION_NAME", "params": {...}}

Available actions:
- {"action": "SKIP_MEAL", "params": {"date": "YYYY-MM-DD"}}
- {"action": "UPDATE_SPICE", "params": {"level": "mild|medium|spicy"}}
- {"action": "CHECK_BALANCE", "params": {}}
- {"action": "GET_MENU", "params": {"date": "YYYY-MM-DD"}}
- {"action": "TRACK_DELIVERY", "params": {}}
- {"action": "HUMAN_HANDOVER", "params": {"reason": "..."}}

**Important Rules:**
1. Always confirm before executing actions that affect their account
2. If unsure or customer seems upset, offer HUMAN_HANDOVER
3. Mention weather if there are delivery delays
4. Be empathetic if they complain about food quality

**Context about The Dabba:**
- We serve authentic Gujarati home-cooked meals in Halifax
- Delivery is at 4:00 PM daily
- Skip deadline: 24 hours before delivery
- Skip credit: $12 CAD per meal
- Plans: Daily ($18), Weekly ($110), Monthly ($400)
"""

# Chat message model
class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    action_taken: Optional[dict] = None

@api_router.post("/chat/concierge")
async def chat_with_concierge(
    chat_msg: ChatMessage,
    current_user: dict = Depends(get_current_user)
):
    """Chat with the Tiffin Concierge AI"""
    import os
    import json
    import re
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    user_id = current_user["id"]
    session_id = chat_msg.session_id or f"concierge-{user_id}"
    
    # Get user context for the AI
    subscription = await db.subscriptions.find_one({"user_id": user_id, "status": "active"})
    wallet = await db.wallets.find_one({"user_id": user_id})
    preferences = await db.customer_preferences.find_one({"user_id": user_id})
    weather = await db.system_settings.find_one({"key": "weather_status"})
    
    # Build context
    context = f"""
**Current Customer Context:**
- Name: {current_user.get('name', 'Customer')}
- Subscription: {subscription.get('plan', 'None') if subscription else 'No active subscription'}
- Wallet Balance: ${wallet.get('balance', 0):.2f} CAD
- Spice Preference: {preferences.get('spice_level', 'medium') if preferences else 'medium'}
- Address: {subscription.get('delivery_address', 'Not set') if subscription else 'Not set'}
- Weather Status: {weather.get('value', 'normal') if weather else 'normal'}
- Today's Date: {datetime.now().strftime('%A, %B %d, %Y')}

**Customer Message:** {chat_msg.message}
"""
    
    # Get chat history
    history = await db.chat_history.find(
        {"session_id": session_id}
    ).sort("created_at", -1).limit(10).to_list(10)
    history.reverse()
    
    try:
        # Initialize chat
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=CONCIERGE_SYSTEM_PROMPT
        ).with_model("openai", "gpt-5.2")
        
        # Send message
        user_message = UserMessage(text=context)
        ai_response = await chat.send_message(user_message)
        
        # Save to history
        await db.chat_history.insert_one({
            "session_id": session_id,
            "user_id": user_id,
            "role": "user",
            "content": chat_msg.message,
            "created_at": datetime.utcnow()
        })
        await db.chat_history.insert_one({
            "session_id": session_id,
            "user_id": user_id,
            "role": "assistant",
            "content": ai_response,
            "created_at": datetime.utcnow()
        })
        
        # Check if AI wants to perform an action
        action_taken = None
        action_match = re.search(r'\{"action":\s*"([^"]+)".*?\}', ai_response)
        
        if action_match:
            try:
                action_json = json.loads(action_match.group(0))
                action_name = action_json.get("action")
                params = action_json.get("params", {})
                
                # Execute the action
                if action_name == "SKIP_MEAL" and subscription:
                    date = params.get("date")
                    if date:
                        # Add to skipped meals
                        await db.subscriptions.update_one(
                            {"_id": subscription["_id"]},
                            {"$push": {"skipped_meals": {"date": date, "meal_type": "dinner"}}}
                        )
                        # Credit wallet
                        new_balance = (wallet.get("balance", 0) if wallet else 0) + 12.0
                        await db.wallets.update_one(
                            {"user_id": user_id},
                            {"$set": {"balance": new_balance, "updated_at": datetime.utcnow().isoformat()}},
                            upsert=True
                        )
                        action_taken = {"action": "SKIP_MEAL", "date": date, "credited": 12.0}
                
                elif action_name == "UPDATE_SPICE":
                    level = params.get("level", "medium")
                    await db.customer_preferences.update_one(
                        {"user_id": user_id},
                        {"$set": {"spice_level": level, "updated_at": datetime.utcnow().isoformat()}},
                        upsert=True
                    )
                    action_taken = {"action": "UPDATE_SPICE", "level": level}
                
                elif action_name == "CHECK_BALANCE":
                    balance = wallet.get("balance", 0) if wallet else 0
                    action_taken = {"action": "CHECK_BALANCE", "balance": balance}
                
                elif action_name == "HUMAN_HANDOVER":
                    # Log for owner notification
                    await db.human_handover_requests.insert_one({
                        "user_id": user_id,
                        "user_name": current_user.get("name"),
                        "reason": params.get("reason"),
                        "created_at": datetime.utcnow()
                    })
                    action_taken = {"action": "HUMAN_HANDOVER", "reason": params.get("reason")}
                    
            except json.JSONDecodeError:
                pass
        
        # Clean up response (remove action JSON from displayed text)
        clean_response = re.sub(r'\{"action":[^}]+\}', '', ai_response).strip()
        
        return {
            "response": clean_response,
            "action_taken": action_taken
        }
        
    except Exception as e:
        logger.error(f"Concierge chat error: {e}")
        return {
            "response": "I apologize, but I'm having a moment. Please try again or tap 'Speak to Human' for immediate help.",
            "action_taken": None
        }

@api_router.get("/chat/history")
async def get_chat_history(current_user: dict = Depends(get_current_user)):
    """Get chat history for current user"""
    session_id = f"concierge-{current_user['id']}"
    history = await db.chat_history.find(
        {"session_id": session_id}
    ).sort("created_at", -1).limit(50).to_list(50)
    history.reverse()
    
    return {
        "messages": [
            {
                "role": h.get("role"),
                "content": h.get("content"),
                "timestamp": h.get("created_at").isoformat() if h.get("created_at") else None
            }
            for h in history
        ]
    }

@api_router.get("/kitchen/quality-alerts")
async def get_quality_alerts(current_user: dict = Depends(get_kitchen_user)):
    """Get AI-summarized quality alerts from customer feedback"""
    # Get recent bad ratings
    bad_ratings = await db.meal_ratings.find({
        "rating": "bad",
        "created_at": {"$gte": datetime.utcnow() - timedelta(days=7)}
    }).to_list(50)
    
    # Get human handover requests
    handovers = await db.human_handover_requests.find({
        "created_at": {"$gte": datetime.utcnow() - timedelta(days=1)}
    }).to_list(20)
    
    alerts = []
    
    # Summarize feedback
    feedback_counts = {}
    for rating in bad_ratings:
        feedback = rating.get("feedback", "No details")
        if feedback in feedback_counts:
            feedback_counts[feedback] += 1
        else:
            feedback_counts[feedback] = 1
    
    for feedback, count in feedback_counts.items():
        if count >= 2:  # Alert if 2+ customers report same issue
            alerts.append({
                "type": "quality",
                "severity": "high" if count >= 3 else "medium",
                "message": f"{count} customers reported: {feedback}",
                "count": count
            })
    
    # Add handover alerts
    for handover in handovers:
        alerts.append({
            "type": "handover",
            "severity": "urgent",
            "message": f"{handover.get('user_name', 'Customer')} needs help: {handover.get('reason', 'No reason provided')}",
            "user_id": handover.get("user_id"),
            "timestamp": handover.get("created_at").isoformat() if handover.get("created_at") else None
        })
    
    return {"alerts": alerts, "total": len(alerts)}

@api_router.get("/menu/knowledge-base")
async def get_menu_knowledge_base():
    """Get full menu for AI knowledge base (no prices)"""
    dishes = await db.dishes.find({}).to_list(100)
    
    knowledge = []
    for dish in dishes:
        knowledge.append({
            "name": dish.get("name"),
            "description": dish.get("description"),
            "category": dish.get("category"),
            "type": dish.get("type"),  # veg/non-veg
            "ingredients": dish.get("ingredients", []),
            "allergens": dish.get("allergens", [])
        })
    
    return {"dishes": knowledge}

# ==================== WEBSOCKET ENDPOINTS ====================

@app.websocket("/ws/{role}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, role: str, user_id: str):
    """
    Real-time WebSocket connection for live updates.
    - /ws/customer/{user_id} - Customer portal updates
    - /ws/driver/{user_id} - Driver portal updates
    - /ws/kitchen/{user_id} - Kitchen portal updates
    """
    if role not in ["customer", "driver", "kitchen"]:
        await websocket.close(code=4001)
        return
    
    await ws_manager.connect(websocket, user_id, role)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                # Handle ping/pong for keep-alive
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": datetime.now(timezone.utc).isoformat()})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id, role)

# ==================== ENHANCED DRIVER PORTAL - FULL MANIFEST ====================

@api_router.get("/driver/full-manifest")
async def get_driver_full_manifest(
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get the FULL daily route manifest with real-time distance and ETA.
    No list capping - displays entire daily route.
    """
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="Driver access required")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get all deliveries for today, sorted by sequence
    deliveries = await db.deliveries.find({
        "delivery_date": today,
        "status": {"$nin": ["skipped", "cancelled"]}
    }).sort("sequence_number", 1).to_list(1000)
    
    manifest = []
    driver_lat = lat or 44.6488  # Default: Halifax downtown
    driver_lon = lon or -63.5752
    
    for delivery in deliveries:
        # Get customer details
        customer = await db.users.find_one({"id": delivery.get("customer_id")})
        
        # Calculate distance from driver's current position
        dest_lat = delivery.get("latitude", 44.6488)
        dest_lon = delivery.get("longitude", -63.5752)
        distance_km = calculate_distance_km(driver_lat, driver_lon, dest_lat, dest_lon)
        eta_minutes = calculate_eta_minutes(distance_km)
        
        manifest.append({
            "delivery_id": delivery.get("id"),
            "sequence": delivery.get("sequence_number"),
            "customer_name": customer.get("name") if customer else "Unknown",
            "address": delivery.get("delivery_address", customer.get("address") if customer else ""),
            "phone": customer.get("phone") if customer else "",
            "status": delivery.get("status"),
            "distance_km": distance_km,
            "eta_minutes": eta_minutes,
            "eta_time": (datetime.now(timezone.utc) + timedelta(minutes=eta_minutes)).strftime("%I:%M %p"),
            "items": delivery.get("items", []),
            "special_instructions": delivery.get("special_instructions", ""),
            "latitude": dest_lat,
            "longitude": dest_lon,
            "is_priority": delivery.get("is_priority", False),
            "dabba_ready": delivery.get("dabba_ready", False)
        })
        
        # Update driver position for next calculation (cumulative route)
        driver_lat, driver_lon = dest_lat, dest_lon
    
    return {
        "date": today,
        "total_deliveries": len(manifest),
        "completed": len([d for d in manifest if d["status"] == "delivered"]),
        "pending": len([d for d in manifest if d["status"] != "delivered"]),
        "manifest": manifest
    }

@api_router.post("/driver/delivery/{delivery_id}/complete")
async def complete_delivery_with_photo(
    delivery_id: str,
    status_update: DeliveryStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Complete delivery with proof photo - instant sync to customer.
    """
    if current_user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="Driver access required")
    
    delivery = await db.deliveries.find_one({"id": delivery_id})
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    update_data = {
        "status": status_update.status,
        "updated_at": datetime.now(timezone.utc),
        "completed_by": current_user.get("id")
    }
    
    if status_update.photo_base64:
        update_data["proof_photo"] = status_update.photo_base64
        update_data["photo_timestamp"] = datetime.now(timezone.utc)
    
    if status_update.status == "delivered":
        update_data["delivered_at"] = datetime.now(timezone.utc)
    
    await db.deliveries.update_one({"id": delivery_id}, {"$set": update_data})
    
    # Real-time notification to customer and kitchen
    await ws_manager.notify_delivery_update(
        delivery_id=delivery_id,
        status=status_update.status,
        customer_id=delivery.get("customer_id"),
        driver_id=current_user.get("id")
    )
    
    return {"message": "Delivery updated", "status": status_update.status}

# ==================== ENHANCED SKIP MEAL WITH REINDEXING ====================

@api_router.post("/subscription/skip-with-reindex")
async def skip_meal_with_reindex(skip_data: SkipMeal, current_user: dict = Depends(get_current_user)):
    """
    Skip a meal and trigger recursive re-indexing of all subsequent deliveries.
    This ensures a perfect 1, 2, 3 sequence with no gaps.
    """
    # Get user's subscription
    subscription = await db.subscriptions.find_one({"user_id": current_user["id"], "status": "active"})
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription")
    
    # Check skip deadline (4 PM previous day)
    skip_date = datetime.strptime(skip_data.date, "%Y-%m-%d")
    deadline = skip_date - timedelta(hours=8)  # 4 PM previous day
    
    if datetime.now() > deadline:
        raise HTTPException(status_code=400, detail="Skip deadline passed (4 PM previous day)")
    
    # Mark the delivery as skipped
    await db.deliveries.update_one(
        {"customer_id": current_user["id"], "delivery_date": skip_data.date},
        {"$set": {
            "status": "skipped",
            "skipped_at": datetime.now(timezone.utc),
            "sequence_number": None  # Remove from sequence
        }}
    )
    
    # Credit wallet
    credit_amount = 12.00  # CAD per skipped meal
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"wallet_balance": credit_amount}}
    )
    
    # Log the skip
    await db.skip_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "date": skip_data.date,
        "meal_type": skip_data.meal_type,
        "credit_amount": credit_amount,
        "created_at": datetime.now(timezone.utc)
    })
    
    # TRIGGER RECURSIVE RE-INDEXING
    reindexed_count = await reindex_delivery_sequence(skip_data.date)
    
    return {
        "message": f"Meal skipped. ${credit_amount:.2f} CAD credited. {reindexed_count} deliveries reindexed.",
        "credit": credit_amount,
        "reindexed": reindexed_count
    }

# ==================== KITCHEN MANIFEST - NO PRICES ====================

@api_router.get("/kitchen/clean-manifest")
async def get_kitchen_clean_manifest(
    date: Optional[str] = None,
    filter_plan: Optional[str] = None,  # daily, weekly, monthly
    current_user: dict = Depends(get_current_user)
):
    """
    Kitchen manifest with NO PRICES - pure logistics view.
    Includes toggle filters for Daily/Weekly/Monthly plans.
    """
    if current_user.get("role") != "kitchen":
        raise HTTPException(status_code=403, detail="Kitchen access required")
    
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Build query
    query = {"delivery_date": target_date, "status": {"$ne": "skipped"}}
    
    deliveries = await db.deliveries.find(query).sort("sequence_number", 1).to_list(1000)
    
    manifest = []
    for delivery in deliveries:
        customer = await db.users.find_one({"id": delivery.get("customer_id")})
        subscription = await db.subscriptions.find_one({"user_id": delivery.get("customer_id"), "status": "active"})
        
        plan_type = subscription.get("plan_type", "daily") if subscription else "daily"
        
        # Filter by plan type if specified
        if filter_plan and plan_type != filter_plan:
            continue
        
        manifest.append({
            "sequence": delivery.get("sequence_number"),
            "customer_name": customer.get("name") if customer else "Unknown",
            "address": delivery.get("delivery_address", ""),
            "phone": customer.get("phone") if customer else "",
            "plan_type": plan_type,  # daily, weekly, monthly
            "items": delivery.get("items", []),
            "spice_level": customer.get("spice_preference", "medium") if customer else "medium",
            "special_instructions": delivery.get("special_instructions", ""),
            "dabba_ready": delivery.get("dabba_ready", False),
            "delivery_id": delivery.get("id")
            # NO PRICE FIELDS
        })
    
    return {
        "date": target_date,
        "total": len(manifest),
        "by_plan": {
            "daily": len([m for m in manifest if m["plan_type"] == "daily"]),
            "weekly": len([m for m in manifest if m["plan_type"] == "weekly"]),
            "monthly": len([m for m in manifest if m["plan_type"] == "monthly"])
        },
        "manifest": manifest
    }

@api_router.post("/kitchen/mark-dabba-ready/{delivery_id}")
async def mark_dabba_ready(delivery_id: str, current_user: dict = Depends(get_current_user)):
    """
    Mark a dabba as prepared - syncs instantly to Driver's app.
    """
    if current_user.get("role") != "kitchen":
        raise HTTPException(status_code=403, detail="Kitchen access required")
    
    result = await db.deliveries.update_one(
        {"id": delivery_id},
        {"$set": {
            "dabba_ready": True,
            "ready_at": datetime.now(timezone.utc),
            "prepared_by": current_user.get("id")
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    # Notify driver in real-time
    await ws_manager.broadcast_to_role({
        "event": "dabba_ready",
        "data": {"delivery_id": delivery_id, "timestamp": datetime.now(timezone.utc).isoformat()}
    }, "driver")
    
    return {"message": "Dabba marked as ready", "delivery_id": delivery_id}

# ==================== PERFORMANCE METRICS FOR SELF-LEARNING ====================

@api_router.post("/metrics/delivery-completed")
async def log_delivery_metrics(
    delivery_id: str,
    predicted_eta: int,  # minutes
    actual_time: int,  # minutes
    current_user: dict = Depends(get_current_user)
):
    """
    Log delivery performance for AI self-learning.
    System uses this data to improve ETA predictions daily.
    """
    delivery = await db.deliveries.find_one({"id": delivery_id})
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    variance = actual_time - predicted_eta
    variance_percent = (variance / predicted_eta * 100) if predicted_eta > 0 else 0
    
    await db.delivery_metrics.insert_one({
        "id": str(uuid.uuid4()),
        "delivery_id": delivery_id,
        "address": delivery.get("delivery_address"),
        "predicted_eta": predicted_eta,
        "actual_time": actual_time,
        "variance_minutes": variance,
        "variance_percent": round(variance_percent, 2),
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_at": datetime.now(timezone.utc)
    })
    
    # Check if this address consistently causes delays
    recent_metrics = await db.delivery_metrics.find({
        "address": delivery.get("delivery_address"),
        "created_at": {"$gte": datetime.now(timezone.utc) - timedelta(days=3)}
    }).to_list(100)
    
    if len(recent_metrics) >= 3:
        avg_variance = sum(m.get("variance_percent", 0) for m in recent_metrics) / len(recent_metrics)
        if avg_variance > 15:  # More than 15% delay on average
            # Log suggestion for admin
            await db.route_suggestions.insert_one({
                "id": str(uuid.uuid4()),
                "type": "delay_pattern",
                "address": delivery.get("delivery_address"),
                "avg_delay_percent": round(avg_variance, 2),
                "suggestion": f"Consider earlier start time or route reorder for {delivery.get('delivery_address')}",
                "created_at": datetime.now(timezone.utc),
                "reviewed": False
            })
    
    return {"message": "Metrics logged", "variance_percent": round(variance_percent, 2)}

@api_router.get("/admin/route-suggestions")
async def get_route_suggestions(current_user: dict = Depends(get_current_user)):
    """Get AI-generated route optimization suggestions"""
    if current_user.get("role") != "kitchen":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    suggestions = await db.route_suggestions.find({"reviewed": False}).sort("created_at", -1).to_list(50)
    
    return {
        "suggestions": [{k: v for k, v in s.items() if k != "_id"} for s in suggestions],
        "total": len(suggestions)
    }

# Include the router (MUST be after all route definitions)
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
