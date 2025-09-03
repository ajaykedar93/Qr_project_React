// src/Pages/Home.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaLock, FaShareAlt, FaQrcode, FaPlusCircle } from "react-icons/fa";

export default function Home() {
  const nav = useNavigate();
  const [btnHover, setBtnHover] = useState(false);

  const palette = useMemo(
    () => ({
      bgDeep1: "#1a0f3a",
      bgDeep2: "#0e0f3a",
      accentPink: "#ff4d88",
      accentMagenta: "#bf3ea0",
      accentOrange: "#ff6a3d",
      yellowText: "#f7c43d",
      blueHeader: "#2f68ff",
      purple: "#6c2bd9",
      card: "#ffffff",
      textSoft: "#cdd1ff",
    }),
    []
  );

  const isAuthed = () => !!localStorage.getItem("token");

  const pageStyle = {
    width: "100%",
    minHeight: "calc(100svh - 56px)", // full viewport minus navbar
    display: "grid",
    alignItems: "center",
    justifyItems: "center",
    padding: "clamp(18px, 4vw, 40px)",
    boxSizing: "border-box",
    backgroundImage: [
      `radial-gradient(60rem 30rem at 10% 92%, rgba(255,106,61,.45) 0%, rgba(255,106,61,0) 60%)`,
      `radial-gradient(55rem 28rem at 92% 8%, rgba(255,0,128,.40) 0%, rgba(255,0,128,0) 60%)`,
      `linear-gradient(145deg, ${palette.bgDeep1} 0%, ${palette.bgDeep2} 100%)`,
    ].join(","),
  };

  const containerStyle = {
    width: "100%",
    maxWidth: 1280,
    margin: "0 auto",
    padding: "clamp(12px, 2vw, 20px)",
    borderRadius: 20,
    position: "relative",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,.06)",
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
    color: palette.yellowText,
    fontWeight: 600,
    letterSpacing: ".4px",
    marginBottom: "clamp(12px, 2vw, 20px)",
    fontSize: "clamp(12px, 1.4vw, 16px)",
  };

  const badge = (align) => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    maxWidth: "48%",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textAlign: align,
    filter: "drop-shadow(0 2px 10px rgba(246,195,59,.3))",
  });

  const left = { flex: "1 1 520px", minWidth: 280 };
  const right = {
    flex: "1 1 420px",
    minWidth: 280,
    display: "grid",
    placeItems: "center",
  };

  const title = {
    color: palette.yellowText,
    fontSize: "clamp(32px, 7vw, 72px)",
    lineHeight: 1.04,
    fontWeight: 900,
    margin: 0,
  };

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
      ? `linear-gradient(180deg, ${palette.accentPink} 0%, ${palette.accentMagenta} 100%)`
      : `linear-gradient(180deg, #ff5b93 0%, #d246a1 100%)`,
    boxShadow: btnHover
      ? "0 14px 34px rgba(255, 91, 147, .45)"
      : "0 12px 30px rgba(210, 70, 161, .42)",
    border: "none",
    cursor: "pointer",
    transition: "transform .15s ease, box-shadow .15s ease, opacity .2s ease",
    transform: btnHover ? "translateY(-2px)" : "none",
  };

  const artWrap = {
    width: "min(440px, 90vw)",
    aspectRatio: "1 / 1",
    position: "relative",
  };

  const docCard = {
    position: "absolute",
    right: "6%",
    top: "10%",
    width: "64%",
    height: "64%",
    borderRadius: 18,
    background: palette.card,
    boxShadow: "0 20px 50px rgba(0,0,0,.25)",
    overflow: "hidden",
  };

  const docHeader = { height: "16%", background: palette.blueHeader };

  const docLine = (w) => ({
    height: 8,
    width: w,
    borderRadius: 6,
    background: "#e8ecff",
    margin: "12px 16px",
  });

  const qrTile = {
    position: "absolute",
    left: "6%",
    bottom: "8%",
    width: "54%",
    height: "54%",
    borderRadius: 18,
    background: palette.card,
    boxShadow: "0 18px 44px rgba(0,0,0,.22)",
    display: "grid",
    placeItems: "center",
  };

  const qrSvg = { width: "68%", height: "68%" };

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
            <FaLock /> Private/Public
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
            <h1 style={title}>QR Based Documents</h1>
            <p style={subtitle}>
              Generate and send QR codes for your documents in seconds, with
              secure sharing and professional design.
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
                <div style={{ paddingTop: 6 }}>
                  <div style={docLine("78%")} />
                  <div style={docLine("62%")} />
                  <div style={docLine("70%")} />
                </div>
              </div>

              {/* QR Tile */}
              <div style={qrTile}>
                <FaQrcode size={96} color={palette.purple} />
              </div>
            </div>
          </motion.section>
        </div>
      </motion.div>
    </main>
  );
}
