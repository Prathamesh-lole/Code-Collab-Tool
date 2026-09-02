import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

// Lazy load every page — only downloaded when the route is visited
const LandingPage  = lazy(() => import("./pages/LandingPage"));
const LoginPage    = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const HomePage     = lazy(() => import("./pages/HomePage"));
const RoomPage     = lazy(() => import("./pages/RoomPage"));

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

// Minimal fallback shown while a chunk loads
function PageLoader() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#070707",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
      }}>
        <div style={{
          width: "32px",
          height: "32px",
          border: "2px solid #1A1A1A",
          borderTopColor: "#10B981",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }} />
        <span style={{
          fontSize: "12px",
          color: "#4A4A4A",
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          letterSpacing: "0.3px",
        }}>
          Loading...
        </span>
      </div>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/"         element={<LandingPage />} />
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/home"
          element={
            <PrivateRoute>
              <HomePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/room/:roomKey"
          element={
            <PrivateRoute>
              <RoomPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default App;
