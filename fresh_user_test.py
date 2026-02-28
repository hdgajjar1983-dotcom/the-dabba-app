#!/usr/bin/env python3
"""
Test complete subscription flow with a new user
"""

import asyncio
import aiohttp
from datetime import datetime

BASE_URL = "https://dabba-driver-portal.preview.emergentagent.com/api"

async def test_fresh_user_subscription_flow():
    async with aiohttp.ClientSession() as session:
        print("🆕 Testing complete subscription flow with fresh user...")
        
        # 1. Register new user
        timestamp = int(datetime.now().timestamp())
        new_user = {
            "name": f"Fresh User {timestamp}",
            "email": f"fresh.{timestamp}@dabba.com",
            "password": "fresh123",
            "phone": "9876543999",
            "address": "Fresh Address, Mumbai",
            "role": "customer"
        }
        
        async with session.post(f"{BASE_URL}/auth/register", json=new_user) as response:
            if response.status == 200:
                register_data = await response.json()
                token = register_data["token"]
                print(f"✅ Registered fresh user: {register_data['user']['name']}")
                
                # 2. Try to get subscription (should be 404)
                headers = {"Authorization": f"Bearer {token}"}
                async with session.get(f"{BASE_URL}/subscription", headers=headers) as sub_response:
                    if sub_response.status == 404:
                        print("✅ No subscription found for new user (expected)")
                    else:
                        print(f"❌ Unexpected status for new user subscription: {sub_response.status}")
                
                # 3. Create new subscription
                subscription_data = {
                    "plan": "premium",
                    "delivery_address": "Fresh Delivery Address, Mumbai 400001"
                }
                
                async with session.post(f"{BASE_URL}/subscription", json=subscription_data, headers=headers) as create_response:
                    if create_response.status == 200:
                        create_data = await create_response.json()
                        print(f"✅ Created subscription: {create_data['plan']} plan")
                        
                        # 4. Get subscription again (should work now)
                        async with session.get(f"{BASE_URL}/subscription", headers=headers) as get_response:
                            if get_response.status == 200:
                                get_data = await get_response.json()
                                print(f"✅ Retrieved subscription: {get_data['plan']} plan, status: {get_data['status']}")
                                
                                # 5. Skip a meal
                                today = datetime.now().strftime("%Y-%m-%d")
                                skip_data = {"date": today, "meal_type": "dinner"}
                                
                                async with session.post(f"{BASE_URL}/subscription/skip", json=skip_data, headers=headers) as skip_response:
                                    if skip_response.status == 200:
                                        skip_result = await skip_response.json()
                                        print(f"✅ Skipped meal: {skip_result.get('credit', 0)} credit added")
                                        
                                        # 6. Check wallet
                                        async with session.get(f"{BASE_URL}/wallet", headers=headers) as wallet_response:
                                            if wallet_response.status == 200:
                                                wallet_data = await wallet_response.json()
                                                print(f"✅ Wallet balance: ₹{wallet_data['balance']} with {len(wallet_data['transactions'])} transactions")
                                            else:
                                                print(f"❌ Wallet check failed: {wallet_response.status}")
                                    else:
                                        print(f"❌ Skip meal failed: {skip_response.status}")
                            else:
                                print(f"❌ Get subscription after create failed: {get_response.status}")
                    else:
                        print(f"❌ Create subscription failed: {create_response.status}")
                        create_error = await create_response.json()
                        print(f"    Error: {create_error}")
            else:
                print(f"❌ User registration failed: {response.status}")

if __name__ == "__main__":
    asyncio.run(test_fresh_user_subscription_flow())