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
    } catch (e) {
      console.error("Error stopping QR scanner: ", e);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
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

      // Prefer rear camera via constraints
      setActive(true);

      await readerRef.current.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current,
        (result, err, controls) => {
          if (!streamRef.current && controls?.stream) {
            streamRef.current = controls.stream;
          }

          if (result && !decodedOnceRef.current) {
            decodedOnceRef.current = true;
            // Delay allowing UI to teardown gracefully
            setTimeout(() => {
              try {
                onDecode?.(result.getText());
              } finally {
                stop(); // optional: stop after first successful decode
              }
            }, 0);
          } else if (err && err.name !== "NotFoundException") {
            // Handle error cases
            onError?.(err);
          }
        }
      );
    } catch (e) {
      console.error("Error in scanning: ", e);
      // If constraints fail, try fallback to deviceId-based approach
      try {
        const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
          (d) => d.kind === "videoinput"
        );
        if (!devices.length) throw new Error("No camera found");

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
        console.error("Fallback error: ", fallbackErr);
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
