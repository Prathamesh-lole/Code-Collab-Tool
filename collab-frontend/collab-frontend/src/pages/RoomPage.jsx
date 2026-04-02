import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Editor from "@monaco-editor/react";
import { useNavigate, useParams } from "react-router-dom";

const languageOptions = [
  "javascript",
  "python",
  "java",
  "cpp",
  "c",
  "typescript",
];

// Hash-based color — same name always gets same color
const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};

const getUserColor = (name) => {
  const colors = ["#ef4444", "#22c55e", "#3b82f6", "#eab308", "#a855f7", "#f97316"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

function RoomPage() {
  const { roomKey } = useParams();
  const navigate = useNavigate();

  const socketRef = useRef(null);
  const isRemoteUpdate = useRef(false);
  const editorRef = useRef(null);
  const getCurrentUserRef = useRef(null);
  const decorationsRef = useRef({}); // { [userName]: [decorationId] }
  const monacoRef = useRef(null);

  const [joined, setJoined] = useState(false);
  const [code, setCode] = useState("// Start coding here...");
  const [language, setLanguage] = useState("javascript");
  const [users, setUsers] = useState([]);
  const [output, setOutput] = useState("Click 'Run Code' to see output here...");
  const [running, setRunning] = useState(false);
  const [stdin, setStdin] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [toasts, setToasts] = useState([]);
  const typingTimersRef = useRef({});
  const remoteCursorsRef = useRef({});
  const emitCursorMove = useRef(null);
  const emitTyping = useRef(null);

  // ── Phase 13: File system ──
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [newFileName, setNewFileName] = useState("");
  const [showNewFileInput, setShowNewFileInput] = useState(false);

  // ── Phase 14: Voice / Video ──
  const [inCall, setInCall] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const peersRef = useRef({});        // { socketId: RTCPeerConnection }
  const [remoteStreams, setRemoteStreams] = useState({}); // { socketId: { stream, name } }

  const fetchRoomData = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/rooms/key/${roomKey}`);
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Room not found");
        navigate("/");
        return;
      }

      setCode(data.code || "// Start coding here...");
      setLanguage(data.language || "javascript");

      if (socketRef.current) {
        socketRef.current.emit("join_room", roomKey);
      }

      // Load files for this room
      const filesRes = await fetch(`http://localhost:5000/api/rooms/${roomKey}/files`);
      const filesData = await filesRes.json();
      if (filesData.length > 0) {
        setFiles(filesData);
        setActiveFileId(filesData[0].id);
        setCode(filesData[0].code || "");
        setLanguage(filesData[0].language || "javascript");
      }

      setJoined(true);
    } catch (error) {
      console.error("Error joining room:", error);
      alert("Failed to join room");
      navigate("/");
    }
  };

  const saveCodeToDatabase = async (updatedCode) => {
    try {
      await fetch(`http://localhost:5000/api/rooms/key/${roomKey}/code`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: updatedCode }),
      });
    } catch (error) {
      console.error("Error saving code:", error);
    }
  };

  const saveLanguageToDatabase = async (updatedLanguage) => {
    try {
      await fetch(`http://localhost:5000/api/rooms/key/${roomKey}/language`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ language: updatedLanguage }),
      });
    } catch (error) {
      console.error("Error saving language:", error);
    }
  };

  // ── File management ──
  const handleCreateFile = async () => {
    const name = newFileName.trim();
    if (!name) return;
    const res = await fetch(`http://localhost:5000/api/rooms/${roomKey}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  };

  const handleSwitchFile = (file) => {
    setActiveFileId(file.id);
    setCode(file.code || "");
    setLanguage(file.language);
    if (socketRef.current) socketRef.current.emit("file_switched", { roomId: roomKey, fileId: file.id });
  };

  const handleDeleteFile = async (fileId, e) => {
    e.stopPropagation();
    if (files.length === 1) return; // keep at least one file
    await fetch(`http://localhost:5000/api/rooms/files/${fileId}`, { method: "DELETE" });
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

    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    if (socketRef.current) {
      socketRef.current.emit("code_change", { roomId: roomKey, code: newCode });
      if (activeFileId) socketRef.current.emit("file_code_change", { roomId: roomKey, fileId: activeFileId, code: newCode });
    }

    saveCodeToDatabase(newCode);
    if (activeFileId) {
      fetch(`http://localhost:5000/api/rooms/files/${activeFileId}/code`, {
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
      fetch(`http://localhost:5000/api/rooms/files/${activeFileId}/language`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: newLanguage }),
      }).catch(() => {});
    }
  };

  const handleRunCode = async () => {
    try {
      setRunning(true);
      setOutput("Running code...");

      const response = await fetch("http://localhost:5000/api/code/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          language,
          stdin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorOutput = data.message || "Execution failed";
        setOutput(errorOutput);

        if (socketRef.current) {
          socketRef.current.emit("output_change", {
            roomId: roomKey,
            output: errorOutput,
          });
        }

        return;
      }

      const finalOutput = data.output || "Code executed successfully";
      setOutput(finalOutput);

      if (socketRef.current) {
        socketRef.current.emit("output_change", {
          roomId: roomKey,
          output: finalOutput,
        });
      }
    } catch (error) {
      console.error("Run code error:", error);

      const errorMessage = "Something went wrong while running code";
      setOutput(errorMessage);

      if (socketRef.current) {
        socketRef.current.emit("output_change", {
          roomId: roomKey,
          output: errorMessage,
        });
      }
    } finally {
      setRunning(false);
    }
  };

  const handleClearOutput = () => {
    setOutput("");

    if (socketRef.current) {
      socketRef.current.emit("output_change", {
        roomId: roomKey,
        output: "",
      });
    }
  };

  const handleCopyRoomKey = async () => {
    try {
      await navigator.clipboard.writeText(roomKey);
      alert("Room key copied!");
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const handleCopyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Room link copied!");
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const getCurrentUser = () => {
    // First try the users list (has socketId match)
    const u = users.find((user) => user.socketId === socketRef.current?.id);
    if (u) return { name: u.name, email: u.email || "" };
    // Fallback: read directly from localStorage — always available and never stale
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      return { name: stored.name || "Guest User", email: stored.email || "" };
    } catch {
      return { name: "Guest User", email: "" };
    }
  };


  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  // Keep ref always pointing to latest getCurrentUser so onMount closures never go stale
  getCurrentUserRef.current = getCurrentUser;

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const user = getCurrentUser();

    const messageData = {
      sender: user.name,
      email: user.email,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString(),
    };

    if (socketRef.current) {
      socketRef.current.emit("send_message", {
        roomId: roomKey,
        messageData,
      });
    }

    setChatInput("");
  };

  // ── WebRTC helpers ──
  const createPeerConnection = (remoteSocketId, remoteName, localStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit("webrtc_ice_candidate", {
          candidate: e.candidate,
          toSocketId: remoteSocketId,
        });
      }
    };

    pc.ontrack = (e) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [remoteSocketId]: { stream: e.streams[0], name: remoteName },
      }));
    };

    peersRef.current[remoteSocketId] = pc;
    return pc;
  };

  const handleJoinCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setInCall(true);

      // Initiate offer to every user already in the room
      const otherUsers = users.filter((u) => u.socketId !== socketRef.current?.id);
      for (const user of otherUsers) {
        const pc = createPeerConnection(user.socketId, user.name, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit("webrtc_offer", {
          roomId: roomKey,
          offer,
          toSocketId: user.socketId,
        });
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

  useEffect(() => {
    const token = localStorage.getItem("token");

    socketRef.current = io("http://localhost:5000", {
      auth: {
        token,
      },
    });

    emitCursorMove.current = debounce((data) => {
      socketRef.current.emit("cursor_move", data);
    }, 80);

    emitTyping.current = debounce((data) => {
      socketRef.current.emit("typing", data);
    }, 300);

    socketRef.current.on("code_update", (incomingCode) => {
      isRemoteUpdate.current = true;
      setCode(incomingCode);
    });

    socketRef.current.on("language_update", (incomingLanguage) => {
      setLanguage(incomingLanguage);
    });

    socketRef.current.on("output_update", (incomingOutput) => {
      setOutput(incomingOutput);
    });

    socketRef.current.on("room_users", (roomUsers) => {
      setUsers(roomUsers);
    });

    socketRef.current.on("receive_message", (messageData) => {
      setMessages((prev) => [...prev, messageData]);
    });

    socketRef.current.on("user_joined", ({ name }) => {
      addToast(`${name} joined the room`, "join");
    });

    socketRef.current.on("user_left", ({ name }) => {
      addToast(`${name} left the room`, "leave");
    });

    socketRef.current.on("user_typing", (name) => {
      setTypingUsers((prev) => (prev.includes(name) ? prev : [...prev, name]));
      clearTimeout(typingTimersRef.current[name]);
      typingTimersRef.current[name] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((n) => n !== name));
      }, 2000);
    });

    // File system sync
    socketRef.current.on("file_created", (file) => {
      setFiles((prev) => [...prev, file]);
    });

    socketRef.current.on("file_switched", (fileId) => {
      setFiles((prev) => {
        const f = prev.find((f) => f.id === fileId);
        if (f) { setActiveFileId(f.id); setCode(f.code || ""); setLanguage(f.language); }
        return prev;
      });
    });

    socketRef.current.on("file_code_update", ({ fileId, code: incomingCode }) => {
      setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, code: incomingCode } : f));
      setActiveFileId((cur) => {
        if (cur === fileId) { isRemoteUpdate.current = true; setCode(incomingCode); }
        return cur;
      });
    });

    socketRef.current.on("file_language_update", ({ fileId, language: lang }) => {
      setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, language: lang } : f));
      setActiveFileId((cur) => { if (cur === fileId) setLanguage(lang); return cur; });
    });

    socketRef.current.on("file_deleted", (fileId) => {
      setFiles((prev) => {
        const remaining = prev.filter((f) => f.id !== fileId);
        setActiveFileId((cur) => {
          if (cur === fileId && remaining.length > 0) {
            setCode(remaining[0].code || ""); setLanguage(remaining[0].language);
            return remaining[0].id;
          }
          return cur;
        });
        return remaining;
      });
    });

    // WebRTC signaling
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
        socketRef.current.off("code_update");
        socketRef.current.off("language_update");
        socketRef.current.off("output_update");
        socketRef.current.off("room_users");
        socketRef.current.off("receive_message");
        socketRef.current.off("cursor_update");
        socketRef.current.off("typing");
        socketRef.current.off("user_joined");
        socketRef.current.off("user_left");
        socketRef.current.off("user_typing");
        socketRef.current.off("file_created");
        socketRef.current.off("file_switched");
        socketRef.current.off("file_code_update");
        socketRef.current.off("file_language_update");
        socketRef.current.off("file_deleted");
        socketRef.current.off("webrtc_offer");
        socketRef.current.off("webrtc_answer");
        socketRef.current.off("webrtc_ice_candidate");
        socketRef.current.off("webrtc_peer_left");
        socketRef.current.disconnect();
      }
    };
  }, [roomKey]);

  if (!joined) {
    return (
      <div style={loadingStyle}>
        <div style={loadingCardStyle}>
          <div style={spinnerStyle} />
          <p style={{ margin: 0, color: "#9ca3af", fontSize: "14px" }}>Joining room...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>

      {/* ── Toast notifications ── */}
      <div style={toastContainerStyle}>
        {toasts.map((toast) => (
          <div key={toast.id} style={{ ...toastStyle, background: toast.type === "join" ? "#1a3a2a" : "#3a1a1a", borderColor: toast.type === "join" ? "#238636" : "#f85149" }}>
            <span style={{ marginRight: "8px" }}>{toast.type === "join" ? "→" : "←"}</span>
            {toast.message}
          </div>
        ))}
      </div>

      {/* ── Navbar ── */}
      <div style={navbarStyle}>
        <div style={navBrandStyle}>
          <div style={navDotStyle} />
          <span style={navTitleStyle}>CodeCollab</span>
          <span style={roomKeyBadgeStyle}>#{roomKey}</span>
        </div>

        <div style={navActionsStyle}>
          <select value={language} onChange={handleLanguageChange} style={selectStyle}>
            {languageOptions.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>

          <button onClick={handleRunCode} style={runButtonStyle} disabled={running}>
            {running ? (
              <><span style={btnSpinnerStyle} /> Running...</>
            ) : (
              <>▶ Run</>
            )}
          </button>

          <button onClick={handleClearOutput} style={ghostButtonStyle}>⌫ Clear</button>
          <button onClick={handleCopyRoomKey} style={ghostButtonStyle}>⎘ Key</button>
          <button onClick={handleCopyRoomLink} style={ghostButtonStyle}>🔗 Link</button>
          <button onClick={handleLeaveRoom} style={leaveButtonStyle}>✕ Leave</button>
        </div>
      </div>

      {/* ── Participants strip ── */}
      <div style={participantsStripStyle}>
        <span style={stripLabelStyle}>
          <span style={onlineDotStyle} /> {users.length} online
        </span>
        {users.map((user, i) => (
          <div
            key={user.socketId || i}
            title={user.name}
            style={{ ...avatarStyle, background: getUserColor(user.name || "?") }}
          >
            {(user.name || "?")[0].toUpperCase()}
          </div>
        ))}
      </div>

      {/* ── Main layout ── */}
      <div style={layoutStyle}>

        {/* ── Left: editor + output ── */}
        <div style={mainContentStyle}>

          {/* File tabs */}
          <div style={tabsBarStyle}>
            {files.map((file) => (
              <div
                key={file.id}
                onClick={() => handleSwitchFile(file)}
                style={{ ...tabStyle, ...(activeFileId === file.id ? activeTabStyle : {}) }}
              >
                <span style={tabIconStyle}>{file.language === "python" ? "🐍" : file.language === "java" ? "☕" : file.language === "cpp" || file.language === "c" ? "⚙️" : "📄"}</span>
                <span>{file.name}</span>
                {files.length > 1 && (
                  <span onClick={(e) => handleDeleteFile(file.id, e)} style={tabCloseStyle}>×</span>
                )}
              </div>
            ))}
            {showNewFileInput ? (
              <div style={newFileInputWrapStyle}>
                <input
                  autoFocus
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateFile(); if (e.key === "Escape") { setShowNewFileInput(false); setNewFileName(""); } }}
                  placeholder="filename.py"
                  style={newFileInputStyle}
                />
                <button onClick={handleCreateFile} style={newFileConfirmBtn}>✓</button>
              </div>
            ) : (
              <button onClick={() => setShowNewFileInput(true)} style={addFileButtonStyle}>+ New File</button>
            )}
          </div>

          {/* Editor panel */}
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <span style={panelTitleStyle}>Editor</span>
              <span style={langBadgeStyle}>{language}</span>
              {Object.keys(remoteCursorsRef.current).length > 0 && (
                <div style={cursorStatusBarStyle}>
                  {Object.entries(remoteCursorsRef.current).map(([name, pos]) => (
                    <span key={name} style={{ ...cursorBadgeStyle, background: getUserColor(name) }}>
                      {name} L{pos.lineNumber}:{pos.column}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Editor
              height="55vh"
              language={language}
              value={code}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, quickSuggestions: true, suggestOnTriggerCharacters: true }}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;

                // ── Completion providers for non-JS languages ──
                const completions = {
                  python: [
                    "print","len","range","input","int","str","float","list","dict","set","tuple",
                    "type","isinstance","hasattr","getattr","setattr","enumerate","zip","map","filter",
                    "sorted","reversed","sum","min","max","abs","round","open","close","append","extend",
                    "remove","pop","insert","index","count","split","join","strip","replace","format",
                    "upper","lower","startswith","endswith","def","class","return","import","from","as",
                    "if","elif","else","for","while","break","continue","pass","try","except","finally",
                    "raise","with","lambda","yield","global","nonlocal","True","False","None","and",
                    "or","not","in","is","self","__init__","__str__","__repr__","super",
                  ],
                  java: [
                    "public","private","protected","static","void","class","interface","extends",
                    "implements","new","return","import","package","if","else","for","while","do",
                    "break","continue","try","catch","finally","throw","throws","final","abstract",
                    "synchronized","this","super","null","true","false","int","long","double","float",
                    "boolean","char","byte","short","String","System","out","println","print","main",
                    "ArrayList","HashMap","List","Map","Set","Iterator","Override","StringBuilder",
                  ],
                  cpp: [
                    "include","iostream","using","namespace","std","cout","cin","endl","int","long",
                    "double","float","char","bool","void","string","auto","const","static","return",
                    "if","else","for","while","do","break","continue","class","struct","public",
                    "private","protected","new","delete","nullptr","true","false","vector","map",
                    "set","pair","push_back","size","begin","end","printf","scanf","main",
                  ],
                  c: [
                    "include","stdio","stdlib","string","int","long","double","float","char","void",
                    "const","static","return","if","else","for","while","do","break","continue",
                    "struct","typedef","sizeof","malloc","free","printf","scanf","NULL","true","false",
                    "main","puts","gets","fopen","fclose","fprintf","fscanf","strlen","strcpy","strcmp",
                  ],
                  typescript: [
                    "interface","type","enum","namespace","declare","readonly","abstract","implements",
                    "extends","keyof","typeof","as","is","infer","never","unknown","any","void",
                    "string","number","boolean","object","symbol","bigint","null","undefined",
                    "console","log","error","warn","Promise","async","await","function","return",
                    "const","let","var","class","new","this","super","import","export","default",
                    "if","else","for","while","break","continue","try","catch","finally","throw",
                    "Array","Object","Map","Set","Record","Partial","Required","Pick","Omit",
                  ],
                };

                const disposables = [];
                Object.entries(completions).forEach(([lang, keywords]) => {
                  const d = monaco.languages.registerCompletionItemProvider(lang, {
                    provideCompletionItems: (model, position) => {
                      const word = model.getWordUntilPosition(position);
                      const range = {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: word.startColumn,
                        endColumn: word.endColumn,
                      };
                      return {
                        suggestions: keywords.map((kw) => ({
                          label: kw,
                          kind: monaco.languages.CompletionItemKind.Keyword,
                          insertText: kw,
                          range,
                        })),
                      };
                    },
                  });
                  disposables.push(d);
                });

                // Clean up providers on unmount
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
                      }
                    `;
                    document.head.appendChild(style);
                  }
                  const decoration = {
                    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                    options: {
                      className: `remote-cursor-${safeId}`,
                      afterContentClassName: `cursor-label-${safeId}`,
                    },
                  };
                  // Use createDecorationsCollection (new API) or fall back to deltaDecorations
                  if (decorationsRef.current[name]) {
                    decorationsRef.current[name].set([decoration]);
                  } else {
                    decorationsRef.current[name] = editor.createDecorationsCollection([decoration]);
                  }
                });

                editor.onDidChangeCursorPosition((e) => {
                  const user = getCurrentUserRef.current();
                  if (socketRef.current) {
                    emitCursorMove.current({
                      roomId: roomKey,
                      name: user.name,
                      position: e.position,
                      color: getUserColor(user.name),
                    });
                  }
                });
              }}
            />
          </div>

          {/* Stdin + Output panel */}
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <span style={panelTitleStyle}>Input / Output</span>
            </div>
            <div style={ioBodyStyle}>
              <div style={stdinWrapperStyle}>
                <label style={ioLabelStyle}>stdin</label>
                <textarea
                  placeholder="Custom input..."
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  style={stdinStyle}
                />
              </div>
              <div style={outputWrapperStyle}>
                <label style={ioLabelStyle}>output</label>
                <pre style={outputTextStyle}>{output || "No output yet"}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: sidebar ── */}
        <div style={sidebarStyle}>

          {/* Voice / Video */}
          <div style={sidebarSectionStyle}>
            <p style={sidebarSectionTitleStyle}>Voice &amp; Video</p>
            {!inCall ? (
              <button onClick={handleJoinCall} style={joinCallButtonStyle}>📞 Join Call</button>
            ) : (
              <>
                <div style={callControlsStyle}>
                  <button onClick={toggleMic} style={{ ...callCtrlBtn, background: micMuted ? "#f85149" : "#238636" }}>
                    {micMuted ? "🔇" : "🎙️"}
                  </button>
                  <button onClick={toggleCam} style={{ ...callCtrlBtn, background: camOff ? "#f85149" : "#238636" }}>
                    {camOff ? "📷" : "📹"}
                  </button>
                  <button onClick={handleLeaveCall} style={{ ...callCtrlBtn, background: "#b91c1c" }}>✕</button>
                </div>
                <div style={videoGridStyle}>
                  {/* Local video */}
                  <div style={videoTileStyle}>
                    <video ref={localVideoRef} autoPlay muted playsInline style={videoStyle} />
                    <span style={videoLabelStyle}>You</span>
                  </div>
                  {/* Remote videos */}
                  {Object.entries(remoteStreams).map(([sid, { stream, name }]) => (
                    <div key={sid} style={videoTileStyle}>
                      <video
                        autoPlay playsInline style={videoStyle}
                        ref={(el) => { if (el && el.srcObject !== stream) el.srcObject = stream; }}
                      />
                      <span style={videoLabelStyle}>{name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Online users */}
          <div style={sidebarSectionStyle}>
            <p style={sidebarSectionTitleStyle}>Online Users</p>
            {users.length === 0 ? (
              <p style={emptyTextStyle}>No users online</p>
            ) : (
              users.map((user, index) => (
                <div key={user.socketId || index} style={userCardStyle}>
                  <div style={{ ...userAvatarStyle, background: getUserColor(user.name || "?") }}>
                    {(user.name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={userNameStyle}>{user.name || "Guest User"}</div>
                    <div style={userEmailStyle}>{user.email || "No email"}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat */}
          <div style={sidebarSectionStyle}>
            <p style={sidebarSectionTitleStyle}>Room Chat</p>
            <div style={chatMessagesStyle}>
              {messages.length === 0 ? (
                <p style={emptyTextStyle}>No messages yet</p>
              ) : (
                messages.map((msg, index) => (
                  <div key={index} style={messageCardStyle}>
                    <div style={messageHeaderStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ ...msgAvatarStyle, background: getUserColor(msg.sender || "?") }}>
                          {(msg.sender || "?")[0].toUpperCase()}
                        </div>
                        <span style={msgSenderStyle}>{msg.sender}</span>
                      </div>
                      <span style={messageTimeStyle}>{msg.time}</span>
                    </div>
                    <div style={messageTextStyle}>{msg.text}</div>
                  </div>
                ))
              )}
            </div>
            <div style={chatInputWrapperStyle}>
              <input
                type="text"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => {
                  setChatInput(e.target.value);
                  const user = getCurrentUser();
                  emitTyping.current({
                    roomId: roomKey,
                    name: user.name,
                  });
                }}
                style={chatInputStyle}
                onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
              />
              <button onClick={handleSendMessage} style={sendButtonStyle}>↑</button>
            </div>
            {typingUsers.length > 0 && (
              <p style={typingIndicatorStyle}>
                {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#0d1117",
  color: "white",
  fontFamily: "'Segoe UI', Arial, sans-serif",
  display: "flex",
  flexDirection: "column",
};

const loadingStyle = {
  minHeight: "100vh",
  backgroundColor: "#0d1117",
  color: "white",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const loadingCardStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "16px",
};

const spinnerStyle = {
  width: "32px",
  height: "32px",
  border: "3px solid #374151",
  borderTop: "3px solid #6366f1",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

// ── Navbar ──
const navbarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 20px",
  height: "56px",
  backgroundColor: "#161b22",
  borderBottom: "1px solid #21262d",
  flexShrink: 0,
  flexWrap: "wrap",
  gap: "10px",
};

const navBrandStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const navDotStyle = {
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  backgroundColor: "#22c55e",
  boxShadow: "0 0 6px #22c55e",
};

const navTitleStyle = {
  fontWeight: "700",
  fontSize: "16px",
  color: "#f0f6fc",
  letterSpacing: "0.3px",
};

const roomKeyBadgeStyle = {
  fontSize: "12px",
  color: "#8b949e",
  backgroundColor: "#21262d",
  padding: "2px 8px",
  borderRadius: "20px",
  fontFamily: "monospace",
};

const navActionsStyle = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
  flexWrap: "wrap",
};

// ── Participants strip ──
const participantsStripStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 20px",
  backgroundColor: "#161b22",
  borderBottom: "1px solid #21262d",
  flexWrap: "wrap",
};

const stripLabelStyle = {
  fontSize: "12px",
  color: "#8b949e",
  display: "flex",
  alignItems: "center",
  gap: "5px",
  marginRight: "4px",
};

const onlineDotStyle = {
  width: "7px",
  height: "7px",
  borderRadius: "50%",
  backgroundColor: "#22c55e",
  display: "inline-block",
};

const avatarStyle = {
  width: "26px",
  height: "26px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "11px",
  fontWeight: "700",
  color: "white",
  flexShrink: 0,
  cursor: "default",
};

// ── Layout ──
const layoutStyle = {
  display: "flex",
  gap: "0",
  flex: 1,
  overflow: "hidden",
};

const mainContentStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "0",
  overflow: "hidden",
  padding: "16px",
  paddingRight: "8px",
  gap: "12px",
};

// ── Panel ──
const panelStyle = {
  backgroundColor: "#161b22",
  border: "1px solid #21262d",
  borderRadius: "10px",
  overflow: "hidden",
};

const panelHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "8px 14px",
  backgroundColor: "#1c2128",
  borderBottom: "1px solid #21262d",
  flexWrap: "wrap",
};

const panelTitleStyle = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#8b949e",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
};

const langBadgeStyle = {
  fontSize: "11px",
  color: "#79c0ff",
  backgroundColor: "#1f3a5f",
  padding: "2px 8px",
  borderRadius: "4px",
  fontFamily: "monospace",
};

// ── IO panel ──
const ioBodyStyle = {
  display: "flex",
  gap: "0",
};

const stdinWrapperStyle = {
  flex: 1,
  borderRight: "1px solid #21262d",
  padding: "10px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const outputWrapperStyle = {
  flex: 2,
  padding: "10px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  minHeight: "140px",
};

const ioLabelStyle = {
  fontSize: "10px",
  fontWeight: "600",
  color: "#6e7681",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
};

const stdinStyle = {
  flex: 1,
  minHeight: "80px",
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #30363d",
  backgroundColor: "#0d1117",
  color: "#c9d1d9",
  resize: "vertical",
  fontFamily: "monospace",
  fontSize: "13px",
  boxSizing: "border-box",
  width: "100%",
};

const outputTextStyle = {
  margin: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontFamily: "monospace",
  fontSize: "13px",
  color: "#7ee787",
  lineHeight: "1.6",
};

// ── Sidebar ──
const sidebarStyle = {
  width: "300px",
  flexShrink: 0,
  backgroundColor: "#161b22",
  borderLeft: "1px solid #21262d",
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
};

const sidebarSectionStyle = {
  padding: "14px",
  borderBottom: "1px solid #21262d",
};

const sidebarSectionTitleStyle = {
  margin: "0 0 12px 0",
  fontSize: "11px",
  fontWeight: "700",
  color: "#6e7681",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
};

const emptyTextStyle = {
  fontSize: "13px",
  color: "#6e7681",
  margin: 0,
};

// ── User cards ──
const userCardStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "8px 10px",
  borderRadius: "8px",
  backgroundColor: "#1c2128",
  marginBottom: "6px",
};

const userAvatarStyle = {
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "13px",
  fontWeight: "700",
  color: "white",
  flexShrink: 0,
};

const userNameStyle = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#e6edf3",
};

const userEmailStyle = {
  fontSize: "11px",
  color: "#6e7681",
  marginTop: "2px",
  wordBreak: "break-word",
};

// ── Chat ──
const chatMessagesStyle = {
  backgroundColor: "#0d1117",
  borderRadius: "8px",
  padding: "10px",
  height: "260px",
  overflowY: "auto",
  marginBottom: "10px",
};

const messageCardStyle = {
  marginBottom: "12px",
};

const messageHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "4px",
};

const msgAvatarStyle = {
  width: "20px",
  height: "20px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "9px",
  fontWeight: "700",
  color: "white",
  flexShrink: 0,
};

const msgSenderStyle = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#e6edf3",
};

const messageTimeStyle = {
  fontSize: "10px",
  color: "#6e7681",
};

const messageTextStyle = {
  fontSize: "13px",
  color: "#c9d1d9",
  wordBreak: "break-word",
  paddingLeft: "26px",
  lineHeight: "1.5",
};

const chatInputWrapperStyle = {
  display: "flex",
  gap: "6px",
};

const chatInputStyle = {
  flex: 1,
  padding: "9px 12px",
  borderRadius: "8px",
  border: "1px solid #30363d",
  backgroundColor: "#0d1117",
  color: "#c9d1d9",
  fontSize: "13px",
  outline: "none",
};

const sendButtonStyle = {
  padding: "9px 14px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "16px",
  backgroundColor: "#238636",
  color: "white",
};

// ── Buttons ──
const selectStyle = {
  padding: "7px 10px",
  borderRadius: "6px",
  border: "1px solid #30363d",
  backgroundColor: "#21262d",
  color: "#c9d1d9",
  fontSize: "13px",
  cursor: "pointer",
};

const runButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "7px 16px",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "13px",
  backgroundColor: "#238636",
  color: "white",
};

const ghostButtonStyle = {
  padding: "7px 12px",
  borderRadius: "6px",
  border: "1px solid #30363d",
  cursor: "pointer",
  fontSize: "12px",
  backgroundColor: "transparent",
  color: "#8b949e",
};

const leaveButtonStyle = {
  padding: "7px 12px",
  borderRadius: "6px",
  border: "1px solid #f8514933",
  cursor: "pointer",
  fontSize: "12px",
  backgroundColor: "transparent",
  color: "#f85149",
};

const btnSpinnerStyle = {
  display: "inline-block",
  width: "10px",
  height: "10px",
  border: "2px solid rgba(255,255,255,0.3)",
  borderTop: "2px solid white",
  borderRadius: "50%",
};

// ── Cursor status bar ──
const cursorStatusBarStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  marginLeft: "auto",
};

const cursorBadgeStyle = {
  fontSize: "10px",
  color: "white",
  padding: "2px 7px",
  borderRadius: "4px",
  fontFamily: "monospace",
};

// ── Toast notifications ──
const toastContainerStyle = {
  position: "fixed",
  top: "16px",
  right: "16px",
  zIndex: 9999,
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  pointerEvents: "none",
};

const toastStyle = {
  padding: "10px 16px",
  borderRadius: "8px",
  border: "1px solid",
  fontSize: "13px",
  color: "#e6edf3",
  fontWeight: "500",
  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
  animation: "fadeIn 0.2s ease",
};

// ── Typing indicator ──
const typingIndicatorStyle = {
  margin: "6px 0 0 0",
  fontSize: "11px",
  color: "#6e7681",
  fontStyle: "italic",
  minHeight: "16px",
};

// ── File tabs ──
const tabsBarStyle = {
  display: "flex",
  alignItems: "center",
  gap: "2px",
  padding: "6px 8px",
  backgroundColor: "#161b22",
  borderBottom: "1px solid #21262d",
  overflowX: "auto",
  flexShrink: 0,
  flexWrap: "nowrap",
};

const tabStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "5px 12px",
  borderRadius: "6px 6px 0 0",
  fontSize: "12px",
  color: "#8b949e",
  cursor: "pointer",
  backgroundColor: "#0d1117",
  border: "1px solid #21262d",
  borderBottom: "none",
  whiteSpace: "nowrap",
  userSelect: "none",
};

const activeTabStyle = {
  backgroundColor: "#1c2128",
  color: "#f0f6fc",
  borderColor: "#388bfd",
};

const tabIconStyle = {
  fontSize: "11px",
};

const tabCloseStyle = {
  marginLeft: "4px",
  fontSize: "14px",
  color: "#6e7681",
  lineHeight: 1,
  padding: "0 2px",
  borderRadius: "3px",
  cursor: "pointer",
};

const addFileButtonStyle = {
  padding: "5px 10px",
  borderRadius: "6px",
  border: "1px dashed #30363d",
  backgroundColor: "transparent",
  color: "#6e7681",
  fontSize: "11px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  marginLeft: "4px",
};

const newFileInputWrapStyle = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  marginLeft: "4px",
};

const newFileInputStyle = {
  padding: "4px 8px",
  borderRadius: "6px",
  border: "1px solid #388bfd",
  backgroundColor: "#0d1117",
  color: "#f0f6fc",
  fontSize: "12px",
  outline: "none",
  width: "120px",
};

const newFileConfirmBtn = {
  padding: "4px 8px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: "#238636",
  color: "white",
  fontSize: "12px",
  cursor: "pointer",
};

// ── Voice / Video ──
const joinCallButtonStyle = {
  width: "100%",
  padding: "9px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#238636",
  color: "white",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
};

const callControlsStyle = {
  display: "flex",
  gap: "8px",
  marginBottom: "10px",
};

const callCtrlBtn = {
  flex: 1,
  padding: "8px",
  borderRadius: "8px",
  border: "none",
  color: "white",
  fontSize: "16px",
  cursor: "pointer",
};

const videoGridStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const videoTileStyle = {
  position: "relative",
  borderRadius: "8px",
  overflow: "hidden",
  backgroundColor: "#0d1117",
  border: "1px solid #21262d",
};

const videoStyle = {
  width: "100%",
  display: "block",
  borderRadius: "8px",
  maxHeight: "140px",
  objectFit: "cover",
  backgroundColor: "#000",
};

const videoLabelStyle = {
  position: "absolute",
  bottom: "6px",
  left: "8px",
  fontSize: "11px",
  color: "white",
  backgroundColor: "rgba(0,0,0,0.6)",
  padding: "2px 6px",
  borderRadius: "4px",
};

export default RoomPage;