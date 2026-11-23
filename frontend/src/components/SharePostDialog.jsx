import { useEffect, useState } from "react";
import { api } from "../api";
import ProfileAvatar from "./ProfileAvatar";
import "./SharePostDialog.css";

function SharePostDialog({ post, onClose, onShared }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.getUsers()
      .then((people) => {
        if (active) setUsers(people);
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
  }, []);

  const matchingUsers = users.filter((person) =>
    `${person.display_name} ${person.username}`.toLowerCase().includes(search.toLowerCase()),
  );

  async function shareWith(person) {
    setSendingTo(person.id);
    setError("");
    try {
      const conversation = await api.openConversation(person.id);
      const text = [
        `Shared a post by @${post.author.username}:`,
        post.content || "Shared media",
        post.image_url,
        post.video_url,
      ].filter(Boolean).join("\n").slice(0, 4000);
      await api.sendMessage(conversation.id, text);
      onShared(person);
      onClose();
    } catch (shareError) {
      setError(shareError.message);
    } finally {
      setSendingTo(null);
    }
  }

  return (
    <div className="share-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        className="share-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="share-dialog-heading">
          <h2 id="share-dialog-title">Share post</h2>
          <button type="button" onClick={onClose} aria-label="Close share dialog">×</button>
        </header>
        <label className="share-search">
          <span className="sr-only">Find someone to share with</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people" />
        </label>
        {error && <p className="share-error" role="alert">{error}</p>}
        {isLoading ? <p className="share-empty">Loading people…</p> : matchingUsers.length ? (
          <div className="share-people">
            {matchingUsers.map((person) => (
              <div className="share-person" key={person.id}>
                <ProfileAvatar user={person} className="share-avatar" />
                <span><strong>{person.display_name}</strong><small>@{person.username}</small></span>
                <button type="button" disabled={sendingTo !== null} onClick={() => shareWith(person)}>
                  {sendingTo === person.id ? "Sending…" : "Send"}
                </button>
              </div>
            ))}
          </div>
        ) : <p className="share-empty">No people found.</p>}
        <p className="share-note">The post text and public media links will be sent in a direct message.</p>
      </section>
    </div>
  );
}

export default SharePostDialog;
