from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx


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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ==================== MODELS ====================

class UserData(BaseModel):
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    name: str
    email: str
    picture: Optional[str] = None
    credits: int = 18
    is_skipping_tomorrow: bool = False
    address: str = ""
    plan_type: str = "Standard Veg"
    expo_push_token: Optional[str] = None
    notifications_enabled: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSkipUpdate(BaseModel):
    is_skipping_tomorrow: bool

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    plan_type: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    expo_push_token: Optional[str] = None

class Subscriber(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: str
    lat: float = 44.6488  # Default Halifax coordinates
    lng: float = -63.5752
    status: str = "Active"
    skip: bool = False
    plan_type: str = "Standard Veg"
    credits: int = 18
    delivery_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SubscriberCreate(BaseModel):
    name: str
    address: str
    lat: Optional[float] = 44.6488
    lng: Optional[float] = -63.5752
    plan_type: str = "Standard Veg"
    credits: int = 18

class SubscriberUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    status: Optional[str] = None
    skip: Optional[bool] = None
    plan_type: Optional[str] = None
    credits: Optional[int] = None
    delivery_order: Optional[int] = None

class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    day: str
    main_dish: str
    accompaniments: str
    is_special: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

# Credit Package Models
class CreditPackage(BaseModel):
    id: str
    name: str
    credits: int
    price: float
    savings: Optional[str] = None
    is_popular: bool = False

class CreditPurchase(BaseModel):
    package_id: str
    user_id: str

class CreditTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    credits_added: int
    amount_paid: float
    package_name: str
    status: str = "completed"  # In mock mode, always completed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Notification Models
class NotificationCreate(BaseModel):
    user_id: str
    title: str
    body: str
    notification_type: str = "general"  # delivery_reminder, order_update, promotion
    scheduled_time: Optional[datetime] = None

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    body: str
    notification_type: str = "general"
    is_read: bool = False
    scheduled_time: Optional[datetime] = None
    sent: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PushTokenRegister(BaseModel):
    user_id: str
    expo_push_token: str

# Route optimization models
class RouteStop(BaseModel):
    subscriber_id: str
    name: str
    address: str
    lat: float
    lng: float
    order: int
    estimated_time: str

class OptimizedRoute(BaseModel):
    total_stops: int
    total_distance_km: float
    estimated_duration_minutes: int
    stops: List[RouteStop]


# ==================== CREDIT PACKAGES ====================
CREDIT_PACKAGES = [
    CreditPackage(id="starter", name="Starter Pack", credits=5, price=75.00),
    CreditPackage(id="weekly", name="Weekly Plan", credits=7, price=98.00, savings="Save $7"),
    CreditPackage(id="monthly", name="Monthly Plan", credits=30, price=399.00, savings="Save $51", is_popular=True),
    CreditPackage(id="quarterly", name="Quarterly Plan", credits=90, price=1125.00, savings="Save $225"),
]


# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> Optional[dict]:
    """Get current user from session token in cookies or Authorization header"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    if not session_token:
        return None
    
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        return None
    
    # Check expiry
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )
    
    return user


# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id for session_token after OAuth callback"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get user data
    try:
        async with httpx.AsyncClient() as client:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session_id")
            
            auth_data = auth_response.json()
    except httpx.RequestError as e:
        logger.error(f"Auth request failed: {e}")
        raise HTTPException(status_code=500, detail="Authentication service unavailable")
    
    email = auth_data.get("email")
    name = auth_data.get("name", "User")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info if changed
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": name,
                "picture": picture,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = UserData(
            user_id=user_id,
            name=name,
            email=email,
            picture=picture,
            credits=18,  # Starting credits
            address=""
        )
        await db.users.insert_one(new_user.model_dump())
    
    # Create session
    session = UserSession(
        user_id=user_id,
        session_token=session_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    await db.user_sessions.insert_one(session.model_dump())
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    # Get full user data
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {"success": True, "user": user}


@api_router.get("/auth/me")
async def get_current_user_endpoint(request: Request):
    """Get current authenticated user"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user and clear session"""
    session_token = request.cookies.get("session_token")
    
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"success": True, "message": "Logged out successfully"}


# ==================== CORE ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "The Dabba API - Halifax's Premium Tiffin Service"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "The Dabba API"}


@api_router.get("/time-check", response_model=TimeCheck)
async def check_time_lock():
    current_hour = datetime.now().hour
    can_modify = current_hour < 22
    message = "You can modify your skip status." if can_modify else "Cut-off time (10:00 PM) has passed. Changes locked."
    return TimeCheck(can_modify=can_modify, current_hour=current_hour, message=message)


# ==================== USER ENDPOINTS ====================

