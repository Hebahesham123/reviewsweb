"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, type Review } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [newId, setNewId] = useState<string | null>(null);

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

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>📊 Reviews Dashboard</h1>
        <div className="header-actions">
          <span className="live-badge">
            <span className="live-dot" /> Live
          </span>
          <button
            className="export-btn"
            onClick={() => exportCsv(reviews)}
            disabled={reviews.length === 0}
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Reviews" value={stats.total} />
        <StatCard label="Avg Product" value={stats.avgProduct} />
        <StatCard label="Avg Shipping" value={stats.avgShipping} />
        <StatCard label="Avg Support" value={stats.avgSupport} />
      </div>

      {loading ? (
        <div className="empty-state">Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <div className="empty-state">
          No reviews yet. Submitted reviews will appear here instantly. 🧡
        </div>
      ) : (
        <div className="table-wrap">
          <table className="reviews-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Product</th>
                <th>Shipping</th>
                <th>Support</th>
                <th>Experience</th>
                <th>Comment</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} className={r.id === newId ? "row-new" : ""}>
                  <td className="cell-name">{r.reviewer_name}</td>
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
                    {r.review_comment || <span className="muted">—</span>}
                  </td>
                  <td className="cell-date">{formatDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat-card">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

function Stars({ value }: { value: number | null }) {
  if (!value) return <span className="muted">—</span>;
  return (
    <span className="stars" title={`${value}/5`}>
      {"★".repeat(value) + "☆".repeat(5 - value)}
    </span>
  );
}

function computeStats(reviews: Review[]) {
  const avg = (key: keyof Review) => {
    const nums = reviews
      .map((r) => r[key])
      .filter((v): v is number => typeof v === "number");
    if (nums.length === 0) return "—";
    return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
  };
  return {
    total: reviews.length,
    avgProduct: avg("product_rating"),
    avgShipping: avg("shipping_rating"),
    avgSupport: avg("support_rating"),
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
    // Quote if it contains comma, quote, or newline; double up inner quotes.
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const rows = reviews.map((r) =>
    [
      r.reviewer_name,
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

  // Prepend BOM so Excel reads UTF-8 (emojis, accents) correctly.
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
