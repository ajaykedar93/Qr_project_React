// src/Pages/Navbar.jsx
import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

/* ---------- Bright Theme (kept local so Navbar is self-contained) ---------- */
const THEME = {
  barBgFrom: "#FFD54A",
  barBgTo: "#7C5CFF",
  barBorder: "rgba(124,92,255,.35)",
  barInk: "#2F1B70",
  lightGlass: "rgba(124,92,255,.22)",
  shadow: "0 10px 30px rgba(124,92,255,.28)",
};

/* Auth helpers (kept here because only Navbar needs them) */
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

export default function Navbar() {
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

  // Close mobile sheet on route changes (back/forward)
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
    boxShadow: THEME.shadow,
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
    filter: "drop-shadow(0 1px 6px rgba(255,213,74,.45))",
  };

  const navWrap = { marginLeft: 12, display: "flex", alignItems: "center", gap: 10 };
  const rightWrap = { marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 };

  const btnBase = {
    border: `1px solid ${THEME.lightGlass}`,
    background: "rgba(255,255,255,.55)",
    color: THEME.barInk,
    padding: "8px 12px",
    borderRadius: 10,
    cursor: "pointer",
    transition: "transform .14s ease, box-shadow .22s ease, filter .14s ease",
    textDecoration: "none",
    whiteSpace: "nowrap",
    fontSize: 14,
    boxShadow: "0 6px 18px rgba(124,92,255,.20)",
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

  const onHome = pathname === "/";
  const showNavButtons = isAuthed() && !onHome;
  const showRightAuth = isAuthed() && !onHome;
  const showGuestButtons = !isAuthed() && !onHome;
  const showBurger = !onHome;

  return (
    <header style={barStyle}>
      <Link to="/" style={brandStyle} aria-label="Secure-Doc Home">
        <span
          aria-hidden
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: "linear-gradient(135deg, rgba(255,213,74,.6), rgba(124,92,255,.4))",
            display: "inline-grid",
            placeItems: "center",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,.45)",
          }}
        >
          🔒
        </span>
        Secure-Doc
      </Link>

      {/* Desktop nav (authed & not on Home) */}
      <nav style={{ ...navWrap, display: "none" }} className="nav-desktop">
        {showNavButtons && (
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

      {/* Right section (desktop) */}
      <div style={{ ...rightWrap, display: "none" }} className="right-desktop">
        {showRightAuth ? (
          <>
            <span style={{ fontSize: 13, opacity: 0.95, whiteSpace: "nowrap" }}>
              {user?.email}
            </span>
            <button
              className="btn btn-danger"
              onClick={logout}
              style={btnHover({
                background: "rgba(255,107,129,.18)",
                border: "1px solid rgba(255,107,129,.36)",
              })}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
            >
              Logout
            </button>
          </>
        ) : showGuestButtons ? (
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
                background: "rgba(255,255,255,.65)",
                border: `1px solid ${THEME.lightGlass}`,
              })}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
            >
              Register
            </Link>
          </>
        ) : null}
      </div>

      {/* Mobile burger (hidden on Home) */}
      {showBurger && (
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
      )}

      {/* Mobile sheet (no items on Home) */}
      <div
        id="mobile-menu"
        style={{
          position: "fixed",
          inset: "56px 8px auto 8px",
          background: "linear-gradient(180deg, rgba(255,255,255,.38), rgba(230,248,255,.6))",
          border: `1px solid ${THEME.lightGlass}`,
          borderRadius: 14,
          backdropFilter: "blur(10px)",
          padding: 12,
          display: open && !onHome ? "grid" : "none",
          gap: 8,
          zIndex: 60,
          boxShadow: "0 20px 48px rgba(124,92,255,.30)",
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
              <span
                style={{
                  fontSize: 13,
                  opacity: 0.95,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: THEME.barInk,
                }}
              >
                {user?.email}
              </span>
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                style={btnHover({
                  background: "rgba(255,107,129,.18)",
                  border: "1px solid rgba(255,107,129,.36)",
                })}
              >
                Logout
              </button>
            </div>
          </>
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
