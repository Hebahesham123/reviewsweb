"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, type Review } from "@/lib/supabaseClient";
import { displayName } from "@/lib/egyptianNames";

export default function DashboardPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [newId, setNewId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (active && !error && data) setReviews(data as Review[]);
      if (active) setLoading(false);
    })();

    const channel = supabase
      .channel("reviews-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reviews" },
        (payload) => {
          const incoming = payload.new as Review;
          setReviews((prev) =>
            prev.some((r) => r.id === incoming.id) ? prev : [incoming, ...prev]
          );
          setNewId(incoming.id);
          setTimeout(() => setNewId(null), 2000);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => computeStats(reviews), [reviews]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter((r) => {
      const name = displayName(r.reviewer_name, r.id).toLowerCase();
      const comment = (r.review_comment || "").toLowerCase();
      return name.includes(q) || comment.includes(q);
    });
  }, [reviews, query]);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Reviews Dashboard</h1>
          <p className="subtitle">Customer feedback, updating in real time</p>
        </div>
        <span className="live-badge">
          <span className="live-dot" /> Live
        </span>
      </div>

      <div className="stats-grid">
        <StatCard icon="📝" label="Total Reviews" value={stats.total} />
        <StatCard icon="⭐" label="Overall" value={stats.avgOverall} suffix="/5" />
        <StatCard icon="📦" label="Product" value={stats.avgProduct} suffix="/5" />
        <StatCard icon="🚚" label="Shipping" value={stats.avgShipping} suffix="/5" />
        <StatCard icon="💬" label="Support" value={stats.avgSupport} suffix="/5" />
      </div>

      <div className="toolbar">
        <div className="search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name or comment…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="clear-search" onClick={() => setQuery("")}>
              ✕
            </button>
          )}
        </div>
        <div className="toolbar-right">
          <span className="result-count">
            {filtered.length}
            {filtered.length !== reviews.length ? ` / ${reviews.length}` : ""}{" "}
            {reviews.length === 1 ? "review" : "reviews"}
          </span>
          <button
            className="export-btn"
            onClick={() => exportCsv(filtered)}
            disabled={filtered.length === 0}
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <div className="empty-state">
          No reviews yet. Submitted reviews will appear here instantly. 🧡
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">No reviews match “{query}”.</div>
      ) : (
        <div className="table-wrap">
          <table className="reviews-table">
            <thead>
              <tr>
                <th className="th-name">Reviewer</th>
                <th className="th-rating">Product</th>
                <th className="th-rating">Shipping</th>
                <th className="th-rating">Support</th>
                <th>Experience</th>
                <th>Comment</th>
                <th className="th-date">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const name = displayName(r.reviewer_name, r.id);
                const isFake = !(r.reviewer_name && r.reviewer_name.trim());
                return (
                  <tr key={r.id} className={r.id === newId ? "row-new" : ""}>
                    <td>
                      <div className="reviewer">
                        <Avatar name={name} />
                        <span className="reviewer-name">
                          {name}
                          {isFake && <span className="anon-dot" title="No name provided" />}
                        </span>
                      </div>
                    </td>
                    <td><Stars value={r.product_rating} /></td>
                    <td><Stars value={r.shipping_rating} /></td>
                    <td><Stars value={r.support_rating} /></td>
                    <td>
                      {r.experience_level ? (
                        <span className={`exp-tag exp-${r.experience_level}`}>
                          {r.experience_level}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="cell-comment">
                      {r.review_comment ? (
                        <span title={r.review_comment}>{r.review_comment}</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="cell-date">{formatDate(r.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  suffix,
}: {
  icon: string;
  label: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-body">
        <div className="value">
          {value}
          {suffix && value !== "—" ? <span className="suffix">{suffix}</span> : ""}
        </div>
        <div className="label">{label}</div>
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  const palette = [
    "#f97316", "#ea580c", "#d97706", "#dc2626", "#7c3aed",
    "#2563eb", "#0891b2", "#059669", "#65a30d", "#db2777",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const bg = palette[h % palette.length];
  return (
    <span className="avatar" style={{ backgroundColor: bg }}>
      {initials || "?"}
    </span>
  );
}

function Stars({ value }: { value: number | null }) {
  if (!value) return <span className="muted">—</span>;
  return (
    <span className="stars" title={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= value ? "star on" : "star off"}>
          ★
        </span>
      ))}
    </span>
  );
}

function computeStats(reviews: Review[]) {
  const avg = (keys: (keyof Review)[]) => {
    const nums = reviews
      .flatMap((r) => keys.map((k) => r[k]))
      .filter((v): v is number => typeof v === "number");
    if (nums.length === 0) return "—";
    return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
  };
  return {
    total: reviews.length,
    avgOverall: avg(["product_rating", "shipping_rating", "support_rating"]),
    avgProduct: avg(["product_rating"]),
    avgShipping: avg(["shipping_rating"]),
    avgSupport: avg(["support_rating"]),
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function exportCsv(reviews: Review[]) {
  const headers = [
    "Name",
    "Product Rating",
    "Shipping Rating",
    "Support Rating",
    "Experience",
    "Comment",
    "Date",
  ];

  const escape = (val: unknown) => {
    const s = val === null || val === undefined ? "" : String(val);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const rows = reviews.map((r) =>
    [
      displayName(r.reviewer_name, r.id),
      r.product_rating ?? "",
      r.shipping_rating ?? "",
      r.support_rating ?? "",
      r.experience_level ?? "",
      r.review_comment ?? "",
      new Date(r.created_at).toISOString(),
    ]
      .map(escape)
      .join(",")
  );

  const csv = "﻿" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `reviews-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
