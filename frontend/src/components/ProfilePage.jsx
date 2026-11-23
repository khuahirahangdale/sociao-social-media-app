import { useMemo, useState } from "react";
import PostCard from "./PostCard";
import ProfileAvatar from "./ProfileAvatar";
import SettingsGear from "./SettingsGear";
import "./ProfilePage.css";

const profileTabs = ["Posts", "Video", "Tagged"];

function ProfilePage({
  user,
  posts,
  bookmarkedPostIds,
  search,
  isLoading,
  error,
  onRetry,
  onLike,
  onBookmark,
  onShare,
  onComments,
  onNotice,
  onNavigate,
  busyLikeIds,
  onAuthorClick,
  onEdit,
  onDelete,
  onOpenVideo,
}) {
  const [activeTab, setActiveTab] = useState("Posts");
  const tabPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return posts;
    return posts.filter((post) =>
      post.content.toLowerCase().includes(query) ||
      post.author.display_name.toLowerCase().includes(query) ||
      post.author.username.toLowerCase().includes(query),
    );
  }, [posts, search]);
  const profileVideos = posts.filter((post) => post.video_url);

  return (
    <section className="profile-page">
      <header className="profile-header">
        <h1>Profile</h1>
        <button
          className="profile-settings-button"
          type="button"
          aria-label="Profile settings"
          onClick={() => onNavigate("Settings")}
        >
          <SettingsGear className="settings-gear-icon" />
        </button>
      </header>

      <div className="profile-summary">
        <div className="profile-summary-top">
          <ProfileAvatar
            key={user.profile_picture_url || "no-profile-picture"}
            user={user}
            className="profile-avatar"
          />
          <div className="profile-stats" aria-label="Profile statistics">
            <div><strong>{isLoading ? "…" : posts.length}</strong><span>posts</span></div>
            <button type="button" onClick={() => onNavigate("Followers")}>
              <strong>{user.follower_count ?? 0}</strong><span>followers</span>
            </button>
            <button type="button" onClick={() => onNavigate("Following")}>
              <strong>{user.following_count ?? 0}</strong><span>following</span>
            </button>
          </div>
        </div>
        <div className="profile-identity">
          <h2>{user.display_name}</h2>
          <p>@{user.username}</p>
          {user.bio && <p className="profile-bio">{user.bio}</p>}
          {user.website && (
            <a className="profile-website" href={user.website} target="_blank" rel="noreferrer">
              {user.website}
            </a>
          )}
        </div>
        <div className="profile-buttons">
          <button type="button" onClick={() => onNavigate("EditProfile")}>Edit profile</button>
        </div>
      </div>

      <div className="profile-tabs" role="tablist" aria-label="Profile content">
        {profileTabs.map((tab) => (
          <button
            className={activeTab === tab ? "is-active" : ""}
            key={tab}
            id={`profile-tab-${tab.toLowerCase()}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Video" && profileVideos.length ? (
        <div className="profile-video-grid">
          {profileVideos.map((post) => (
            <button className="profile-video-tile" key={post.id} type="button" onClick={() => onOpenVideo(post.id)}>
              <video src={post.video_url} muted playsInline preload="metadata" />
              <span>▷ {post.view_count} views</span>
            </button>
          ))}
        </div>
      ) : activeTab === "Video" || activeTab === "Tagged" ? (
        <div className="profile-empty">
          <span aria-hidden="true">{activeTab === "Video" ? "▷" : "@"}</span>
          <h2>{activeTab === "Video" ? "No videos yet" : "No tagged posts yet"}</h2>
          <p>
            {activeTab === "Video"
              ? "Videos you share will appear here."
              : "Posts you are tagged in will appear here."}
          </p>
        </div>
      ) : isLoading && activeTab === "Posts" ? (
        <p className="loading-state">Loading your posts...</p>
      ) : error && activeTab === "Posts" ? (
        <div className="request-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={onRetry}>Try again</button>
        </div>
      ) : tabPosts.length === 0 ? (
        <div className="profile-empty">
          <span aria-hidden="true">▦</span>
          <h2>Share your first post</h2>
          <p>Your posts will appear here on your profile.</p>
        </div>
      ) : (
        <div className="post-list profile-post-list">
          {tabPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              user={post.author ? {
                ...post.author,
                name: post.author.display_name,
                handle: `@${post.author.username}`,
                initials: post.author.display_name
                  .split(/\s+/)
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase(),
                color: user.color,
              } : user}
              onLike={() => onLike(post)}
              isLikeBusy={busyLikeIds.has(post.id)}
              isBookmarked={bookmarkedPostIds.includes(post.id)}
              onBookmark={() => onBookmark(post.id)}
              onComment={() => onComments(post)}
              onShare={() => onShare(post)}
              onNotice={onNotice}
              onAuthorClick={() => onAuthorClick(post.author.id)}
              isOwnPost
              onEdit={(content) => onEdit(post, content)}
              onDelete={() => onDelete(post)}
              onSaveFromMenu={() => onBookmark(post.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default ProfilePage;
