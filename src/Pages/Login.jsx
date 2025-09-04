// src/Pages/Login.jsx
import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

// Backend base (same pattern you use elsewhere)
const API_BASE = "https://qr-project-v0h4.onrender.com/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();
  const loc = useLocation();

  async function submit(e) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    try {
      setLoading(true);
      const { data } = await axios.post(`${API_BASE}/login`, { email, password });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("auth"));
      toast.success("Welcome back!");

      nav(loc.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const pageWrap = {
    width: "100%",
    minHeight: "calc(100svh - 56px)",
    display: "grid",
    placeItems: "center",
    padding: "clamp(18px, 4vw, 40px)",
    boxSizing: "border-box",
    // Bright layered background (no dark/black)
    backgroundImage: [
      "radial-gradient(46rem 24rem at 12% 90%, rgba(255,106,61,.25) 0%, rgba(255,106,61,0) 60%)",
      "radial-gradient(42rem 22rem at 88% 12%, rgba(255,77,136,.22) 0%, rgba(255,77,136,0) 60%)",
      "linear-gradient(135deg, #FFF7E6 0%, #E6F8FF 52%, #F6E5FF 100%)",
    ].join(","),
  };

  return (
    <div style={pageWrap}>
      {/* Bright theme variables */}
      <style>{`
        :root {
          --ink-strong: #2f1b70;  /* vivid purple for headings (high contrast, not black) */
          --ink-soft:   #5b3fb8;  /* soft vivid purple */
          --ink-body:   #3a2a88;  /* readable text tone */
          --card:       #ffffff;  /* clean white card */
          --line:       rgba(124,92,255,.25);
          --accent1:    #ff6a3d;  /* bright orange */
          --accent2:    #ff4d88;  /* hot pink */
          --accent3:    #7c5cff;  /* bright indigo */
          --focus:      rgba(124,92,255,.25);
          --bg-chip:    linear-gradient(90deg, rgba(255,213,74,.25), rgba(124,92,255,.2));
        }

        .card {
          background:
            linear-gradient(180deg, rgba(255,255,255,.8), rgba(255,255,255,.7));
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: clamp(22px, 3.6vw, 28px);
          width: min(560px, 100%);
          box-shadow:
            0 22px 60px rgba(124,92,255,.18),
            inset 0 0 0 1px rgba(255,255,255,.3);
          backdrop-filter: blur(6px);
        }

        .title {
          margin: 0 0 8px;
          color: var(--ink-strong);
          font-weight: 900;
          letter-spacing: .2px;
          font-size: clamp(22px, 3.6vw, 28px);
          line-height: 1.15;
        }

        .subtitle {
          margin: 0 0 18px;
          color: var(--ink-soft);
          font-size: clamp(13px, 2.2vw, 15px);
        }

        .field-label {
          font-size: 13px;
          color: var(--ink-soft);
          margin-bottom: 6px;
          font-weight: 700;
          letter-spacing: .2px;
        }

        .input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid var(--line);
          background: #ffffff;                 /* bright input surface */
          color: var(--ink-body);
          outline: none;
          transition: box-shadow .15s ease, border-color .15s ease, transform .12s ease;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.8);
        }
        .input::placeholder { color: rgba(91,63,184,.6); }
        .input:focus {
          border-color: var(--accent3);
          box-shadow: 0 0 0 6px var(--focus);
          transform: translateY(-1px);
        }

        .btn {
          padding: 12px 16px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          font-weight: 800;
          transition: transform .06s ease, box-shadow .2s ease, filter .2s ease, opacity .2s ease;
        }
        .btn:active { transform: translateY(1px) }

        .btn-primary {
          color: #fff;
          background-image: linear-gradient(90deg, var(--accent1), var(--accent2));
          box-shadow: 0 16px 38px rgba(255,77,136,.32);
        }
        .btn-primary:hover {
          filter: brightness(1.04);
          box-shadow: 0 18px 42px rgba(255,77,136,.38);
        }

        .btn-ghost {
          background: linear-gradient(180deg, rgba(255,255,255,.85), rgba(255,255,255,.75));
          color: var(--ink-strong);
          border: 1px solid var(--line);
        }
        .btn-ghost:hover { filter: brightness(1.05) }

        .helper {
          margin-top: 12px;
          font-size: 14px;
          color: var(--ink-soft);
        }
        .link {
          color: #ffb300;         /* lemon-ish link for brightness */
          text-decoration: none;
          font-weight: 800;
        }
        .link:hover { text-decoration: underline; }

        .sep {
          height: 1px;
          background: var(--line);
          margin: 16px 0;
          border-radius: 999px;
        }

        /* Optional header chip style if you add badges later */
        .chip {
          display:inline-flex;align-items:center;gap:8px;
          background: var(--bg-chip);
          color: var(--ink-strong);
          padding: 6px 10px;
          border: 1px solid var(--line);
          border-radius: 999px;
          font-weight: 700;
          font-size: 12px;
        }
      `}</style>

      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="card"
      >
        <h2 className="title">Welcome back</h2>
        <div className="subtitle">Log in to access your dashboard</div>

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <div className="field-label">Email</div>
          <input
            className="input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        {/* Password with show/hide */}
        <div style={{ marginBottom: 12 }}>
          <div className="field-label">Password</div>
          <div style={{ position: "relative" }}>
            <input
              className="input"
              type={showPwd ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{ paddingRight: 104 }}
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowPwd((v) => !v)}
              style={{
                position: "absolute",
                right: 6,
                top: 6,
                height: 44,
                padding: "0 12px",
                fontSize: 12,
              }}
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="sep" />

        {/* Submit */}
        <button
          className="btn btn-primary"
          disabled={loading}
          style={{ width: "100%", opacity: loading ? 0.9 : 1 }}
        >
          {loading ? "Signing in…" : "Login"}
        </button>

        {/* Helpers */}
        <div className="helper">
          New here?{" "}
          <Link to="/register" className="link">
            Create an account
          </Link>
        </div>
      </motion.form>
    </div>
  );
}
