// src/Pages/ShareAccess.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

const API_BASE = "https://qr-project-v0h4.onrender.com"; // backend base

export default function ShareAccess() {
  const { shareId } = useParams();
  const nav = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [meta, setMeta] = useState(null);
  const [docId, setDocId] = useState(null);

  // get documentId for redirect after verify
  useEffect(() => {
    if (!token) {
      nav("/login", { state: { from: { pathname: `/share/${shareId}` } } });
      return;
    }
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/shares/${shareId}/minimal`);
        setDocId(data.document_id);
      } catch (e) {
        toast.error(e?.response?.data?.error || "Invalid share");
      }
    })();
  }, [token, shareId, nav]);

  async function sendOtp() {
    try {
      const { data } = await axios.post(`${API_BASE}/otp/send`, {
        user_id: user.user_id,
        share_id: shareId,
      });
      setOtpSent(true);
      setMeta(data?.data);
      toast.success("OTP sent to your email");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to send OTP");
    }
  }

  async function verifyOtp() {
    try {
      await axios.post(`${API_BASE}/otp/verify`, {
        user_id: user.user_id,
        share_id: shareId,
        otp_code: otp,
      });
      toast.success("Verified! Opening document…");
      nav(`/view/${docId}?share_id=${shareId}`);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Invalid/expired OTP");
    }
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

        <div style={{ display: "grid", gap: 10 }}>
          <button className="btn btn-primary" onClick={sendOtp}>Send OTP</button>
          {otpSent && <div style={{ fontSize: 12, opacity: 0.7 }}>OTP expires at: {meta?.expiry_time}</div>}
          <input
            className="input"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button className="btn btn-primary" onClick={verifyOtp}>Verify & Open</button>
          <Link className="btn" to="/dashboard">Back</Link>
        </div>
      </motion.div>
    </div>
  );
}
