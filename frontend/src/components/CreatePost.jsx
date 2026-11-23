import { useRef, useState } from "react";
import "./CreatePost.css";
import ProfileAvatar from "./ProfileAvatar";
import EmojiPicker from "./EmojiPicker";

function CreatePost({ user, onSubmit, inputRef }) {
  const [content, setContent] = useState("");
  const [mediaType, setMediaType] = useState("text");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [musicLine, setMusicLine] = useState("");
  const [error, setError] = useState("");
  const [mediaPreviewError, setMediaPreviewError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const composerRef = useRef(null);
  const textAreaRef = inputRef || composerRef;

  function chooseMediaType(nextType) {
    setMediaType(mediaType === nextType ? "text" : nextType);
    setMediaPreviewError(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedContent = content.trim();
    const mediaUrl = mediaType === "image" ? imageUrl.trim() : videoUrl.trim();
    if (!trimmedContent && !mediaUrl) return;
    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit({
        content: trimmedContent,
        image_url: mediaType === "image" ? mediaUrl : null,
        video_url: mediaType === "video" ? mediaUrl : null,
        audio_url: mediaType === "video" ? "/audio/soft-loop.wav" : null,
        music_line: mediaType === "video" ? musicLine.trim() || "Soft ambient music" : "",
      });
      setContent("");
      setImageUrl("");
      setVideoUrl("");
      setMusicLine("");
      setMediaType("text");
    } catch (submitError) {
      setError(submitError.message || "Your post could not be created. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="create-post" onSubmit={handleSubmit}>
      <ProfileAvatar user={user} className="composer-avatar" />
      <div className="create-post-content">
        <label className="sr-only" htmlFor="post-content">
          Write a post
        </label>
        <textarea
          ref={textAreaRef}
          id="post-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="What's on your mind?"
          rows="5"
          disabled={isSubmitting}
          maxLength="5000"
          aria-describedby="post-character-count"
        />
        <EmojiPicker value={content} onChange={setContent} inputRef={textAreaRef} />
        {error && <p className="composer-error" role="alert">{error}</p>}
        {mediaType !== "text" && (
          <div className="composer-media-fields">
            <label>
              {mediaType === "image" ? "Image URL" : "Video URL"}
              <input
                type="url"
                required
                value={mediaType === "image" ? imageUrl : videoUrl}
                onChange={(event) => {
                  setMediaPreviewError(false);
                  if (mediaType === "image") setImageUrl(event.target.value);
                  else setVideoUrl(event.target.value);
                }}
                placeholder="https://…"
              />
            </label>
            {mediaType === "video" && (
              <label>
                Music
                <input value={musicLine} onChange={(event) => setMusicLine(event.target.value)} placeholder="Artist — track" maxLength="255" />
              </label>
            )}
          </div>
        )}
        {mediaType === "image" && imageUrl.trim() && !mediaPreviewError && (
          <img
            className="composer-media-preview"
            src={imageUrl.trim()}
            alt="Image preview"
            onError={() => setMediaPreviewError(true)}
          />
        )}
        {mediaType === "video" && videoUrl.trim() && !mediaPreviewError && (
          <video
            className="composer-media-preview"
            src={videoUrl.trim()}
            controls
            muted
            playsInline
            preload="metadata"
            onError={() => setMediaPreviewError(true)}
          />
        )}
        {mediaPreviewError && (
          <p className="composer-media-error" role="status">
            This media could not be previewed. Use a public direct image or video URL.
          </p>
        )}
        <div className="create-post-actions">
          <span id="post-character-count" className="composer-count">
            {content.length}/5000
          </span>
          <div className="composer-submit-actions">
            <button type="button" className="composer-media-choice" onClick={() => chooseMediaType("image")} aria-pressed={mediaType === "image"} aria-label="Add image URL">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            </button>
            <button type="button" className="composer-media-choice" onClick={() => chooseMediaType("video")} aria-pressed={mediaType === "video"} aria-label="Add video URL">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="m10 9 5 3-5 3z" />
              </svg>
            </button>
            <button className="post-button" type="submit" disabled={(!content.trim() && !((mediaType === "image" ? imageUrl : videoUrl).trim())) || isSubmitting}>
            {isSubmitting ? "Sharing..." : "Share"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default CreatePost;
