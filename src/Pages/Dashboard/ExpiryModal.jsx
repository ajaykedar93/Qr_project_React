import { useState } from "react";
import { motion } from "framer-motion";

export default function ExpiryModal({ current, onSubmit, onClose }) {
  const [val, setVal] = useState(current ? current.slice(0, 16) : "");
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
        <h3 className="modal-title">Update Expiry</h3>
        <div className="form-grid">
          <label className="lbl">Expiry (optional)</label>
          <input
            className="input"
            type="datetime-local"
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-accent" onClick={() => onSubmit(val || null)}>Save</button>
          <button className="btn btn-light" onClick={() => onSubmit(null)}>Remove</button>
          <button className="btn btn-light" onClick={onClose}>Close</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
