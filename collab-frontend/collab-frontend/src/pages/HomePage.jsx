import { useState } from "react";
import { useNavigate } from "react-router-dom";

function HomePage() {
  const [roomName, setRoomName] = useState("");
  const [roomKeyInput, setRoomKeyInput] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      alert("Please enter a room name");
      return;
    }

    const token = localStorage.getItem("token");
    console.log("Token being sent:", token);

    if (!token) {
      alert("You are not logged in. Please login again.");
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ room_name: roomName }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to create room");
        return;
      }

      alert("Room created successfully");
      navigate(`/room/${data.roomKey}`);
    } catch (error) {
      console.error("Create room error:", error);
      alert("Something went wrong while creating room");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = () => {
    if (!roomKeyInput.trim()) {
      alert("Please enter room key");
      return;
    }
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
    <div style={pageStyle}>
      <div style={gridOverlayStyle} />

      {/* Navbar */}
      <div style={navbarStyle}>
        <div style={navBrandStyle}>
          <div style={navDotStyle} />
          <span style={navTitleStyle}>CodeCollab</span>
        </div>
        <div style={navRightStyle}>
          {user.name && (
            <div style={navUserStyle}>
              <div style={navAvatarStyle}>{user.name[0].toUpperCase()}</div>
              <span style={navUserNameStyle}>{user.name}</span>
            </div>
          )}
          <button onClick={handleLogout} style={logoutButtonStyle}>
            Sign out
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={heroStyle}>
        <div style={heroBadgeStyle}>
          <span style={heroBadgeDotStyle} /> Real-time collaboration
        </div>
        <h1 style={heroTitleStyle}>Code together,<br />ship faster</h1>
        <p style={heroSubStyle}>
          Create a room or join an existing one to start collaborating with your team in real-time.
        </p>
      </div>

      {/* Cards */}
      <div style={cardsRowStyle}>

        {/* Create room */}
        <div style={cardStyle}>
          <div style={cardIconStyle}>✦</div>
          <h2 style={cardTitleStyle}>Create a Room</h2>
          <p style={cardDescStyle}>Start a new session and invite others with a room key.</p>
          <div style={fieldStyle}>
            <label style={labelStyle}>Room name</label>
            <input
              type="text"
              placeholder="e.g. Sprint Review"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              style={inputStyle}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateRoom(); }}
            />
          </div>
          <button
            onClick={handleCreateRoom}
            style={primaryButtonStyle}
            disabled={loading}
          >
            {loading
              ? <><span style={btnSpinnerStyle} /> Creating...</>
              : "Create Room"}
          </button>
        </div>

        {/* Divider */}
        <div style={verticalDividerStyle}>
          <span style={dividerLineStyle} />
          <span style={dividerTextStyle}>or</span>
          <span style={dividerLineStyle} />
        </div>

        {/* Join room */}
        <div style={cardStyle}>
          <div style={{ ...cardIconStyle, color: "#58a6ff" }}>⌘</div>
          <h2 style={cardTitleStyle}>Join a Room</h2>
          <p style={cardDescStyle}>Enter a room key shared by your teammate to jump in.</p>
          <div style={fieldStyle}>
            <label style={labelStyle}>Room key</label>
            <input
              type="text"
              placeholder="Paste room key here"
              value={roomKeyInput}
              onChange={(e) => setRoomKeyInput(e.target.value)}
              style={inputStyle}
              onKeyDown={(e) => { if (e.key === "Enter") handleJoinRoom(); }}
            />
          </div>
          <button onClick={handleJoinRoom} style={secondaryButtonStyle}>
            Join Room
          </button>
        </div>

      </div>

      {/* Footer */}
      <div style={footerStyle}>
        <span style={footerTextStyle}>
          Supports JavaScript, Python, Java, C++, C, TypeScript
        </span>
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
  position: "relative",
  overflow: "hidden",
};

const gridOverlayStyle = {
  position: "absolute",
  inset: 0,
  backgroundImage:
    "linear-gradient(#21262d 1px, transparent 1px), linear-gradient(90deg, #21262d 1px, transparent 1px)",
  backgroundSize: "40px 40px",
  opacity: 0.3,
  pointerEvents: "none",
};

