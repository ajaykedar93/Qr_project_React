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
import Home from "./Pages/Home.jsx";           // ⬅️ Home page
import Register from "./Pages/Register.jsx";
import Login from "./Pages/Login.jsx";
import Dashboard from "./Pages/Dashboard.jsx";
import ShareAccess from "./Pages/ShareAccess.jsx";
import ViewDoc from "./Pages/ViewDoc.jsx";
import QRScanner from "./Pages/QRScanner.jsx";
import NotFound from "./Pages/NotFound.jsx";

/* ---------- Theme (Purple + Deep) ---------- */
const THEME = {
  bg: "#0f0c16",
  pageMinH: "100vh",
  barBgFrom: "#6d28d9",
  barBgTo: "#a21caf",
  barBorder: "#7c3aed",
  barInk: "#f7ecff",
  lightGlass: "rgba(255,255,255,.08)",
};

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

/* ---------- Layout: Topbar (Responsive) ---------- */
function Topbar() {
  const user = useAuthUser();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("verifiedEmail");
    window.dispatchEvent(new Event("auth"));
    nav("/login", { replace: true });
  }, [nav]);

  // Close mobile menu on navigation/back/forward
  useEffect(() => {
    const closeOnRoute = () => setOpen(false);
    window.addEventListener("popstate", closeOnRoute);
    return () => window.removeEventListener("popstate", closeOnRoute);
  }, []);

  const barStyle = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 16px",
    background: `linear-gradient(135deg, ${THEME.barBgFrom}, ${THEME.barBgTo})`,
    color: THEME.barInk,
    borderBottom: `1px solid ${THEME.barBorder}`,
    position: "sticky",
    top: 0,
    zIndex: 50,
    boxShadow: "0 10px 30px rgba(0,0,0,.35)",
  };

  const brandStyle = {
    color: THEME.barInk,
    textDecoration: "none",
    fontWeight: 900,
    letterSpacing: 0.4,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: "clamp(16px, 3.2vw, 20px)",
    whiteSpace: "nowrap",
  };

  const navWrap = {
    marginLeft: 12,
    display: "flex",
    alignItems: "center",
    gap: 10,
  };

  const rightWrap = {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: 10,
  };

  const btnBase = {
    border: `1px solid ${THEME.lightGlass}`,
    background: "rgba(0,0,0,.15)",
    color: THEME.barInk,
    padding: "8px 12px",
    borderRadius: 10,
    cursor: "pointer",
    transition: "transform .14s ease, box-shadow .22s ease, filter .14s ease",
    textDecoration: "none",
    whiteSpace: "nowrap",
    fontSize: 14,
  };

  const btnHover = (s) => ({ ...btnBase, ...s });

  const burgerBtn = {
    marginLeft: "auto",
    border: "none",
    background: "transparent",
    color: THEME.barInk,
    padding: 8,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    cursor: "pointer",
  };

  const hideAuthOnHome = pathname === "/" && !isAuthed();

  return (
    <header style={barStyle}>
      <Link to="/" style={brandStyle} aria-label="Secure-Doc Home">
        <span
          aria-hidden
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: "rgba(255,255,255,.2)",
            display: "inline-grid",
            placeItems: "center",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,.25)",
          }}
        >
          🔒
        </span>
        Secure-Doc
      </Link>

      {/* Desktop nav (only when authed) */}
      <nav style={{ ...navWrap, display: "none" }} className="nav-desktop">
        {isAuthed() && (
          <>
            <Link
              className="btn btn-light"
              to="/dashboard"
              style={btnBase}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
            >
              Dashboard
            </Link>
            <Link
              className="btn btn-light"
              to="/scan"
              style={btnBase}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
            >
              Scan QR
            </Link>
          </>
        )}
      </nav>

      {/* Right section (desktop) — hides Login/Register on Home when not authed */}
      <div style={{ ...rightWrap, display: "none" }} className="right-desktop">
        {hideAuthOnHome ? null : isAuthed() ? (
          <>
            <span style={{ fontSize: 13, opacity: 0.95, whiteSpace: "nowrap" }}>
              {user?.email}
            </span>
            <button
              className="btn btn-danger"
              onClick={logout}
              style={btnHover({
                background: "rgba(255,0,0,.15)",
                border: "1px solid rgba(255,0,0,.25)",
              })}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              className="btn btn-light"
              to="/login"
              style={btnBase}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
            >
              Login
            </Link>
            <Link
              className="btn btn-dark"
              to="/register"
              style={btnHover({
                background: "rgba(255,255,255,.1)",
                border: `1px solid ${THEME.lightGlass}`,
              })}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
            >
              Register
            </Link>
          </>
        )}
      </div>

      {/* Mobile burger */}
      <button
        aria-label="Toggle menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
        style={{ ...burgerBtn, display: "inline-flex" }}
        className="burger"
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" role="img">
          <path d="M4 6h16M4 12h16M4 18h16" stroke={THEME.barInk} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Mobile sheet (also hides auth on Home if not authed) */}
      <div
        id="mobile-menu"
        style={{
          position: "fixed",
          inset: "56px 8px auto 8px",
          background: "linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.06))",
          border: `1px solid ${THEME.lightGlass}`,
          borderRadius: 14,
          backdropFilter: "blur(8px)",
          padding: 12,
          display: open ? "grid" : "none",
          gap: 8,
          zIndex: 60,
          boxShadow: "0 20px 48px rgba(0,0,0,.45)",
        }}
      >
        {isAuthed() ? (
          <>
            <Link to="/dashboard" onClick={() => setOpen(false)} style={btnHover({ textAlign: "center" })}>
              Dashboard
            </Link>
            <Link to="/scan" onClick={() => setOpen(false)} style={btnHover({ textAlign: "center" })}>
              Scan QR
            </Link>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 13, opacity: 0.95, overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.email}
              </span>
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                style={btnHover({
                  background: "rgba(255,0,0,.15)",
                  border: "1px solid rgba(255,0,0,.25)",
                })}
              >
                Logout
              </button>
            </div>
          </>
        ) : hideAuthOnHome ? (
          <></>
        ) : (
          <>
            <Link to="/login" onClick={() => setOpen(false)} style={btnHover({ textAlign: "center" })}>
              Login
            </Link>
            <Link to="/register" onClick={() => setOpen(false)} style={btnHover({ textAlign: "center" })}>
              Register
            </Link>
          </>
        )}
      </div>

      {/* Desktop vs mobile toggles */}
      <style>{`
        @media (min-width: 860px) {
          .nav-desktop, .right-desktop { display: flex !important; }
          .burger { display: none !important; }
        }
      `}</style>
    </header>
  );
}

/* ---------- App ---------- */
export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      {/* Full-width + full-height app shell */}
      <div style={{ background: THEME.bg, minHeight: THEME.pageMinH, width: "100%" }}>
        <Topbar />

        {/* Full-width pages; 100svh accounts for mobile browser UI */}
        <main style={{ minHeight: "calc(100svh - 56px)", width: "100%" }}>
          <Routes>
            {/* PUBLIC HOME (visible before login) */}
            <Route path="/" element={<Home />} />

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

            {/* QR Scanner */}
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

        {/* Toasts (dark theme still works fine on the purple background) */}
        <ToastContainer position="top-right" autoClose={2500} theme="dark" />
      </div>
    </BrowserRouter>
  );
}
