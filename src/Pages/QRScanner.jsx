// src/Pages/QRScanner.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const API_BASE = "https://qr-project-v0h4.onrender.com"; // backend API (Render)

export default function QRScanner() {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const streamRef = useRef(null);
  const decodedOnceRef = useRef(false);
  const [active, setActive] = useState(false);
  const nav = useNavigate();

  const stop = useCallback(() => {
    try {
      readerRef.current?.reset();
    } catch {}
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setActive(false);
  }, []);

  const handleDecode = useCallback(async (text) => {
    try {
      // text should carry shareId or token. Example: https://yourapp/view?share_id=...
      let shareId = null;
      try {
        const url = new URL(text);
        shareId = url.searchParams.get("share_id") || url.searchParams.get("id");
      } catch {
        // If QR just encoded the ID itself
        shareId = text;
      }

      if (!shareId) {
        toast.error("Invalid QR code");
        return;
      }

      // Hit backend to check access
      const { data } = await axios.get(`${API_BASE}/shares/${shareId}/minimal`);

      if (data.access === "public") {
        // Public → go straight to viewer
        nav(`/view/${data.document_id}?share_id=${shareId}`);
      } else if (data.access === "private") {
        // Private → go to ShareAccess page (email + OTP flow)
        nav(`/share/${shareId}`);
      } else {
        toast.error("Invalid or expired share");
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || "QR scan failed");
    }
  }, [nav]);

  const start = useCallback(async () => {
    stop();
    decodedOnceRef.current = false;
    try {
      if (!readerRef.current) readerRef.current = new BrowserMultiFormatReader();
      setActive(true);

      await readerRef.current.decodeFromConstraints(
        {
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        },
        videoRef.current,
        (result, err, controls) => {
          if (!streamRef.current && controls?.stream) {
            streamRef.current = controls.stream;
          }

          if (result && !decodedOnceRef.current) {
            decodedOnceRef.current = true;
            handleDecode(result.getText());
            stop(); // stop after first decode
          } else if (err && err.name !== "NotFoundException") {
            console.error("Decode error:", err);
          }
        }
      );
    } catch (e) {
      console.error("Camera init error:", e);
      toast.error("Unable to start camera");
      setActive(false);
    }
  }, [stop, handleDecode]);

  useEffect(() => {
    start();
    return () => stop();
  }, [start, stop]);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 360 }}>
      <video
        ref={videoRef}
        style={{ width: "100%", borderRadius: 12, background: "#000" }}
        muted
        autoPlay
        playsInline
      />
      {active && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            border: "2px solid rgba(255,255,255,0.5)",
            borderRadius: 12,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
