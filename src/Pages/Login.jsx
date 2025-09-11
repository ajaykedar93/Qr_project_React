// src/Pages/Login.jsx
import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";

// Backend base (same pattern you use elsewhere)
const API_BASE = "https://qr-project-express.onrender.com/auth";

export default function Login() {
  // ---- login form ----
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false); // <- we will show a full-page loader when true

  // ---- forgot-password modal ----
  const [fpOpen, setFpOpen] = useState(false);
  const [fpStep, setFpStep] = useState("email"); // 'email' | 'otp' | 'reset'
  const [fpEmail, setFpEmail] = useState("");
  const [fpOtp, setFpOtp] = useState("");
  const [fpNewPwd, setFpNewPwd] = useState("");
  const [fpNewPwd2, setFpNewPwd2] = useState("");
  const [fpBusy, setFpBusy] = useState(false);

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

  // ---- Forgot Password actions ----
  function openForgot() {
    setFpOpen(true);
    setFpStep("email");
    setFpEmail(email || "");
    setFpOtp("");
    setFpNewPwd("");
    setFpNewPwd2("");
  }
  function closeForgot() {
    setFpOpen(false);
    setFpBusy(false);
  }

  // 1) Send OTP -> POST /auth/forgot  { email }
  async function fpSendOtp(e) {
    e?.preventDefault?.();
    if (!fpEmail) return toast.error("Enter your email");
    try {
      setFpBusy(true);
      await axios.post(`${API_BASE}/forgot`, { email: fpEmail });
      toast.success("If the account exists, an OTP has been sent.");
      setFpStep("otp");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to send OTP");
    } finally {
      setFpBusy(false);
    }
  }

  // 2) Verify OTP -> POST /auth/reset/verify  { email, otp }
  async function fpVerifyOtp(e) {
    e?.preventDefault?.();
    if (!fpOtp) return toast.error("Enter the OTP");
    try {
      setFpBusy(true);
      const { data } = await axios.post(`${API_BASE}/reset/verify`, { email: fpEmail, otp: fpOtp });
      if (data?.ok) {
        toast.success("OTP verified");
        setFpStep("reset");
      } else {
        throw new Error("Invalid verification response");
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || "Invalid or expired OTP");
    } finally {
      setFpBusy(false);
    }
  }

  // 3) Reset password -> POST /auth/reset  { email, otp, new_password }
  async function fpResetPwd(e) {
    e?.preventDefault?.();
    if (!fpNewPwd || !fpNewPwd2) return toast.error("Enter and confirm your new password");
    if (fpNewPwd !== fpNewPwd2) return toast.error("Passwords do not match");
    if (fpNewPwd.trim().length < 8) return toast.error("Password must be at least 8 characters");

    try {
      setFpBusy(true);
      await axios.post(`${API_BASE}/reset`, {
        email: fpEmail,
        otp: fpOtp,
        new_password: fpNewPwd,
      });
      toast.success("Password changed. Please log in.");
      setPassword("");
      setEmail(fpEmail);
      closeForgot();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Reset failed");
    } finally {
      setFpBusy(false);
    }
  }

  const pageWrap = {
    width: "100%",
    minHeight: "calc(100svh - 56px)",
    display: "grid",
    placeItems: "center",
    padding: "clamp(18px, 4vw, 40px)",
    boxSizing: "border-box",
    backgroundImage: [
      "radial-gradient(46rem 24rem at 12% 90%, rgba(255,106,61,.25) 0%, rgba(255,106,61,0) 60%)",
      "radial-gradient(42rem 22rem at 88% 12%, rgba(255,77,136,.22) 0%, rgba(255,77,136,0) 60%)",
      "linear-gradient(135deg, #FFF7E6 0%, #E6F8FF 52%, #F6E5FF 100%)",
    ].join(","),
  };

  return (
    <div style={pageWrap}>
      {/* Bright theme variables + modal styles + screen loader styles */}
      <style>{`
        :root {
          --ink-strong: #2f1b70;
          --ink-soft:   #5b3fb8;
          --ink-body:   #3a2a88;
          --card:       #ffffff;
          --line:       rgba(124,92,255,.25);
          --accent1:    #ff6a3d;
          --accent2:    #ff4d88;
          --accent3:    #7c5cff;
          --focus:      rgba(124,92,255,.25);
          --bg-chip:    linear-gradient(90deg, rgba(255,213,74,.25), rgba(124,92,255,.2));
        }

        .card {
          background: linear-gradient(180deg, rgba(255,255,255,.8), rgba(255,255,255,.7));
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: clamp(22px, 3.6vw, 28px);
          width: min(560px, 100%);
          box-shadow: 0 22px 60px rgba(124,92,255,.18), inset 0 0 0 1px rgba(255,255,255,.3);
          backdrop-filter: blur(6px);
        }

        .title { margin: 0 0 8px; color: var(--ink-strong); font-weight: 900; letter-spacing: .2px; font-size: clamp(22px, 3.6vw, 28px); line-height: 1.15; }
        .subtitle { margin: 0 0 18px; color: var(--ink-soft); font-size: clamp(13px, 2.2vw, 15px); }

        .field-label { font-size: 13px; color: var(--ink-soft); margin-bottom: 6px; font-weight: 700; letter-spacing: .2px; }
        .input {
          width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--line);
          background: #ffffff; color: var(--ink-body); outline: none;
          transition: box-shadow .15s ease, border-color .15s ease, transform .12s ease;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.8);
        }
        .input::placeholder { color: rgba(91,63,184,.6); }
        .input:focus { border-color: var(--accent3); box-shadow: 0 0 0 6px var(--focus); transform: translateY(-1px); }

        .btn {
          padding: 12px 16px; border-radius: 14px; border: none; cursor: pointer; font-weight: 800;
          transition: transform .06s ease, box-shadow .2s ease, filter .2s ease, opacity .2s ease;
        }
        .btn:active { transform: translateY(1px) }
        .btn-primary { color: #fff; background-image: linear-gradient(90deg, var(--accent1), var(--accent2)); box-shadow: 0 16px 38px rgba(255,77,136,.32); }
        .btn-primary:hover { filter: brightness(1.04); box-shadow: 0 18px 42px rgba(255,77,136,.38); }
        .btn-ghost { background: linear-gradient(180deg, rgba(255,255,255,.85), rgba(255,255,255,.75)); color: var(--ink-strong); border: 1px solid var(--line); }
        .btn-ghost:hover { filter: brightness(1.05) }
        .btn-light {
          background: rgba(255,255,255,.9);
          color: var(--ink-strong);
          border: 1px solid var(--line);
        }

        .helper { margin-top: 12px; font-size: 14px; color: var(--ink-soft); }
        .link { color: #ffb300; text-decoration: none; font-weight: 800; }
        .link:hover { text-decoration: underline; }
        .sep { height: 1px; background: var(--line); margin: 16px 0; border-radius: 999px; }

        /* Modal */
        .backdrop {
          position: fixed; inset: 0; background: rgba(124,92,255,.22);
          display: grid; place-items: center; z-index: 1000; backdrop-filter: blur(6px);
          padding: 12px;
        }
        .modal {
          width: min(520px, 92vw);
          background: #fff; border: 1px solid var(--line); border-radius: 16px;
          box-shadow: 0 24px 64px rgba(124,92,255,.28);
          padding: 18px;
        }
        .modal-title { font-weight: 900; color: var(--ink-strong); font-size: 18px; margin: 0 0 10px; }
        .muted { color: var(--ink-soft); }
        .row { display: grid; gap: 8px; margin-bottom: 10px; }
        .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }

        /* Full-page loader (shown while login request is running) */
        .screen-loader{
          position: fixed; inset: 0;
          background:
            radial-gradient(50rem 30rem at 10% 90%, rgba(255,106,61,.20), transparent 60%),
            radial-gradient(46rem 26rem at 90% 10%, rgba(124,92,255,.20), transparent 60%),
            rgba(255,255,255,.75);
          backdrop-filter: blur(6px);
          display: grid; place-items: center; z-index: 2000;
          pointer-events: all;
        }
        .loader-card{
          width: min(360px, 92vw);
          background: linear-gradient(180deg, rgba(255,255,255,.92), rgba(255,255,255,.86));
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 24px 64px rgba(124,92,255,.26), inset 0 0 0 1px rgba(255,255,255,.4);
          text-align: center;
        }
        .spinner {
          width: 44px; height: 44px; border-radius: 999px;
          border: 4px solid rgba(124,92,255,.25);
          border-top-color: #7c5cff;
          animation: spin .8s linear infinite;
          margin: 0 auto 10px;
        }
        .loader-title{ font-weight: 900; color: var(--ink-strong); }
        .loader-sub{ color: var(--ink-soft); font-size: 13px; margin-top: 4px; }

        @keyframes spin { to { transform: rotate(360deg) } }
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

        <div className="sep" />

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
        <div className="helper" style={{ marginTop: 6 }}>
          <button
            type="button"
            className="link"
            onClick={openForgot}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            Forgot password?
          </button>
        </div>
      </motion.form>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {fpOpen && (
          <motion.div
            className="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeForgot}
          >
            <motion.div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
            >
              <div className="modal-title">
                {fpStep === "email" && "Reset your password"}
                {fpStep === "otp" && "Enter the OTP"}
                {fpStep === "reset" && "Set a new password"}
              </div>

              {/* Step: Email */}
              {fpStep === "email" && (
                <>
                  <p className="muted" style={{ marginTop: 2 }}>
                    Enter your account email. We’ll send a one-time passcode (OTP).
                  </p>
                  <form onSubmit={fpSendOtp} className="row" style={{ marginTop: 10 }}>
                    <label className="field-label">Email</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="you@example.com"
                      value={fpEmail}
                      onChange={(e) => setFpEmail(e.target.value)}
                      autoFocus
                    />
                    <div className="actions">
                      <button className="btn btn-primary" disabled={fpBusy}>
                        {fpBusy ? "Sending…" : "Send OTP"}
                      </button>
                      <button type="button" className="btn btn-light" onClick={closeForgot} disabled={fpBusy}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* Step: OTP */}
              {fpStep === "otp" && (
                <>
                  <p className="muted" style={{ marginTop: 2 }}>
                    We sent an OTP to <strong>{fpEmail}</strong>. Enter it below.
                  </p>
                  <form onSubmit={fpVerifyOtp} className="row" style={{ marginTop: 10 }}>
                    <label className="field-label">OTP</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="6-digit code"
                      value={fpOtp}
                      onChange={(e) => setFpOtp(e.target.value)}
                      autoFocus
                    />
                    <div className="actions">
                      <button className="btn btn-primary" disabled={fpBusy}>
                        {fpBusy ? "Verifying…" : "Verify"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-light"
                        disabled={fpBusy}
                        onClick={fpSendOtp}
                        title="Resend OTP"
                      >
                        Resend
                      </button>
                      <button type="button" className="btn btn-light" onClick={closeForgot} disabled={fpBusy}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* Step: Reset password */}
              {fpStep === "reset" && (
                <>
                  <p className="muted" style={{ marginTop: 2 }}>
                    Create a new password for <strong>{fpEmail}</strong>.
                  </p>
                  <form onSubmit={fpResetPwd} className="row" style={{ marginTop: 10 }}>
                    <label className="field-label">New password</label>
                    <input
                      className="input"
                      type="password"
                      placeholder="New password"
                      value={fpNewPwd}
                      onChange={(e) => setFpNewPwd(e.target.value)}
                      autoFocus
                    />
                    <label className="field-label">Confirm password</label>
                    <input
                      className="input"
                      type="password"
                      placeholder="Confirm new password"
                      value={fpNewPwd2}
                      onChange={(e) => setFpNewPwd2(e.target.value)}
                    />
                    <div className="actions">
                      <button className="btn btn-primary" disabled={fpBusy}>
                        {fpBusy ? "Saving…" : "Change password"}
                      </button>
                      <button type="button" className="btn btn-light" onClick={closeForgot} disabled={fpBusy}>
                        Close
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ Full-page loading overlay while logging in */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="screen-loader"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            aria-live="assertive" aria-busy="true"
          >
            <motion.div
              className="loader-card"
              initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }}
              role="alertdialog" aria-label="Signing in"
            >
              <div className="spinner" />
              <div className="loader-title">Signing you in…</div>
              <div className="loader-sub">Please wait a moment</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
