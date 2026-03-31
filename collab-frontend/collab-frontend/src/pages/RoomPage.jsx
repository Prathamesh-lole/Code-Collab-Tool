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
  const [remoteCursors, setRemoteCursors] = useState({});

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

  const handleEditorChange = (value) => {
    const newCode = value || "";
    setCode(newCode);

    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    if (socketRef.current) {
      socketRef.current.emit("code_change", {
        roomId: roomKey,
        code: newCode,
      });
    }

    saveCodeToDatabase(newCode);
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);

    if (socketRef.current) {
      socketRef.current.emit("language_change", {
        roomId: roomKey,
        language: newLanguage,
      });
    }

    saveLanguageToDatabase(newLanguage);
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
    const u = users.find((user) => user.socketId === socketRef.current?.id);
    return { name: u?.name || "Guest User", email: u?.email || "" };
  };

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

  const handleTyping = () => {
    const user = getCurrentUser();

    socketRef.current.emit("typing", {
      roomId: roomKey,
      name: user.name,
    });
  };

  const handleLeaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    navigate("/");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    socketRef.current = io("http://localhost:5000", {
      auth: {
        token,
      },
    });

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

    fetchRoomData();

    return () => {
      if (socketRef.current) {
        socketRef.current.off("code_update");
        socketRef.current.off("language_update");
        socketRef.current.off("output_update");
        socketRef.current.off("room_users");
        socketRef.current.off("receive_message");
        socketRef.current.off("cursor_update");
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

          {/* Editor panel */}
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <span style={panelTitleStyle}>Editor</span>
              <span style={langBadgeStyle}>{language}</span>
              {Object.keys(remoteCursors).length > 0 && (
                <div style={cursorStatusBarStyle}>
                  {Object.entries(remoteCursors).map(([name, pos]) => (
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
              options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false }}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;

                socketRef.current.on("cursor_update", ({ name, position, color }) => {
                  if (!position) return;
                  setRemoteCursors((prev) => ({ ...prev, [name]: position }));
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
                  const newDecorations = [{
                    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                    options: {
                      className: `remote-cursor-${safeId}`,
                      afterContentClassName: `cursor-label-${safeId}`,
                    },
                  }];
                  const oldDecorations = decorationsRef.current[name] || [];
                  decorationsRef.current[name] = editor.deltaDecorations(oldDecorations, newDecorations);
                });

                editor.onDidChangeCursorPosition((e) => {
                  const user = getCurrentUser();
                  if (socketRef.current) {
                    socketRef.current.emit("cursor_move", {
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
                onChange={(e) => setChatInput(e.target.value)}
                style={chatInputStyle}
                onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
              />
              <button onClick={handleSendMessage} style={sendButtonStyle}>↑</button>
            </div>
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

export default RoomPage;