// src/Pages/QRScanner.jsx
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function QRScanner({ onDecode, onError }) {
  const videoRef = useRef(null);
  const [reader] = useState(() => new BrowserMultiFormatReader());
  const [active, setActive] = useState(false);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const preferred =
          devices?.find((d) => /back|environment/i.test(d.label)) || devices?.[0];

        if (!preferred) throw new Error("No camera found");

        if (!isMounted) return;
        setActive(true);

        await reader.decodeFromVideoDevice(
          preferred.deviceId,
          videoRef.current,
          (result, err) => {
            if (result) {
              onDecode?.(result.getText());
            } else if (err && err.name !== "NotFoundException") {
              onError?.(err);
            }
          }
        );
      } catch (e) {
        if (isMounted) onError?.(e);
      }
    })();

    return () => {
      isMounted = false;
      try {
        reader.reset();
      } catch {
        // ignore
      }
      setActive(false);
    };
  }, [reader, onDecode, onError]);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 360 }}>
      <video
        ref={videoRef}
        style={{ width: "100%", borderRadius: 12, background: "#000" }}
        muted
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
