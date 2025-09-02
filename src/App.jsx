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
import QRScanner from "./Pages/QRScanner.jsx";
import NotFound from "./Pages/NotFound.jsx";

/* ---------- Theme (professional purple navbar) ---------- */
const THEME = {
  bg: "#f8f9fa",          // app/page background (lighter for contrast)
  barBg: "#6f42c1",       // topbar background (primary purple)
  barBorder: "#5a32a3",   // darker purple border
  barInk: "#ffffff",      // topbar text (white)
  barHover: "#59359c",    // hover effect for nav links
  cardBorder: "#d6d6f5",  // subtle purple border for cards
};

function isAuthed() {
  return !!localStorage.getItem("token");
}

function useAuthUser() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  });
  useEffect(() => {
    const onAuth = () => {
      try { setUser(JSON.parse(localStorage.getItem("user") || "{}")); } catch { setUser({}); }
    };
    window.addEventListener("auth", onAuth);
    return () => window.removeEventListener("auth", onAuth);
  }, []);
  return user;
}

function ProtectedRoute({ children }) {
  const loc = useLocation();
  if (!isAuthed()) return <Navigate to="/login" replace state={{ from: loc }} />;
  return children;
}

function UnauthedOnly({ children }) {
  if (isAuthed()) return <Navigate to="/dashboard" replace />;
  return children;
}

/* ---------- Utilities ---------- */
function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, search]);
  return null;
}

/* ---------- Layout ---------- */
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

  const linkStyle = {
    padding: "6px 12px",
    borderRadius: "6px",
    textDecoration: "none",
    color: THEME.barInk,
    fontWeight: 500,
    transition: "background 0.2s",
  };

  const hoverStyle = {
    background: THEME.barHover,
  };

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        background: THEME.barBg,
        color: THEME.barInk,
        borderBottom: `1px solid ${THEME.barBorder}`,
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <Link
        to="/"
        style={{
          color: THEME.barInk,
          textDecoration: "none",
          fontWeight: 800,
          letterSpacing: 0.3,
          fontSize: 18,
        }}
      >
        Secure-Docs
      </Link>

      {/* Navbar links */}
      <nav style={{ display: "flex", gap: 10, marginLeft: 12 }}>
        {isAuthed() && (
          <>
            <Link
              to="/dashboard"
              style={linkStyle}
              onMouseOver={(e) => Object.assign(e.target.style, hoverStyle)}
              onMouseOut={(e) => Object.assign(e.target.style, linkStyle)}
            >
              Dashboard
            </Link>
            <Link
              to="/scan"
              style={linkStyle}
              onMouseOver={(e) => Object.assign(e.target.style, hoverStyle)}
              onMouseOut={(e) => Object.assign(e.target.style, linkStyle)}
            >
              Scan QR
            </Link>
          </>
        )}
      </nav>

      {/* Right side (auth actions) */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        {isAuthed() ? (
          <>
            <span style={{ fontSize: 13, opacity: 0.95 }}>{user?.email}</span>
            <button className="btn btn-danger btn-sm" onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <Link className="btn btn-light btn-sm" to="/login">Login</Link>
            <Link className="btn btn-dark btn-sm" to="/register">Register</Link>
          </>
        )}
      </div>
    </header>
  );
}

/* ---------- App ---------- */
export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div style={{ background: THEME.bg, minHeight: "100vh" }}>
        <Topbar />

        <main style={{ minHeight: "calc(100vh - 56px)" }}>
          <Routes>
            <Route
              path="/"
              element={isAuthed() ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
            />

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

            <Route path="/share/:shareId" element={<ShareAccess />} />
            <Route path="/view/:documentId" element={<ViewDoc />} />

            <Route
              path="/scan"
              element={
                <ProtectedRoute>
                  <QRScanner />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        <ToastContainer position="top-right" autoClose={2500} theme="light" />
      </div>
    </BrowserRouter>
  );
}
