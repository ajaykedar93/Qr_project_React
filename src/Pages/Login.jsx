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
    minHeight: "calc(100svh - 56px)", // full viewport minus navbar
    display: "grid",
    placeItems: "center",
    padding: "clamp(18px, 4vw, 40px)",
    boxSizing: "border-box",
    // Match Home.jsx layered background
    backgroundImage: [
      "radial-gradient(60rem 30rem at 10% 92%, rgba(255,106,61,.45) 0%, rgba(255,106,61,0) 60%)",
      "radial-gradient(55rem 28rem at 92% 8%, rgba(255,0,128,.40) 0%, rgba(255,0,128,0) 60%)",
      "linear-gradient(145deg, #1a0f3a 0%, #0e0f3a 100%)",
    ].join(","),
  };

  return (
    <div style={pageWrap}>
      {/* Inline dark theme that mirrors Home.jsx palette */}
      <style>{`
        :root {
          --ink-strong: #f7c43d;  /* yellow heading ink (matches Home title) */
          --ink-soft:   #cdd1ff;  /* soft text */
          --ink-body:   #e8e6ff;  /* body text high-contrast */
          --card:       #16122b;  /* deep card */
          --line:       rgba(255,255,255,.08);
          --accent1:    #ff5b93;
          --accent2:    #d246a1;
          --accent3:    #bf3ea0;
          --focus:      rgba(255,91,147,.35);
        }

        .card {
          background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.02));
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: clamp(22px, 3.6vw, 28px);
          width: min(560px, 100%);
          box-shadow:
            0 18px 50px rgba(0,0,0,.35),
            inset 0 0 0 1px rgba(255,255,255,.02);
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
          background: rgba(255,255,255,.06);
          color: var(--ink-body);
          outline: none;
          transition: box-shadow .15s ease, border-color .15s ease, background .15s ease, transform .12s ease;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.02);
        }
        .input::placeholder { color: rgba(205,209,255,.6); }
        .input:focus {
          border-color: var(--accent1);
          box-shadow: 0 0 0 5px var(--focus);
          transform: translateY(-1px);
          background: rgba(255,255,255,.08);
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
          background-image: linear-gradient(180deg, var(--accent1) 0%, var(--accent2) 100%);
          box-shadow: 0 12px 30px rgba(210, 70, 161, .42);
        }
        .btn-primary:hover {
          filter: brightness(1.03);
          box-shadow: 0 14px 34px rgba(210, 70, 161, .48);
        }
        .btn-ghost {
          background: rgba(255,255,255,.08);
          color: #f2f0ff;
          border: 1px solid var(--line);
        }
        .btn-ghost:hover { filter: brightness(1.06) }

        .helper {
          margin-top: 12px;
          font-size: 14px;
          color: var(--ink-soft);
        }
        .link {
          color: #ffd166;
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

        {/* Divider (optional) */}
        <div className="sep" />

        {/* Submit */}
        <button
          className="btn btn-primary"
          disabled={loading}
          style={{ width: "100%", opacity: loading ? 0.85 : 1 }}
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
