import "./Navbar.css";
import ProfileAvatar from "./ProfileAvatar";

function Navbar({ user, onSearch, onMessages, onNotifications, onProfile }) {
  return (
    <header className="topbar">
      <a className="brand" href="/" aria-label="Sociao home">
        <span className="brand-mark" aria-hidden="true">s</span>
        <span>sociao</span>
        <span className="brand-period">.</span>
      </a>
      <div className="topbar-actions">
        <button className="topbar-action" type="button" aria-label="Notifications" onClick={onNotifications}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4" />
          </svg>
        </button>
        <button className="topbar-action" type="button" aria-label="Search" onClick={onSearch}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.8" cy="10.8" r="6.8" />
            <path d="m16 16 4.5 4.5" />
          </svg>
        </button>
        <button className="topbar-action" type="button" aria-label="Messages" onClick={onMessages}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 11.5a8 8 0 0 1-8 8 8.5 8.5 0 0 1-3.5-.8L4 20l1.2-4A8 8 0 1 1 20 11.5z" />
          </svg>
        </button>
        <button
          className="topbar-profile"
          type="button"
          aria-label={`Your profile, ${user.name}`}
          onClick={onProfile}
        >
          <ProfileAvatar user={user} className="topbar-profile-image" />
        </button>
      </div>
    </header>
  );
}

export default Navbar;
