import sys
import os
sys.path.append('C:/Users/ZAHID/Downloads/SevaSetuversion1/SevaSetuversion1/SevaSetu/backend')
from app.config.firebase_config import db

user_doc = db.collection("users").document("vol_rahul_01").get()
if user_doc.exists:
    user_data = user_doc.to_dict()
    print(f"EXACT NAME: '{user_data.get('name')}'")
else:
    print("User not found")
