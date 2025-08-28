// src/Pages/Login.jsx
import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

const API_BASE = "https://qr-project-v0h4.onrender.com/auth"; // auth base

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();
  const loc = useLocation();

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/login`, { email, password });
      // save auth
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      // notify header/topbar to re-render
      window.dispatchEvent(new Event("auth"));
      toast.success("Welcome back!");
      // go to dashboard (or the protected page the user came from)
      nav(loc.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "60px auto", padding: 16 }}>
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ background: "#0f1533", padding: 24, borderRadius: 14, border: "1px solid #2a3170" }}
      >
        <h2 style={{ marginTop: 0 }}>Login</h2>

        <label style={{ fontSize: 13, opacity: 0.8 }}>Email</label>
        <input
          className="input"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          style={{ width: "100%", padding: 12, margin: "10px 0" }}
        />

        <label style={{ fontSize: 13, opacity: 0.8 }}>Password</label>
        <div style={{ position: "relative", margin: "10px 0" }}>
          <input
            className="input"
            type={showPwd ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            style={{ width: "100%", padding: 12, paddingRight: 90 }}
          />
          <button
            type="button"
            className="btn"
            onClick={() => setShowPwd((v) => !v)}
            style={{ position: "absolute", right: 6, top: 6, height: 36, padding: "0 10px", fontSize: 12 }}
          >
            {showPwd ? "Hide" : "Show"}
          </button>
        </div>

        <button
          className="btn btn-primary"
          disabled={loading}
          style={{ width: "100%", marginTop: 6, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Signing in..." : "Login"}
        </button>

        <div style={{ marginTop: 10, fontSize: 14 }}>
          New here? <Link to="/register">Create an account</Link>
        </div>
      </motion.form>
    </div>
  );
}
