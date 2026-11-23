import "./RightSidebar.css";
import ProfileAvatar from "./ProfileAvatar";

function RightSidebar({ users, trends, following, onFollow, onTrendClick }) {
  return (
    <aside className="right-sidebar">
      <section className="widget suggestions-widget">
        <div className="widget-heading">
          <h2>People to know</h2>
          <span aria-hidden="true">✦</span>
        </div>
        <div className="suggestion-list">
          {users.map((user) => {
            const isFollowing = following.includes(user.id);
            return (
              <div className="suggestion" key={user.id}>
                <ProfileAvatar user={user} />
                <div className="suggestion-copy">
                  <strong>{user.name}</strong>
                  <span>{user.handle}</span>
                </div>
                <button
                  className={`follow-button ${isFollowing ? "is-following" : ""}`}
                  type="button"
                  onClick={() => onFollow(user.id)}
                  aria-label={`${isFollowing ? "Unfollow" : "Follow"} ${user.name}`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              </div>
            );
          })}
        </div>
        <button className="widget-link" type="button">
          See everyone <span aria-hidden="true">→</span>
        </button>
      </section>

      <section className="widget trends-widget">
        <div className="widget-heading">
          <h2>Little things trending</h2>
          <span aria-hidden="true">↗</span>
        </div>
        {trends.map((trend, index) => (
          <button
            className="trend-item"
            key={trend.topic}
            type="button"
            onClick={() => onTrendClick(trend.topic)}
          >
            <span className={`trend-number trend-${trend.color}`}>0{index + 1}</span>
            <span className="trend-copy">
              <strong>#{trend.topic}</strong>
              <span>{trend.posts}</span>
            </span>
            <span className="trend-arrow" aria-hidden="true">
              ↗
            </span>
          </button>
        ))}
      </section>

      <div className="sidebar-note">
        <span aria-hidden="true">☀</span>
        <p>A little corner of the internet for good things.</p>
      </div>
    </aside>
  );
}

export default RightSidebar;
