import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Registration failed");
        setLoading(false);
        return;
      }

      alert("Registration successful. Please login.");
      navigate("/login");
    } catch (error) {
      console.error("Register error:", error);
      alert("Something went wrong");
    }

    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <div style={gridOverlayStyle} />

      <div style={cardStyle}>
        <div style={logoWrapStyle}>
          <div style={logoDotStyle} />
          <span style={logoTextStyle}>CodeCollab</span>
        </div>

        <h1 style={titleStyle}>Create an account</h1>
        <p style={subtitleStyle}>Start collaborating in real-time</p>

        <form onSubmit={handleRegister} style={formStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="Your name"
              value={formData.name}
              onChange={handleChange}
              style={inputStyle}
              required
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              style={inputStyle}
              required
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Password</label>
            <div style={inputWrapperStyle}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                style={{ ...inputStyle, paddingRight: "42px" }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={eyeButtonStyle}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button type="submit" style={submitButtonStyle} disabled={loading}>
            {loading ? <><span style={btnSpinnerStyle} /> Creating account...</> : "Create account"}
          </button>
        </form>

        <div style={dividerStyle}>
          <span style={dividerLineStyle} />
          <span style={dividerTextStyle}>or</span>
          <span style={dividerLineStyle} />
        </div>

        <p style={footerTextStyle}>
          Already have an account?{" "}
          <Link to="/login" style={linkStyle}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const containerStyle = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#0d1117",
  fontFamily: "'Segoe UI', Arial, sans-serif",
  position: "relative",
  overflow: "hidden",
};

const gridOverlayStyle = {
  position: "absolute",
  inset: 0,
  backgroundImage:
    "linear-gradient(#21262d 1px, transparent 1px), linear-gradient(90deg, #21262d 1px, transparent 1px)",
  backgroundSize: "40px 40px",
  opacity: 0.35,
  pointerEvents: "none",
};

const cardStyle = {
  position: "relative",
  zIndex: 1,
  backgroundColor: "#161b22",
  border: "1px solid #30363d",
  padding: "40px 36px",
  borderRadius: "16px",
  width: "100%",
  maxWidth: "400px",
  boxSizing: "border-box",
  color: "white",
  boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
};

const logoWrapStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "28px",
};

const logoDotStyle = {
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  backgroundColor: "#22c55e",
  boxShadow: "0 0 8px #22c55e",
};

const logoTextStyle = {
  fontSize: "15px",
  fontWeight: "700",
  color: "#f0f6fc",
  letterSpacing: "0.3px",
};

const titleStyle = {
  margin: "0 0 6px 0",
  fontSize: "24px",
  fontWeight: "700",
  color: "#f0f6fc",
  letterSpacing: "-0.3px",
};

const subtitleStyle = {
  margin: "0 0 28px 0",
  fontSize: "14px",
  color: "#6e7681",
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelStyle = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#8b949e",
};

const inputStyle = {
  padding: "11px 14px",
  borderRadius: "8px",
  border: "1px solid #30363d",
  backgroundColor: "#0d1117",
  color: "#f0f6fc",
  fontSize: "14px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const inputWrapperStyle = {
  position: "relative",
  display: "flex",
  alignItems: "center",
};

const eyeButtonStyle = {
  position: "absolute",
  right: "10px",
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "16px",
  padding: "0",
  lineHeight: 1,
  color: "#8b949e",
};

const submitButtonStyle = {
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
  marginTop: "4px",
  letterSpacing: "0.2px",
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

const dividerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  margin: "24px 0 20px",
};

const dividerLineStyle = {
  flex: 1,
  height: "1px",
  backgroundColor: "#21262d",
};

const dividerTextStyle = {
  fontSize: "12px",
  color: "#6e7681",
};

const footerTextStyle = {
  textAlign: "center",
  fontSize: "13px",
  color: "#6e7681",
  margin: 0,
};

const linkStyle = {
  color: "#58a6ff",
  textDecoration: "none",
  fontWeight: "600",
};

export default RegisterPage;
