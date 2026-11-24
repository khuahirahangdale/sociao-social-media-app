from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from auth_routes import get_current_user
from models import User


router = APIRouter(prefix="/media", tags=["media"])
MEDIA_DIRECTORY = Path(__file__).resolve().parent / "uploads"
MAX_UPLOAD_SIZE = 50 * 1024 * 1024

ALLOWED_MEDIA_TYPES = {
    "image/jpeg": ("jpg", "image"),
    "image/png": ("png", "image"),
    "image/gif": ("gif", "image"),
    "image/webp": ("webp", "image"),
    "video/mp4": ("mp4", "video"),
    "video/webm": ("webm", "video"),
    "video/quicktime": ("mov", "video"),
}


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    media_type = ALLOWED_MEDIA_TYPES.get(file.content_type or "")
    if media_type is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Choose a JPEG, PNG, GIF, or WebP image, or an MP4, WebM, or MOV video.",
        )

    extension, kind = media_type
    filename = f"{uuid4().hex}.{extension}"
    MEDIA_DIRECTORY.mkdir(parents=True, exist_ok=True)
    destination = MEDIA_DIRECTORY / filename
    size = 0

    try:
        with destination.open("wb") as saved_file:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Files must be 50 MB or smaller.",
                    )
                saved_file.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await file.close()

    return {
        "url": f"/uploads/{filename}",
        "media_type": kind,
        "original_filename": file.filename or filename,
    }
