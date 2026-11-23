import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import ProfileAvatar from "./ProfileAvatar";
import "./SearchPage.css";

function SearchPage({ posts, onViewProfile }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loadedQuery, setLoadedQuery] = useState(null);
  const [error, setError] = useState("");
  const isLoading = loadedQuery !== query;

  useEffect(() => {
    let active = true;
    api.getUsers(query.trim())
      .then((result) => {
        if (active) {
          setUsers(result);
          setError("");
          setLoadedQuery(query);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError.message);
          setLoadedQuery(query);
        }
      });
    return () => {
      active = false;
    };
  }, [query]);

  const matchingPosts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return posts.filter((post) =>
      `${post.content} ${post.author.display_name} ${post.author.username}`
        .toLowerCase()
        .includes(term),
    );
  }, [posts, query]);

  return (
    <section className="search-page">
      <header className="search-page-heading">
        <h1>Search</h1>
      </header>
      <label className="search-page-input">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        <span className="sr-only">Search people and posts</span>
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people and posts"
        />
      </label>
      {error && <p className="search-page-error" role="alert">{error}</p>}
      {query.trim() && (
        <>
          <h2 className="search-result-heading">People</h2>
          {isLoading ? <p className="search-empty">Searching people…</p> : users.length ? (
            <div className="search-people">
              {users.map((person) => (
                <button type="button" className="search-person" key={person.id} onClick={() => onViewProfile(person.id)}>
                  <ProfileAvatar user={person} className="search-person-avatar" />
                  <span><strong>{person.display_name}</strong><small>@{person.username}</small></span>
                  <span className="search-chevron" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          ) : !isLoading ? <p className="search-empty">No people found.</p> : null}
          <h2 className="search-result-heading">Posts</h2>
          {matchingPosts.length ? (
            <div className="search-posts">
              {matchingPosts.map((post) => (
                <button type="button" className="search-post" key={post.id} onClick={() => onViewProfile(post.author.id)}>
                  <ProfileAvatar user={post.author} className="search-person-avatar" />
                  <span><strong>@{post.author.username}</strong><small>{post.content || "Shared media"}</small></span>
                </button>
              ))}
            </div>
          ) : <p className="search-empty">No matching posts.</p>}
        </>
      )}
      {!query.trim() && <p className="search-empty">Find people and posts in your community.</p>}
    </section>
  );
}

export default SearchPage;
