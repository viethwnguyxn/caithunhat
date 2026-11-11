import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./community.db")
JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "fallback_dev_secret_key_not_for_prod")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
TURN_SERVER_URLS: tuple[str, ...] = tuple(
    url.strip()
    for url in os.getenv("TURN_SERVER_URLS", "").split(",")
    if url.strip()
)
TURN_SHARED_SECRET: str = os.getenv("TURN_SHARED_SECRET", "")
TURN_CREDENTIAL_TTL_SECONDS: int = max(
    300, min(int(os.getenv("TURN_CREDENTIAL_TTL_SECONDS", "3600")), 86400)
)
STRINGEE_API_KEY_SID: str = os.getenv("STRINGEE_API_KEY_SID", "")
STRINGEE_API_KEY_SECRET: str = os.getenv("STRINGEE_API_KEY_SECRET", "")
STRINGEE_SIGNING_SECRET: str = os.getenv("STRINGEE_SIGNING_SECRET", "")
STRINGEE_ACCESS_TOKEN_TTL_SECONDS: int = max(
    300, min(int(os.getenv("STRINGEE_ACCESS_TOKEN_TTL_SECONDS", "3600")), 86400)
)
