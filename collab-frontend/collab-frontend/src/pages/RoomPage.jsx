import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Editor from "@monaco-editor/react";
import { useNavigate, useParams } from "react-router-dom";

const languageOptions = ["javascript", "python", "java", "cpp", "c", "typescript"];

const debounce = (func, delay) => {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => func(...args), delay); };
};

const getUserColor = (name) => {
  const colors = ["#EC4899", "#06B6D4", "#10B981", "#F59E0B", "#3B82F6", "#A855F7"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const getLangIcon = (lang) => {
  const map = { python: "🐍", java: "☕", cpp: "⚙", c: "⚙", typescript: "TS", javascript: "JS" };
  return map[lang] || "📄";
};

function RoomPage() {
  const { roomKey } = useParams();
  const navigate = useNavigate();

  const socketRef = useRef(null);
  const isRemoteUpdate = useRef(false);
  const editorRef = useRef(null);
  const getCurrentUserRef = useRef(null);
  const decorationsRef = useRef({});
  const monacoRef = useRef(null);

  const [joined, setJoined]   = useState(false);
  const [code, setCode]       = useState("// Start coding here...");
  const [language, setLanguage] = useState("javascript");
  const [users, setUsers]     = useState([]);
  const [output, setOutput]   = useState("Click 'Run' to see output here...");
  const [running, setRunning] = useState(false);
  const [stdin, setStdin]     = useState("");
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [toasts, setToasts]   = useState([]);
  const typingTimersRef = useRef({});
  const remoteCursorsRef = useRef({});
  const emitCursorMove = useRef(null);
  const emitTyping = useRef(null);

  // Active right panel tab
  const [rightTab, setRightTab] = useState("peers"); // "peers" | "chat" | "activity"

  // File system
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [newFileName, setNewFileName] = useState("");
  const [showNewFileInput, setShowNewFileInput] = useState(false);

  // Voice / Video
  const [inCall, setInCall]   = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff]   = useState(false);
  const localStreamRef = useRef(null);
  const localVideoRef  = useRef(null);
  const peersRef       = useRef({});
  const [remoteStreams, setRemoteStreams] = useState({});

  // Activity log
  const [activityLog, setActivityLog] = useState([]);
  const addActivity = (msg, type = "info") => {
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setActivityLog((prev) => [{ msg, type, ts, id: Date.now() }, ...prev].slice(0, 50));
  };

  /* ────────────── API helpers (unchanged) ────────────── */
  const fetchRoomData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/key/${roomKey}`);
      const data = await response.json();
      if (!response.ok) { alert(data.message || "Room not found"); navigate("/"); return; }
      setCode(data.code || "// Start coding here...");
      setLanguage(data.language || "javascript");
      if (socketRef.current) socketRef.current.emit("join_room", roomKey);
      const filesRes = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/${roomKey}/files`);
      const filesData = await filesRes.json();
      if (filesData.length > 0) {
        setFiles(filesData);
        setActiveFileId(filesData[0].id);
        setCode(filesData[0].code || "");
        setLanguage(filesData[0].language || "javascript");
      }
      setJoined(true);
    } catch (err) {
      console.error("Error joining room:", err);
      alert("Failed to join room");
      navigate("/");
    }
  };

  const saveCodeToDatabase = async (updatedCode) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/key/${roomKey}/code`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: updatedCode }),
      });
    } catch (err) { console.error("Error saving code:", err); }
  };

  const saveLanguageToDatabase = async (updatedLanguage) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/key/${roomKey}/language`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: updatedLanguage }),
      });
    } catch (err) { console.error("Error saving language:", err); }
  };

  /* ────────────── File management (unchanged) ────────────── */
  const handleCreateFile = async () => {
    const name = newFileName.trim();
    if (!name) return;
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/${roomKey}/files`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, language }),
    });
    const file = await res.json();
    setFiles((prev) => [...prev, file]);
    setActiveFileId(file.id);
    setCode(file.code || "");
    setLanguage(file.language);
    setNewFileName("");
    setShowNewFileInput(false);
    if (socketRef.current) socketRef.current.emit("file_created", { roomId: roomKey, file });
    addActivity(`New file: ${name}`, "file");
  };

  const handleSwitchFile = (file) => {
    setActiveFileId(file.id);
    setCode(file.code || "");
    setLanguage(file.language);
    if (socketRef.current) socketRef.current.emit("file_switched", { roomId: roomKey, fileId: file.id });
  };

  const handleDeleteFile = async (fileId, e) => {
    e.stopPropagation();
    if (files.length === 1) return;
    await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/files/${fileId}`, { method: "DELETE" });
    const remaining = files.filter((f) => f.id !== fileId);
    setFiles(remaining);
    if (activeFileId === fileId) {
      setActiveFileId(remaining[0].id);
      setCode(remaining[0].code || "");
      setLanguage(remaining[0].language);
    }
    if (socketRef.current) socketRef.current.emit("file_deleted", { roomId: roomKey, fileId });
  };

  const handleEditorChange = (value) => {
    const newCode = value || "";
    setCode(newCode);
    setFiles((prev) => prev.map((f) => f.id === activeFileId ? { ...f, code: newCode } : f));
    if (isRemoteUpdate.current) { isRemoteUpdate.current = false; return; }
    if (socketRef.current) {
      socketRef.current.emit("code_change", { roomId: roomKey, code: newCode });
      if (activeFileId) socketRef.current.emit("file_code_change", { roomId: roomKey, fileId: activeFileId, code: newCode });
    }
    saveCodeToDatabase(newCode);
    if (activeFileId) {
      fetch(`${import.meta.env.VITE_API_URL}/api/rooms/files/${activeFileId}/code`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newCode }),
      }).catch(() => {});
    }
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    setFiles((prev) => prev.map((f) => f.id === activeFileId ? { ...f, language: newLanguage } : f));
    if (socketRef.current) {
      socketRef.current.emit("language_change", { roomId: roomKey, language: newLanguage });
      if (activeFileId) socketRef.current.emit("file_language_change", { roomId: roomKey, fileId: activeFileId, language: newLanguage });
    }
    saveLanguageToDatabase(newLanguage);
    if (activeFileId) {
      fetch(`${import.meta.env.VITE_API_URL}/api/rooms/files/${activeFileId}/language`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: newLanguage }),
      }).catch(() => {});
    }
  };

  const handleRunCode = async () => {
    try {
      setRunning(true);
      setOutput("Running...");
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/code/run`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, stdin }),
      });
      const data = await response.json();
      if (!response.ok) {
        const errorOutput = data.output || data.message || "Execution failed";
        setOutput(errorOutput);
        if (socketRef.current) socketRef.current.emit("output_change", { roomId: roomKey, output: errorOutput });
        return;
      }
      const finalOutput = data.output || "Code executed successfully";
      setOutput(finalOutput);
      addActivity(`Code executed (${language})`, "run");
      if (socketRef.current) socketRef.current.emit("output_change", { roomId: roomKey, output: finalOutput });
    } catch (err) {
      console.error("Run code error:", err);
      const errorMessage = "Something went wrong while running code";
      setOutput(errorMessage);
      if (socketRef.current) socketRef.current.emit("output_change", { roomId: roomKey, output: errorMessage });
    } finally {
      setRunning(false);
    }
  };

  const handleClearOutput = () => {
    setOutput("");
    if (socketRef.current) socketRef.current.emit("output_change", { roomId: roomKey, output: "" });
  };

  const handleCopyRoomKey = async () => {
    try { await navigator.clipboard.writeText(roomKey); addToast("Room key copied!", "join"); }
    catch (err) { console.error("Copy failed:", err); }
  };

  const handleCopyRoomLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); addToast("Room link copied!", "join"); }
    catch (err) { console.error("Copy failed:", err); }
  };

  const getCurrentUser = () => {
    const u = users.find((user) => user.socketId === socketRef.current?.id);
    if (u) return { name: u.name, email: u.email || "" };
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      return { name: stored.name || "Guest User", email: stored.email || "" };
    } catch { return { name: "Guest User", email: "" }; }
  };

  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  getCurrentUserRef.current = getCurrentUser;

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const user = getCurrentUser();
    const messageData = {
      sender: user.name, email: user.email,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    if (socketRef.current) socketRef.current.emit("send_message", { roomId: roomKey, messageData });
    setChatInput("");
  };

  /* ────────────── WebRTC helpers (unchanged) ────────────── */
  const createPeerConnection = (remoteSocketId, remoteName, localStream) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current)
        socketRef.current.emit("webrtc_ice_candidate", { candidate: e.candidate, toSocketId: remoteSocketId });
    };
    pc.ontrack = (e) => {
      setRemoteStreams((prev) => ({ ...prev, [remoteSocketId]: { stream: e.streams[0], name: remoteName } }));
    };
    peersRef.current[remoteSocketId] = pc;
    return pc;
  };

  const handleJoinCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setInCall(true);
      const otherUsers = users.filter((u) => u.socketId !== socketRef.current?.id);
      for (const user of otherUsers) {
        const pc = createPeerConnection(user.socketId, user.name, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit("webrtc_offer", { roomId: roomKey, offer, toSocketId: user.socketId });
      }
    } catch (err) {
      console.error("Media error:", err);
      addToast("Could not access camera/microphone", "leave");
    }
  };

  const handleLeaveCall = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    setRemoteStreams({});
    setInCall(false);
    setMicMuted(false);
    setCamOff(false);
    if (socketRef.current) socketRef.current.emit("webrtc_leave", { roomId: roomKey });
  };

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMicMuted(!track.enabled); }
  };

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCamOff(!track.enabled); }
  };

  const handleLeaveRoom = () => {
    handleLeaveCall();
    if (socketRef.current) socketRef.current.disconnect();
    navigate("/");
  };

  /* ────────────── Socket setup (unchanged logic) ────────────── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    socketRef.current = io(import.meta.env.VITE_API_URL, { auth: { token } });

    emitCursorMove.current = debounce((data) => { socketRef.current.emit("cursor_move", data); }, 80);
    emitTyping.current     = debounce((data) => { socketRef.current.emit("typing", data); }, 300);

    socketRef.current.on("code_update", (incomingCode) => { isRemoteUpdate.current = true; setCode(incomingCode); });
    socketRef.current.on("language_update", (lang) => setLanguage(lang));
    socketRef.current.on("output_update", (out) => setOutput(out));
    socketRef.current.on("room_users", (roomUsers) => setUsers(roomUsers));
    socketRef.current.on("receive_message", (msg) => setMessages((prev) => [...prev, msg]));
    socketRef.current.on("user_joined", ({ name }) => { addToast(`${name} joined`, "join"); addActivity(`${name} joined the room`, "join"); });
    socketRef.current.on("user_left",   ({ name }) => { addToast(`${name} left`, "leave");  addActivity(`${name} left the room`, "leave"); });
    socketRef.current.on("user_typing", (name) => {
      setTypingUsers((prev) => (prev.includes(name) ? prev : [...prev, name]));
      clearTimeout(typingTimersRef.current[name]);
      typingTimersRef.current[name] = setTimeout(() => setTypingUsers((prev) => prev.filter((n) => n !== name)), 2000);
    });

    socketRef.current.on("file_created", (file) => { setFiles((prev) => [...prev, file]); addActivity(`File created: ${file.name}`, "file"); });
    socketRef.current.on("file_switched", (fileId) => {
      setFiles((prev) => {
        const f = prev.find((f) => f.id === fileId);
        if (f) { setActiveFileId(f.id); setCode(f.code || ""); setLanguage(f.language); }
        return prev;
      });
    });
    socketRef.current.on("file_code_update", ({ fileId, code: incomingCode }) => {
      setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, code: incomingCode } : f));
      setActiveFileId((cur) => { if (cur === fileId) { isRemoteUpdate.current = true; setCode(incomingCode); } return cur; });
    });
    socketRef.current.on("file_language_update", ({ fileId, language: lang }) => {
      setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, language: lang } : f));
      setActiveFileId((cur) => { if (cur === fileId) setLanguage(lang); return cur; });
    });
    socketRef.current.on("file_deleted", (fileId) => {
      setFiles((prev) => {
        const remaining = prev.filter((f) => f.id !== fileId);
        setActiveFileId((cur) => {
          if (cur === fileId && remaining.length > 0) { setCode(remaining[0].code || ""); setLanguage(remaining[0].language); return remaining[0].id; }
          return cur;
        });
        return remaining;
      });
    });

    socketRef.current.on("webrtc_offer", async ({ offer, fromSocketId, fromName }) => {
      if (!localStreamRef.current) return;
      const pc = createPeerConnection(fromSocketId, fromName, localStreamRef.current);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit("webrtc_answer", { answer, toSocketId: fromSocketId });
    });
    socketRef.current.on("webrtc_answer", async ({ answer, fromSocketId }) => {
      const pc = peersRef.current[fromSocketId];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });
    socketRef.current.on("webrtc_ice_candidate", async ({ candidate, fromSocketId }) => {
      const pc = peersRef.current[fromSocketId];
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });
    socketRef.current.on("webrtc_peer_left", ({ socketId }) => {
      peersRef.current[socketId]?.close();
      delete peersRef.current[socketId];
      setRemoteStreams((prev) => { const n = { ...prev }; delete n[socketId]; return n; });
    });

    fetchRoomData();

    return () => {
      if (socketRef.current) {
        ["code_update","language_update","output_update","room_users","receive_message",
         "cursor_update","typing","user_joined","user_left","user_typing","file_created",
         "file_switched","file_code_update","file_language_update","file_deleted",
         "webrtc_offer","webrtc_answer","webrtc_ice_candidate","webrtc_peer_left"]
          .forEach((ev) => socketRef.current.off(ev));
        socketRef.current.disconnect();
      }
    };
  }, [roomKey]);

  useEffect(() => {
    if (!inCall || !localStreamRef.current) return;
    const t = setTimeout(() => {
      const el = localVideoRef.current;
      if (el) { el.srcObject = localStreamRef.current; el.play().catch(() => {}); }
    }, 100);
    return () => clearTimeout(t);
  }, [inCall]);

  /* ────────────── Loading screen ────────────── */
  if (!joined) {
    return (
      <div style={s.loadingPage}>
        <div style={s.ambient} />
        <div style={s.grid} />
        <div style={s.loadingCard}>
          <div style={s.logoBadgeLg}>
            <span>C</span><span style={{ color: "#10B981" }}>-</span><span>C</span>
          </div>
          <div style={s.loadingSpinner} />
          <p style={s.loadingText}>Connecting to room...</p>
          <code style={s.loadingKey}>#{roomKey}</code>
        </div>
      </div>
    );
  }

  const activeFile = files.find((f) => f.id === activeFileId);

  /* ────────────── Main render ────────────── */
  return (
    <div style={s.page}>
      {/* Ambient */}
      <div style={s.ambient} />

      {/* ── Toast stack ── */}
      <div style={s.toastStack}>
        {toasts.map((toast) => (
          <div key={toast.id} style={{
            ...s.toast,
            borderLeftColor: toast.type === "join" ? "#10B981" : "#EF4444",
            background: toast.type === "join" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
          }}>
            <span style={{ color: toast.type === "join" ? "#10B981" : "#EF4444", fontWeight: "700", fontSize: "14px" }}>
              {toast.type === "join" ? "→" : "←"}
            </span>
            {toast.message}
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════
          TOP NAVBAR
          ════════════════════════════════════ */}
      <header style={s.navbar}>
        {/* Left: logo + breadcrumb */}
        <div style={s.navLeft}>
          <div style={s.logoBadge}>
            <span>C</span><span style={{ color: "#10B981" }}>-</span><span>C</span>
          </div>
          <span style={s.logoText}>Code-Collab</span>
          <span style={s.navSep}>/</span>
          <span style={s.breadcrumb}>
            {roomKey}
          </span>
          <div style={s.livePill}>
            <span style={s.liveDot} />
            Live
          </div>
        </div>

        {/* Center: peer avatars */}
        <div style={s.navPeers}>
          {users.slice(0, 6).map((user, i) => (
            <div
              key={user.socketId || i}
              title={`${user.name} — Online`}
              style={{
                ...s.peerAvatar,
                background: getUserColor(user.name || "?"),
                marginLeft: i > 0 ? "-8px" : "0",
                zIndex: 10 - i,
                border: `2px solid ${getUserColor(user.name || "?")}22`,
              }}
            >
              {(user.name || "?")[0].toUpperCase()}
            </div>
          ))}
          {users.length > 6 && (
            <div style={{ ...s.peerAvatar, background: "#242424", marginLeft: "-8px", zIndex: 0, color: "#8B8B8B", fontSize: "10px" }}>
              +{users.length - 6}
            </div>
          )}
          {users.length > 0 && (
            <span style={s.peerCount}>{users.length} online</span>
          )}
        </div>

        {/* Right: controls */}
        <div style={s.navRight}>
          <select value={language} onChange={handleLanguageChange} style={s.langSelect}>
            {languageOptions.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>

          <button onClick={handleRunCode} style={s.runBtn} disabled={running}>
            {running ? (
              <><span style={s.btnSpinner} />Running...</>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Run
              </>
            )}
          </button>

          <button onClick={handleClearOutput} style={s.ghostBtn} title="Clear output">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>

          <button onClick={handleCopyRoomKey} style={s.ghostBtn} title="Copy room key">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>

          <button onClick={handleCopyRoomLink} style={s.ghostBtn} title="Copy room link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </button>

          <button onClick={handleLeaveRoom} style={s.leaveBtn} title="Leave room">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Leave
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════
          MAIN LAYOUT
          ════════════════════════════════════ */}
      <div style={s.layout}>

        {/* ══════════════════════════
            LEFT PANEL: File explorer
            ══════════════════════════ */}
        <aside style={s.leftPanel}>
          {/* Panel header */}
          <div style={s.panelHeader}>
            <span style={s.panelHeaderTitle}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "6px" }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              Explorer
            </span>
          </div>

          {/* File list */}
          <div style={s.fileList}>
            {files.map((file) => {
              const isActive = file.id === activeFileId;
              const editingUser = users.find((u) => u.activeFile === file.id);
              return (
                <div
                  key={file.id}
                  onClick={() => handleSwitchFile(file)}
                  style={{
                    ...s.fileItem,
                    ...(isActive ? s.fileItemActive : {}),
                  }}
                >
                  <span style={s.fileItemIcon}>{getLangIcon(file.language)}</span>
                  <span style={s.fileItemName}>{file.name}</span>
                  {/* Git-style modified badge */}
                  <span style={s.fileItemBadge}>M</span>
                  {files.length > 1 && (
                    <button
                      onClick={(e) => handleDeleteFile(file.id, e)}
                      style={s.fileDeleteBtn}
                      title="Delete file"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* New file input */}
          <div style={s.newFileArea}>
            {showNewFileInput ? (
              <div style={s.newFileInputRow}>
                <input
                  autoFocus
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateFile();
                    if (e.key === "Escape") { setShowNewFileInput(false); setNewFileName(""); }
                  }}
                  placeholder="filename.py"
                  style={s.newFileInput}
                />
                <button onClick={handleCreateFile} style={s.newFileConfirm}>✓</button>
              </div>
            ) : (
              <button onClick={() => setShowNewFileInput(true)} style={s.newFileBtn}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                New File
              </button>
            )}
          </div>

          {/* Spacer + online users compact list */}
          <div style={s.leftPanelUsers}>
            <div style={s.panelSectionLabel}>Peers</div>
            {users.map((user, i) => (
              <div key={user.socketId || i} style={s.leftUserRow}>
                <div style={{ ...s.leftUserDot, background: getUserColor(user.name || "?") }} />
                <span style={s.leftUserName}>{user.name || "Guest"}</span>
                <span style={s.leftUserOnline}>●</span>
              </div>
            ))}
          </div>
        </aside>

        {/* ══════════════════════════
            CENTER: Code canvas
            ══════════════════════════ */}
        <main style={s.centerPanel}>
          {/* File tabs strip */}
          <div style={s.tabsBar}>
            {files.map((file) => {
              const isActive = file.id === activeFileId;
              return (
                <div
                  key={file.id}
                  onClick={() => handleSwitchFile(file)}
                  style={{
                    ...s.tab,
                    ...(isActive ? s.tabActive : {}),
                  }}
                >
                  <span style={s.tabIcon}>{getLangIcon(file.language)}</span>
                  <span style={s.tabName}>{file.name}</span>
                  {/* Peer presence dot */}
                  {users.filter((u) => u.socketId !== socketRef.current?.id).slice(0, 2).map((u) => (
                    <span key={u.socketId} style={{ ...s.tabPeerDot, background: getUserColor(u.name) }} />
                  ))}
                  {files.length > 1 && (
                    <span onClick={(e) => handleDeleteFile(file.id, e)} style={s.tabClose}>×</span>
                  )}
                </div>
              );
            })}
            {showNewFileInput && files.length === 0 ? null : (
              !showNewFileInput && (
                <button onClick={() => setShowNewFileInput(true)} style={s.tabNewFile}>
                  + New
                </button>
              )
            )}
          </div>

          {/* Editor surface */}
          <div style={s.editorSurface}>
            {/* Editor status bar */}
            <div style={s.editorStatusBar}>
              <span style={s.editorStatusItem}>
                <span style={{ ...s.statusDot, background: getUserColor(getCurrentUser().name) }} />
                {activeFile?.name || "untitled"}
              </span>
              <span style={s.editorStatusSep}>·</span>
              <span style={{ ...s.editorStatusItem, color: "#06B6D4" }}>{language}</span>
              <span style={s.editorStatusSep}>·</span>
              <span style={s.editorStatusItem}>UTF-8</span>
              <span style={{ flex: 1 }} />
              {Object.keys(remoteCursorsRef.current).map((name) => (
                <span key={name} style={{ ...s.cursorBadge, background: getUserColor(name) }}>
                  {name}
                </span>
              ))}
            </div>

            {/* Monaco Editor */}
            <Editor
              height="calc(100vh - 260px)"
              language={language}
              value={code}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontLigatures: true,
                lineHeight: 22,
                minimap: { enabled: true, renderCharacters: false },
                scrollBeyondLastLine: false,
                quickSuggestions: true,
                suggestOnTriggerCharacters: true,
                padding: { top: 16, bottom: 16 },
                renderLineHighlight: "gutter",
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                smoothScrolling: true,
              }}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;

                const completions = {
                  python: ["print","len","range","input","int","str","float","list","dict","set","tuple","type","isinstance","hasattr","getattr","setattr","enumerate","zip","map","filter","sorted","reversed","sum","min","max","abs","round","open","close","append","extend","remove","pop","insert","index","count","split","join","strip","replace","format","upper","lower","startswith","endswith","def","class","return","import","from","as","if","elif","else","for","while","break","continue","pass","try","except","finally","raise","with","lambda","yield","global","nonlocal","True","False","None","and","or","not","in","is","self","__init__","__str__","__repr__","super"],
                  java: ["public","private","protected","static","void","class","interface","extends","implements","new","return","import","package","if","else","for","while","do","break","continue","try","catch","finally","throw","throws","final","abstract","synchronized","this","super","null","true","false","int","long","double","float","boolean","char","byte","short","String","System","out","println","print","main","ArrayList","HashMap","List","Map","Set","Iterator","Override","StringBuilder"],
                  cpp: ["include","iostream","using","namespace","std","cout","cin","endl","int","long","double","float","char","bool","void","string","auto","const","static","return","if","else","for","while","do","break","continue","class","struct","public","private","protected","new","delete","nullptr","true","false","vector","map","set","pair","push_back","size","begin","end","printf","scanf","main"],
                  c: ["include","stdio","stdlib","string","int","long","double","float","char","void","const","static","return","if","else","for","while","do","break","continue","struct","typedef","sizeof","malloc","free","printf","scanf","NULL","true","false","main","puts","gets","fopen","fclose","fprintf","fscanf","strlen","strcpy","strcmp"],
                  typescript: ["interface","type","enum","namespace","declare","readonly","abstract","implements","extends","keyof","typeof","as","is","infer","never","unknown","any","void","string","number","boolean","object","symbol","bigint","null","undefined","console","log","error","warn","Promise","async","await","function","return","const","let","var","class","new","this","super","import","export","default","if","else","for","while","break","continue","try","catch","finally","throw","Array","Object","Map","Set","Record","Partial","Required","Pick","Omit"],
                };

                const disposables = [];
                Object.entries(completions).forEach(([lang, keywords]) => {
                  const d = monaco.languages.registerCompletionItemProvider(lang, {
                    provideCompletionItems: (model, position) => {
                      const word = model.getWordUntilPosition(position);
                      const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
                      return { suggestions: keywords.map((kw) => ({ label: kw, kind: monaco.languages.CompletionItemKind.Keyword, insertText: kw, range })) };
                    },
                  });
                  disposables.push(d);
                });

                editor.onDidDispose(() => disposables.forEach((d) => d.dispose()));

                socketRef.current.on("cursor_update", ({ name, position, color }) => {
                  if (!position) return;
                  remoteCursorsRef.current[name] = position;
                  const cursorColor = color || getUserColor(name);
                  const safeId = name.replace(/\s+/g, "-");
                  if (!document.getElementById(`cursor-style-${safeId}`)) {
                    const style = document.createElement("style");
                    style.id = `cursor-style-${safeId}`;
                    style.innerHTML = `
                      .remote-cursor-${safeId} { border-left: 2px solid ${cursorColor}; }
                      .cursor-label-${safeId}::after {
                        content: "${name}";
                        background: ${cursorColor};
                        color: white;
                        padding: 2px 6px;
                        margin-left: 5px;
                        border-radius: 4px;
                        font-size: 10px;
                        pointer-events: none;
                        white-space: nowrap;
                        font-family: 'JetBrains Mono', monospace;
                      }
                    `;
                    document.head.appendChild(style);
                  }
                  const decoration = {
                    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                    options: { className: `remote-cursor-${safeId}`, afterContentClassName: `cursor-label-${safeId}` },
                  };
                  if (decorationsRef.current[name]) decorationsRef.current[name].set([decoration]);
                  else decorationsRef.current[name] = editor.createDecorationsCollection([decoration]);
                });

                editor.onDidChangeCursorPosition((e) => {
                  const user = getCurrentUserRef.current();
                  if (socketRef.current) {
                    emitCursorMove.current({ roomId: roomKey, name: user.name, position: e.position, color: getUserColor(user.name) });
                  }
                });
              }}
            />
          </div>

          {/* ── Bottom: stdin + output ── */}
          <div style={s.ioPanel}>
            {/* stdin */}
            <div style={s.stdinSection}>
              <div style={s.ioPanelHeader}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                <span>stdin</span>
              </div>
              <textarea
                placeholder="Custom input..."
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                style={s.stdinArea}
              />
            </div>

            {/* output */}
            <div style={s.outputSection}>
              <div style={s.ioPanelHeader}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                <span style={{ color: "#10B981" }}>output</span>
                <span style={{ flex: 1 }} />
                <button onClick={handleClearOutput} style={s.ioActionBtn}>clear</button>
              </div>
              <pre style={s.outputPre}>{output || "No output yet"}</pre>
            </div>
          </div>
        </main>

        {/* ══════════════════════════
            RIGHT PANEL: Collab Hub
            ══════════════════════════ */}
        <aside style={s.rightPanel}>
          {/* Tab strip */}
          <div style={s.rightTabStrip}>
            {[
              { id: "peers",    label: "Peers",    icon: "👥" },
              { id: "chat",     label: "Chat",     icon: "💬" },
              { id: "activity", label: "Activity", icon: "⚡" },
              { id: "voice",    label: "Voice",    icon: "🎙" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRightTab(tab.id)}
                style={{
                  ...s.rightTab,
                  ...(rightTab === tab.id ? s.rightTabActive : {}),
                }}
              >
                <span style={{ fontSize: "13px" }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ── Peers tab ── */}
          {rightTab === "peers" && (
            <div style={s.tabContent}>
              <div style={s.sectionLabel}>Active collaborators</div>
              {users.length === 0 ? (
                <div style={s.emptyState}>
                  <div style={s.emptyIcon}>👥</div>
                  <div style={s.emptyText}>No one else is here</div>
                  <div style={s.emptySubtext}>Share the room key to invite others</div>
                </div>
              ) : (
                users.map((user, i) => (
                  <div key={user.socketId || i} style={s.peerCard}>
                    <div style={{ ...s.peerCardAvatar, background: getUserColor(user.name || "?") }}>
                      {(user.name || "?")[0].toUpperCase()}
                    </div>
                    <div style={s.peerCardInfo}>
                      <div style={s.peerCardName}>{user.name || "Guest User"}</div>
                      <div style={s.peerCardEmail}>{user.email || "—"}</div>
                    </div>
                    <div style={{ ...s.peerOnlineDot, background: getUserColor(user.name || "?") }} />
                  </div>
                ))
              )}

              {/* Share section */}
              <div style={{ marginTop: "20px" }}>
                <div style={s.sectionLabel}>Room key</div>
                <div style={s.roomKeyDisplay}>
                  <code style={s.roomKeyCode}>#{roomKey}</code>
                  <button onClick={handleCopyRoomKey} style={s.copyKeyBtn}>Copy</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Chat tab ── */}
          {rightTab === "chat" && (
            <div style={s.tabContent}>
              <div style={s.chatMessages}>
                {messages.length === 0 ? (
                  <div style={s.emptyState}>
                    <div style={s.emptyIcon}>💬</div>
                    <div style={s.emptyText}>No messages yet</div>
                    <div style={s.emptySubtext}>Start the conversation</div>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} style={s.msgBubble}>
                      <div style={s.msgHeader}>
                        <div style={{ ...s.msgAvatar, background: getUserColor(msg.sender || "?") }}>
                          {(msg.sender || "?")[0].toUpperCase()}
                        </div>
                        <span style={s.msgSender}>{msg.sender}</span>
                        <span style={s.msgTime}>{msg.time}</span>
                      </div>
                      <div style={s.msgText}>{msg.text}</div>
                    </div>
                  ))
                )}
              </div>
              {typingUsers.length > 0 && (
                <div style={s.typingBar}>
                  <span style={s.typingDots}>···</span>
                  {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing
                </div>
              )}
              <div style={s.chatInputRow}>
                <input
                  type="text"
                  placeholder="Message..."
                  value={chatInput}
                  onChange={(e) => {
                    setChatInput(e.target.value);
                    const user = getCurrentUser();
                    emitTyping.current({ roomId: roomKey, name: user.name });
                  }}
                  style={s.chatInput}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
                />
                <button onClick={handleSendMessage} style={s.sendBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
          )}

          {/* ── Activity tab ── */}
          {rightTab === "activity" && (
            <div style={s.tabContent}>
              <div style={s.sectionLabel}>Live event stream</div>
              {activityLog.length === 0 ? (
                <div style={s.emptyState}>
                  <div style={s.emptyIcon}>⚡</div>
                  <div style={s.emptyText}>No activity yet</div>
                  <div style={s.emptySubtext}>Events will appear here in real time</div>
                </div>
              ) : (
                activityLog.map((entry) => (
                  <div key={entry.id} style={s.activityEntry}>
                    <span style={{
                      ...s.activityDot,
                      background: entry.type === "join" ? "#10B981" : entry.type === "leave" ? "#EF4444" : entry.type === "run" ? "#3B82F6" : "#F59E0B",
                    }} />
                    <span style={s.activityMsg}>{entry.msg}</span>
                    <span style={s.activityTs}>{entry.ts}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Voice tab ── */}
          {rightTab === "voice" && (
            <div style={s.tabContent}>
              <div style={s.sectionLabel}>Voice &amp; Video</div>
              {!inCall ? (
                <div style={s.voiceOff}>
                  <div style={s.voiceOffIcon}>🎙</div>
                  <div style={s.voiceOffText}>Not in a call</div>
                  <button onClick={handleJoinCall} style={s.joinCallBtn}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9A16 16 0 0 0 15 16.09l1.94-1.94a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    Join Call
                  </button>
                </div>
              ) : (
                <>
                  <div style={s.callControls}>
                    <button
                      onClick={toggleMic}
                      style={{ ...s.callCtrlBtn, background: micMuted ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)", borderColor: micMuted ? "#EF4444" : "#10B981", color: micMuted ? "#EF4444" : "#10B981" }}
                      title={micMuted ? "Unmute" : "Mute"}
                    >
                      {micMuted ? "🔇" : "🎙"}<br />
                      <span style={{ fontSize: "10px" }}>{micMuted ? "Muted" : "Mic"}</span>
                    </button>
                    <button
                      onClick={toggleCam}
                      style={{ ...s.callCtrlBtn, background: camOff ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)", borderColor: camOff ? "#EF4444" : "#10B981", color: camOff ? "#EF4444" : "#10B981" }}
                      title={camOff ? "Turn on cam" : "Turn off cam"}
                    >
                      {camOff ? "📷" : "📹"}<br />
                      <span style={{ fontSize: "10px" }}>{camOff ? "Off" : "Cam"}</span>
                    </button>
                    <button
                      onClick={handleLeaveCall}
                      style={{ ...s.callCtrlBtn, background: "rgba(239,68,68,0.15)", borderColor: "#EF4444", color: "#EF4444" }}
                      title="Leave call"
                    >
                      ✕<br />
                      <span style={{ fontSize: "10px" }}>Leave</span>
                    </button>
                  </div>

                  <div style={s.videoGrid}>
                    <div style={s.videoTile}>
                      <video ref={localVideoRef} autoPlay muted playsInline style={s.video} />
                      <span style={s.videoLabel}>You</span>
                    </div>
                    {Object.entries(remoteStreams).map(([sid, { stream, name }]) => (
                      <div key={sid} style={s.videoTile}>
                        <video
                          autoPlay playsInline style={s.video}
                          ref={(el) => { if (el && el.srcObject !== stream) { el.srcObject = stream; el.play().catch(() => {}); } }}
                        />
                        <span style={s.videoLabel}>{name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   STYLES
   ════════════════════════════════════════════════════════════ */
const s = {
  /* ── Base ── */
  page: {
    minHeight: "100vh",
    background: "#070707",
    color: "#F5F5F5",
    fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  ambient: {
    position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
    background: "radial-gradient(ellipse 1200px 800px at 30% 20%, rgba(59,130,246,0.03) 0%, transparent 60%)",
  },
  grid: {
    position: "fixed", inset: 0, pointerEvents: "none",
    backgroundImage: "linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)",
    backgroundSize: "48px 48px", opacity: 0.35,
  },

  /* ── Loading ── */
  loadingPage: {
    minHeight: "100vh", background: "#070707", color: "#F5F5F5",
    display: "flex", justifyContent: "center", alignItems: "center",
    flexDirection: "column", position: "relative", overflow: "hidden",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  loadingCard: {
    position: "relative", zIndex: 10,
    display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
    background: "rgba(18,18,18,0.9)", border: "1px solid #242424",
    borderRadius: "16px", padding: "40px 48px",
    boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
  },
  logoBadgeLg: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "48px", height: "48px",
    background: "#0D0D0D", border: "1px solid #10B981",
    borderRadius: "12px", fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px", fontWeight: "700", letterSpacing: "-1px",
    color: "#F5F5F5", boxShadow: "0 0 20px rgba(16,185,129,0.25)",
  },
  loadingSpinner: {
    width: "28px", height: "28px",
    border: "2px solid #1A1A1A",
    borderTopColor: "#10B981",
    borderRadius: "50%", animation: "spin 0.8s linear infinite",
  },
  loadingText: { fontSize: "14px", color: "#8B8B8B", margin: 0 },
  loadingKey: {
    fontSize: "12px", color: "#4A4A4A",
    fontFamily: "'JetBrains Mono', monospace",
    background: "#0D0D0D", padding: "4px 12px",
    borderRadius: "6px", border: "1px solid #1A1A1A",
  },

  /* ── Toast ── */
  toastStack: {
    position: "fixed", top: "68px", right: "16px", zIndex: 9999,
    display: "flex", flexDirection: "column", gap: "8px", pointerEvents: "none",
  },
  toast: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 16px", borderRadius: "8px",
    border: "1px solid", borderLeft: "3px solid",
    fontSize: "13px", color: "#F5F5F5", fontWeight: "500",
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
    animation: "fade-in 0.2s ease",
    backdropFilter: "blur(20px)",
  },

  /* ── Navbar ── */
  navbar: {
    position: "relative", zIndex: 100,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    height: "48px", padding: "0 16px",
    background: "rgba(12,12,12,0.95)",
    backdropFilter: "blur(20px)",
    borderBottom: "1px solid #1A1A1A",
    flexShrink: 0, gap: "12px",
  },
  navLeft: { display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 },
  logoBadge: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "28px", height: "28px",
    background: "#0D0D0D", border: "1px solid #10B981",
    borderRadius: "7px", fontFamily: "'JetBrains Mono', monospace",
    fontSize: "8px", fontWeight: "700", letterSpacing: "-1px",
    color: "#F5F5F5", flexShrink: 0,
    boxShadow: "0 0 10px rgba(16,185,129,0.2)",
  },
  logoText: { fontSize: "13px", fontWeight: "800", color: "#F5F5F5", letterSpacing: "0.5px" },
  navSep: { color: "#2A2A2A", fontSize: "16px" },
  breadcrumb: {
    fontSize: "12px", color: "#8B8B8B",
    fontFamily: "'JetBrains Mono', monospace",
    background: "#0D0D0D", border: "1px solid #1A1A1A",
    padding: "2px 10px", borderRadius: "20px",
  },
  livePill: {
    display: "flex", alignItems: "center", gap: "5px",
    fontSize: "11px", fontWeight: "600", color: "#10B981",
    background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
    padding: "2px 8px", borderRadius: "20px",
  },
  liveDot: {
    width: "5px", height: "5px", borderRadius: "50%", background: "#10B981",
    animation: "pulse-glow 1.5s ease-in-out infinite", display: "inline-block",
  },

  /* Peer avatars cluster */
  navPeers: { display: "flex", alignItems: "center", flexShrink: 0 },
  peerAvatar: {
    width: "26px", height: "26px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "10px", fontWeight: "700", color: "#fff",
    cursor: "default", flexShrink: 0, position: "relative",
  },
  peerCount: { fontSize: "11px", color: "#4A4A4A", marginLeft: "10px", whiteSpace: "nowrap" },

  navRight: { display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 },
  langSelect: {
    padding: "5px 8px", borderRadius: "6px",
    border: "1px solid #1A1A1A", background: "#0D0D0D",
    color: "#8B8B8B", fontSize: "12px", cursor: "pointer",
    fontFamily: "'JetBrains Mono', monospace",
    outline: "none",
  },
  runBtn: {
    display: "flex", alignItems: "center", gap: "6px",
    padding: "6px 14px", borderRadius: "6px", border: "none",
    background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    color: "#fff", fontSize: "12px", fontWeight: "700",
    cursor: "pointer", boxShadow: "0 0 14px rgba(16,185,129,0.25)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  ghostBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "30px", height: "30px", borderRadius: "6px",
    border: "1px solid #1A1A1A", background: "transparent",
    color: "#4A4A4A", cursor: "pointer",
    transition: "color 0.15s, border-color 0.15s",
  },
  leaveBtn: {
    display: "flex", alignItems: "center", gap: "5px",
    padding: "6px 12px", borderRadius: "6px",
    border: "1px solid rgba(239,68,68,0.3)",
    background: "rgba(239,68,68,0.06)",
    color: "#EF4444", fontSize: "12px", fontWeight: "600",
    cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  btnSpinner: {
    display: "inline-block", width: "10px", height: "10px",
    border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "#fff",
    borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0,
  },

  /* ── Layout ── */
  layout: {
    display: "flex", flex: 1,
    overflow: "hidden",
    position: "relative", zIndex: 10,
    minHeight: 0,
  },

  /* ── Left panel ── */
  leftPanel: {
    width: "210px", flexShrink: 0,
    background: "#0A0A0A",
    borderRight: "1px solid #1A1A1A",
    display: "flex", flexDirection: "column",
    overflow: "hidden",
  },
  panelHeader: {
    padding: "10px 14px",
    borderBottom: "1px solid #1A1A1A",
    flexShrink: 0,
  },
  panelHeaderTitle: {
    fontSize: "10px", fontWeight: "700", color: "#4A4A4A",
    textTransform: "uppercase", letterSpacing: "0.8px",
    display: "flex", alignItems: "center",
  },
  fileList: { flex: 1, overflowY: "auto", padding: "6px 0" },
  fileItem: {
    display: "flex", alignItems: "center", gap: "7px",
    padding: "6px 14px",
    cursor: "pointer", fontSize: "12px", color: "#4A4A4A",
    transition: "background 0.1s, color 0.1s",
    position: "relative",
  },
  fileItemActive: {
    background: "rgba(59,130,246,0.08)",
    color: "#F5F5F5",
    borderLeft: "2px solid #3B82F6",
    paddingLeft: "12px",
  },
  fileItemIcon: { fontSize: "12px", flexShrink: 0 },
  fileItemName: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  fileItemBadge: {
    fontSize: "9px", fontWeight: "700",
    color: "#F59E0B", flexShrink: 0,
  },
  fileDeleteBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#4A4A4A", fontSize: "14px", lineHeight: 1,
    padding: "0 2px", borderRadius: "3px",
    flexShrink: 0,
    fontFamily: "sans-serif",
  },

  newFileArea: {
    padding: "8px 10px",
    borderTop: "1px solid #1A1A1A",
    flexShrink: 0,
  },
  newFileInputRow: { display: "flex", gap: "4px" },
  newFileInput: {
    flex: 1, padding: "5px 8px", borderRadius: "6px",
    border: "1px solid #10B981", background: "#0D0D0D",
    color: "#F5F5F5", fontSize: "12px", outline: "none",
    fontFamily: "'JetBrains Mono', monospace",
  },
  newFileConfirm: {
    padding: "5px 8px", borderRadius: "6px", border: "none",
    background: "#10B981", color: "#fff", fontSize: "12px", cursor: "pointer",
  },
  newFileBtn: {
    display: "flex", alignItems: "center", gap: "6px",
    width: "100%", padding: "6px 10px", borderRadius: "6px",
    border: "1px dashed #242424", background: "transparent",
    color: "#4A4A4A", fontSize: "11px", cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },

  leftPanelUsers: {
    borderTop: "1px solid #1A1A1A",
    padding: "8px 0 8px",
    flexShrink: 0,
  },
  panelSectionLabel: {
    fontSize: "9px", fontWeight: "700", color: "#2A2A2A",
    textTransform: "uppercase", letterSpacing: "0.8px",
    padding: "0 14px 6px",
  },
  leftUserRow: {
    display: "flex", alignItems: "center", gap: "7px",
    padding: "4px 14px", fontSize: "12px",
  },
  leftUserDot: { width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0 },
  leftUserName: { flex: 1, color: "#4A4A4A", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  leftUserOnline: { fontSize: "8px", color: "#10B981" },

  /* ── Center panel ── */
  centerPanel: {
    flex: 1, display: "flex", flexDirection: "column",
    overflow: "hidden", minWidth: 0,
    background: "#0D0D0D",
  },

  /* File tabs */
  tabsBar: {
    display: "flex", alignItems: "flex-end", gap: "2px",
    padding: "0 8px",
    background: "#0A0A0A",
    borderBottom: "1px solid #1A1A1A",
    overflowX: "auto", flexShrink: 0,
    minHeight: "38px",
  },
  tab: {
    display: "flex", alignItems: "center", gap: "5px",
    padding: "7px 14px 6px",
    fontSize: "12px", color: "#4A4A4A",
    cursor: "pointer", userSelect: "none",
    background: "transparent", border: "none",
    borderTop: "2px solid transparent",
    whiteSpace: "nowrap", position: "relative",
    transition: "color 0.15s",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  tabActive: {
    color: "#F5F5F5",
    background: "#0D0D0D",
    borderTop: "2px solid #3B82F6",
    borderRadius: "6px 6px 0 0",
  },
  tabIcon: { fontSize: "11px", flexShrink: 0 },
  tabName: { fontSize: "12px" },
  tabPeerDot: {
    width: "5px", height: "5px", borderRadius: "50%", display: "inline-block", flexShrink: 0,
  },
  tabClose: {
    fontSize: "14px", color: "#4A4A4A", lineHeight: 1,
    padding: "0 2px", borderRadius: "3px", cursor: "pointer",
    marginLeft: "2px",
  },
  tabNewFile: {
    padding: "4px 10px", borderRadius: "4px",
    border: "1px dashed #1A1A1A", background: "transparent",
    color: "#2A2A2A", fontSize: "11px", cursor: "pointer",
    marginBottom: "6px", alignSelf: "center",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },

  /* Editor */
  editorSurface: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  editorStatusBar: {
    display: "flex", alignItems: "center", gap: "0",
    padding: "3px 14px",
    background: "#0A0A0A",
    borderBottom: "1px solid #1A1A1A",
    flexShrink: 0, flexWrap: "wrap", minHeight: "26px",
  },
  editorStatusItem: { fontSize: "11px", color: "#4A4A4A", display: "flex", alignItems: "center", gap: "4px" },
  editorStatusSep: { fontSize: "11px", color: "#1A1A1A", margin: "0 8px" },
  statusDot: { width: "6px", height: "6px", borderRadius: "50%", display: "inline-block" },
  cursorBadge: {
    fontSize: "10px", color: "#fff", padding: "1px 6px",
    borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace",
    marginLeft: "4px",
  },

  /* IO panel */
  ioPanel: {
    display: "flex", flexShrink: 0,
    borderTop: "1px solid #1A1A1A",
    background: "#0A0A0A",
    maxHeight: "160px",
  },
  stdinSection: {
    flex: 1, display: "flex", flexDirection: "column",
    borderRight: "1px solid #1A1A1A",
  },
  outputSection: {
    flex: 2, display: "flex", flexDirection: "column", overflow: "hidden",
  },
  ioPanelHeader: {
    display: "flex", alignItems: "center", gap: "6px",
    padding: "5px 12px", borderBottom: "1px solid #1A1A1A",
    fontSize: "10px", fontWeight: "700", color: "#4A4A4A",
    textTransform: "uppercase", letterSpacing: "0.8px",
    flexShrink: 0,
  },
  ioActionBtn: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: "10px", color: "#4A4A4A",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    letterSpacing: "0.3px",
  },
  stdinArea: {
    flex: 1, padding: "8px 12px",
    background: "transparent", border: "none", outline: "none",
    color: "#8B8B8B", fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px", resize: "none",
    lineHeight: "1.6",
  },
  outputPre: {
    flex: 1, margin: 0, padding: "8px 12px",
    fontFamily: "'JetBrains Mono', monospace", fontSize: "12px",
    color: "#10B981", lineHeight: "1.6",
    whiteSpace: "pre-wrap", wordBreak: "break-word",
    overflowY: "auto",
  },

  /* ── Right panel ── */
  rightPanel: {
    width: "280px", flexShrink: 0,
    background: "#0A0A0A",
    borderLeft: "1px solid #1A1A1A",
    display: "flex", flexDirection: "column",
    overflow: "hidden",
  },
  rightTabStrip: {
    display: "flex",
    borderBottom: "1px solid #1A1A1A",
    flexShrink: 0,
  },
  rightTab: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
    gap: "2px", padding: "8px 4px 7px",
    fontSize: "9px", fontWeight: "700", color: "#2A2A2A",
    textTransform: "uppercase", letterSpacing: "0.5px",
    background: "transparent", border: "none", cursor: "pointer",
    borderBottom: "2px solid transparent",
    transition: "color 0.15s, border-color 0.15s",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  rightTabActive: {
    color: "#F5F5F5",
    borderBottomColor: "#3B82F6",
  },
  tabContent: {
    flex: 1, overflowY: "auto", padding: "14px",
    display: "flex", flexDirection: "column", gap: "8px",
  },

  sectionLabel: {
    fontSize: "9px", fontWeight: "700", color: "#2A2A2A",
    textTransform: "uppercase", letterSpacing: "0.8px",
    marginBottom: "4px",
  },

  /* Peer cards */
  peerCard: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 12px",
    background: "#0D0D0D", border: "1px solid #1A1A1A",
    borderRadius: "8px",
    transition: "border-color 0.15s",
  },
  peerCardAvatar: {
    width: "32px", height: "32px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "12px", fontWeight: "700", color: "#fff", flexShrink: 0,
  },
  peerCardInfo: { flex: 1, overflow: "hidden" },
  peerCardName: { fontSize: "13px", fontWeight: "600", color: "#F5F5F5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  peerCardEmail: { fontSize: "11px", color: "#4A4A4A", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  peerOnlineDot: { width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0, animation: "pulse-glow 2s ease-in-out infinite" },

  /* Room key display */
  roomKeyDisplay: {
    display: "flex", alignItems: "center", gap: "8px",
    background: "#0D0D0D", border: "1px solid #1A1A1A",
    borderRadius: "8px", padding: "8px 12px",
  },
  roomKeyCode: {
    flex: 1, fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px", color: "#8B8B8B",
  },
  copyKeyBtn: {
    padding: "4px 10px", borderRadius: "5px",
    border: "1px solid #242424", background: "transparent",
    color: "#4A4A4A", fontSize: "11px", cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },

  /* Chat */
  chatMessages: {
    flex: 1, overflowY: "auto",
    background: "#0D0D0D", border: "1px solid #1A1A1A",
    borderRadius: "8px", padding: "10px",
    minHeight: "200px", maxHeight: "340px",
    display: "flex", flexDirection: "column", gap: "10px",
  },
  msgBubble: { display: "flex", flexDirection: "column", gap: "4px" },
  msgHeader: { display: "flex", alignItems: "center", gap: "6px" },
  msgAvatar: {
    width: "18px", height: "18px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "8px", fontWeight: "700", color: "#fff", flexShrink: 0,
  },
  msgSender: { fontSize: "12px", fontWeight: "700", color: "#F5F5F5", flex: 1 },
  msgTime: { fontSize: "10px", color: "#2A2A2A" },
  msgText: { fontSize: "13px", color: "#8B8B8B", paddingLeft: "24px", lineHeight: "1.5", wordBreak: "break-word" },
  typingBar: {
    fontSize: "11px", color: "#4A4A4A", fontStyle: "italic",
    display: "flex", alignItems: "center", gap: "6px",
  },
  typingDots: { color: "#3B82F6", letterSpacing: "2px", fontStyle: "normal" },
  chatInputRow: { display: "flex", gap: "6px" },
  chatInput: {
    flex: 1, padding: "9px 12px", borderRadius: "8px",
    border: "1px solid #1A1A1A", background: "#0D0D0D",
    color: "#F5F5F5", fontSize: "13px", outline: "none",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: "border-color 0.15s",
  },
  sendBtn: {
    width: "36px", height: "36px", borderRadius: "8px", border: "none",
    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    color: "#fff", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },

  /* Activity */
  activityEntry: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "7px 10px",
    background: "#0D0D0D", border: "1px solid #1A1A1A",
    borderRadius: "6px",
  },
  activityDot: { width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0 },
  activityMsg: { flex: 1, fontSize: "12px", color: "#8B8B8B", lineHeight: "1.4" },
  activityTs: { fontSize: "10px", color: "#2A2A2A", flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" },

  /* Voice / Video */
  voiceOff: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: "10px", padding: "24px 0",
  },
  voiceOffIcon: { fontSize: "32px" },
  voiceOffText: { fontSize: "14px", fontWeight: "600", color: "#4A4A4A" },
  joinCallBtn: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "10px 20px", borderRadius: "8px", border: "none",
    background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    color: "#fff", fontSize: "13px", fontWeight: "700",
    cursor: "pointer", boxShadow: "0 0 16px rgba(16,185,129,0.2)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  callControls: { display: "flex", gap: "8px", marginBottom: "12px" },
  callCtrlBtn: {
    flex: 1, padding: "10px 6px", borderRadius: "8px",
    border: "1px solid", background: "transparent",
    cursor: "pointer", fontSize: "18px", textAlign: "center",
    lineHeight: "1.2", fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: "all 0.15s",
  },
  videoGrid: { display: "flex", flexDirection: "column", gap: "8px" },
  videoTile: {
    position: "relative", borderRadius: "8px", overflow: "hidden",
    background: "#0D0D0D", border: "1px solid #1A1A1A",
  },
  video: {
    width: "100%", display: "block", maxHeight: "120px",
    objectFit: "cover", background: "#000",
  },
  videoLabel: {
    position: "absolute", bottom: "6px", left: "8px",
    fontSize: "10px", color: "#fff",
    background: "rgba(0,0,0,0.7)", padding: "2px 6px",
    borderRadius: "4px", fontFamily: "'JetBrains Mono', monospace",
  },

  /* Empty states */
  emptyState: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: "6px", padding: "28px 0",
  },
  emptyIcon: { fontSize: "28px", opacity: 0.3 },
  emptyText: { fontSize: "13px", fontWeight: "600", color: "#4A4A4A" },
  emptySubtext: { fontSize: "11px", color: "#2A2A2A", textAlign: "center" },
};

export default RoomPage;
