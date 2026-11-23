from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

import models
from database import SessionLocal, initialize_database
from models import Follow, Post, Story, User
from security import hash_password


SAMPLE_PASSWORD = "sociao-demo-password"

SAMPLE_USERS = [
    {
        "username": "khushi",
        "email": "khushi@sociao.example",
        "display_name": "Khushi Ahuja",
        "profile_picture_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
        "username": "rahul",
        "email": "rahul@sociao.example",
        "display_name": "Rahul Mehta",
        "profile_picture_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
        "username": "priya",
        "email": "priya@sociao.example",
        "display_name": "Priya Sharma",
        "profile_picture_url": "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
        "username": "arjun",
        "email": "arjun@sociao.example",
        "display_name": "Arjun Patel",
        "profile_picture_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
        "username": "maya",
        "email": "maya@sociao.example",
        "display_name": "Maya Chen",
        "profile_picture_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
        "username": "noah",
        "email": "noah@sociao.example",
        "display_name": "Noah Williams",
        "profile_picture_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
        "username": "aisha",
        "email": "aisha@sociao.example",
        "display_name": "Aisha Khan",
        "profile_picture_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
        "username": "liam",
        "email": "liam@sociao.example",
        "display_name": "Liam Carter",
        "profile_picture_url": "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
        "username": "sofia",
        "email": "sofia@sociao.example",
        "display_name": "Sofia Garcia",
        "profile_picture_url": "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=256&h=256&q=80",
    },
    {
        "username": "ethan",
        "email": "ethan@sociao.example",
        "display_name": "Ethan Brooks",
        "profile_picture_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80",
    },
]

SAMPLE_POSTS = [
    ("rahul", "Spent the morning learning something new and forgot to check my phone. 🌿", None, None, ""),
    ("priya", "A little reminder: one small step is still a step. ✨", None, None, ""),
    ("khushi", "Finally started that book everyone has been recommending. 📚", None, None, ""),
    ("arjun", "Found a new coffee spot with the coziest window seat. ☕", "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85", None, ""),
    ("maya", "Taking the long way home because the evening sky is lovely.", "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=85", None, ""),
    ("rahul", "What tiny thing made your day better today?", None, None, ""),
    ("priya", "Weekend plans: a fresh cup of chai and my favourite playlist.", None, None, ""),
    ("maya", "Made time for a slow morning and it was exactly what I needed.", None, "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", "Soft ambient piano"),
    ("arjun", "A good playlist can turn even errands into an adventure. 🎧", None, None, ""),
    ("khushi", "Trying to notice more of the small, good things around me.", None, None, ""),
    ("noah", "Golden hour walks are my favourite kind of reset.", "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85", None, ""),
    ("aisha", "Made a new recipe today, and it actually worked on the first try!", None, None, ""),
    ("liam", "A quiet corner, a good book, and nowhere else to be.", None, None, ""),
    ("sofia", "Little moments from a lovely weekend with friends. 🌼", None, "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", "Soft ambient piano"),
    ("ethan", "Trying to spend more time outside and less time scrolling.", None, None, ""),
    ("noah", "This view was worth getting up early for.", "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=85", None, ""),
    ("aisha", "Sending a little encouragement to everyone working toward something.", None, None, ""),
    ("liam", "New city, familiar coffee order. Feeling right at home.", None, None, ""),
    ("sofia", "A few seconds of sunshine for your feed. ☀️", None, "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", "Soft ambient piano"),
    ("ethan", "What is everyone listening to this week?", None, None, ""),
    ("rahul", "A peaceful pause between busy moments.", None, "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", "Gentle morning piano"),
    ("maya", "A little reminder to slow down and breathe.", None, "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", "Quiet garden melody"),
    ("liam", "Let the small moments be enough today.", None, "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", "Soft evening notes"),
]

SAMPLE_STORIES = [
    ("rahul", "Taking a little break and enjoying the fresh air.", None, None, None, "", False),
    ("priya", "A small reminder to be kind to yourself today.", None, None, None, "", False),
    ("arjun", "Good morning, Sociao! ☀️", None, None, None, "", True),
    ("maya", "Found a peaceful place to spend the afternoon.", "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=85", None, None, "", False),
    ("sofia", "A few seconds of garden sunshine.", None, "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", "/audio/soft-loop.wav", "Soft ambient piano", False),
]


