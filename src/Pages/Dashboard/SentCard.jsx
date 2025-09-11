// src/Pages/Dashboard/SentCard.jsx
// ✅ No framer-motion. BRIGHT card (light canvas + neon accents). Professional & responsive.

export default function SentCard({
  s,
  FRONTEND_URL,
  qrImgForShareId,
  onEditExpiry,
  onExpireNow,
  onRevoke,
  onDelete,
}) {
  const isPublic = s.access === "public";
  const shareUrl = `${FRONTEND_URL}/share/${s.share_id}`;

  // Accents (public = cyan→indigo, private = violet→mint)
  const accent = isPublic
    ? "linear-gradient(90deg,#22D3EE,#7C5CFF)"
    : "linear-gradient(90deg,#8B5CF6,#34D399)";
  const ring = isPublic
    ? "0 18px 42px rgba(34,211,238,.22)"
    : "0 18px 42px rgba(139,92,246,.22)";

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); } catch {}
  };

  return (
    <div className="card scard scard--bright">
      {/* Bright theme styles (scoped) */}
      <style>{`
        /* Ensure we win against global .card styles */
        .card.scard.scard--bright{
          position:relative; overflow:hidden; border-radius:18px;
          background:
            radial-gradient(1200px 600px at -10% -20%, rgba(124,92,255,.18), transparent 60%),
            radial-gradient(900px 520px at 110% -30%, rgba(34,211,238,.16), transparent 55%),
            linear-gradient(180deg,#FFFFFF,#F8F4FF);
          color:#23264d;
          border:1px solid rgba(124,92,255,.28);
          box-shadow:${ring}, 0 10px 28px rgba(0,0,0,.06), inset 0 0 0 1px rgba(255,255,255,.35);
          transition:transform .18s ease, box-shadow .22s ease, border-color .2s ease, filter .2s ease;
          isolation:isolate;
        }
        .card.scard.scard--bright::before{
          content:"";
          position:absolute; inset:-1px;
          background:${accent};
          filter:blur(24px); opacity:.18; z-index:0;
        }
        .card.scard.scard--bright:hover{
          transform:translateY(-2px);
          box-shadow:${ring}, 0 16px 36px rgba(0,0,0,.08);
          border-color:rgba(124,92,255,.42);
          filter:saturate(1.02);
        }
        .card.scard .wrap{ position:relative; z-index:1; padding:16px 16px 14px }

        /* Header */
        .card.scard .card-head{
          display:flex; align-items:center; gap:12px; padding:12px;
          border-radius:14px;
          background:rgba(255,255,255,.75);
          box-shadow:inset 0 0 0 1px rgba(124,92,255,.18);
          backdrop-filter:blur(6px);
        }
        .card.scard .file-emoji{ font-size:22px }
        .card.scard .file-title{
          font-weight:900; letter-spacing:.2px; color:#1b1f45;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap
        }

        /* Meta */
        .card.scard .meta{
          display:flex; align-items:center; gap:10px; flex-wrap:wrap;
          margin:12px 2px 0; font-size:12px; color:#4a4f7b
        }
        .card.scard .badge{
          display:inline-flex; align-items:center; gap:6px;
          font-weight:900; font-size:11px; letter-spacing:.3px;
          padding:6px 10px; border-radius:999px;
          background:${accent}; color:#0b1220;
          box-shadow:inset 0 0 0 1px rgba(255,255,255,.32), 0 10px 22px rgba(0,0,0,.08)
        }
        .card.scard .dot{ opacity:.55 } .card.scard .muted{ opacity:.9 }

        /* QR + quick actions */
        .card.scard .qr-line{ margin:16px 2px 8px; display:flex; align-items:center; gap:12px; flex-wrap:wrap }
        .card.scard .qr-img{
          width:88px; height:88px; border-radius:12px;
          background:#ffffff; padding:6px;
          box-shadow:inset 0 0 0 1px rgba(124,92,255,.22), 0 8px 18px rgba(124,92,255,.12);
          cursor:pointer; transition:transform .15s ease, box-shadow .15s ease
        }
        .card.scard .qr-img:hover{
          transform:scale(1.03);
          box-shadow:inset 0 0 0 1px rgba(124,92,255,.32), 0 10px 22px rgba(124,92,255,.18)
        }

        /* Buttons */
        .card.scard .btn{
          appearance:none; border:0; cursor:pointer; border-radius:12px;
          padding:10px 12px; font-weight:800; font-size:13px; letter-spacing:.2px;
          background:rgba(124,92,255,.10); color:#262b57;
          box-shadow:inset 0 0 0 1px rgba(124,92,255,.28), 0 6px 18px rgba(124,92,255,.12);
          transition:transform .12s ease, background .12s ease, box-shadow .12s ease, filter .12s ease
        }
        .card.scard .btn:hover{ background:rgba(124,92,255,.16); transform:translateY(-1px) }
        .card.scard .btn:active{ transform:translateY(0) }
        .card.scard .btn:focus-visible{ outline:3px solid rgba(124,92,255,.35); outline-offset:2px }

        .card.scard .btn-accent{
          background:${accent}; color:#0b1220;
          box-shadow:0 10px 22px rgba(124,92,255,.22), inset 0 0 0 1px rgba(255,255,255,.28)
        }
        .card.scard .btn-accent:hover{ filter:brightness(1.03) }
        .card.scard .btn-danger{
          background:linear-gradient(90deg,#ff6b6b,#ff3d71); color:#fff;
          box-shadow:0 12px 24px rgba(255,61,113,.25), inset 0 0 0 1px rgba(255,255,255,.24)
        }
        .card.scard .btn-row{ display:flex; flex-wrap:wrap; gap:8px }

        /* Footer actions */
        .card.scard .card-actions{
          display:grid; grid-template-columns:repeat(2,minmax(0,1fr));
          gap:8px; margin-top:12px
        }

        /* Small screens */
        @media (max-width:520px){
          .card.scard .qr-img{ width:76px; height:76px }
          .card.scard .card-actions{ grid-template-columns:1fr }
        }
      `}</style>

      <div className="wrap">
        <div className="card-head">
          <div className="file-emoji" aria-hidden>🔗</div>
          <div className="file-title">{s.file_name || s.document_id}</div>
        </div>

        <div className="meta">
          <span className="badge">{isPublic ? "PUBLIC" : "PRIVATE"}</span>
          <span className="dot">•</span>
          <span className="muted">
            {s.expiry_time ? `Expires: ${s.expiry_time}` : "No expiry"}
          </span>
        </div>

        <div className="qr-line">
          <img
            src={qrImgForShareId(s.share_id)}
            alt="QR"
            className="qr-img"
            title="Open share in new tab"
            onClick={() => window.open(shareUrl, "_blank", "noopener,noreferrer")}
          />
          <div className="btn-row">
            <a className="btn btn-accent" href={shareUrl} target="_blank" rel="noopener noreferrer">Open</a>
            <button className="btn" onClick={copyLink}>Copy link</button>
            <a className="btn" href={qrImgForShareId(s.share_id)} download>Download QR</a>
          </div>
        </div>

        <div className="card-actions">
          <button className="btn" onClick={onEditExpiry}>Expiry…</button>
          <button className="btn" onClick={onExpireNow}>Expire now</button>
          <button className="btn btn-danger" onClick={onRevoke}>Revoke</button>
          <button className="btn btn-danger" onClick={onDelete}>Delete</button>
        </div>
      </div>
    </div>
  );
}
