// src/Pages/Dashboard/StyleBright.jsx
export default function StyleBright() {
  return (
    <style>{`
/* ===== App background (matches Home.jsx) ===== */
html, body, #root {
  min-height: 100%;
  background-image:
    radial-gradient(46rem 24rem at 12% 90%, rgba(255,106,61,.22) 0%, rgba(255,106,61,0) 60%),
    radial-gradient(42rem 22rem at 88% 12%, rgba(255,77,136,.20) 0%, rgba(255,77,136,0) 60%),
    linear-gradient(135deg, #FFF7E6 0%, #E6F8FF 52%, #F6E5FF 100%);
}

/* ===== Base text colors (no black) ===== */
:root{
  --ink: #2F1B70; --ink-soft: #5B3FB8; --card: #FFFFFF; --border: rgba(124,92,255,.25);
  --glow-indigo: rgba(124,92,255,.28); --glow-cyan: rgba(34,211,238,.24); --glow-pink: rgba(255,77,136,.22);
}

/* layout */
.wrap{ max-width:1280px;margin:24px auto; padding:0 clamp(12px, 2vw, 16px); color:var(--ink); }
.header{display:flex;align-items:center;margin-bottom:14px;gap:10px;}
.brand{
  font-weight:900;font-size:clamp(18px,2.6vw,24px);
  display:inline-flex;align-items:center;gap:8px;
  background:linear-gradient(90deg,#FF6A3D,#FF4D88,#7C5CFF);
  -webkit-background-clip:text;background-clip:text;color:transparent
}
.logo{ display:grid;place-items:center;width:24px;height:24px;background:#fff;border:1px solid var(--border);border-radius:8px;box-shadow:0 6px 18px var(--glow-indigo) }
.who{ margin-left:auto;font-size:13px;color:var(--ink-soft);max-width:50%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap }

/* uploader */
.uploader{ border:2px dashed rgba(124,92,255,.45); border-radius:14px;padding: clamp(14px,3vw,20px);text-align:center;
  background:linear-gradient(180deg,#FFFFFF, rgba(246,229,255,.45)); color:var(--ink); box-shadow:0 12px 28px var(--glow-indigo);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, filter .18s ease; }
.uploader.drag{ transform:translateY(-2px); border-color:#7C5CFF; box-shadow:0 18px 42px var(--glow-indigo); filter:saturate(1.05) }
.uploader-line{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap}
.uploader .sep{color:rgba(124,92,255,.8)}
.uploader-hint{margin-top:6px;font-size:12px;color:var(--ink-soft)}

/* tabs */
.tabs{display:flex;gap:10px;margin:14px 0;overflow:auto;padding-bottom:4px}
.tabs::-webkit-scrollbar{height:8px}
.tabs::-webkit-scrollbar-thumb{background:rgba(124,92,255,.18);border-radius:999px}
.tab{
  border:none;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.72);color:var(--ink);font-weight:900;cursor:pointer;white-space:nowrap;
  box-shadow:inset 0 0 0 1px var(--border), 0 8px 20px rgba(124,92,255,.12); transition: transform .12s, box-shadow .12s, filter .12s, background .12s;
}
.tab:hover{transform:translateY(-1px);box-shadow:0 12px 28px var(--glow-indigo)}
.tab.active{ background: var(--tab-accent); color:#fff; box-shadow:0 14px 36px var(--glow-pink), 0 0 0 1px rgba(255,255,255,.35) inset; }

/* panel */
.panel{ background:var(--card); border:1px solid var(--border); border-radius:14px; padding: clamp(12px,2vw,16px); box-shadow:0 14px 36px rgba(124,92,255,.15); backdrop-filter: blur(4px); }

/* cards grid */
.cards{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.card{ background:var(--card); border:1px solid var(--border); border-radius:14px;padding:14px; box-shadow:0 10px 26px rgba(34,211,238,.18);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, filter .18s ease; }
.card:hover{ transform:translateY(-2px); box-shadow:0 16px 44px var(--glow-cyan); border-color:rgba(124,92,255,.4); }
.hover-tilt{will-change:transform}

/* card content */
.card-head{display:flex;align-items:center;gap:10px;margin-bottom:6px}
.file-emoji{font-size:20px}
.file-title{font-weight:900;color:var(--ink);word-break:break-word;line-height:1.2}
.meta{display:flex;align-items:center;flex-wrap:wrap;gap:8px;color:var(--ink-soft);font-size:13px;margin-bottom:12px}
.dot{opacity:.6}
.qr-line{display:flex;align-items:center;gap:10px;margin-bottom:12px}

/* buttons */
.btn{ border:none;border-radius:10px;padding:8px 12px;font-weight:900;cursor:pointer; transition:transform .08s, box-shadow .12s, filter .12s; letter-spacing:.2px; }
.btn:active{transform:translateY(1px)}
.btn:focus-visible{outline:3px solid rgba(124,92,255,.28);outline-offset:2px}
.btn-light{ background:rgba(255,255,255,.82); color:var(--ink); box-shadow:0 8px 18px rgba(124,92,255,.14); border:1px solid var(--border); }
.btn-light:hover{filter:brightness(1.03);box-shadow:0 10px 22px rgba(124,92,255,.18)}
.btn-accent{ background:linear-gradient(90deg,#FF6A3D,#FF4D88,#7C5CFF); color:#2F1B70; box-shadow:0 10px 26px rgba(255,77,136,.26); border:1px solid rgba(255,228,154,.6); }
.btn-accent:hover{box-shadow:0 12px 30px rgba(124,92,255,.30)}
.btn-danger{ background:#FF4D88;color:#fff; box-shadow:0 10px 22px rgba(255,77,136,.26); border:1px solid rgba(255,228,154,.5); }
.btn-danger:hover{box-shadow:0 12px 26px rgba(255,77,136,.32)}

/* badges */
.badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:900}
.badge-green{background:linear-gradient(90deg,#E6F8FF,#F6E5FF);color:#2F1B70;border:1px solid var(--border)}
.badge-mint{background:linear-gradient(90deg,#FFF7E6,#E6F8FF);color:#2F1B70;border:1px solid var(--border)}

/* linkish */
.linkish{background:none;border:none;color:#7C5CFF;cursor:pointer;font-weight:900}
.linkish:hover{text-decoration:underline}

/* qr */
.qr-img{ width:48px;height:48px;border-radius:10px;background:#fff;padding:4px; box-shadow:0 10px 22px rgba(124,92,255,.16);cursor:pointer;border:1px solid var(--border) }
.qr-big{ width:220px;height:220px;border-radius:12px;background:#fff;padding:10px; box-shadow:0 12px 30px rgba(34,211,238,.22);border:1px solid var(--border) }

/* empty */
.empty{padding:20px;text-align:center}
.empty-emoji{font-size:28px}
.empty-title{font-weight:900;color:var(--ink);margin-top:6px}
.empty-hint{color:var(--ink-soft);font-size:14px}

/* modal */
.modal-backdrop{ position:fixed;inset:0;background:rgba(124,92,255,.20); backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:12px }
.modal{ width:min(760px,92vw);background:var(--card); border:1px solid var(--border);border-radius:16px; box-shadow:0 20px 60px rgba(34,211,238,.28);padding:20px }
.modal.small{width:min(480px,92vw)}
.modal-title{margin:0 0 10px 0;color:var(--ink)}
.form-grid{display:grid;grid-template-columns:160px 1fr;gap:12px;align-items:center;margin-top:8px}
@media (max-width:560px){.form-grid{grid-template-columns:1fr}}
.lbl{font-size:13px;color:var(--ink-soft)}
.input{ width:100%;padding:10px;border-radius:10px;border:1px solid var(--border); background:#FFFFFF;color:var(--ink);transition:border-color .12s, box-shadow .12s, transform .12s }
.input:focus{border-color:#7C5CFF;box-shadow:0 0 0 3px rgba(124,92,255,.22);transform:translateY(-1px)}
.hint{font-size:12px;margin-top:6px;color:#FF4D88}
.modal-actions{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}
.result{ margin-top:16px;padding:14px;border:1px dashed var(--border); border-radius:12px;background:linear-gradient(180deg,#FFFFFF,rgba(230,248,255,.6)) }
.ok{color:#2F1B70;font-weight:900}
.qr-row{display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:8px}
.link-box{min-width:260px;max-width:100%}
.bold-link{color:#7C5CFF;font-weight:900;word-break:break-all}
.btn-row{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}

/* skeleton cards */
.skeleton-cards{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.skel-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px}
.skel{background:rgba(230,248,255,.7);border-radius:8px;height:14px;overflow:hidden;position:relative}
.skel::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,#FFFFFF,transparent);animation:shimmer 1.2s infinite}
.skel-line{height:16px;margin:8px 0}
@keyframes shimmer{100%{transform:translateX(100%)}}

/* motion preference */
@media (prefers-reduced-motion: reduce){
  *{animation-duration:.001ms !important; animation-iteration-count:1 !important; transition:none !important; scroll-behavior:auto !important;}
}

/* ======================================================================
   BRIGHTEN PRIVATE & PUBLIC SHARE LIST + CARDS (override any dark styles)
   ====================================================================== */

/* Make the share panels themselves bright */
#panel-private, #panel-public {
  background:
    radial-gradient(900px 420px at 10% -10%, rgba(124,92,255,.18), transparent 60%),
    radial-gradient(900px 420px at 90% -20%, rgba(34,211,238,.16), transparent 55%),
    linear-gradient(180deg, #FFFFFF, #F8F4FF);
  border-radius: 18px;
  padding: 6px;
}

/* Ensure cards inside private/public are light — even if a component added dark */
#panel-private .card, #panel-public .card {
  background:
    radial-gradient(1200px 600px at -10% -20%, rgba(124,92,255,.14), transparent 60%),
    radial-gradient(900px 520px at 110% -30%, rgba(34,211,238,.12), transparent 55%),
    #FFFFFF !important;
  color: var(--ink) !important;
  border-color: rgba(124,92,255,.28) !important;
  box-shadow: 0 10px 26px rgba(124,92,255,.16), inset 0 0 0 1px rgba(255,255,255,.35) !important;
}

/* If SentCard injected a glowing ::before layer for darkness, soften/align it */
#panel-private .card::before, #panel-public .card::before {
  opacity: .14 !important;
  filter: blur(22px) !important;
}

/* Tweak headings/meta within share cards for readability on bright bg */
#panel-private .card .file-title,
#panel-public  .card .file-title { color: var(--ink) !important; }
#panel-private .card .meta,
#panel-public  .card .meta { color: var(--ink-soft) !important; }

/* Buttons inside share cards: brighten defaults */
#panel-private .card .btn,
#panel-public  .card .btn {
  background: rgba(124,92,255,.10) !important;
  color: var(--ink) !important;
  box-shadow: inset 0 0 0 1px rgba(124,92,255,.28), 0 6px 18px rgba(124,92,255,.12) !important;
}
#panel-private .card .btn:hover,
#panel-public  .card .btn:hover {
  background: rgba(124,92,255,.16) !important;
}

#panel-private .card .btn-accent,
#panel-public  .card .btn-accent {
  color: #0b1220 !important; /* accent stays readable */
}

/* QR tile on bright background */
#panel-private .card .qr-img,
#panel-public  .card .qr-img {
  background: #fff !important;
  box-shadow: inset 0 0 0 1px rgba(124,92,255,.22), 0 8px 18px rgba(124,92,255,.12) !important;
}
`}</style>
  );
}
