export default function EmptyState({ title = "Nothing to show", hint }) {
  return (
    <div className="empty">
      <div className="empty-emoji" aria-hidden>📄</div>
      <div className="empty-title">{title}</div>
      {hint && <div className="empty-hint">{hint}</div>}
    </div>
  );
}
