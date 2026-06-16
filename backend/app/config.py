from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "mysql+pymysql://cruiseapp:cruisesecret@db:3306/cruisetravelnow"
    app_env: str = "development"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    seed_admin_username: str | None = None
    seed_admin_email: str | None = None
    seed_admin_password: str | None = None
    attachments_dir: str = "/app/uploads"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash-lite"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
