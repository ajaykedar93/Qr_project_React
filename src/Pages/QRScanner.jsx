// src/Pages/QRScanner.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

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

  /**
   * Try our best to pull a shareId from many possible QR payloads:
   *  1) Full URL with /share/:id
   *  2) Full URL with ?share_id=:id or ?id=:id
   *  3) Raw id string
   */
  function extractShareIdFromText(text) {
    // Case 1: full URL?
    try {
      const url = new URL(text);

      // Prefer /share/:id
      // e.g. https://app.example.com/share/abcd-1234…
      const shareMatch = url.pathname.match(/\/share\/([^/?#]+)/i);
      if (shareMatch?.[1]) return shareMatch[1];

      // Fallback: ?share_id=… or ?id=…
      const qp = url.searchParams.get("share_id") || url.searchParams.get("id");
      if (qp) return qp;

      // If it's *some* URL but we can't find a shareId, return null and let caller warn
      return null;
    } catch {
      // Not a URL — maybe it’s just the raw id?
      const raw = String(text || "").trim();

      // Basic sanity: UUID-like or hex-like or at least not empty
      if (raw && /^[A-Za-z0-9\-_]{6,}$/.test(raw)) {
        return raw;
      }
      return null;
    }
  }

  const handleDecode = useCallback(
    (text) => {
      const shareId = extractShareIdFromText(text);
      if (!shareId) {
        toast.error("Invalid QR: missing share ID");
        return;
      }

      // ALWAYS go to ShareAccess page.
      // That page will handle public vs private and redirect to viewer for public.
      nav(`/share/${shareId}`);
      stop();
    },
    [nav, stop]
  );

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
          } else if (err && err.name !== "NotFoundException") {
            // NotFoundException is normal while scanning; ignore it
            console.warn("Decode error:", err);
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
