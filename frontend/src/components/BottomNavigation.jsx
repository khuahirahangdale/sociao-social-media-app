import "./BottomNavigation.css";

const navigationItems = [
  { page: "Home", label: "Home", path: "M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5z M9 21v-7h6v7" },
  { page: "Video", label: "Video", path: "m8 5 11 7-11 7z" },
  { page: "Create", label: "Create", path: "M12 5v14 M5 12h14" },
  { page: "Inbox", label: "Inbox", path: "M4 5h16v14H4z M4 14h4l2 3h4l2-3h4" },
  { page: "Profile", label: "Profile", path: "M20 21a8 8 0 0 0-16 0 M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" },
];

function BottomNavigation({ activePage, onNavigate }) {
  return (
    <nav className="bottom-navigation" aria-label="Main navigation">
      {navigationItems.map((item) => {
        const isActive = activePage === item.page;
        const isCreate = item.page === "Create";

        return (
          <button
            className={`bottom-nav-item${isActive ? " is-active" : ""}${isCreate ? " create-nav-item" : ""}`}
            key={item.page}
            type="button"
            onClick={() => onNavigate(item.page)}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="bottom-nav-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={item.path} />
              </svg>
            </span>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNavigation;
