import ee
import json
import os

try:
    service_account_file = 'gee-service-account.json'
    if os.path.exists(service_account_file):
        with open(service_account_file, 'r') as f:
            key_data = json.load(f)
        service_account = key_data['client_email']
        project_id = key_data.get('project_id')
        credentials = ee.ServiceAccountCredentials(service_account, service_account_file)
        ee.Initialize(credentials, project=project_id)
        print(f"✓ GEE initialized with service account (project: {project_id})")
    else:
        ee.Initialize()
        print("✓ GEE initialized with personal auth")
    
    print(f"✓ Can access Earth Engine: {ee.Number(1).getInfo()}")
except Exception as e:
    print(f"✗ GEE initialization failed: {e}")
