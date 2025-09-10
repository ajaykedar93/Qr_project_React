import { motion } from "framer-motion";

export default function ConfirmModal({
  title,
  desc,
  confirmText = "Confirm",
  tone = "primary",
  onConfirm,
  onClose,
}) {
  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal small"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
      >
        <h3 className="modal-title">{title}</h3>
        <p className="muted" style={{ marginTop: 6 }}>{desc}</p>
        <div className="modal-actions">
          <button
            className={`btn ${tone === "danger" ? "btn-danger" : "btn-accent"}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
          <button className="btn btn-light" onClick={onClose}>Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
