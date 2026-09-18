"""Symmetric encryption helpers for integration credentials at rest.

Uses Fernet (AES-128-CBC + HMAC) keyed by settings.FIELD_ENCRYPTION_KEY.
Never log or return decrypted values in API responses.
"""
from cryptography.fernet import Fernet
from django.conf import settings


def _fernet() -> Fernet:
    return Fernet(settings.FIELD_ENCRYPTION_KEY.encode() if isinstance(settings.FIELD_ENCRYPTION_KEY, str) else settings.FIELD_ENCRYPTION_KEY)


def encrypt(plaintext: str) -> str:
    if not plaintext:
        return ""
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    if not ciphertext:
        return ""
    return _fernet().decrypt(ciphertext.encode()).decode()
