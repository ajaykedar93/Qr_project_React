// src/Pages/QRScanner.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

function isSecureContext() {
  // Camera requires HTTPS (except localhost)
  if (window.isSecureContext) return true;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

/**
 * Extract shareId (or token) from:
 *  1) URL paths (/share/:id)
 *  2) URL queries (?share_id= or ?id= or ?token=)
 *  3) Raw id string (alnum, dash, underscore)
 */
function extractShareIdFromText(text) {
  try {
    const url = new URL(text);

    // Prefer /share/:id
    const m1 = url.pathname.match(/\/share\/([^/?#]+)/i);
    if (m1?.[1]) return { shareId: m1[1], token: null };

    // Accept /s/:id as a short path too (optional)
    const m2 = url.pathname.match(/\/s\/([^/?#]+)/i);
    if (m2?.[1]) return { shareId: m2[1], token: null };

    // Fallback to query params
    const token = url.searchParams.get("token");
    const shareId = url.searchParams.get("share_id") || url.searchParams.get("id");
    if (shareId || token) return { shareId, token };
    return null;
  } catch {
    const raw = String(text || "").trim();
    if (raw && /^[A-Za-z0-9\-_]{6,}$/.test(raw)) {
      return { shareId: raw, token: null };
    }
    return null;
  }
}

export default function QRScanner() {
  const nav = useNavigate();

  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const streamRef = useRef(null);

  const [active, setActive] = useState(false);
  const [decoding, setDecoding] = useState(false);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(""); // preferred camera
  const [hasSecure, setHasSecure] = useState(isSecureContext());

  // Avoid double navigation on rapid multi-decoding
  const navigatedRef = useRef(false);

  const stop = useCallback(() => {
    try { readerRef.current?.reset(); } catch {}
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setActive(false);
    setDecoding(false);
  }, []);

  const handleDecode = useCallback((text) => {
    if (navigatedRef.current) return; // guard
    const parsed = extractShareIdFromText(text);
    if (!parsed) {
      toast.error("Invalid QR: missing share ID");
      return;
    }
    navigatedRef.current = true;
    stop();
    // Always go to ShareAccess page (handles private/public then redirects)
    if (parsed.token) {
      nav(`/share/${parsed.shareId || ""}?token=${encodeURIComponent(parsed.token)}`);
    } else {
      nav(`/share/${parsed.shareId}`);
    }
  }, [nav, stop]);

  // Start scanning with constraints; try preferred device first
  const start = useCallback(async () => {
    if (!hasSecure) {
      toast.error("Camera requires HTTPS (open the app over https://)");
      return;
    }
    stop();
    navigatedRef.current = false;

    try {
      if (!readerRef.current) readerRef.current = new BrowserMultiFormatReader();

      // getUserMedia might need explicit deviceId if available
      const constraints = {
        audio: false,
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: "environment" } },
      };

      setActive(true);
      setDecoding(true);

      await readerRef.current.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result, err, controls) => {
          if (!streamRef.current && controls?.stream) {
            streamRef.current = controls.stream;
          }
          if (result && !navigatedRef.current) {
            handleDecode(result.getText());
          } else if (err && err.name !== "NotFoundException") {
            // NotFound is normal while scanning
            console.warn("Decode error:", err);
          }
        }
      );
    } catch (e) {
      console.error("Camera init error:", e);
      setActive(false);
      setDecoding(false);
      if (e?.name === "NotAllowedError") {
        toast.error("Camera permission denied. Please allow camera access.");
      } else if (e?.name === "NotFoundError") {
        toast.error("No camera found on this device.");
      } else {
        toast.error("Unable to start camera.");
      }
    }
  }, [deviceId, handleDecode, hasSecure, stop]);

  // Enumerate cameras
  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices?.enumerateDevices?.() || [];
      const cams = list.filter(d => d.kind === "videoinput");
      setDevices(cams);
      // Prefer back camera if we don't have a selection
      if (!deviceId && cams.length) {
        const back = cams.find(d => /back|rear/i.test(d.label));
        setDeviceId(back?.deviceId || cams[0].deviceId);
      }
    } catch {
      // Some browsers hide labels until permission is granted
    }
  }, [deviceId]);

  // Start on mount; stop on unmount
  useEffect(() => {
    setHasSecure(isSecureContext());
    refreshDevices().finally(() => start());
    return () => stop();
  }, [refreshDevices, start, stop]);

  // Pause when tab hidden; resume when visible
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        stop();
      } else if (!active) {
        start();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [active, start, stop]);

  // Scan from uploaded image (gallery)
  const onPickImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (!readerRef.current) readerRef.current = new BrowserMultiFormatReader();
      const imgUrl = URL.createObjectURL(file);
      const result = await readerRef.current.decodeFromImageUrl(imgUrl);
      URL.revokeObjectURL(imgUrl);
      handleDecode(result.getText());
    } catch (err) {
      console.warn(err);
      toast.error("No QR code found in the selected image.");
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: 420, margin: "0 auto" }}>
      {!hasSecure && (
        <div style={{
          background: "#fff3cd", color: "#664d03", border: "1px solid #ffecb5",
          padding: 10, borderRadius: 8, marginBottom: 10, fontSize: 14
        }}>
          Open this page over <b>HTTPS</b> (or <b>localhost</b>) to use the camera.
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={start} disabled={decoding}>Start</button>
        <button className="btn" onClick={stop} disabled={!active}>Stop</button>

        <label className="btn" style={{ cursor: "pointer" }}>
          Scan from image
          <input type="file" accept="image/*" onChange={onPickImage} style={{ display: "none" }} />
        </label>

        {devices.length > 1 && (
          <select
            className="btn"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            style={{ padding: "8px 10px" }}
            title="Choose camera"
          >
            {devices.map(d => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Camera ${d.deviceId.slice(0, 6)}…`}
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={{ position: "relative", width: "100%" }}>
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

      <p style={{ opacity: 0.75, fontSize: 12, marginTop: 8 }}>
        Tip: Hold the QR steady and fill most of the frame. Good lighting helps.
      </p>
    </div>
  );
}
