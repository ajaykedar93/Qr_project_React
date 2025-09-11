// src/Pages/Dashboard/Dashboard.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";

import HeaderBar from "./HeaderBar.jsx";
import Uploader from "./Uploader.jsx";
import TabsBar from "./TabsBar.jsx";
import DocCard from "./DocCard.jsx";
import SentCard from "./SentCard.jsx";
import RecvCard from "./RecvCard.jsx";
import ConfirmModal from "./ConfirmModal.jsx";
import ExpiryModal from "./ExpiryModal.jsx";
import StyleBright from "./StyleBright.jsx";
import CardSkeleton from "./Skeleton.jsx";
import EmptyState from "./EmptyState.jsx";
import SizeReduction from "./SizeReduction.jsx"; // ✅ reduce tab page
import LoadingOverlay from "./LoadingOverlay.jsx"; // ✅ FULL-PAGE LOADER

const API_BASE = "https://qr-project-express.onrender.com";
const FRONTEND_URL = "https://qr-project-react.vercel.app/";

// ---------- helpers ----------
const qrImgForShareId = (share_id) => {
  if (!share_id) return "";
  const url = `${FRONTEND_URL}/share/${share_id}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    url
  )}`;
};
const fmtBytes = (n) => {
  if (n == null) return "-";
  const k = 1024,
    sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.max(0, Math.floor(Math.log(n) / Math.log(k)));
  return `${(n / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};
const saveCache = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
const readCache = (k, f) => {
  try {
    return JSON.parse(localStorage.getItem(k) || "null") ?? f;
  } catch {
    return f;
  }
};

// email regex (loose but practical)
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export default function Dashboard() {
  const user = useMemo(
    () => JSON.parse(localStorage.getItem("user") || "{}"),
    []
  );
  const [activeTab, setActiveTab] = useState("docs"); // "docs" | "private" | "public" | "received" | "reduce"

  // axios (auth)
  const api = useMemo(() => {
    const i = axios.create({ baseURL: API_BASE });
    i.interceptors.request.use((cfg) => {
      const t = localStorage.getItem("token");
      if (t) cfg.headers.Authorization = `Bearer ${t}`;
      return cfg;
    });
    return i;
  }, []);

  // state
  const [loading, setLoading] = useState(true);
  const [busyCount, setBusyCount] = useState(0); // ✅ tracks in-flight API calls
  const incBusy = () => setBusyCount((c) => c + 1);
  const decBusy = () => setBusyCount((c) => Math.max(0, c - 1));

  const [docs, setDocs] = useState(() => readCache("docs_cache", []));
  const [myShares, setMyShares] = useState(() =>
    readCache("myshares_cache", [])
  );
  const [received, setReceived] = useState(() =>
    readCache("received_cache", [])
  );
  const privateShares = useMemo(
    () => myShares.filter((s) => s.access === "private"),
    [myShares]
  );
  const publicShares = useMemo(
    () => myShares.filter((s) => s.access === "public"),
    [myShares]
  );

  // share modal
  const [shareFor, setShareFor] = useState(null); // document_id
  const [shareForm, setShareForm] = useState({
    to_user_email: "",
    expiry_time: "",
    access: "private",
  });
  const [shareResult, setShareResult] = useState(null);
  const [notifying, setNotifying] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(null); // true | false | null
  const emailCheckSeq = useRef(0);

  // confirm/edit modals
  const [modal, setModal] = useState(null);
  // { type: 'deleteDoc', document_id, file_name }
  // { type: 'deleteShare', share_id }
  // { type: 'editExpiry', share_id, current }

  // uploader (dropzone)
  const onDrop = (accepted) => accepted?.[0] && uploadFile(accepted[0]);
  const { getRootProps, getInputProps, isDragActive, open: openPicker } =
    useDropzone({ onDrop, noClick: true });

  // load dashboard data
  async function load() {
    try {
      setLoading(true);
      const [a, b, c] = await Promise.all([
        api.get("/documents"),
        api.get("/shares/mine"),
        api.get("/shares/received"),
      ]);
      setDocs(a.data || []);
      setMyShares(b.data || []);
      setReceived(c.data || []);
      saveCache("docs_cache", a.data || []);
      saveCache("myshares_cache", b.data || []);
      saveCache("received_cache", c.data || []);
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  // upload
  async function uploadFile(file) {
    incBusy();
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/documents/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDocs((d) => {
        const n = [data, ...d];
        saveCache("docs_cache", n);
        return n;
      });
      toast.success("Uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      decBusy();
    }
  }

  // delete doc (with modal) — ✅ optimistic + verify on error
  function askDeleteDoc(d) {
    setModal({
      type: "deleteDoc",
      document_id: d.document_id,
      file_name: d.file_name,
    });
  }
  async function confirmDeleteDoc() {
    if (!modal?.document_id) return;
    const id = modal.document_id;
    const prev = docs;
    // optimistic
    const next = prev.filter((x) => x.document_id !== id);
    setDocs(next);
    saveCache("docs_cache", next);
    setModal(null);

    incBusy();
    try {
      await api.delete(`/documents/${id}`, {
        validateStatus: (s) => (s >= 200 && s < 300) || s === 404 || s === 410,
      });
      toast.success("Document deleted");
    } catch {
      // verify once
      try {
        const { data } = await api.get("/documents");
        const stillThere = (data || []).some((d) => d.document_id === id);
        setDocs(data || []);
        saveCache("docs_cache", data || []);
        if (!stillThere) toast.success("Document deleted");
        else {
          toast.error("Delete failed");
          // rollback
          setDocs(prev);
          saveCache("docs_cache", prev);
        }
      } catch {
        // rollback if cannot verify
        setDocs(prev);
        saveCache("docs_cache", prev);
        toast.error("Delete failed");
      }
    } finally {
      decBusy();
    }
  }

  // shares ops
  async function revokeShare(share_id) {
    incBusy();
    try {
      await api.post(`/shares/${share_id}/revoke`);
      const mine = await api.get("/shares/mine").then((r) => r.data || []);
      setMyShares(mine);
      saveCache("myshares_cache", mine);
      toast.success("Share revoked");
    } catch {
      toast.error("Failed to revoke");
    } finally {
      decBusy();
    }
  }
  function askDeleteShare(share_id) {
    setModal({ type: "deleteShare", share_id });
  }
  // ✅ optimistic + verify on error
  async function confirmDeleteShare() {
    if (!modal?.share_id) return;
    const id = modal.share_id;
    const prev = myShares;
    const next = prev.filter((x) => x.share_id !== id);
    setMyShares(next);
    saveCache("myshares_cache", next);
    setModal(null);

    incBusy();
    try {
      await api.delete(`/shares/${id}`, {
        validateStatus: (s) => (s >= 200 && s < 300) || s === 404 || s === 410,
      });
      toast.success("Share deleted");
    } catch {
      try {
        const mine = await api.get("/shares/mine").then((r) => r.data || []);
        setMyShares(mine);
        saveCache("myshares_cache", mine);
        const stillThere = mine.some((s) => s.share_id === id);
        if (!stillThere) toast.success("Share deleted");
        else toast.error("Failed to delete share");
      } catch {
        setMyShares(prev);
        saveCache("myshares_cache", prev);
        toast.error("Failed to delete share");
      }
    } finally {
      decBusy();
    }
  }
  function openEditExpiry(share) {
    setModal({
      type: "editExpiry",
      share_id: share.share_id,
      current: share.expiry_time || "",
    });
  }
  async function submitExpiry(newISO) {
    incBusy();
    try {
      await api.patch(`/shares/${modal.share_id}/expiry`, {
        expiry_time: newISO || null,
      });
      const mine = await api.get("/shares/mine").then((r) => r.data || []);
      setMyShares(mine);
      saveCache("myshares_cache", mine);
      toast.success(newISO ? "Expiry updated" : "Expiry removed");
      setModal(null);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to update expiry");
    } finally {
      decBusy();
    }
  }
  async function expireNow(share_id) {
    incBusy();
    try {
      await api.post(`/shares/${share_id}/expire-now`);
      const mine = await api.get("/shares/mine").then((r) => r.data || []);
      setMyShares(mine);
      saveCache("myshares_cache", mine);
      toast.success("Share expired");
    } catch {
      toast.error("Failed to expire");
    } finally {
      decBusy();
    }
  }

  // notify via server
  async function notifyShare(share_id, email) {
    incBusy();
    try {
      setNotifying(true);
      await api.post("/shares/notify-share", { share_id });
      toast.success(`Email sent to ${email || "recipient"}`);
    } catch {
      toast.error("Failed to send email");
    } finally {
      setNotifying(false);
      decBusy();
    }
  }

  // create share
  async function createShare() {
    incBusy();
    try {
      const payload = {
        document_id: shareFor,
        to_email: shareForm.to_user_email || null,
        expiry_time: shareForm.expiry_time || null,
        access: shareForm.access,
      };
      const { data } = await api.post("/shares", payload);

      const result = {
        ...data,
        url: `${FRONTEND_URL}/share/${data.share_id}`,
        to_user_email: shareForm.to_user_email,
      };
      setShareResult(result);

      const mine = await api.get("/shares/mine").then((r) => r.data || []);
      setMyShares(mine);
      saveCache("myshares_cache", mine);

      if (result.to_user_email)
        await notifyShare(result.share_id, result.to_user_email);
      else toast.success("Share created");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Share failed");
    } finally {
      decBusy();
    }
  }

  // real-time email check (no overlay; lightweight)
  useEffect(() => {
    const raw = (shareForm.to_user_email || "").trim();
    if (!raw) {
      setEmailExists(null);
      setCheckingEmail(false);
      return;
    }
    if (!emailRe.test(raw)) {
      setEmailExists(null);
      setCheckingEmail(false);
      return;
    }
    const seq = ++emailCheckSeq.current;
    setCheckingEmail(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("/auth/exists", {
          params: { email: raw.toLowerCase() },
        });
        if (seq !== emailCheckSeq.current) return;
        setEmailExists(!!data?.exists);
        setShareForm((s) => {
          if (data?.exists && s.access !== "private")
            return { ...s, access: "private" };
          if (!data?.exists && s.access !== "public")
            return { ...s, access: "public" };
          return s;
        });
      } catch {
        if (seq !== emailCheckSeq.current) return;
        setEmailExists(null);
      } finally {
        if (seq === emailCheckSeq.current) setCheckingEmail(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [shareForm.to_user_email, api]);

  // ---------- render ----------
  return (
    <div className="wrap">
      <StyleBright />

      {/* local style to brighten share sections */}
      <style>{`
        .share-cards {
          background:
            radial-gradient(900px 420px at 10% -10%, rgba(124,92,255,.18), transparent 60%),
            radial-gradient(900px 420px at 90% -20%, rgba(34,211,238,.16), transparent 55%),
            linear-gradient(180deg, #0e1528, #0a0f1c);
          border-radius: 18px;
          padding: 10px;
          box-shadow: 0 18px 48px rgba(124,92,255,.16), inset 0 0 0 1px rgba(255,255,255,.06);
        }
      `}</style>

      <HeaderBar email={user?.email} />

      {/* Hide uploader on "reduce" tab, since that page has its own uploader */}
      {activeTab !== "reduce" && (
        <Uploader
          getRootProps={getRootProps}
          getInputProps={getInputProps}
          isDragActive={isDragActive}
          openPicker={openPicker}
        />
      )}

      <TabsBar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="panel">
        {activeTab === "docs" &&
          (loading ? (
            <CardSkeleton count={6} />
          ) : docs.length ? (
            <div
              className="cards"
              role="region"
              aria-labelledby="tab-docs"
              id="panel-docs"
            >
              {docs.map((d) => (
                <DocCard
                  key={d.document_id}
                  d={d}
                  FRONTEND_URL={FRONTEND_URL}
                  fmtBytes={fmtBytes}
                  onShare={() => {
                    setShareFor(d.document_id);
                    setShareForm({
                      to_user_email: "",
                      expiry_time: "",
                      access: "private",
                    });
                    setShareResult(null);
                  }}
                  onDelete={() => askDeleteDoc(d)}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No documents yet." />
          ))}

        {activeTab === "private" &&
          (loading ? (
            <CardSkeleton count={6} />
          ) : privateShares.length ? (
            <div
              className="cards share-cards"
              role="region"
              aria-labelledby="tab-private"
              id="panel-private"
            >
              {privateShares.map((s) => (
                <SentCard
                  key={s.share_id}
                  s={s}
                  FRONTEND_URL={FRONTEND_URL}
                  qrImgForShareId={qrImgForShareId}
                  onEditExpiry={() => openEditExpiry(s)}
                  onExpireNow={() => expireNow(s.share_id)}
                  onRevoke={() => revokeShare(s.share_id)}
                  onDelete={() => askDeleteShare(s.share_id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No private shares yet." />
          ))}

        {activeTab === "public" &&
          (loading ? (
            <CardSkeleton count={6} />
          ) : publicShares.length ? (
            <div
              className="cards share-cards"
              role="region"
              aria-labelledby="tab-public"
              id="panel-public"
            >
              {publicShares.map((s) => (
                <SentCard
                  key={s.share_id}
                  s={s}
                  FRONTEND_URL={FRONTEND_URL}
                  qrImgForShareId={qrImgForShareId}
                  onEditExpiry={() => openEditExpiry(s)}
                  onExpireNow={() => expireNow(s.share_id)}
                  onRevoke={() => revokeShare(s.share_id)}
                  onDelete={() => askDeleteShare(s.share_id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No public shares yet." />
          ))}

        {activeTab === "received" &&
          (loading ? (
            <CardSkeleton count={6} />
          ) : received.length ? (
            <div
              className="cards"
              role="region"
              aria-labelledby="tab-received"
              id="panel-received"
            >
              {received.map((r) => (
                <RecvCard
                  key={r.share_id}
                  r={r}
                  FRONTEND_URL={FRONTEND_URL}
                  qrImgForShareId={qrImgForShareId}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No shares received." />
          ))}

        {/* ✅ Reduce tab content */}
        {activeTab === "reduce" && (
          <div role="region" aria-labelledby="tab-reduce" id="panel-reduce">
            <SizeReduction />
          </div>
        )}
      </div>

      {/* Share modal */}
      <AnimatePresence>
        {shareFor && (
          <div
            className="modal-backdrop"
            onClick={() => {
              setShareFor(null);
              setShareResult(null);
              setEmailExists(null);
            }}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Share document</h3>

              <div className="form-grid">
                <label className="lbl">Recipient email</label>
                <div>
                  <input
                    className="input"
                    placeholder="you@example.com (optional for public)"
                    value={shareForm.to_user_email}
                    onChange={(e) =>
                      setShareForm((s) => ({
                        ...s,
                        to_user_email: e.target.value,
                      }))
                    }
                    autoComplete="email"
                  />
                  {!!shareForm.to_user_email && (
                    <div className="hint">
                      {checkingEmail
                        ? "Checking…"
                        : emailExists === true
                        ? "Registered user found — Private recommended."
                        : emailExists === false
                        ? "Not registered — Public recommended."
                        : ""}
                    </div>
                  )}
                </div>

                <label className="lbl">Access</label>
                <select
                  className="input"
                  value={shareForm.access}
                  onChange={(e) =>
                    setShareForm((s) => ({ ...s, access: e.target.value }))
                  }
                >
                  <option value="private">Private (OTP, can download)</option>
                  <option value="public">Public (view only)</option>
                </select>

                <label className="lbl">Expiry (optional)</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={shareForm.expiry_time}
                  onChange={(e) =>
                    setShareForm((s) => ({ ...s, expiry_time: e.target.value }))
                  }
                />
              </div>

              <div className="modal-actions">
                <button className="btn btn-accent" onClick={createShare}>
                  Create &amp; Send
                </button>
                <button
                  className="btn btn-light"
                  onClick={() => {
                    setShareFor(null);
                    setShareResult(null);
                    setEmailExists(null);
                  }}
                >
                  Close
                </button>
              </div>

              {shareResult && (
                <div className="result">
                  <p className="ok">
                    ✅ Share created
                    {shareResult.to_user_email
                      ? ` and email sent to ${shareResult.to_user_email}.`
                      : "."}
                  </p>
                  <div className="qr-row">
                    <img
                      src={qrImgForShareId(shareResult.share_id)}
                      alt="QR"
                      className="qr-big"
                    />
                    <div className="link-box">
                      <div className="muted">Link</div>
                      <a
                        className="bold-link"
                        href={shareResult.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {shareResult.url}
                      </a>
                      <div className="btn-row">
                        <button
                          className="btn btn-light"
                          onClick={() => {
                            navigator.clipboard.writeText(shareResult.url);
                            toast.success("Link copied");
                          }}
                        >
                          Copy link
                        </button>
                        {shareResult.to_user_email && (
                          <button
                            className="btn btn-accent"
                            disabled={notifying}
                            onClick={() =>
                              notifyShare(
                                shareResult.share_id,
                                shareResult.to_user_email
                              )
                            }
                            title="Resend email (with embedded QR image)"
                          >
                            {notifying ? "Sending…" : "Resend email"}
                          </button>
                        )}
                        <a
                          className="btn btn-light"
                          href={qrImgForShareId(shareResult.share_id)}
                          download
                        >
                          Download QR
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm / Edit modals */}
      <AnimatePresence>
        {modal?.type === "deleteDoc" && (
          <ConfirmModal
            title="Delete document?"
            desc={`"${modal.file_name}" will be permanently removed.`}
            confirmText="Delete"
            tone="danger"
            onConfirm={confirmDeleteDoc}
            onClose={() => setModal(null)}
          />
        )}
        {modal?.type === "deleteShare" && (
          <ConfirmModal
            title="Delete share?"
            desc="This will remove the share link permanently."
            confirmText="Delete"
            tone="danger"
            onConfirm={confirmDeleteShare}
            onClose={() => setModal(null)}
          />
        )}
        {modal?.type === "editExpiry" && (
          <ExpiryModal
            current={modal.current}
            onSubmit={submitExpiry}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>

      {/* ✅ Full-page loading spinner while ANY API is in-flight */}
      <LoadingOverlay show={loading || busyCount > 0} label="Loading…" />
    </div>
  );
}
