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

  return (
    <div style={{ maxWidth: 560, margin: "64px auto", padding: "0 16px" }}>
      {/* Global bright-green theme */}
      <style>{`
        body {
          background: linear-gradient(180deg, #EFFFF7 0%, #E3FFEF 50%, #DBFFF0 100%);
          font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji';
        }
        .btn {
          padding: 10px 14px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          transition: transform .04s ease, box-shadow .2s ease, background .2s ease;
        }
        .btn:active { transform: translateY(1px) }
        .btn-primary { background: #19d3a2; color: #fff; box-shadow: 0 4px 12px rgba(25,211,162,.25); }
        .btn-primary:hover { background: #12c39a; box-shadow: 0 6px 18px rgba(25,211,162,.32); }
        .btn-ghost { background: #eef9f5; color: #0a8f6a; }
        .btn-ghost:hover { background: #e6f7f0; }

        .input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid #cfeee3;
          background: #fff;
          color: #111;
          outline: none;
          transition: box-shadow .15s ease, border-color .15s ease;
        }
        .input:focus {
          border-color: #19d3a2;
          box-shadow: 0 0 0 4px rgba(25,211,162,.15);
        }

        .field-label {
          font-size: 13px;
          color: #267a66;
          margin-bottom: 6px;
          font-weight: 600;
          letter-spacing: .2px;
        }
        .card {
          background: #fff;
          border: 1px solid #d6f5e6;
          border-radius: 16px;
          padding: 26px 22px;
          box-shadow: 0 12px 36px rgba(0,0,0,.08);
        }
        .title {
          margin: 0 0 8px;
          color: #0a8f6a;
          font-weight: 800;
          letter-spacing: .2px;
        }
        .subtitle {
          margin: 0 0 18px;
          color: #3a6a5d;
          font-size: 14px;
        }
        .helper {
          margin-top: 10px;
          font-size: 14px;
          color: #2e5e52;
        }
        .link {
          color: #0a8f6a;
          text-decoration: none;
          font-weight: 700;
        }
        .link:hover { text-decoration: underline; }
      `}</style>

      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
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
        <div style={{ marginBottom: 10 }}>
          <div className="field-label">Password</div>
          <div style={{ position: "relative" }}>
            <input
              className="input"
              type={showPwd ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{ paddingRight: 100 }}
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowPwd((v) => !v)}
              style={{
                position: "absolute",
                right: 6,
                top: 6,
                height: 40,
                padding: "0 12px",
                fontSize: 12,
              }}
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          className="btn btn-primary"
          disabled={loading}
          style={{ width: "100%", marginTop: 8, opacity: loading ? 0.8 : 1 }}
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
