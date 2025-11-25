
import os
import json
import base64
import secrets


def generate_keys():
    print("="*60)
    print("FLOODSENSE PRODUCTION KEY GENERATOR")
    print("="*60)

    # 1. Generate GEE Base64 Key
    print("\n[1] Generating GEE_SERVICE_ACCOUNT_KEY_BASE64...")

    key_path = os.path.join("ee-fastapi", "gee-service-account-key.json")
    if not os.path.exists(key_path):
        # Try alternate location
        key_path = "gee-service-account-key.json"

    if os.path.exists(key_path):
        try:
            with open(key_path, 'r') as f:
                key_content = f.read().strip()
                # Verify it's valid JSON
                json.loads(key_content)

                # Encode to base64
                key_b64 = base64.b64encode(
                    key_content.encode('utf-8')).decode('utf-8')

                print(f"✅ Successfully encoded key from {key_path}")
                print(f"Length: {len(key_b64)} characters")
                print("\nCOPY THE VALUE BELOW FOR 'GEE_SERVICE_ACCOUNT_KEY_BASE64':")
                print("-" * 20)
                print(key_b64)
                print("-" * 20)
        except Exception as e:
            print(f"❌ Error processing GEE key: {e}")
    else:
        print(f"❌ Could not find {key_path}. Please ensure the file exists.")

    # 2. Generate VAPID Keys
    print("\n[2] Generating VAPID Keys (for Push Notifications)...")
    # We can't easily generate valid VAPID keys without pywebpush, but we can generate random secrets
    # for the sake of the example, or tell the user to use the ones in app-spec if they work.
    # Actually, let's try to import pywebpush if available, otherwise skip.
    try:
        # Generate URL-safe base64 strings which look like VAPID keys
        # Real VAPID keys need elliptic curve generation, which is complex without libraries.
        # We will just advise the user to use the existing ones if they don't have new ones.
        print("ℹ️  To generate new VAPID keys, run: npx web-push generate-vapid-keys")
        print("   Or use the online generator: https://web-push-codelab.glitch.me/")
    except ImportError:
        pass


if __name__ == "__main__":
    generate_keys()
