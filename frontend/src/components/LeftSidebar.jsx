import "./LeftSidebar.css";
import ProfileAvatar from "./ProfileAvatar";

const navigationItems = [
  { label: "Home", icon: "⌂" },
  { label: "Explore", icon: "⌕" },
  { label: "Messages", icon: "✉", badge: "2" },
  { label: "Notifications", icon: "♡", badge: "3" },
  { label: "Bookmarks", icon: "▱" },
  { label: "Profile", icon: "◉" },
];

function LeftSidebar({ activePage, onNavigate, user }) {
  return (
    <aside className="left-sidebar">
      <nav className="side-navigation" aria-label="Main navigation">
        {navigationItems.map((item) => (
          <button
            className={`nav-item ${activePage === item.label ? "is-active" : ""}`}
            key={item.label}
            type="button"
            onClick={() => onNavigate(item.label)}
            aria-current={activePage === item.label ? "page" : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="nav-label">{item.label}</span>
            {item.badge && <span className="nav-badge">{item.badge}</span>}
          </button>
        ))}
      </nav>
      <button
        className="sidebar-profile"
        type="button"
        onClick={() => onNavigate("Profile")}
      >
        <ProfileAvatar user={user} className="avatar-regular" />
        <span className="sidebar-profile-copy">
          <strong>{user.name}</strong>
          <span>{user.handle}</span>
        </span>
        <span className="profile-menu" aria-hidden="true">
          ···
        </span>
      </button>
    </aside>
  );
}

export default LeftSidebar;
