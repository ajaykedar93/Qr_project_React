// src/Pages/Home.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaLock, FaShareAlt, FaPlusCircle } from "react-icons/fa";

export default function Home() {
  const nav = useNavigate();
  const [btnHover, setBtnHover] = useState(false);

  // Bright, cheerful palette – no dark/black shades
  const palette = useMemo(
    () => ({
      bg1: "#FFF7E6",          // peachy light
      bg2: "#E6F8FF",          // baby blue
      bg3: "#F6E5FF",          // lilac haze
      accentA: "#FF6A3D",      // bright orange
      accentB: "#FF4D88",      // hot pink
      accentC: "#7C5CFF",      // bright indigo
      accentD: "#22D3EE",      // bright cyan
      lemon: "#FFD54A",        // lemon yellow
      textPrimary: "#2F1B70",  // vivid purple (not black)
      textSoft: "#5B3FB8",     // softer vivid purple
      card: "#FFFFFF",
      border: "rgba(124,92,255,.25)",
    }),
    []
  );

  const isAuthed = () => !!localStorage.getItem("token");

  const pageStyle = {
    width: "100%",
    minHeight: "calc(100svh - 56px)",
    display: "grid",
    alignItems: "center",
    justifyItems: "center",
    padding: "clamp(18px, 4vw, 40px)",
    boxSizing: "border-box",
    backgroundImage: [
      `radial-gradient(46rem 24rem at 12% 90%, rgba(255,106,61,.25) 0%, rgba(255,106,61,0) 60%)`,
      `radial-gradient(42rem 22rem at 88% 12%, rgba(255,77,136,.22) 0%, rgba(255,77,136,0) 60%)`,
      `linear-gradient(135deg, ${palette.bg1} 0%, ${palette.bg2} 52%, ${palette.bg3} 100%)`,
    ].join(","),
  };

  const containerStyle = {
    width: "100%",
    maxWidth: 1280,
    margin: "0 auto",
    padding: "clamp(12px, 2vw, 20px)",
    borderRadius: 20,
    position: "relative",
    boxShadow: "inset 0 0 0 1px " + palette.border,
    background:
      "linear-gradient(180deg, rgba(255,255,255,.6), rgba(255,255,255,.4))",
    backdropFilter: "blur(6px)",
  };

  const rowStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "clamp(20px, 4vw, 48px)",
    flexWrap: "wrap",
  };

  const headerRow = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: palette.textSoft,
    fontWeight: 700,
    letterSpacing: ".4px",
    marginBottom: "clamp(12px, 2vw, 20px)",
    fontSize: "clamp(12px, 1.4vw, 16px)",
  };

  const badge = (align) => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    maxWidth: "48%",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textAlign: align,
    color: palette.textPrimary,
    filter: "drop-shadow(0 2px 10px rgba(255,213,74,.3))",
    background:
      "linear-gradient(90deg, rgba(255,213,74,.25), rgba(124,92,255,.2))",
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid " + palette.border,
  });

  const left = { flex: "1 1 520px", minWidth: 280 };
  const right = {
    flex: "1 1 420px",
    minWidth: 280,
    display: "grid",
    placeItems: "center",
  };

  const title = {
    color: palette.textPrimary,
    fontSize: "clamp(32px, 7vw, 72px)",
    lineHeight: 1.04,
    fontWeight: 900,
    margin: 0,
  };

  const titleAccent = { background: `linear-gradient(90deg, ${palette.accentA}, ${palette.accentB}, ${palette.accentC})`, WebkitBackgroundClip: "text", color: "transparent" };

  const subtitle = {
    color: palette.textSoft,
    fontSize: "clamp(16px, 2.1vw, 22px)",
    lineHeight: 1.6,
    margin: "clamp(12px, 2vw, 16px) 0 clamp(18px, 3vw, 28px)",
    maxWidth: 720,
  };

  const cta = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "clamp(12px, 1.8vw, 16px) clamp(20px, 3.4vw, 30px)",
    borderRadius: 14,
    fontSize: "clamp(14px, 1.9vw, 18px)",
    fontWeight: 800,
    letterSpacing: 0.2,
    color: "#fff",
    backgroundImage: btnHover
      ? `linear-gradient(90deg, ${palette.accentB}, ${palette.accentC})`
      : `linear-gradient(90deg, ${palette.accentA}, ${palette.accentB})`,
    boxShadow: btnHover
      ? "0 18px 40px rgba(124,92,255,.35)"
      : "0 16px 38px rgba(255,77,136,.32)",
    border: "none",
    cursor: "pointer",
    transition: "transform .15s ease, box-shadow .15s ease, opacity .2s ease",
    transform: btnHover ? "translateY(-2px)" : "none",
  };

  const artWrap = {
    width: "min(480px, 92vw)",
    aspectRatio: "1 / 1",
    position: "relative",
  };

  const docCard = {
    position: "absolute",
    right: "4%",
    top: "8%",
    width: "66%",
    height: "66%",
    borderRadius: 20,
    background: palette.card,
    boxShadow: "0 24px 60px rgba(124,92,255,.25)",
    overflow: "hidden",
    border: "1px solid " + palette.border,
  };

  const docHeader = {
    height: "18%",
    background: `linear-gradient(90deg, ${palette.accentD}, ${palette.accentC})`,
  };

  const docLine = (w) => ({
    height: 10,
    width: w,
    borderRadius: 8,
    background: "linear-gradient(90deg, #FFE49A, #FFB3CD)",
    margin: "14px 16px",
  });

  const qrTile = {
    position: "absolute",
    left: "4%",
    bottom: "6%",
    width: "56%",
    height: "56%",
    borderRadius: 22,
    background: palette.card,
    boxShadow: "0 22px 54px rgba(34,211,238,.26)",
    display: "grid",
    placeItems: "center",
    border: "1px solid " + palette.border,
    padding: 16,
  };

  return (
    <main style={pageStyle}>
      <motion.div
        style={containerStyle}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* header badges */}
        <div style={headerRow}>
          <div style={badge("left")}>
            <FaLock /> Private / Public
          </div>
          <div style={badge("right")}>
            <FaShareAlt /> Document Share
          </div>
        </div>

        <div style={rowStyle}>
          {/* Left column */}
          <motion.section
            style={left}
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 style={title}>
              <span style={titleAccent}>QR-Based</span> Documents
            </h1>
            <p style={subtitle}>
              Generate and send QR codes for your documents in seconds — with secure
              sharing, bright modern design, and a professional logo-centered QR.
            </p>
            <motion.button
              type="button"
              style={cta}
              whileTap={{ scale: 0.96 }}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              onClick={() =>
                nav(isAuthed() ? "/dashboard" : "/login", { replace: true })
              }
            >
              <FaPlusCircle /> Create QR Code
            </motion.button>
          </motion.section>

          {/* Right illustration */}
          <motion.section
            style={right}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div style={artWrap}>
              {/* Document card */}
              <div style={docCard}>
                <div style={docHeader} />
                <div style={{ paddingTop: 8 }}>
                  <div style={docLine("78%")} />
                  <div style={docLine("64%")} />
                  <div style={docLine("70%")} />
                </div>
              </div>

              {/* Professional QR Tile */}
              <div style={qrTile}>
                <ProfessionalQRCode
                  size={260}
                  logoSrc="/logo.png"      // put your logo here (public/logo.png)
                  fallbackInitials="PH"    // shown if logo not found
                />
              </div>
            </div>
          </motion.section>
        </div>
      </motion.div>
    </main>
  );
}

