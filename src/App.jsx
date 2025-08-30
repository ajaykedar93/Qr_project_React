// src/App.jsx
import { useEffect, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Pages
import Register from "./Pages/Register.jsx";
import Login from "./Pages/Login.jsx";
import Dashboard from "./Pages/Dashboard.jsx";
import ShareAccess from "./Pages/ShareAccess.jsx";
import ViewDoc from "./Pages/ViewDoc.jsx";

// ---------- Helpers ----------
function isAuthed() {
  return !!localStorage.getItem("token");
}

function useAuthUser() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const onAuth = () => {
      try {
        setUser(JSON.parse(localStorage.getItem("user") || "{}"));
      } catch {
        setUser({});
      }
    };
    window.addEventListener("auth", onAuth);
    return () => window.removeEventListener("auth", onAuth);
  }, []);

  return user;
}

function ProtectedRoute({ children }) {
  const loc = useLocation();
  if (!isAuthed()) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  return children;
}

// ---------- Layout ----------
function Topbar() {
  const user = useAuthUser();
  const nav = useNavigate();

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("verifiedEmail");
    window.dispatchEvent(new Event("auth"));
    nav("/login", { replace: true });
  }, [nav]);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        background: "#0b1230",
        borderBottom: "1px solid #2a3170",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <Link to="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 700 }}>
        QR-Docs
      </Link>

      <nav style={{ display: "flex", gap: 10, marginLeft: 12 }}>
        {isAuthed() && (
          <Link className="btn" to="/dashboard">
            Dashboard
          </Link>
        )}
      </nav>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        {isAuthed() ? (
          <>
            <span style={{ fontSize: 13, opacity: 0.85 }}>{user?.email}</span>
            <button className="btn btn-danger" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link className="btn" to="/login">
              Login
            </Link>
            <Link className="btn btn-primary" to="/register">
              Register
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

// ---------- App ----------
export default function App() {
  return (
    <BrowserRouter>
      <Topbar />

      <main style={{ minHeight: "calc(100vh - 56px)" }}>
        <Routes>
          {/* Default: send authed users to dashboard, others to login */}
          <Route
            path="/"
            element={isAuthed() ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
          />

          {/* Public auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* QR landing → resolve + OTP flow */}
          <Route path="/share/:shareId" element={<ShareAccess />} />

          {/* Viewer (public view-only OR private after OTP) */}
          <Route path="/view/:documentId" element={<ViewDoc />} />

          {/* Private: dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <ToastContainer position="top-right" autoClose={2500} theme="dark" />
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div style={{ maxWidth: 700, margin: "60px auto", padding: 16 }}>
      <div
        style={{
          background: "#0f1533",
          border: "1px solid #2a3170",
          borderRadius: 14,
          padding: 24,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Page not found</h2>
        <p style={{ opacity: 0.8 }}>
          The page you’re looking for doesn’t exist. Go back to{" "}
          <Link to="/dashboard">Dashboard</Link> or <Link to="/login">Login</Link>.
        </p>
      </div>
    </div>
  );
}
