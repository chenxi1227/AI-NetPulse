import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(BASE_DIR))), "project.db")
JWT_SECRET = os.getenv("JWT_SECRET", "fallback-secret-key")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_EXPIRY_MINUTES = int(os.getenv("JWT_ACCESS_EXPIRY_MINUTES", "30"))
JWT_REFRESH_EXPIRY_DAYS = int(os.getenv("JWT_REFRESH_EXPIRY_DAYS", "7"))
API_KEY = os.getenv("API_KEY", "fallback-api-key")
