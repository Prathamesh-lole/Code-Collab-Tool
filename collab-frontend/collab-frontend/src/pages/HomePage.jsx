import { useState } from "react";
import { useNavigate } from "react-router-dom";

// ── Decorative peer data for the hero code window ──
const DEMO_PEERS = [
  { name: "Sarah",      color: "#EC4899", line: 3,  col: 22 },
  { name: "Alex",       color: "#06B6D4", line: 7,  col: 8  },
  { name: "Prathamesh", color: "#10B981", line: 11, col: 30 },
];

const DEMO_CODE_LINES = [
  { tokens: [{ t: "keyword", v: "import" }, { t: "plain", v: " { " }, { t: "type", v: "Workspace" }, { t: "plain", v: " } " }, { t: "keyword", v: "from" }, { t: "plain", v: " " }, { t: "string", v: "'@codeflow/core'" }] },
  { tokens: [{ t: "plain", v: "" }] },
  { tokens: [{ t: "keyword", v: "async function" }, { t: "fn", v: " createWorkspace" }, { t: "plain", v: "(" }, { t: "param", v: "config" }, { t: "plain", v: ": " }, { t: "type", v: "WorkspaceConfig" }, { t: "plain", v: ") {" }] },
  { tokens: [{ t: "plain", v: "  " }, { t: "keyword", v: "const " }, { t: "plain", v: "ws = " }, { t: "keyword", v: "await " }, { t: "fn", v: "Workspace.create" }, { t: "plain", v: "({" }] },
  { tokens: [{ t: "plain", v: "    project: " }, { t: "string", v: '"Nova"' }, { t: "plain", v: "," }] },
  { tokens: [{ t: "plain", v: "    realtime: " }, { t: "keyword", v: "true" }, { t: "plain", v: "," }] },
  { tokens: [{ t: "plain", v: "    peers: " }, { t: "num", v: "4" }, { t: "plain", v: "," }] },
  { tokens: [{ t: "plain", v: "  })" }] },
  { tokens: [{ t: "plain", v: "" }] },
  { tokens: [{ t: "keyword", v: "  return " }, { t: "plain", v: "ws." }, { t: "fn", v: "connect" }, { t: "plain", v: "()" }] },
  { tokens: [{ t: "plain", v: "}" }] },
];

function TokenLine({ tokens }) {
  const colorMap = {
    keyword: "#EC4899",
    fn:      "#3B82F6",
    type:    "#06B6D4",
    string:  "#10B981",
    num:     "#F59E0B",
    param:   "#F5F5F5",
    plain:   "#8B8B8B",
    comment: "#4A5568",
  };
  return (
    <span>
      {tokens.map((tok, i) => (
        <span key={i} style={{ color: colorMap[tok.t] || "#8B8B8B" }}>{tok.v}</span>
      ))}
    </span>
  );
}

