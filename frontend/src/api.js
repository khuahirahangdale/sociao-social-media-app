const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://127.0.0.1:8000"
    : `http://${window.location.hostname}:8000`);
const TOKEN_KEY = "sociao_access_token";

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function saveAccessToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function getErrorMessage(data, fallback) {
  if (typeof data?.detail === "string") {
    return data.detail;
  }
  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((item) => item.msg)
      .filter(Boolean)
      .join(" ");
  }
  return fallback;
}

async function request(path, { method = "GET", body, authenticated = true } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const token = authenticated ? getAccessToken() : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) {
    return null;
  }

  const responseType = response.headers.get("content-type") || "";
  const data = responseType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = getErrorMessage(
      data,
      typeof data === "string" && data ? data : `Request failed (${response.status}).`,
    );
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

export const api = {
  async signup(details) {
    return request("/auth/signup", {
      method: "POST",
      body: details,
      authenticated: false,
    });
  },

  async login(identifier, password) {
    const result = await request("/auth/login", {
      method: "POST",
      body: { identifier, password },
      authenticated: false,
    });
    saveAccessToken(result.access_token);
    return result;
  },

  getCurrentUser() {
    return request("/auth/me");
  },

  async logout() {
    try {
      await request("/auth/logout", { method: "POST" });
    } finally {
      clearAccessToken();
    }
  },

  getPosts() {
    return request("/posts");
  },

  getVideos() {
    return request("/posts/videos");
  },

  createPost(post) {
    return request("/posts", {
      method: "POST",
      body: typeof post === "string" ? { content: post } : post,
    });
  },

  updatePost(postId, post) {
    return request(`/posts/${postId}`, { method: "PATCH", body: post });
  },

  deletePost(postId) {
    return request(`/posts/${postId}`, { method: "DELETE" });
  },

  getMyPosts() {
    return request("/posts/me");
  },

  getSavedPosts() {
    return request("/posts/saved");
  },

  bookmarkPost(postId) {
    return request(`/posts/${postId}/bookmark`, { method: "POST" });
  },

  unbookmarkPost(postId) {
    return request(`/posts/${postId}/bookmark`, { method: "DELETE" });
  },

  likePost(postId) {
    return request(`/posts/${postId}/like`, { method: "POST" });
  },

  unlikePost(postId) {
    return request(`/posts/${postId}/like`, { method: "DELETE" });
  },

  addVideoView(postId) {
    return request(`/posts/${postId}/view`, { method: "POST" });
  },

  getStories() {
    return request("/stories");
  },

  createStory(story) {
    return request("/stories", { method: "POST", body: story });
  },

  viewStory(storyId) {
    return request(`/stories/${storyId}/view`, { method: "POST" });
  },

  likeStory(storyId) {
    return request(`/stories/${storyId}/like`, { method: "POST" });
  },

  unlikeStory(storyId) {
    return request(`/stories/${storyId}/like`, { method: "DELETE" });
  },

  getComments(postId) {
    return request(`/posts/${postId}/comments`);
  },

  createComment(postId, content, parentId = null) {
    return request(`/posts/${postId}/comments`, {
      method: "POST",
      body: { content, parent_id: parentId },
    });
  },

  likeComment(commentId) {
    return request(`/comments/${commentId}/like`, { method: "POST" });
  },

  unlikeComment(commentId) {
    return request(`/comments/${commentId}/like`, { method: "DELETE" });
  },

  getUsers(search = "") {
    return request(`/users${search ? `?search=${encodeURIComponent(search)}` : ""}`);
  },

  getUserProfile(userId) {
    return request(`/users/${userId}`);
  },

  getFollowers(search = "") {
    return request(`/users/me/followers?search=${encodeURIComponent(search)}`);
  },

  getFollowing(search = "") {
    return request(`/users/me/following?search=${encodeURIComponent(search)}`);
  },

  followUser(userId) {
    return request(`/users/${userId}/follow`, { method: "POST" });
  },

  unfollowUser(userId) {
    return request(`/users/${userId}/follow`, { method: "DELETE" });
  },

  removeFollower(userId) {
    return request(`/users/me/followers/${userId}`, { method: "DELETE" });
  },

  updateProfile(profile) {
    return request("/auth/me", { method: "PATCH", body: profile });
  },

  updateSettings(settings) {
    return request("/auth/settings", { method: "PATCH", body: settings });
  },

  getConversations() {
    return request("/messages/conversations");
  },

  openConversation(userId) {
    return request(`/messages/conversations/with/${userId}`, { method: "POST" });
  },

  getConversationMessages(conversationId) {
    return request(`/messages/conversations/${conversationId}`);
  },

  sendMessage(conversationId, content) {
    return request(`/messages/conversations/${conversationId}`, {
      method: "POST",
      body: { content },
    });
  },

  heartMessage(messageId) {
    return request(`/messages/${messageId}/heart`, { method: "POST" });
  },

  unheartMessage(messageId) {
    return request(`/messages/${messageId}/heart`, { method: "DELETE" });
  },
};
