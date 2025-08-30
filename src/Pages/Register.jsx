// src/Pages/Register.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080"; 
// 👆 set VITE_API_URL in your .env for Vercel/Dev

export default function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const onChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password) {
      toast.error("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/register`, {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
      });
      toast.success("Registered! Please login.");
      nav("/login", { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Registration failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: "60px auto", padding: 16 }}>
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "#0f1533",
          padding: 24,
          borderRadius: 14,
          border: "1px solid #2a3170",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Create account</h2>

        <label style={{ fontSize: 13, opacity: 0.8 }}>Full name</label>
        <input
          className="input"
          name="full_name"
          placeholder="Ajay Kumar"
          value={form.full_name}
          onChange={onChange}
          autoComplete="name"
          style={{ margin: "10px 0" }}
        />

        <label style={{ fontSize: 13, opacity: 0.8 }}>Email</label>
        <input
          className="input"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={onChange}
          autoComplete="email"
          style={{ margin: "10px 0" }}
        />

        <label style={{ fontSize: 13, opacity: 0.8 }}>Password</label>
        <div style={{ position: "relative", margin: "10px 0" }}>
          <input
            className="input"
            name="password"
            type={showPwd ? "text" : "password"}
            placeholder="••••••••"
            value={form.password}
            onChange={onChange}
            autoComplete="new-password"
            style={{ paddingRight: 90 }}
          />
          <button
            type="button"
            className="btn"
            onClick={() => setShowPwd((v) => !v)}
            style={{
              position: "absolute",
              right: 6,
              top: 6,
              height: 36,
              padding: "0 10px",
              fontSize: 12,
            }}
          >
            {showPwd ? "Hide" : "Show"}
          </button>
        </div>

        <button
          className="btn btn-primary"
          disabled={loading}
          style={{ width: "100%", marginTop: 6, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Creating..." : "Register"}
        </button>

        <div style={{ marginTop: 12, fontSize: 14 }}>
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </motion.form>
    </div>
  );
}