function HomePage() {
  const [roomName, setRoomName]       = useState("");
  const [roomKeyInput, setRoomKeyInput] = useState("");
  const [loading, setLoading]         = useState(false);
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    if (!roomName.trim()) { alert("Please enter a room name"); return; }
    const token = localStorage.getItem("token");
    if (!token) { alert("You are not logged in. Please login again."); navigate("/login"); return; }
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ room_name: roomName }),
      });
      const data = await response.json();
      if (!response.ok) { alert(data.message || "Failed to create room"); return; }
      alert("Room created successfully");
      navigate(`/room/${data.roomKey}`);
    } catch (err) {
      console.error("Create room error:", err);
      alert("Something went wrong while creating room");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = () => {
    if (!roomKeyInput.trim()) { alert("Please enter room key"); return; }
    navigate(`/room/${roomKeyInput.trim()}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user")) || {}; }
    catch { return {}; }
  })();

  return (
    <div style={s.page}>
      {/* Ambient + grid */}
      <div style={s.ambient} />
      <div style={s.grid} />

      {/* ── Top Navigation ── */}
      <nav style={s.navbar}>
        {/* Left: brand */}
        <div style={s.navLeft}>
          <div style={s.logoBadge}>
            <span>C</span>
            <span style={{ color: "#10B981" }}>-</span>
            <span>C</span>
          </div>
          <div style={s.logoText}>
            Code-Collab
          </div>
          <div style={s.navVersionBadge}>v1.0</div>
          <div style={s.navProjectBadge}>
            <span style={s.navProjectDot} />
            collab / main
          </div>
        </div>

        {/* Right: live pill + user + logout */}
        <div style={s.navRight}>
          <div style={s.livePill}>
            <span style={s.liveDot} />
            Live
          </div>
          {user.name && (
            <div style={s.navUser}>
              <div style={s.navAvatar}>
                {user.name[0].toUpperCase()}
              </div>
              <span style={s.navUserName}>{user.name}</span>
            </div>
          )}
          <button onClick={handleLogout} style={s.logoutBtn}>
            Sign out
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section style={s.hero}>
        {/* Left: text */}
        <div style={s.heroText}>
          <div style={s.heroBadge}>
            <span style={{ ...s.heroBadgeDot, background: "#10B981" }} />
            Real-time collaboration
            <span style={s.heroBadgeSep}>·</span>
            Multi-language
          </div>

          <h1 style={s.heroTitle}>
            Code together.
            <br />
            <span style={s.heroTitleAccent}>Ship together.</span>
          </h1>

          <p style={s.heroSub}>
            A real-time collaborative workspace where developers write,
            review, and build software together — with live cursors,
            instant sync, and voice &amp; video built in.
          </p>

          {/* Language badges */}
          <div style={s.langRow}>
            {["JavaScript", "Python", "Java", "C++", "C", "TypeScript"].map((lang) => (
              <span key={lang} style={s.langChip}>{lang}</span>
            ))}
          </div>
        </div>

        {/* Right: floating code window */}
        <div style={s.heroWindow}>
          {/* Window chrome */}
          <div style={s.windowChrome}>
            <div style={s.windowDots}>
              <span style={{ ...s.windowDot, background: "#EF4444" }} />
              <span style={{ ...s.windowDot, background: "#F59E0B" }} />
              <span style={{ ...s.windowDot, background: "#10B981" }} />
            </div>
            <span style={s.windowTitle}>workspace.ts</span>
            <div style={s.windowActions}>
              <span style={s.windowLang}>TypeScript</span>
            </div>
          </div>

          {/* Peers tab strip */}
          <div style={s.peerStrip}>
            {DEMO_PEERS.map((p) => (
              <div key={p.name} style={{ ...s.peerChip, borderColor: p.color }}>
                <span style={{ ...s.peerChipDot, background: p.color }} />
                <span style={{ color: p.color, fontWeight: 600, fontSize: "11px" }}>{p.name}</span>
                <span style={s.peerChipPos}>L{p.line}</span>
              </div>
            ))}
          </div>

          {/* Code body */}
          <div style={s.codeBody}>
            <div style={s.lineNumbers}>
              {DEMO_CODE_LINES.map((_, i) => (
                <div key={i} style={s.lineNum}>{i + 1}</div>
              ))}
            </div>
            <div style={s.codeLines}>
              {DEMO_CODE_LINES.map((line, i) => (
                <div key={i} style={s.codeLine}>
                  <TokenLine tokens={line.tokens} />
                  {/* Peer cursor indicators */}
                  {DEMO_PEERS.filter((p) => p.line === i + 1).map((p) => (
                    <span
                      key={p.name}
                      style={{
                        display: "inline-block",
                        width: "2px",
                        height: "15px",
                        background: p.color,
                        marginLeft: "2px",
                        verticalAlign: "middle",
                        borderRadius: "1px",
                        boxShadow: `0 0 6px ${p.color}`,
                        animation: "blink 1s step-start infinite",
                      }}
                    />
                  ))}
                  {DEMO_PEERS.filter((p) => p.line === i + 1).map((p) => (
                    <span
                      key={`tag-${p.name}`}
                      style={{
                        fontSize: "10px",
                        background: p.color,
                        color: "#fff",
                        padding: "1px 5px",
                        borderRadius: "3px",
                        marginLeft: "4px",
                        fontFamily: "'JetBrains Mono', monospace",
                        verticalAlign: "middle",
                        fontWeight: 600,
                      }}
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Status bar */}
          <div style={s.statusBar}>
            <span style={s.statusItem}>TypeScript</span>
            <span style={s.statusSep}>·</span>
            <span style={s.statusItem}>UTF-8</span>
            <span style={s.statusSep}>·</span>
            <span style={s.statusItem}>Spaces: 2</span>
            <span style={{ flex: 1 }} />
            <span style={{ ...s.statusItem, color: "#10B981" }}>
              ● {DEMO_PEERS.length + 1} online
            </span>
          </div>
        </div>
      </section>

      {/* ── Action Cards ── */}
      <section style={s.cardsSection}>

        {/* Create Room card */}
        <div style={s.card}>
          <div style={s.cardHeaderRow}>
            <div style={{ ...s.cardIconBadge, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </div>
            <div>
              <div style={s.cardTitle}>Create a Room</div>
              <div style={s.cardDesc}>Start a new collaborative session</div>
            </div>
          </div>

          <div style={s.cardBody}>
            <label style={s.fieldLabel}>Workspace name</label>
            <input
              type="text"
              placeholder="e.g. Sprint Review, Feature Dev..."
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              style={s.cardInput}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateRoom(); }}
            />
          </div>

          <button onClick={handleCreateRoom} style={s.primaryBtn} disabled={loading}>
            {loading ? (
              <><span style={s.spinner} />Creating workspace...</>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Create Room
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div style={s.cardDivider}>
          <span style={s.cardDivLine} />
          <span style={s.cardDivText}>or</span>
          <span style={s.cardDivLine} />
        </div>

        {/* Join Room card */}
        <div style={s.card}>
          <div style={s.cardHeaderRow}>
            <div style={{ ...s.cardIconBadge, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
              </svg>
            </div>
            <div>
              <div style={s.cardTitle}>Join a Room</div>
              <div style={s.cardDesc}>Enter an existing session</div>
            </div>
          </div>

          <div style={s.cardBody}>
            <label style={s.fieldLabel}>Room key</label>
            <input
              type="text"
              placeholder="Paste room key here..."
              value={roomKeyInput}
              onChange={(e) => setRoomKeyInput(e.target.value)}
              style={{ ...s.cardInput, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.5px" }}
              onKeyDown={(e) => { if (e.key === "Enter") handleJoinRoom(); }}
            />
          </div>

          <button onClick={handleJoinRoom} style={s.secondaryBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            Join Room
          </button>
        </div>

      </section>

      {/* ── Footer ── */}
      <footer style={s.footer}>
        <span style={s.footerText}>
          Code-Collab · Collaborative Studio
        </span>
      </footer>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */
const s = {
  page: {
    minHeight: "100vh",
    background: "#070707",
    color: "#F5F5F5",
    fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
  },
  ambient: {
    position: "fixed", inset: 0, pointerEvents: "none",
    background: `
      radial-gradient(ellipse 1000px 800px at 10% 20%, rgba(59,130,246,0.05) 0%, transparent 70%),
      radial-gradient(ellipse 800px 600px at 90% 80%, rgba(16,185,129,0.04) 0%, transparent 70%),
      radial-gradient(ellipse 600px 500px at 50% 50%, rgba(236,72,153,0.02) 0%, transparent 70%)
    `,
  },
  grid: {
    position: "fixed", inset: 0, pointerEvents: "none",
    backgroundImage: "linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)",
    backgroundSize: "48px 48px", opacity: 0.4,
  },

  /* ── Navbar ── */
  navbar: {
    position: "relative", zIndex: 100,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    height: "52px", padding: "0 24px",
    background: "rgba(12,12,12,0.9)",
    backdropFilter: "blur(20px)",
    borderBottom: "1px solid #1A1A1A",
  },
  navLeft: { display: "flex", alignItems: "center", gap: "12px" },
  logoBadge: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "32px", height: "32px",
    background: "#0D0D0D",
    border: "1px solid #10B981",
    borderRadius: "8px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "9px", fontWeight: "700", letterSpacing: "-1px",
    color: "#F5F5F5",
    boxShadow: "0 0 12px rgba(16,185,129,0.2)",
    flexShrink: 0,
  },
  logoText: {
    fontSize: "14px", fontWeight: "800", color: "#F5F5F5",
    letterSpacing: "1px",
  },
  navVersionBadge: {
    fontSize: "10px", color: "#4A4A4A",
    background: "#0D0D0D", border: "1px solid #242424",
    padding: "2px 8px", borderRadius: "20px",
    fontFamily: "'JetBrains Mono', monospace",
  },
  navProjectBadge: {
    display: "flex", alignItems: "center", gap: "5px",
    fontSize: "11px", color: "#8B8B8B",
    background: "#0D0D0D", border: "1px solid #242424",
    padding: "3px 10px", borderRadius: "20px",
  },
  navProjectDot: { width: "6px", height: "6px", borderRadius: "50%", background: "#10B981", display: "inline-block" },
  navRight: { display: "flex", alignItems: "center", gap: "10px" },
  livePill: {
    display: "flex", alignItems: "center", gap: "5px",
    fontSize: "11px", fontWeight: "600", color: "#10B981",
    background: "rgba(16,185,129,0.1)",
    border: "1px solid rgba(16,185,129,0.25)",
    padding: "3px 10px", borderRadius: "20px",
  },
  liveDot: {
    width: "6px", height: "6px", borderRadius: "50%",
    background: "#10B981",
    animation: "pulse-glow 1.5s ease-in-out infinite",
    display: "inline-block",
  },
  navUser: { display: "flex", alignItems: "center", gap: "7px" },
  navAvatar: {
    width: "28px", height: "28px", borderRadius: "50%",
    background: "linear-gradient(135deg, #3B82F6, #10B981)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "12px", fontWeight: "700", color: "#fff",
    border: "1px solid #242424",
  },
  navUserName: { fontSize: "13px", color: "#8B8B8B", fontWeight: "500" },
  logoutBtn: {
    padding: "5px 14px",
    borderRadius: "6px",
    border: "1px solid #242424",
    background: "transparent",
    color: "#4A4A4A",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: "color 0.15s, border-color 0.15s",
  },

  /* ── Hero ── */
  hero: {
    position: "relative", zIndex: 10,
    display: "flex", justifyContent: "center", alignItems: "center",
    gap: "64px", padding: "60px 40px 40px",
    maxWidth: "1280px", margin: "0 auto", width: "100%",
    flexWrap: "wrap",
  },
  heroText: {
    flex: "1 1 400px", maxWidth: "520px",
    display: "flex", flexDirection: "column", gap: "20px",
  },
  heroBadge: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    fontSize: "12px", fontWeight: "600", color: "#10B981",
    background: "rgba(16,185,129,0.08)",
    border: "1px solid rgba(16,185,129,0.2)",
    padding: "5px 14px", borderRadius: "20px",
    width: "fit-content",
  },
  heroBadgeDot: { width: "6px", height: "6px", borderRadius: "50%", display: "inline-block" },
  heroBadgeSep: { color: "#242424", margin: "0 2px" },
  heroTitle: {
    fontSize: "clamp(36px, 5vw, 56px)",
    fontWeight: "800",
    color: "#F5F5F5",
    lineHeight: 1.1,
    letterSpacing: "-1.5px",
  },
  heroTitleAccent: {
    background: "linear-gradient(90deg, #10B981, #3B82F6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  heroSub: {
    fontSize: "16px", color: "#8B8B8B", lineHeight: "1.7",
    maxWidth: "440px",
  },
  langRow: { display: "flex", flexWrap: "wrap", gap: "8px" },
  langChip: {
    fontSize: "11px", fontWeight: "600",
    padding: "4px 12px", borderRadius: "6px",
    background: "#0D0D0D", border: "1px solid #242424",
    color: "#8B8B8B",
    fontFamily: "'JetBrains Mono', monospace",
  },

  /* ── Hero code window ── */
  heroWindow: {
    flex: "1 1 420px", maxWidth: "520px",
    background: "#0D0D0D",
    border: "1px solid #242424",
    borderRadius: "14px",
    overflow: "hidden",
    boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03)",
    animation: "slide-up 0.4s ease 0.1s both",
  },
  windowChrome: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "10px 14px",
    background: "#121212",
    borderBottom: "1px solid #1A1A1A",
  },
  windowDots: { display: "flex", gap: "6px", marginRight: "8px" },
  windowDot: { width: "10px", height: "10px", borderRadius: "50%", display: "inline-block" },
  windowTitle: { fontSize: "12px", color: "#8B8B8B", fontFamily: "'JetBrains Mono', monospace", flex: 1 },
  windowActions: { display: "flex", gap: "6px" },
  windowLang: {
    fontSize: "10px", color: "#06B6D4",
    background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)",
    padding: "2px 8px", borderRadius: "4px",
    fontFamily: "'JetBrains Mono', monospace",
  },
  peerStrip: {
    display: "flex", gap: "8px", padding: "8px 14px",
    background: "#0A0A0A", borderBottom: "1px solid #1A1A1A",
    overflowX: "auto",
  },
  peerChip: {
    display: "flex", alignItems: "center", gap: "5px",
    padding: "3px 10px", borderRadius: "20px",
    background: "#0D0D0D", border: "1px solid",
    whiteSpace: "nowrap",
  },
  peerChipDot: { width: "6px", height: "6px", borderRadius: "50%", display: "inline-block" },
  peerChipPos: { fontSize: "10px", color: "#4A4A4A", fontFamily: "'JetBrains Mono', monospace" },
  codeBody: {
    display: "flex",
    padding: "12px 0",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "13px",
    lineHeight: "22px",
    overflow: "hidden",
  },
  lineNumbers: {
    display: "flex", flexDirection: "column",
    padding: "0 14px 0 16px",
    textAlign: "right",
    userSelect: "none",
    flexShrink: 0,
  },
  lineNum: { color: "#2A2A2A", fontSize: "12px", lineHeight: "22px" },
  codeLines: { flex: 1, padding: "0 16px 0 0", overflowX: "auto" },
  codeLine: { lineHeight: "22px", whiteSpace: "nowrap" },
  statusBar: {
    display: "flex", alignItems: "center", gap: "0",
    padding: "5px 14px",
    background: "#0A0A0A",
    borderTop: "1px solid #1A1A1A",
    fontFamily: "'JetBrains Mono', monospace",
  },
  statusItem: { fontSize: "11px", color: "#4A4A4A" },
  statusSep: { fontSize: "11px", color: "#1A1A1A", margin: "0 8px" },

  /* ── Cards section ── */
  cardsSection: {
    position: "relative", zIndex: 10,
    display: "flex", justifyContent: "center", alignItems: "stretch",
    gap: "0", padding: "0 40px 40px",
    maxWidth: "900px", margin: "0 auto", width: "100%",
    boxSizing: "border-box", flexWrap: "wrap",
  },
  card: {
    flex: "1 1 320px",
    background: "rgba(18,18,18,0.8)",
    backdropFilter: "blur(20px)",
    border: "1px solid #242424",
    borderRadius: "14px",
    padding: "28px",
    display: "flex", flexDirection: "column", gap: "18px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  cardHeaderRow: { display: "flex", alignItems: "flex-start", gap: "14px" },
  cardIconBadge: {
    width: "40px", height: "40px",
    borderRadius: "10px",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  cardTitle: { fontSize: "16px", fontWeight: "700", color: "#F5F5F5", marginBottom: "4px" },
  cardDesc: { fontSize: "13px", color: "#8B8B8B", lineHeight: "1.5" },
  cardBody: { display: "flex", flexDirection: "column", gap: "8px" },
  fieldLabel: { fontSize: "11px", fontWeight: "600", color: "#4A4A4A", textTransform: "uppercase", letterSpacing: "0.5px" },
  cardInput: {
    padding: "11px 14px",
    borderRadius: "8px",
    border: "1px solid #242424",
    background: "#0D0D0D",
    color: "#F5F5F5",
    fontSize: "14px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  primaryBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: "8px", padding: "12px 20px", borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    color: "#fff", fontSize: "14px", fontWeight: "700",
    cursor: "pointer", marginTop: "auto",
    boxShadow: "0 0 20px rgba(16,185,129,0.25)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: "opacity 0.15s",
  },
  secondaryBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: "8px", padding: "12px 20px", borderRadius: "8px",
    border: "1px solid #3B82F6",
    background: "rgba(59,130,246,0.08)",
    color: "#3B82F6", fontSize: "14px", fontWeight: "700",
    cursor: "pointer", marginTop: "auto",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: "background 0.15s, box-shadow 0.15s",
  },
  spinner: {
    display: "inline-block", width: "13px", height: "13px",
    border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "#fff",
    borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0,
  },
  cardDivider: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "28px 20px", gap: "10px", flexShrink: 0,
  },
  cardDivLine: { flex: 1, width: "1px", background: "#1A1A1A" },
  cardDivText: { fontSize: "11px", color: "#4A4A4A", textTransform: "uppercase", letterSpacing: "0.5px" },

  /* ── Footer ── */
  footer: {
    position: "relative", zIndex: 10,
    display: "flex", justifyContent: "center",
    padding: "20px", marginTop: "auto",
    borderTop: "1px solid #0D0D0D",
  },
  footerText: { fontSize: "11px", color: "#2A2A2A", letterSpacing: "0.5px" },
};

export default HomePage;
