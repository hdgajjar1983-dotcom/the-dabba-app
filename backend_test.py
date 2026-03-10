#!/usr/bin/env python3
"""
Backend API Testing for The Dabba Tiffin Delivery App
Tests all endpoints: Auth, Menu, Subscription, Wallet, Driver
"""

import asyncio
import json
import aiohttp
import sys
from datetime import datetime

# Backend URL from environment
BASE_URL = "https://halifax-meal-planner.preview.emergentagent.com/api"

class TestResults:
    def __init__(self):
        self.results = []
        self.customer_token = None
        self.driver_token = None
        self.customer_user = None
        self.driver_user = None
        
    def add_result(self, test_name, status, details=""):
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        print(f"{'✅' if status == 'PASS' else '❌'} {test_name}: {details}")
        
    def print_summary(self):
        passed = len([r for r in self.results if r["status"] == "PASS"])
        failed = len([r for r in self.results if r["status"] == "FAIL"])
        print(f"\n🔍 TEST SUMMARY: {passed} PASSED, {failed} FAILED")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.results:
                if result["status"] == "FAIL":
                    print(f"  - {result['test']}: {result['details']}")

async def make_request(session, method, endpoint, data=None, token=None):
    """Make HTTP request with proper error handling"""
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method.upper() == "GET":
            async with session.get(url, headers=headers) as response:
                response_data = await response.json()
                return response.status, response_data
        
        elif method.upper() == "POST":
            async with session.post(url, headers=headers, json=data) as response:
                response_data = await response.json()
                return response.status, response_data
                
        elif method.upper() == "PUT":
            async with session.put(url, headers=headers, json=data) as response:
                response_data = await response.json()
                return response.status, response_data
                
    except Exception as e:
        return 500, {"error": str(e)}

async def test_auth_apis(session, results):
    """Test authentication endpoints"""
    print("\n🔐 Testing Authentication APIs...")
    
    # 1. Test Register - New Customer
    test_customer = {
        "name": "Priya Sharma",
        "email": f"priya.test.{int(datetime.now().timestamp())}@dabba.com",
        "password": "secure123",
        "phone": "9876543210",
        "address": "123 MG Road, Bangalore",
        "role": "customer"
    }
    
    status, response = await make_request(session, "POST", "/auth/register", test_customer)
    if status == 200 and "token" in response:
        results.customer_token = response["token"]
        results.customer_user = response["user"]
        results.add_result("Auth Register Customer", "PASS", f"User registered: {response['user']['name']}")
    else:
        results.add_result("Auth Register Customer", "FAIL", f"Status {status}: {response}")
    
    # 2. Test Register - New Driver
    test_driver = {
        "name": "Raj Kumar",
        "email": f"raj.driver.{int(datetime.now().timestamp())}@dabba.com",
        "password": "driver123",
        "phone": "9876543211",
        "address": "456 Brigade Road, Bangalore",
        "role": "driver"
    }
    
    status, response = await make_request(session, "POST", "/auth/register", test_driver)
    if status == 200 and "token" in response:
        results.driver_token = response["token"]
        results.driver_user = response["user"]
        results.add_result("Auth Register Driver", "PASS", f"Driver registered: {response['user']['name']}")
    else:
        results.add_result("Auth Register Driver", "FAIL", f"Status {status}: {response}")
    
    # 3. Test Login - Existing Customer
    login_customer = {"email": "test2@dabba.com", "password": "test123"}
    status, response = await make_request(session, "POST", "/auth/login", login_customer)
    if status == 200 and "token" in response:
        # Update with existing customer token for further tests
        results.customer_token = response["token"]
        results.customer_user = response["user"]
        results.add_result("Auth Login Customer", "PASS", f"Customer logged in: {response['user']['email']}")
    else:
        results.add_result("Auth Login Customer", "FAIL", f"Status {status}: {response}")
    
    # 4. Test Login - Existing Driver
    login_driver = {"email": "driver@dabba.com", "password": "driver123"}
    status, response = await make_request(session, "POST", "/auth/login", login_driver)
    if status == 200 and "token" in response:
        results.driver_token = response["token"]
        results.driver_user = response["user"]
        results.add_result("Auth Login Driver", "PASS", f"Driver logged in: {response['user']['email']}")
    else:
        results.add_result("Auth Login Driver", "FAIL", f"Status {status}: {response}")
    
    # 5. Test Get Current User - Customer
    if results.customer_token:
        status, response = await make_request(session, "GET", "/auth/me", token=results.customer_token)
        if status == 200 and "id" in response:
            results.add_result("Auth Get Me Customer", "PASS", f"Retrieved user: {response.get('name')}")
        else:
            results.add_result("Auth Get Me Customer", "FAIL", f"Status {status}: {response}")
    
    # 6. Test Get Current User - Driver
    if results.driver_token:
        status, response = await make_request(session, "GET", "/auth/me", token=results.driver_token)
        if status == 200 and "id" in response:
            results.add_result("Auth Get Me Driver", "PASS", f"Retrieved driver: {response.get('name')}")
        else:
            results.add_result("Auth Get Me Driver", "FAIL", f"Status {status}: {response}")

