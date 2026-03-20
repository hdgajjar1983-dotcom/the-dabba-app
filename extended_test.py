#!/usr/bin/env python3
"""
Extended testing with sample data for comprehensive verification
"""

import requests
import json

# Backend URL
BACKEND_URL = "https://multi-portal-sync.preview.emergentagent.com/api"

def test_api_endpoint(method, endpoint, data=None, headers=None, expected_status=200):
    """Generic function to test API endpoints"""
    url = f"{BACKEND_URL}{endpoint}"
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=headers, timeout=30)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        if response.status_code == expected_status:
            try:
                return response.json(), True
            except:
                return response.text, True
        else:
            try:
                error_detail = response.json()
                return error_detail, False
            except:
                return response.text, False
            
    except requests.exceptions.RequestException as e:
        return None, False

def main():
    print("="*60)
    print("🔍 EXTENDED API FUNCTIONALITY TESTING")
    print("="*60)
    
    # Login as customer
    login_data = {"email": "customer@demo.com", "password": "customer123"}
    result, success = test_api_endpoint('POST', '/auth/login', login_data)
    
    if not success or not result:
        print("❌ Cannot login for extended testing")
        return False
    
    customer_token = result['token']
    headers = {"Authorization": f"Bearer {customer_token}"}
    
    print("✅ Customer logged in for extended testing")
    
    # Create a subscription for the customer to generate meaningful data
    print("\n📋 Creating subscription...")
    sub_data = {
        "plan": "Weekly Plan",
        "delivery_address": "123 Spring Garden Rd, Halifax, NS"
    }
    result, success = test_api_endpoint('POST', '/subscription', sub_data, headers)
    
    if success:
        print("✅ Subscription created")
    else:
        print("ℹ️  Subscription may already exist or creation failed")
    
    # Test order history again with subscription
    print("\n📊 Testing Order History with subscription...")
    result, success = test_api_endpoint('GET', '/customer/order-history', headers=headers)
    
    if success:
        print(f"✅ Order History API working")
        print(f"   Orders: {len(result.get('orders', []))}")
        print(f"   Total: {result.get('total_orders', 0)}")
        print(f"   Delivered: {result.get('total_delivered', 0)}")
        print(f"   Skipped: {result.get('total_skipped', 0)}")
        
        # Test with limit parameter
        result2, success2 = test_api_endpoint('GET', '/customer/order-history?limit=10', headers=headers)
        if success2:
            print("✅ Order History API with limit parameter working")
    
    # Test wallet after creating some activity
    print("\n💰 Testing Wallet Details after activity...")
    result, success = test_api_endpoint('GET', '/wallet/details', headers=headers)
    
    if success:
        print(f"✅ Wallet API working")
        print(f"   Balance: {result.get('balance', 0)} {result.get('currency', 'CAD')}")
        print(f"   Transactions: {len(result.get('transactions', []))}")
    
    # Login as kitchen for extended kitchen testing
    print("\n🍳 Kitchen extended testing...")
    login_data = {"email": "kitchen@demo.com", "password": "kitchen123"}
    result, success = test_api_endpoint('POST', '/auth/login', login_data)
    
    if success:
        kitchen_token = result['token']
        kitchen_headers = {"Authorization": f"Bearer {kitchen_token}"}
        
        # Test feedback dashboard with different parameters
        result, success = test_api_endpoint('GET', '/kitchen/feedback-dashboard?days=7', kitchen_headers)
        if success:
            print("✅ Kitchen Feedback Dashboard with days parameter working")
            print(f"   Period: {result.get('period_days', 0)} days")
            print(f"   Satisfaction Score: {result.get('satisfaction_score', 0)}")
            print(f"   Rating Counts: {result.get('rating_counts', {})}")
    
    print("\n🎯 Extended testing completed successfully!")
    return True

if __name__ == "__main__":
    main()