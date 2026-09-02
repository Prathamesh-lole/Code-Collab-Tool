import { useState, useEffect, useCallback } from "react";
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

const LANG_COLORS = {
  javascript: "#F59E0B",
  typescript: "#06B6D4",
  python:     "#10B981",
  java:       "#EC4899",
  cpp:        "#3B82F6",
  c:          "#A855F7",
};

const LANG_ICONS = {
  javascript: "JS",
  typescript: "TS",
  python:     "🐍",
  java:       "☕",
  cpp:        "⚙",
  c:          "⚙",
};

function TokenLine({ tokens }) {
  const colorMap = {
    keyword: "#EC4899", fn: "#3B82F6", type: "#06B6D4",
    string: "#10B981", num: "#F59E0B", param: "#F5F5F5",
    plain: "#8B8B8B", comment: "#4A5568",
  };
  return (
    <span>
      {tokens.map((tok, i) => (
        <span key={i} style={{ color: colorMap[tok.t] || "#8B8B8B" }}>{tok.v}</span>
      ))}
    </span>
  );
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function HomePage() {
  const [roomName, setRoomName]         = useState("");
  const [roomKeyInput, setRoomKeyInput] = useState("");
  const [loading, setLoading]           = useState(false);
  const [myRooms, setMyRooms]           = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [deletingKey, setDeletingKey]   = useState(null);
  const [copiedKey, setCopiedKey]       = useState(null);
  const [toast, setToast]               = useState(null);
  const navigate = useNavigate();

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch My Rooms ──────────────────────────────────────────
  const fetchMyRooms = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setRoomsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/my-rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch rooms");
      const data = await res.json();
      setMyRooms(data);
    } catch (err) {
      console.error("Fetch my rooms error:", err);
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => { fetchMyRooms(); }, [fetchMyRooms]);

  // ── Handlers ────────────────────────────────────────────────
  const handleCreateRoom = async () => {
    if (!roomName.trim()) { showToast("Please enter a room name", "error"); return; }
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ room_name: roomName }),
      });
      const data = await response.json();
      if (!response.ok) { showToast(data.message || "Failed to create room", "error"); return; }
      navigate(`/room/${data.roomKey}`);
    } catch (err) {
      console.error("Create room error:", err);
      showToast("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = () => {
    if (!roomKeyInput.trim()) { showToast("Please enter a room key", "error"); return; }
    navigate(`/room/${roomKeyInput.trim()}`);
  };

  const handleDeleteRoom = async (roomKey, roomName) => {
    if (!window.confirm(`Delete room "${roomName}"? This cannot be undone.`)) return;
    const token = localStorage.getItem("token");
    setDeletingKey(roomKey);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/${roomKey}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.message || "Failed to delete room", "error"); return; }
      setMyRooms((prev) => prev.filter((r) => r.room_key !== roomKey));
      showToast(`"${roomName}" deleted`);
    } catch (err) {
      console.error("Delete room error:", err);
      showToast("Failed to delete room", "error");
    } finally {
      setDeletingKey(null);
    }
  };

  const handleCopyKey = async (roomKey) => {
    try {
      await navigator.clipboard.writeText(roomKey);
      setCopiedKey(roomKey);
      showToast("Room key copied!");
      setTimeout(() => setCopiedKey(null), 2000);
    } catch { showToast("Copy failed", "error"); }
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
      <div style={s.ambient} />
      <div style={s.grid} />

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          ...s.toast,
          background: toast.type === "error" ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
          borderColor: toast.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)",
          color: toast.type === "error" ? "#EF4444" : "#10B981",
        }}>
          {toast.type === "error" ? "⚠" : "✓"} {toast.msg}
        </div>
      )}

      {/* ── Navbar ── */}
      <nav style={s.navbar}>
        <div style={s.navLeft}>
          <div style={s.logoBadge}>
            <span>C</span><span style={{ color: "#10B981" }}>-</span><span>C</span>
          </div>
          <div style={s.logoText}>Code-Collab</div>
          <div style={s.navVersionBadge}>v1.0</div>
          <div style={s.navProjectBadge}>
            <span style={s.navProjectDot} />
            collab / main
          </div>
        </div>
        <div style={s.navRight}>
          <div style={s.livePill}>
            <span style={s.liveDot} />
            Live
          </div>
          {user.name && (
            <div style={s.navUser}>
              <div style={s.navAvatar}>{user.name[0].toUpperCase()}</div>
              <span style={s.navUserName}>{user.name}</span>
            </div>
          )}
          <button onClick={handleLogout} style={s.logoutBtn}>Sign out</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={s.hero}>
        <div style={s.heroText}>
          <div style={s.heroBadge}>
            <span style={{ ...s.heroBadgeDot, background: "#10B981" }} />
            Real-time collaboration
            <span style={s.heroBadgeSep}>·</span>
            Multi-language
          </div>
          <h1 style={s.heroTitle}>
            Code together.<br />
            <span style={s.heroTitleAccent}>Ship together.</span>
          </h1>
          <p style={s.heroSub}>
            A real-time collaborative workspace where developers write,
            review, and build software together — with live cursors,
            instant sync, and voice &amp; video built in.
          </p>
          <div style={s.langRow}>
            {["JavaScript", "Python", "Java", "C++", "C", "TypeScript"].map((lang) => (
              <span key={lang} style={s.langChip}>{lang}</span>
            ))}
          </div>
        </div>

        {/* Floating code window */}
        <div style={s.heroWindow}>
          <div style={s.windowChrome}>
            <div style={s.windowDots}>
              <span style={{ ...s.windowDot, background: "#EF4444" }} />
              <span style={{ ...s.windowDot, background: "#F59E0B" }} />
              <span style={{ ...s.windowDot, background: "#10B981" }} />
            </div>
            <span style={s.windowTitle}>workspace.ts</span>
            <span style={s.windowLang}>TypeScript</span>
          </div>
          <div style={s.peerStrip}>
            {DEMO_PEERS.map((p) => (
              <div key={p.name} style={{ ...s.peerChip, borderColor: p.color }}>
                <span style={{ ...s.peerChipDot, background: p.color }} />
                <span style={{ color: p.color, fontWeight: 600, fontSize: "11px" }}>{p.name}</span>
                <span style={s.peerChipPos}>L{p.line}</span>
              </div>
            ))}
          </div>
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
                  {DEMO_PEERS.filter((p) => p.line === i + 1).map((p) => (
                    <span key={p.name} style={{ display: "inline-block", width: "2px", height: "15px", background: p.color, marginLeft: "2px", verticalAlign: "middle", borderRadius: "1px", boxShadow: `0 0 6px ${p.color}`, animation: "blink 1s step-start infinite" }} />
                  ))}
                  {DEMO_PEERS.filter((p) => p.line === i + 1).map((p) => (
                    <span key={`tag-${p.name}`} style={{ fontSize: "10px", background: p.color, color: "#fff", padding: "1px 5px", borderRadius: "3px", marginLeft: "4px", fontFamily: "'JetBrains Mono', monospace", verticalAlign: "middle", fontWeight: 600 }}>{p.name}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div style={s.statusBar}>
            <span style={s.statusItem}>TypeScript</span>
            <span style={s.statusSep}>·</span>
            <span style={s.statusItem}>UTF-8</span>
            <span style={{ flex: 1 }} />
            <span style={{ ...s.statusItem, color: "#10B981" }}>● {DEMO_PEERS.length + 1} online</span>
          </div>
        </div>
      </section>

      {/* ── Create / Join cards ── */}
      <section style={s.cardsSection}>
        {/* Create Room */}
        <div style={s.card}>
          <div style={s.cardHeaderRow}>
            <div style={{ ...s.cardIconBadge, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
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
            {loading ? <><span style={s.spinner} />Creating...</> : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>Create Room</>}
          </button>
        </div>

        <div style={s.cardDivider}>
          <span style={s.cardDivLine} />
          <span style={s.cardDivText}>or</span>
          <span style={s.cardDivLine} />
        </div>

        {/* Join Room */}
        <div style={s.card}>
          <div style={s.cardHeaderRow}>
            <div style={{ ...s.cardIconBadge, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
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

      {/* ════════════════════════════════════
          MY ROOMS DASHBOARD
          ════════════════════════════════════ */}
      <section style={s.myRoomsSection}>
        {/* Section header */}
        <div style={s.myRoomsHeader}>
          <div style={s.myRoomsHeaderLeft}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span style={s.myRoomsTitle}>My Rooms</span>
            {!roomsLoading && (
              <span style={s.myRoomsCount}>{myRooms.length}</span>
            )}
          </div>
          <button onClick={fetchMyRooms} style={s.refreshBtn} title="Refresh">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
        </div>

        {/* Loading state */}
        {roomsLoading ? (
          <div style={s.roomsLoading}>
            <span style={s.roomsLoadingSpinner} />
            <span style={s.roomsLoadingText}>Loading your rooms...</span>
          </div>
        ) : myRooms.length === 0 ? (
          /* Empty state */
          <div style={s.roomsEmpty}>
            <div style={s.roomsEmptyIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2A2A2A" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <div style={s.roomsEmptyText}>No rooms yet</div>
            <div style={s.roomsEmptySubtext}>Create your first room above to start collaborating</div>
          </div>
        ) : (
          /* Rooms grid */
          <div style={s.roomsGrid}>
            {myRooms.map((room) => {
              const langColor = LANG_COLORS[room.language] || "#8B8B8B";
              const langIcon  = LANG_ICONS[room.language]  || "📄";
              const isDeleting = deletingKey === room.room_key;
              const isCopied   = copiedKey   === room.room_key;

              return (
                <div key={room.room_key} style={s.roomCard}>
                  {/* Top row */}
                  <div style={s.roomCardTop}>
                    {/* Lang badge */}
                    <div style={{ ...s.roomLangBadge, background: `${langColor}18`, border: `1px solid ${langColor}30`, color: langColor }}>
                      <span style={{ fontSize: "11px" }}>{langIcon}</span>
                      {room.language}
                    </div>
                    {/* File count */}
                    <div style={s.roomFilesCount}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      {room.file_count} {room.file_count === 1 ? "file" : "files"}
                    </div>
                  </div>

                  {/* Room name */}
                  <div style={s.roomCardName}>{room.room_name}</div>

                  {/* Room key */}
                  <div style={s.roomCardKey}>
                    <code style={s.roomKeyCode}>{room.room_key}</code>
                  </div>

                  {/* Last active */}
                  <div style={s.roomCardTime}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {timeAgo(room.created_at)}
                  </div>

                  {/* Actions */}
                  <div style={s.roomCardActions}>
                    {/* Rejoin */}
                    <button
                      onClick={() => navigate(`/room/${room.room_key}`)}
                      style={s.rejoinBtn}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      Open
                    </button>

                    {/* Copy key */}
                    <button
                      onClick={() => handleCopyKey(room.room_key)}
                      style={s.copyBtn}
                      title="Copy room key"
                    >
                      {isCopied ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteRoom(room.room_key, room.room_name)}
                      style={s.deleteBtn}
                      disabled={isDeleting}
                      title="Delete room"
                    >
                      {isDeleting ? (
                        <span style={s.deletingSpinner} />
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Footer ── */}
      <footer style={s.footer}>
        <span style={s.footerText}>Code-Collab · Collaborative Studio</span>
      </footer>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   STYLES
   ════════════════════════════════════════════════════════════ */
const s = {
  page: {
    minHeight: "100vh", background: "#070707", color: "#F5F5F5",
    fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
    display: "flex", flexDirection: "column", position: "relative", overflow: "hidden",
  },
  ambient: {
    position: "fixed", inset: 0, pointerEvents: "none",
    background: `
      radial-gradient(ellipse 1000px 800px at 10% 20%, rgba(59,130,246,0.05) 0%, transparent 70%),
      radial-gradient(ellipse 800px 600px at 90% 80%, rgba(16,185,129,0.04) 0%, transparent 70%)
    `,
  },
  grid: {
    position: "fixed", inset: 0, pointerEvents: "none",
    backgroundImage: "linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)",
    backgroundSize: "48px 48px", opacity: 0.4,
  },

  /* Toast */
  toast: {
    position: "fixed", top: "70px", left: "50%", transform: "translateX(-50%)",
    zIndex: 9999, display: "flex", alignItems: "center", gap: "8px",
    padding: "10px 20px", borderRadius: "8px", border: "1px solid",
    fontSize: "13px", fontWeight: "600", backdropFilter: "blur(20px)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
    animation: "fade-in 0.2s ease",
    whiteSpace: "nowrap",
  },

  /* Navbar */
  navbar: {
    position: "relative", zIndex: 100,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    height: "52px", padding: "0 24px",
    background: "rgba(12,12,12,0.9)", backdropFilter: "blur(20px)",
    borderBottom: "1px solid #1A1A1A",
  },
  navLeft:  { display: "flex", alignItems: "center", gap: "12px" },
  navRight: { display: "flex", alignItems: "center", gap: "10px" },
  logoBadge: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "32px", height: "32px", background: "#0D0D0D",
    border: "1px solid #10B981", borderRadius: "8px",
    fontFamily: "'JetBrains Mono', monospace", fontSize: "9px",
    fontWeight: "700", letterSpacing: "-1px", color: "#F5F5F5",
    boxShadow: "0 0 12px rgba(16,185,129,0.2)", flexShrink: 0,
  },
  logoText: { fontSize: "14px", fontWeight: "800", color: "#F5F5F5", letterSpacing: "1px" },
  navVersionBadge: {
    fontSize: "10px", color: "#4A4A4A", background: "#0D0D0D",
    border: "1px solid #242424", padding: "2px 8px", borderRadius: "20px",
    fontFamily: "'JetBrains Mono', monospace",
  },
  navProjectBadge: {
    display: "flex", alignItems: "center", gap: "5px",
    fontSize: "11px", color: "#8B8B8B", background: "#0D0D0D",
    border: "1px solid #242424", padding: "3px 10px", borderRadius: "20px",
  },
  navProjectDot: { width: "6px", height: "6px", borderRadius: "50%", background: "#10B981", display: "inline-block" },
  livePill: {
    display: "flex", alignItems: "center", gap: "5px",
    fontSize: "11px", fontWeight: "600", color: "#10B981",
    background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
    padding: "3px 10px", borderRadius: "20px",
  },
  liveDot: { width: "6px", height: "6px", borderRadius: "50%", background: "#10B981", animation: "pulse-glow 1.5s ease-in-out infinite", display: "inline-block" },
  navUser: { display: "flex", alignItems: "center", gap: "7px" },
  navAvatar: {
    width: "28px", height: "28px", borderRadius: "50%",
    background: "linear-gradient(135deg, #3B82F6, #10B981)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "12px", fontWeight: "700", color: "#fff", border: "1px solid #242424",
  },
  navUserName: { fontSize: "13px", color: "#8B8B8B", fontWeight: "500" },
  logoutBtn: {
    padding: "5px 14px", borderRadius: "6px", border: "1px solid #242424",
    background: "transparent", color: "#4A4A4A", fontSize: "12px", cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },

  /* Hero */
  hero: {
    position: "relative", zIndex: 10,
    display: "flex", justifyContent: "center", alignItems: "center",
    gap: "64px", padding: "60px 40px 40px",
    maxWidth: "1280px", margin: "0 auto", width: "100%", flexWrap: "wrap",
  },
  heroText: { flex: "1 1 400px", maxWidth: "520px", display: "flex", flexDirection: "column", gap: "20px" },
  heroBadge: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    fontSize: "12px", fontWeight: "600", color: "#10B981",
    background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
    padding: "5px 14px", borderRadius: "20px", width: "fit-content",
  },
  heroBadgeDot: { width: "6px", height: "6px", borderRadius: "50%", display: "inline-block" },
  heroBadgeSep: { color: "#242424", margin: "0 2px" },
  heroTitle: { fontSize: "clamp(36px, 5vw, 56px)", fontWeight: "800", color: "#F5F5F5", lineHeight: 1.1, letterSpacing: "-1.5px" },
  heroTitleAccent: { background: "linear-gradient(90deg, #10B981, #3B82F6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },
  heroSub: { fontSize: "16px", color: "#8B8B8B", lineHeight: "1.7", maxWidth: "440px" },
  langRow: { display: "flex", flexWrap: "wrap", gap: "8px" },
  langChip: { fontSize: "11px", fontWeight: "600", padding: "4px 12px", borderRadius: "6px", background: "#0D0D0D", border: "1px solid #242424", color: "#8B8B8B", fontFamily: "'JetBrains Mono', monospace" },

  /* Hero window */
  heroWindow: { flex: "1 1 420px", maxWidth: "520px", background: "#0D0D0D", border: "1px solid #242424", borderRadius: "14px", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" },
  windowChrome: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "#121212", borderBottom: "1px solid #1A1A1A" },
  windowDots: { display: "flex", gap: "6px", marginRight: "8px" },
  windowDot: { width: "10px", height: "10px", borderRadius: "50%", display: "inline-block" },
  windowTitle: { fontSize: "12px", color: "#8B8B8B", fontFamily: "'JetBrains Mono', monospace", flex: 1 },
  windowLang: { fontSize: "10px", color: "#06B6D4", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", padding: "2px 8px", borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace" },
  peerStrip: { display: "flex", gap: "8px", padding: "8px 14px", background: "#0A0A0A", borderBottom: "1px solid #1A1A1A", overflowX: "auto" },
  peerChip: { display: "flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "20px", background: "#0D0D0D", border: "1px solid", whiteSpace: "nowrap" },
  peerChipDot: { width: "6px", height: "6px", borderRadius: "50%", display: "inline-block" },
  peerChipPos: { fontSize: "10px", color: "#4A4A4A", fontFamily: "'JetBrains Mono', monospace" },
  codeBody: { display: "flex", padding: "12px 0", fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", lineHeight: "22px", overflow: "hidden" },
  lineNumbers: { display: "flex", flexDirection: "column", padding: "0 14px 0 16px", textAlign: "right", userSelect: "none", flexShrink: 0 },
  lineNum: { color: "#2A2A2A", fontSize: "12px", lineHeight: "22px" },
  codeLines: { flex: 1, padding: "0 16px 0 0", overflowX: "auto" },
  codeLine: { lineHeight: "22px", whiteSpace: "nowrap" },
  statusBar: { display: "flex", alignItems: "center", padding: "5px 14px", background: "#0A0A0A", borderTop: "1px solid #1A1A1A", fontFamily: "'JetBrains Mono', monospace" },
  statusItem: { fontSize: "11px", color: "#4A4A4A" },
  statusSep: { fontSize: "11px", color: "#1A1A1A", margin: "0 8px" },

  /* Create / Join cards */
  cardsSection: {
    position: "relative", zIndex: 10,
    display: "flex", justifyContent: "center", alignItems: "stretch",
    padding: "0 40px 40px", maxWidth: "900px", margin: "0 auto",
    width: "100%", boxSizing: "border-box", flexWrap: "wrap",
  },
  card: {
    flex: "1 1 320px", background: "rgba(18,18,18,0.8)", backdropFilter: "blur(20px)",
    border: "1px solid #242424", borderRadius: "14px", padding: "28px",
    display: "flex", flexDirection: "column", gap: "18px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
  },
  cardHeaderRow: { display: "flex", alignItems: "flex-start", gap: "14px" },
  cardIconBadge: { width: "40px", height: "40px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardTitle: { fontSize: "16px", fontWeight: "700", color: "#F5F5F5", marginBottom: "4px" },
  cardDesc: { fontSize: "13px", color: "#8B8B8B", lineHeight: "1.5" },
  cardBody: { display: "flex", flexDirection: "column", gap: "8px" },
  fieldLabel: { fontSize: "11px", fontWeight: "600", color: "#4A4A4A", textTransform: "uppercase", letterSpacing: "0.5px" },
  cardInput: {
    padding: "11px 14px", borderRadius: "8px", border: "1px solid #242424",
    background: "#0D0D0D", color: "#F5F5F5", fontSize: "14px", outline: "none",
    width: "100%", boxSizing: "border-box", fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  primaryBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: "8px", padding: "12px 20px", borderRadius: "8px", border: "none",
    background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    color: "#fff", fontSize: "14px", fontWeight: "700", cursor: "pointer",
    marginTop: "auto", boxShadow: "0 0 20px rgba(16,185,129,0.25)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  secondaryBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: "8px", padding: "12px 20px", borderRadius: "8px",
    border: "1px solid #3B82F6", background: "rgba(59,130,246,0.08)",
    color: "#3B82F6", fontSize: "14px", fontWeight: "700", cursor: "pointer",
    marginTop: "auto", fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  spinner: { display: "inline-block", width: "13px", height: "13px", border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 },
  cardDivider: { display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 20px", gap: "10px", flexShrink: 0 },
  cardDivLine: { flex: 1, width: "1px", background: "#1A1A1A" },
  cardDivText: { fontSize: "11px", color: "#4A4A4A", textTransform: "uppercase", letterSpacing: "0.5px" },

  /* ── My Rooms section ── */
  myRoomsSection: {
    position: "relative", zIndex: 10,
    width: "100%", maxWidth: "1100px",
    margin: "0 auto", padding: "0 40px 60px",
    boxSizing: "border-box",
  },
  myRoomsHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: "20px", paddingBottom: "14px",
    borderBottom: "1px solid #1A1A1A",
  },
  myRoomsHeaderLeft: { display: "flex", alignItems: "center", gap: "10px" },
  myRoomsTitle: { fontSize: "15px", fontWeight: "700", color: "#F5F5F5" },
  myRoomsCount: {
    fontSize: "11px", fontWeight: "700", color: "#10B981",
    background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
    padding: "2px 8px", borderRadius: "20px",
  },
  refreshBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "30px", height: "30px", borderRadius: "6px",
    border: "1px solid #1A1A1A", background: "transparent",
    color: "#4A4A4A", cursor: "pointer",
  },

  /* Loading */
  roomsLoading: { display: "flex", alignItems: "center", gap: "12px", padding: "32px 0", justifyContent: "center" },
  roomsLoadingSpinner: { display: "inline-block", width: "18px", height: "18px", border: "2px solid #1A1A1A", borderTopColor: "#10B981", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  roomsLoadingText: { fontSize: "13px", color: "#4A4A4A" },

  /* Empty state */
  roomsEmpty: { display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "48px 0" },
  roomsEmptyIcon: { opacity: 0.4, marginBottom: "4px" },
  roomsEmptyText: { fontSize: "14px", fontWeight: "600", color: "#4A4A4A" },
  roomsEmptySubtext: { fontSize: "13px", color: "#2A2A2A", textAlign: "center" },

  /* Rooms grid */
  roomsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "16px",
  },

  /* Room card */
  roomCard: {
    background: "rgba(18,18,18,0.8)", backdropFilter: "blur(20px)",
    border: "1px solid #1A1A1A", borderRadius: "12px",
    padding: "20px", display: "flex", flexDirection: "column", gap: "12px",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  },
  roomCardTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" },
  roomLangBadge: {
    display: "inline-flex", alignItems: "center", gap: "5px",
    fontSize: "11px", fontWeight: "700", padding: "3px 10px",
    borderRadius: "20px", fontFamily: "'JetBrains Mono', monospace",
    textTransform: "capitalize",
  },
  roomFilesCount: {
    display: "flex", alignItems: "center", gap: "4px",
    fontSize: "11px", color: "#4A4A4A",
    fontFamily: "'JetBrains Mono', monospace",
  },
  roomCardName: {
    fontSize: "15px", fontWeight: "700", color: "#F5F5F5",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  roomCardKey: { display: "flex", alignItems: "center" },
  roomKeyCode: {
    fontSize: "11px", color: "#4A4A4A",
    fontFamily: "'JetBrains Mono', monospace",
    background: "#0D0D0D", border: "1px solid #1A1A1A",
    padding: "3px 10px", borderRadius: "6px",
  },
  roomCardTime: {
    display: "flex", alignItems: "center", gap: "5px",
    fontSize: "11px", color: "#2A2A2A",
  },
  roomCardActions: {
    display: "flex", gap: "8px", marginTop: "4px",
  },
  rejoinBtn: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    gap: "6px", padding: "8px 14px", borderRadius: "7px", border: "none",
    background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    color: "#fff", fontSize: "12px", fontWeight: "700", cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    boxShadow: "0 0 14px rgba(16,185,129,0.2)",
  },
  copyBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "34px", height: "34px", borderRadius: "7px",
    border: "1px solid #242424", background: "transparent",
    color: "#8B8B8B", cursor: "pointer",
    transition: "border-color 0.15s",
  },
  deleteBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "34px", height: "34px", borderRadius: "7px",
    border: "1px solid rgba(239,68,68,0.2)",
    background: "rgba(239,68,68,0.05)",
    color: "#EF4444", cursor: "pointer",
    transition: "background 0.15s",
  },
  deletingSpinner: {
    display: "inline-block", width: "12px", height: "12px",
    border: "2px solid rgba(239,68,68,0.25)", borderTopColor: "#EF4444",
    borderRadius: "50%", animation: "spin 0.7s linear infinite",
  },

  /* Footer */
  footer: { position: "relative", zIndex: 10, display: "flex", justifyContent: "center", padding: "20px", marginTop: "auto", borderTop: "1px solid #0D0D0D" },
  footerText: { fontSize: "11px", color: "#2A2A2A", letterSpacing: "0.5px" },
};

export default HomePage;
