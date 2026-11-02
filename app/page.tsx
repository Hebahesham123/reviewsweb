"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, type Review } from "@/lib/supabaseClient";
import { displayName } from "@/lib/egyptianNames";
import { titleCase } from "@/lib/titleCase";

/* ------------------------------- types ------------------------------- */

type RatingField = "product_rating" | "shipping_rating" | "support_rating";
type RatingFilter = "any" | "5" | "4up" | "3up" | "2dn" | "1" | "none";
type DatePreset = "all" | "today" | "7d" | "30d" | "90d" | "month" | "custom";
type SortKey =
  | "newest"
  | "oldest"
  | "highest"
  | "lowest"
  | "name-asc"
  | "name-desc";
type TriState = "all" | "yes" | "no";

/* ------------------------------ constants ---------------------------- */

const PAGE_SIZES = [25, 50, 100, 200];
const FETCH_CHUNK = 1000;
const NO_EXPERIENCE = "__none__";

const RATING_FIELDS: { key: RatingField; label: string }[] = [
  { key: "product_rating", label: "Product" },
  { key: "shipping_rating", label: "Shipping" },
  { key: "support_rating", label: "Support" },
];

const RATING_OPTIONS: { value: RatingFilter; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "5", label: "5 ★ Only" },
  { value: "4up", label: "4 ★ & Up" },
  { value: "3up", label: "3 ★ & Up" },
  { value: "2dn", label: "2 ★ & Below" },
  { value: "1", label: "1 ★ Only" },
  { value: "none", label: "Not Rated" },
];

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom Range" },
];

const EXPERIENCE_OPTIONS = [
  { value: "Easy", label: "Easy" },
  { value: "Medium", label: "Medium" },
  { value: "Hard", label: "Hard" },
  { value: NO_EXPERIENCE, label: "Not Set" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "highest", label: "Highest Rated" },
  { value: "lowest", label: "Lowest Rated" },
  { value: "name-asc", label: "Name A → Z" },
  { value: "name-desc", label: "Name Z → A" },
];

const DEFAULT_RATINGS: Record<RatingField, RatingFilter> = {
  product_rating: "any",
  shipping_rating: "any",
  support_rating: "any",
};

/* ------------------------------ helpers ------------------------------ */

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Resolves a preset (or the custom inputs) to a concrete [from, to] window. */
function resolveDateRange(
  preset: DatePreset,
  from: string,
  to: string
): [Date | null, Date | null] {
  const now = new Date();
  const daysAgo = (n: number) => {
    const d = startOfDay(now);
    d.setDate(d.getDate() - n);
    return d;
  };

  switch (preset) {
    case "today":
      return [startOfDay(now), null];
    case "7d":
      return [daysAgo(6), null];
    case "30d":
      return [daysAgo(29), null];
    case "90d":
      return [daysAgo(89), null];
    case "month":
      return [new Date(now.getFullYear(), now.getMonth(), 1), null];
    case "custom":
      return [
        from ? startOfDay(new Date(from)) : null,
        to ? endOfDay(new Date(to)) : null,
      ];
    default:
      return [null, null];
  }
}

function ratingMatches(value: number | null, filter: RatingFilter) {
  if (filter === "any") return true;
  if (filter === "none") return value === null;
  if (value === null) return false;
  switch (filter) {
    case "5":
      return value === 5;
    case "4up":
      return value >= 4;
    case "3up":
      return value >= 3;
    case "2dn":
      return value <= 2;
    case "1":
      return value === 1;
    default:
      return true;
  }
}

/** Mean of whichever of the three ratings were actually given. */
function averageRating(r: Review): number | null {
  const given = [r.product_rating, r.shipping_rating, r.support_rating].filter(
    (v): v is number => typeof v === "number"
  );
  if (given.length === 0) return null;
  return given.reduce((a, b) => a + b, 0) / given.length;
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

/** 1 ... 4 5 6 ... 20 — keeps the control a stable width at any page count. */
function pageWindow(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const out: (number | "gap")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) out.push("gap");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push("gap");
  out.push(total);

  return out;
}

/* ----------------------------- component ----------------------------- */

