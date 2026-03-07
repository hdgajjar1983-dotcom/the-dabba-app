from fastapi import FastAPI, APIRouter, HTTPException, Depends
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
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
import hashlib
import math

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
    price: float = 120.0
    image_url: Optional[str] = None

class DishUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None

class MenuDaySet(BaseModel):
    date: str
    lunch_dish_id: str
    dinner_dish_id: str

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

# ==================== AUTH ROUTES ====================

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
        "price": dish.price,
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
        lunch = dish_map.get(item.get("lunch_dish_id"), {})
        dinner = dish_map.get(item.get("dinner_dish_id"), {})
        result.append({
            "date": item["date"],
            "lunch": {k: v for k, v in lunch.items() if k != "_id"} if lunch else None,
            "dinner": {k: v for k, v in dinner.items() if k != "_id"} if dinner else None
        })
    
    return {"menu": result, "dishes": [{k: v for k, v in d.items() if k != "_id"} for d in dishes]}

@api_router.post("/kitchen/menu")
async def set_menu_day(menu_data: MenuDaySet, current_user: dict = Depends(get_kitchen_user)):
    menu_entry = {
        "date": menu_data.date,
        "lunch_dish_id": menu_data.lunch_dish_id,
        "dinner_dish_id": menu_data.dinner_dish_id,
        "updated_at": datetime.utcnow().isoformat(),
        "updated_by": current_user["id"]
    }
    
    await db.menu_schedule.update_one(
        {"date": menu_data.date},
        {"$set": menu_entry},
        upsert=True
    )
    
    return {"message": f"Menu set for {menu_data.date}"}

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

# ==================== SEED DEFAULT DISHES ====================

@api_router.post("/kitchen/seed-dishes")
async def seed_default_dishes(current_user: dict = Depends(get_kitchen_user)):
    """Seed database with default Gujarati dishes"""
    default_dishes = [
        {"name": "Dal Tadka", "description": "Yellow lentils tempered with cumin, garlic and spices. Served with Jeera Rice, Papad, and Gulab Jamun", "type": "vegetarian", "price": 120},
        {"name": "Paneer Butter Masala", "description": "Cottage cheese in rich tomato gravy. Served with Butter Naan, Raita, and Kheer", "type": "vegetarian", "price": 140},
        {"name": "Chole Bhature", "description": "Spiced chickpea curry with fried bread. Served with Pickle, Onion, and Jalebi", "type": "vegetarian", "price": 130},
        {"name": "Rajma Chawal", "description": "Kidney beans curry with steamed rice. Served with Salad, Papad, and Rasmalai", "type": "vegetarian", "price": 120},
        {"name": "Aloo Gobi", "description": "Potato and cauliflower dry curry. Served with Roti, Dal, and Gajar Halwa", "type": "vegetarian", "price": 110},
        {"name": "Palak Paneer", "description": "Spinach curry with cottage cheese. Served with Jeera Rice, Raita, and Ladoo", "type": "vegetarian", "price": 140},
        {"name": "Mixed Veg Curry", "description": "Assorted vegetables in spiced gravy. Served with Pulao, Pickle, and Ice Cream", "type": "vegetarian", "price": 120},
        {"name": "Undhiyu", "description": "Traditional Gujarati mixed vegetable dish. Served with Puri, Shrikhand, and Papad", "type": "vegetarian", "price": 150},
        {"name": "Gujarati Kadhi", "description": "Sweet and tangy yogurt curry with pakoras. Served with Rice, Papad, and Mohanthal", "type": "vegetarian", "price": 110},
        {"name": "Sev Tameta Nu Shaak", "description": "Tomato curry topped with crispy sev. Served with Roti, Dal, and Gulab Jamun", "type": "vegetarian", "price": 100},
        {"name": "Dhokla Chaat", "description": "Steamed gram flour cake with chutneys. Served with Khichdi, Kadhi, and Basundi", "type": "vegetarian", "price": 120},
        {"name": "Thepla Combo", "description": "Spiced flatbreads with pickle and curd. Served with Aam Ras, Sev, and Sweet Lassi", "type": "vegetarian", "price": 100},
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

# Include the router
app.include_router(api_router)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the website static files
WEBSITE_DIR = Path(__file__).parent.parent / "website"
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

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
