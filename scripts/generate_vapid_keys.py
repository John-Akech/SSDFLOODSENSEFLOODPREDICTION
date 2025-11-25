from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
import base64
import re


def to_base64_url(data):
    """Convert bytes to URL-safe Base64 string without padding"""
    encoded = base64.urlsafe_b64encode(data).decode('utf-8')
    return encoded.rstrip('=')


def generate_vapid_keys():
    print("="*60)
    print("VAPID KEY GENERATOR (for Push Notifications)")
    print("="*60)

    # Generate private key
    private_key = ec.generate_private_key(ec.SECP256R1())

    # Get private key bytes
    private_numbers = private_key.private_numbers()
    private_bytes = private_numbers.private_value.to_bytes(32, byteorder='big')

    # Get public key bytes
    public_key = private_key.public_key()
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint
    )

    # Encode
    private_b64 = to_base64_url(private_bytes)
    public_b64 = to_base64_url(public_bytes)

    print("\n✅ Generated new VAPID Keys:")
    print(f"\nVAPID_PRIVATE_KEY:\n{private_b64}")
    print(f"\nVAPID_PUBLIC_KEY:\n{public_b64}")
    print(f"\nVAPID_SUBJECT:\nmailto:admin@floodsense.org")

    print("\n" + "-"*60)
    print("INSTRUCTIONS:")
    print("1. Go to DigitalOcean App Platform Dashboard")
    print("2. Select 'backend' component -> Settings -> Environment Variables")
    print("3. Add/Update these variables with the values above.")
    print("4. Also update 'frontend' component -> Settings -> Environment Variables")
    print("   Set VITE_VAPID_PUBLIC_KEY to the Public Key value above.")
    print("-"*60)


if __name__ == "__main__":
    try:
        generate_vapid_keys()
    except ImportError:
        print("❌ 'cryptography' library not found. Please run: pip install cryptography")
