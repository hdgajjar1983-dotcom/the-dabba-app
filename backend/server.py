from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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
JWT_SECRET = os.environ.get('JWT_SECRET', 'thedabba-secret-key-2024')
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

class DriverLocationQuery(BaseModel):
    latitude: float
    longitude: float

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
    
    deliveries = []
    for sub in subscriptions:
        user = await db.users.find_one({"id": sub["user_id"]})
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
    
    # In a real app, you'd update the delivery status in DB
    return {"message": f"Delivery {delivery_id} marked as {status_data.status}"}

# ==================== ROOT ROUTE ====================

@api_router.get("/")
async def root():
    return {"message": "Welcome to The Dabba API", "status": "running"}

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

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
