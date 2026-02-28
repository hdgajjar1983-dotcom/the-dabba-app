#!/usr/bin/env python3
"""
Debug subscription endpoint issue
"""

import asyncio
import aiohttp
import json

BASE_URL = "https://dabba-driver-portal.preview.emergentagent.com/api"

async def debug_subscription():
    async with aiohttp.ClientSession() as session:
        # First login to get token
        login_data = {"email": "test2@dabba.com", "password": "test123"}
        async with session.post(f"{BASE_URL}/auth/login", json=login_data) as response:
            if response.status == 200:
                login_response = await response.json()
                token = login_response["token"]
                print(f"✅ Login successful, got token")
                
                # Try to get subscription
                headers = {"Authorization": f"Bearer {token}"}
                async with session.get(f"{BASE_URL}/subscription", headers=headers) as sub_response:
                    print(f"📋 Subscription response status: {sub_response.status}")
                    print(f"📋 Response headers: {dict(sub_response.headers)}")
                    
                    # Try to get content as text first
                    try:
                        text_content = await sub_response.text()
                        print(f"📋 Response text: {text_content[:500]}...")
                    except Exception as e:
                        print(f"❌ Error reading text: {e}")
                        
            else:
                print(f"❌ Login failed: {response.status}")

if __name__ == "__main__":
    asyncio.run(debug_subscription())