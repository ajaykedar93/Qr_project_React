// src/Pages/Dashboard/HeaderBar.jsx
import { useState } from "react";
import logoPng from "../../assets/secure_doc.png";

export default function HeaderBar({ email }) {
  const [imgOk, setImgOk] = useState(true);

  return (
    <>
      {/* Local styles so the header looks great even without global CSS */}
      <style>{`
        .hb-wrap{
          display:flex;align-items:center;gap:12px;
          padding:10px 0;margin-bottom:12px;
        }
        .hb-brand{
          display:inline-flex;align-items:center;gap:10px;
          font-weight:900;font-size:clamp(18px,2.6vw,24px);
          line-height:1;
          background: linear-gradient(90deg,#7C5CFF,#22D3EE,#FF6A3D,#FF4D88,#7C5CFF);
          -webkit-background-clip:text;background-clip:text;color:transparent;
          background-size: 200% 100%;
          animation: hb-sheen 8s linear infinite;
          letter-spacing:.2px;
          filter: drop-shadow(0 6px 16px rgba(124,92,255,.20));
        }
        .hb-logo{
          width:100px;height:100px;display:grid;place-items:center;
          background:#fff;border:1px solid rgba(124,92,255,.25);
          border-radius:10px;overflow:hidden;
          box-shadow:
            0 8px 24px rgba(124,92,255,.22),
            inset 0 0 0 1px rgba(255,255,255,.65);
          position:relative;
          transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
        }
        .hb-logo::after{
          content:"";position:absolute;inset:-8px;
          background: radial-gradient(40% 40% at 50% 50%, rgba(124,92,255,.18), transparent 70%);
          pointer-events:none;opacity:.9;filter: blur(8px);
        }
        .hb-logo:hover{ transform: translateY(-1px) scale(1.02); }

        .hb-email{
          margin-left:auto;display:inline-flex;align-items:center;gap:8px;
          padding:8px 12px;border-radius:999px;
          background: linear-gradient(180deg, rgba(255,255,255,.65), rgba(230,248,255,.65));
          border:1px solid rgba(124,92,255,.28);
          box-shadow: 0 10px 26px rgba(124,92,255,.18);
          color:#2F1B70;font-size:13px;max-width:60%;
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
        }
        .hb-dot{
          width:8px;height:8px;border-radius:999px;
          background: #34d399; /* mint online dot */
          box-shadow: 0 0 0 3px rgba(52,211,153,.18);
        }

        .hb-underline{
          width:100%;height:2px;margin-top:6px;border-radius:999px;
          background: linear-gradient(90deg,transparent, rgba(124,92,255,.45), transparent);
          position:relative;overflow:hidden;
        }
        .hb-underline::before{
          content:"";position:absolute;inset:0;
          background: linear-gradient(90deg,transparent, rgba(34,211,238,.55), transparent);
          transform: translateX(-100%);
          animation: hb-sweep 2.2s ease-in-out infinite;
        }

        @keyframes hb-sheen {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
        @keyframes hb-sweep {
          0%, 10% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          90%, 100% { transform: translateX(100%); }
        }

        /* Motion respect */
        @media (prefers-reduced-motion: reduce){
          .hb-brand{ animation: none; }
          .hb-underline::before{ animation: none; }
          .hb-logo{ transition: none; }
        }

        @media (max-width: 560px){
          .hb-email{ max-width: 52%; padding: 6px 10px; }
          .hb-logo{ width:32px;height:32px; }
        }
      `}</style>

      <div className="hb-wrap">
        <span className="hb-logo" aria-hidden>
          {imgOk ? (
            <img
              src={logoPng}
              alt="Secure-Doc logo"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              onError={() => setImgOk(false)}
            />
          ) : (
            <span role="img" aria-label="lock" style={{ fontSize: 18 }}>🔒</span>
          )}
        </span>

        <div className="hb-brand" title="Secure-Doc">
          Secure-Doc
        </div>

        {email ? (
          <div className="hb-email" title={email}>
            <span className="hb-dot" aria-hidden />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{email}</span>
          </div>
        ) : null}
      </div>

      {/* subtle animated underline accent */}
      <div className="hb-underline" aria-hidden />
    </>
  );
}
