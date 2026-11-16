from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings

# Create the engine (the connection pool to Postgres)
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,   # test connections before use (Neon drops idle ones)
    echo=settings.DEBUG,  # print SQL when DEBUG=true
)

# Session factory — each request gets its own session
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


# Base class for all ORM models (tables will inherit this)
class Base(DeclarativeBase):
    pass


# Dependency for FastAPI routes: yields a session, closes when done
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()