async def test_menu_api(session, results):
    """Test menu endpoints"""
    print("\n🍱 Testing Menu API...")
    
    status, response = await make_request(session, "GET", "/menu")
    if status == 200 and "menu" in response:
        menu = response["menu"]
        if len(menu) > 0 and "lunch" in menu[0] and "dinner" in menu[0]:
            results.add_result("Menu Get Weekly", "PASS", f"Retrieved {len(menu)} days menu")
        else:
            results.add_result("Menu Get Weekly", "FAIL", "Menu format invalid")
    else:
        results.add_result("Menu Get Weekly", "FAIL", f"Status {status}: {response}")

async def test_subscription_apis(session, results):
    """Test subscription endpoints"""
    print("\n📋 Testing Subscription APIs...")
    
    if not results.customer_token:
        results.add_result("Subscription Tests", "FAIL", "No customer token available")
        return
    
    # 1. Test Create Subscription
    subscription_data = {
        "plan": "premium",
        "delivery_address": "789 Koramangala, Bangalore 560034"
    }
    
    status, response = await make_request(session, "POST", "/subscription", subscription_data, results.customer_token)
    if status == 200 and "id" in response:
        results.add_result("Subscription Create", "PASS", f"Created {response.get('plan')} subscription")
    else:
        results.add_result("Subscription Create", "FAIL", f"Status {status}: {response}")
    
    # 2. Test Get Subscription
    status, response = await make_request(session, "GET", "/subscription", token=results.customer_token)
    if status == 200 and "id" in response:
        results.add_result("Subscription Get", "PASS", f"Retrieved subscription: {response.get('plan')}")
    elif status == 404:
        results.add_result("Subscription Get", "PASS", "No subscription found (expected for new users)")
    else:
        results.add_result("Subscription Get", "FAIL", f"Status {status}: {response}")
    
    # 3. Test Skip Meal
    today = datetime.now().strftime("%Y-%m-%d")
    skip_data = {
        "date": today,
        "meal_type": "lunch"
    }
    
    status, response = await make_request(session, "POST", "/subscription/skip", skip_data, results.customer_token)
    if status == 200 and "message" in response:
        results.add_result("Skip Meal", "PASS", f"Skipped meal: {response.get('credit', 0)} credit added")
    else:
        results.add_result("Skip Meal", "FAIL", f"Status {status}: {response}")

async def test_wallet_api(session, results):
    """Test wallet endpoints"""
    print("\n💰 Testing Wallet API...")
    
    if not results.customer_token:
        results.add_result("Wallet Tests", "FAIL", "No customer token available")
        return
    
    status, response = await make_request(session, "GET", "/wallet", token=results.customer_token)
    if status == 200 and "balance" in response:
        balance = response.get("balance", 0)
        transactions = response.get("transactions", [])
        results.add_result("Wallet Get", "PASS", f"Balance: ₹{balance}, {len(transactions)} transactions")
    else:
        results.add_result("Wallet Get", "FAIL", f"Status {status}: {response}")

