// src/Pages/Dashboard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import QRScanner from "./QRScanner.jsx";

const API_BASE = "https://qr-project-v0h4.onrender.com"; // your backend

// Create a QR image for payload { share_id }
function qrImgForShareId(share_id) {
  if (!share_id) return "";
  const payload = encodeURIComponent(JSON.stringify({ share_id }));
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${payload}`;
}

export default function Dashboard() {
  const nav = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Axios with auth header
  const api = useMemo(() => {
    const i = axios.create({ baseURL: API_BASE });
    i.interceptors.request.use((cfg) => {
      const t = localStorage.getItem("token");
      if (t) cfg.headers.Authorization = `Bearer ${t}`;
      return cfg;
    });
    return i;
  }, []);

  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState([]);
  const [myShares, setMyShares] = useState([]);
  const [received, setReceived] = useState([]);

  // Share modal state
  const [shareFor, setShareFor] = useState(null); // document_id
  const [shareForm, setShareForm] = useState({
    to_user_email: "",
    expiry_time: "", // ISO string from datetime-local
  });
  const [shareResult, setShareResult] = useState(null);

  // Email existence check (debounced)
  const [emailCheck, setEmailCheck] = useState({ loading: false, exists: null, error: "" });
  const emailTimerRef = useRef(null);

  // “View details” modal for an existing share
  const [viewShare, setViewShare] = useState(null);

  // ---- Drag & drop upload ----
  const onDrop = (accepted) => accepted?.[0] && uploadFile(accepted[0]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  // ---- Load initial data ----
  async function load() {
    try {
      setLoading(true);
      const [a, b, c] = await Promise.all([
        api.get("/documents"),
        api.get("/shares/mine"),
        api.get("/shares/received"),
      ]);
      setDocs(a.data || []);
      setMyShares(b.data || []);
      setReceived(c.data || []);
    } catch (e) {
      if (e?.response?.status === 401) nav("/login");
      else toast.error(e?.response?.data?.error || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  // ---- Upload ----
  async function uploadFile(file) {
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/documents/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Uploaded");
      setDocs((d) => [data, ...d]);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Upload failed");
    }
  }

  // ---- Delete document ----
  async function delDoc(id) {
    if (!confirm("Delete this document?")) return;
    try {
      await api.delete(`/documents/${id}`);
      setDocs((d) => d.filter((x) => x.document_id !== id));
      toast.success("Deleted");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Delete failed");
    }
  }

  // ---- Revoke share ----
  async function revokeShare(share_id) {
    if (!confirm("Revoke this share? Recipients will lose access.")) return;
    try {
      await api.post(`/shares/${share_id}/revoke`);
      setMyShares((arr) => arr.filter((s) => s.share_id !== share_id));
      toast.success("Share revoked");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to revoke");
    }
  }

  // ---- Create share ----
  async function createShare() {
    try {
      const payload = {
        document_id: shareFor,
        to_email: shareForm.to_user_email || null,
        expiry_time: shareForm.expiry_time || null,
      };

      // Friendly note if recipient not registered
      if (payload.to_email && emailCheck.exists === false) {
        const proceed = confirm(
          "Recipient is not registered. You can still share (will default to PUBLIC view-only), or ask them to register. Continue?"
        );
        if (!proceed) return;
      }

      const { data } = await api.post("/shares", payload);
      setShareResult(data);

      // Refresh My Shares
      const mine = await api.get("/shares/mine").then((r) => r.data || []);
      setMyShares(mine);

      if (payload.to_email) {
        try {
          await api.post("/otp/notify-share", { share_id: data.share_id });
          toast.success("Share created & email sent");
        } catch {
          toast.warn("Share created, but email could not be sent");
        }
      } else {
        toast.success("Share created");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || "Share failed");
    }
  }

  // ---- Debounced email check ----
  useEffect(() => {
    const email = (shareForm.to_user_email || "").trim();
    if (emailTimerRef.current) clearTimeout(emailTimerRef.current);

    if (!email) {
      setEmailCheck({ loading: false, exists: null, error: "" });
      return;
    }

    emailTimerRef.current = setTimeout(async () => {
      try {
        setEmailCheck((s) => ({ ...s, loading: true, error: "" }));
        const { data } = await api.get("/auth/exists", { params: { email } });
        setEmailCheck({ loading: false, exists: !!data?.exists, error: "" });
      } catch {
        setEmailCheck({ loading: false, exists: null, error: "Check failed" });
      }
    }, 450);

    return () => clearTimeout(emailTimerRef.current);
  }, [shareForm.to_user_email, api]);

  // ---- Initial guard + load ----
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      nav("/login");
      return;
    }
    load();
  }, []);

  // ---- QR decode → route to ShareAccess ----
  const onQrDecode = (text) => {
    try {
      const payload = JSON.parse(text);
      if (payload?.share_id) window.location.href = `/share/${payload.share_id}`;
      else toast.error("Invalid QR payload");
    } catch {
      toast.error("Failed to parse QR");
    }
  };

  // ---- mailto helper for quick manual email share ----
  function mailtoUrl(share) {
    const subject = encodeURIComponent("A document was shared with you via QR-Docs");
    const link = `${window.location.origin}/share/${share.share_id}`;
    const body = [
      `Hi,`,
      ``,
      `I've shared a document with you.`,
      `Access link: ${link}`,
      `Access type: ${share.access?.toUpperCase()}`,
      share.access === "private"
        ? `Since this is PRIVATE, please login with your registered email. You'll receive an OTP to view/download.`
        : `This is PUBLIC (view-only).`,
      ``,
      `Thanks!`,
    ].join("\n");
    return `mailto:${encodeURIComponent(share.to_user_email || "")}?subject=${subject}&body=${encodeURIComponent(body)}`;
  }

  // ---------- UI ----------
  return (
    <div style={{ maxWidth: 1200, margin: "24px auto", padding: "0 16px" }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <div style={{ marginLeft: "auto", opacity: 0.8, fontSize: 14 }}>{user?.email}</div>
      </div>

      {/* Upload card */}
      <motion.div
        {...getRootProps()}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          border: "1px dashed #3a4599",
          borderColor: isDragActive ? "#52e1c1" : "#3a4599",
          padding: 22,
          borderRadius: 14,
          marginBottom: 18,
          background: "#0f1533",
          textAlign: "center",
          cursor: "pointer",
        }}
      >
        <input {...getInputProps()} />
        <div style={{ fontWeight: 700, fontSize: 16 }}>Drag & Drop to upload</div>
        <div style={{ opacity: 0.75, fontSize: 13 }}>or click to choose a file</div>
      </motion.div>

      {/* Two-column grid */}
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "1fr 1fr" }}>
        {/* My Documents */}
        <section
          style={{
            background: "#0f1533",
            border: "1px solid #2a3170",
            borderRadius: 14,
            padding: 16,
            minHeight: 280,
          }}
        >
          <h3 style={{ marginTop: 0 }}>My Documents</h3>
          {loading ? (
            <div style={{ opacity: 0.7 }}>Loading…</div>
          ) : (
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">Name</th>
                  <th>Public</th>
                  <th>Size</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.document_id}>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span>{d.file_name}</span>
                        <small style={{ opacity: 0.6 }}>{d.mime_type || "—"}</small>
                      </div>
                    </td>
                    <td>
                      {d.is_public ? (
                        <span className="badge" style={{ background: "#52e1c1", color: "#012" }}>Public</span>
                      ) : (
                        <span className="badge" style={{ background: "#6c8bff", color: "#012" }}>Private</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>{d.file_size_bytes || "-"}</td>
                    <td style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                      <Link className="btn" to={`/view/${d.document_id}`}>Open</Link>
                      <button className="btn" onClick={() => setShareFor(d.document_id)}>Share</button>
                      <button className="btn btn-danger" onClick={() => delDoc(d.document_id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {!docs.length && (
                  <tr>
                    <td colSpan={4} style={{ opacity: 0.7, padding: 8 }}>No documents yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>

        {/* My Shares */}
        <section
          style={{
            background: "#0f1533",
            border: "1px solid #2a3170",
            borderRadius: 14,
            padding: 16,
            minHeight: 280,
          }}
        >
          <h3 style={{ marginTop: 0 }}>My Shares</h3>
          {loading ? (
            <div style={{ opacity: 0.7 }}>Loading…</div>
          ) : (
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">Document</th>
                  <th>Access</th>
                  <th>To</th>
                  <th style={{ textAlign: "center" }}>QR / Link / Actions</th>
                </tr>
              </thead>
              <tbody>
                {myShares.map((s) => {
                  const qr = qrImgForShareId(s.share_id);
                  return (
                    <tr key={s.share_id}>
                      <td>
                        <button className="btn" onClick={() => setViewShare(s)} title="Share details">
                          {s.file_name || s.document_id}
                        </button>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {s.access === "public" ? (
                          <span className="badge" style={{ background: "#52e1c1", color: "#012" }}>Public</span>
                        ) : (
                          <span className="badge" style={{ background: "#6c8bff", color: "#012" }}>Private</span>
                        )}
                      </td>
                      <td style={{ fontSize: 13, opacity: 0.85 }}>
                        {s.to_user_email || (s.to_user_id ? "User" : "-")}
                      </td>
                      <td style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                        <img
                          src={qr}
                          alt="QR"
                          style={{ width: 44, height: 44, background: "#fff", borderRadius: 6, padding: 3, cursor: "pointer" }}
                          onClick={() => setViewShare(s)}
                        />
                        <a className="btn" href={`${window.location.origin}/share/${s.share_id}`} target="_blank" rel="noreferrer">
                          Open
                        </a>
                        {s.to_user_email && <a className="btn" href={mailtoUrl(s)}>Email</a>}
                        <button className="btn btn-danger" onClick={() => revokeShare(s.share_id)}>Revoke</button>
                      </td>
                    </tr>
                  );
                })}
                {!myShares.length && (
                  <tr>
                    <td colSpan={4} style={{ opacity: 0.7, padding: 8 }}>No shares yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {/* Received */}
      <section
        style={{
          marginTop: 18,
          background: "#0f1533",
          border: "1px solid #2a3170",
          borderRadius: 14,
          padding: 16,
          minHeight: 280,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Received Documents</h3>
        {loading ? (
          <div style={{ opacity: 0.7 }}>Loading…</div>
        ) : (
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th align="left">Document</th>
                <th>Access</th>
                <th>QR</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {received.map((r) => {
                const qr = qrImgForShareId(r.share_id);
                return (
                  <tr key={r.share_id}>
                    <td>
                      <button className="btn" onClick={() => setViewShare(r)}>{r.file_name}</button>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {r.access === "public" ? (
                        <span className="badge" style={{ background: "#52e1c1", color: "#012" }}>Public</span>
                      ) : (
                        <span className="badge" style={{ background: "#6c8bff", color: "#012" }}>Private</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <img
                        src={qr}
                        alt="QR"
                        style={{ width: 56, height: 56, background: "#fff", borderRadius: 6, padding: 4, cursor: "pointer" }}
                        onClick={() => setViewShare(r)}
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <a className="btn" href={`/share/${r.share_id}`}>Open Share</a>
                    </td>
                  </tr>
                );
              })}
              {!received.length && (
                <tr>
                  <td colSpan={4} style={{ opacity: 0.7, padding: 8 }}>No shares received.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Scanner */}
        <div style={{ marginTop: 14 }}>
          <h4 style={{ margin: "14px 0 8px" }}>Scan QR</h4>
          <QRScanner onDecode={onQrDecode} onError={(e) => console.warn(e)} />
        </div>
      </section>

      {/* Share modal */}
      <AnimatePresence>
        {shareFor && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)" }}
            onClick={() => {
              setShareFor(null);
              setShareResult(null);
              setEmailCheck({ loading: false, exists: null, error: "" });
              setShareForm({ to_user_email: "", expiry_time: "" });
            }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              style={{
                maxWidth: 620,
                margin: "6% auto",
                background: "#0f1533",
                border: "1px solid #2a3170",
                padding: 20,
                borderRadius: 16,
              }}
            >
              <h3 style={{ marginTop: 0 }}>Share document</h3>

              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, opacity: 0.8 }}>Recipient email (optional for public)</label>
                  <input
                    className="input"
                    placeholder="you@example.com"
                    value={shareForm.to_user_email}
                    onChange={(e) => setShareForm((s) => ({ ...s, to_user_email: e.target.value }))}
                  />
                  {!!shareForm.to_user_email?.trim() && (
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      {emailCheck.loading && <span style={{ opacity: 0.8 }}>Checking…</span>}
                      {!emailCheck.loading && emailCheck.exists === true && (
                        <span className="badge" style={{ background: "#52e1c1", color: "#012" }}>Registered ✅ — suggest <b>Private</b></span>
                      )}
                      {!emailCheck.loading && emailCheck.exists === false && (
                        <span className="badge" style={{ background: "#ffb3b366", color: "#ffd4d4" }}>
                          Not registered — suggest <b>Public (view-only)</b>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 13, opacity: 0.8 }}>Expiry time (optional)</label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={shareForm.expiry_time}
                    onChange={(e) => setShareForm((s) => ({ ...s, expiry_time: e.target.value }))}
                  />
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                    Leave blank for no expiry. Past time is rejected by server.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button className="btn btn-primary" onClick={createShare}>Create Share</button>
                <button
                  className="btn"
                  onClick={() => {
                    setShareFor(null);
                    setShareResult(null);
                    setEmailCheck({ loading: false, exists: null, error: "" });
                    setShareForm({ to_user_email: "", expiry_time: "" });
                  }}
                >
                  Close
                </button>
              </div>

              {shareResult && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ opacity: 0.8, fontSize: 13 }}>
                      Access: {shareResult.access?.toUpperCase?.() || (emailCheck.exists ? "PRIVATE" : "PUBLIC")}
                    </span>
                    {shareResult.expiry_time && (
                      <span className="badge" style={{ background: "#2a3170" }}>
                        Expires: {shareResult.expiry_time}
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                    <img
                      alt="QR"
                      src={qrImgForShareId(shareResult.share_id)}
                      style={{ width: 200, height: 200, borderRadius: 8, background: "#fff", padding: 8 }}
                    />
                    <div style={{ fontSize: 13, opacity: 0.9 }}>
                      <div>
                        Link:&nbsp;
                        <a
                          href={`${window.location.origin}/share/${shareResult.share_id}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#6c8bff" }}
                        >
                          {window.location.origin}/share/{shareResult.share_id}
                        </a>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <button
                          className="btn"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${window.location.origin}/share/${shareResult.share_id}`
                            );
                            toast.success("Link copied");
                          }}
                        >
                          Copy link
                        </button>
                        {shareForm.to_user_email && (
                          <a
                            className="btn"
                            style={{ marginLeft: 8 }}
                            href={mailtoUrl({
                              ...shareResult,
                              to_user_email: shareForm.to_user_email,
                            })}
                          >
                            Email link
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View-share modal (read-only info + QR) */}
      <AnimatePresence>
        {viewShare && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)" }}
            onClick={() => setViewShare(null)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              style={{ maxWidth: 560, margin: "7% auto", background: "#0f1533", border: "1px solid #2a3170", padding: 18, borderRadius: 14 }}
            >
              <h3 style={{ marginTop: 0 }}>Share details</h3>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 14 }}>
                  <div><b>Document:</b> {viewShare.file_name || viewShare.document_id}</div>
                  <div><b>Share ID:</b> <code>{viewShare.share_id}</code></div>
                  <div><b>Access:</b> {viewShare.access?.toUpperCase()}</div>
                  {viewShare.expiry_time && (<div><b>Expires:</b> {viewShare.expiry_time}</div>)}
                </div>
                <div style={{ marginTop: 6 }}>
                  <img
                    alt="QR"
                    src={qrImgForShareId(viewShare.share_id)}
                    style={{ width: 220, height: 220, borderRadius: 8, background: "#fff", padding: 8 }}
                  />
                </div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  Scan the QR with any device. For <b>private</b> shares, the recipient must be registered and complete OTP.
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <a className="btn" href={`${window.location.origin}/share/${viewShare.share_id}`} target="_blank" rel="noreferrer">
                    Open Share
                  </a>
                  <a className="btn" href={qrImgForShareId(viewShare.share_id)} download>
                    Download QR
                  </a>
                  {viewShare.to_user_email && <a className="btn btn-primary" href={mailtoUrl(viewShare)}>Email Share</a>}
                  <button className="btn" onClick={() => setViewShare(null)}>Close</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
