// src/App.jsx
import { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Pages
import Register from "./Pages/Register.jsx";
import Login from "./Pages/Login.jsx";
import Dashboard from "./Pages/Dashboard.jsx";
import ShareAccess from "./Pages/ShareAccess.jsx";
import ViewDoc from "./Pages/ViewDoc.jsx";
import NotFound from "./Pages/NotFound.jsx";

// ---------- Auth helpers ----------
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

/** If already authed, redirect to /dashboard (prevents seeing login/register again) */
function UnauthedOnly({ children }) {
  if (isAuthed()) return <Navigate to="/dashboard" replace />;
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
          {/* Root: send authed users to dashboard, others to login */}
          <Route
            path="/"
            element={isAuthed() ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
          />

          {/* Public auth routes (block if already authed) */}
          <Route
            path="/login"
            element={
              <UnauthedOnly>
                <Login />
              </UnauthedOnly>
            }
          />
          <Route
            path="/register"
            element={
              <UnauthedOnly>
                <Register />
              </UnauthedOnly>
            }
          />

          {/* QR landing → ShareAccess decides public/private; if public, redirects to /view/:documentId; if private, runs email+OTP then redirects */}
          <Route path="/share/:shareId" element={<ShareAccess />} />

          {/* Viewer (public: view-only, private after OTP: view + download) */}
          <Route path="/view/:documentId" element={<ViewDoc />} />

          {/* Protected dashboard */}
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
