#!/usr/bin/env python3
"""
Additional Backend Test to verify prep stats with original seeded data
"""

import requests
import json

BACKEND_URL = "https://meal-skip-hub.preview.emergentagent.com/api"

def test_prep_stats_original():
    """Test prep stats with original seeded data (no modifications)"""
    print("🧪 Testing prep stats with original seeded data...")
    
    # Re-seed to get original state
    response = requests.post(f"{BACKEND_URL}/seed", timeout=30)
    if response.status_code != 200:
        print("❌ Failed to seed database")
        return False
    print("✅ Database re-seeded successfully")
    
    # Get subscribers to verify initial state
    response = requests.get(f"{BACKEND_URL}/subscribers", timeout=30)
    if response.status_code != 200:
        print("❌ Failed to get subscribers")
        return False
    
    subscribers = response.json()
    print(f"📋 Subscribers (initial state):")
    for sub in subscribers:
        print(f"   {sub['name']}: status={sub['status']}, skip={sub['skip']}")
    
    # Get prep stats
    response = requests.get(f"{BACKEND_URL}/prep-stats", timeout=30)
    if response.status_code != 200:
        print("❌ Failed to get prep stats")
        return False
    
    stats = response.json()
    print(f"📊 Prep Stats: {stats}")
    
    # Expected with original seeded data:
    # Amit S.: Active, skip=false
    # Priya K.: Active, skip=true  
    # Rahul M.: Active, skip=false
    # Sana V.: Expired, skip=false
    # Expected: 3 Active, 1 Skipping (Priya), 2 Prep (Amit+Rahul), 1 Expired (Sana)
    
    expected = {
        'total_active': 3,
        'total_skipping': 1, 
        'total_prep': 2,
        'total_expired': 1
    }
    
    if stats == expected:
        print("✅ Prep stats match expected values for original seeded data")
        return True
    else:
        print(f"❌ Prep stats mismatch - Expected: {expected}, Got: {stats}")
        return False

if __name__ == "__main__":
    test_prep_stats_original()