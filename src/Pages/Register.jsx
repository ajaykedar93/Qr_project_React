// src/Pages/Register.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

// Backend base
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

  const pageWrap = {
    width: "100%",
    minHeight: "calc(100svh - 56px)",
    display: "grid",
    placeItems: "center",
    padding: "clamp(18px, 4vw, 40px)",
    // Bright layered background (same vibe as Login.jsx)
    backgroundImage: [
      "radial-gradient(46rem 24rem at 12% 90%, rgba(255,106,61,.25) 0%, rgba(255,106,61,0) 60%)",
      "radial-gradient(42rem 22rem at 88% 12%, rgba(255,77,136,.22) 0%, rgba(255,77,136,0) 60%)",
      "linear-gradient(135deg, #FFF7E6 0%, #E6F8FF 52%, #F6E5FF 100%)",
    ].join(","),
  };

  return (
    <div style={pageWrap}>
      <style>{`
        :root {
          --ink-strong: #2f1b70;  /* vivid purple for titles */
          --ink-soft:   #5b3fb8;  /* soft vivid purple */
          --ink-body:   #3a2a88;  /* readable text tone */
          --card:       #ffffff;  /* clean white card */
          --line:       rgba(124,92,255,.25);
          --accent1:    #ff6a3d;  /* bright orange */
          --accent2:    #ff4d88;  /* hot pink */
          --accent3:    #7c5cff;  /* bright indigo */
          --focus:      rgba(124,92,255,.25);
        }

        .card {
          background: linear-gradient(180deg, rgba(255,255,255,.85), rgba(255,255,255,.75));
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: clamp(22px, 3.6vw, 28px);
          width: min(560px, 100%);
          box-shadow:
            0 22px 60px rgba(124,92,255,.18),
            inset 0 0 0 1px rgba(255,255,255,.4);
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
          font-size: 14px;
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
          background: #ffffff;                 /* bright input */
          color: var(--ink-body);
          outline: none;
          transition: box-shadow .15s ease, border-color .15s ease, transform .12s ease;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.9);
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
          background: linear-gradient(180deg, rgba(255,255,255,.9), rgba(255,255,255,.75));
          color: var(--ink-strong);
          border: 1px solid var(--line);
        }

        .helper {
          margin-top: 12px;
          font-size: 14px;
          color: var(--ink-soft);
        }
        .link {
          color: #ffb300; /* lemony link */
          text-decoration: none;
          font-weight: 800;
        }
        .link:hover { text-decoration: underline; }
        .hint {
          font-size: 12px;
          color: var(--ink-soft);
          margin-top: 6px;
        }
      `}</style>

      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
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

        {/* Password */}
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
                height: 44,
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
          style={{ width: "100%", marginTop: 12, opacity: loading ? 0.9 : 1 }}
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
