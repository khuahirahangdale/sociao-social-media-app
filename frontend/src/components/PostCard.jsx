import { useRef, useState } from "react";
import "./PostCard.css";
import ProfileAvatar from "./ProfileAvatar";
import EmojiPicker from "./EmojiPicker";

function formatCreatedAt(value) {
  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) return "Just now";

  const elapsedMinutes = Math.floor((Date.now() - createdAt.getTime()) / 60000);
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays}d`;
  return createdAt.toLocaleDateString();
}

function ActionIcon({ name }) {
  const paths = {
    like: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z",
    comment: "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z",
    share: "M22 2 11 13 M22 2l-7 20-4-9-9-4z",
    save: "M6 4h12v17l-6-4-6 4z",
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

function PostCard({
  post,
  user,
  onLike,
  isLikeBusy = false,
  isBookmarked = false,
  onBookmark,
  onComment,
  onShare,
  onAuthorClick,
  isOwnPost = false,
  onEdit,
  onDelete,
  onSaveFromMenu,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [isSaving, setIsSaving] = useState(false);
  const [menuError, setMenuError] = useState("");
  const editTextRef = useRef(null);
  const name = user.name || user.display_name;
  const handle = user.handle || `@${user.username}`;

  async function saveEdit(event) {
    event.preventDefault();
    setIsSaving(true);
    setMenuError("");
    try {
      const saved = await onEdit(editedContent.trim());
      if (saved) setIsEditing(false);
      else setMenuError("The post could not be updated. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    setIsSaving(true);
    setMenuError("");
    try {
      const deleted = await onDelete();
      if (!deleted) setMenuError("The post could not be deleted. Please try again.");
      else setIsConfirmingDelete(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="post-card">
      <header className="post-header">
        <button
          type="button"
          className="post-author-open"
          onClick={onAuthorClick}
          aria-label={`View ${name}'s profile`}
        >
          <ProfileAvatar
            key={user.profile_picture_url || "no-author-picture"}
            user={{ ...user, display_name: name }}
            className="post-author-avatar"
          />
        </button>
        <button
          type="button"
          className="post-author post-author-open"
          onClick={onAuthorClick}
          aria-label={`View ${name}'s profile`}
        >
          <strong>{name}</strong>
          <span>
            <span className="post-handle">{handle}</span>
            <span className="post-dot" aria-hidden="true"> · </span>
            <time dateTime={post.created_at}>{formatCreatedAt(post.created_at)}</time>
          </span>
        </button>
        <button
          className="more-button"
          type="button"
          aria-label="More post options"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="5" cy="12" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
          </svg>
        </button>
        {isMenuOpen && (
          <div className="post-options-menu">
            {isOwnPost ? (
              <>
                <button type="button" onClick={() => {
                  setEditedContent(post.content);
                  setMenuError("");
                  setIsEditing(true);
                  setIsMenuOpen(false);
                }}>Edit post</button>
                <button className="post-option-danger" type="button" onClick={() => {
                  setMenuError("");
                  setIsConfirmingDelete(true);
                  setIsMenuOpen(false);
                }}>Delete post</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => { onShare(); setIsMenuOpen(false); }}>Share post</button>
                <button type="button" onClick={() => { onSaveFromMenu?.(); setIsMenuOpen(false); }}>Save post</button>
              </>
            )}
          </div>
        )}
      </header>

      {post.content && <p className="post-content">{post.content}</p>}
      {post.image_url && (
        <PostImage src={post.image_url} />
      )}
      {post.video_url && (
        <video className="post-media" src={post.video_url} controls playsInline preload="metadata">
          Your browser does not support embedded videos.
        </video>
      )}

      <div className="post-reactions">
        <span className="reaction-heart" aria-hidden="true">♥</span>
        <span>{post.like_count} likes</span>
      </div>
      <div className="post-actions">
        <button
          className={`post-action ${post.is_liked ? "is-liked" : ""}`}
          type="button"
          onClick={onLike}
          aria-pressed={post.is_liked}
          disabled={isLikeBusy}
          aria-label={post.is_liked ? "Unlike post" : "Like post"}
        >
          <ActionIcon name="like" />
        </button>
        <button
          className="post-action"
          type="button"
          onClick={onComment}
          aria-label="Comment on post"
        >
          <ActionIcon name="comment" />
        </button>
        <button
          className="post-action"
          type="button"
          onClick={onShare}
          aria-label="Share post"
        >
          <ActionIcon name="share" />
        </button>
        <button
          className={`post-action save-action ${isBookmarked ? "is-bookmarked" : ""}`}
          type="button"
          onClick={onBookmark}
          aria-label={isBookmarked ? "Remove bookmark" : "Save post"}
          aria-pressed={isBookmarked}
        >
          <ActionIcon name="save" />
        </button>
      </div>
      {(isEditing || isConfirmingDelete) && (
        <div className="post-dialog-backdrop" role="presentation" onClick={() => {
          if (!isSaving) {
            setIsEditing(false);
            setIsConfirmingDelete(false);
          }
        }}>
          {isEditing ? (
            <form className="post-edit-dialog" role="dialog" aria-modal="true" aria-labelledby={`edit-post-${post.id}`} onSubmit={saveEdit} onClick={(event) => event.stopPropagation()}>
              <h2 id={`edit-post-${post.id}`}>Edit post</h2>
              <label>
                <span className="sr-only">Post text</span>
                <textarea ref={editTextRef} autoFocus maxLength="5000" value={editedContent} onChange={(event) => setEditedContent(event.target.value)} />
                <EmojiPicker value={editedContent} onChange={setEditedContent} inputRef={editTextRef} />
              </label>
              {menuError && <p role="alert">{menuError}</p>}
              <div><button type="button" disabled={isSaving} onClick={() => setIsEditing(false)}>Cancel</button><button type="submit" disabled={isSaving}>{isSaving ? "Saving…" : "Save changes"}</button></div>
            </form>
          ) : (
            <section className="post-edit-dialog" role="dialog" aria-modal="true" aria-labelledby={`delete-post-${post.id}`} onClick={(event) => event.stopPropagation()}>
              <h2 id={`delete-post-${post.id}`}>Delete this post?</h2>
              <p>This will permanently remove the post and its comments.</p>
              {menuError && <p role="alert">{menuError}</p>}
              <div><button type="button" disabled={isSaving} onClick={() => setIsConfirmingDelete(false)}>Cancel</button><button className="post-option-danger" type="button" disabled={isSaving} onClick={confirmDelete}>{isSaving ? "Deleting…" : "Delete post"}</button></div>
            </section>
          )}
        </div>
      )}
    </article>
  );
}

function PostImage({ src }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return <p className="post-media-error">This image could not be loaded. Check that the URL points to a public image.</p>;
  }

  return (
    <img
      className="post-media"
      src={src}
      alt="Post attachment"
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

export default PostCard;
