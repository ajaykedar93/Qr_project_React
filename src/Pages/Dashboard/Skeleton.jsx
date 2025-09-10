// src/Pages/Dashboard/CardSkeleton.jsx
export default function CardSkeleton({ count = 6 }) {
  const items = Array.from({ length: count });

  return (
    <div className="skeleton-cards" role="list">
      {items.map((_, i) => (
        <div
          className="skel-card"
          key={i}
          role="status"
          aria-busy="true"
          aria-label="Loading card"
          style={{
            background: "linear-gradient(180deg, #ffffff, #f9f7ff)",
            border: "1px solid rgba(124,92,255,.25)",
            borderRadius: 14,
            padding: 16,
            boxShadow: "0 10px 26px rgba(124,92,255,.12)",
          }}
        >
          {/* Header: emoji/avatar + title */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div
              className="skel"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                flex: "0 0 auto",
                background:
                  "linear-gradient(90deg, rgba(124,92,255,.18), rgba(196,181,253,.25))",
              }}
            />
            <div
              className="skel"
              style={{
                height: 16,
                width: "60%",
                borderRadius: 8,
                background:
                  "linear-gradient(90deg, rgba(124,92,255,.18), rgba(196,181,253,.25))",
              }}
            />
          </div>

          {/* Meta line(s) */}
          <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
            <div
              className="skel"
              style={{
                height: 14,
                width: "90%",
                borderRadius: 8,
                background:
                  "linear-gradient(90deg, rgba(124,92,255,.14), rgba(196,181,253,.22))",
              }}
            />
            <div
              className="skel"
              style={{
                height: 14,
                width: "70%",
                borderRadius: 8,
                background:
                  "linear-gradient(90deg, rgba(124,92,255,.14), rgba(196,181,253,.22))",
              }}
            />
          </div>

          {/* QR + Open button row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div
              className="skel"
              style={{
                width: 52,
                height: 52,
                borderRadius: 12,
                background:
                  "linear-gradient(90deg, rgba(124,92,255,.20), rgba(196,181,253,.28))",
              }}
            />
            <div
              className="skel"
              style={{
                height: 32,
                width: 96,
                borderRadius: 10,
                background:
                  "linear-gradient(90deg, rgba(124,92,255,.20), rgba(196,181,253,.28))",
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {["84px", "84px", "84px"].map((w, idx) => (
              <div
                key={idx}
                className="skel"
                style={{
                  height: 32,
                  width: w,
                  borderRadius: 10,
                  background:
                    "linear-gradient(90deg, rgba(124,92,255,.22), rgba(196,181,253,.30))",
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
