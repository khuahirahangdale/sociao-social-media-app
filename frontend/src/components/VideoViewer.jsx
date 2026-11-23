import { useEffect, useRef, useState } from "react";
import "./VideoViewer.css";

function ReelSlide({
  post,
  rootRef,
  onLike,
  onBookmark,
  onShare,
  onComments,
  onAuthorClick,
  onVideoPlay,
}) {
  const slideRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [soundOn, setSoundOn] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [soundError, setSoundError] = useState("");

  useEffect(() => {
    const root = rootRef.current;
    if (!slideRef.current || !root) return undefined;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const video = videoRef.current;
        const audio = audioRef.current;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
          video?.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          if (audio) {
            audio.volume = 0.22;
            audio.play().then(() => setSoundOn(true)).catch(() => {
              setSoundOn(false);
              setSoundError("Tap Sound to play the music.");
            });
          }
          onVideoPlay(post);
        } else {
          video?.pause();
          audio?.pause();
          setSoundOn(false);
        }
      }
    }, { root, threshold: [0.65] });
    observer.observe(slideRef.current);
    return () => observer.disconnect();
  }, [onVideoPlay, post, rootRef]);

  async function toggleSound() {
    const audio = audioRef.current;
    if (!audio) return;
    if (soundOn) {
      audio.pause();
      setSoundOn(false);
      return;
    }
    try {
      audio.volume = 0.22;
      await audio.play();
      setSoundOn(true);
      setSoundError("");
    } catch {
      setSoundError("Tap again to play the music.");
    }
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }

  return (
    <article className="video-slide" ref={slideRef} data-post-id={post.id}>
      <video
        ref={videoRef}
        className="video-player"
        src={post.video_url}
        autoPlay
        muted
        playsInline
        loop
        preload="metadata"
        onClick={togglePlayback}
        onPlay={() => onVideoPlay(post)}
      />
      <audio ref={audioRef} src={post.audio_url || "/audio/soft-loop.wav"} loop preload="auto" />
      {!isPlaying && <button className="reel-play-indicator" type="button" onClick={togglePlayback} aria-label="Play video">▶</button>}
      <div className="video-caption">
        <button className="video-author" type="button" onClick={() => onAuthorClick(post.author.id)}>
          @{post.author.username}
        </button>
        <p>{post.content}</p>
        <span>♫ {post.music_line || "Soft ambient music"}</span>
      </div>
      <div className="video-actions">
        <button className={post.is_liked ? "is-liked" : ""} type="button" onClick={() => onLike(post)} aria-label={post.is_liked ? "Unlike video" : "Like video"}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z" /></svg>
          <small>{post.like_count}</small>
        </button>
        <button type="button" onClick={() => onComments(post)} aria-label="Show comments">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8 8.5 8.5 0 0 1-3.5-.8L4 20l1.2-4A8 8 0 1 1 20 11.5z" /></svg>
          <small>{post.comment_count}</small>
        </button>
        <button type="button" onClick={() => onShare(post)} aria-label="Share video">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13 M22 2l-7 20-4-9-9-4z" /></svg>
          <small>Share</small>
        </button>
        <button className={post.is_bookmarked ? "is-saved" : ""} type="button" onClick={() => onBookmark(post)} aria-label={post.is_bookmarked ? "Remove saved video" : "Save video"} aria-pressed={post.is_bookmarked}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z" /></svg>
          <small>Save</small>
        </button>
        <button className={`reel-sound-button${soundOn ? " is-sound-on" : ""}`} type="button" onClick={toggleSound} aria-label={soundOn ? "Mute music" : "Play music"}>
          <span aria-hidden="true">{soundOn ? "♫" : "♪"}</span>
          <small>{soundOn ? "Sound on" : "Sound"}</small>
        </button>
        <small className="video-views">{post.view_count} views</small>
      </div>
      {soundError && <p className="reel-sound-error" role="status">{soundError}</p>}
    </article>
  );
}

function VideoViewer({
  videos,
  onClose,
  onLike,
  onBookmark,
  onShare,
  onComments,
  onAuthorClick,
  onVideoPlay,
  initialVideoId,
}) {
  const scrollRef = useRef(null);
  const scrolledToRef = useRef(null);

  useEffect(() => {
    if (!initialVideoId || initialVideoId === scrolledToRef.current) return;
    const target = scrollRef.current?.querySelector(`[data-post-id="${initialVideoId}"]`);
    if (!target) return;
    target.scrollIntoView({ block: "start" });
    scrolledToRef.current = initialVideoId;
  }, [initialVideoId, videos]);

  if (!videos.length) {
    return (
      <section className="video-empty">
        <button className="video-close" type="button" onClick={onClose} aria-label="Close videos">×</button>
        <span aria-hidden="true">▷</span>
        <h1>No videos yet</h1>
        <p>Videos shared by your community will appear here.</p>
      </section>
    );
  }

  return (
    <section className="video-viewer" aria-label="Videos">
      <button className="video-close" type="button" onClick={onClose} aria-label="Close videos">×</button>
      <div className="video-scroll" ref={scrollRef}>
        {videos.map((post) => (
          <ReelSlide
            key={post.id}
            post={post}
            rootRef={scrollRef}
            onLike={onLike}
            onBookmark={onBookmark}
            onShare={onShare}
            onComments={onComments}
            onAuthorClick={onAuthorClick}
            onVideoPlay={onVideoPlay}
          />
        ))}
      </div>
    </section>
  );
}

export default VideoViewer;
