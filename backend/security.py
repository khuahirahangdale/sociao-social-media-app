from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher


password_hasher = PasswordHash((Argon2Hasher(),))


def hash_password(password: str) -> str:
    """Return an Argon2 hash for a plain-text password."""
    return password_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check a password against its Argon2 hash."""
    return password_hasher.verify(plain_password, hashed_password)
