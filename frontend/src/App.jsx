import { useEffect, useMemo, useRef, useState } from "react";
import { api, clearAccessToken, getAccessToken } from "./api";
import {
  ConnectionsPage,
  EditProfilePage,
  SettingsPage,
} from "./components/AccountScreens";
import BottomNavigation from "./components/BottomNavigation";
import CommentsSheet from "./components/CommentsSheet";
import CreatePost from "./components/CreatePost";
import FeaturePlaceholder from "./components/FeaturePlaceholder";
import AuthScreen from "./components/AuthScreen";
import MessagesPage from "./components/MessagesPage";
import Navbar from "./components/Navbar";
import PostCard from "./components/PostCard";
import ProfilePage from "./components/ProfilePage";
import SearchPage from "./components/SearchPage";
import SharePostDialog from "./components/SharePostDialog";
import StoriesRow from "./components/StoriesRow";
import StoryViewer from "./components/StoryViewer";
import UserProfilePage from "./components/UserProfilePage";
import VideoViewer from "./components/VideoViewer";
import "./App.css";

const avatarColors = ["lavender", "peach", "mint"];

function decorateUser(user) {
  const initials = user.display_name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return {
    ...user,
    name: user.display_name,
    handle: `@${user.username}`,
    initials,
    color: avatarColors[user.id % avatarColors.length],
  };
}

