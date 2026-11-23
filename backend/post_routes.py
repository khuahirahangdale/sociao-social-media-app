from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, literal, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth_routes import get_current_user, get_optional_current_user
from database import get_db
from models import Bookmark, Comment, CommentLike, Like, Post, User
from schemas import (
    LikeStatusResponse,
    PostAuthorResponse,
    PostCreateRequest,
    PostResponse,
    PostUpdateRequest,
)


router = APIRouter(prefix="/posts", tags=["posts"])


def build_post_response(
    post: Post,
    author: User,
    like_count: int,
    is_liked: bool,
    comment_count: int = 0,
    is_bookmarked: bool = False,
) -> PostResponse:
    return PostResponse(
        id=post.id,
        user_id=post.user_id,
        author=PostAuthorResponse(
            id=author.id,
            username=author.username,
            display_name=author.display_name,
            profile_picture_url=author.profile_picture_url,
        ),
        content=post.content,
        created_at=post.created_at,
        like_count=like_count,
        is_liked=is_liked,
        image_url=post.image_url,
        video_url=post.video_url,
        audio_url=post.audio_url,
        music_line=post.music_line,
        view_count=post.view_count,
        comment_count=comment_count,
        is_bookmarked=is_bookmarked,
    )


def get_post_or_404(db: Session, post_id: int) -> Post:
    post = db.get(Post, post_id)
    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found.",
        )
    return post


