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
import QRScanner from "./Pages/QRScanner.jsx";
import NotFound from "./Pages/NotFound.jsx";

/* ---------- Theme (bright green) ---------- */
const THEME = {
  bg: "#eafaf1",            // app/page background
  barBg: "#2fbf71",         // topbar background
  barBorder: "#1fa765",
  barInk: "#f7fff9",        // topbar text
  cardBorder: "#b7e4c7",
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
    // scroll to top on route change
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
        }}
      >
        QR-Docs
      </Link>

      <nav style={{ display: "flex", gap: 10, marginLeft: 12 }}>
        {isAuthed() && (
          <>
            <Link className="btn btn-light" to="/dashboard">Dashboard</Link>
            <Link className="btn btn-light" to="/scan">Scan QR</Link>
          </>
        )}
      </nav>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        {isAuthed() ? (
          <>
            <span style={{ fontSize: 13, opacity: 0.95 }}>{user?.email}</span>
            <button className="btn btn-danger" onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <Link className="btn btn-light" to="/login">Login</Link>
            <Link className="btn btn-dark" to="/register">Register</Link>
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
            {/* Root: send to dashboard if authed, else login */}
            <Route
              path="/"
              element={isAuthed() ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
            />

            {/* Auth pages (blocked if already authed) */}
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

            {/* Public entry for share/verify and viewer */}
            <Route path="/share/:shareId" element={<ShareAccess />} />
            <Route path="/view/:documentId" element={<ViewDoc />} />

            {/* QR Scanner (nice to expose since you built it) */}
            <Route
              path="/scan"
              element={
                <ProtectedRoute>
                  <QRScanner />
                </ProtectedRoute>
              }
            />

            {/* App area */}
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

        {/* Light toast fits bright theme */}
        <ToastContainer position="top-right" autoClose={2500} theme="light" />
      </div>
    </BrowserRouter>
  );
}
