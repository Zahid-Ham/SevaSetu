"""
test_live_matching.py
Confirms Food Distribution Drive and tests Rajan's real-time matching.
"""
import sys, os, requests

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE = "http://localhost:8000"

# 1. Get all events and find Food Distribution Drive
resp = requests.get(f"{BASE}/predictions")
resp.raise_for_status()
events = resp.json().get("predictions", [])
print(f"Total events: {len(events)}")

# Find predicted Food Distribution Drive
food_event = next((e for e in events if "Food" in e.get("event_type","") and e["status"] == "predicted"), None)
if not food_event:
    print("⚠️  Food Distribution Drive not found in predicted state — may already be confirmed.")
    food_event = next((e for e in events if "Food" in e.get("event_type","")), None)

if food_event:
    print(f"\n📋 Found: {food_event['event_type']} [{food_event['status']}] id={food_event['id'][:10]}...")
    
    if food_event["status"] == "predicted":
        # Confirm it
        confirm_resp = requests.post(f"{BASE}/predictions/{food_event['id']}/confirm")
        print(f"✅ Confirmed: {confirm_resp.status_code} {confirm_resp.json().get('message','')}")
    
    # Test live matching for Rajan
    print(f"\n🔍 Testing live matching for Rajan (vol_logistics_1)...")
    match_resp = requests.get(f"{BASE}/events/live/matching/vol_logistics_1")
    match_resp.raise_for_status()
    data = match_resp.json()
    matches = data.get("matches", [])
    print(f"   Found {len(matches)} matches")
    for m in matches:
        print(f"   ✅ {m['event_type']} — score={m['match_score']} matched_skills={m['matched_skills']}")
        print(f"      AI: {m['ai_reasoning'][:80]}...")
else:
    print("❌ No food distribution event found!")
