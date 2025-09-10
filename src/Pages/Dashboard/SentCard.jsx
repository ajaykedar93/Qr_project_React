import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22 } },
};

export default function SentCard({
  s,
  FRONTEND_URL,
  qrImgForShareId,
  onEditExpiry,
  onExpireNow,
  onRevoke,
  onDelete,
}) {
  return (
    <motion.div variants={fadeUp} className="card hover-tilt">
      <div className="card-head">
        <div className="file-emoji" aria-hidden>🔗</div>
        <div className="file-title">{s.file_name || s.document_id}</div>
      </div>
      <div className="meta">
        <span className={`badge ${s.access === "public" ? "badge-green" : "badge-mint"}`}>
          {s.access === "public" ? "PUBLIC" : "PRIVATE"}
        </span>
        <span className="dot">•</span>
        <span className="muted">
          {s.expiry_time ? `Expires: ${s.expiry_time}` : "No expiry"}
        </span>
      </div>
      <div className="qr-line">
        <img
          src={qrImgForShareId(s.share_id)}
          alt="QR"
          className="qr-img"
          title="Open share in new tab"
          onClick={() =>
            window.open(`${FRONTEND_URL}/share/${s.share_id}`, "_blank", "noopener,noreferrer")
          }
        />
        <a
          className="btn btn-light"
          href={`${FRONTEND_URL}/share/${s.share_id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open
        </a>
      </div>
      <div className="card-actions">
        <button className="btn btn-light" onClick={onEditExpiry}>Expiry…</button>
        <button className="btn btn-light" onClick={onExpireNow}>Expire now</button>
        <button className="btn btn-danger" onClick={onRevoke}>Revoke</button>
        <button className="btn btn-danger" onClick={onDelete}>Delete</button>
      </div>
    </motion.div>
  );
}
