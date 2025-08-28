// src/App.jsx
import { useEffect, useState } from "react";
import {
  HashRouter as Router, // ✅ HashRouter so deep links work on Vercel
  Routes,
  Route,
  Navigate,
  useLocation,
  Link,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion } from "framer-motion";

// Pages
import Login from "./Pages/Login.jsx";
import Register from "./Pages/Register.jsx";
import Dashboard from "./Pages/Dashboard.jsx";
import ShareAccess from "./Pages/ShareAccess.jsx";
import ViewDoc from "./Pages/ViewDoc.jsx";

/* ---------- auth helpers ---------- */
function getToken() {
  return localStorage.getItem("token");
}

function useAuthToken() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const refresh = () => {
      setToken(localStorage.getItem("token"));
      try {
        setUser(JSON.parse(localStorage.getItem("user") || "{}"));
      } catch {
        setUser({});
      }
    };
    const onStorage = (e) => {
      if (e.key === "token" || e.key === "user") refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("auth", refresh); // dispatch after login/logout
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth", refresh);
    };
  }, []);

  return { token, user };
}

function Protected({ children }) {
  const token = getToken();
  const loc = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}

/* ---------- top bar ---------- */
function TopBar() {
  const { token, user } = useAuthToken();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth"));
    // With HashRouter, this is still fine:
    window.location.href = "/#/login";
  };

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#0f1533",
        borderBottom: "1px solid #2a3170",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Link to="/" style={{ fontWeight: 800, letterSpacing: 0.5, color: "#e9ecff" }}>
          QR-Docs
        </Link>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          {token ? (
            <>
              <span style={{ fontSize: 14, opacity: 0.8 }}>{user?.email}</span>
              <Link className="btn" to="/dashboard">Dashboard</Link>
              <button className="btn btn-danger" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link className="btn" to="/login">Login</Link>
              <Link className="btn btn-primary" to="/register">Register</Link>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}

/* ---------- app ---------- */
export default function App() {
  return (
    <Router>
      <TopBar />

      <Routes>
        {/* Default → dashboard (protected) */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Auth (public) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* App (protected) */}
        <Route
          path="/dashboard"
          element={
            <Protected>
              <Dashboard />
            </Protected>
          }
        />

        {/* Share/OTP flow (public; ShareAccess will self-redirect to /login if needed) */}
        <Route path="/share/:shareId" element={<ShareAccess />} />

        {/* View/Download (public route; backend enforces rules via share_id & OTP) */}
        <Route path="/view/:documentId" element={<ViewDoc />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <ToastContainer position="top-right" />
    </Router>
  );
}

/* Notes:
   - We use HashRouter so deep links like https://yourapp/#/share/123 always hit the SPA,
     which fixes Vercel 404s without extra rewrites.
   - The QR your backend generates must point to HASH URLs:
       https://qr-project-react.vercel.app/#/share/:id
   - After login/register, dispatch: window.dispatchEvent(new Event("auth"));
*/