// Navbar
const navbarStyle = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 32px",
  height: "56px",
  backgroundColor: "#161b22",
  borderBottom: "1px solid #21262d",
};

const navBrandStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const navDotStyle = {
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  backgroundColor: "#22c55e",
  boxShadow: "0 0 8px #22c55e",
};

const navTitleStyle = {
  fontWeight: "700",
  fontSize: "16px",
  color: "#f0f6fc",
};

const navRightStyle = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

const navUserStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const navAvatarStyle = {
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  backgroundColor: "#238636",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "700",
  color: "white",
};

const navUserNameStyle = {
  fontSize: "13px",
  color: "#8b949e",
};

const logoutButtonStyle = {
  padding: "6px 14px",
  borderRadius: "6px",
  border: "1px solid #30363d",
  backgroundColor: "transparent",
  color: "#8b949e",
  fontSize: "13px",
  cursor: "pointer",
};

// Hero
const heroStyle = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  padding: "64px 20px 40px",
};

const heroBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "12px",
  color: "#22c55e",
  backgroundColor: "rgba(34,197,94,0.1)",
  border: "1px solid rgba(34,197,94,0.25)",
  padding: "4px 12px",
  borderRadius: "20px",
  marginBottom: "20px",
};

const heroBadgeDotStyle = {
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  backgroundColor: "#22c55e",
  display: "inline-block",
};

const heroTitleStyle = {
  margin: "0 0 16px 0",
  fontSize: "48px",
  fontWeight: "800",
  color: "#f0f6fc",
  lineHeight: "1.15",
  letterSpacing: "-1px",
};

const heroSubStyle = {
  margin: 0,
  fontSize: "16px",
  color: "#6e7681",
  maxWidth: "480px",
  lineHeight: "1.6",
};

// Cards row
const cardsRowStyle = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  justifyContent: "center",
  alignItems: "stretch",
  gap: "0",
  padding: "0 32px",
  maxWidth: "860px",
  margin: "0 auto",
  width: "100%",
  boxSizing: "border-box",
};

const cardStyle = {
  flex: 1,
  backgroundColor: "#161b22",
  border: "1px solid #30363d",
  borderRadius: "14px",
  padding: "32px 28px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
};

const cardIconStyle = {
  fontSize: "22px",
  color: "#22c55e",
  lineHeight: 1,
};

const cardTitleStyle = {
  margin: 0,
  fontSize: "18px",
  fontWeight: "700",
  color: "#f0f6fc",
};

const cardDescStyle = {
  margin: 0,
  fontSize: "13px",
  color: "#6e7681",
  lineHeight: "1.5",
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  marginTop: "4px",
};

const labelStyle = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#6e7681",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
};

const inputStyle = {
  padding: "11px 14px",
  borderRadius: "8px",
  border: "1px solid #30363d",
  backgroundColor: "#0d1117",
  color: "#f0f6fc",
  fontSize: "14px",
  outline: "none",
};

const primaryButtonStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "14px",
  backgroundColor: "#238636",
  color: "white",
  marginTop: "auto",
};

const secondaryButtonStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #30363d",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "14px",
  backgroundColor: "transparent",
  color: "#58a6ff",
  marginTop: "auto",
};

const btnSpinnerStyle = {
  display: "inline-block",
  width: "12px",
  height: "12px",
  border: "2px solid rgba(255,255,255,0.3)",
  borderTop: "2px solid white",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

// Divider between cards
const verticalDividerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "32px 20px",
  gap: "10px",
};

const dividerLineStyle = {
  flex: 1,
  width: "1px",
  backgroundColor: "#21262d",
};

const dividerTextStyle = {
  fontSize: "11px",
  color: "#6e7681",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
};

// Footer
const footerStyle = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  justifyContent: "center",
  padding: "32px 20px",
  marginTop: "auto",
};

const footerTextStyle = {
  fontSize: "12px",
  color: "#6e7681",
};

export default HomePage;
