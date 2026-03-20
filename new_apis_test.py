#!/usr/bin/env python3
"""
Backend API Testing for The Dabba - New APIs Testing
Tests the three specific new APIs:
1. GET /api/customer/order-history
2. GET /api/kitchen/feedback-dashboard  
3. GET /api/wallet/details
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from review request
BACKEND_URL = "https://multi-portal-sync.preview.emergentagent.com/api"

def test_api_endpoint(method, endpoint, data=None, headers=None, expected_status=200):
    """Generic function to test API endpoints"""
    url = f"{BACKEND_URL}{endpoint}"
    print(f"\n🧪 Testing {method.upper()} {endpoint}")
    print(f"   URL: {url}")
    
    if headers:
        print(f"   Headers: {headers}")
    if data:
        print(f"   Data: {json.dumps(data, indent=2)}")
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=headers, timeout=30)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == expected_status:
            try:
                result = response.json()
                print(f"   ✅ SUCCESS")
                if len(str(result)) < 1000:  # Only print if response is small
                    print(f"   Response: {json.dumps(result, indent=2)}")
                else:
                    print(f"   Response: Large response ({len(str(result))} chars)")
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
            return response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text, False
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ CONNECTION ERROR: {e}")
        return None, False

def login_user(email, password, expected_role):
    """Login user and return JWT token"""
    print(f"\n🔐 Logging in as {expected_role}: {email}")
    
    login_data = {
        "email": email,
        "password": password
    }
    
    result, success = test_api_endpoint('POST', '/auth/login', login_data)
    
    if success and result and 'token' in result:
        token = result['token']
        user = result.get('user', {})
        actual_role = user.get('role', 'unknown')
        
        if actual_role == expected_role:
            print(f"   ✅ Login successful as {expected_role}")
            print(f"   User: {user.get('name', 'Unknown')} ({user.get('email', 'Unknown')})")
            return token
        else:
            print(f"   ❌ Role mismatch - Expected: {expected_role}, Got: {actual_role}")
            return None
    else:
        print(f"   ❌ Login failed")
        return None

def test_authenticated_endpoint(method, endpoint, token, expected_fields=None):
    """Test an authenticated endpoint and verify expected fields"""
    headers = {"Authorization": f"Bearer {token}"}
    result, success = test_api_endpoint(method, endpoint, headers=headers)
    
    if success and result and expected_fields:
        missing_fields = []
        for field in expected_fields:
            if field not in result:
                missing_fields.append(field)
        
        if missing_fields:
            print(f"   ⚠️  Missing expected fields: {missing_fields}")
            return result, False
        else:
            print(f"   ✅ All expected fields present: {expected_fields}")
            return result, True
    
    return result, success

def main():
    print("="*80)
    print("🍛 THE DABBA API - NEW APIS TESTING")
    print("="*80)
    print("Testing 3 specific new backend APIs:")
    print("1. GET /api/customer/order-history")  
    print("2. GET /api/kitchen/feedback-dashboard")
    print("3. GET /api/wallet/details")
    print("="*80)
    
    all_tests_passed = True
    customer_token = None
    kitchen_token = None
    
    # Test 1: Customer Login
    print("\n" + "="*60)
    print("1. CUSTOMER LOGIN")
    customer_token = login_user("customer@demo.com", "customer123", "customer")
    if not customer_token:
        print("❌ CRITICAL: Cannot login as customer")
        all_tests_passed = False
    
    # Test 2: Kitchen Login  
    print("\n" + "="*60)
    print("2. KITCHEN LOGIN")
    kitchen_token = login_user("kitchen@demo.com", "kitchen123", "kitchen")
    if not kitchen_token:
        print("❌ CRITICAL: Cannot login as kitchen")
        all_tests_passed = False
    
    # Test 3: Customer Order History API
    print("\n" + "="*60)
    print("3. CUSTOMER ORDER HISTORY API")
    if customer_token:
        expected_fields = ["orders", "total_orders", "total_delivered", "total_skipped"]
        result, success = test_authenticated_endpoint(
            'GET', '/customer/order-history', customer_token, expected_fields
        )
        
        if success and result:
            orders = result.get("orders", [])
            total_orders = result.get("total_orders", 0)
            total_delivered = result.get("total_delivered", 0)
            total_skipped = result.get("total_skipped", 0)
            
            print(f"   📊 Stats: {total_orders} total, {total_delivered} delivered, {total_skipped} skipped")
            print(f"   📋 Orders in response: {len(orders)}")
            
            # Validate order structure if any orders exist
            if orders:
                first_order = orders[0]
                order_fields = ["id", "date", "status", "items"]
                missing_order_fields = [f for f in order_fields if f not in first_order]
                
                if not missing_order_fields:
                    print(f"   ✅ Order structure valid")
                else:
                    print(f"   ⚠️  Order missing fields: {missing_order_fields}")
            else:
                print(f"   ℹ️  No orders found (new customer or no history)")
        else:
            all_tests_passed = False
    else:
        print("❌ Skipping - no customer token")
        all_tests_passed = False
    
    # Test 4: Kitchen Feedback Dashboard API
    print("\n" + "="*60)
    print("4. KITCHEN FEEDBACK DASHBOARD API")
    if kitchen_token:
        expected_fields = ["satisfaction_score", "rating_counts", "daily_trends", "recent_feedback", "recent_issues"]
        result, success = test_authenticated_endpoint(
            'GET', '/kitchen/feedback-dashboard', kitchen_token, expected_fields
        )
        
        if success and result:
            satisfaction_score = result.get("satisfaction_score", 0)
            rating_counts = result.get("rating_counts", {})
            daily_trends = result.get("daily_trends", [])
            recent_feedback = result.get("recent_feedback", [])
            recent_issues = result.get("recent_issues", [])
            
            print(f"   📊 Satisfaction Score: {satisfaction_score}")
            print(f"   👍 Rating Counts: {rating_counts}")
            print(f"   📈 Daily Trends: {len(daily_trends)} days")
            print(f"   💬 Recent Feedback: {len(recent_feedback)} items") 
            print(f"   ⚠️  Recent Issues: {len(recent_issues)} items")
            
            # Validate rating_counts structure
            expected_rating_types = ["yummy", "good", "bad"]
            if all(rt in rating_counts for rt in expected_rating_types):
                print(f"   ✅ Rating counts structure valid")
            else:
                print(f"   ⚠️  Rating counts missing types: {[rt for rt in expected_rating_types if rt not in rating_counts]}")
        else:
            all_tests_passed = False
    else:
        print("❌ Skipping - no kitchen token")
        all_tests_passed = False
    
    # Test 5: Wallet Details API  
    print("\n" + "="*60)
    print("5. WALLET DETAILS API")
    if customer_token:
        expected_fields = ["balance", "currency", "transactions"]
        result, success = test_authenticated_endpoint(
            'GET', '/wallet/details', customer_token, expected_fields
        )
        
        if success and result:
            balance = result.get("balance", 0)
            currency = result.get("currency", "")
            transactions = result.get("transactions", [])
            
            print(f"   💰 Balance: {balance} {currency}")
            print(f"   📋 Transactions: {len(transactions)} items")
            
            # Validate currency is CAD
            if currency == "CAD":
                print(f"   ✅ Currency is CAD")
            else:
                print(f"   ⚠️  Unexpected currency: {currency}")
            
            # Validate transaction structure if any exist
            if transactions:
                first_tx = transactions[0]
                tx_fields = ["id", "user_id", "amount", "type", "created_at"]
                missing_tx_fields = [f for f in tx_fields if f not in first_tx]
                
                if not missing_tx_fields:
                    print(f"   ✅ Transaction structure valid")
                else:
                    print(f"   ⚠️  Transaction missing fields: {missing_tx_fields}")
            else:
                print(f"   ℹ️  No transactions found")
        else:
            all_tests_passed = False
    else:
        print("❌ Skipping - no customer token")
        all_tests_passed = False
    
    # Final Summary
    print("\n" + "="*80)
    print("🎯 NEW APIS TESTING COMPLETE")
    print("="*80)
    
    if all_tests_passed:
        print("🎉 ALL NEW API TESTS PASSED!")
        print("✅ Customer Order History API - Working correctly")
        print("✅ Kitchen Feedback Dashboard API - Working correctly") 
        print("✅ Wallet Details API - Working correctly")
        print("\n🍛 All three new backend APIs are fully functional!")
    else:
        print("❌ SOME API TESTS FAILED!")
        print("🔍 Review the detailed output above for specific issues")
    
    print("="*80)
    
    return all_tests_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)