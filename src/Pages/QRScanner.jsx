// src/Pages/QRScanner.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function QRScanner({ onDecode, onError }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const streamRef = useRef(null);
  const decodedOnceRef = useRef(false);

  const [active, setActive] = useState(false);

  const stop = useCallback(() => {
    try {
      readerRef.current?.reset();
    } catch {}
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setActive(false);
  }, []);

  const start = useCallback(async () => {
    stop(); // ensure clean start
    decodedOnceRef.current = false;

    try {
      // Init reader once
      if (!readerRef.current) readerRef.current = new BrowserMultiFormatReader();

      // Prefer rear camera via constraints (works even when device labels are hidden pre-permission)
      setActive(true);

      await readerRef.current.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            // Tweak if you want a larger preview
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current,
        (result, err, controls) => {
          // Save MediaStream so we can stop tracks on unmount
          if (!streamRef.current && controls?.stream) {
            streamRef.current = controls.stream;
          }

          if (result && !decodedOnceRef.current) {
            decodedOnceRef.current = true;
            // small delay to allow UI to teardown gracefully
            setTimeout(() => {
              try {
                onDecode?.(result.getText());
              } finally {
                // optional: keep camera running for continuous scan
                // here we stop after first successful decode
                stop();
              }
            }, 0);
          } else if (err && err.name !== "NotFoundException") {
            // NotFoundException is expected during scanning; ignore it
            onError?.(err);
          }
        }
      );
    } catch (e) {
      // If constraints fail (e.g., iOS without permission), fallback to a deviceId approach
      try {
        const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
          (d) => d.kind === "videoinput"
        );
        if (!devices.length) throw new Error("No camera found");

        // Try to pick a back/environment camera by label if available
        const preferred =
          devices.find((d) => /back|environment/i.test(d.label)) || devices[0];

        await readerRef.current.decodeFromVideoDevice(
          preferred.deviceId,
          videoRef.current,
          (result, err) => {
            if (result && !decodedOnceRef.current) {
              decodedOnceRef.current = true;
              setTimeout(() => {
                try {
                  onDecode?.(result.getText());
                } finally {
                  stop();
                }
              }, 0);
            } else if (err && err.name !== "NotFoundException") {
              onError?.(err);
            }
          }
        );

        setActive(true);
      } catch (fallbackErr) {
        setActive(false);
        onError?.(fallbackErr || e);
      }
    }
  }, [onDecode, onError, stop]);

  useEffect(() => {
    let mounted = true;
    if (mounted) start();
    return () => {
      mounted = false;
      stop();
    };
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
