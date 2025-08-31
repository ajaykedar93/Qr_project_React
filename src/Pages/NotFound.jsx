// src/Pages/NotFound.jsx
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

// 404 Error Page
export default function NotFound() {
  return (
    <div style={{ maxWidth: 700, margin: "60px auto", padding: 16 }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "#0f1533",
          border: "1px solid #2a3170",
          borderRadius: 14,
          padding: 24,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Page Not Found</h2>
        <p style={{ opacity: 0.8 }}>
          Sorry, the page you are looking for does not exist.
        </p>
        <div style={{ marginTop: 16 }}>
          You can go back to the{" "}
          <Link to="/" style={{ color: "#52e1c1", textDecoration: "none" }}>
            Home Page
          </Link>{" "}
          or check out the{" "}
          <Link to="/dashboard" style={{ color: "#52e1c1", textDecoration: "none" }}>
            Dashboard
          </Link>.
        </div>
      </motion.div>
    </div>
  );
}
