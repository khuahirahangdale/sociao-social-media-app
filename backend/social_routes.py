from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from auth_routes import get_current_user
from database import get_db
from models import (
    Bookmark,
    Comment,
    CommentLike,
    Follow,
    Like,
    Post,
    Story,
    StoryLike,
    StoryView,
    User,
)
from schemas import (
    CommentCreateRequest,
    FollowStatusResponse,
    StoryCreateRequest,
)


router = APIRouter(tags=["social features"])


def user_summary(db: Session, user: User, current_user_id: int) -> dict:
    follower_count = db.scalar(
        select(func.count()).select_from(Follow).where(Follow.followed_id == user.id)
    ) or 0
    following_count = db.scalar(
        select(func.count()).select_from(Follow).where(Follow.follower_id == user.id)
    ) or 0
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "profile_picture_url": user.profile_picture_url,
        "bio": user.bio,
        "website": user.website,
        "follower_count": follower_count,
        "following_count": following_count,
        "is_following": db.scalar(
            select(Follow.id).where(
                Follow.follower_id == current_user_id,
                Follow.followed_id == user.id,
            )
        ) is not None,
    }


@router.get("/users")
def list_users(
    search: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(User).where(User.id != current_user.id)
    if search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.where(
            func.lower(User.username).like(term)
            | func.lower(User.display_name).like(term)
        )
    users = db.scalars(query.order_by(User.display_name).limit(100)).all()
    return [user_summary(db, user, current_user.id) for user in users]


@router.get("/users/{user_id}")
def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile_user = db.get(User, user_id)
    if profile_user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    posts = db.scalars(
        select(Post)
        .where(Post.user_id == user_id)
        .order_by(Post.created_at.desc(), Post.id.desc())
    ).all()
    profile = user_summary(db, profile_user, current_user.id)
    profile["posts"] = [
        {
            "id": post.id,
            "user_id": post.user_id,
            "author": {
                "id": profile_user.id,
                "username": profile_user.username,
                "display_name": profile_user.display_name,
                "profile_picture_url": profile_user.profile_picture_url,
            },
            "content": post.content,
            "created_at": post.created_at,
            "like_count": db.scalar(
                select(func.count()).select_from(Like).where(Like.post_id == post.id)
            ) or 0,
            "is_liked": db.scalar(
                select(Like.id).where(
                    Like.post_id == post.id,
                    Like.user_id == current_user.id,
                )
            ) is not None,
            "image_url": post.image_url,
            "video_url": post.video_url,
            "audio_url": post.audio_url,
            "music_line": post.music_line,
            "view_count": post.view_count,
            "comment_count": db.scalar(
                select(func.count()).select_from(Comment).where(Comment.post_id == post.id)
            ) or 0,
            "is_bookmarked": db.scalar(
                select(Bookmark.id).where(
                    Bookmark.post_id == post.id,
                    Bookmark.user_id == current_user.id,
                )
            ) is not None,
        }
        for post in posts
    ]
    return profile


@router.get("/users/me/followers")
def get_followers(
    search: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(User)
        .join(Follow, Follow.follower_id == User.id)
        .where(Follow.followed_id == current_user.id)
    )
    if search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.where(
            func.lower(User.username).like(term)
            | func.lower(User.display_name).like(term)
        )
    users = db.scalars(query.order_by(User.display_name)).all()
    return [user_summary(db, user, current_user.id) for user in users]


@router.get("/users/me/following")
def get_following(
    search: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(User)
        .join(Follow, Follow.followed_id == User.id)
        .where(Follow.follower_id == current_user.id)
    )
    if search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.where(
            func.lower(User.username).like(term)
            | func.lower(User.display_name).like(term)
        )
    users = db.scalars(query.order_by(User.display_name)).all()
    return [user_summary(db, user, current_user.id) for user in users]


@router.post(
    "/users/{user_id}/follow",
    response_model=FollowStatusResponse,
    status_code=status.HTTP_201_CREATED,
)
def follow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself.")
    if db.get(User, user_id) is None:
        raise HTTPException(status_code=404, detail="User not found.")
    existing = db.scalar(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.followed_id == user_id,
        )
    )
    if existing is None:
        db.add(Follow(follower_id=current_user.id, followed_id=user_id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
    return FollowStatusResponse(following=True)


@router.delete(
    "/users/{user_id}/follow",
    response_model=FollowStatusResponse,
)
def unfollow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.scalar(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.followed_id == user_id,
        )
    )
    if existing:
        db.delete(existing)
        db.commit()
    return FollowStatusResponse(following=False)


@router.delete("/users/me/followers/{user_id}")
def remove_follower(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    relationship = db.scalar(
        select(Follow).where(
            Follow.follower_id == user_id,
            Follow.followed_id == current_user.id,
        )
    )
    if relationship:
        db.delete(relationship)
        db.commit()
    return {"removed": relationship is not None}


@router.get("/stories")
def get_stories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    stories = db.scalars(
        select(Story)
        .options(joinedload(Story.user))
        .where(Story.expires_at > now)
        .order_by(Story.is_live.desc(), Story.created_at.desc())
    ).all()
    return [
        {
            "id": story.id,
            "caption": story.caption,
            "image_url": story.image_url,
            "video_url": story.video_url,
            "audio_url": story.audio_url,
            "music_line": story.music_line,
            "is_live": story.is_live,
            "is_seen": db.scalar(
                select(StoryView.id).where(
                    StoryView.story_id == story.id,
                    StoryView.user_id == current_user.id,
                )
            ) is not None,
            "like_count": db.scalar(
                select(func.count(StoryLike.id)).where(StoryLike.story_id == story.id)
            ) or 0,
            "is_liked": db.scalar(
                select(StoryLike.id).where(
                    StoryLike.story_id == story.id,
                    StoryLike.user_id == current_user.id,
                )
            ) is not None,
            "created_at": story.created_at,
            "expires_at": story.expires_at,
            "author": {
                "id": story.user.id,
                "username": story.user.username,
                "display_name": story.user.display_name,
                "profile_picture_url": story.user.profile_picture_url,
            },
        }
        for story in stories
    ]


@router.post("/stories/{story_id}/view")
def view_story(
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    story = db.get(Story, story_id)
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found.")
    expiry = story.expires_at
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    if expiry <= datetime.now(timezone.utc):
        raise HTTPException(status_code=404, detail="Story not found.")
    existing = db.scalar(
        select(StoryView).where(
            StoryView.story_id == story_id,
            StoryView.user_id == current_user.id,
        )
    )
    if existing is None:
        db.add(StoryView(story_id=story_id, user_id=current_user.id))
        db.commit()
    return {"seen": True}


@router.post("/stories/{story_id}/like")
def like_story(
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    story = db.get(Story, story_id)
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found.")
    expiry = story.expires_at
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    if expiry <= datetime.now(timezone.utc):
        raise HTTPException(status_code=404, detail="Story not found.")
    existing = db.scalar(
        select(StoryLike).where(
            StoryLike.story_id == story_id,
            StoryLike.user_id == current_user.id,
        )
    )
    if existing is None:
        db.add(StoryLike(story_id=story_id, user_id=current_user.id))
        db.commit()
    count = db.scalar(
        select(func.count(StoryLike.id)).where(StoryLike.story_id == story_id)
    ) or 0
    return {"liked": True, "like_count": count}


@router.delete("/stories/{story_id}/like")
def unlike_story(
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    story = db.get(Story, story_id)
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found.")
    expiry = story.expires_at
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    if expiry <= datetime.now(timezone.utc):
        raise HTTPException(status_code=404, detail="Story not found.")
    existing = db.scalar(
        select(StoryLike).where(
            StoryLike.story_id == story_id,
            StoryLike.user_id == current_user.id,
        )
    )
    if existing is not None:
        db.delete(existing)
        db.commit()
    count = db.scalar(
        select(func.count(StoryLike.id)).where(StoryLike.story_id == story_id)
    ) or 0
    return {"liked": False, "like_count": count}


@router.post("/stories", status_code=status.HTTP_201_CREATED)
def create_story(
    payload: StoryCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    story = Story(
        user_id=current_user.id,
        caption=payload.caption.strip(),
        image_url=payload.image_url,
        video_url=payload.video_url,
        audio_url=payload.audio_url,
        music_line=payload.music_line,
        is_live=payload.is_live,
        created_at=now,
        expires_at=now + timedelta(hours=24),
    )
    db.add(story)
    db.commit()
    db.refresh(story)
    return {
        "id": story.id,
        "caption": story.caption,
        "image_url": story.image_url,
        "video_url": story.video_url,
        "audio_url": story.audio_url,
        "music_line": story.music_line,
        "is_live": story.is_live,
        "created_at": story.created_at,
        "expires_at": story.expires_at,
        "author": {
            "id": current_user.id,
            "username": current_user.username,
            "display_name": current_user.display_name,
            "profile_picture_url": current_user.profile_picture_url,
        },
    }


def comment_data(db: Session, comment: Comment, current_user_id: int) -> dict:
    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "parent_id": comment.parent_id,
        "content": comment.content,
        "created_at": comment.created_at,
        "author": {
            "id": comment.user.id,
            "username": comment.user.username,
            "display_name": comment.user.display_name,
            "profile_picture_url": comment.user.profile_picture_url,
        },
        "like_count": len(comment.likes),
        "is_liked": any(
            like.user_id == current_user_id for like in comment.likes
        ),
    }


@router.get("/posts/{post_id}/comments")
def get_comments(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.get(Post, post_id) is None:
        raise HTTPException(status_code=404, detail="Post not found.")
    comments = db.scalars(
        select(Comment)
        .options(
            joinedload(Comment.user),
            joinedload(Comment.likes),
        )
        .where(Comment.post_id == post_id)
        .order_by(Comment.created_at)
    ).unique().all()
    by_id = {comment.id: comment_data(db, comment, current_user.id) for comment in comments}
    roots = []
    for comment in comments:
        data = by_id[comment.id]
        if comment.parent_id is None:
            data["replies"] = []
            roots.append(data)
        elif comment.parent_id in by_id:
            by_id[comment.parent_id].setdefault("replies", []).append(data)
    return {"total_count": len(comments), "comments": roots}


@router.post(
    "/posts/{post_id}/comments",
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    post_id: int,
    payload: CommentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.get(Post, post_id) is None:
        raise HTTPException(status_code=404, detail="Post not found.")
    if payload.parent_id is not None:
        parent = db.get(Comment, payload.parent_id)
        if parent is None or parent.post_id != post_id:
            raise HTTPException(status_code=404, detail="Parent comment not found.")
        if parent.parent_id is not None:
            raise HTTPException(status_code=400, detail="Replies can only be one level deep.")
    comment = Comment(
        post_id=post_id,
        user_id=current_user.id,
        parent_id=payload.parent_id,
        content=payload.content,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return {
        "id": comment.id,
        "post_id": post_id,
        "parent_id": comment.parent_id,
        "content": comment.content,
        "created_at": comment.created_at,
        "author": {
            "id": current_user.id,
            "username": current_user.username,
            "display_name": current_user.display_name,
            "profile_picture_url": current_user.profile_picture_url,
        },
        "like_count": 0,
        "is_liked": False,
        "replies": [],
    }


@router.post("/comments/{comment_id}/like", status_code=status.HTTP_201_CREATED)
def like_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = db.get(Comment, comment_id)
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found.")
    existing = db.scalar(
        select(CommentLike).where(
            CommentLike.user_id == current_user.id,
            CommentLike.comment_id == comment_id,
        )
    )
    if existing is None:
        db.add(CommentLike(user_id=current_user.id, comment_id=comment_id))
        db.commit()
    return {
        "liked": True,
        "like_count": db.scalar(
            select(func.count()).select_from(CommentLike).where(
                CommentLike.comment_id == comment_id
            )
        ),
    }


@router.delete("/comments/{comment_id}/like")
def unlike_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.scalar(
        select(CommentLike).where(
            CommentLike.user_id == current_user.id,
            CommentLike.comment_id == comment_id,
        )
    )
    if existing:
        db.delete(existing)
        db.commit()
    return {
        "liked": False,
        "like_count": db.scalar(
            select(func.count()).select_from(CommentLike).where(
                CommentLike.comment_id == comment_id
            )
        ),
    }
