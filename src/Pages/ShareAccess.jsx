// src/Pages/ShareAccess.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

const API_BASE = "https://qr-project-v0h4.onrender.com"; // backend
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export default function ShareAccess() {
  const { shareId } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();

  // Support token-based links: /share/:shareId?token=...
  const tokenParam = sp.get("token") || "";

  // Share state
  const [docId, setDocId] = useState(null);
  const [access, setAccess] = useState(null); // "public" | "private" | null
  const [recipientEmail, setRecipientEmail] = useState(null);
  const [loadingShare, setLoadingShare] = useState(true);
  const [expiredOrRevoked, setExpiredOrRevoked] = useState(false);

  // Email check
  const [email, setEmail] = useState("");
  const [exists, setExists] = useState(null); // true/false/null(unknown)
  const [checking, setChecking] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const checkSeqRef = useRef(0);

  // OTP state
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [expiresAt, setExpiresAt] = useState(""); // ISO string from server (optional)
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0); // seconds cooldown for resend

  // Build viewer URL (forward token if present)
  const viewerUrl = useMemo(() => {
    if (!docId) return "";
    const u = new URL(window.location.origin + `/view/${docId}`);
    u.searchParams.set("share_id", shareId);
    if (tokenParam) u.searchParams.set("token", tokenParam);
    if (access === "public") u.searchParams.set("viewOnly", "1");
    return u.pathname + u.search;
  }, [docId, shareId, access, tokenParam]);

  // Load share info
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoadingShare(true);
        const { data } = await axios.get(`${API_BASE}/shares/${shareId}/minimal`, {
          params: tokenParam ? { token: tokenParam } : {},
        });
        if (ignore) return;

        setDocId(data.document_id);
        setAccess(data.access);
        setRecipientEmail(data.to_user_email || null);

        if (data.access === "public") {
          // Public: jump straight to viewer (pass token if present)
          const u = new URL(window.location.origin + `/view/${data.document_id}`);
          u.searchParams.set("share_id", shareId);
          if (tokenParam) u.searchParams.set("token", tokenParam);
          u.searchParams.set("viewOnly", "1");
          nav(u.pathname + u.search, { replace: true });
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
  }, [shareId, tokenParam, nav]);

  // Debounced email existence check
  useEffect(() => {
    const raw = (email || "").trim();
    if (!raw) { setExists(null); setChecking(false); setEmailMsg(""); return; }

    if (!emailRe.test(raw)) {
      setExists(null);
      setChecking(false);
      setEmailMsg("Enter a valid email address.");
      return;
    }

    setChecking(true);
    setEmailMsg("");
    const seq = ++checkSeqRef.current;

    const t = setTimeout(async () => {
      try {
        // Prefer a single canonical endpoint if you have it
        const { data } = await axios.get(`${API_BASE}/auth/exists`, { params: { email: raw.toLowerCase() } });
        if (checkSeqRef.current !== seq) return;
        setExists(!!data?.exists);
        if (data?.exists) setEmailMsg("Email is registered ✅");
        else setEmailMsg("Email not registered.");
      } catch {
        if (checkSeqRef.current !== seq) return;
        setExists(null);
        setEmailMsg("Could not verify email right now.");
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
    emailRe.test(email) &&
    exists === true &&
    emailMatchesIntended &&
    resendIn === 0 &&
    !sendingOtp;

  // Resend cooldown tick
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  // Send OTP
  async function sendOtp() {
    if (!canSendOtp) {
      toast.error(emailMatchesIntended ? "Enter your registered email" : `This link is intended for ${recipientEmail}`);
      return;
    }
    try {
      setSendingOtp(true);
      const { data } = await axios.post(`${API_BASE}/shares/${shareId}/otp/send`, {
        email: (email || "").trim().toLowerCase(),
        ...(tokenParam ? { token: tokenParam } : {}),
      });
      setOtpSent(true);
      setExpiresAt(data?.expires_at || "");
      setResendIn(45); // small cooldown
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
        ...(tokenParam ? { token: tokenParam } : {}),
      });
      sessionStorage.setItem("verifiedEmail", (email || "").trim().toLowerCase());
      toast.success("Verified! Opening document…");
      nav(viewerUrl, { replace: true });
    } catch (e) {
      toast.error(e?.response?.data?.error || "Invalid or expired OTP");
    } finally {
      setVerifying(false);
    }
  }

  if (access === "public") {
    return <div style={{ padding: 24 }}>Opening…</div>;
  }

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
        .btn-primary { background: linear-gradient(90deg,#5b8cff,#19d3a2); color: #fff; }
        .btn-primary:hover { filter: brightness(1.05); }
        .btn-ghost { background: #eef2ff; color: #2b3c6b; }
        .btn-danger { background: #ff6b6b; color: #fff; }
        .btn-danger:hover { filter: brightness(1.05); }
        .input {
          padding: 10px;
          border-radius: 10px;
          border: 1px solid #d8e2ff;
          background: #f8fbff;
          color: #142251;
          width: 100%;
        }
        .chip {
          display:inline-block; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:800;
          border:1px solid #dbe6ff; background:#eaf1ff; color:#2b54c1;
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
          Share ID: <code>{shareId}</code> {tokenParam && <span className="chip" style={{ marginLeft: 8 }}>token</span>}
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
                  {!checking && !!emailMsg && (
                    <span style={{ color:
                      exists === true ? "#009966" :
                      exists === false ? "#cc0000" : "#555" }}>
                      {emailMsg}
                    </span>
                  )}
                  {!checking && exists === true && !emailMatchesIntended && (
                    <div style={{ color: "#cc6600" }}>
                      This link is intended for <b>{recipientEmail}</b>.
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-primary" onClick={sendOtp} disabled={!canSendOtp}>
                  {sendingOtp ? "Sending…" : (resendIn ? `Resend in ${resendIn}s` : (otpSent ? "Resend OTP" : "Send OTP"))}
                </button>
                {otpSent && expiresAt && (
                  <div style={{ fontSize: 12, opacity: .75, alignSelf: "center" }}>
                    OTP expires at: {expiresAt}
                  </div>
                )}
              </div>

              {otpSent && (
                <>
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
              <Link className="btn btn-ghost" to="/dashboard">Back</Link>
            </div>

            <div style={{ marginTop: 12, fontSize: 12.5, opacity: .8 }}>
              <b>Note:</b> Document will be available only after successful verification.
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