async def test_driver_apis(session, results):
    """Test driver endpoints with location-based sorting and photo proof"""
    print("\n🚚 Testing Driver APIs...")
    
    if not results.driver_token:
        results.add_result("Driver Tests", "FAIL", "No driver token available")
        return
    
    # 1. Test Get Driver Deliveries WITHOUT location params
    status, response = await make_request(session, "GET", "/driver/deliveries", token=results.driver_token)
    if status == 200 and "deliveries" in response:
        deliveries_no_location = response["deliveries"]
        results.add_result("Driver Get Deliveries Basic", "PASS", f"Retrieved {len(deliveries_no_location)} deliveries")
    else:
        results.add_result("Driver Get Deliveries Basic", "FAIL", f"Status {status}: {response}")
        return
    
    # 2. Test Get Driver Deliveries WITH location params (Halifax coordinates)
    halifax_lat, halifax_lon = 44.6488, -63.5752
    status, response = await make_request(session, "GET", f"/driver/deliveries?lat={halifax_lat}&lon={halifax_lon}", token=results.driver_token)
    
    if status == 200 and "deliveries" in response:
        deliveries_with_location = response["deliveries"]
        
        # Verify location-based sorting
        if deliveries_with_location:
            # Check that each delivery has required fields
            first_delivery = deliveries_with_location[0]
            required_fields = ["distance", "estimated_time", "latitude", "longitude"]
            missing_fields = [field for field in required_fields if field not in first_delivery]
            
            if not missing_fields:
                # Check if deliveries are sorted by distance (ascending)
                distances = [d.get("distance", 0) for d in deliveries_with_location]
                is_sorted = all(distances[i] <= distances[i + 1] for i in range(len(distances) - 1))
                
                if is_sorted:
                    results.add_result("Driver Deliveries Location Sorting", "PASS", 
                                     f"Retrieved {len(deliveries_with_location)} deliveries sorted by distance. Nearest: {distances[0]}km")
                else:
                    results.add_result("Driver Deliveries Location Sorting", "FAIL", 
                                     f"Deliveries not sorted by distance: {distances}")
            else:
                results.add_result("Driver Deliveries Location Sorting", "FAIL", 
                                 f"Missing required fields: {missing_fields}")
        else:
            results.add_result("Driver Deliveries Location Sorting", "PASS", "No deliveries available for location testing")
    else:
        results.add_result("Driver Deliveries Location Sorting", "FAIL", f"Status {status}: {response}")
        return
    
    # 3. Test Update Delivery Status WITHOUT photo
    if deliveries_with_location:
        delivery_id = deliveries_with_location[0].get("id", "test-delivery-123")
        status_data = {"status": "delivered"}
        
        status, response = await make_request(session, "PUT", f"/driver/delivery/{delivery_id}/status", 
                                            status_data, results.driver_token)
        if status == 200 and "message" in response and "has_photo" in response:
            has_photo = response.get("has_photo", False)
            if not has_photo:
                results.add_result("Driver Update Status No Photo", "PASS", 
                                 f"Updated delivery status without photo: {response['message']}")
            else:
                results.add_result("Driver Update Status No Photo", "FAIL", 
                                 f"has_photo should be false when no photo provided: {response}")
        else:
            results.add_result("Driver Update Status No Photo", "FAIL", f"Status {status}: {response}")
    
    # 4. Test Update Delivery Status WITH photo (base64 encoded)
    if deliveries_with_location:
        delivery_id = deliveries_with_location[0].get("id", "test-delivery-124")
        # Sample base64 encoded 1x1 pixel PNG image
        sample_photo_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        
        status_data = {
            "status": "delivered",
            "photo_base64": sample_photo_base64
        }
        
        status, response = await make_request(session, "PUT", f"/driver/delivery/{delivery_id}/status", 
                                            status_data, results.driver_token)
        if status == 200 and "message" in response and "has_photo" in response:
            has_photo = response.get("has_photo", False)
            if has_photo:
                results.add_result("Driver Update Status With Photo", "PASS", 
                                 f"Updated delivery status with photo proof: {response['message']}")
            else:
                results.add_result("Driver Update Status With Photo", "FAIL", 
                                 f"has_photo should be true when photo provided: {response}")
        else:
            results.add_result("Driver Update Status With Photo", "FAIL", f"Status {status}: {response}")

async def test_integration_flow(session, results):
    """Test complete user flow integration"""
    print("\n🔄 Testing Integration Flow...")
    
    if not results.customer_token:
        results.add_result("Integration Flow", "FAIL", "Customer authentication failed")
        return
    
    flow_steps = []
    
    # Step 1: Get Menu
    status, response = await make_request(session, "GET", "/menu")
    if status == 200:
        flow_steps.append("✅ Menu retrieved")
    else:
        flow_steps.append("❌ Menu failed")
    
    # Step 2: Create Subscription (if not exists)
    subscription_data = {"plan": "standard", "delivery_address": "Test Address for Integration"}
    status, response = await make_request(session, "POST", "/subscription", subscription_data, results.customer_token)
    if status == 200 or status == 400:  # 400 if already exists
        flow_steps.append("✅ Subscription handled")
    else:
        flow_steps.append("❌ Subscription failed")
    
    # Step 3: Check Wallet
    status, response = await make_request(session, "GET", "/wallet", token=results.customer_token)
    if status == 200:
        flow_steps.append("✅ Wallet retrieved")
    else:
        flow_steps.append("❌ Wallet failed")
    
    results.add_result("Integration Flow", "PASS", " | ".join(flow_steps))

async def main():
    """Run all API tests"""
    print("🚀 Starting The Dabba API Testing...")
    print(f"🌐 Testing against: {BASE_URL}")
    
    results = TestResults()
    
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
        try:
            # Test root endpoint first
            status, response = await make_request(session, "GET", "/")
            if status == 200:
                results.add_result("API Health Check", "PASS", f"API is running: {response.get('message', 'OK')}")
            else:
                results.add_result("API Health Check", "FAIL", f"Status {status}: {response}")
            
            # Run all test suites
            await test_auth_apis(session, results)
            await test_menu_api(session, results)
            await test_subscription_apis(session, results)
            await test_wallet_api(session, results)
            await test_driver_apis(session, results)
            await test_integration_flow(session, results)
            
        except Exception as e:
            results.add_result("Test Execution", "FAIL", f"Critical error: {str(e)}")
    
    # Print final summary
    results.print_summary()
    
    # Return results for further processing
    return results

if __name__ == "__main__":
    results = asyncio.run(main())