from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
from cryptography.hazmat.backends import default_backend
import base64
import os

class EncryptionService:
    """AES-256 encryption service for sensitive data"""
    
    def __init__(self, secret_key: str = None):
        if secret_key is None:
            secret_key = os.getenv("ENCRYPTION_KEY", "default-key-change-in-production")
        
        # Derive AES-256 key from secret
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'floodsense-salt',
            iterations=100000,
            backend=default_backend()
        )
        key = base64.urlsafe_b64encode(kdf.derive(secret_key.encode()))
        self.cipher = Fernet(key)
    
    def encrypt(self, data: str) -> str:
        """Encrypt string data"""
        return self.cipher.encrypt(data.encode()).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt string data"""
        return self.cipher.decrypt(encrypted_data.encode()).decode()

# Global instance
encryption_service = EncryptionService()
