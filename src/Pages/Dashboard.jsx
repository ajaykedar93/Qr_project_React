// src/Pages/Dashboard.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";

const API_BASE = "https://qr-project-v0h4.onrender.com"; // backend
const APP_URL = "https://qr-project-react-n8xx.vercel.app"; // frontend

function qrImgFromUrl(url) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    url
  )}`;
}

export default function Dashboard() {
  const [docs, setDocs] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const [shareDoc, setShareDoc] = useState(null); // doc selected for sharing
  const [shareEmail, setShareEmail] = useState("");
  const [shareExpiry, setShareExpiry] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [shareResult, setShareResult] = useState(null);

  // load user docs
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const { data } = await axios.get(`${API_BASE}/documents`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDocs(data);
      } catch (err) {
        toast.error("Failed to load documents");
      }
    })();
  }, []);

  async function uploadDoc(e) {
    e.preventDefault();
    if (!file) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const form = new FormData();
      form.append("file", file);

      const { data } = await axios.post(`${API_BASE}/documents/upload`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setDocs([data, ...docs]);
      toast.success("Document uploaded");
      setFile(null);
    } catch {
      toast.error("Upload failed");
    } finally {
      setLoading(false);
    }
  }

  async function deleteDoc(id) {
    if (!window.confirm("Delete this document?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE}/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocs(docs.filter((d) => d.document_id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  }

  // live email check
  useEffect(() => {
    const val = (shareEmail || "").trim();
    if (!val) {
      setEmailExists(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setCheckingEmail(true);
        const { data } = await axios.get(`${API_BASE}/auth/exists`, {
          params: { email: val },
        });
        setEmailExists(!!data?.exists);
      } catch {
        setEmailExists(null);
      } finally {
        setCheckingEmail(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [shareEmail]);

  async function createShare() {
    try {
      if (!shareDoc) return;
      setSharing(true);
      const token = localStorage.getItem("token");
      const { data } = await axios.post(
        `${API_BASE}/documents/${shareDoc.document_id}/share`,
        { to_email: shareEmail || null, expiry_time: shareExpiry || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const url = `${APP_URL}/share/${data.share_id}`;
      setShareResult({ ...data, url });
      toast.success("Share created");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to share");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px" }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "#0f1533",
          padding: 20,
          borderRadius: 14,
          border: "1px solid #2a3170",
          marginBottom: 20,
        }}
      >
        <h2 style={{ marginTop: 0 }}>My Documents</h2>
        <form
          onSubmit={uploadDoc}
          style={{ display: "flex", gap: 12, alignItems: "center" }}
        >
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" disabled={!file || loading}>
            {loading ? "Uploading…" : "Upload"}
          </button>
        </form>
      </motion.div>

      <div style={{ display: "grid", gap: 16 }}>
        {docs.map((d) => (
          <motion.div
            key={d.document_id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "#0f1533",
              padding: 16,
              borderRadius: 12,
              border: "1px solid #2a3170",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{d.file_name}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {d.mime_type} • {(d.file_size_bytes / 1024).toFixed(1)} KB
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn"
                onClick={() =>
                  (window.location.href = `/view/${d.document_id}`)
                }
              >
                View
              </button>
              <button
                className="btn"
                onClick={() => {
                  setShareDoc(d);
                  setShareResult(null);
                  setShareEmail("");
                  setShareExpiry("");
                }}
              >
                Share
              </button>
              <button className="btn btn-danger" onClick={() => deleteDoc(d.document_id)}>
                Delete
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* SHARE MODAL */}
      {shareDoc && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShareDoc(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0f1533",
              padding: 24,
              borderRadius: 14,
              border: "1px solid #2a3170",
              width: "100%",
              maxWidth: 500,
            }}
          >
            <h3>Share Document</h3>
            <div style={{ marginBottom: 12 }}>
              File: <b>{shareDoc.file_name}</b>
            </div>

            <input
              className="input"
              placeholder="Recipient email (optional)"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              style={{ width: "100%", marginBottom: 8 }}
            />
            {shareEmail && (
              <div style={{ fontSize: 12, marginBottom: 8 }}>
                {checkingEmail
                  ? "Checking…"
                  : emailExists === true
                  ? "Email is registered ✅ (Private share)"
                  : emailExists === false
                  ? "Email not registered ❌ (Will be public share)"
                  : ""}
              </div>
            )}

            <input
              type="datetime-local"
              className="input"
              value={shareExpiry}
              onChange={(e) => setShareExpiry(e.target.value)}
              style={{ width: "100%", marginBottom: 12 }}
            />

            <button
              className="btn btn-primary"
              onClick={createShare}
              disabled={sharing}
            >
              {sharing ? "Sharing…" : "Generate Share"}
            </button>

            {shareResult && (
              <div style={{ marginTop: 16, textAlign: "center" }}>
                <div style={{ fontSize: 13, marginBottom: 6 }}>
                  Access: <b>{shareResult.access}</b>
                  {shareResult.expiry_time && (
                    <span> • expires {new Date(shareResult.expiry_time).toLocaleString()}</span>
                  )}
                </div>
                <img
                  src={qrImgFromUrl(shareResult.url)}
                  alt="QR"
                  style={{ margin: "12px auto", display: "block" }}
                />
                <a
                  href={shareResult.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#4ea1f3", fontSize: 13 }}
                >
                  {shareResult.url}
                </a>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