/**
 * Professional, bright QR SVG with:
 * - Rounded finder patterns
 * - Gradient modules
 * - Center logo well (image or initials)
 * NOTE: This is a presentational QR (for landing page). Use a real generator for scannable codes.
 */
function ProfessionalQRCode({ size = 240, logoSrc, fallbackInitials = "QR" }) {
  const s = size;
  const pad = 16;
  const view = 320; // internal viewBox for crispness

  // Finder square helper
  const Finder = ({ x, y }) => (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="0" y="0" width="70" height="70" rx="16" fill="url(#gradA)" />
      <rect
        x="10"
        y="10"
        width="50"
        height="50"
        rx="12"
        fill="url(#gradB)"
        stroke="url(#gradRing)"
        strokeWidth="2"
      />
      <rect x="22" y="22" width="26" height="26" rx="8" fill="url(#gradC)" />
    </g>
  );

  // Simple module blocks (decorative pattern)
  const Modules = () => (
    <g>
      {[
        // row, col, w, h (each cell ~10 units)
        [0, 9, 3, 3], [0, 13, 2, 2], [1, 12, 3, 2], [2, 16, 3, 3],
        [3, 8, 2, 2], [4, 12, 2, 2], [5, 15, 2, 2], [6, 10, 3, 3],
        [8, 4, 3, 3], [8, 12, 2, 2], [9, 8, 2, 2], [10, 15, 3, 2],
        [12, 2, 2, 2], [12, 10, 3, 3], [13, 6, 2, 2], [14, 13, 2, 2],
        [15, 4, 3, 3], [16, 9, 2, 2], [16, 15, 2, 2], [17, 12, 2, 2],
      ].map(([r, c, w, h], i) => (
        <rect
          key={i}
          x={c * 10}
          y={r * 10}
          width={w * 10 - 2}
          height={h * 10 - 2}
          rx="4"
          fill="url(#gradDots)"
        />
      ))}
    </g>
  );

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${view} ${view}`}
      role="img"
      aria-label="Decorative QR with logo"
      style={{ borderRadius: 16 }}
    >
      <defs>
        <linearGradient id="gradBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E3F8FF" />
          <stop offset="100%" stopColor="#FFE8F2" />
        </linearGradient>

        <linearGradient id="gradA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#7C5CFF" />
        </linearGradient>

        <linearGradient id="gradB" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF6A3D" />
          <stop offset="100%" stopColor="#FF4D88" />
        </linearGradient>

        <linearGradient id="gradC" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFD54A" />
          <stop offset="100%" stopColor="#7C5CFF" />
        </linearGradient>

        <linearGradient id="gradDots" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C5CFF" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>

        <linearGradient id="gradRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FFE49A" />
        </linearGradient>

        <clipPath id="qrClip">
          <rect x={pad} y={pad} width={view - pad * 2} height={view - pad * 2} rx="24" />
        </clipPath>
      </defs>

      {/* Soft background */}
      <rect width={view} height={view} fill="url(#gradBg)" rx="24" />

      <g clipPath="url(#qrClip)" transform="translate(20,20)">
        {/* Finder patterns (top-left, top-right, bottom-left) */}
        <Finder x={0} y={0} />
        <Finder x={210} y={0} />
        <Finder x={0} y={210} />

        {/* Decorative modules */}
        <g transform="translate(20,20)">
          <Modules />
        </g>

        {/* Center logo well */}
        <g transform="translate(110,110)">
          <rect
            x="-38"
            y="-38"
            width="76"
            height="76"
            rx="16"
            fill="#FFFFFF"
            stroke="url(#gradRing)"
            strokeWidth="2"
          />
          {/* Logo image or initials */}
          {logoSrc ? (
            <image
              href={logoSrc}
              x="-26"
              y="-26"
              width="52"
              height="52"
              preserveAspectRatio="xMidYMid slice"
              onError={(e) => (e.target.style.display = "none")}
              style={{ borderRadius: 12 }}
            />
          ) : null}
          {/* Fallback initials if image hidden or not provided */}
          <text
            x="0"
            y="8"
            textAnchor="middle"
            fontSize="28"
            fontWeight="800"
            fill="#7C5CFF"
          >
            {fallbackInitials}
          </text>
        </g>
      </g>
    </svg>
  );
}
