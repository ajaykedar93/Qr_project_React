// src/Pages/ViewDoc.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

const API_BASE = "https://qr-project-v0h4.onrender.com";

export default function ViewDoc() {
  const { documentId } = useParams();
  const [sp] = useSearchParams();
  const shareId = sp.get("share_id");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [iframeSrc, setIframeSrc] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const viewUrl = useMemo(() => {
    const u = new URL(`${API_BASE}/documents/view/${documentId}`);
    if (shareId) u.searchParams.set("share_id", shareId);
    return u.toString();
  }, [documentId, shareId]);

  const downloadUrl = useMemo(() => {
    const u = new URL(`${API_BASE}/documents/download/${documentId}`);
    if (shareId) u.searchParams.set("share_id", shareId);
    return u.toString();
  }, [documentId, shareId]);

  // For private shares we need to pass x-user-id header (iframe can't).
  // So we fetch as blob, then show object URL in iframe (works for both public & private).
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(viewUrl, {
          responseType: "blob",
          headers: { "x-user-id": user?.user_id || "" },
        });
        const url = URL.createObjectURL(data);
        setIframeSrc(url);
        return () => URL.revokeObjectURL(url);
      } catch (e) {
        toast.error(e?.response?.data || "Unable to open document");
      }
    })();
  }, [viewUrl]);

  async function doDownload() {
    try {
      setDownloading(true);
      const { data, headers } = await axios.get(downloadUrl, {
        responseType: "blob",
        headers: { "x-user-id": user?.user_id || "" },
      });
      const blob = new Blob([data], { type: headers["content-type"] || "application/octet-stream" });
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `document-${documentId}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e?.response?.data || "Download not allowed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px" }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ background: "#0f1533", padding: 16, borderRadius: 14, border: "1px solid #2a3170" }}
      >
        <h2 style={{ marginTop: 0 }}>Document Viewer</h2>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <button className="btn" onClick={() => window.open(viewUrl, "_blank", "noopener")}>
            Open raw in new tab
          </button>
          <button className="btn btn-primary" onClick={doDownload} disabled={downloading}>
            {downloading ? "Downloading…" : "Download"}
          </button>
          <Link className="btn" to="/dashboard">Back</Link>
        </div>
        {iframeSrc ? (
          <iframe
            title="doc"
            src={iframeSrc}
            style={{ width: "100%", height: "70vh", border: "1px solid #2a3170", borderRadius: 10, background: "#000" }}
          />
        ) : (
          <div style={{ opacity: 0.7 }}>Loading preview…</div>
        )}
      </motion.div>
    </div>
  );
}
