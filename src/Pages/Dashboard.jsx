// src/Pages/Dashboard.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import QRScanner from "./QRScanner.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080"; // backend root

// Generate a QR image for the JSON payload the scanner expects: { "share_id": "..." }
function qrImgForShareId(share_id) {
  if (!share_id) return "";
  const payload = encodeURIComponent(JSON.stringify({ share_id }));
  // Browser loads the image directly from a public QR generator
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${payload}`;
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

  // Share create modal
  const [shareFor, setShareFor] = useState(null);
  const [shareForm, setShareForm] = useState({
    to_user_email: "",
    access: "private",   // UI hint only; backend decides based on registration
    expiry_time: "",
  });
  const [shareResult, setShareResult] = useState(null);

  // Recipient existence check
  const [emailCheck, setEmailCheck] = useState({ loading: false, exists: null, error: "" });
  const emailTimerRef = useRef(null);

  // Share details modal
  const [viewShare, setViewShare] = useState(null);

  // Drag & drop upload
  const onDrop = (accepted) => accepted?.[0] && uploadFile(accepted[0]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

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
      else toast.error(e?.response?.data?.error || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

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

  // Revoke a share you created
  async function revokeShare(share_id) {
    if (!confirm("Revoke this share? Recipients will no longer be able to access it.")) return;
    try {
      await api.post(`/shares/${share_id}/revoke`);
      setMyShares((arr) => arr.filter((s) => s.share_id !== share_id));
      toast.success("Share revoked");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to revoke share");
    }
  }

  // Create share + (optional) email notify
  async function createShare() {
    try {
      const payload = {
        document_id: shareFor,
        to_email: shareForm.to_user_email || null,
        expiry_time: shareForm.expiry_time || null,
        // 'access' is decided server-side (registered => private, else public)
      };

      // heads-up if user forced "private" but the email isn't in DB
      if (shareForm.access === "private" && payload.to_email && emailCheck.exists === false) {
        const proceed = confirm(
          "Recipient is not registered. You can still create the share (will be PUBLIC view-only), or ask them to register. Continue?"
        );
        if (!proceed) return;
      }

      // Create share
      const { data } = await api.post("/shares", payload);
      // data contains: share_id, share_token, access, expiry_time, created_at, url
      setShareResult(data);

      // Refresh "My Shares"
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

  // Debounced recipient existence check
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

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      nav("/login");
      return;
    }
    load();
  }, []);

  const onQrDecode = (text) => {
    try {
      const payload = JSON.parse(text);
      if (payload?.share_id) window.location.href = `/share/${payload.share_id}`;
      else toast.error("Invalid QR payload");
    } catch {
      toast.error("Failed to parse QR");
    }
  };

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
    return `mailto:${encodeURIComponent(share.to_user_email || "")}?subject=${subject}&body=${encodeURIComponent(
      body
    )}`;
  }

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <div style={{ marginLeft: "auto", opacity: 0.8, fontSize: 14 }}>{user?.email}</div>
      </div>

      {/* Upload */}
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
        <div style={{ fontWeight: 700 }}>Drag & Drop to upload</div>
        <div style={{ opacity: 0.75, fontSize: 13 }}>or click to choose a file</div>
      </motion.div>

      {/* Grid */}
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "1fr 1fr" }}>
        {/* My Documents */}
        <section
          style={{
            background: "#0f1533",
            border: "1px solid #2a3170",
            borderRadius: 14,
            padding: 16,
            minHeight: 260,
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.document_id}>
                    <td>{d.file_name}</td>
                    <td>
                      {d.is_public ? (
                        <span className="badge" style={{ background: "#52e1c1", color: "#012" }}>Public</span>
                      ) : (
                        <span className="badge" style={{ background: "#6c8bff", color: "#012" }}>Private</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>{d.file_size_bytes || "-"}</td>
                    <td style={{ display: "flex", gap: 8, justifyContent: "center" }}>
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
            minHeight: 260,
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
                  <th>QR / Link / Actions</th>
                </tr>
              </thead>
              <tbody>
                {myShares.map((s) => {
                  const qrImg = qrImgForShareId(s.share_id);
                  return (
                    <tr key={s.share_id}>
                      <td>
                        <button className="btn" onClick={() => setViewShare(s)} title="Open share details">
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
                          src={qrImg}
                          alt="QR"
                          style={{ width: 40, height: 40, background: "#fff", borderRadius: 6, padding: 3, cursor: "pointer" }}
                          onClick={() => setViewShare(s)}
                          title="Preview QR"
                        />
                        <a className="btn" href={`${window.location.origin}/share/${s.share_id}`} target="_blank" rel="noreferrer">
                          Open
                        </a>
                        {s.to_user_email && <a className="btn" href={mailtoUrl(s)}>Email</a>}
                        <button className="btn btn-danger" onClick={() => revokeShare(s.share_id)}>
                          Revoke
                        </button>
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
          minHeight: 260,
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
                const qrImg = qrImgForShareId(r.share_id);
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
                        src={qrImg}
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

        <div style={{ marginTop: 14 }}>
          <h4 style={{ margin: "14px 0 8px" }}>Scan QR</h4>
          <QRScanner onDecode={onQrDecode} onError={(e) => console.warn(e)} />
        </div>
      </section>

      {/* MODAL: Create Share */}
      <AnimatePresence>
        {shareFor && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)" }}
            onClick={() => { setShareFor(null); setShareResult(null); setEmailCheck({ loading:false, exists:null, error:"" }); }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              style={{ maxWidth: 560, margin: "7% auto", background: "#0f1533", border: "1px solid #2a3170", padding: 18, borderRadius: 14 }}
            >
              <h3 style={{ marginTop: 0 }}>Share document</h3>
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <input
                    className="input"
                    placeholder="Recipient email (optional for public)"
                    value={shareForm.to_user_email}
                    onChange={(e) => setShareForm((s) => ({ ...s, to_user_email: e.target.value }))}
                  />
                  {shareForm.to_user_email?.trim() && (
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      {emailCheck.loading && <span style={{ opacity: .8 }}>Checking…</span>}
                      {!emailCheck.loading && emailCheck.exists === true && (
                        <span className="badge" style={{ background: "#52e1c1", color: "#012" }}>Registered ✅</span>
                      )}
                      {!emailCheck.loading && emailCheck.exists === false && (
                        <>
                          <span className="badge" style={{ background: "#ff7c7c55", color: "#ffbdbd" }}>Not registered</span>
                          {shareForm.access === "private" ? (
                            <span style={{ opacity: .85 }}>
                              Tip: switch to <b>Public</b> (view-only), or ask them to register.
                            </span>
                          ) : (
                            <span style={{ opacity: .85 }}>They can open the public link (view-only).</span>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <select
                  className="input"
                  value={shareForm.access}
                  onChange={(e) => setShareForm((s) => ({ ...s, access: e.target.value }))}
                >
                  <option value="private">Private (OTP + decrypt)</option>
                  <option value="public">Public (view-only)</option>
                </select>
                <input
                  className="input"
                  type="datetime-local"
                  value={shareForm.expiry_time}
                  onChange={(e) => setShareForm((s) => ({ ...s, expiry_time: e.target.value }))}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button className="btn btn-primary" onClick={createShare}>Create Share</button>
                <button className="btn" onClick={() => { setShareFor(null); setShareResult(null); }}>Close</button>
              </div>

              {shareResult && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ opacity: 0.8, fontSize: 13 }}>
                      Access: {shareResult.access?.toUpperCase?.() || shareForm.access.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <img
                      alt="QR"
                      src={qrImgForShareId(shareResult.share_id)}
                      style={{ width: 180, height: 180, borderRadius: 8, background: "#fff", padding: 8 }}
                    />
                  </div>
                  {shareResult.url && (
                    <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
                      Share link: <code>{shareResult.url}</code>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: View Share */}
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
