// src/Pages/Dashboard/DocCard.jsx
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.28, ease: "easeOut" },
  },
};

export default function DocCard({
  d,
  FRONTEND_URL,
  fmtBytes,
  onShare,
  onDelete,
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{
        y: -4,
        scale: 1.02,
        boxShadow: "0 14px 32px rgba(124,92,255,.22)",
      }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className="card hover-tilt"
      style={{
        borderRadius: 16,
        padding: 16,
        background: "linear-gradient(180deg, #fff, #f9f9ff)",
        border: "1px solid rgba(124,92,255,.25)",
      }}
    >
      {/* Header */}
      <div
        className="card-head"
        style={{ display: "flex", alignItems: "center", gap: 10 }}
      >
        <div
          className="file-emoji"
          aria-hidden
          style={{
            fontSize: 22,
            background: "rgba(124,92,255,.12)",
            borderRadius: 8,
            width: 36,
            height: 36,
            display: "grid",
            placeItems: "center",
          }}
        >
          📄
        </div>
        <div
          className="file-title"
          style={{ fontWeight: 700, fontSize: 15, flex: 1 }}
        >
          {d.file_name}
        </div>
      </div>

      {/* Metadata */}
      <div
        className="meta"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          margin: "12px 0",
          fontSize: 13,
          color: "#5B3FB8",
        }}
      >
        <span
          className={`badge ${
            d.is_public ? "badge-green" : "badge-mint"
          }`}
          style={{
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 999,
            fontWeight: 700,
          }}
        >
          {d.is_public ? "PUBLIC" : "PRIVATE"}
        </span>
        <span className="dot">•</span>
        <span className="muted">{d.mime_type || "file"}</span>
        <span className="dot">•</span>
        <span className="muted">{fmtBytes(d.file_size_bytes)}</span>
      </div>

      {/* Actions */}
      <div
        className="card-actions"
        style={{
          display: "flex",
          gap: 10,
          marginTop: 10,
          flexWrap: "wrap",
        }}
      >
        <a
          className="btn btn-light"
          href={`${FRONTEND_URL}/view/${d.document_id}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in a new tab"
          style={{
            flex: 1,
            textAlign: "center",
            borderRadius: 10,
            padding: "8px 12px",
          }}
        >
          Open
        </a>
        <button
          className="btn btn-accent"
          onClick={onShare}
          style={{ flex: 1, borderRadius: 10, padding: "8px 12px" }}
        >
          Share
        </button>
        <button
          className="btn btn-danger"
          onClick={onDelete}
          style={{ flex: 1, borderRadius: 10, padding: "8px 12px" }}
        >
          Delete
        </button>
      </div>
    </motion.div>
  );
}
