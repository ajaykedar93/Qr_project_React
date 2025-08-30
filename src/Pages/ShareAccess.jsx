// src/Pages/ShareAccess.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080"; // backend

export default function ShareAccess() {
  const { shareId } = useParams();
  const nav = useNavigate();

  const [docId, setDocId] = useState(null);
  const [access, setAccess] = useState(null);          // "public" | "private"
  const [recipientEmail, setRecipientEmail] = useState(null);

  const [email, setEmail] = useState("");
  const [exists, setExists] = useState(null);          // true/false/null
  const [checking, setChecking] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  // 1) Load minimal share data (NO AUTH)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/shares/${shareId}/minimal`);
        setDocId(data.document_id);
        setAccess(data.access);
        setRecipientEmail(data.to_user_email || null);

        if (data.access === "public") {
          // Public → open immediately (view-only handled by backend)
          nav(`/view/${data.document_id}?share_id=${shareId}`, { replace: true });
        }
      } catch (e) {
        toast.error(e?.response?.data?.error || "Invalid or expired share");
      }
    })();
  }, [shareId, nav]);

  // 2) Live email check (registered user)
  useEffect(() => {
    const value = (email || "").trim();
    if (!value) { setExists(null); return; }
    const t = setTimeout(async () => {
      try {
        setChecking(true);
        const { data } = await axios.get(`${API_BASE}/auth/exists`, { params: { email: value }});
        setExists(!!data?.exists);
      } catch {
        setExists(null);
      } finally {
        setChecking(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [email]);

  const canSendOtp = () => {
    if (access !== "private") return false;
    if (!email || !exists) return false;
    // If the share has a specific recipient email, enforce it matches
    if (recipientEmail && recipientEmail.toLowerCase() !== email.toLowerCase()) return false;
    return true;
  };

  async function sendOtp() {
    try {
      if (!canSendOtp()) return;
      const { data } = await axios.post(`${API_BASE}/otp/send`, {
        share_id: shareId,
        email,
      });
      setOtpSent(true);
      setExpiresAt(data?.expires_at || "");
      toast.success("OTP sent to your email");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to send OTP");
    }
  }

  async function verifyOtp() {
    try {
      await axios.post(`${API_BASE}/otp/verify`, {
        share_id: shareId,
        email,
        otp, // <-- backend expects 'otp'
      });
      // store verified email for document endpoints (used as x-user-email header by your viewer)
      sessionStorage.setItem("verifiedEmail", email);
      toast.success("Verified! Opening document…");
      nav(`/view/${docId}?share_id=${shareId}`);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Invalid or expired OTP");
    }
  }

  if (access === "public") {
    // brief placeholder while redirecting
    return <div style={{ padding: 24 }}>Opening…</div>;
  }

  return (
    <div style={{ maxWidth: 520, margin: "60px auto", padding: 16 }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ background: "#0f1533", padding: 24, borderRadius: 14, border: "1px solid #2a3170" }}
      >
        <h2 style={{ marginTop: 0 }}>Access Shared Document</h2>
        <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 10 }}>
          Share ID: <code>{shareId}</code>
        </div>

        {/* PRIVATE FLOW */}
        <div style={{ marginBottom: 10, fontWeight: 600, fontSize: 15 }}>Verify your identity</div>

        <div style={{ display: "grid", gap: 10 }}>
          <input
            className="input"
            placeholder="Enter your registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {!!email && (
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {checking ? "Checking…" :
                exists === true ? "Email is registered ✅" :
                exists === false ? "Email not found ❌" : ""}
              {recipientEmail && email && exists && (
                <div style={{ marginTop: 4, opacity: 0.85 }}>
                  This share is intended for: <b>{recipientEmail}</b>
                </div>
              )}
            </div>
          )}

          <button className="btn btn-primary" onClick={sendOtp} disabled={!canSendOtp()}>
            Send OTP
          </button>

          {otpSent && expiresAt && (
            <div style={{ fontSize: 12, opacity: 0.7 }}>OTP expires at: {expiresAt}</div>
          )}
          {otpSent && (
            <input
              className="input"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button className="btn btn-primary" onClick={verifyOtp} disabled={!otpSent || !otp}>
            Verify & Open
          </button>
          <Link className="btn" to="/dashboard">Back</Link>
        </div>
      </motion.div>
    </div>
  );
}
