Nov 24 07:43:56  [WARNING] VAPID keys not configured - push notifications disabled# DigitalOcean Deployment Setup

## Required Environment Variables/Secrets

### Backend Service
- `SECRET_KEY` - Your application secret key for JWT tokens
- `VAPID_PUBLIC_KEY` - Web push notification public key
- `VAPID_PRIVATE_KEY` - Web push notification private key

### SAR Detection Service
You need to add the Google Earth Engine service account credentials:

**Option 1: Using the DigitalOcean Console**
1. Go to your DigitalOcean App Platform dashboard
2. Navigate to Settings → App-Level Environment Variables
3. Add a new SECRET variable named `GEE_SERVICE_ACCOUNT_KEY`
4. Paste the entire content of `ee-fastapi/gee-service-account-key.json`

**Option 2: Using Base64 encoded (Alternative)**
1. Encode your service account key to base64:
   ```powershell
   $content = Get-Content "ee-fastapi/gee-service-account-key.json" -Raw
   $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
   $base64 = [Convert]::ToBase64String($bytes)
   $base64 | Set-Clipboard
   ```
2. In DigitalOcean App Platform, add `GEE_SERVICE_ACCOUNT_KEY_BASE64` as a SECRET
3. Paste the base64 string from clipboard

**Option 3: Using doctl CLI**
```bash
# Install doctl if not already installed
# https://docs.digitalocean.com/reference/doctl/how-to/install/

# Authenticate
doctl auth init

# Add the secret
doctl apps update YOUR_APP_ID --spec .do/app.yaml

# Or manually add environment variable
doctl apps create-deployment YOUR_APP_ID
```

## Database
The database connection string is automatically provided by DigitalOcean when you create a managed PostgreSQL database in your app.

## Deployment
Once secrets are configured, push to GitHub and DigitalOcean will automatically deploy:

```bash
git add .
git commit -m "FloodSense"
git push origin master
```

Monitor deployment at: https://cloud.digitalocean.com/apps
