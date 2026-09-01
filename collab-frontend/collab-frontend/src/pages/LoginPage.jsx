import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

function LoginPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.message || "Login failed"); setLoading(false); return; }
      localStorage.setItem("token", data.token);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/home");
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong during login");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCallback = async (response) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Google login failed"); setGoogleLoading(false); return; }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/home");
    } catch (err) {
      setError("Google login failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (!window.google) { setError("Google Sign-In is not available. Please try again."); return; }
    if (googleLoading) return;
    setGoogleLoading(true);
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleGoogleCallback,
      ux_mode: "popup",
    });
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback: render button in a hidden div and click it
        const div = document.getElementById("google-btn-login");
        if (div && window.google) {
          window.google.accounts.id.renderButton(div, {
            theme: "filled_black",
            size: "large",
            width: 320,
          });
          setTimeout(() => div.querySelector("div[role=button]")?.click(), 100);
        } else {
          setGoogleLoading(false);
        }
      }
    });
  };

  return (
    <div style={s.page}>
      {/* Ambient background */}
      <div style={s.ambient} />
      <div style={s.grid} />

      {/* Floating code preview (decorative) */}
      <div style={s.codePreview}>
        <div style={s.codePreviewHeader}>
          <span style={s.codePreviewDot1} />
          <span style={s.codePreviewDot2} />
          <span style={s.codePreviewDot3} />
          <span style={s.codePreviewTitle}>auth.ts</span>
        </div>
        <pre style={s.codePreviewBody}>
          <span style={s.kw}>async function</span>
          <span style={s.fn}> authenticate</span>
          <span style={s.tx}>(</span>
          <span style={s.param}>user</span>
          <span style={s.tx}>: </span>
          <span style={s.ty}>User</span>
          <span style={s.tx}>) {"{"}{"\n"}</span>
          <span style={s.tx}>  </span>
          <span style={s.kw}>const </span>
          <span style={s.param}>token</span>
          <span style={s.tx}> = </span>
          <span style={s.kw}>await </span>
          <span style={s.fn}>signJWT</span>
          <span style={s.tx}>(user){"\n"}</span>
          <span style={s.tx}>  </span>
          <span style={s.kw}>return </span>
          <span style={s.str}>{"{"} token {"}"}{"\n"}</span>
          <span style={s.tx}>{"}"}</span>
        </pre>
        {/* Fake cursor */}
        <div style={s.fakeCursor} />
        {/* Peer tag */}
        <div style={{ ...s.peerTag, background: "#3B82F6" }}>You</div>
      </div>

      {/* Auth card */}
      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoRow}>
          <div style={s.logoBadge}>
            <span style={s.logoSlash}>C</span>
            <span style={s.logoSlashMid}>-</span>
            <span style={s.logoSlash}>C</span>
          </div>
          <div>
            <div style={s.logoName}>Code<span style={s.logoSlashInline}>-</span>Collab</div>
            <div style={s.logoTagline}>Real-time Collaborative Studio</div>
          </div>
        </div>

        <h1 style={s.title}>Welcome back</h1>
        <p style={s.subtitle}>Sign in to your workspace</p>

        {error && (
          <div style={s.errorBanner}>
            <span style={s.errorIcon}>⚠</span>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={s.form}>
          {/* Email */}
          <div style={s.field}>
            <label style={s.label}>Email address</label>
            <div style={{ position: "relative" }}>
              <span style={s.fieldIcon}>✉</span>
              <input
                type="email"
                name="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                required
                style={{
                  ...s.input,
                  paddingLeft: "38px",
                  ...(focusedField === "email" ? s.inputFocus : {}),
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <div style={{ position: "relative" }}>
              <span style={s.fieldIcon}>🔒</span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                required
                style={{
                  ...s.input,
                  paddingLeft: "38px",
                  paddingRight: "42px",
                  ...(focusedField === "password" ? s.inputFocus : {}),
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={s.eyeBtn}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" style={s.submitBtn} disabled={loading}>
            {loading ? (
              <>
                <span style={s.spinner} />
                Authenticating...
              </>
            ) : (
              <>
                Sign in
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={s.divider}>
          <span style={s.divLine} />
          <span style={s.divText}>or continue with</span>
          <span style={s.divLine} />
        </div>

        {/* Google */}
        <button onClick={handleGoogleLogin} style={s.googleBtn} disabled={googleLoading} type="button">
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {googleLoading ? "Connecting..." : "Google"}
        </button>
        {/* Hidden Google button fallback */}
        <div id="google-btn-login" style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0, overflow: "hidden" }} />

        <p style={s.footer}>
          No account yet?{" "}
          <Link to="/register" style={s.footerLink}>Create workspace</Link>
        </p>
      </div>

      {/* Bottom brand bar */}
      <div style={s.brandBar}>
        <span style={s.brandBarText}>Code-Collab · Real-time Collaborative Studio</span>
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */
const s = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    background: "#070707",
    fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
    padding: "20px",
  },

  ambient: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    background: `
      radial-gradient(ellipse 900px 700px at 15% 15%, rgba(59,130,246,0.06) 0%, transparent 70%),
      radial-gradient(ellipse 700px 500px at 85% 80%, rgba(16,185,129,0.04) 0%, transparent 70%)
    `,
  },

  grid: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    backgroundImage: "linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)",
    backgroundSize: "48px 48px",
    opacity: 0.45,
  },

  /* Decorative code window */
  codePreview: {
    position: "fixed",
    right: "calc(50% + 240px)",
    top: "50%",
    transform: "translateY(-50%)",
    background: "#0D0D0D",
    border: "1px solid #242424",
    borderRadius: "12px",
    padding: "0",
    width: "320px",
    boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
    overflow: "hidden",
    opacity: 0,
    animation: "fade-in 0.5s ease 0.3s forwards",
    "@media (max-width: 1100px)": { display: "none" },
  },
  codePreviewHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 14px",
    borderBottom: "1px solid #1A1A1A",
    background: "#121212",
  },
  codePreviewDot1: { width: "10px", height: "10px", borderRadius: "50%", background: "#EF4444", display: "inline-block" },
  codePreviewDot2: { width: "10px", height: "10px", borderRadius: "50%", background: "#F59E0B", display: "inline-block" },
  codePreviewDot3: { width: "10px", height: "10px", borderRadius: "50%", background: "#10B981", display: "inline-block" },
  codePreviewTitle: { fontSize: "12px", color: "#8B8B8B", fontFamily: "'JetBrains Mono', monospace", marginLeft: "6px" },
  codePreviewBody: {
    padding: "16px",
    margin: 0,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "13px",
    lineHeight: "22px",
    whiteSpace: "pre",
    overflowX: "auto",
    color: "#E2E8F0",
  },
  kw:    { color: "#EC4899" },
  fn:    { color: "#3B82F6" },
  ty:    { color: "#06B6D4" },
  str:   { color: "#10B981" },
  param: { color: "#F59E0B" },
  tx:    { color: "#8B8B8B" },
  fakeCursor: {
    position: "absolute",
    bottom: "24px",
    left: "120px",
    width: "2px",
    height: "16px",
    background: "#3B82F6",
    animation: "blink 1s step-start infinite",
    borderRadius: "1px",
  },
  peerTag: {
    position: "absolute",
    bottom: "40px",
    left: "112px",
    fontSize: "10px",
    color: "#fff",
    padding: "2px 6px",
    borderRadius: "4px",
    fontFamily: "'JetBrains Mono', monospace",
    whiteSpace: "nowrap",
  },

  /* Card */
  card: {
    position: "relative",
    zIndex: 10,
    width: "100%",
    maxWidth: "420px",
    background: "rgba(18,18,18,0.9)",
    backdropFilter: "blur(24px)",
    border: "1px solid #242424",
    borderRadius: "16px",
    padding: "36px 32px",
    boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03)",
    animation: "slide-up 0.35s ease forwards",
  },

  /* Logo */
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "28px",
  },
  logoBadge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "40px",
    background: "linear-gradient(135deg, #0D0D0D 0%, #1A1A1A 100%)",
    border: "1px solid #10B981",
    borderRadius: "10px",
    boxShadow: "0 0 16px rgba(16,185,129,0.2)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "-1px",
    color: "#F5F5F5",
    flexShrink: 0,
  },
  logoSlash: { color: "#F5F5F5" },
  logoSlashMid: { color: "#10B981" },
  logoName: {
    fontSize: "14px",
    fontWeight: "800",
    color: "#F5F5F5",
    letterSpacing: "1px",
    lineHeight: 1,
  },
  logoSlashInline: {
    color: "#10B981",
  },
  logoTagline: {
    fontSize: "11px",
    color: "#4A4A4A",
    marginTop: "3px",
    letterSpacing: "0.5px",
  },

  /* Headings */
  title: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#F5F5F5",
    letterSpacing: "-0.5px",
    marginBottom: "6px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#8B8B8B",
    marginBottom: "24px",
  },

  /* Error */
  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.25)",
    color: "#EF4444",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "18px",
  },
  errorIcon: { fontSize: "14px", flexShrink: 0 },

  /* Form */
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#8B8B8B",
    letterSpacing: "0.3px",
    textTransform: "uppercase",
  },
  fieldIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "14px",
    pointerEvents: "none",
    opacity: 0.5,
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "8px",
    border: "1px solid #242424",
    background: "#0D0D0D",
    color: "#F5F5F5",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    boxSizing: "border-box",
  },
  inputFocus: {
    borderColor: "#3B82F6",
    boxShadow: "0 0 0 3px rgba(59,130,246,0.1)",
  },
  eyeBtn: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#8B8B8B",
    display: "flex",
    alignItems: "center",
    padding: "2px",
    transition: "color 0.15s",
  },

  /* Submit */
  submitBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    padding: "12px 20px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    marginTop: "4px",
    boxShadow: "0 0 20px rgba(59,130,246,0.3)",
    transition: "opacity 0.15s, box-shadow 0.15s",
    letterSpacing: "0.2px",
  },
  spinner: {
    display: "inline-block",
    width: "13px",
    height: "13px",
    border: "2px solid rgba(255,255,255,0.25)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
    flexShrink: 0,
  },

  /* Divider */
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "22px 0 18px",
  },
  divLine: {
    flex: 1,
    height: "1px",
    background: "#1A1A1A",
  },
  divText: {
    fontSize: "11px",
    color: "#4A4A4A",
    whiteSpace: "nowrap",
    letterSpacing: "0.5px",
  },

  /* Google */
  googleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    width: "100%",
    padding: "11px 20px",
    borderRadius: "8px",
    border: "1px solid #242424",
    background: "#0D0D0D",
    color: "#F5F5F5",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    marginBottom: "20px",
    transition: "border-color 0.15s, background 0.15s",
  },

  /* Footer */
  footer: {
    textAlign: "center",
    fontSize: "13px",
    color: "#8B8B8B",
  },
  footerLink: {
    color: "#10B981",
    fontWeight: "600",
    textDecoration: "none",
  },

  /* Brand bar */
  brandBar: {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 5,
  },
  brandBarText: {
    fontSize: "11px",
    color: "#4A4A4A",
    letterSpacing: "0.5px",
  },
};

export default LoginPage;
