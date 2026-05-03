import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

// Validation helpers
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password) => {
  const errors = [];
  if (password.length < 8) errors.push("at least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("one uppercase letter");
  if (!/[0-9]/.test(password)) errors.push("one number");
  return errors;
};

function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Load Google Identity Services script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    if (!formData.email || !validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    const pwErrors = validatePassword(formData.password);
    if (pwErrors.length > 0) {
      newErrors.password = "Password must contain " + pwErrors.join(", ");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Map server error to the right field
        if (data.message.toLowerCase().includes("email")) {
          setErrors({ email: data.message });
        } else if (data.message.toLowerCase().includes("password")) {
          setErrors({ password: data.message });
        } else if (data.message.toLowerCase().includes("name")) {
          setErrors({ name: data.message });
        } else {
          setErrors({ general: data.message });
        }
        setLoading(false);
        return;
      }

      setSuccessMsg("Account created! Check your email for a welcome message.");
      setTimeout(() => navigate("/login"), 2500);
    } catch (error) {
      console.error("Register error:", error);
      setErrors({ general: "Something went wrong. Please try again." });
    }
    setLoading(false);
  };

  const handleGoogleLogin = () => {
    if (!window.google) {
      setErrors({ general: "Google Sign-In is not available. Please try again." });
      return;
    }

    setGoogleLoading(true);

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: response.credential }),
          });

          const data = await res.json();

          if (!res.ok) {
            setErrors({ general: data.message || "Google login failed" });
            setGoogleLoading(false);
            return;
          }

          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          navigate("/home");
        } catch (err) {
          setErrors({ general: "Google login failed. Please try again." });
          setGoogleLoading(false);
        }
      },
    });

    window.google.accounts.id.prompt();
    setGoogleLoading(false);
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

        {/* Success message */}
        {successMsg && (
          <div style={successBannerStyle}>
            <span>✓</span> {successMsg}
          </div>
        )}

        {/* General error */}
        {errors.general && (
          <div style={errorBannerStyle}>{errors.general}</div>
        )}

        <form onSubmit={handleRegister} style={formStyle} noValidate>
          {/* Name */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="Your name"
              value={formData.name}
              onChange={handleChange}
              style={{ ...inputStyle, ...(errors.name ? inputErrorStyle : {}) }}
            />
            {errors.name && <span style={errorTextStyle}>{errors.name}</span>}
          </div>

          {/* Email */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              style={{ ...inputStyle, ...(errors.email ? inputErrorStyle : {}) }}
            />
            {errors.email && <span style={errorTextStyle}>{errors.email}</span>}
          </div>

          {/* Password */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Password</label>
            <div style={inputWrapperStyle}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                value={formData.password}
                onChange={handleChange}
                style={{ ...inputStyle, paddingRight: "42px", ...(errors.password ? inputErrorStyle : {}) }}
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
            {errors.password && <span style={errorTextStyle}>{errors.password}</span>}
            {/* Password strength hints */}
            {formData.password && !errors.password && (
              <div style={hintRowStyle}>
                <span style={hintStyle(formData.password.length >= 8)}>8+ chars</span>
                <span style={hintStyle(/[A-Z]/.test(formData.password))}>Uppercase</span>
                <span style={hintStyle(/[0-9]/.test(formData.password))}>Number</span>
              </div>
            )}
          </div>

          <button type="submit" style={submitButtonStyle} disabled={loading}>
            {loading
              ? <><span style={btnSpinnerStyle} /> Creating account...</>
              : "Create account"}
          </button>
        </form>

        {/* Divider */}
        <div style={dividerStyle}>
          <span style={dividerLineStyle} />
          <span style={dividerTextStyle}>or</span>
          <span style={dividerLineStyle} />
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogleLogin}
          style={googleButtonStyle}
          disabled={googleLoading}
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {googleLoading ? "Connecting..." : "Continue with Google"}
        </button>

        <p style={footerTextStyle}>
          Already have an account?{" "}
          <Link to="/login" style={linkStyle}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────

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
  maxWidth: "420px",
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
};

const titleStyle = {
  margin: "0 0 6px 0",
  fontSize: "24px",
  fontWeight: "700",
  color: "#f0f6fc",
};

const subtitleStyle = {
  margin: "0 0 24px 0",
  fontSize: "14px",
  color: "#6e7681",
};

const successBannerStyle = {
  backgroundColor: "rgba(34,197,94,0.1)",
  border: "1px solid rgba(34,197,94,0.3)",
  color: "#22c55e",
  padding: "10px 14px",
  borderRadius: "8px",
  fontSize: "13px",
  marginBottom: "16px",
  display: "flex",
  gap: "8px",
  alignItems: "center",
};

const errorBannerStyle = {
  backgroundColor: "rgba(248,81,73,0.1)",
  border: "1px solid rgba(248,81,73,0.3)",
  color: "#f85149",
  padding: "10px 14px",
  borderRadius: "8px",
  fontSize: "13px",
  marginBottom: "16px",
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "5px",
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
  transition: "border-color 0.2s",
};

const inputErrorStyle = {
  border: "1px solid #f85149",
};

const errorTextStyle = {
  fontSize: "12px",
  color: "#f85149",
  marginTop: "2px",
};

const hintRowStyle = {
  display: "flex",
  gap: "8px",
  marginTop: "4px",
};

const hintStyle = (met) => ({
  fontSize: "11px",
  padding: "2px 8px",
  borderRadius: "20px",
  backgroundColor: met ? "rgba(34,197,94,0.15)" : "rgba(139,148,158,0.1)",
  color: met ? "#22c55e" : "#6e7681",
  border: `1px solid ${met ? "rgba(34,197,94,0.3)" : "#30363d"}`,
});

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
  margin: "20px 0",
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

const googleButtonStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  width: "100%",
  padding: "11px",
  borderRadius: "8px",
  border: "1px solid #30363d",
  backgroundColor: "#0d1117",
  color: "#f0f6fc",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
  marginBottom: "20px",
  transition: "border-color 0.2s",
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
