from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost:5432/pgms_biometric"
    REDIS_URL: str = "redis://localhost:6379/0"
    S3_BUCKET: str = "pg-attendance-photos"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    COMM_KEY: str = "0"
    SECRET_KEY: str = "secret-key-here"

    class Config:
        env_file = ".env"

settings = Settings()
