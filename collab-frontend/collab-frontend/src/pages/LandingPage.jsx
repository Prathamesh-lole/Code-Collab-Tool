import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ── Decorative active-session peers ── */
const ACTIVE_SESSIONS = [
  { name: "Sarah",      file: "auth.ts",        color: "#EC4899" },
  { name: "Alex",       file: "auth.ts",        color: "#06B6D4" },
  { name: "Prathamesh", file: "syncEngine.ts",  color: "#10B981" },
  { name: "Jordan",     file: "README.md",       color: "#F59E0B" },
];

/* ── Fake avatar URLs (coloured initials) ── */
function Avatar({ name, color, size = 28 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        border: "2px solid #0A0A0A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {name[0]}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [heroVisible, setHeroVisible] = useState(false);

  /* ── Subtle ambient canvas particle layer ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    let particles = [];

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 55; i++) {
      particles.push({
        x:  Math.random() * window.innerWidth,
        y:  Math.random() * window.innerHeight,
        r:  Math.random() * 1.4 + 0.3,
        dx: (Math.random() - 0.5) * 0.25,
        dy: (Math.random() - 0.5) * 0.25,
        o:  Math.random() * 0.35 + 0.05,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.o})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width)  p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  /* ── Cursor glow follow ── */
  useEffect(() => {
    const move = (e) => setCursorPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  /* ── Entry animation ── */
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={s.page}>
      {/* Particle canvas */}
      <canvas ref={canvasRef} style={s.canvas} />

      {/* Cursor radial glow */}
      <div
        style={{
          ...s.cursorGlow,
          left: cursorPos.x - 300,
          top:  cursorPos.y - 300,
        }}
      />

      {/* Ambient radial gradients */}
      <div style={s.ambient} />

      {/* ── Navbar ── */}
      <nav style={s.navbar}>
        <div style={s.navBrand}>
          <div style={s.navLogo}>
            <span style={{ color: "#fff" }}>C</span>
            <span style={{ color: "#10B981" }}>-</span>
            <span style={{ color: "#fff" }}>C</span>
          </div>
          <span style={s.navBrandName}>Code-Collab</span>
        </div>

        <div style={s.navLinks}>
          <a href="#features" style={s.navLink}>Features</a>
          <a href="#" style={s.navLink}>Docs</a>
          <a href="#" style={s.navLink}>Pricing</a>
        </div>

        <div style={s.navActions}>
          <button onClick={() => navigate("/login")} style={s.navSignIn}>
            Sign in
          </button>
          <button onClick={() => navigate("/login")} style={s.navGetStarted}>
            Get started
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <main
        style={{
          ...s.hero,
          opacity:   heroVisible ? 1 : 0,
          transform: heroVisible ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}
      >
        {/* Status pill */}
        <div style={s.statusPill}>
          <span style={s.statusDot} />
          <span style={s.statusText}>4 collaborators online</span>
          <span style={s.statusDivider}>|</span>
          {/* Overlapping avatars */}
          <div style={s.pillAvatars}>
            {ACTIVE_SESSIONS.map((p, i) => (
              <div key={p.name} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i, position: "relative" }}>
                <Avatar name={p.name} color={p.color} size={22} />
              </div>
            ))}
          </div>
          <span style={s.statusMesh}>Zero-Latency Mesh</span>
        </div>

        {/* Main headline */}
        <h1 style={s.headline}>
          Code together.<br />
          Ship together.
        </h1>

        {/* Sub-headline */}
        <p style={s.subheadline}>
          A real-time collaborative workspace where developers write, review, and build<br />
          software together with live multi-cursor synchronization, threaded reviews, and<br />
          instant sandboxes.
        </p>

        {/* CTA buttons */}
        <div style={s.ctaRow}>
          <button
            onClick={() => navigate("/login")}
            style={s.ctaPrimary}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#0ea572";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 0 32px rgba(16,185,129,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#10B981";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 0 24px rgba(16,185,129,0.35)";
            }}
          >
            Start Collaborating
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 4 }}>
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>

          <button
            onClick={() => {
              const el = document.getElementById("features");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            style={s.ctaSecondary}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#3A3A3A";
              e.currentTarget.style.background = "#161616";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#242424";
              e.currentTarget.style.background = "#0F0F0F";
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <polyline points="16 18 22 12 16 6"/>
              <polyline points="8 6 2 12 8 18"/>
            </svg>
            Explore Workspace
          </button>
        </div>

        {/* Active sessions bar */}
        <div style={s.sessionsBar}>
          <span style={s.sessionsLabel}>ACTIVE SESSIONS:</span>
          {ACTIVE_SESSIONS.map((peer) => (
            <div key={peer.name} style={s.sessionChip}>
              <span style={{ ...s.sessionDot, background: peer.color }} />
              <span style={{ ...s.sessionName, color: peer.color }}>{peer.name}</span>
              <span style={s.sessionFile}> — {peer.file}</span>
            </div>
          ))}
        </div>
      </main>

      {/* ── Features section ── */}
      <section id="features" style={s.features}>
        <div style={s.featuresGrid}>
          {FEATURES.map((f, i) => (
            <div key={i} style={s.featureCard}>
              <div style={{ ...s.featureIcon, color: f.color }}>
                {f.icon}
              </div>
              <div style={s.featureTitle}>{f.title}</div>
              <div style={s.featureDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={s.footer}>
        <div style={s.footerBrand}>
          <div style={s.navLogo}>
            <span style={{ color: "#fff" }}>C</span>
            <span style={{ color: "#10B981" }}>-</span>
            <span style={{ color: "#fff" }}>C</span>
          </div>
          <span style={{ ...s.navBrandName, fontSize: "13px", color: "#4A4A4A" }}>Code-Collab</span>
        </div>
        <span style={s.footerText}>Real-time Collaborative Studio · Built for developers</span>
        <button onClick={() => navigate("/login")} style={s.footerCta}>
          Start for free →
        </button>
      </footer>
    </div>
  );
}

/* ── Feature cards data ── */
const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    color: "#10B981",
    title: "Live Multi-Cursor",
    desc:  "See every collaborator's cursor in real time with colored carets and name tags — no lag, no confusion.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
    color: "#3B82F6",
    title: "Instant Code Execution",
    desc:  "Run JavaScript, Python, Java, C++, C, and TypeScript directly in the browser — results shared across the room.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    color: "#EC4899",
    title: "Threaded Chat",
    desc:  "Built-in room chat with typing indicators keeps the conversation flowing right next to your code.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9A16 16 0 0 0 15 16.09l1.94-1.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
    ),
    color: "#F59E0B",
    title: "Voice & Video",
    desc:  "WebRTC peer-to-peer voice and video calls baked right in — no third-party integrations needed.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
    color: "#06B6D4",
    title: "Multi-File Rooms",
    desc:  "Create and switch between multiple files in a shared room — all synced instantly for every participant.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
    color: "#A855F7",
    title: "Secure Auth",
    desc:  "JWT-based authentication with Google OAuth support — get your team into a room in seconds.",
  },
];

/* ════════════════════════════════════════════════════
   STYLES
   ════════════════════════════════════════════════════ */
const s = {
  page: {
    minHeight: "100vh",
    background: "#080808",
    color: "#F5F5F5",
    fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },

  /* Canvas + glow */
  canvas: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    zIndex: 0,
    opacity: 0.6,
  },
  cursorGlow: {
    position: "fixed",
    width: "600px",
    height: "600px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 1,
    transition: "left 0.12s ease, top 0.12s ease",
  },
  ambient: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    zIndex: 0,
    background: `
      radial-gradient(ellipse 1000px 700px at 50% -10%, rgba(16,185,129,0.07) 0%, transparent 65%),
      radial-gradient(ellipse 800px 600px at 80% 90%, rgba(59,130,246,0.04) 0%, transparent 65%)
    `,
  },

  /* ── Navbar ── */
  navbar: {
    position: "relative",
    zIndex: 100,
    width: "100%",
    maxWidth: "1100px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "22px 32px",
  },
  navBrand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  navLogo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    background: "#0D0D0D",
    border: "1px solid #10B981",
    borderRadius: "8px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "-1px",
    boxShadow: "0 0 14px rgba(16,185,129,0.2)",
    flexShrink: 0,
  },
  navBrandName: {
    fontSize: "15px",
    fontWeight: "800",
    color: "#F5F5F5",
    letterSpacing: "-0.3px",
  },
  navLinks: {
    display: "flex",
    gap: "32px",
  },
  navLink: {
    fontSize: "14px",
    color: "#8B8B8B",
    textDecoration: "none",
    transition: "color 0.15s",
    fontWeight: "500",
  },
  navActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  navSignIn: {
    padding: "7px 18px",
    borderRadius: "8px",
    border: "1px solid #242424",
    background: "transparent",
    color: "#8B8B8B",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: "color 0.15s, border-color 0.15s",
  },
  navGetStarted: {
    padding: "7px 18px",
    borderRadius: "8px",
    border: "none",
    background: "#10B981",
    color: "#fff",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    boxShadow: "0 0 16px rgba(16,185,129,0.3)",
    transition: "background 0.15s",
  },

  /* ── Hero ── */
  hero: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "60px 32px 40px",
    maxWidth: "820px",
    width: "100%",
    gap: "0",
  },

  /* Status pill */
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "99px",
    padding: "6px 16px 6px 12px",
    marginBottom: "36px",
    backdropFilter: "blur(8px)",
  },
  statusDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#10B981",
    display: "inline-block",
    animation: "pulse-glow 1.5s ease-in-out infinite",
    flexShrink: 0,
  },
  statusText: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#F5F5F5",
    fontFamily: "'JetBrains Mono', monospace",
  },
  statusDivider: {
    color: "#242424",
    fontSize: "16px",
    margin: "0 4px",
  },
  pillAvatars: {
    display: "flex",
    alignItems: "center",
  },
  statusMesh: {
    fontSize: "12px",
    color: "#8B8B8B",
    fontWeight: "500",
    marginLeft: "4px",
  },

  /* Headline */
  headline: {
    fontSize: "clamp(52px, 8vw, 88px)",
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 1.05,
    letterSpacing: "-3px",
    marginBottom: "24px",
  },
  subheadline: {
    fontSize: "clamp(15px, 2vw, 17px)",
    color: "#6B6B6B",
    lineHeight: "1.7",
    maxWidth: "600px",
    marginBottom: "40px",
    fontWeight: "400",
  },

  /* CTA */
  ctaRow: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    marginBottom: "48px",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  ctaPrimary: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "14px 28px",
    borderRadius: "10px",
    border: "none",
    background: "#10B981",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 0 24px rgba(16,185,129,0.35)",
    transition: "background 0.15s, transform 0.15s, box-shadow 0.15s",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    letterSpacing: "-0.2px",
  },
  ctaSecondary: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "14px 24px",
    borderRadius: "10px",
    border: "1px solid #242424",
    background: "#0F0F0F",
    color: "#F5F5F5",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "border-color 0.15s, background 0.15s",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    letterSpacing: "-0.2px",
  },

  /* Active sessions bar */
  sessionsBar: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
    justifyContent: "center",
    padding: "0 16px",
  },
  sessionsLabel: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#333",
    letterSpacing: "1px",
    textTransform: "uppercase",
    fontFamily: "'JetBrains Mono', monospace",
    marginRight: "4px",
    flexShrink: 0,
  },
  sessionChip: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 12px",
    borderRadius: "99px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    fontSize: "12px",
    fontFamily: "'JetBrains Mono', monospace",
    backdropFilter: "blur(4px)",
  },
  sessionDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    display: "inline-block",
    flexShrink: 0,
  },
  sessionName: {
    fontWeight: "700",
    fontSize: "12px",
  },
  sessionFile: {
    color: "#4A4A4A",
    fontSize: "11px",
  },

  /* ── Features ── */
  features: {
    position: "relative",
    zIndex: 10,
    width: "100%",
    maxWidth: "1100px",
    padding: "60px 32px 80px",
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "16px",
  },
  featureCard: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "14px",
    padding: "28px 26px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    transition: "border-color 0.2s, background 0.2s",
    cursor: "default",
  },
  featureIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  featureTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#F5F5F5",
    letterSpacing: "-0.2px",
  },
  featureDesc: {
    fontSize: "13px",
    color: "#5A5A5A",
    lineHeight: "1.65",
  },

  /* ── Footer ── */
  footer: {
    position: "relative",
    zIndex: 10,
    width: "100%",
    borderTop: "1px solid #111",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 40px",
    flexWrap: "wrap",
    gap: "12px",
  },
  footerBrand: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  footerText: {
    fontSize: "12px",
    color: "#333",
    letterSpacing: "0.3px",
  },
  footerCta: {
    padding: "6px 16px",
    borderRadius: "6px",
    border: "1px solid rgba(16,185,129,0.3)",
    background: "transparent",
    color: "#10B981",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: "background 0.15s",
  },
};
