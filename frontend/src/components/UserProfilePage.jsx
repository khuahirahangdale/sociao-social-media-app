import { useEffect, useState } from "react";
import { api } from "../api";
import PostCard from "./PostCard";
import ProfileAvatar from "./ProfileAvatar";
import "./UserProfilePage.css";

const tabs = ["Posts", "Video", "Tagged"];

function UserProfilePage({
  userId,
  onBack,
  onMessage,
  onLike,
  onBookmark,
  onShare,
  onComments,
  onNotice,
  onAuthorClick,
  busyLikeIds,
  currentUserId,
  onEdit,
  onDelete,
  onOpenVideo,
}) {
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("Posts");
  const [loadedUserId, setLoadedUserId] = useState(null);
  const [error, setError] = useState("");
  const [isFollowBusy, setIsFollowBusy] = useState(false);
  const isLoading = loadedUserId !== userId;

  useEffect(() => {
    let active = true;
    api.getUserProfile(userId)
      .then((result) => {
        if (active) {
          setProfile(result);
          setError("");
          setLoadedUserId(userId);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError.message);
          setLoadedUserId(userId);
        }
      });
    return () => {
      active = false;
    };
  }, [userId]);

  async function toggleFollow() {
    if (!profile || isFollowBusy) return;
    setIsFollowBusy(true);
    try {
      const result = profile.is_following
        ? await api.unfollowUser(profile.id)
        : await api.followUser(profile.id);
      setProfile((current) => ({
        ...current,
        is_following: result.following,
        follower_count: Math.max(0, current.follower_count + (result.following ? 1 : -1)),
      }));
    } catch (followError) {
      setError(followError.message);
    } finally {
      setIsFollowBusy(false);
    }
  }

  async function togglePostLike(post) {
    const result = await onLike(post);
    if (!result) return;
    setProfile((current) => ({
      ...current,
      posts: current.posts.map((item) =>
        item.id === post.id
          ? { ...item, is_liked: result.liked, like_count: result.like_count }
          : item,
      ),
    }));
  }

  async function togglePostBookmark(post) {
    const wasBookmarked = post.is_bookmarked;
    const succeeded = await onBookmark(post);
    if (!succeeded) return;
    setProfile((current) => ({
      ...current,
      posts: current.posts.map((item) =>
        item.id === post.id ? { ...item, is_bookmarked: !wasBookmarked } : item,
      ),
    }));
  }

  if (isLoading) return <p className="loading-state">Loading profile…</p>;
  if (error && !profile) {
    return (
      <section className="public-profile-page">
        <header className="public-profile-heading"><button type="button" onClick={onBack} aria-label="Back">‹</button><h1>Profile</h1></header>
        <p className="public-profile-error" role="alert">{error}</p>
      </section>
    );
  }
  if (!profile) return null;

  const videos = profile.posts.filter((post) => post.video_url);
  const visiblePosts = activeTab === "Video" ? videos : profile.posts;

  return (
    <section className="public-profile-page">
      <header className="public-profile-heading">
        <button type="button" onClick={onBack} aria-label="Back">‹</button>
        <h1>{profile.username}</h1>
      </header>
      <div className="public-profile-summary">
        <div className="public-profile-top">
          <ProfileAvatar user={profile} className="public-profile-avatar" />
          <div className="public-profile-stats">
            <span><strong>{profile.posts.length}</strong><small>posts</small></span>
            <span><strong>{profile.follower_count}</strong><small>followers</small></span>
            <span><strong>{profile.following_count}</strong><small>following</small></span>
          </div>
        </div>
        <h2>{profile.display_name}</h2>
        <p className="public-profile-handle">@{profile.username}</p>
        {profile.bio && <p className="public-profile-bio">{profile.bio}</p>}
        {profile.website && <a className="public-profile-website" href={profile.website} target="_blank" rel="noreferrer">{profile.website}</a>}
        <div className="public-profile-actions">
          <button type="button" disabled={isFollowBusy} onClick={toggleFollow}>
            {isFollowBusy ? "Please wait…" : profile.is_following ? "Following" : "Follow"}
          </button>
          <button type="button" onClick={() => onMessage(profile)}>Message</button>
        </div>
        {error && <p className="public-profile-error" role="alert">{error}</p>}
      </div>
      <div className="public-profile-tabs" role="tablist" aria-label="Profile content">
        {tabs.map((tab) => (
          <button type="button" role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? "is-active" : ""} key={tab} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>
      {activeTab === "Tagged" ? (
        <p className="public-profile-empty">No tagged posts yet.</p>
      ) : activeTab === "Video" ? (
        videos.length ? (
          <div className="public-video-grid">
            {videos.map((post) => (
              <button type="button" className="public-video-tile" key={post.id} onClick={() => onOpenVideo(post.id)}>
                <video src={post.video_url} muted playsInline preload="metadata" />
                <span>▷ {post.view_count} views</span>
              </button>
            ))}
          </div>
        ) : <p className="public-profile-empty">No videos yet.</p>
      ) : visiblePosts.length ? (
        <div className="post-list public-profile-posts">
          {visiblePosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              user={post.author}
              onLike={() => togglePostLike(post)}
              isLikeBusy={busyLikeIds.has(post.id)}
              isBookmarked={post.is_bookmarked}
              onBookmark={() => togglePostBookmark(post)}
              onComment={() => onComments(post)}
              onShare={() => onShare(post)}
              onNotice={onNotice}
              onAuthorClick={() => onAuthorClick(post.author.id)}
              isOwnPost={profile.id === currentUserId}
              onEdit={(content) => onEdit(post, content)}
              onDelete={() => onDelete(post)}
              onSaveFromMenu={() => togglePostBookmark(post)}
            />
          ))}
        </div>
      ) : <p className="public-profile-empty">No posts yet.</p>}
    </section>
  );
}

export default UserProfilePage;