def seed_data(db: Session) -> None:
    """Add the sample users and posts that are missing from the database."""
    usernames = [user["username"] for user in SAMPLE_USERS]
    users_by_username = {
        user.username: user
        for user in db.scalars(select(User).where(User.username.in_(usernames)))
    }

    for user_data in SAMPLE_USERS:
        user = users_by_username.get(user_data["username"])
        if user is None:
            user = User(
                **user_data,
                password_hash=hash_password(SAMPLE_PASSWORD),
            )
            db.add(user)
            users_by_username[user.username] = user
        elif not user.profile_picture_url:
            user.profile_picture_url = user_data["profile_picture_url"]

    db.flush()

    for username, content, image_url, video_url, music_line in SAMPLE_POSTS:
        author = users_by_username[username]
        existing_post = db.scalar(
            select(Post).where(
                Post.user_id == author.id,
                Post.content == content,
            )
        )
        if existing_post is None:
            db.add(
                Post(
                    user_id=author.id,
                    content=content,
                    image_url=image_url,
                    video_url=video_url,
                    audio_url="/audio/soft-loop.wav" if video_url else None,
                    music_line=music_line,
                )
            )
        else:
            if image_url and not existing_post.image_url:
                existing_post.image_url = image_url
            if video_url and not existing_post.video_url:
                existing_post.video_url = video_url
            if video_url:
                existing_post.audio_url = "/audio/soft-loop.wav"
            elif existing_post.audio_url:
                existing_post.audio_url = None
            if music_line and not existing_post.music_line:
                existing_post.music_line = music_line

    khushi_accounts = [
        user for user in db.scalars(select(User))
        if user.username.lower().startswith("khushi")
        or "khushi" in user.display_name.lower()
        or "ahuja" in user.display_name.lower()
    ]
    for khushi_account in khushi_accounts:
        if not khushi_account.profile_picture_url:
            khushi_account.profile_picture_url = SAMPLE_USERS[0]["profile_picture_url"]

    for khushi_account in khushi_accounts:
        for content in (
            "A quiet garden moment with a little soft piano. 🌿",
            "Taking a slow breath and enjoying the light. ☀️",
            "A peaceful pause for your day. ✨",
        ):
            existing_video = db.scalar(
                select(Post).where(
                    Post.user_id == khushi_account.id,
                    Post.content == content,
                )
            )
            if existing_video is None:
                db.add(
                    Post(
                        user_id=khushi_account.id,
                        content=content,
                        video_url="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
                        audio_url="/audio/soft-loop.wav",
                        music_line="Soft ambient piano",
                    )
                )

    for follower in users_by_username.values():
        for khushi_account in khushi_accounts:
            if follower.id == khushi_account.id:
                continue
            exists = db.scalar(
                select(Follow.id).where(
                    Follow.follower_id == follower.id,
                    Follow.followed_id == khushi_account.id,
                )
            )
            if exists is None:
                db.add(Follow(follower_id=follower.id, followed_id=khushi_account.id))

    khushi_account_ids = {user.id for user in khushi_accounts}
    for khushi_account in khushi_accounts:
        for username in ("rahul", "priya", "maya", "aisha"):
            followed = users_by_username[username]
            if followed.id in khushi_account_ids:
                continue
            exists = db.scalar(
                select(Follow.id).where(
                    Follow.follower_id == khushi_account.id,
                    Follow.followed_id == followed.id,
                )
            )
            if exists is None:
                db.add(Follow(follower_id=khushi_account.id, followed_id=followed.id))

    now = datetime.now(timezone.utc)
    for username, caption, image_url, video_url, audio_url, music_line, is_live in SAMPLE_STORIES:
        author = users_by_username[username]
        story = db.scalar(
            select(Story).where(
                Story.user_id == author.id,
                Story.caption == caption,
            )
        )
        if story is None:
            story = Story(user_id=author.id, caption=caption)
            db.add(story)
        story.image_url = image_url
        story.video_url = video_url
        story.audio_url = audio_url
        story.music_line = music_line
        story.is_live = is_live
        story.created_at = now
        story.expires_at = now + timedelta(hours=24)

    db.commit()


def main() -> None:
    initialize_database()
    with SessionLocal() as db:
        seed_data(db)
    print("Sample users and posts are ready.")


if __name__ == "__main__":
    main()
