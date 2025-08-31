// src/Pages/Dashboard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";

const API_BASE = "https://qr-project-v0h4.onrender.com"; // backend API
const FRONTEND_URL = "https://qr-project-react-n8xx.vercel.app"; // hosted frontend

// ---- Helpers ----
function qrImgForShareId(share_id) {
  if (!share_id) return "";
  const url = `${FRONTEND_URL}/share/${share_id}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;
}
function fmtBytes(n) {
  if (!n && n !== 0) return "-";
  const k = 1024, sizes = ["B", "KB", "MB", "GB", "TB"];
  if (n === 0) return "0 B";
  const i = Math.floor(Math.log(n) / Math.log(k));
  return `${(n / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
function saveCache(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function readCache(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }

export default function Dashboard() {
  const nav = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);

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

  // Cached lists for snappy UX
  const [docs, setDocs] = useState(() => readCache("docs_cache", []));
  const [myShares, setMyShares] = useState(() => readCache("myshares_cache", []));
  const [received, setReceived] = useState(() => readCache("received_cache", []));

  const privateShares = useMemo(() => myShares.filter((s) => s.access === "private"), [myShares]);
  const publicShares  = useMemo(() => myShares.filter((s) => s.access === "public"), [myShares]);

  // Tabs
  const [tab, setTab] = useState("docs"); // "docs" | "shares" | "received"
  const [sharesSubtab, setSharesSubtab] = useState("private"); // "private" | "public"

  // Share modal state
  const [shareFor, setShareFor] = useState(null); // document_id
  const [shareForm, setShareForm] = useState({
    to_user_email: "",
    expiry_time: "",
    access: "private",
  });
  const [shareResult, setShareResult] = useState(null);
  const [notifying, setNotifying] = useState(false);

  // Email check (debounced)
  const [emailCheck, setEmailCheck] = useState({ loading: false, exists: null, error: "" });
  const emailTimerRef = useRef(null);

  // View-share modal
  const [viewShare, setViewShare] = useState(null);

  // Smooth scroll to QR when created
  const qrBlockRef = useRef(null);

  // ---- Drag & drop upload ----
  const onDrop = (accepted) => accepted?.[0] && uploadFile(accepted[0]);
  const { getRootProps, getInputProps, isDragActive, open: openPicker } = useDropzone({
    onDrop,
    noClick: true,
  });

  // ---- Load dashboard data ----
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
      saveCache("docs_cache", a.data || []);
      saveCache("myshares_cache", b.data || []);
      saveCache("received_cache", c.data || []);
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
      setDocs((d) => {
        const next = [data, ...d];
        saveCache("docs_cache", next);
        return next;
      });
    } catch (e) {
      toast.error(e?.response?.data?.error || "Upload failed");
    }
  }

  // ---- Delete ----
  async function delDoc(id) {
    if (!confirm("Delete this document?")) return;
    try {
      await api.delete(`/documents/${id}`);
      setDocs((d) => {
        const next = d.filter((x) => x.document_id !== id);
        saveCache("docs_cache", next);
        return next;
      });
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
      setMyShares((arr) => {
        const next = arr.filter((s) => s.share_id !== share_id);
        saveCache("myshares_cache", next);
        return next;
      });
      toast.success("Share revoked");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to revoke");
    }
  }

  // ---- Trigger email notification (server sends link + QR + context) ----
  async function notifyShare({ share_id, access, to_user_email, file_name }) {
    if (!to_user_email) return; // nothing to send
    try {
      setNotifying(true);
      // Pass extra context so email can show richer info (fallback if backend ignores extras)
      await api.post("/otp/notify-share", {
        share_id,
        to_email: to_user_email,
        meta: {
          access,
          document_name: file_name || "",
          sender_email: user?.email || "",
          frontend_link: `${FRONTEND_URL}/share/${share_id}`,
          qr_image: qrImgForShareId(share_id),
        },
      });
      toast.success("Email sent with link + QR image");
    } catch (e) {
      toast.warn(e?.response?.data?.error || "Share created, but email could not be sent");
    } finally {
      setNotifying(false);
    }
  }

  // ---- Create share (explicit access) ----
  async function createShare() {
    try {
      const email = shareForm.to_user_email?.trim() || "";
      const access = shareForm.access;

      // Private requires a registered email
      if (access === "private") {
        if (!email) return toast.error("Private share requires recipient email.");
        if (emailCheck.exists === false) {
          return toast.error("Email is not registered. Private share allowed only for registered users.");
        }
      }

      const payload = {
        document_id: shareFor,
        to_email: email || null,     // for public we may still email
        expiry_time: shareForm.expiry_time || null,
        access,
      };

      const { data } = await api.post("/shares", payload);

      // Best effort: fetch the file_name from docs to include in email meta
      const doc = docs.find(d => d.document_id === shareFor);
      const file_name = doc?.file_name || data.file_name || "";

      const result = {
        ...data,
        url: `${FRONTEND_URL}/share/${data.share_id}`,
        to_user_email: email,
        file_name,
      };
      setShareResult(result);

      // refresh list
      const mine = await api.get("/shares/mine").then((r) => r.data || []);
      setMyShares(mine);
      saveCache("myshares_cache", mine);

      // Send email immediately (both public & private) if email provided
      if (email) {
        await notifyShare({
          share_id: data.share_id,
          access: data.access || access,
          to_user_email: email,
          file_name,
        });
      } else {
        toast.success("Share created");
      }

      setTimeout(() => {
        qrBlockRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
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

  // ---- Guard + load ----
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      nav("/login");
      return;
    }
    load();
  }, []);

  // ---- mailto helper (manual fallback) ----
  function mailtoUrl(share) {
    const subject = encodeURIComponent("A document was shared with you via QR-Docs");
    const link = `${FRONTEND_URL}/share/${share.share_id}`;
    const body = [
      `Hi,`,
      ``,
      `I've shared a document with you.`,
      `Document: ${share.file_name || share.document_id}`,
      `Access: ${share.access?.toUpperCase?.() || ""}`,
      `Sender: ${user?.email || ""}`,
      ``,
      `Link: ${link}`,
      ``,
      share.access === "private"
        ? `This is PRIVATE — verify with your registered email (OTP) to view/download.`
        : `This is PUBLIC (view-only).`,
      ``,
      `You can also scan the QR image attached in the email.`,
      ``,
      `Thanks!`,
    ].join("\n");
    return `mailto:${encodeURIComponent(share.to_user_email || "")}?subject=${subject}&body=${encodeURIComponent(body)}`;
  }

  // ---------- UI ----------
  return (
    <div style={{ maxWidth: 1280, margin: "24px auto", padding: "0 16px", color: "#e9ecff" }}>
      {/* Top */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0, color: "#f6f7ff" }}>Dashboard</h2>
        <div style={{ marginLeft: "auto", opacity: 0.85, fontSize: 14 }}>{user?.email}</div>
      </div>

      {/* Upload */}
      <motion.div
        {...getRootProps()}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          border: "1px dashed",
          borderColor: isDragActive ? "#52e1c1" : "#5f6bff",
          padding: 22,
          borderRadius: 14,
          marginBottom: 18,
          background: "linear-gradient(180deg, #0e132a, #0b1024)",
          textAlign: "center",
          cursor: "pointer",
        }}
      >
        <input {...getInputProps()} />
        <div style={{ fontWeight: 700, fontSize: 16 }}>Drag & Drop to upload</div>
        <div style={{ opacity: 0.8, fontSize: 13, marginTop: 4 }}>
          or{" "}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openPicker();
            }}
            className="btn"
            style={{ padding: "6px 10px", borderRadius: 8 }}
          >
            choose a file
          </button>{" "}
          from your device
        </div>
      </motion.div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 10,
          borderBottom: "1px solid #2a3170",
          marginBottom: 14,
          overflowX: "auto",
        }}
      >
        <button
          className="btn"
          style={{ background: tab === "docs" ? "#263070" : "transparent" }}
          onClick={() => setTab("docs")}
        >
          Documents
        </button>
        <button
          className="btn"
          style={{ background: tab === "shares" ? "#263070" : "transparent" }}
          onClick={() => setTab("shares")}
        >
          My Shares
        </button>
        <button
          className="btn"
          style={{ background: tab === "received" ? "#263070" : "transparent" }}
          onClick={() => setTab("received")}
        >
          Received
        </button>
      </div>

      {/* Tab content */}
      {tab === "docs" && (
        <section
          style={{
            background: "#0e132a",
            border: "1px solid #2a3170",
            borderRadius: 14,
            padding: 16,
            minHeight: 300,
          }}
        >
          <h3 style={{ marginTop: 0, color: "#f0f3ff" }}>My Documents</h3>
          {loading ? (
            <div style={{ opacity: 0.75 }}>Loading…</div>
          ) : (
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">Name</th>
                  <th>Type</th>
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
                        <small style={{ opacity: 0.7 }}>{d.mime_type || "—"}</small>
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {d.is_public ? (
                        <span className="badge" style={{ background: "#52e1c1", color: "#012" }}>Public</span>
                      ) : (
                        <span className="badge" style={{ background: "#6c8bff", color: "#012" }}>Private</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>{fmtBytes(d.file_size_bytes)}</td>
                    <td style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                      <a className="btn" href={`${FRONTEND_URL}/view/${d.document_id}`} target="_blank" rel="noreferrer">Open</a>
                      <button
                        className="btn"
                        onClick={() => {
                          setShareFor(d.document_id);
                          setShareForm((s) => ({ ...s, to_user_email: "", expiry_time: "", access: "private" }));
                          setShareResult(null);
                          setEmailCheck({ loading: false, exists: null, error: "" });
                        }}
                      >
                        Share
                      </button>
                      <button className="btn btn-danger" onClick={() => delDoc(d.document_id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {!docs.length && (
                  <tr>
                    <td colSpan={4} style={{ opacity: 0.75, padding: 8 }}>No documents yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === "shares" && (
        <section
          style={{
            background: "#0e132a",
            border: "1px solid #2a3170",
            borderRadius: 14,
            padding: 16,
            minHeight: 300,
          }}
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              className="btn"
              style={{ background: sharesSubtab === "private" ? "#263070" : "transparent" }}
              onClick={() => setSharesSubtab("private")}
            >
              Private
            </button>
            <button
              className="btn"
              style={{ background: sharesSubtab === "public" ? "#263070" : "transparent" }}
              onClick={() => setSharesSubtab("public")}
            >
              Public
            </button>
          </div>

          {loading ? (
            <div style={{ opacity: 0.75 }}>Loading…</div>
          ) : sharesSubtab === "private" ? (
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">Document</th>
                  <th>To</th>
                  <th>QR / Link</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {privateShares.map((s) => {
                  const qr = qrImgForShareId(s.share_id);
                  const link = `${FRONTEND_URL}/share/${s.share_id}`;
                  return (
                    <tr key={s.share_id}>
                      <td>
                        <button className="btn" onClick={() => setViewShare(s)} title="Share details">
                          {s.file_name || s.document_id}
                        </button>
                        {s.expiry_time && (
                          <div style={{ fontSize: 12, opacity: 0.7 }}>Expires: {s.expiry_time}</div>
                        )}
                      </td>
                      <td style={{ fontSize: 13, opacity: 0.9 }}>
                        {s.to_user_email || (s.to_user_id ? "Registered user" : "-")}
                      </td>
                      <td style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <img
                          src={qr}
                          alt="QR"
                          style={{ width: 44, height: 44, background: "#fff", borderRadius: 6, padding: 3, cursor: "pointer" }}
                          onClick={() => setViewShare(s)}
                        />
                        <a className="btn" href={link} target="_blank" rel="noreferrer">Open</a>
                      </td>
                      <td style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                        {s.to_user_email && <a className="btn" href={mailtoUrl(s)}>Compose email</a>}
                        <button className="btn btn-danger" onClick={() => revokeShare(s.share_id)}>Revoke</button>
                      </td>
                    </tr>
                  );
                })}
                {!privateShares.length && (
                  <tr>
                    <td colSpan={4} style={{ opacity: 0.75, padding: 8 }}>No private shares yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">Document</th>
                  <th>QR</th>
                  <th>Open</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {publicShares.map((s) => {
                  const qr = qrImgForShareId(s.share_id);
                  const link = `${FRONTEND_URL}/share/${s.share_id}`;
                  return (
                    <tr key={s.share_id}>
                      <td>
                        <button className="btn" onClick={() => setViewShare(s)}>
                          {s.file_name || s.document_id}
                        </button>
                        {s.expiry_time && (
                          <div style={{ fontSize: 12, opacity: 0.7 }}>Expires: {s.expiry_time}</div>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <img
                          src={qr}
                          alt="QR"
                          style={{ width: 56, height: 56, background: "#fff", borderRadius: 6, padding: 4, cursor: "pointer" }}
                          onClick={() => setViewShare(s)}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <a className="btn" href={link} target="_blank" rel="noreferrer">Open</a>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button className="btn btn-danger" onClick={() => revokeShare(s.share_id)}>Revoke</button>
                      </td>
                    </tr>
                  );
                })}
                {!publicShares.length && (
                  <tr>
                    <td colSpan={4} style={{ opacity: 0.75, padding: 8 }}>No public shares yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === "received" && (
        <section
          style={{
            background: "#0e132a",
            border: "1px solid #2a3170",
            borderRadius: 14,
            padding: 16,
            minHeight: 280,
          }}
        >
          <h3 style={{ marginTop: 0, color: "#f0f3ff" }}>Received Documents</h3>
          {loading ? (
            <div style={{ opacity: 0.75 }}>Loading…</div>
          ) : (
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">Document</th>
                  <th>From</th>
                  <th>Access</th>
                  <th>QR</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {received.map((r) => {
                  const qr = qrImgForShareId(r.share_id);
                  const link = `${FRONTEND_URL}/share/${r.share_id}`;
                  return (
                    <tr key={r.share_id}>
                      <td>
                        <button className="btn" onClick={() => setViewShare(r)}>{r.file_name}</button>
                      </td>
                      <td style={{ fontSize: 13, opacity: 0.9 }}>
                        {r.from_full_name || ""} <span style={{ opacity: 0.7 }}>{r.from_email ? `(${r.from_email})` : ""}</span>
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
                        <a className="btn" href={link} target="_blank" rel="noreferrer">Open</a>
                      </td>
                    </tr>
                  );
                })}
                {!received.length && (
                  <tr>
                    <td colSpan={5} style={{ opacity: 0.75, padding: 8 }}>No shares received.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* Share modal */}
      <AnimatePresence>
        {shareFor && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.55)", backdropFilter: "blur(2px)", zIndex: 1000 }}
            onClick={() => {
              setShareFor(null);
              setShareResult(null);
              setEmailCheck({ loading: false, exists: null, error: "" });
              setShareForm({ to_user_email: "", expiry_time: "", access: "private" });
            }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              style={{
                maxWidth: 720,
                margin: "4% auto",
                background: "linear-gradient(180deg, #0e132a, #0b1024)",
                border: "1px solid #2a3170",
                padding: 20,
                borderRadius: 16,
                boxShadow: "0 15px 40px rgba(0,0,0,0.35)",
                maxHeight: "88vh",
                overflow: "auto",
              }}
            >
              <h3 style={{ marginTop: 0, color: "#f6f7ff" }}>Share document</h3>

              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 13, opacity: 0.85 }}>Access</label>
                    <select
                      className="input"
                      value={shareForm.access}
                      onChange={(e) => setShareForm((s) => ({ ...s, access: e.target.value }))}
                      style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #2a3170", background: "#0c1230", color: "#e9ecff" }}
                    >
                      <option value="private">Private (OTP, can download)</option>
                      <option value="public">Public (view-only)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 13, opacity: 0.85 }}>
                      Recipient email {shareForm.access === "private" ? "(required)" : "(optional)"}
                    </label>
                    <input
                      className="input"
                      placeholder="you@example.com"
                      value={shareForm.to_user_email}
                      onChange={(e) => setShareForm((s) => ({ ...s, to_user_email: e.target.value }))}
                      style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #2a3170", background: "#0c1230", color: "#e9ecff" }}
                    />
                    {!!shareForm.to_user_email?.trim() && (
                      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                        {emailCheck.loading && <span style={{ opacity: 0.85 }}>Checking…</span>}
                        {!emailCheck.loading && emailCheck.exists === true && (
                          <span className="badge" style={{ background: "#52e1c1", color: "#012" }}>
                            Registered ✅
                          </span>
                        )}
                        {!emailCheck.loading && emailCheck.exists === false && (
                          <span className="badge" style={{ background: "#ffb3b366", color: "#012" }}>
                            Not registered
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, opacity: 0.85 }}>Expiry time (optional)</label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={shareForm.expiry_time}
                    onChange={(e) => setShareForm((s) => ({ ...s, expiry_time: e.target.value }))}
                    style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #2a3170", background: "#0c1230", color: "#e9ecff" }}
                  />
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                    Leave blank for no expiry. Past time is rejected by server.
                  </div>
                </div>

                <div style={{ fontSize: 12, opacity: 0.85, background: "#0b1438", border: "1px solid #263070", padding: 10, borderRadius: 10 }}>
                  <b>Rules:</b> Private requires a registered recipient and enables view + download after OTP.
                  Public is view-only. If you enter an email for public, we’ll send them the link + QR image.
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                <button className="btn btn-primary" onClick={createShare}>Create Share</button>
                <button
                  className="btn"
                  onClick={() => {
                    setShareFor(null);
                    setShareResult(null);
                    setEmailCheck({ loading: false, exists: null, error: "" });
                    setShareForm({ to_user_email: "", expiry_time: "", access: "private" });
                  }}
                >
                  Close
                </button>
              </div>

              {shareResult && (
                <div ref={qrBlockRef} style={{ marginTop: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className="badge" style={{ background: "#263070" }}>
                      Access: {shareResult.access?.toUpperCase?.() || shareForm.access.toUpperCase()}
                    </span>
                    {shareResult.expiry_time && (
                      <span className="badge" style={{ background: "#263070" }}>
                        Expires: {shareResult.expiry_time}
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                    <img
                      alt="QR"
                      src={qrImgForShareId(shareResult.share_id)}
                      style={{ width: 220, height: 220, borderRadius: 10, background: "#fff", padding: 10 }}
                    />

                    <div style={{ fontSize: 13.5, opacity: 0.95 }}>
                      <div>
                        <b>Document:</b> {shareResult.file_name || shareResult.document_id}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <b>Link:</b>{" "}
                        <a href={shareResult.url} target="_blank" rel="noreferrer" style={{ color: "#6c8bff" }}>
                          {shareResult.url}
                        </a>
                      </div>

                      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          className="btn"
                          onClick={() => {
                            navigator.clipboard.writeText(shareResult.url);
                            toast.success("Link copied");
                          }}
                        >
                          Copy link
                        </button>

                        {shareResult.to_user_email && (
                          <>
                            <button
                              className="btn btn-primary"
                              disabled={notifying}
                              onClick={() =>
                                notifyShare({
                                  share_id: shareResult.share_id,
                                  access: shareResult.access || shareForm.access,
                                  to_user_email: shareResult.to_user_email,
                                  file_name: shareResult.file_name,
                                })
                              }
                              title="Server email includes link + embedded QR image"
                            >
                              {notifying ? "Sending…" : "Resend email (with QR)"}
                            </button>
                            <a className="btn" href={mailtoUrl(shareResult)}>
                              Compose email (manual)
                            </a>
                          </>
                        )}

                        <a className="btn" href={qrImgForShareId(shareResult.share_id)} download>
                          Download QR
                        </a>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12.5, opacity: 0.85 }}>
                    The email includes the share link, QR image, access type, document name, and your email as the sender.
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View-share modal */}
      <AnimatePresence>
        {viewShare && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.55)", zIndex: 1000 }}
            onClick={() => setViewShare(null)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              style={{
                maxWidth: 560,
                margin: "7% auto",
                background: "linear-gradient(180deg, #0e132a, #0b1024)",
                border: "1px solid #2a3170",
                padding: 18,
                borderRadius: 14,
                boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
              }}
            >
              <h3 style={{ marginTop: 0, color: "#f6f7ff" }}>Share details</h3>
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
                  Scan the QR with any device. For <b>private</b> shares, the recipient must be registered and complete OTP before decrypt+view.
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <a className="btn" href={`${FRONTEND_URL}/share/${viewShare.share_id}`} target="_blank" rel="noreferrer">
                    Open Share
                  </a>
                  <a className="btn" href={qrImgForShareId(viewShare.share_id)} download>
                    Download QR
                  </a>
                  {viewShare.to_user_email && <a className="btn btn-primary" href={mailtoUrl(viewShare)}>Compose email</a>}
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
