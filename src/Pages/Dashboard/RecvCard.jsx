import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22 } },
};

export default function RecvCard({ r, FRONTEND_URL, qrImgForShareId }) {
  return (
    <motion.div variants={fadeUp} className="card hover-tilt">
      <div className="card-head">
        <div className="file-emoji" aria-hidden>📥</div>
        <div className="file-title">{r.file_name}</div>
      </div>
      <div className="meta">
        <span className={`badge ${r.access === "public" ? "badge-green" : "badge-mint"}`}>
          {r.access === "public" ? "PUBLIC" : "PRIVATE"}
        </span>
        <span className="dot">•</span>
        <span className="muted">
          From {r.from_full_name || ""}{r.from_email ? ` (${r.from_email})` : ""}
        </span>
      </div>
      <div className="qr-line">
        <img
          src={qrImgForShareId(r.share_id)}
          alt="QR"
          className="qr-img"
          title="Open share in new tab"
          onClick={() =>
            window.open(`${FRONTEND_URL}/share/${r.share_id}`, "_blank", "noopener,noreferrer")
          }
        />
        <a
          className="btn btn-light"
          href={`${FRONTEND_URL}/share/${r.share_id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open
        </a>
      </div>
    </motion.div>
  );
}
