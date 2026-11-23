import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class SignupRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str = Field(min_length=3, max_length=255)
    display_name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(r"[a-z0-9_]+", value):
            raise ValueError("Username may contain letters, numbers, and underscores.")
        return value

    @field_validator("email")
    @classmethod
    def normalize_and_validate_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("Enter a valid email address.")
        return value

    @field_validator("display_name")
    @classmethod
    def trim_display_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Display name cannot be empty.")
        return value


class LoginRequest(BaseModel):
    identifier: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    display_name: str
    bio: str = ""
    profile_picture_url: str | None = None
    website: str = ""
    theme: str = "light"
    language: str = "en"
    notifications_enabled: bool = True
    follower_count: int = 0
    following_count: int = 0


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime


class MessageResponse(BaseModel):
    message: str


class PostCreateRequest(BaseModel):
    content: str = Field(default="", max_length=5000)
    image_url: str | None = Field(default=None, max_length=2048)
    video_url: str | None = Field(default=None, max_length=2048)
    audio_url: str | None = Field(default=None, max_length=2048)
    music_line: str = Field(default="", max_length=255)

    @field_validator("content")
    @classmethod
    def trim_content(cls, value: str) -> str:
        return value.strip()

    @field_validator("image_url", "video_url", "audio_url")
    @classmethod
    def validate_media_url(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        value = value.strip()
        if not value.startswith(("https://", "http://")) and not (
            value.startswith("/audio/") and value.endswith(".wav")
        ):
            raise ValueError("Media URLs must be public URLs or a supported Sociao audio file.")
        return value

    @field_validator("music_line")
    @classmethod
    def trim_music_line(cls, value: str) -> str:
        return value.strip()

    def validate_post_has_content(self) -> "PostCreateRequest":
        if not self.content and not self.image_url and not self.video_url:
            raise ValueError("Add text, an image, or a video to your post.")
        if self.image_url and self.video_url:
            raise ValueError("A post can contain an image or a video, not both.")
        return self

    @model_validator(mode="after")
    def require_post_content(self) -> "PostCreateRequest":
        return self.validate_post_has_content()


class PostAuthorResponse(BaseModel):
    id: int
    username: str
    display_name: str
    profile_picture_url: str | None = None


class PostResponse(BaseModel):
    id: int
    user_id: int
    author: PostAuthorResponse
    content: str
    created_at: datetime
    like_count: int
    is_liked: bool
    image_url: str | None = None
    video_url: str | None = None
    audio_url: str | None = None
    music_line: str = ""
    view_count: int = 0
    comment_count: int = 0
    is_bookmarked: bool = False


class LikeStatusResponse(BaseModel):
    liked: bool
    like_count: int


class PostUpdateRequest(PostCreateRequest):
    pass


class ProfileUpdateRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)
    username: str = Field(min_length=3, max_length=50)
    bio: str = Field(default="", max_length=500)
    profile_picture_url: str | None = Field(default=None, max_length=2048)
    website: str = Field(default="", max_length=2048)

    @field_validator("username")
    @classmethod
    def normalize_profile_username(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(r"[a-z0-9_]+", value):
            raise ValueError("Username may contain letters, numbers, and underscores.")
        return value

    @field_validator("display_name", "bio", "website")
    @classmethod
    def trim_profile_fields(cls, value: str) -> str:
        return value.strip()


class SettingsUpdateRequest(BaseModel):
    theme: str | None = None
    language: str | None = Field(default=None, max_length=20)
    notifications_enabled: bool | None = None

    @field_validator("theme")
    @classmethod
    def validate_theme(cls, value: str | None) -> str | None:
        if value is not None and value not in {"light", "dark"}:
            raise ValueError("Theme must be light or dark.")
        return value


class FollowStatusResponse(BaseModel):
    following: bool


class StoryCreateRequest(BaseModel):
    caption: str = Field(default="", max_length=500)
    image_url: str | None = Field(default=None, max_length=2048)
    video_url: str | None = Field(default=None, max_length=2048)
    audio_url: str | None = Field(default=None, max_length=2048)
    music_line: str = Field(default="", max_length=255)
    is_live: bool = False

    @field_validator("image_url", "video_url", "audio_url")
    @classmethod
    def validate_story_media_url(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        value = value.strip()
        if not value.startswith(("https://", "http://")) and not (
            value.startswith("/audio/") and value.endswith(".wav")
        ):
            raise ValueError("Media URLs must be public URLs or a supported Sociao audio file.")
        return value

    @field_validator("music_line")
    @classmethod
    def trim_story_music_line(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def validate_story_content(self) -> "StoryCreateRequest":
        if not self.caption.strip() and not self.image_url and not self.video_url:
            raise ValueError("Add a caption, image URL, or video URL to your story.")
        if self.image_url and self.video_url:
            raise ValueError("A story can contain an image or a video, not both.")
        return self


class CommentCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    parent_id: int | None = None

    @field_validator("content")
    @classmethod
    def trim_comment(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("A comment cannot be empty.")
        return value


class MessageCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=4000)

    @field_validator("content")
    @classmethod
    def trim_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("A message cannot be empty.")
        return value
