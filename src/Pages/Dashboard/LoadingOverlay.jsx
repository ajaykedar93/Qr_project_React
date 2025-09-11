import { useEffect } from "react";

export default function LoadingOverlay({ show, label = "Loading…" }) {
  useEffect(() => {
    // prevent scroll while loading
    if (show) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => (document.body.style.overflow = prev);
    }
  }, [show]);

  if (!show) return null;

  return (
    <>
      {/* local styles for spinner + animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .lo-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(17, 24, 39, 0.55); /* semi-dark */
          backdrop-filter: blur(2px);
          z-index: 9999;
          display: grid;
          place-items: center;
        }
        .lo-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 24px 28px;
          border-radius: 16px;
          background: #0b1220;
          color: #fff;
          box-shadow: 0 12px 40px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.08);
        }
        .lo-spinner {
          width: 54px;
          height: 54px;
          border-radius: 9999px;
          border: 4px solid rgba(255,255,255,.22);
          border-top-color: #7C5CFF; /* accent */
          animation: spin .8s linear infinite;
        }
        .lo-label {
          font-size: 14px;
          opacity: .9;
          letter-spacing: .3px;
        }
      `}</style>

      <div className="lo-backdrop" role="status" aria-live="polite" aria-busy="true">
        <div className="lo-card">
          <div className="lo-spinner" />
          <div className="lo-label">{label}</div>
        </div>
      </div>
    </>
  );
}
