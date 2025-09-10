import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22 } },
};

export default function Uploader({
  getRootProps,
  getInputProps,
  isDragActive,
  openPicker,
}) {
  return (
    <motion.div
      {...getRootProps()}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className={`uploader ${isDragActive ? "drag" : ""}`}
    >
      <input {...getInputProps()} />
      <div className="uploader-line">
        <span className="uploader-text">Drag &amp; Drop to upload</span>
        <span className="sep">•</span>
        <button
          type="button"
          className="btn btn-accent"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openPicker();
          }}
        >
          Choose file
        </button>
      </div>
      <div className="uploader-hint">PDF, DOCX, PNG, JPG, etc. (Max 25MB)</div>
    </motion.div>
  );
}
