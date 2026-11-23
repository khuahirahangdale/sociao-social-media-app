import { useState } from "react";
import "./AuthScreen.css";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function AuthScreen({ onLogin, onSignup, notice }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignup = mode === "signup";
  const isFormValid =
    isValidEmail(email) &&
    password.length >= (isSignup ? 8 : 1) &&
    (!isSignup || displayName.trim().length > 0);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isFormValid) return;
    setError("");
    setIsSubmitting(true);

    try {
      if (isSignup) {
        await onSignup({ email: email.trim(), display_name: displayName.trim(), password });
      } else {
        await onLogin(email.trim(), password);
      }
    } catch (submitError) {
      setError(submitError.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setPassword("");
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <a className="brand auth-brand" href="/" aria-label="Sociao home">
          <span className="brand-mark" aria-hidden="true">s</span>
          <span>sociao</span>
          <span className="brand-period">.</span>
        </a>
        <div className="auth-heading">
          <p className="eyebrow">{isSignup ? "YOUR PEOPLE ARE HERE" : "A LITTLE MORE CONNECTED"}</p>
          <h1>{isSignup ? "Create account" : "Sign in"}</h1>
          <p className="auth-intro">
            {isSignup
              ? "Join Sociao and share the moments that matter."
              : "Welcome back. Your community is waiting."}
          </p>
        </div>
        {notice && <p className="auth-notice" role="status">{notice}</p>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {isSignup && (
            <label>
              Full name
              <input
                autoComplete="name"
                required
                maxLength="100"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your name"
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="email"
              required
              maxLength="255"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              placeholder="name@example.com"
            />
          </label>
          <label>
            Password
            <span className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
                minLength={isSignup ? 8 : 1}
                maxLength="128"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                placeholder={isSignup ? "At least 8 characters" : "Your password"}
              />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((isVisible) => !isVisible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </span>
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={!isFormValid || isSubmitting}>
            {isSubmitting
              ? "Please wait..."
              : isSignup
                ? "Create account"
                : "Log in"}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => changeMode(isSignup ? "login" : "signup")}
          >
            {isSignup ? "Sign in" : "Create account"}
          </button>
        </p>
      </section>
    </main>
  );
}

export default AuthScreen;
