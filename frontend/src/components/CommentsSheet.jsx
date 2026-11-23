import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import ProfileAvatar from "./ProfileAvatar";
import EmojiPicker from "./EmojiPicker";
import "./CommentsSheet.css";

function CommentItem({ comment, onReply, onLike }) {
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const replyInputRef = useRef(null);

  async function submitReply(event) {
    event.preventDefault();
    if (!reply.trim()) return;
    await onReply(comment.id, reply.trim());
    setReply("");
    setReplying(false);
  }

  return (
    <article className="comment-item">
      <ProfileAvatar user={comment.author} className="comment-avatar" />
      <div className="comment-body">
        <p><strong>{comment.author.username}</strong> {comment.content}</p>
        <div className="comment-meta">
          <span>{new Date(comment.created_at).toLocaleString([], { hour: "numeric", minute: "2-digit" })}</span>
          <button type="button" onClick={() => onLike(comment)}>{comment.is_liked ? "♥ Liked" : `♥ ${comment.like_count || "Like"}`}</button>
          {comment.parent_id === null && <button type="button" onClick={() => setReplying((value) => !value)}>Reply</button>}
        </div>
        {replying && (
          <form className="comment-reply-form" onSubmit={submitReply}>
            <input ref={replyInputRef} value={reply} onChange={(event) => setReply(event.target.value)} placeholder={`Reply to ${comment.author.username}`} />
            <EmojiPicker value={reply} onChange={setReply} inputRef={replyInputRef} />
            <button type="submit" disabled={!reply.trim()}>Reply</button>
          </form>
        )}
        {comment.replies?.map((child) => (
          <div className="comment-reply" key={child.id}>
            <ProfileAvatar user={child.author} className="comment-avatar small" />
            <div className="comment-body">
              <p><strong>{child.author.username}</strong> {child.content}</p>
              <div className="comment-meta">
                <span>{new Date(child.created_at).toLocaleString([], { hour: "numeric", minute: "2-digit" })}</span>
                <button type="button" onClick={() => onLike(child)}>{child.is_liked ? "♥ Liked" : `♥ ${child.like_count || "Like"}`}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function CommentsSheet({ post, user, onClose, onCountChange }) {
  const [comments, setComments] = useState([]);
  const [totalCount, setTotalCount] = useState(post.comment_count || 0);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const commentInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    api.getComments(post.id)
      .then((result) => {
        if (!active) return;
        setComments(result.comments);
        setTotalCount(result.total_count);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [post.id]);

  async function addComment(text, parentId = null) {
    const newComment = await api.createComment(post.id, text, parentId);
    if (parentId) {
      setComments((current) => current.map((comment) =>
        comment.id === parentId
          ? { ...comment, replies: [...(comment.replies || []), newComment] }
          : comment,
      ));
    } else {
      setComments((current) => [...current, newComment]);
    }
    setTotalCount((count) => count + 1);
    onCountChange(post.id, totalCount + 1);
  }

  async function submitComment(event) {
    event.preventDefault();
    if (!content.trim()) return;
    setIsSending(true);
    setError("");
    try {
      await addComment(content.trim());
      setContent("");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSending(false);
    }
  }

  async function toggleCommentLike(comment) {
    try {
      const result = comment.is_liked
        ? await api.unlikeComment(comment.id)
        : await api.likeComment(comment.id);
      const update = (items) => items.map((item) => {
        if (item.id === comment.id) {
          return { ...item, is_liked: result.liked, like_count: result.like_count };
        }
        return { ...item, replies: update(item.replies || []) };
      });
      setComments(update);
    } catch (likeError) {
      setError(likeError.message);
    }
  }

  return (
    <div className="comments-backdrop" role="presentation" onClick={onClose}>
      <section
        className="comments-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comments-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="comments-grabber" />
        <header className="comments-heading">
          <h2 id="comments-title">Comments <span>{totalCount}</span></h2>
          <button type="button" aria-label="Close comments" onClick={onClose}>×</button>
        </header>
        {isLoading ? (
          <p className="comments-message">Loading comments…</p>
        ) : comments.length === 0 ? (
          <p className="comments-message">Be the first to comment.</p>
        ) : (
          <div className="comments-list">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={addComment}
                onLike={toggleCommentLike}
              />
            ))}
          </div>
        )}
        {error && <p className="comments-error" role="alert">{error}</p>}
        <form className="comment-composer" onSubmit={submitComment}>
          <ProfileAvatar user={user} className="comment-avatar" />
          <input
            ref={commentInputRef}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Add a comment…"
            aria-label="Add a comment"
            maxLength="2000"
          />
          <EmojiPicker value={content} onChange={setContent} inputRef={commentInputRef} />
          <button type="submit" disabled={!content.trim() || isSending}>
            {isSending ? "…" : "Post"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default CommentsSheet;
