import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import ProfileAvatar from "./ProfileAvatar";
import EmojiPicker from "./EmojiPicker";
import "./AccountScreens.css";

export function EditProfilePage({ user, onBack, onSaved }) {
  const bioRef = useRef(null);
  const [form, setForm] = useState({
    display_name: user.display_name,
    username: user.username,
    bio: user.bio || "",
    profile_picture_url: user.profile_picture_url || "",
    website: user.website || "",
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function changeField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const updatedUser = await api.updateProfile({
        ...form,
        profile_picture_url: form.profile_picture_url || null,
      });
      onSaved(updatedUser);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="account-page">
      <header className="account-heading">
        <button type="button" onClick={onBack} aria-label="Back to profile">‹</button>
        <h1>Edit profile</h1>
      </header>
      <form className="edit-profile-form" onSubmit={submit}>
        <ProfileAvatar
          key={form.profile_picture_url || "no-profile-picture"}
          user={{ ...user, ...form }}
          className="edit-profile-avatar"
        />
        <label>
          Profile photo URL
          <input name="profile_picture_url" type="url" value={form.profile_picture_url} onChange={changeField} placeholder="https://…" />
          <small className="profile-picture-help">Use a public direct image URL, not a webpage link.</small>
        </label>
        <label>
          Name
          <input name="display_name" required maxLength="100" value={form.display_name} onChange={changeField} />
        </label>
        <label>
          Username
          <input name="username" required minLength="3" maxLength="50" pattern="[A-Za-z0-9_]+" value={form.username} onChange={changeField} />
        </label>
        <label>
          Bio
          <textarea ref={bioRef} name="bio" maxLength="500" rows="3" value={form.bio} onChange={changeField} placeholder="Tell people a little about you" />
          <EmojiPicker value={form.bio} onChange={(bio) => setForm((current) => ({ ...current, bio }))} inputRef={bioRef} />
        </label>
        <label>
          Website
          <input name="website" type="url" maxLength="2048" value={form.website} onChange={changeField} placeholder="https://your-site.com" />
        </label>
        {error && <p className="account-error" role="alert">{error}</p>}
        <button className="account-primary-button" type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </button>
      </form>
    </section>
  );
}

export function SettingsPage({ user, onBack, onSignOut, onUserUpdated, onEditProfile, onNotice, isSigningOut }) {
  const [error, setError] = useState("");

  async function updateSettings(settings) {
    setError("");
    try {
      const updated = await api.updateSettings(settings);
      onUserUpdated(updated);
    } catch (updateError) {
      setError(updateError.message);
    }
  }

  return (
    <section className="account-page">
      <header className="account-heading">
        <button type="button" onClick={onBack} aria-label="Back">‹</button>
        <h1>Settings</h1>
      </header>
      {error && <p className="account-error">{error}</p>}
      <div className="settings-list">
        <button type="button" onClick={onEditProfile}>Edit profile <span>›</span></button>
        <label className="setting-choice">
          Notifications
          <input
            type="checkbox"
            checked={user.notifications_enabled}
            onChange={(event) => updateSettings({ notifications_enabled: event.target.checked })}
          />
        </label>
        <label className="setting-choice">
          Appearance
          <select value={user.theme || "light"} onChange={(event) => updateSettings({ theme: event.target.value })}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label className="setting-choice">
          Language
          <select value={user.language || "en"} onChange={(event) => updateSettings({ language: event.target.value })}>
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
          </select>
        </label>
        <button type="button" onClick={() => onNotice("Help & support: contact support@sociao.example")}>Help & support <span>›</span></button>
        <button className="settings-signout" type="button" onClick={onSignOut} disabled={isSigningOut}>
          {isSigningOut ? "Signing out…" : "Sign out"} <span>›</span>
        </button>
      </div>
    </section>
  );
}

export function ConnectionsPage({ type, onBack, onMessage }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const isFollowers = type === "Followers";

  useEffect(() => {
    let active = true;
    const fetchConnections = isFollowers ? api.getFollowers : api.getFollowing;
    fetchConnections(search)
      .then((result) => {
        if (active) {
          setUsers(result);
          setError("");
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isFollowers, search]);

  async function remove(user) {
    try {
      if (isFollowers) await api.removeFollower(user.id);
      else await api.unfollowUser(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (removeError) {
      setError(removeError.message);
    }
  }

  return (
    <section className="account-page">
      <header className="account-heading">
        <button type="button" onClick={onBack} aria-label="Back to profile">‹</button>
        <h1>{type}</h1>
      </header>
      <label className="connections-search">
        <span aria-hidden="true">⌕</span>
        <input
          value={search}
          onChange={(event) => {
            setLoading(true);
            setSearch(event.target.value);
          }}
          placeholder="Search people"
        />
      </label>
      {error && <p className="account-error">{error}</p>}
      {loading ? <p className="connections-empty">Loading…</p> : users.length ? (
        <div>
          {users.map((person) => (
            <div className="connection-row" key={person.id}>
              <ProfileAvatar
                key={person.profile_picture_url || `user-${person.id}`}
                user={person}
                className="connection-avatar"
              />
              <span className="connection-name">
                <strong>{person.display_name}</strong>
                <small>@{person.username}</small>
              </span>
              <button type="button" onClick={() => onMessage(person)}>Message</button>
              <button className="connection-remove" type="button" onClick={() => remove(person)}>
                {isFollowers ? "Remove" : "Following"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="connections-empty">No {type.toLowerCase()} found.</p>
      )}
    </section>
  );
}
