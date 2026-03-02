#!/usr/bin/env python3
"""
Focused Driver API Testing for The Dabba Tiffin Delivery App
Testing specific requirements from review request:
1. Driver Deliveries API with Location-based Sorting
2. Driver Update Delivery Status with Photo
"""

import asyncio
import json
import aiohttp
import sys
from datetime import datetime

# Backend URL from environment
BASE_URL = "https://royalgujarat-build.preview.emergentagent.com/api"

class FocusedTestResults:
    def __init__(self):
        self.results = []
        self.driver_token = None
        
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
        print(f"\n🔍 FOCUSED TEST SUMMARY: {passed} PASSED, {failed} FAILED")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.results:
                if result["status"] == "FAIL":
                    print(f"  - {result['test']}: {result['details']}")
        
        return failed == 0

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

async def login_driver(session, results):
    """Login as driver with test credentials"""
    print("\n🔐 Logging in as driver...")
    
    login_data = {
        "email": "driver@dabba.com",
        "password": "driver123"
    }
    
    try:
        status, response = await make_request(session, "POST", "/auth/login", login_data)
        if status == 200 and "token" in response:
            results.driver_token = response["token"]
            results.add_result("Driver Login", "PASS", f"Driver logged in: {response['user']['email']}")
            return True
        else:
            results.add_result("Driver Login", "FAIL", f"Status {status}: {response}")
            return False
    except Exception as e:
        results.add_result("Driver Login", "FAIL", f"Login error: {str(e)}")
        return False

async def test_driver_deliveries_location_sorting(session, results):
    """
    Test: GET /api/driver/deliveries?lat=44.6488&lon=-63.5752
    Requirements:
    - Requires Bearer token for driver role  
    - Returns deliveries sorted by distance (nearest first)
    - Each delivery has distance, estimated_time, latitude, longitude fields
    """
    print("\n🚚 Testing Driver Deliveries API with Location-based Sorting...")
    
    if not results.driver_token:
        results.add_result("Driver Deliveries Location Test", "FAIL", "No driver token available")
        return None
    
    # Test coordinates from requirements - Halifax, Canada
    lat, lon = 44.6488, -63.5752
    endpoint = f"/driver/deliveries?lat={lat}&lon={lon}"
    
    status, response = await make_request(session, "GET", endpoint, token=results.driver_token)
    
    if status == 200 and "deliveries" in response:
        deliveries = response["deliveries"]
        
        if not deliveries:
            results.add_result("Driver Deliveries Location Test", "PASS", "No deliveries available for testing (expected if no subscriptions)")
            return []
        
        # Check required fields in first delivery
        first_delivery = deliveries[0]
        required_fields = ["distance", "estimated_time", "latitude", "longitude"]
        missing_fields = [field for field in required_fields if field not in first_delivery]
        
        if missing_fields:
            results.add_result("Driver Deliveries Location Test", "FAIL", 
                             f"Missing required fields: {missing_fields}")
            return None
        
        # Check if deliveries are sorted by distance (ascending order)
        distances = [d.get("distance", 0) for d in deliveries]
        is_sorted = all(distances[i] <= distances[i + 1] for i in range(len(distances) - 1))
        
        if is_sorted:
            results.add_result("Driver Deliveries Location Test", "PASS", 
                             f"Retrieved {len(deliveries)} deliveries sorted by distance. "
                             f"Distances: {distances} km")
        else:
            results.add_result("Driver Deliveries Location Test", "FAIL", 
                             f"Deliveries NOT sorted by distance. Distances: {distances}")
            return None
            
        # Verify all deliveries have the required coordinate and calculation fields
        all_have_coords = all(
            "latitude" in d and "longitude" in d and "distance" in d and "estimated_time" in d
            for d in deliveries
        )
        
        if all_have_coords:
            results.add_result("Driver Deliveries Field Validation", "PASS", 
                             "All deliveries contain required location and calculation fields")
        else:
            results.add_result("Driver Deliveries Field Validation", "FAIL", 
                             "Some deliveries missing location/calculation fields")
            
        return deliveries
        
    else:
        results.add_result("Driver Deliveries Location Test", "FAIL", f"Status {status}: {response}")
        return None