function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [feedPosts, setFeedPosts] = useState(null);
  const [profilePosts, setProfilePosts] = useState(null);
  const [stories, setStories] = useState([]);
  const [videos, setVideos] = useState([]);
  const [feedError, setFeedError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [actionError, setActionError] = useState("");
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [activePage, setActivePage] = useState("Home");
  const [previousPage, setPreviousPage] = useState("Home");
  const [activeStory, setActiveStory] = useState(null);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [initialConversation, setInitialConversation] = useState(null);
  const [publicProfileUserId, setPublicProfileUserId] = useState(null);
  const [postToShare, setPostToShare] = useState(null);
  const [initialVideoId, setInitialVideoId] = useState(null);
  const [busyLikeIds, setBusyLikeIds] = useState(() => new Set());
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const busyLikeIdsRef = useRef(new Set());
  const viewedVideoIdsRef = useRef(new Set());
  const toastTimerRef = useRef(null);
  const [feedRetry, setFeedRetry] = useState(0);
  const [profileRetry, setProfileRetry] = useState(0);
  const currentUser = user ? decorateUser(user) : null;
  const bookmarkedPostIds = useMemo(
    () => (feedPosts || []).filter((post) => post.is_bookmarked).map((post) => post.id),
    [feedPosts],
  );

  function showToast(message) {
    setToast(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 3000);
  }

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      if (!getAccessToken()) {
        setCheckingSession(false);
        return;
      }
      try {
        const restoredUser = await api.getCurrentUser();
        if (active) setUser(restoredUser);
      } catch {
        clearAccessToken();
      } finally {
        if (active) setCheckingSession(false);
      }
    }
    restoreSession();
    return () => {
      active = false;
      window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    Promise.all([api.getPosts(), api.getStories()])
      .then(([posts, activeStories]) => {
        if (!active) return;
        setFeedPosts(posts);
        setStories(activeStories);
        setFeedError("");
      })
      .catch((error) => {
        if (active) {
          setFeedPosts([]);
          setFeedError(error.message);
        }
      });
    return () => {
      active = false;
    };
  }, [user, feedRetry]);

  useEffect(() => {
    if (!user || activePage !== "Profile") return undefined;
    let active = true;
    api.getMyPosts()
      .then((posts) => {
        if (active) {
          setProfilePosts(posts);
          setProfileError("");
        }
      })
      .catch((error) => {
        if (active) {
          setProfilePosts([]);
          setProfileError(error.message);
        }
      });
    return () => {
      active = false;
    };
  }, [user, activePage, profileRetry]);

  useEffect(() => {
    if (!user || activePage !== "Video") return undefined;
    let active = true;
    api.getVideos()
      .then((items) => {
        if (active) setVideos(items);
      })
      .catch((error) => {
        if (active) {
          setVideos([]);
          setActionError(error.message);
        }
      });
    return () => {
      active = false;
    };
  }, [user, activePage]);

  const visiblePosts = useMemo(() => {
    const sourcePosts = feedPosts || [];
    const query = search.trim().toLowerCase();
    if (!query) return sourcePosts;
    return sourcePosts.filter((post) =>
      post.content.toLowerCase().includes(query) ||
      post.author.display_name.toLowerCase().includes(query) ||
      post.author.username.toLowerCase().includes(query),
    );
  }, [feedPosts, search]);

  async function finishLogin(identifier, password) {
    await api.login(identifier, password);
    try {
      const currentUserResponse = await api.getCurrentUser();
      setUser(currentUserResponse);
      setActivePage("Home");
      setFeedPosts(null);
      setProfilePosts(null);
      setFeedError("");
      setProfileError("");
      setSearch("");
      setActionError("");
    } catch (error) {
      clearAccessToken();
      throw error;
    }
  }

  async function handleSignup(details) {
    const localPart = details.email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 38);
    const username = `${localPart || "sociao"}_${Math.random().toString(36).slice(2, 7)}`;
    await api.signup({ ...details, username });
    await finishLogin(username, details.password);
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await api.logout();
    } catch (error) {
      showToast(`Signed out locally. Server logout failed: ${error.message}`);
    } finally {
      clearAccessToken();
      setUser(null);
      setActivePage("Home");
      setSearch("");
      setFeedPosts(null);
      setProfilePosts(null);
      setStories([]);
      setIsLoggingOut(false);
    }
  }

  async function addPost(post) {
    setActionError("");
    const newPost = await api.createPost(post);
    setFeedPosts((items) => [newPost, ...(items || [])]);
    setProfilePosts((items) => items ? [newPost, ...items] : items);
    setSearch("");
    setActivePage("Home");
  }

  async function toggleStoryLike(story) {
    try {
      const result = story.is_liked
        ? await api.unlikeStory(story.id)
        : await api.likeStory(story.id);
      setStories((items) => items.map((item) =>
        item.id === story.id
          ? { ...item, is_liked: result.liked, like_count: result.like_count }
          : item,
      ));
      setActiveStory((current) => current?.id === story.id
        ? { ...current, is_liked: result.liked, like_count: result.like_count }
        : current);
    } catch (error) {
      showToast(error.message);
    }
  }

  async function editPost(post, content) {
    setActionError("");
    try {
      const updatedPost = await api.updatePost(post.id, {
        content,
        image_url: post.image_url,
        video_url: post.video_url,
        audio_url: post.audio_url,
        music_line: post.music_line,
      });
      const update = (items) => items?.map((item) =>
        item.id === post.id ? updatedPost : item,
      );
      setFeedPosts(update);
      setProfilePosts(update);
      setVideos(update);
      return true;
    } catch (error) {
      setActionError(error.message);
      return false;
    }
  }

  async function deletePost(post) {
    setActionError("");
    try {
      await api.deletePost(post.id);
      const remove = (items) => items?.filter((item) => item.id !== post.id);
      setFeedPosts(remove);
      setProfilePosts(remove);
      setVideos(remove);
      if (activeCommentPost?.id === post.id) setActiveCommentPost(null);
      return true;
    } catch (error) {
      setActionError(error.message);
      return false;
    }
  }

  async function toggleLike(post) {
    if (busyLikeIdsRef.current.has(post.id)) return;
    busyLikeIdsRef.current.add(post.id);
    setBusyLikeIds(new Set(busyLikeIdsRef.current));
    setActionError("");
    try {
      const result = post.is_liked
        ? await api.unlikePost(post.id)
        : await api.likePost(post.id);
      const update = (items) => items?.map((item) =>
        item.id === post.id
          ? { ...item, is_liked: result.liked, like_count: result.like_count }
          : item,
      );
      setFeedPosts(update);
      setProfilePosts(update);
      setVideos(update);
      return result;
    } catch (error) {
      setActionError(error.message);
      return null;
    } finally {
      busyLikeIdsRef.current.delete(post.id);
      setBusyLikeIds(new Set(busyLikeIdsRef.current));
    }
  }

  async function toggleBookmark(post) {
    try {
      const isBookmarked = post.is_bookmarked ?? bookmarkedPostIds.includes(post.id);
      if (isBookmarked) await api.unbookmarkPost(post.id);
      else await api.bookmarkPost(post.id);
      const update = (items) => items?.map((item) =>
        item.id === post.id ? { ...item, is_bookmarked: !isBookmarked } : item,
      );
      setFeedPosts(update);
      setProfilePosts(update);
      setVideos(update);
      return true;
    } catch (error) {
      setActionError(error.message);
      return false;
    }
  }

  function updateCommentCount(postId, count) {
    const update = (items) => items?.map((post) =>
      post.id === postId ? { ...post, comment_count: count } : post,
    );
    setFeedPosts(update);
    setProfilePosts(update);
    setVideos(update);
  }

  function sharePost(post) {
    setPostToShare(post);
  }

  function openUserProfile(userId) {
    setPreviousPage(activePage);
    setPublicProfileUserId(userId);
    setActivePage("UserProfile");
  }

  function openVideo(postId) {
    setPreviousPage(activePage);
    setInitialVideoId(postId);
    setActivePage("Video");
  }

  function navigateTo(page) {
    if (["Video", "Settings", "EditProfile", "Followers", "Following", "Search", "UserProfile"].includes(page)) {
      setPreviousPage(activePage);
    }
    setActivePage(page);
    if (page === "Video") setInitialVideoId(null);
    if (page === "Profile") {
      setProfilePosts(null);
      setProfileError("");
      setProfileRetry((attempt) => attempt + 1);
    }
    if (page === "Create") setActionError("");
  }

  async function addStory(story) {
    const newStory = await api.createStory({
      ...story,
      audio_url: story.video_url ? story.audio_url || "/audio/soft-loop.wav" : story.audio_url,
      music_line: story.video_url ? story.music_line || "Soft ambient music" : story.music_line,
    });
    setStories((items) => [{ ...newStory, is_liked: false, like_count: 0, is_seen: false }, ...items]);
  }

  async function viewStory(story) {
    setActiveStory(story);
    if (!story.is_seen) {
      try {
        await api.viewStory(story.id);
        setStories((items) => items.map((item) =>
          item.id === story.id ? { ...item, is_seen: true } : item,
        ));
      } catch (error) {
        showToast(error.message);
      }
    }
  }

  function moveStory(direction) {
    if (!activeStory || stories.length < 2) return;
    const currentIndex = stories.findIndex((story) => story.id === activeStory.id);
    const nextIndex = (currentIndex + direction + stories.length) % stories.length;
    viewStory(stories[nextIndex]);
  }

  async function startMessageWith(person) {
    try {
      const conversation = await api.openConversation(person.id);
      setInitialConversation(conversation);
      navigateTo("Inbox");
    } catch (error) {
      showToast(error.message);
    }
  }

  function handleAccountSaved(updatedUser) {
    setUser(updatedUser);
    navigateTo("Profile");
  }

  if (checkingSession) {
    return <main className="auth-loading">Checking your Sociao session...</main>;
  }

  if (!user) {
    return <AuthScreen onLogin={finishLogin} onSignup={handleSignup} />;
  }

  const isDark = user.theme === "dark";
  return (
    <div className="app-shell">
      <div className={`app-frame${isDark ? " theme-dark" : ""}`}>
        <Navbar
          onSearch={() => navigateTo("Search")}
          user={currentUser}
          onMessages={() => navigateTo("Inbox")}
          onNotifications={() => showToast(user.notifications_enabled ? "You’re all caught up." : "Notifications are turned off.")}
          onProfile={() => navigateTo("Profile")}
        />
        <main className="app-content">
          {actionError && (
            <div className="action-error" role="alert">
              <span>{actionError}</span>
              <button type="button" onClick={() => setActionError("")} aria-label="Dismiss error">×</button>
            </div>
          )}

          {activePage === "Home" && (
            <>
              <StoriesRow
                currentUser={currentUser}
                stories={stories}
                onAddStory={addStory}
                onStoryClick={viewStory}
              />
              <section className="feed-section" aria-label="Home feed">
                {feedPosts === null && !feedError ? (
                  <p className="loading-state">Loading your feed...</p>
                ) : feedError ? (
                  <div className="request-error" role="alert">
                    <p>We couldn&apos;t load your feed: {feedError}</p>
                    <button type="button" onClick={() => setFeedRetry((attempt) => attempt + 1)}>Try again</button>
                  </div>
                ) : visiblePosts.length ? (
                  <div className="post-list">
                    {visiblePosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        user={decorateUser(post.author)}
                        onLike={() => toggleLike(post)}
                        isLikeBusy={busyLikeIds.has(post.id)}
                        isBookmarked={bookmarkedPostIds.includes(post.id)}
                        onBookmark={() => toggleBookmark(post)}
                        onComment={() => setActiveCommentPost(post)}
                        onShare={() => sharePost(post)}
                        onNotice={showToast}
                        onAuthorClick={() => openUserProfile(post.author.id)}
                        isOwnPost={post.user_id === user.id}
                        onEdit={(content) => editPost(post, content)}
                        onDelete={() => deletePost(post)}
                        onSaveFromMenu={() => toggleBookmark(post)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <span aria-hidden="true">✦</span>
                    <h2>{search ? "No posts found" : "Your feed is quiet"}</h2>
                    <p>{search ? "Try another search." : "Share a post to start a conversation."}</p>
                  </div>
                )}
              </section>
            </>
          )}

          {activePage === "Create" && (
            <section className="create-screen">
              <div className="screen-heading">
                <h1>Create post</h1>
                <p>Share a moment with your community.</p>
              </div>
              <CreatePost user={currentUser} onSubmit={addPost} />
            </section>
          )}

          {activePage === "Search" && (
            <SearchPage
              posts={feedPosts || []}
              onViewProfile={openUserProfile}
            />
          )}

          {activePage === "UserProfile" && (
            <UserProfilePage
              userId={publicProfileUserId}
              onBack={() => navigateTo(previousPage)}
              onMessage={startMessageWith}
              onLike={toggleLike}
              onBookmark={toggleBookmark}
              onShare={sharePost}
              onComments={setActiveCommentPost}
              onNotice={showToast}
              onAuthorClick={openUserProfile}
              busyLikeIds={busyLikeIds}
              currentUserId={user.id}
              onEdit={editPost}
              onDelete={deletePost}
              onOpenVideo={openVideo}
            />
          )}

          {activePage === "Video" && (
            <VideoViewer
              videos={videos}
              onClose={() => navigateTo(previousPage)}
              onLike={toggleLike}
              onBookmark={toggleBookmark}
              onShare={sharePost}
              onComments={setActiveCommentPost}
              onAuthorClick={openUserProfile}
              onVideoPlay={(post) => {
                if (viewedVideoIdsRef.current.has(post.id)) return;
                viewedVideoIdsRef.current.add(post.id);
                api.addVideoView(post.id).then((result) => {
                  const update = (items) => items?.map((item) =>
                    item.id === post.id ? { ...item, view_count: result.view_count } : item,
                  );
                  setVideos(update);
                  setProfilePosts(update);
                }).catch((error) => showToast(error.message));
              }}
              initialVideoId={initialVideoId}
            />
          )}

          {activePage === "Inbox" && (
            <MessagesPage
              initialConversation={initialConversation}
              onConversationOpened={() => setInitialConversation(null)}
              onSettings={() => navigateTo("Settings")}
            />
          )}

          {activePage === "Profile" && (
            <ProfilePage
              user={currentUser}
              posts={profilePosts || []}
              bookmarkedPostIds={bookmarkedPostIds}
              search={search}
              isLoading={profilePosts === null && !profileError}
              error={profileError}
              onRetry={() => setProfileRetry((attempt) => attempt + 1)}
              onLike={toggleLike}
              onBookmark={(postId) => {
                const post = (feedPosts || []).find((item) => item.id === postId) ||
                  (profilePosts || []).find((item) => item.id === postId);
                if (post) toggleBookmark(post);
              }}
              onShare={sharePost}
              onComments={setActiveCommentPost}
              onNotice={showToast}
              onNavigate={navigateTo}
              busyLikeIds={busyLikeIds}
              onAuthorClick={openUserProfile}
              onEdit={editPost}
              onDelete={deletePost}
              onOpenVideo={openVideo}
            />
          )}

          {activePage === "EditProfile" && (
            <EditProfilePage
              user={currentUser}
              onBack={() => navigateTo("Profile")}
              onSaved={handleAccountSaved}
            />
          )}

          {activePage === "Settings" && (
            <SettingsPage
              user={currentUser}
              onBack={() => navigateTo(previousPage === "Inbox" ? "Inbox" : "Profile")}
              onSignOut={handleLogout}
              onUserUpdated={setUser}
              onEditProfile={() => navigateTo("EditProfile")}
              onNotice={showToast}
              isSigningOut={isLoggingOut}
            />
          )}

          {(activePage === "Followers" || activePage === "Following") && (
            <ConnectionsPage
              type={activePage}
              onBack={() => navigateTo("Profile")}
              onMessage={startMessageWith}
            />
          )}

          {activePage === "Notifications" && (
            <FeaturePlaceholder page="Inbox" />
          )}
        </main>
        {activePage !== "Video" && (
          <BottomNavigation
            activePage={["Settings", "EditProfile", "Followers", "Following", "UserProfile"].includes(activePage) ? "Profile" : ["Search"].includes(activePage) ? "Home" : activePage}
            onNavigate={(page) => page !== "Create" ? navigateTo(page) : navigateTo("Create")}
          />
        )}
        {toast && <div className="app-toast" role="status">{toast}</div>}
        {activeStory && (
          <StoryViewer
            story={activeStory}
            onClose={() => setActiveStory(null)}
            onPrevious={() => moveStory(-1)}
            onNext={() => moveStory(1)}
            onLike={toggleStoryLike}
          />
        )}
        {activeCommentPost && (
          <CommentsSheet
            post={activeCommentPost}
            user={currentUser}
            onClose={() => setActiveCommentPost(null)}
            onCountChange={updateCommentCount}
          />
        )}
        {postToShare && (
          <SharePostDialog
            post={postToShare}
            onClose={() => setPostToShare(null)}
            onShared={(person) => showToast(`Post sent to ${person.display_name}.`)}
          />
        )}
      </div>
    </div>
  );
}

export default App;
