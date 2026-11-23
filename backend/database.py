from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker


DATABASE_FILE = Path(__file__).resolve().parent / "sociao.db"
DATABASE_URL = f"sqlite:///{DATABASE_FILE.as_posix()}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


def initialize_database() -> None:
    """Create new tables and safely add fields to existing SQLite databases."""
    Base.metadata.create_all(bind=engine)
    column_updates = {
        "users": {
            "bio": "TEXT NOT NULL DEFAULT ''",
            "profile_picture_url": "VARCHAR(2048)",
            "website": "VARCHAR(2048) NOT NULL DEFAULT ''",
            "theme": "VARCHAR(10) NOT NULL DEFAULT 'light'",
            "language": "VARCHAR(20) NOT NULL DEFAULT 'en'",
            "notifications_enabled": "BOOLEAN NOT NULL DEFAULT 1",
        },
        "posts": {
            "image_url": "VARCHAR(2048)",
            "video_url": "VARCHAR(2048)",
            "audio_url": "VARCHAR(2048)",
            "music_line": "VARCHAR(255) NOT NULL DEFAULT ''",
            "view_count": "INTEGER NOT NULL DEFAULT 0",
        },
        "stories": {
            "audio_url": "VARCHAR(2048)",
            "music_line": "VARCHAR(255) NOT NULL DEFAULT ''",
        },
    }

    with engine.begin() as connection:
        inspector = inspect(connection)
        for table_name, columns in column_updates.items():
            existing_columns = {
                column["name"] for column in inspector.get_columns(table_name)
            }
            for column_name, column_definition in columns.items():
                if column_name not in existing_columns:
                    connection.execute(
                        text(
                            f"ALTER TABLE {table_name} ADD COLUMN "
                            f"{column_name} {column_definition}"
                        )
                    )


def get_db():
    """Provide one database session for a request, then close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
