#!/usr/bin/env python3
"""
Backend API Testing for The Dabba - Halifax's Premium Tiffin Service
Tests all the backend endpoints to verify functionality
"""

import requests
import json
import sys
from datetime import datetime

# Use the public URL from frontend .env
BACKEND_URL = "https://meal-skip-hub.preview.emergentagent.com/api"

def test_api_endpoint(method, endpoint, data=None, expected_status=200):
    """Generic function to test API endpoints"""
    url = f"{BACKEND_URL}{endpoint}"
    print(f"\n🧪 Testing {method.upper()} {endpoint}")
    print(f"   URL: {url}")
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, timeout=30)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, timeout=30)
        elif method.upper() == 'PATCH':
            response = requests.patch(url, json=data, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == expected_status:
            try:
                result = response.json()
                print(f"   ✅ SUCCESS")
                print(f"   Response: {json.dumps(result, indent=2)}")
                return result, True
            except:
                print(f"   ✅ SUCCESS (No JSON response)")
                return response.text, True
        else:
            print(f"   ❌ FAILED - Expected {expected_status}, got {response.status_code}")
            try:
                error_detail = response.json()
                print(f"   Error: {json.dumps(error_detail, indent=2)}")
            except:
                print(f"   Error: {response.text}")
            return None, False
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ CONNECTION ERROR: {e}")
        return None, False

def main():
    print("="*80)
    print("🍛 THE DABBA API TESTING")
    print("="*80)
    
    all_tests_passed = True
    subscriber_ids = []
    
    # Test 1: Root endpoint
    print("\n" + "="*50)
    print("1. ROOT ENDPOINT")
    result, success = test_api_endpoint('GET', '/')
    if not success:
        all_tests_passed = False
    
    # Test 2: Health check
    print("\n" + "="*50)
    print("2. HEALTH CHECK")
    result, success = test_api_endpoint('GET', '/health')
    if not success:
        all_tests_passed = False
    
    # Test 3: Seed database (CRITICAL - do this first)
    print("\n" + "="*50)
    print("3. SEED DATABASE")
    result, success = test_api_endpoint('POST', '/seed')
    if not success:
        all_tests_passed = False
        print("❌ CRITICAL: Cannot seed database - subsequent tests may fail")
    else:
        print("✅ Database seeded - default user 'Hetal' created with 18 credits")
        print("✅ 4 subscribers created: Amit S., Priya K. (skip=true), Rahul M., Sana V. (expired)")
        print("✅ 5 menu items created")
    
    # Test 4: Time check
    print("\n" + "="*50)  
    print("4. TIME CHECK (10 PM CUTOFF LOGIC)")
    result, success = test_api_endpoint('GET', '/time-check')
    if success and result:
        current_hour = datetime.now().hour
        can_modify = result.get('can_modify', False)
        print(f"   Current hour: {current_hour}")
        print(f"   Can modify: {can_modify}")
        print(f"   Expected: {current_hour < 22}")
        if can_modify == (current_hour < 22):
            print("✅ Time lock logic working correctly")
        else:
            print("❌ Time lock logic issue")
            all_tests_passed = False
    elif not success:
        all_tests_passed = False
    
    # Test 5: Get default user
    print("\n" + "="*50)
    print("5. GET DEFAULT USER")
    result, success = test_api_endpoint('GET', '/users/default-user')
    if success and result:
        if result.get('name') == 'Hetal' and result.get('credits') == 18:
            print("✅ Default user data correct - Hetal with 18 credits")
        else:
            print(f"❌ Unexpected user data - name: {result.get('name')}, credits: {result.get('credits')}")
            all_tests_passed = False
    elif not success:
        all_tests_passed = False
    
    # Test 6: Toggle user skip status (only if time allows)
    print("\n" + "="*50)
    print("6. USER SKIP TOGGLE")
    current_hour = datetime.now().hour
    if current_hour < 22:
        # Test toggling skip to true
        result, success = test_api_endpoint('PATCH', '/users/default-user/skip', 
                                          {'is_skipping_tomorrow': True})
        if success and result:
            if result.get('is_skipping_tomorrow') == True:
                print("✅ Skip toggle to TRUE successful")
            else:
                print("❌ Skip toggle failed - status not updated")
                all_tests_passed = False
        elif not success:
            all_tests_passed = False
            
        # Test toggling skip back to false
        result, success = test_api_endpoint('PATCH', '/users/default-user/skip', 
                                          {'is_skipping_tomorrow': False})
        if success and result:
            if result.get('is_skipping_tomorrow') == False:
                print("✅ Skip toggle to FALSE successful")
            else:
                print("❌ Skip toggle failed - status not updated")
                all_tests_passed = False
        elif not success:
            all_tests_passed = False
    else:
        print("⏰ Time cutoff (10 PM) passed - testing time lock enforcement")
        result, success = test_api_endpoint('PATCH', '/users/default-user/skip', 
                                          {'is_skipping_tomorrow': True}, expected_status=400)
        if success:
            print("✅ Time lock working - skip changes blocked after 10 PM")
        else:
            print("❌ Time lock not working - should block changes after 10 PM")
            all_tests_passed = False
    
    # Test 7: Get all subscribers
    print("\n" + "="*50)
    print("7. GET SUBSCRIBERS")
    result, success = test_api_endpoint('GET', '/subscribers')
    if success and result:
        if len(result) == 4:
            print("✅ Correct number of subscribers (4)")
            # Extract subscriber IDs for toggle test
            subscriber_ids = [sub.get('id') for sub in result]
            
            # Verify specific subscribers
            names = [sub.get('name') for sub in result]
            expected_names = ['Amit S.', 'Priya K.', 'Rahul M.', 'Sana V.']
            if all(name in names for name in expected_names):
                print("✅ All expected subscribers found")
            else:
                print(f"❌ Missing expected subscribers - found: {names}")
                all_tests_passed = False
                
            # Check Priya K. has skip=true
            priya = next((sub for sub in result if sub.get('name') == 'Priya K.'), None)
            if priya and priya.get('skip') == True:
                print("✅ Priya K. has skip=true as expected")
            else:
                print("❌ Priya K. skip status incorrect")
                all_tests_passed = False
                
            # Check Sana V. has status=Expired
            sana = next((sub for sub in result if sub.get('name') == 'Sana V.'), None)
            if sana and sana.get('status') == 'Expired':
                print("✅ Sana V. has status=Expired as expected")
            else:
                print("❌ Sana V. status incorrect")
                all_tests_passed = False
                
        else:
            print(f"❌ Wrong number of subscribers - expected 4, got {len(result)}")
            all_tests_passed = False
    elif not success:
        all_tests_passed = False
    
    # Test 8: Toggle subscriber skip (only if time allows and we have IDs)
    print("\n" + "="*50)
    print("8. SUBSCRIBER SKIP TOGGLE")
    if current_hour < 22 and subscriber_ids:
        # Find Amit S. (should have skip=false initially)
        amit_id = None
        if result:  # result from previous test
            amit = next((sub for sub in result if sub.get('name') == 'Amit S.'), None)
            if amit:
                amit_id = amit.get('id')
        
        if amit_id:
            result, success = test_api_endpoint('PATCH', f'/subscribers/{amit_id}/skip')
            if success and result:
                new_skip_status = result.get('skip')
                print(f"✅ Amit S. skip toggled to: {new_skip_status}")
            else:
                print("❌ Subscriber skip toggle failed")
                all_tests_passed = False
        else:
            print("❌ Could not find Amit S. ID for toggle test")
            all_tests_passed = False
    else:
        if current_hour >= 22:
            print("⏰ Time cutoff passed - skip modifications locked")
        else:
            print("❌ No subscriber IDs available for toggle test")
    
    # Test 9: Prep statistics
    print("\n" + "="*50)
    print("9. PREP STATISTICS")
    result, success = test_api_endpoint('GET', '/prep-stats')
    if success and result:
        total_active = result.get('total_active')
        total_skipping = result.get('total_skipping')  
        total_prep = result.get('total_prep')
        total_expired = result.get('total_expired')
        
        print(f"   Active: {total_active}, Skipping: {total_skipping}, Prep: {total_prep}, Expired: {total_expired}")
        
        # Expected: 3 Active (Amit, Priya, Rahul), 1 Skipping (Priya), 2 Prep (Amit+Rahul), 1 Expired (Sana)
        if total_active == 3 and total_skipping == 1 and total_prep == 2 and total_expired == 1:
            print("✅ Prep stats correct - 3 Active, 1 Skipping, 2 Prep, 1 Expired")
        else:
            print("❌ Prep stats incorrect")
            all_tests_passed = False
    elif not success:
        all_tests_passed = False
    
    # Test 10: Get menu
    print("\n" + "="*50)
    print("10. GET MENU")
    result, success = test_api_endpoint('GET', '/menu')
    if success and result:
        if len(result) == 5:
            print("✅ Correct number of menu items (5)")
            days = [item.get('day') for item in result]
            expected_days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
            if all(day in days for day in expected_days):
                print("✅ All weekdays covered in menu")
            else:
                print(f"❌ Missing expected days - found: {days}")
                all_tests_passed = False
        else:
            print(f"❌ Wrong number of menu items - expected 5, got {len(result)}")
            all_tests_passed = False
    elif not success:
        all_tests_passed = False
    
    # Final summary
    print("\n" + "="*80)
    if all_tests_passed:
        print("🎉 ALL BACKEND TESTS PASSED! The Dabba API is working correctly.")
    else:
        print("❌ SOME TESTS FAILED! Check the details above.")
    print("="*80)
    
    return all_tests_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)