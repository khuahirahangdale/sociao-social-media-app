
from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import auth_routes
import media_routes
import message_routes
import models
import post_routes
import social_routes
from database import initialize_database
from media_routes import MEDIA_DIRECTORY


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="Sociao API", lifespan=lifespan)
additional_cors_origins = [
    origin.strip()
    for origin in os.getenv("SOCIAO_CORS_ORIGINS", "").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        *additional_cors_origins,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_routes.router)
app.include_router(media_routes.router)
app.include_router(post_routes.router)
app.include_router(social_routes.router)
app.include_router(message_routes.router)
MEDIA_DIRECTORY.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=MEDIA_DIRECTORY), name="uploads")


@app.get("/")
def home():
    return {
        "message": "Welcome to Sociao Backend!",
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }
