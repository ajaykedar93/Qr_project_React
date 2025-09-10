// src/Pages/ShareAccess.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

const API_BASE = "https://qr-project-express.onrender.com"; // backend
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
    <div style={{ maxWidth: 720, margin: "56px auto", padding: "0 16px" }}>
      {/* Bright theme (no dark shades) */}
      <style>{`
        body {
          background:
            radial-gradient(40rem 24rem at 12% 88%, rgba(32,165,90,.14) 0%, rgba(32,165,90,0) 60%),
            radial-gradient(36rem 22rem at 88% 10%, rgba(25,211,162,.14) 0%, rgba(25,211,162,0) 60%),
            linear-gradient(180deg, #EEFFF6 0%, #E6FFF2 45%, #F4FFF9 100%);
          font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji","Segoe UI Emoji";
        }

        .card {
          background:
            radial-gradient(120% 140% at -10% -20%, rgba(32,165,90,.10), transparent 60%),
            radial-gradient(120% 140% at 120% 120%, rgba(25,211,162,.10), transparent 60%),
            #ffffff;
          border: 1px solid #e6f5ee;
          border-radius: 18px;
          padding: clamp(18px, 3vw, 24px);
          box-shadow: 0 22px 56px rgba(31,187,112,.20);
        }

        .title {
          margin: 0 0 8px;
          font-weight: 900;
          font-size: clamp(20px, 3.4vw, 26px);
          background: linear-gradient(90deg,#16884a,#19d3a2,#22d3ee);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }

        .status-chip {
          margin-left: auto;
          font-size: 12px;
          padding: 4px 12px;
          border-radius: 999px;
          border: 1px solid #d8f1e7;
          background: #f2fffb;
          color: #0d6b4f;
          font-weight: 800;
        }

        .status-private { background:#eaf1ff; border-color:#dbe6ff; color:#2b54c1; }
        .status-public  { background:#eafff5; border-color:#c8f6e7; color:#108a63; }
        .status-unknown { background:#fff8e6; border-color:#ffe5a3; color:#a05a00; }

        .desc {
          background: #f4fff9;
          border: 1px solid #d6f5e6;
          padding: 12px;
          border-radius: 12px;
          font-size: 13.5px;
          margin-bottom: 12px;
          color: #144a39;
        }

        .row { display:grid; gap:10px; }
        .input {
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid #d9f1e4;
          background: #fbfffd;
          color: #133426;
          width: 100%;
          transition: box-shadow .15s ease, border-color .15s ease, transform .12s ease;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.9);
        }
        .input::placeholder { color: rgba(22,136,74,.55); }
        .input:focus {
          border-color: #2fbf71;
          box-shadow: 0 0 0 6px rgba(31,187,112,.22);
          transform: translateY(-1px);
          outline: none;
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
          background-image: linear-gradient(90deg, #20a55a, #19d3a2, #22d3ee);
          box-shadow: 0 16px 38px rgba(25,211,162,.26);
        }
        .btn-primary:hover { filter: brightness(1.04); box-shadow: 0 18px 42px rgba(25,211,162,.32); }
        .btn-ghost {
          background: linear-gradient(180deg, rgba(255,255,255,.92), rgba(255,255,255,.82));
          color: #16884a;
          border: 1px solid #d9f1e4;
        }
        .btn-ghost:hover { filter: brightness(1.05); }

        .tiny {
          font-size: 12px;
          opacity: .8;
        }

        .chip {
          display:inline-block; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:800;
          border:1px solid #dbe6ff; background:#eaf1ff; color:#2b54c1;
        }

        .muted { color:#5d7c6f; }
        code { background:#f3fff9; padding:2px 6px; border-radius:6px; border:1px solid #daf3ea; }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card"
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
          <h2 className="title">Access Shared Document</h2>
          <span
            className={
              "status-chip " +
              (loadingShare
                ? "status-unknown"
                : access === "private"
                ? "status-private"
                : access === "public"
                ? "status-public"
                : "status-unknown")
            }
          >
            {loadingShare
              ? "Resolving…"
              : access
              ? access.toUpperCase()
              : expiredOrRevoked
              ? "UNAVAILABLE"
              : "—"}
          </span>
        </div>

        <div className="tiny">
          Share ID: <code>{shareId}</code>{" "}
          {tokenParam && <span className="chip" style={{ marginLeft: 8 }}>token</span>}
        </div>

        {/* PRIVATE FLOW */}
        {access === "private" && (
          <>
            <div className="desc" style={{ marginTop: 12 }}>
              <b>Verify identity:</b> enter your <b>registered email</b> to open this document.
              {recipientEmail && <> This share is intended for <b>{recipientEmail}</b>.</>}
            </div>

            <div className="row">
              <input
                className="input"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                onKeyDown={(e) => { if (e.key === "Enter" && !otpSent) sendOtp(); }}
              />

              {!!email && (
                <div className="tiny" style={{ marginTop: -4 }}>
                  {checking && <span style={{ opacity: .85 }}>Checking…</span>}
                  {!checking && !!emailMsg && (
                    <span style={{ color:
                      exists === true ? "#108a63" :
                      exists === false ? "#cc4d00" : "#4a6a5c" }}>
                      {emailMsg}
                    </span>
                  )}
                  {!checking && exists === true && !emailMatchesIntended && (
                    <div style={{ color: "#a05a00", marginTop: 4 }}>
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
                  <div className="tiny" style={{ alignSelf: "center" }}>
                    OTP expires at: {expiresAt}
                  </div>
                )}
              </div>

              {otpSent && (
                <input
                  className="input"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  inputMode="numeric"
                  onKeyDown={(e) => { if (e.key === "Enter" && otp) verifyOtp(); }}
                />
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={verifyOtp} disabled={!otpSent || !otp || verifying}>
                {verifying ? "Verifying…" : "Verify & Open"}
              </button>
              <Link className="btn btn-ghost" to="/dashboard">Back</Link>
            </div>

            <div className="tiny" style={{ marginTop: 12 }}>
              <b>Note:</b> The document opens after successful verification.
            </div>
          </>
        )}

        {/* Unavailable */}
        {access == null && !loadingShare && expiredOrRevoked && (
          <div className="tiny" style={{ marginTop: 10, color: "#cc4d00" }}>
            This share is not available. It may have been revoked or expired.
          </div>
        )}
      </motion.div>
    </div>
  );
}
