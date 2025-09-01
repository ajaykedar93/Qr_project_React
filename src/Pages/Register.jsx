// src/Pages/Register.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

// Backend base (same as your login page style)
const API_BASE = "https://qr-project-v0h4.onrender.com/auth";

export default function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password) {
      toast.error("Please fill all fields");
      return;
    }
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/register`, {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
      });
      toast.success("Registered successfully! Please login.");
      nav("/login", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Registration failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: "64px auto", padding: "0 16px" }}>
      {/* Global bright-green theme to match Login */}
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
        .hint {
          font-size: 12px;
          color: #3a6a5d;
          margin-top: 6px;
        }
      `}</style>

      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <h2 className="title">Create your account</h2>
        <div className="subtitle">Sign up to start sharing via QR</div>

        {/* Full name */}
        <div style={{ marginBottom: 14 }}>
          <label className="field-label" htmlFor="full_name">Full name</label>
          <input
            id="full_name"
            className="input"
            name="full_name"
            placeholder="Ajay Kumar"
            value={form.full_name}
            onChange={onChange}
            autoComplete="name"
          />
        </div>

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <label className="field-label" htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={onChange}
            autoComplete="email"
          />
        </div>

        {/* Password + toggle */}
        <div style={{ marginBottom: 6 }}>
          <label className="field-label" htmlFor="password">Password</label>
          <div style={{ position: "relative" }}>
            <input
              id="password"
              className="input"
              name="password"
              type={showPwd ? "text" : "password"}
              placeholder="••••••••"
              value={form.password}
              onChange={onChange}
              autoComplete="new-password"
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
          <div className="hint">At least 8 characters are recommended.</div>
        </div>

        {/* Submit */}
        <button
          className="btn btn-primary"
          disabled={loading}
          style={{ width: "100%", marginTop: 10, opacity: loading ? 0.8 : 1 }}
        >
          {loading ? "Creating…" : "Register"}
        </button>

        {/* Helpers */}
        <div className="helper">
          Already have an account?{" "}
          <Link to="/login" className="link">Login</Link>
        </div>
      </motion.form>
    </div>
  ); 
}