async def test_driver_update_delivery_with_photo(session, results, deliveries):
    """
    Test: PUT /api/driver/delivery/{delivery_id}/status
    Requirements:
    - Requires Bearer token for driver role
    - Body: {"status": "delivered", "photo_base64": "base64_encoded_image"}
    - Returns success message and has_photo boolean
    """
    print("\n📸 Testing Driver Update Delivery Status with Photo...")
    
    if not results.driver_token:
        results.add_result("Driver Update Photo Test", "FAIL", "No driver token available")
        return
    
    if not deliveries:
        results.add_result("Driver Update Photo Test", "PASS", "No deliveries to update (expected if no subscriptions)")
        return
    
    # Use first delivery for testing
    delivery_id = deliveries[0].get("id", "test-delivery-id")
    
    # Test 1: Update WITHOUT photo_base64
    status_data_no_photo = {"status": "delivered"}
    
    status, response = await make_request(session, "PUT", f"/driver/delivery/{delivery_id}/status", 
                                        status_data_no_photo, results.driver_token)
    
    if status == 200 and "message" in response and "has_photo" in response:
        has_photo = response.get("has_photo", False)
        if not has_photo:
            results.add_result("Driver Update No Photo", "PASS", 
                             f"Status updated without photo. has_photo=false: {response['message']}")
        else:
            results.add_result("Driver Update No Photo", "FAIL", 
                             f"has_photo should be false when no photo provided. Response: {response}")
    else:
        results.add_result("Driver Update No Photo", "FAIL", f"Status {status}: {response}")
        return
    
    # Test 2: Update WITH photo_base64
    # Sample base64 encoded 1x1 pixel PNG image (valid base64 image)
    sample_photo_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    
    status_data_with_photo = {
        "status": "delivered", 
        "photo_base64": sample_photo_base64
    }
    
    status, response = await make_request(session, "PUT", f"/driver/delivery/{delivery_id}/status", 
                                        status_data_with_photo, results.driver_token)
    
    if status == 200 and "message" in response and "has_photo" in response:
        has_photo = response.get("has_photo", False)
        if has_photo:
            results.add_result("Driver Update With Photo", "PASS", 
                             f"Status updated with photo proof. has_photo=true: {response['message']}")
        else:
            results.add_result("Driver Update With Photo", "FAIL", 
                             f"has_photo should be true when photo provided. Response: {response}")
    else:
        results.add_result("Driver Update With Photo", "FAIL", f"Status {status}: {response}")

async def main():
    """Run focused driver API tests as per review request"""
    print("🎯 FOCUSED DRIVER API TESTING - The Dabba")
    print("Testing specific requirements from review request")
    print(f"🌐 Testing against: {BASE_URL}")
    
    results = FocusedTestResults()
    
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
        try:
            # Step 1: Login as driver with test credentials
            login_success = await login_driver(session, results)
            if not login_success:
                print("❌ Cannot proceed without driver authentication")
                return results
            
            # Step 2: Test driver deliveries with location params
            deliveries = await test_driver_deliveries_location_sorting(session, results)
            
            # Step 3: Test delivery status update with photo
            await test_driver_update_delivery_with_photo(session, results, deliveries)
            
        except Exception as e:
            results.add_result("Test Execution", "FAIL", f"Critical error: {str(e)}")
    
    # Print final summary
    success = results.print_summary()
    
    if success:
        print("\n✅ ALL FOCUSED TESTS PASSED!")
        print("🎯 Driver location-based deliveries and photo proof functionality working correctly")
    else:
        print("\n❌ SOME TESTS FAILED")
        print("🔧 Review failed tests above for implementation issues")
    
    return results

if __name__ == "__main__":
    results = asyncio.run(main())