@api_router.get("/users/{user_id}")
async def get_user(user_id: str):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@api_router.patch("/users/{user_id}/skip")
async def update_user_skip(user_id: str, skip_update: UserSkipUpdate):
    current_hour = datetime.now().hour
    if current_hour >= 22:
        raise HTTPException(
            status_code=400, 
            detail="Cut-off time (10:00 PM) has passed. We've already started preparing your fresh meal!"
        )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "is_skipping_tomorrow": skip_update.is_skipping_tomorrow,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    updated_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return updated_user


@api_router.patch("/users/{user_id}/profile")
async def update_user_profile(user_id: str, update: UserProfileUpdate):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    updated_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return updated_user


# ==================== CREDIT PURCHASE ENDPOINTS ====================

@api_router.get("/credit-packages")
async def get_credit_packages():
    """Get available credit packages"""
    return {"packages": [p.model_dump() for p in CREDIT_PACKAGES]}


@api_router.post("/purchase-credits")
async def purchase_credits(purchase: CreditPurchase):
    """Purchase credits (mock payment - always succeeds)"""
    # Find package
    package = next((p for p in CREDIT_PACKAGES if p.id == purchase.package_id), None)
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Find user
    user = await db.users.find_one({"user_id": purchase.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Add credits
    new_credits = user.get("credits", 0) + package.credits
    await db.users.update_one(
        {"user_id": purchase.user_id},
        {"$set": {
            "credits": new_credits,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # Create transaction record
    transaction = CreditTransaction(
        user_id=purchase.user_id,
        credits_added=package.credits,
        amount_paid=package.price,
        package_name=package.name
    )
    await db.credit_transactions.insert_one(transaction.model_dump())
    
    return {
        "success": True,
        "message": f"Successfully added {package.credits} credits!",
        "new_balance": new_credits,
        "transaction_id": transaction.id
    }


@api_router.get("/credit-history/{user_id}")
async def get_credit_history(user_id: str):
    """Get user's credit purchase history"""
    transactions = await db.credit_transactions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"transactions": transactions}


# ==================== SUBSCRIBER ENDPOINTS ====================

@api_router.post("/subscribers", response_model=Subscriber)
async def create_subscriber(input: SubscriberCreate):
    sub_dict = input.model_dump()
    sub_obj = Subscriber(**sub_dict)
    await db.subscribers.insert_one(sub_obj.model_dump())
    return sub_obj


@api_router.get("/subscribers")
async def get_all_subscribers():
    subscribers = await db.subscribers.find({}, {"_id": 0}).to_list(1000)
    return subscribers


@api_router.get("/subscribers/{sub_id}")
async def get_subscriber(sub_id: str):
    sub = await db.subscribers.find_one({"id": sub_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    return sub


@api_router.patch("/subscribers/{sub_id}")
async def update_subscriber(sub_id: str, update: SubscriberUpdate):
    sub = await db.subscribers.find_one({"id": sub_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.subscribers.update_one({"id": sub_id}, {"$set": update_data})
    updated_sub = await db.subscribers.find_one({"id": sub_id}, {"_id": 0})
    return updated_sub


@api_router.patch("/subscribers/{sub_id}/skip")
async def toggle_subscriber_skip(sub_id: str):
    current_hour = datetime.now().hour
    if current_hour >= 22:
        raise HTTPException(
            status_code=400, 
            detail="Cut-off time (10:00 PM) has passed. Changes locked."
        )
    
    sub = await db.subscribers.find_one({"id": sub_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    
    new_skip_status = not sub.get("skip", False)
    await db.subscribers.update_one(
        {"id": sub_id},
        {"$set": {
            "skip": new_skip_status,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    updated_sub = await db.subscribers.find_one({"id": sub_id}, {"_id": 0})
    return updated_sub


@api_router.delete("/subscribers/{sub_id}")
async def delete_subscriber(sub_id: str):
    result = await db.subscribers.delete_one({"id": sub_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    return {"message": "Subscriber deleted successfully"}


# ==================== PREP STATS ====================

@api_router.get("/prep-stats", response_model=PrepStats)
async def get_prep_stats():
    subscribers = await db.subscribers.find({}, {"_id": 0}).to_list(1000)
    
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


# ==================== ROUTE OPTIMIZATION ====================

@api_router.get("/delivery-route")
async def get_optimized_route():
    """Get optimized delivery route for tomorrow's deliveries"""
    # Get active, non-skipping subscribers
    subscribers = await db.subscribers.find(
        {"status": "Active", "skip": False},
        {"_id": 0}
    ).to_list(1000)
    
    if not subscribers:
        return OptimizedRoute(
            total_stops=0,
            total_distance_km=0,
            estimated_duration_minutes=0,
            stops=[]
        )
    
    # Simple distance-based optimization (TSP approximation)
    # Starting from a central point in Halifax
    start_lat, start_lng = 44.6488, -63.5752
    
    stops = []
    remaining = list(subscribers)
    current_lat, current_lng = start_lat, start_lng
    order = 1
    total_distance = 0
    
    while remaining:
        # Find nearest subscriber
        nearest = min(remaining, key=lambda s: (
            (s.get("lat", start_lat) - current_lat) ** 2 + 
            (s.get("lng", start_lng) - current_lng) ** 2
        ))
        
        # Calculate distance (simplified)
        dist = ((nearest.get("lat", start_lat) - current_lat) ** 2 + 
                (nearest.get("lng", start_lng) - current_lng) ** 2) ** 0.5 * 111  # rough km conversion
        total_distance += dist
        
        stops.append(RouteStop(
            subscriber_id=nearest["id"],
            name=nearest["name"],
            address=nearest["address"],
            lat=nearest.get("lat", start_lat),
            lng=nearest.get("lng", start_lng),
            order=order,
            estimated_time=f"{11 + (order - 1) * 15 // 60}:{(order - 1) * 15 % 60:02d} AM"
        ))
        
        current_lat, current_lng = nearest.get("lat", start_lat), nearest.get("lng", start_lng)
        remaining.remove(nearest)
        order += 1
    
    return OptimizedRoute(
        total_stops=len(stops),
        total_distance_km=round(total_distance, 1),
        estimated_duration_minutes=len(stops) * 15,
        stops=stops
    )


# ==================== NOTIFICATION ENDPOINTS ====================

@api_router.post("/register-push-token")
async def register_push_token(data: PushTokenRegister):
    """Register or update user's push token"""
    await db.users.update_one(
        {"user_id": data.user_id},
        {"$set": {
            "expo_push_token": data.expo_push_token,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    return {"success": True, "message": "Push token registered"}


@api_router.post("/notifications")
async def create_notification(notification: NotificationCreate):
    """Create a notification (scheduled or immediate)"""
    notif = Notification(
        user_id=notification.user_id,
        title=notification.title,
        body=notification.body,
        notification_type=notification.notification_type,
        scheduled_time=notification.scheduled_time
    )
    await db.notifications.insert_one(notif.model_dump())
    return {"success": True, "notification_id": notif.id}


@api_router.get("/notifications/{user_id}")
async def get_user_notifications(user_id: str):
    """Get user's notifications"""
    notifications = await db.notifications.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"notifications": notifications}


@api_router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark notification as read"""
    await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"is_read": True}}
    )
    return {"success": True}


@api_router.post("/send-test-notification")
async def send_test_notification(user_id: str):
    """Send a test notification to user"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    push_token = user.get("expo_push_token")
    if not push_token:
        return {"success": False, "message": "No push token registered"}
    
    # Send via Expo
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json={
                    "to": push_token,
                    "title": "Delivery Reminder",
                    "body": "Your tiffin will be delivered tomorrow at 12 PM!",
                    "data": {"type": "delivery_reminder"}
                },
                headers={"Content-Type": "application/json"},
                timeout=10.0
            )
            
            if response.status_code == 200:
                return {"success": True, "message": "Notification sent!"}
            else:
                return {"success": False, "message": f"Failed: {response.text}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


# ==================== MENU ENDPOINTS ====================

@api_router.post("/menu", response_model=MenuItem)
async def create_menu_item(input: MenuItemCreate):
    menu_dict = input.model_dump()
    menu_obj = MenuItem(**menu_dict)
    await db.menu.insert_one(menu_obj.model_dump())
    return menu_obj


@api_router.get("/menu")
async def get_menu():
    menu_items = await db.menu.find({}, {"_id": 0}).to_list(100)
    return menu_items


@api_router.delete("/menu/{item_id}")
async def delete_menu_item(item_id: str):
    result = await db.menu.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted successfully"}


# ==================== SEED ENDPOINT ====================

@api_router.post("/seed")
async def seed_data():
    """Seed initial data for demo"""
    # Clear existing data
    await db.subscribers.delete_many({})
    await db.menu.delete_many({})
    
    # Seed subscribers with coordinates
    sample_subscribers = [
        Subscriber(name="Amit S.", address="Barrington St", lat=44.6476, lng=-63.5728, status="Active", skip=False, delivery_order=1),
        Subscriber(name="Priya K.", address="South Park St", lat=44.6421, lng=-63.5812, status="Active", skip=True, delivery_order=2),
        Subscriber(name="Rahul M.", address="Quinpool Rd", lat=44.6508, lng=-63.5921, status="Active", skip=False, delivery_order=3),
        Subscriber(name="Sana V.", address="Bedford Hwy", lat=44.6698, lng=-63.6421, status="Expired", skip=False, delivery_order=4),
        Subscriber(name="Deepa T.", address="Spring Garden Rd", lat=44.6432, lng=-63.5786, status="Active", skip=False, delivery_order=5),
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
    
    return {"message": "Database seeded successfully"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
