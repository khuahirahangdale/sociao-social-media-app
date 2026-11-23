from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased, joinedload

from auth_routes import get_current_user
from database import get_db
from models import (
    Conversation,
    ConversationMember,
    Message,
    MessageReaction,
    User,
)
from schemas import MessageCreateRequest


router = APIRouter(prefix="/messages", tags=["messages"])


def conversation_for_users(
    db: Session,
    first_user_id: int,
    second_user_id: int,
) -> Conversation | None:
    first_member = aliased(ConversationMember)
    second_member = aliased(ConversationMember)
    return db.scalar(
        select(Conversation)
        .join(first_member, first_member.conversation_id == Conversation.id)
        .join(second_member, second_member.conversation_id == Conversation.id)
        .where(
            first_member.user_id == first_user_id,
            second_member.user_id == second_user_id,
        )
    )


def get_member(
    db: Session,
    conversation_id: int,
    user_id: int,
) -> ConversationMember:
    member = db.scalar(
        select(ConversationMember).where(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id,
        )
    )
    if member is None:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return member


def message_response(db: Session, message: Message, current_user_id: int) -> dict:
    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender_id": message.sender_id,
        "content": message.content,
        "created_at": message.created_at,
        "is_mine": message.sender_id == current_user_id,
        "hearted": db.scalar(
            select(MessageReaction.id).where(
                MessageReaction.message_id == message.id,
                MessageReaction.user_id == current_user_id,
            )
        ) is not None,
        "sender": {
            "id": message.sender.id,
            "username": message.sender.username,
            "display_name": message.sender.display_name,
            "profile_picture_url": message.sender.profile_picture_url,
        },
    }


@router.get("/conversations")
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    memberships = db.scalars(
        select(ConversationMember)
        .options(
            joinedload(ConversationMember.conversation)
            .joinedload(Conversation.members)
            .joinedload(ConversationMember.user)
        )
        .where(ConversationMember.user_id == current_user.id)
    ).unique().all()
    result = []
    for membership in memberships:
        conversation = membership.conversation
        other_member = next(
            member
            for member in conversation.members
            if member.user_id != current_user.id
        )
        latest_message = db.scalar(
            select(Message)
            .options(joinedload(Message.sender))
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.created_at.desc(), Message.id.desc())
            .limit(1)
        )
        unread_query = select(func.count()).select_from(Message).where(
            Message.conversation_id == conversation.id,
            Message.sender_id != current_user.id,
        )
        if membership.last_read_at is not None:
            unread_query = unread_query.where(
                Message.created_at > membership.last_read_at
            )
        unread_count = db.scalar(unread_query) or 0
        other_user = other_member.user
        result.append({
            "id": conversation.id,
            "other_user": {
                "id": other_user.id,
                "username": other_user.username,
                "display_name": other_user.display_name,
                "profile_picture_url": other_user.profile_picture_url,
            },
            "last_message": latest_message.content if latest_message else "",
            "last_message_at": latest_message.created_at if latest_message else conversation.created_at,
            "unread_count": unread_count,
            "unread": unread_count > 0,
        })
    return sorted(
        result,
        key=lambda item: item["last_message_at"],
        reverse=True,
    )


@router.post("/conversations/with/{other_user_id}", status_code=status.HTTP_201_CREATED)
def open_or_create_conversation(
    other_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if other_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot message yourself.")
    other_user = db.get(User, other_user_id)
    if other_user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    conversation = conversation_for_users(db, current_user.id, other_user_id)
    if conversation is None:
        conversation = Conversation()
        db.add(conversation)
        db.flush()
        db.add_all([
            ConversationMember(
                conversation_id=conversation.id,
                user_id=current_user.id,
                last_read_at=datetime.now(timezone.utc),
            ),
            ConversationMember(
                conversation_id=conversation.id,
                user_id=other_user_id,
            ),
        ])
        db.commit()
        db.refresh(conversation)

    return {
        "id": conversation.id,
        "other_user": {
            "id": other_user.id,
            "username": other_user.username,
            "display_name": other_user.display_name,
            "profile_picture_url": other_user.profile_picture_url,
        },
    }


@router.get("/conversations/{conversation_id}")
def get_conversation_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = get_member(db, conversation_id, current_user.id)
    membership.last_read_at = datetime.now(timezone.utc)
    db.commit()
    messages = db.scalars(
        select(Message)
        .options(joinedload(Message.sender))
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at, Message.id)
    ).unique().all()
    return {
        "conversation_id": conversation_id,
        "messages": [
            message_response(db, message, current_user.id)
            for message in messages
        ],
    }


@router.post(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_201_CREATED,
)
def send_message(
    conversation_id: int,
    payload: MessageCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sender_membership = get_member(db, conversation_id, current_user.id)
    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=payload.content,
    )
    db.add(message)
    sender_membership.last_read_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(message)
    message.sender = current_user
    return message_response(db, message, current_user.id)


@router.post("/{message_id}/heart")
def heart_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message = db.get(Message, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found.")
    get_member(db, message.conversation_id, current_user.id)
    existing = db.scalar(
        select(MessageReaction).where(
            MessageReaction.message_id == message_id,
            MessageReaction.user_id == current_user.id,
        )
    )
    if existing is None:
        db.add(MessageReaction(message_id=message_id, user_id=current_user.id))
        db.commit()
    return {"hearted": True}


@router.delete("/{message_id}/heart")
def unheart_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message = db.get(Message, message_id)
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found.")
    get_member(db, message.conversation_id, current_user.id)
    reaction = db.scalar(
        select(MessageReaction).where(
            MessageReaction.message_id == message_id,
            MessageReaction.user_id == current_user.id,
        )
    )
    if reaction:
        db.delete(reaction)
        db.commit()
    return {"hearted": False}
