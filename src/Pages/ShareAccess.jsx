// src/Pages/ShareAccess.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

const API_BASE = "https://qr-project-v0h4.onrender.com"; // ← your backend

export default function ShareAccess() {
  const { shareId } = useParams();
  const nav = useNavigate();

  // share info
  const [docId, setDocId] = useState(null);
  const [access, setAccess] = useState(null); // "public" | "private" | null
  const [recipientEmail, setRecipientEmail] = useState(null);
  const [loadingShare, setLoadingShare] = useState(true);

  // email / existence check
  const [email, setEmail] = useState("");
  const [exists, setExists] = useState(null); // true/false/null
  const [checking, setChecking] = useState(false);

  // otp flow
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Build viewer URL once we know the docId
  const viewerUrl = useMemo(() => {
    if (!docId) return "";
    return `/view/${docId}?share_id=${shareId}`;
  }, [docId, shareId]);

  // 1) Load minimal share info to know access type
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
          // public → open immediately (browser will preview inline as supported)
          nav(`/view/${data.document_id}?share_id=${shareId}`, { replace: true });
        }
      } catch (e) {
        const msg = e?.response?.data?.error || "Invalid or expired share";
        toast.error(msg);
      } finally {
        if (!ignore) setLoadingShare(false);
      }
    })();
    return () => { ignore = true; };
  }, [shareId, nav]);

  // 2) Debounced email existence check
  useEffect(() => {
    const value = (email || "").trim();
    if (!value) { setExists(null); return; }

    const t = setTimeout(async () => {
      try {
        setChecking(true);
        const { data } = await axios.get(`${API_BASE}/auth/exists`, { params: { email: value } });
        setExists(!!data?.exists);
      } catch {
        setExists(null);
      } finally {
        setChecking(false);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [email]);

  // Can send OTP?
  const canSendOtp = access === "private"
    && !!email
    && exists === true
    && (!recipientEmail || recipientEmail.toLowerCase() === email.toLowerCase());

  // 3) Send OTP
  async function sendOtp() {
    if (!canSendOtp) return;
    try {
      setSendingOtp(true);
      const { data } = await axios.post(
        `${API_BASE}/shares/${shareId}/otp/send`,
        { email }
      );
      setOtpSent(true);
      setExpiresAt(data?.expires_at || "");
      toast.success("OTP sent to your email");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  }

  // 4) Verify OTP → open viewer
  async function verifyOtp() {
    try {
      setVerifying(true);
      await axios.post(`${API_BASE}/shares/${shareId}/otp/verify`, { email, otp });
      sessionStorage.setItem("verifiedEmail", email); // used by viewer for private headers
      toast.success("Verified! Opening document…");
      nav(viewerUrl);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Invalid or expired OTP");
    } finally {
      setVerifying(false);
    }
  }

  // Early placeholder when public (we immediately redirect)
  if (access === "public") return <div style={{ padding: 24 }}>Opening…</div>;

  return (
    <div style={{ maxWidth: 560, margin: "60px auto", padding: "0 16px" }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "#0f1533",
          border: "1px solid #2a3170",
          borderRadius: 16,
          padding: 22,
          boxShadow: "0 10px 30px rgba(0,0,0,.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Access Shared Document</h2>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 12,
              padding: "2px 8px",
              borderRadius: 999,
              background: access === "private" ? "#6c8bff33" : "#52e1c133",
              color: access === "private" ? "#9fb1ff" : "#7ff0d8",
            }}
          >
            {loadingShare ? "Resolving…" : (access || "—").toUpperCase()}
          </span>
        </div>

        <div style={{ fontSize: 13, opacity: .8, marginBottom: 12 }}>
          Share ID: <code>{shareId}</code>
        </div>

        {/* Private flow */}
        {access === "private" && (
          <>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Verify your identity</div>
            <div style={{ display: "grid", gap: 10 }}>
              <input
                className="input"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />

              {!!email && (
                <div style={{ fontSize: 12 }}>
                  {checking && <span style={{ opacity: .8 }}>Checking…</span>}
                  {!checking && exists === true && (
                    <span style={{ color: "#7ff0d8" }}>Email is registered ✅</span>
                  )}
                  {!checking && exists === false && (
                    <span style={{ color: "#ff9b9b" }}>Email not found ❌</span>
                  )}
                  {!checking && exists === true && recipientEmail && (
                    <div style={{ marginTop: 4, opacity: .85 }}>
                      This share is intended for: <b>{recipientEmail}</b>
                    </div>
                  )}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={sendOtp}
                disabled={!canSendOtp || sendingOtp}
                title={!canSendOtp ? "Enter the intended, registered email to request OTP" : ""}
              >
                {sendingOtp ? "Sending…" : "Send OTP"}
              </button>

              {otpSent && expiresAt && (
                <div style={{ fontSize: 12, opacity: .75 }}>
                  OTP expires at: {expiresAt}
                </div>
              )}

              {otpSent && (
                <input
                  className="input"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  inputMode="numeric"
                />
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
          </>
        )}

        {/* If share couldn't be resolved to public/private, show a gentle message */}
        {access == null && !loadingShare && (
          <div style={{ marginTop: 8, fontSize: 13, opacity: .8 }}>
            We couldn’t resolve this share. It may be expired or revoked.
          </div>
        )}
      </motion.div>
    </div>
  );
}
