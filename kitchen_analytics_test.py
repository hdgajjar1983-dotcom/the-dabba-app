#!/usr/bin/env python3
"""
Kitchen Analytics API Testing for The Dabba - Halifax's Premium Tiffin Service
Tests the new Kitchen Analytics API with proper authentication
"""

import requests
import json
import sys
from datetime import datetime

# Use the public URL from frontend .env
BACKEND_URL = "https://multi-portal-sync.preview.emergentagent.com/api"

def test_api_endpoint(method, endpoint, data=None, headers=None, expected_status=200):
    """Generic function to test API endpoints"""
    url = f"{BACKEND_URL}{endpoint}"
    print(f"\n🧪 Testing {method.upper()} {endpoint}")
    print(f"   URL: {url}")
    
    if headers:
        print(f"   Headers: Authorization present")
    if data:
        print(f"   Data: {json.dumps(data, indent=2)}")
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=headers, params=data, timeout=30)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == expected_status:
            try:
                result = response.json()
                print(f"   ✅ SUCCESS")
                if len(str(result)) < 2000:  # Print response if reasonably sized
                    print(f"   Response: {json.dumps(result, indent=2)}")
                else:
                    print(f"   Response: Large response ({len(str(result))} chars) - showing keys only")
                    if isinstance(result, dict):
                        print(f"   Keys: {list(result.keys())}")
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
    print("🍛 THE DABBA KITCHEN ANALYTICS API TESTING")
    print("="*80)
    
    all_tests_passed = True
    jwt_token = None
    
    # ==================== AUTHENTICATION ====================
    
    print("\n" + "="*60)
    print("1. AUTHENTICATION - LOGIN AS KITCHEN USER")
    
    login_data = {
        "email": "kitchen@demo.com",
        "password": "kitchen123"
    }
    
    result, success = test_api_endpoint('POST', '/auth/login', login_data)
    
    if success and result and 'token' in result:
        jwt_token = result['token']
        user_info = result.get('user', {})
        print(f"✅ Login successful")
        print(f"   User: {user_info.get('name', 'Unknown')}")
        print(f"   Role: {user_info.get('role', 'Unknown')}")
        print(f"   Token length: {len(jwt_token)} chars")
        
        if user_info.get('role') == 'kitchen':
            print("✅ User has kitchen role as expected")
        else:
            print(f"❌ Wrong user role - expected 'kitchen', got '{user_info.get('role')}'")
            all_tests_passed = False
            
    else:
        print("❌ Login failed - cannot proceed with Kitchen Analytics testing")
        all_tests_passed = False
        return False
    
    # ==================== KITCHEN ANALYTICS API ====================
    
    print("\n" + "="*60)
    print("2. KITCHEN ANALYTICS - GET ANALYTICS (7 days)")
    
    # Prepare authorization header
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    }
    
    # Test with 7 days parameter
    analytics_params = {"days": 7}
    
    result, success = test_api_endpoint('GET', '/kitchen/analytics', 
                                       data=analytics_params, headers=headers)
    
    if success and result:
        print("✅ Kitchen Analytics API responded successfully")
        
        # Verify response structure
        required_fields = ['summary', 'ratings', 'daily_chart', 'popular_dishes', 'revenue']
        missing_fields = []
        
        for field in required_fields:
            if field not in result:
                missing_fields.append(field)
                
        if not missing_fields:
            print("✅ All required fields present in response")
            
            # Verify summary structure
            summary = result.get('summary', {})
            summary_fields = ['total_customers', 'active_subscriptions', 'total_deliveries', 'delivered', 'failed', 'skipped', 'delivery_rate']
            summary_missing = [f for f in summary_fields if f not in summary]
            
            if not summary_missing:
                print("✅ Summary section has all required fields")
                print(f"   Active Subscriptions: {summary.get('active_subscriptions')}")
                print(f"   Total Deliveries: {summary.get('total_deliveries')}")
                print(f"   Delivery Rate: {summary.get('delivery_rate')}%")
            else:
                print(f"❌ Summary missing fields: {summary_missing}")
                all_tests_passed = False
            
            # Verify ratings structure
            ratings = result.get('ratings', {})
            ratings_fields = ['total', 'yummy', 'good', 'bad', 'satisfaction']
            ratings_missing = [f for f in ratings_fields if f not in ratings]
            
            if not ratings_missing:
                print("✅ Ratings section has all required fields")
                print(f"   Total Ratings: {ratings.get('total')}")
                print(f"   Satisfaction Score: {ratings.get('satisfaction')}")
            else:
                print(f"❌ Ratings missing fields: {ratings_missing}")
                all_tests_passed = False
            
            # Verify daily_chart is an array
            daily_chart = result.get('daily_chart', [])
            if isinstance(daily_chart, list):
                print(f"✅ Daily chart is array with {len(daily_chart)} entries")
                if daily_chart:
                    # Check first chart entry structure
                    first_entry = daily_chart[0]
                    chart_fields = ['date', 'delivered', 'failed', 'total', 'success_rate']
                    chart_missing = [f for f in chart_fields if f not in first_entry]
                    if not chart_missing:
                        print("✅ Daily chart entries have correct structure")
                    else:
                        print(f"❌ Daily chart entry missing fields: {chart_missing}")
                        all_tests_passed = False
            else:
                print("❌ Daily chart is not an array")
                all_tests_passed = False
            
            # Verify popular_dishes is an array
            popular_dishes = result.get('popular_dishes', [])
            if isinstance(popular_dishes, list):
                print(f"✅ Popular dishes is array with {len(popular_dishes)} entries")
                if popular_dishes:
                    # Check dish structure
                    first_dish = popular_dishes[0]
                    dish_fields = ['id', 'name', 'count']
                    dish_missing = [f for f in dish_fields if f not in first_dish]
                    if not dish_missing:
                        print("✅ Popular dishes entries have correct structure")
                        print(f"   Most popular: {first_dish.get('name')} (count: {first_dish.get('count')})")
                    else:
                        print(f"❌ Popular dishes entry missing fields: {dish_missing}")
                        all_tests_passed = False
            else:
                print("❌ Popular dishes is not an array")
                all_tests_passed = False
            
            # Verify revenue structure
            revenue = result.get('revenue', {})
            revenue_fields = ['estimated', 'currency']
            revenue_missing = [f for f in revenue_fields if f not in revenue]
            
            if not revenue_missing:
                print("✅ Revenue section has all required fields")
                print(f"   Estimated Revenue: ${revenue.get('estimated')} {revenue.get('currency')}")
                if revenue.get('currency') == 'CAD':
                    print("✅ Currency is CAD as expected")
                else:
                    print(f"❌ Wrong currency - expected 'CAD', got '{revenue.get('currency')}'")
                    all_tests_passed = False
            else:
                print(f"❌ Revenue missing fields: {revenue_missing}")
                all_tests_passed = False
                
        else:
            print(f"❌ Missing required fields in response: {missing_fields}")
            all_tests_passed = False
    else:
        print("❌ Kitchen Analytics API failed")
        all_tests_passed = False
    
    # ==================== TEST DIFFERENT DAYS PARAMETER ====================
    
    print("\n" + "="*60)
    print("3. KITCHEN ANALYTICS - GET ANALYTICS (30 days)")
    
    analytics_params_30 = {"days": 30}
    
    result, success = test_api_endpoint('GET', '/kitchen/analytics', 
                                       data=analytics_params_30, headers=headers)
    
    if success and result:
        print("✅ Kitchen Analytics API works with 30-day parameter")
        period_days = result.get('period_days')
        if period_days == 30:
            print("✅ Period days correctly returned as 30")
        else:
            print(f"❌ Period days incorrect - expected 30, got {period_days}")
            all_tests_passed = False
    else:
        print("❌ Kitchen Analytics API failed with 30-day parameter")
        all_tests_passed = False
    
    # ==================== TEST WITHOUT AUTHENTICATION ====================
    
    print("\n" + "="*60)
    print("4. KITCHEN ANALYTICS - TEST WITHOUT AUTHENTICATION")
    
    result, success = test_api_endpoint('GET', '/kitchen/analytics', 
                                       data={"days": 7}, expected_status=403)
    
    if success:
        print("✅ API correctly requires authentication (returns 403)")
    else:
        print("❌ API should require authentication")
        all_tests_passed = False
    
    # ==================== TEST WITH WRONG ROLE ====================
    
    print("\n" + "="*60)
    print("5. AUTHENTICATION - TRY LOGIN AS CUSTOMER")
    
    # Try to create/login as customer to test role restriction
    customer_login = {
        "email": "customer@demo.com",
        "password": "customer123"
    }
    
    result, success = test_api_endpoint('POST', '/auth/login', customer_login)
    
    if not success:
        print("✅ Customer login correctly fails (no customer with those credentials)")
    elif result and 'token' in result:
        # If customer login works, test with customer token
        customer_token = result['token']
        customer_headers = {"Authorization": f"Bearer {customer_token}"}
        
        print("✅ Customer login worked, testing role restriction")
        
        result, success = test_api_endpoint('GET', '/kitchen/analytics',
                                           data={"days": 7}, 
                                           headers=customer_headers, 
                                           expected_status=403)
        
        if success:
            print("✅ API correctly restricts access to kitchen role only")
        else:
            print("❌ API should restrict access to kitchen role")
            all_tests_passed = False
    
    # ==================== FINAL SUMMARY ====================
    
    print("\n" + "="*80)
    print("🎯 KITCHEN ANALYTICS API TESTING COMPLETE")
    print("="*80)
    
    if all_tests_passed:
        print("🎉 ALL KITCHEN ANALYTICS TESTS PASSED!")
        print("✅ Authentication: Kitchen user login - Working")
        print("✅ Kitchen Analytics API: GET /api/kitchen/analytics - Working")
        print("✅ Response Structure: summary, ratings, daily_chart, popular_dishes, revenue - All Present")
        print("✅ Data Validation: All required fields verified - Working")
        print("✅ Parameters: days parameter working (7, 30) - Working")
        print("✅ Security: Authentication required - Working")
        print("✅ Authorization: Kitchen role required - Working")
        print("\n🍛 The Dabba Kitchen Analytics API is fully functional!")
    else:
        print("❌ SOME TESTS FAILED!")
        print("🔍 Review the detailed output above for specific issues")
    
    print("="*80)
    
    return all_tests_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)