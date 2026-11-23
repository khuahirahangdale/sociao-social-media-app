import { useRef, useState } from "react";
import "./StoriesRow.css";
import ProfileAvatar from "./ProfileAvatar";
import EmojiPicker from "./EmojiPicker";

function StoriesRow({ currentUser, stories, onAddStory, onStoryClick }) {
  const [isAdding, setIsAdding] = useState(false);
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [musicLine, setMusicLine] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const captionRef = useRef(null);
  const myStories = stories.filter((story) => story.author.id === currentUser.id);
  const storiesByPerson = stories
    .filter((story) => story.author.id !== currentUser.id)
    .reduce((groups, story) => {
      const current = groups.get(story.author.id) || [];
      current.push(story);
      groups.set(story.author.id, current);
      return groups;
    }, new Map());

  function startAddingStory() {
    setIsAdding(true);
  }

  async function submitStory(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await onAddStory({
        caption,
        image_url: imageUrl || null,
        video_url: videoUrl || null,
        audio_url: audioUrl || null,
        music_line: musicLine.trim(),
        is_live: isLive,
      });
      setCaption("");
      setImageUrl("");
      setVideoUrl("");
      setAudioUrl("");
      setMusicLine("");
      setIsLive(false);
      setIsAdding(false);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="stories-section" aria-label="Stories">
      <div className="stories-list">
        <div className="story-item add-story">
          <button
            className="story-circle-button"
            type="button"
            aria-label={myStories.length ? "View your story" : "Add a story"}
            onClick={() => myStories.length ? onStoryClick(myStories[0]) : startAddingStory()}
          >
            <span className={`story-avatar-wrap ${myStories.length ? "has-unseen-story" : ""}`}>
              <ProfileAvatar user={currentUser} className="story-photo story-avatar-self" />
            </span>
          </button>
          <button type="button" className="story-add-mark" aria-label="Add another story" onClick={startAddingStory}>+</button>
          <span className="story-name">Your story</span>
        </div>
        {[...storiesByPerson.values()].map((personStories) => {
          const story = personStories[0];
          return (
          <button
            className="story-item"
            key={story.author.id}
            type="button"
            onClick={() => onStoryClick(story)}
          >
            <span className={`story-avatar-wrap ${personStories.some((item) => !item.is_seen) ? "has-unseen-story" : "has-seen-story"}`}>
              <ProfileAvatar user={story.author} className={`story-photo story-avatar-${story.author.id % 3}`} />
              {personStories.some((item) => item.is_live) && <span className="story-live-badge">LIVE</span>}
            </span>
            <span className="story-name">{story.author.display_name.split(" ")[0]}</span>
          </button>
          );
        })}
        {stories.length === 0 && (
          <p className="stories-empty">No active stories yet</p>
        )}
      </div>

      {isAdding && (
        <div className="story-dialog-backdrop" role="presentation" onClick={() => setIsAdding(false)}>
          <form
            className="story-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="story-dialog-title"
            onSubmit={submitStory}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="story-dialog-heading">
              <h2 id="story-dialog-title">Add a story</h2>
              <button type="button" aria-label="Close" onClick={() => setIsAdding(false)}>×</button>
            </div>
            <label>
              Caption
              <textarea ref={captionRef} value={caption} maxLength="500" onChange={(event) => setCaption(event.target.value)} />
              <EmojiPicker value={caption} onChange={setCaption} inputRef={captionRef} />
            </label>
            <label>
              Image URL <span className="optional-label">optional</span>
              <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} type="url" />
            </label>
            <label>
              Video URL <span className="optional-label">optional</span>
              <input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} type="url" />
            </label>
            <label>
              Audio URL <span className="optional-label">optional</span>
              <input value={audioUrl} onChange={(event) => setAudioUrl(event.target.value)} type="url" />
            </label>
            <label>
              Music / audio label <span className="optional-label">optional</span>
              <input value={musicLine} onChange={(event) => setMusicLine(event.target.value)} maxLength="255" />
            </label>
            <label className="story-live-option">
              <input type="checkbox" checked={isLive} onChange={(event) => setIsLive(event.target.checked)} />
              Mark as Live
            </label>
            {error && <p className="story-form-error" role="alert">{error}</p>}
            <button className="story-submit" type="submit" disabled={isSubmitting || (!caption.trim() && !imageUrl && !videoUrl)}>
              {isSubmitting ? "Sharing..." : "Share story"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

export default StoriesRow;