export default function DashboardPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newId, setNewId] = useState<string | null>(null);

  // filters
  const [query, setQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ratings, setRatings] =
    useState<Record<RatingField, RatingFilter>>(DEFAULT_RATINGS);
  const [experiences, setExperiences] = useState<string[]>([]);
  const [source, setSource] = useState<TriState>("all");
  const [commented, setCommented] = useState<TriState>("all");
  const [named, setNamed] = useState<TriState>("all");
  const [photo, setPhoto] = useState<TriState>("all");

  // photo being viewed full size
  const [lightbox, setLightbox] = useState<Review | null>(null);
  // comment being read in full
  const [commentView, setCommentView] = useState<Review | null>(null);

  // view
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showFilters, setShowFilters] = useState(false);

  /* ---- load every review in chunks (Supabase caps a request at 1000) ---- */
  useEffect(() => {
    let active = true;

    (async () => {
      const all: Review[] = [];
      for (let from = 0; ; from += FETCH_CHUNK) {
        const { data, error } = await supabase
          .from("reviews")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + FETCH_CHUNK - 1);

        if (error) {
          if (active) {
            setLoadError(error.message);
            setLoading(false);
          }
          return;
        }
        if (!data || data.length === 0) break;
        all.push(...(data as Review[]));
        if (data.length < FETCH_CHUNK) break;
      }

      if (active) {
        setReviews(all);
        setLoading(false);
      }
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
          setTimeout(() => setNewId(null), 2400);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  /* ---------------------------- filtering ---------------------------- */

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const [from, to] = resolveDateRange(datePreset, dateFrom, dateTo);

    return reviews.filter((r) => {
      if (q) {
        const haystack = [
          displayName(r.reviewer_name, r.id),
          r.review_comment || "",
          r.customer_id || "",
          r.order_number || "",
          r.customer_email || "",
          r.phone || "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (from || to) {
        const at = new Date(r.created_at).getTime();
        if (from && at < from.getTime()) return false;
        if (to && at > to.getTime()) return false;
      }

      for (const { key } of RATING_FIELDS) {
        if (!ratingMatches(r[key], ratings[key])) return false;
      }

      if (experiences.length > 0) {
        const value = r.experience_level ?? NO_EXPERIENCE;
        if (!experiences.includes(value)) return false;
      }

      if (source !== "all") {
        const hasId = Boolean(r.customer_id);
        if (source === "yes" ? !hasId : hasId) return false;
      }

      if (commented !== "all") {
        const has = Boolean(r.review_comment && r.review_comment.trim());
        if (commented === "yes" ? !has : has) return false;
      }

      if (named !== "all") {
        const has = Boolean(r.reviewer_name && r.reviewer_name.trim());
        if (named === "yes" ? !has : has) return false;
      }

      if (photo !== "all") {
        const has = Boolean(r.image_url);
        if (photo === "yes" ? !has : has) return false;
      }

      return true;
    });
  }, [
    reviews,
    query,
    datePreset,
    dateFrom,
    dateTo,
    ratings,
    experiences,
    source,
    commented,
    named,
    photo,
  ]);

  /* ----------------------------- sorting ----------------------------- */

  const sorted = useMemo(() => {
    const rows = [...filtered];
    const byDate = (a: Review, b: Review) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

    // Unrated rows sink to the bottom either way, rather than counting as zero.
    const byScore = (a: Review, b: Review, desc: boolean) => {
      const av = averageRating(a);
      const bv = averageRating(b);
      if (av === null && bv === null) return byDate(a, b);
      if (av === null) return 1;
      if (bv === null) return -1;
      if (av === bv) return byDate(a, b);
      return desc ? bv - av : av - bv;
    };

    switch (sort) {
      case "oldest":
        return rows.sort((a, b) => -byDate(a, b));
      case "highest":
        return rows.sort((a, b) => byScore(a, b, true));
      case "lowest":
        return rows.sort((a, b) => byScore(a, b, false));
      case "name-asc":
      case "name-desc":
        return rows.sort((a, b) => {
          const an = displayName(a.reviewer_name, a.id);
          const bn = displayName(b.reviewer_name, b.id);
          const cmp = an.localeCompare(bn, undefined, { sensitivity: "base" });
          return sort === "name-asc" ? cmp : -cmp;
        });
      default:
        return rows.sort(byDate);
    }
  }, [filtered, sort]);

  /* ---------------------------- pagination --------------------------- */

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

  const filterSignature = JSON.stringify({
    query,
    datePreset,
    dateFrom,
    dateTo,
    ratings,
    experiences,
    source,
    commented,
    named,
    photo,
    sort,
    pageSize,
  });

  // Any change to the result set returns you to page 1, otherwise you can be
  // stranded on a page that no longer exists.
  useEffect(() => {
    setPage(1);
  }, [filterSignature]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Escape closes the photo viewer and the comment window.
  useEffect(() => {
    if (!lightbox && !commentView) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightbox(null);
        setCommentView(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, commentView]);

  const pageStart = (page - 1) * pageSize;
  const visible = sorted.slice(pageStart, pageStart + pageSize);

  /* -------------------------- active filters ------------------------- */

  const resetAll = () => {
    setQuery("");
    setDatePreset("all");
    setDateFrom("");
    setDateTo("");
    setRatings(DEFAULT_RATINGS);
    setExperiences([]);
    setSource("all");
    setCommented("all");
    setNamed("all");
    setPhoto("all");
  };

  const chips: { key: string; label: string; clear: () => void }[] = [];

  if (query.trim())
    chips.push({
      key: "q",
      label: `Search: "${query.trim()}"`,
      clear: () => setQuery(""),
    });

  if (datePreset !== "all") {
    const preset = DATE_PRESETS.find((d) => d.value === datePreset);
    const label =
      datePreset === "custom"
        ? `Date: ${dateFrom || "any"} → ${dateTo || "any"}`
        : `Date: ${preset?.label}`;
    chips.push({
      key: "date",
      label,
      clear: () => {
        setDatePreset("all");
        setDateFrom("");
        setDateTo("");
      },
    });
  }

  for (const { key, label } of RATING_FIELDS) {
    if (ratings[key] === "any") continue;
    const opt = RATING_OPTIONS.find((o) => o.value === ratings[key]);
    chips.push({
      key,
      label: `${label}: ${opt?.label}`,
      clear: () => setRatings((prev) => ({ ...prev, [key]: "any" })),
    });
  }

  if (experiences.length > 0)
    chips.push({
      key: "exp",
      label: `Experience: ${experiences
        .map((v) => EXPERIENCE_OPTIONS.find((o) => o.value === v)?.label)
        .join(", ")}`,
      clear: () => setExperiences([]),
    });

  if (source !== "all")
    chips.push({
      key: "source",
      label: source === "yes" ? "From a review link" : "No customer ID",
      clear: () => setSource("all"),
    });

  if (commented !== "all")
    chips.push({
      key: "commented",
      label: commented === "yes" ? "Has a comment" : "No comment",
      clear: () => setCommented("all"),
    });

  if (named !== "all")
    chips.push({
      key: "named",
      label: named === "yes" ? "Name given" : "Anonymous",
      clear: () => setNamed("all"),
    });

  if (photo !== "all")
    chips.push({
      key: "photo",
      label: photo === "yes" ? "Has a photo" : "No photo",
      clear: () => setPhoto("all"),
    });

  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const isFiltered = chips.length > 0;

  /* ------------------------------- view ------------------------------ */

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
        <StatCard
          icon="📝"
          label={isFiltered ? "Matching Reviews" : "Total Reviews"}
          value={stats.total}
          note={isFiltered ? `of ${reviews.length}` : undefined}
        />
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
            placeholder="Search name, comment, ID, order or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="clear-search"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="toolbar-right">
          <button
            className={showFilters ? "filter-btn open" : "filter-btn"}
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
          >
            <span>⚙</span> Filters
            {chips.length > 0 && (
              <span className="filter-badge">{chips.length}</span>
            )}
          </button>

          <label className="select-wrap">
            <span className="select-label">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <button
            className="export-btn"
            onClick={() => exportCsv(sorted)}
            disabled={sorted.length === 0}
            title="Exports every row matching the current filters"
          >
            ⬇ Export {isFiltered ? "Filtered" : "All"}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="filter-panel">
          <div className="filter-grid">
            <div className="filter-group">
              <label className="filter-label">Date Range</label>
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              >
                {DATE_PRESETS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {datePreset === "custom" && (
                <div className="date-range">
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => setDateFrom(e.target.value)}
                    aria-label="From date"
                  />
                  <span className="date-arrow">→</span>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => setDateTo(e.target.value)}
                    aria-label="To date"
                  />
                </div>
              )}
            </div>

            {RATING_FIELDS.map(({ key, label }) => (
              <div className="filter-group" key={key}>
                <label className="filter-label">{label} Rating</label>
                <select
                  value={ratings[key]}
                  onChange={(e) =>
                    setRatings((prev) => ({
                      ...prev,
                      [key]: e.target.value as RatingFilter,
                    }))
                  }
                >
                  {RATING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <div className="filter-group filter-group-wide">
              <label className="filter-label">Shopping Experience</label>
              <div className="chip-row">
                {EXPERIENCE_OPTIONS.map((o) => {
                  const on = experiences.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      className={on ? "toggle-chip on" : "toggle-chip"}
                      onClick={() =>
                        setExperiences((prev) =>
                          on
                            ? prev.filter((v) => v !== o.value)
                            : [...prev, o.value]
                        )
                      }
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">Source</label>
              <Segmented
                value={source}
                onChange={setSource}
                options={[
                  { value: "all", label: "All" },
                  { value: "yes", label: "Has ID" },
                  { value: "no", label: "No ID" },
                ]}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Comment</label>
              <Segmented
                value={commented}
                onChange={setCommented}
                options={[
                  { value: "all", label: "All" },
                  { value: "yes", label: "With" },
                  { value: "no", label: "Without" },
                ]}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Reviewer Name</label>
              <Segmented
                value={named}
                onChange={setNamed}
                options={[
                  { value: "all", label: "All" },
                  { value: "yes", label: "Named" },
                  { value: "no", label: "Anonymous" },
                ]}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Photo</label>
              <Segmented
                value={photo}
                onChange={setPhoto}
                options={[
                  { value: "all", label: "All" },
                  { value: "yes", label: "With" },
                  { value: "no", label: "Without" },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {chips.length > 0 && (
        <div className="active-filters">
          {chips.map((c) => (
            <button
              key={c.key}
              className="active-chip"
              onClick={c.clear}
              title="Remove this filter"
            >
              {c.label} <span className="chip-x">✕</span>
            </button>
          ))}
          <button className="clear-all" onClick={resetAll}>
            Clear All
          </button>
        </div>
      )}

      {loadError ? (
        <div className="empty-state">Could not load reviews: {loadError}</div>
      ) : loading ? (
        <div className="empty-state">Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <div className="empty-state">
          No reviews yet. Submitted reviews will appear here instantly. 🧡
        </div>
      ) : sorted.length === 0 ? (
        <div className="empty-state">
          <p>No reviews match these filters.</p>
          <button className="export-btn" onClick={resetAll}>
            Clear All Filters
          </button>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="reviews-table">
              <thead>
                <tr>
                  <th className="th-num">#</th>
                  <th className="th-name">Reviewer</th>
                  <th className="th-rating">Product</th>
                  <th className="th-rating">Shipping</th>
                  <th className="th-rating">Support</th>
                  <th>Experience</th>
                  <th>Comment</th>
                  <th className="th-photo">Photo</th>
                  <th className="th-date">Date</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => {
                  const name = displayName(r.reviewer_name, r.id);
                  const isAnon = !(r.reviewer_name && r.reviewer_name.trim());
                  return (
                    <tr key={r.id} className={r.id === newId ? "row-new" : ""}>
                      <td className="cell-num">{pageStart + i + 1}</td>
                      <td>
                        <div className="reviewer">
                          <Avatar name={name} />
                          <div className="reviewer-info">
                            <span className="reviewer-name">
                              {name}
                              {isAnon && (
                                <span
                                  className="anon-dot"
                                  title="No name provided"
                                />
                              )}
                              {r.customer_id && (
                                <span
                                  className="cid-chip"
                                  title={`Submitted from a personalised link · ID ${r.customer_id}`}
                                >
                                  {r.customer_id}
                                </span>
                              )}
                            </span>
                            {(r.phone || r.order_number) && (
                              <span className="reviewer-meta">
                                {r.phone && (
                                  <a
                                    className="meta-phone"
                                    href={`tel:${r.phone}`}
                                    title="Call this customer"
                                  >
                                    📞 {r.phone}
                                  </a>
                                )}
                                {r.order_number && (
                                  <span
                                    className="meta-order"
                                    title="Order number the customer typed in"
                                  >
                                    🧾 {r.order_number}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <Stars value={r.product_rating} />
                      </td>
                      <td>
                        <Stars value={r.shipping_rating} />
                      </td>
                      <td>
                        <Stars value={r.support_rating} />
                      </td>
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
                          <button
                            className="comment-btn"
                            onClick={() => setCommentView(r)}
                            title="Read Full Comment"
                          >
                            {titleCase(r.review_comment)}
                          </button>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="cell-photo">
                        {r.image_url ? (
                          <button
                            className="photo-thumb"
                            onClick={() => setLightbox(r)}
                            title="View full size"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={r.image_url}
                              alt={`Photo from ${name}`}
                              loading="lazy"
                            />
                          </button>
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

          <div className="pagination">
            <div className="page-info">
              Showing <strong>{pageStart + 1}</strong>–
              <strong>{Math.min(pageStart + pageSize, sorted.length)}</strong> of{" "}
              <strong>{sorted.length}</strong>
              {isFiltered && ` (filtered from ${reviews.length})`}
            </div>

            <div className="page-controls">
              <button
                className="page-btn"
                onClick={() => setPage(1)}
                disabled={page === 1}
                aria-label="First page"
              >
                «
              </button>
              <button
                className="page-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ‹ Prev
              </button>

              {pageWindow(page, totalPages).map((p, i) =>
                p === "gap" ? (
                  <span className="page-gap" key={`gap-${i}`}>
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    className={p === page ? "page-btn on" : "page-btn"}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                className="page-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next ›
              </button>
              <button
                className="page-btn"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                aria-label="Last page"
              >
                »
              </button>
            </div>

            <label className="select-wrap">
              <span className="select-label">Per Page</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}

      {lightbox?.image_url && (
        <div
          className="lightbox"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Review photo"
        >
          <button
            className="lightbox-close"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.image_url}
            alt={`Photo from ${displayName(
              lightbox.reviewer_name,
              lightbox.id
            )}`}
            onClick={(e) => e.stopPropagation()}
          />
          <div
            className="lightbox-caption"
            onClick={(e) => e.stopPropagation()}
          >
            <strong>{displayName(lightbox.reviewer_name, lightbox.id)}</strong>
            {lightbox.phone && <span>{lightbox.phone}</span>}
            {lightbox.order_number && <span>Order {lightbox.order_number}</span>}
            <a href={lightbox.image_url} target="_blank" rel="noreferrer">
              Open original ↗
            </a>
          </div>
        </div>
      )}

      {commentView?.review_comment && (
        <div
          className="comment-overlay"
          onClick={() => setCommentView(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Full Comment"
        >
          <div className="comment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="comment-modal-head">
              <div className="reviewer">
                <Avatar
                  name={displayName(commentView.reviewer_name, commentView.id)}
                />
                <div className="reviewer-info">
                  <span className="reviewer-name">
                    {displayName(commentView.reviewer_name, commentView.id)}
                  </span>
                  <span className="reviewer-meta">
                    {formatDate(commentView.created_at)}
                    {commentView.order_number &&
                      ` · Order ${commentView.order_number}`}
                  </span>
                </div>
              </div>
              <button
                className="comment-modal-close"
                onClick={() => setCommentView(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="comment-modal-body">
              {titleCase(commentView.review_comment)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------- subcomponents --------------------------- */

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? "seg on" : "seg"}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  suffix,
  note,
}: {
  icon: string;
  label: string;
  value: number | string;
  suffix?: string;
  note?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-body">
        <div className="value">
          {value}
          {suffix && value !== "—" ? <span className="suffix">{suffix}</span> : ""}
          {note && <span className="stat-note">{note}</span>}
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

/* ------------------------------- data --------------------------------- */

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

function exportCsv(reviews: Review[]) {
  const headers = [
    "Name",
    "Phone",
    "Customer ID",
    "Order Number",
    "Product Rating",
    "Shipping Rating",
    "Support Rating",
    "Experience",
    "Comment",
    "Photo URL",
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
      r.phone ?? "",
      r.customer_id ?? "",
      r.order_number ?? "",
      r.product_rating ?? "",
      r.shipping_rating ?? "",
      r.support_rating ?? "",
      r.experience_level ?? "",
      titleCase(r.review_comment),
      r.image_url ?? "",
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
