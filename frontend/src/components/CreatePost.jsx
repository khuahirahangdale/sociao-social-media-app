import { useEffect, useRef, useState } from "react";
import "./CreatePost.css";
import ProfileAvatar from "./ProfileAvatar";
import EmojiPicker from "./EmojiPicker";

const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const supportedVideoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function CreatePost({ user, onSubmit, onUploadMedia, inputRef }) {
  const [content, setContent] = useState("");
  const [mediaType, setMediaType] = useState("text");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const [musicLine, setMusicLine] = useState("");
  const [error, setError] = useState("");
  const [mediaPreviewError, setMediaPreviewError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const composerRef = useRef(null);
  const fileInputRef = useRef(null);
  const textAreaRef = inputRef || composerRef;

  useEffect(() => () => {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
  }, [localPreviewUrl]);

  function chooseMediaType(nextType) {
    setMediaType(mediaType === nextType ? "text" : nextType);
    setMediaPreviewError(false);
    setMediaFile(null);
    setLocalPreviewUrl("");
  }

  function setSelectedFile(selectedFile) {
    if (!selectedFile) return;
    const selectedType = supportedImageTypes.has(selectedFile.type)
      ? "image"
      : supportedVideoTypes.has(selectedFile.type)
        ? "video"
        : "";
    if (!selectedType) {
      setError("Choose an image or video file.");
      return;
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError("Choose a file that is 50 MB or smaller.");
      return;
    }
    setError("");
    setMediaPreviewError(false);
    setMediaType(selectedType);
    setMediaFile(selectedFile);
    setLocalPreviewUrl(URL.createObjectURL(selectedFile));
    if (selectedType === "image") setImageUrl("");
    else setVideoUrl("");
  }

  function chooseLocalFile(event) {
    setSelectedFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleMediaDrop(event) {
    event.preventDefault();
    setIsDraggingMedia(false);
    setSelectedFile(event.dataTransfer.files?.[0]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedContent = content.trim();
    let mediaUrl = mediaType === "image" ? imageUrl.trim() : videoUrl.trim();
    if (mediaFile) mediaUrl = "";
    if (!trimmedContent && !mediaUrl && !mediaFile) return;
    setError("");
    setIsSubmitting(true);
    try {
      if (mediaFile) {
        const uploadedMedia = await onUploadMedia(mediaFile);
        mediaUrl = uploadedMedia.url;
      }
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
      setMediaFile(null);
      setLocalPreviewUrl("");
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
              {mediaType === "image" ? "Image URL (optional)" : "Video URL (optional)"}
              <input
                type="url"
                value={mediaType === "image" ? imageUrl : videoUrl}
                onChange={(event) => {
                  setMediaPreviewError(false);
                  setMediaFile(null);
                  setLocalPreviewUrl("");
                  if (mediaType === "image") setImageUrl(event.target.value);
                  else setVideoUrl(event.target.value);
                }}
                placeholder="https://…"
              />
            </label>
            <label className={`composer-file-button${isSubmitting ? " is-disabled" : ""}`}>
              <input
                ref={fileInputRef}
                className="composer-file-input"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                onChange={chooseLocalFile}
                disabled={isSubmitting}
              />
              Choose a file from device
            </label>
            <div
              className={`composer-drop-zone${isDraggingMedia ? " is-dragging" : ""}`}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDraggingMedia(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setIsDraggingMedia(false);
              }}
              onDrop={handleMediaDrop}
              aria-label="Drop an image or video to attach it"
            >
              Drop an image or video here
            </div>
            {mediaFile && <p className="composer-file-name">{mediaFile.name}</p>}
            {mediaType === "video" && (
              <label>
                Music
                <input value={musicLine} onChange={(event) => setMusicLine(event.target.value)} placeholder="Artist — track" maxLength="255" />
              </label>
            )}
          </div>
        )}
        {mediaType === "image" && localPreviewUrl && (
          <img className="composer-media-preview" src={localPreviewUrl} alt="Selected image preview" />
        )}
        {mediaType === "video" && localPreviewUrl && (
          <video className="composer-media-preview" src={localPreviewUrl} controls muted playsInline />
        )}
        {mediaType === "image" && !localPreviewUrl && imageUrl.trim() && !mediaPreviewError && (
          <img
            className="composer-media-preview"
            src={imageUrl.trim()}
            alt="Image preview"
            onError={() => setMediaPreviewError(true)}
          />
        )}
        {mediaType === "video" && !localPreviewUrl && videoUrl.trim() && !mediaPreviewError && (
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
            <button type="button" className="composer-media-choice" onClick={() => chooseMediaType("image")} aria-pressed={mediaType === "image"} aria-label="Add image">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            </button>
            <button type="button" className="composer-media-choice" onClick={() => chooseMediaType("video")} aria-pressed={mediaType === "video"} aria-label="Add video">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="m10 9 5 3-5 3z" />
              </svg>
            </button>
            <button className="post-button" type="submit" disabled={(!content.trim() && !((mediaType === "image" ? imageUrl : videoUrl).trim()) && !mediaFile) || isSubmitting}>
            {isSubmitting ? "Sharing..." : "Share"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default CreatePost;
