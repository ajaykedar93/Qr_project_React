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
  const [recipientEmail, setRecipientEmail] = useState(null); // if targeted
  const [loadingShare, setLoadingShare] = useState(true);
  const [expiredOrRevoked, setExpiredOrRevoked] = useState(false);

  // Email + existence check (race-safe)
  const [email, setEmail] = useState("");
  const [exists, setExists] = useState(null); // true/false/null
  const [checking, setChecking] = useState(false);
  const checkSeqRef = useRef(0); // ensures only latest response wins

  // OTP state
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Build viewer URL (add flag for public read-only)
  const viewerUrl = useMemo(() => {
    if (!docId) return "";
    const base = `/view/${docId}?share_id=${encodeURIComponent(shareId)}`;
    return access === "public" ? `${base}&viewOnly=1` : base;
  }, [docId, shareId, access]);

  // 1) Load share minimal info (type, doc, intended email)
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
          // Public → redirect to viewer (read-only)
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

  // 2) Debounced, race-safe email existence check
  useEffect(() => {
    const raw = (email || "").trim();
    if (!raw) { setExists(null); setChecking(false); return; }

    const value = raw.toLowerCase();
    setChecking(true);
    const seq = ++checkSeqRef.current;

    const t = setTimeout(async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/auth/exists`, { params: { email: value } });
        // Only update if this response is the latest one
        if (checkSeqRef.current === seq) {
          setExists(!!data?.exists);
        }
      } catch {
        // Treat network/temporary errors as "unknown", not "false"
        if (checkSeqRef.current === seq) setExists(null);
      } finally {
        if (checkSeqRef.current === seq) setChecking(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [email]);

  // Email match helper (case-insensitive)
  const emailMatchesIntended =
    !recipientEmail ||
    (recipientEmail || "").toLowerCase() === (email || "").trim().toLowerCase();

  const canSendOtp =
    access === "private" &&
    !!email &&
    exists === true &&
    emailMatchesIntended;

  // 3) Send OTP (private only)
  async function sendOtp() {
    if (!canSendOtp) {
      if (exists === false) {
        toast.error("Access denied: this email is not registered");
      } else if (!emailMatchesIntended) {
        toast.error("Access denied: use the intended recipient email");
      } else if (!email) {
        toast.error("Enter your email");
      }
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
      const msg = e?.response?.data?.error || "Failed to send OTP";
      if (/Not the intended recipient/i.test(msg)) {
        toast.error("Access denied: wrong email for this private share");
      } else if (/User must register first/i.test(msg)) {
        toast.error("Access denied: email not registered");
      } else {
        toast.error(msg);
      }
    } finally {
      setSendingOtp(false);
    }
  }

  // 4) Verify OTP → open viewer (full access for private)
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

  // Early return when public (we redirect) or unresolved
  if (access === "public") return <div style={{ padding: 24 }}>Opening…</div>;

  return (
    <div style={{ maxWidth: 620, margin: "56px auto", padding: "0 16px" }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "linear-gradient(180deg, #0e132a, #0b1024)",
          border: "1px solid #2a3170",
          borderRadius: 16,
          padding: 22,
          boxShadow: "0 10px 30px rgba(0,0,0,.28)",
          color: "#e9ecff",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
          <h2 style={{ margin: 0, color: "#f6f7ff" }}>Access Shared Document</h2>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 12,
              padding: "2px 10px",
              borderRadius: 999,
              background:
                access === "private" ? "#6c8bff33" :
                access === "public"  ? "#52e1c133" :
                "#2a3170",
              color:
                access === "private" ? "#9fb1ff" :
                access === "public"  ? "#7ff0d8" :
                "#aeb8ff",
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
                background: "#0b1438",
                border: "1px solid #263070",
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
                style={{
                  width: "100%",
                  padding: 11,
                  borderRadius: 10,
                  border: "1px solid #2a3170",
                  background: "#0c1230",
                  color: "#e9ecff",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !otpSent) sendOtp();
                }}
              />

              {!!email && (
                <div style={{ fontSize: 12 }}>
                  {checking && <span style={{ opacity: .85 }}>Checking…</span>}

                  {!checking && exists === true && emailMatchesIntended && (
                    <span style={{ color: "#7ff0d8" }}>
                      Email is registered ✅ {recipientEmail ? "— matches intended recipient" : ""}
                    </span>
                  )}

                  {!checking && exists === true && !emailMatchesIntended && (
                    <span style={{ color: "#ffcf99" }}>
                      This share is intended for <b>{recipientEmail}</b>. Use that email to continue.
                    </span>
                  )}

                  {!checking && exists === false && (
                    <span style={{ color: "#ff9b9b" }}>
                      Access denied: email isn’t registered on this system.
                    </span>
                  )}

                  {!checking && exists === null && !!email && (
                    <span style={{ color: "#ffd38a" }}>
                      Couldn’t verify email right now. You can still try sending an OTP.
                    </span>
                  )}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={sendOtp}
                disabled={!canSendOtp || sendingOtp}
                title={
                  !email
                    ? "Enter your email"
                    : exists === false
                      ? "Email is not registered"
                      : !emailMatchesIntended
                        ? "Use the intended recipient email"
                        : ""
                }
              >
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
                    style={{
                      width: "100%",
                      padding: 11,
                      borderRadius: 10,
                      border: "1px solid #2a3170",
                      background: "#0c1230",
                      color: "#e9ecff",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && otp) verifyOtp();
                    }}
                  />
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                className="btn btn-primary"
                onClick={verifyOtp}
                disabled={!otpSent || !otp || verifying}
              >
                {verifying ? "Verifying…" : "Verify & Open"}
              </button>
              <Link className="btn" to="/dashboard">Back</Link>
            </div>

            <div style={{ marginTop: 12, fontSize: 12.5, opacity: .8 }}>
              <b>Note:</b> This document is encrypted and will be decrypted only after successful verification.
              After opening, you’ll be able to <b>view and download</b>.
            </div>
          </>
        )}

        {/* Unavailable / error */}
        {access == null && !loadingShare && expiredOrRevoked && (
          <div style={{ marginTop: 8, fontSize: 13, opacity: .85, color: "#ff9b9b" }}>
            This share is not available. It may have been revoked or has expired.
          </div>
        )}
      </motion.div>
    </div>
  );
}
