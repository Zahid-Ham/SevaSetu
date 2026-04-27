import sys
import os
sys.path.append('C:/Users/ZAHID/Downloads/SevaSetuversion1/SevaSetuversion1/SevaSetu/backend')
from app.config.firebase_config import db

certs = list(db.collection('certificates').where('volunteer_id', '==', 'vol_rahul_01').stream())
if certs:
    c = certs[0].to_dict()
    print(f"Volunteer Name EN: {c.get('volunteer_name')}")
    print(f"Volunteer Name HI: {c.get('volunteer_name_hi')}")
    print(f"EN URL: {c.get('pdf_url_en')}")
    print(f"HI URL: {c.get('pdf_url_hi')}")
else:
    print("No certs found")
