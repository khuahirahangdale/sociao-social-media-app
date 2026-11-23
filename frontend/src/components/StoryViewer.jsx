import { useRef, useState } from "react";
import "./StoryViewer.css";
import ProfileAvatar from "./ProfileAvatar";

function StoryViewer({ story, onClose, onNext, onPrevious, onLike }) {
  const audioRef = useRef(null);
  const [soundOn, setSoundOn] = useState(false);
  const [audioError, setAudioError] = useState("");
  if (!story) return null;

  async function toggleSound() {
    const audio = audioRef.current;
    if (!audio) return;
    if (soundOn) {
      audio.pause();
      setSoundOn(false);
      return;
    }
    try {
      await audio.play();
      setSoundOn(true);
      setAudioError("");
    } catch {
      setAudioError("Tap sound again to play the music.");
    }
  }

  function startMusic() {
    const audio = audioRef.current;
    if (audio && !soundOn) {
      audio.volume = 0.22;
      audio.play().then(() => setSoundOn(true)).catch(() => setAudioError("Tap the sound button to hear music."));
    }
  }

  return (
    <div className="story-viewer" role="dialog" aria-modal="true" aria-label="Story">
      <div className="story-progress" key={story.id}><span onAnimationEnd={onNext} /></div>
      <header className="story-viewer-header">
        <ProfileAvatar user={story.author} className="story-viewer-avatar" />
        <strong>{story.author.username}</strong>
        {story.is_live && <span className="story-viewer-live">LIVE</span>}
        <button type="button" onClick={onClose} aria-label="Close story">×</button>
      </header>
      {story.video_url ? (
        <video className="story-viewer-media" src={story.video_url} autoPlay muted loop playsInline onPlay={startMusic} />
      ) : story.image_url ? (
        <img className="story-viewer-media" src={story.image_url} alt={story.caption || "Story"} />
      ) : (
        <div className="story-viewer-text">{story.caption}</div>
      )}
      {story.audio_url && (
        <audio ref={audioRef} className="story-viewer-audio" src={story.audio_url} loop preload="auto" />
      )}
      {story.caption && (story.image_url || story.video_url) && (
        <p className="story-viewer-caption">{story.caption}</p>
      )}
      {story.music_line && <p className="story-viewer-music">♫ {story.music_line}</p>}
      {story.video_url && story.audio_url && (
        <button className="story-sound-toggle" type="button" onClick={toggleSound} aria-label={soundOn ? "Mute story music" : "Play story music"}>
          {soundOn ? "♫" : "♪"}
        </button>
      )}
      {audioError && <p className="story-audio-error" role="status">{audioError}</p>}
      <button className={`story-like-button${story.is_liked ? " is-liked" : ""}`} type="button" onClick={() => onLike(story)} aria-label={story.is_liked ? "Unlike story" : "Like story"}>
        {story.is_liked ? "♥" : "♡"} {story.like_count || 0}
      </button>
      <button className="story-nav story-nav-prev" type="button" aria-label="Previous story" onClick={onPrevious} />
      <button className="story-nav story-nav-next" type="button" aria-label="Next story" onClick={onNext} />
    </div>
  );
}

export default StoryViewer;