@router.get("", response_model=list[PostResponse])
def get_posts(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    if current_user is None:
        is_liked_expression = literal(False)
        is_bookmarked_expression = literal(False)
    else:
        is_liked_expression = (
            select(Like.id)
            .where(
                Like.post_id == Post.id,
                Like.user_id == current_user.id,
            )
            .correlate(Post)
            .exists()
        )
        is_bookmarked_expression = (
            select(Bookmark.id)
            .where(
                Bookmark.post_id == Post.id,
                Bookmark.user_id == current_user.id,
            )
            .correlate(Post)
            .exists()
        )
    comment_count_expression = (
        select(func.count(Comment.id))
        .where(Comment.post_id == Post.id)
        .correlate(Post)
        .scalar_subquery()
    )

    rows = db.execute(
        select(
            Post,
            User,
            func.count(Like.id).label("like_count"),
            is_liked_expression.label("is_liked"),
            comment_count_expression.label("comment_count"),
            is_bookmarked_expression.label("is_bookmarked"),
        )
        .join(User, Post.user_id == User.id)
        .outerjoin(Like, Like.post_id == Post.id)
        .group_by(Post.id, User.id)
        .order_by(Post.created_at.desc(), Post.id.desc())
    ).all()

    return [
        build_post_response(
            post, author, like_count, is_liked, comment_count, is_bookmarked
        )
        for post, author, like_count, is_liked, comment_count, is_bookmarked in rows
    ]


@router.post(
    "",
    response_model=PostResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_post(
    payload: PostCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = Post(user_id=current_user.id, content=payload.content)
    post.image_url = payload.image_url
    post.video_url = payload.video_url
    post.audio_url = payload.audio_url
    post.music_line = payload.music_line
    db.add(post)
    db.commit()
    db.refresh(post)
    return build_post_response(post, current_user, like_count=0, is_liked=False)


@router.patch("/{post_id}", response_model=PostResponse)
def update_post(
    post_id: int,
    payload: PostUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = get_post_or_404(db, post_id)
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own posts.")

    post.content = payload.content
    post.image_url = payload.image_url
    post.video_url = payload.video_url
    post.audio_url = payload.audio_url
    post.music_line = payload.music_line
    db.commit()
    db.refresh(post)
    like_count = db.scalar(
        select(func.count(Like.id)).where(Like.post_id == post.id)
    ) or 0
    comment_count = db.scalar(
        select(func.count(Comment.id)).where(Comment.post_id == post.id)
    ) or 0
    is_liked = db.scalar(
        select(Like.id).where(
            Like.post_id == post.id,
            Like.user_id == current_user.id,
        )
    ) is not None
    is_bookmarked = db.scalar(
        select(Bookmark.id).where(
            Bookmark.post_id == post.id,
            Bookmark.user_id == current_user.id,
        )
    ) is not None
    return build_post_response(
        post, current_user, like_count, is_liked, comment_count, is_bookmarked
    )


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = get_post_or_404(db, post_id)
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own posts.")

    comment_ids = select(Comment.id).where(Comment.post_id == post_id)
    db.execute(delete(CommentLike).where(CommentLike.comment_id.in_(comment_ids)))
    db.execute(delete(Comment).where(Comment.parent_id.in_(comment_ids)))
    db.execute(delete(Comment).where(Comment.post_id == post_id))
    db.execute(delete(Like).where(Like.post_id == post_id))
    db.execute(delete(Bookmark).where(Bookmark.post_id == post_id))
    db.delete(post)
    db.commit()


@router.get("/me", response_model=list[PostResponse])
def get_my_posts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment_count_expression = (
        select(func.count(Comment.id))
        .where(Comment.post_id == Post.id)
        .correlate(Post)
        .scalar_subquery()
    )
    rows = db.execute(
        select(
            Post,
            User,
            func.count(Like.id).label("like_count"),
            select(Like.id)
            .where(
                Like.post_id == Post.id,
                Like.user_id == current_user.id,
            )
            .correlate(Post)
            .exists()
            .label("is_liked"),
            comment_count_expression.label("comment_count"),
            select(Bookmark.id)
            .where(
                Bookmark.post_id == Post.id,
                Bookmark.user_id == current_user.id,
            )
            .correlate(Post)
            .exists()
            .label("is_bookmarked"),
        )
        .join(User, Post.user_id == User.id)
        .outerjoin(Like, Like.post_id == Post.id)
        .where(Post.user_id == current_user.id)
        .group_by(Post.id, User.id)
        .order_by(Post.created_at.desc(), Post.id.desc())
    ).all()

    return [
        build_post_response(
            post, author, like_count, is_liked, comment_count, is_bookmarked
        )
        for post, author, like_count, is_liked, comment_count, is_bookmarked in rows
    ]


@router.get("/videos", response_model=list[PostResponse])
def get_videos(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    rows = get_posts(db=db, current_user=current_user)
    return [post for post in rows if post.video_url]


@router.get("/saved", response_model=list[PostResponse])
def get_saved_posts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = db.execute(
        select(
            Post,
            User,
            func.count(Like.id).label("like_count"),
            select(Like.id)
            .where(Like.post_id == Post.id, Like.user_id == current_user.id)
            .correlate(Post)
            .exists()
            .label("is_liked"),
            select(func.count(Comment.id))
            .where(Comment.post_id == Post.id)
            .correlate(Post)
            .scalar_subquery()
            .label("comment_count"),
        )
        .join(Bookmark, Bookmark.post_id == Post.id)
        .join(User, Post.user_id == User.id)
        .outerjoin(Like, Like.post_id == Post.id)
        .where(Bookmark.user_id == current_user.id)
        .group_by(Post.id, User.id)
        .order_by(Bookmark.created_at.desc())
    ).all()
    return [
        build_post_response(
            post, author, like_count, is_liked, comment_count, True
        )
        for post, author, like_count, is_liked, comment_count in rows
    ]


@router.post("/{post_id}/bookmark", status_code=status.HTTP_201_CREATED)
def bookmark_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_post_or_404(db, post_id)
    if db.scalar(
        select(Bookmark).where(
            Bookmark.user_id == current_user.id,
            Bookmark.post_id == post_id,
        )
    ) is None:
        db.add(Bookmark(user_id=current_user.id, post_id=post_id))
        db.commit()
    return {"bookmarked": True}


@router.delete("/{post_id}/bookmark")
def unbookmark_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bookmark = db.scalar(
        select(Bookmark).where(
            Bookmark.user_id == current_user.id,
            Bookmark.post_id == post_id,
        )
    )
    if bookmark:
        db.delete(bookmark)
        db.commit()
    return {"bookmarked": False}


@router.post("/{post_id}/view")
def record_video_view(
    post_id: int,
    db: Session = Depends(get_db),
):
    post = get_post_or_404(db, post_id)
    if not post.video_url:
        raise HTTPException(status_code=400, detail="This post has no video.")
    post.view_count += 1
    db.commit()
    return {"view_count": post.view_count}


@router.post(
    "/{post_id}/like",
    response_model=LikeStatusResponse,
    status_code=status.HTTP_201_CREATED,
)
def like_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = get_post_or_404(db, post_id)
    existing_like = db.scalar(
        select(Like).where(
            Like.user_id == current_user.id,
            Like.post_id == post_id,
        )
    )
    if existing_like is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already liked this post.",
        )

    db.add(Like(user_id=current_user.id, post_id=post_id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already liked this post.",
        ) from None

    like_count = db.scalar(
        select(func.count(Like.id)).where(Like.post_id == post_id)
    )
    return LikeStatusResponse(liked=True, like_count=like_count)


@router.delete(
    "/{post_id}/like",
    response_model=LikeStatusResponse,
)
def unlike_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_post_or_404(db, post_id)
    existing_like = db.scalar(
        select(Like).where(
            Like.user_id == current_user.id,
            Like.post_id == post_id,
        )
    )
    if existing_like is not None:
        db.delete(existing_like)
        db.commit()

    like_count = db.scalar(
        select(func.count(Like.id)).where(Like.post_id == post_id)
    )
    return LikeStatusResponse(liked=False, like_count=like_count)
