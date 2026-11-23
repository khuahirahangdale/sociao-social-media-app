import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import ProfileAvatar from "./ProfileAvatar";
import SettingsGear from "./SettingsGear";
import EmojiPicker from "./EmojiPicker";
import "./MessagesPage.css";

function shortTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function MessagesPage({ initialConversation, onConversationOpened, onSettings }) {
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef(null);
  const draftInputRef = useRef(null);

  async function loadConversations() {
    setIsLoading(true);
    try {
      const [conversationList, userList] = await Promise.all([
        api.getConversations(),
        api.getUsers(),
      ]);
      setConversations(conversationList);
      setUsers(userList);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([api.getConversations(), api.getUsers()])
      .then(([conversationList, userList]) => {
        if (!active) return;
        setConversations(conversationList);
        setUsers(userList);
        setError("");
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

  async function openConversation(conversation) {
    try {
      const result = await api.getConversationMessages(conversation.id);
      setMessages(result.messages);
      setActiveConversation(conversation);
      setShowNewMessage(false);
      setConversations((items) => items.map((item) =>
        item.id === conversation.id ? { ...item, unread: false, unread_count: 0 } : item,
      ));
      onConversationOpened?.();
    } catch (openError) {
      setError(openError.message);
    }
  }

  useEffect(() => {
    if (!initialConversation) return undefined;
    let active = true;
    api.getConversationMessages(initialConversation.id)
      .then((result) => {
        if (!active) return;
        setMessages(result.messages);
        setActiveConversation(initialConversation);
        setShowNewMessage(false);
        setConversations((items) => items.map((item) =>
          item.id === initialConversation.id ? { ...item, unread: false, unread_count: 0 } : item,
        ));
        onConversationOpened?.();
      })
      .catch((openError) => {
        if (active) setError(openError.message);
      });
    return () => {
      active = false;
    };
  }, [initialConversation, onConversationOpened]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, activeConversation]);

  async function startConversation(user) {
    try {
      const conversation = await api.openConversation(user.id);
      await loadConversations();
      await openConversation(conversation);
    } catch (startError) {
      setError(startError.message);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!draft.trim() || !activeConversation) return;
    setIsSending(true);
    setError("");
    try {
      const message = await api.sendMessage(activeConversation.id, draft.trim());
      setMessages((items) => [...items, message]);
      setDraft("");
      await loadConversations();
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setIsSending(false);
    }
  }

  async function toggleHeart(message) {
    try {
      const result = message.hearted
        ? await api.unheartMessage(message.id)
        : await api.heartMessage(message.id);
      setMessages((items) => items.map((item) =>
        item.id === message.id ? { ...item, hearted: result.hearted } : item,
      ));
    } catch (reactionError) {
      setError(reactionError.message);
    }
  }

  const filteredConversations = conversations.filter((conversation) =>
    `${conversation.other_user.display_name} ${conversation.other_user.username}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const filteredUsers = users.filter((user) =>
    `${user.display_name} ${user.username}`.toLowerCase().includes(search.toLowerCase()),
  );

  if (activeConversation) {
    return (
      <section className="chat-thread">
        <header className="chat-header">
          <button type="button" className="chat-back" onClick={() => setActiveConversation(null)} aria-label="Back to inbox">‹</button>
          <ProfileAvatar user={activeConversation.other_user} className="chat-avatar" />
          <div className="chat-user">
            <strong>{activeConversation.other_user.display_name}</strong>
            <span>@{activeConversation.other_user.username}</span>
          </div>
          <button type="button" className="chat-tool" aria-label="Voice call coming soon" onClick={() => setError("Voice calls are not available yet.")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7.2 3.5h2.4l1.2 4.1-1.6 1.6a15 15 0 0 0 5.6 5.6l1.6-1.6 4.1 1.2v2.4a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 5.2 5.7a2 2 0 0 1 2-2.2z" />
            </svg>
          </button>
          <button type="button" className="chat-tool" aria-label="Video call coming soon" onClick={() => setError("Video calls are not available yet.")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="6" width="13" height="12" rx="2" />
              <path d="m16 10 5-3v10l-5-3z" />
            </svg>
          </button>
        </header>
        <div className="chat-messages">
          {messages.map((message) => (
            <div className={`chat-message-row ${message.is_mine ? "is-mine" : ""}`} key={message.id}>
              <button
                type="button"
                className={`chat-bubble ${message.is_mine ? "is-mine" : ""}`}
                onDoubleClick={() => toggleHeart(message)}
                aria-label={`${message.content}. Double tap to react with a heart.`}
              >
                {message.content}
              </button>
              <button
                type="button"
                className={`message-heart ${message.hearted ? "is-active" : ""}`}
                onClick={() => toggleHeart(message)}
                aria-label={message.hearted ? "Remove heart reaction" : "Heart message"}
              >
                {message.hearted ? "♥" : "♡"}
              </button>
              <time>{shortTime(message.created_at)}</time>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        {error && <p className="messages-error" role="alert">{error}</p>}
        <form className="chat-composer" onSubmit={sendMessage}>
          <input ref={draftInputRef} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Message…" aria-label="Message" maxLength="4000" />
          <EmojiPicker value={draft} onChange={setDraft} inputRef={draftInputRef} />
          <button type="submit" disabled={!draft.trim() || isSending}>{isSending ? "…" : "Send"}</button>
        </form>
      </section>
    );
  }

  return (
    <section className="inbox-page">
      <header className="inbox-heading">
        <h1>Messages</h1>
        <button type="button" aria-label="Settings" onClick={onSettings}>
          <SettingsGear className="settings-gear-icon" />
        </button>
        <button type="button" aria-label="New message" onClick={() => setShowNewMessage((open) => !open)}>＋</button>
      </header>
      <label className="inbox-search">
        <span aria-hidden="true">⌕</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" />
      </label>
      {showNewMessage && (
        <div className="new-message-panel">
          <h2>Start a conversation</h2>
          {filteredUsers.length ? filteredUsers.map((user) => (
            <button type="button" className="inbox-row" key={user.id} onClick={() => startConversation(user)}>
              <ProfileAvatar user={user} className="inbox-avatar" />
              <span className="inbox-row-copy"><strong>{user.display_name}</strong><small>@{user.username}</small></span>
              <span className="inbox-row-action">Message</span>
            </button>
          )) : <p className="inbox-empty">No people found.</p>}
        </div>
      )}
      {error && <p className="messages-error" role="alert">{error}</p>}
      {isLoading ? <p className="inbox-empty">Loading messages…</p> : filteredConversations.length ? (
        <div className="conversation-list">
          {filteredConversations.map((conversation) => (
            <button className="inbox-row" type="button" key={conversation.id} onClick={() => openConversation(conversation)}>
              <ProfileAvatar user={conversation.other_user} className="inbox-avatar" />
              <span className="inbox-row-copy">
                <strong>{conversation.other_user.display_name}</strong>
                <small>{conversation.last_message}</small>
              </span>
              <span className="inbox-row-meta">
                <time>{shortTime(conversation.last_message_at)}</time>
                {conversation.unread && <i aria-label="Unread messages" />}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="inbox-empty">
          <span aria-hidden="true">✉</span>
          <h2>Your messages</h2>
          <p>Start a conversation with someone in your community.</p>
          <button type="button" onClick={() => setShowNewMessage(true)}>New message</button>
        </div>
      )}
    </section>
  );
}

export default MessagesPage;
