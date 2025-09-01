// src/Pages/ShareAccess.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

const API_BASE = "https://qr-project-v0h4.onrender.com"; // backend

export default function ShareAccess() {
  const { shareId } = useParams();
  const nav = useNavigate();

  // Share state
  const [docId, setDocId] = useState(null);
  const [access, setAccess] = useState(null); // "public" | "private" | null
  const [recipientEmail, setRecipientEmail] = useState(null);
  const [loadingShare, setLoadingShare] = useState(true);
  const [expiredOrRevoked, setExpiredOrRevoked] = useState(false);

  // Email check
  const [email, setEmail] = useState("");
  const [exists, setExists] = useState(null);
  const [checking, setChecking] = useState(false);
  const checkSeqRef = useRef(0);

  // OTP
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Build viewer URL
  const viewerUrl = useMemo(() => {
    if (!docId) return "";
    const base = `/view/${docId}?share_id=${encodeURIComponent(shareId)}`;
    return access === "public" ? `${base}&viewOnly=1` : base;
  }, [docId, shareId, access]);

  // Load share info
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoadingShare(true);
        const { data } = await axios.get(`${API_BASE}/shares/${shareId}/minimal`);
        if (ignore) return;
        setDocId(data.document_id);
        setAccess(data.access);
        setRecipientEmail(data.to_user_email || null);

        if (data.access === "public") {
          nav(`/view/${data.document_id}?share_id=${shareId}&viewOnly=1`, { replace: true });
        }
      } catch (e) {
        const msg = e?.response?.data?.error || "Invalid or expired share";
        setExpiredOrRevoked(true);
        toast.error(msg);
      } finally {
        if (!ignore) setLoadingShare(false);
      }
    })();
    return () => { ignore = true; };
  }, [shareId, nav]);

  // Email existence check (debounced)
  useEffect(() => {
    const raw = (email || "").trim();
    if (!raw) { setExists(null); setChecking(false); return; }
    const value = raw.toLowerCase();
    setChecking(true);
    const seq = ++checkSeqRef.current;

    const t = setTimeout(async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/auth/exists`, { params: { email: value } });
        if (checkSeqRef.current === seq) setExists(!!data?.exists);
      } catch {
        if (checkSeqRef.current === seq) setExists(null);
      } finally {
        if (checkSeqRef.current === seq) setChecking(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [email]);

  const emailMatchesIntended =
    !recipientEmail ||
    (recipientEmail || "").toLowerCase() === (email || "").trim().toLowerCase();

  const canSendOtp =
    access === "private" &&
    !!email &&
    exists === true &&
    emailMatchesIntended;

  // Send OTP
  async function sendOtp() {
    if (!canSendOtp) {
      toast.error("Enter correct registered email for this share");
      return;
    }
    try {
      setSendingOtp(true);
      const { data } = await axios.post(`${API_BASE}/shares/${shareId}/otp/send`, {
        email: (email || "").trim().toLowerCase(),
      });
      setOtpSent(true);
      setExpiresAt(data?.expires_at || "");
      toast.success("OTP sent to your email");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  }

  // Verify OTP
  async function verifyOtp() {
    if (!otp) return;
    try {
      setVerifying(true);
      await axios.post(`${API_BASE}/shares/${shareId}/otp/verify`, {
        email: (email || "").trim().toLowerCase(),
        otp,
      });
      sessionStorage.setItem("verifiedEmail", (email || "").trim().toLowerCase());
      toast.success("Verified! Opening document…");
      nav(viewerUrl);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Invalid or expired OTP");
    } finally {
      setVerifying(false);
    }
  }

  if (access === "public") return <div style={{ padding: 24 }}>Opening…</div>;

  return (
    <div style={{ maxWidth: 640, margin: "56px auto", padding: "0 16px" }}>
      {/* Bright background wrapper */}
      <style>{`
        body {
          background: linear-gradient(180deg, #EFFFF7 0%, #E3FFEF 50%, #DBFFF0 100%);
          font-family: 'Inter', sans-serif;
        }
        .btn {
          padding: 8px 14px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-weight: 600;
        }
        .btn-primary { background: #19d3a2; color: #fff; }
        .btn-primary:hover { background: #12c39a; }
        .btn-danger { background: #ff6b6b; color: #fff; }
        .btn-danger:hover { background: #e55; }
        .input {
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #2a3170;
          background: #fff;
          color: #111;
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "#fff",
          border: "1px solid #d6f5e6",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 10px 30px rgba(0,0,0,.1)",
          color: "#111",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
          <h2 style={{ margin: 0, color: "#0a8f6a" }}>Access Shared Document</h2>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 12,
              padding: "2px 10px",
              borderRadius: 999,
              background:
                access === "private" ? "#cce6ff" :
                access === "public"  ? "#ccffe6" :
                "#eee",
              color:
                access === "private" ? "#0066cc" :
                access === "public"  ? "#009966" :
                "#666",
            }}
          >
            {loadingShare ? "Resolving…" : (access ? access.toUpperCase() : (expiredOrRevoked ? "UNAVAILABLE" : "—"))}
          </span>
        </div>

        <div style={{ fontSize: 13, opacity: .85, marginBottom: 10 }}>
          Share ID: <code>{shareId}</code>
        </div>

        {/* PRIVATE FLOW */}
        {access === "private" && (
          <>
            <div
              style={{
                background: "#f4fff9",
                border: "1px solid #d6f5e6",
                padding: 12,
                borderRadius: 12,
                fontSize: 13.5,
                marginBottom: 12,
              }}
            >
              <b>Verify identity:</b> enter your <b>registered email</b> to open this document.
              {recipientEmail && <> This share is intended for <b>{recipientEmail}</b>.</>}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <input
                className="input"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                onKeyDown={(e) => { if (e.key === "Enter" && !otpSent) sendOtp(); }}
              />

              {!!email && (
                <div style={{ fontSize: 12 }}>
                  {checking && <span style={{ opacity: .85 }}>Checking…</span>}
                  {!checking && exists === true && emailMatchesIntended && (
                    <span style={{ color: "#009966" }}>Email is registered ✅</span>
                  )}
                  {!checking && exists === true && !emailMatchesIntended && (
                    <span style={{ color: "#cc6600" }}>
                      This share is intended for <b>{recipientEmail}</b>.
                    </span>
                  )}
                  {!checking && exists === false && (
                    <span style={{ color: "#cc0000" }}>
                      Access denied: email isn’t registered.
                    </span>
                  )}
                </div>
              )}

              <button className="btn btn-primary" onClick={sendOtp} disabled={!canSendOtp || sendingOtp}>
                {sendingOtp ? "Sending…" : "Send OTP"}
              </button>

              {otpSent && (
                <>
                  {expiresAt && (
                    <div style={{ fontSize: 12, opacity: .75 }}>
                      OTP expires at: {expiresAt}
                    </div>
                  )}
                  <input
                    className="input"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    inputMode="numeric"
                    onKeyDown={(e) => { if (e.key === "Enter" && otp) verifyOtp(); }}
                  />
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button className="btn btn-primary" onClick={verifyOtp} disabled={!otpSent || !otp || verifying}>
                {verifying ? "Verifying…" : "Verify & Open"}
              </button>
              <Link className="btn btn-danger" to="/dashboard">Back</Link>
            </div>

            <div style={{ marginTop: 12, fontSize: 12.5, opacity: .8 }}>
              <b>Note:</b> Document will be decrypted only after successful verification.
            </div>
          </>
        )}

        {/* Unavailable */}
        {access == null && !loadingShare && expiredOrRevoked && (
          <div style={{ marginTop: 8, fontSize: 13, opacity: .85, color: "#cc0000" }}>
            This share is not available. It may have been revoked or expired.
          </div>
        )}
      </motion.div>
    </div>
  );
}
