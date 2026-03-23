"use client";
import { useState, useEffect } from "react";

const PLATFORMS = [
  { key: "blinkit",   name: "Blinkit",         tag: "10-min delivery",  emoji: "⚡", color: "#f9d53e", url: (q, p) => `https://blinkit.com/s/?q=${encodeURIComponent(q)}` },
  { key: "zepto",     name: "Zepto",            tag: "Fastest delivery", emoji: "🟣", color: "#b06ef3", url: (q, p) => `https://www.zeptonow.com/search?query=${encodeURIComponent(q)}` },
  { key: "swiggy",    name: "Swiggy Instamart", tag: "Wide selection",   emoji: "🧡", color: "#fc8019", url: (q, p) => `https://www.swiggy.com/instamart/search?query=${encodeURIComponent(q)}` },
  { key: "bigbasket", name: "BigBasket",        tag: "Best variety",     emoji: "🛒", color: "#84c225", url: (q, p) => `https://www.bigbasket.com/ps/?q=${encodeURIComponent(q)}` },
];

const QUICK = [
  "Amul Butter 500g", "Maggi Noodles 560g", "Tata Salt 1kg",
  "Dove Soap 100g", "Aashirvaad Atta 5kg", "Colgate MaxFresh 150g",
  "Dettol Hand Wash 200ml", "Pampers Small 20 count",
];

function PriceBar({ results, cheapestKey }) {
  const vals = PLATFORMS.map(p => results[p.key]?.price || 0).filter(v => v > 0);
  const max = Math.max(...vals);
  if (!max) return null;
  return (
    <div style={{ marginTop: 28, padding: "20px 24px", background: "#0f0f0f", borderRadius: 16, border: "1px solid #1e1e1e" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "#333", fontFamily: "'DM Mono',monospace" }}>
          Estimated Price Comparison
        </div>
        <div style={{ fontSize: 10, color: "#888", fontFamily: "'DM Mono',monospace" }}>
          Click "See Real Price" to verify on each app
        </div>
      </div>
      {PLATFORMS.map(p => {
        const r = results[p.key];
        if (!r?.available || !r.price) return null;
        const isCheap = p.key === cheapestKey;
        const pct = (r.price / max) * 100;
        return (
          <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <div style={{ width: 120, fontSize: 12, color: isCheap ? "#34d399" : p.color, fontWeight: 600, flexShrink: 0 }}>{p.name}</div>
            <div style={{ flex: 1, height: 7, background: "#1a1a1a", borderRadius: 100, overflow: "hidden" }}>
              <div style={{ width: pct + "%", height: "100%", background: isCheap ? "#34d399" : p.color, borderRadius: 100, transition: "width 0.9s cubic-bezier(.4,0,.2,1)", opacity: 0.75 }} />
            </div>
            <div style={{ width: 64, textAlign: "right", fontSize: 13, fontWeight: 800, color: isCheap ? "#34d399" : "#ddd", flexShrink: 0, fontFamily: "'DM Mono',monospace" }}>~₹{r.price}</div>
            {isCheap && <div style={{ fontSize: 9, background: "#34d399", color: "#000", padding: "2px 8px", borderRadius: 100, fontWeight: 800, flexShrink: 0 }}>LIKELY BEST</div>}
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [uiState, setUiState] = useState("idle");
  const [data, setData] = useState(null);
  const [errMsg, setErrMsg] = useState("");
  const [curQuery, setCurQuery] = useState("");
  const [tick, setTick] = useState(0);

  // Location state
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [locationStatus, setLocationStatus] = useState("idle"); // idle | detecting | found | denied

  useEffect(() => {
    if (uiState !== "loading") return;
    const id = setInterval(() => setTick(t => t + 1), 700);
    return () => clearInterval(id);
  }, [uiState]);

  // Auto-detect location on load
  useEffect(() => {
    detectLocation();
  }, []);

  async function detectLocation() {
    if (!navigator.geolocation) return;
    setLocationStatus("detecting");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          // Use OpenStreetMap free reverse geocoding — no API key needed
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const geo = await res.json();
          const detectedPincode = geo?.address?.postcode || "";
          const detectedCity = geo?.address?.city || geo?.address?.town || geo?.address?.suburb || "";
          setPincode(detectedPincode);
          setCity(detectedCity);
          setLocationStatus("found");
        } catch {
          setLocationStatus("denied");
        }
      },
      () => setLocationStatus("denied"),
      { timeout: 8000 }
    );
  }

  const steps = ["Checking Blinkit…", "Checking Zepto…", "Checking Swiggy…", "Checking BigBasket…", "Comparing prices…"];

  async function doSearch(sq) {
    setCurQuery(sq);
    setUiState("loading");
    setErrMsg("");
    setTick(0);

    try {
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sq, pincode, city }),
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Unknown error");

      const parsed = json.results;
      let min = Infinity, cheapest = null, maxP = 0;
      for (const [k, v] of Object.entries(parsed)) {
        if (v.available && v.price > 0) {
          if (v.price < min) { min = v.price; cheapest = k; }
          if (v.price > maxP) maxP = v.price;
        }
      }

      setData({ results: parsed, cheapest, savings: maxP - min });
      setUiState("results");
    } catch (e) {
      setErrMsg(e.message);
      setUiState("error");
    }
  }

  function search(q) {
    const sq = (q || query).trim();
    if (!sq || uiState === "loading") return;
    doSearch(sq);
  }

  function quickSearch(t) { setQuery(t); doSearch(t); }

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#f0f0f0", fontFamily: "Georgia, serif" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(240,192,48,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(240,192,48,0.02) 1px,transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1140, margin: "0 auto", padding: "48px 32px 72px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, animation: "fadeUp .45s ease both" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#f0c030", marginBottom: 14, fontFamily: "'DM Mono',monospace" }}>
              ⚡ India Price Guide — Any Product
            </div>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(2.4rem,3.5vw,3.8rem)", fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.02em" }}>
              Find the <em style={{ color: "#f0c030" }}>cheapest</em><br />price. Instantly.
            </h1>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {PLATFORMS.map(p => (
                <div key={p.key} title={p.name} style={{ width: 40, height: 40, borderRadius: 11, background: "#111", border: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {p.emoji}
                </div>
              ))}
            </div>

            {/* Location pill */}
            <div
              onClick={() => locationStatus === "denied" || locationStatus === "idle" ? detectLocation() : null}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: locationStatus === "found" ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${locationStatus === "found" ? "rgba(52,211,153,0.3)" : "#2a2a2a"}`,
                borderRadius: 100, padding: "6px 14px",
                cursor: locationStatus === "denied" || locationStatus === "idle" ? "pointer" : "default",
                fontSize: 12, fontFamily: "'DM Mono',monospace",
              }}>
              <span>{locationStatus === "found" ? "📍" : locationStatus === "detecting" ? "🔄" : "📍"}</span>
              <span style={{ color: locationStatus === "found" ? "#34d399" : "#555" }}>
                {locationStatus === "found"
                  ? `${city ? city + " · " : ""}${pincode}`
                  : locationStatus === "detecting"
                  ? "Detecting location…"
                  : "Click to detect location"}
              </span>
              {locationStatus === "found" && (
                <span style={{ color: "#2a6650", fontSize: 10 }}>· prices adjusted</span>
              )}
            </div>
          </div>
        </div>

        {/* Warning banner */}
        <div style={{ background: "rgba(224,85,85,0.05)", border: "1px solid rgba(224,85,85,0.15)", borderRadius: 12, padding: "10px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, animation: "fadeUp .45s .05s ease both" }}>
          <span>⚠️</span>
          <span style={{ fontSize: 12, color: "#a04040", fontFamily: "'DM Mono',monospace" }}>
            Prices are <strong>AI estimates</strong> and may be outdated. Always click <strong>"See Real Price"</strong> to verify before buying.
            {pincode && <span style={{ color: "#34d399" }}> · Showing estimates for {pincode}.</span>}
          </span>
        </div>

        {/* Search */}
        <div style={{ background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 20, padding: "20px 24px 18px", marginBottom: 20, animation: "fadeUp .45s .08s ease both" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
            <span style={{ color: "#333", fontSize: 22 }}>🔍</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
              placeholder="Search anything — groceries, snacks, medicines, personal care, baby products…"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#f0f0f0", fontSize: 17, fontFamily: "inherit" }}
            />
            <button onClick={() => search()} disabled={uiState === "loading"}
              style={{ background: uiState === "loading" ? "#222" : "#f0c030", color: uiState === "loading" ? "#555" : "#000", border: "none", borderRadius: 12, padding: "12px 30px", fontWeight: 700, fontSize: 15, cursor: uiState === "loading" ? "not-allowed" : "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
              {uiState === "loading" ? "Searching…" : "Search"}
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "#333", fontFamily: "'DM Mono',monospace", marginRight: 6, letterSpacing: "0.14em" }}>QUICK:</span>
            {QUICK.map(t => (
              <span key={t} className="hov-chip" onClick={() => quickSearch(t)}>{t}</span>
            ))}
          </div>
        </div>

        {/* IDLE */}
        {uiState === "idle" && (
          <div style={{ textAlign: "center", padding: "72px 20px", animation: "fadeUp .4s ease both" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: "#222", marginBottom: 10 }}>Search any product</div>
            <div style={{ color: "#333", fontSize: 14 }}>
              Groceries, snacks, medicines, personal care, baby products — anything sold on quick-commerce apps
              {pincode && <div style={{ color: "#34d399", marginTop: 8, fontSize: 13 }}>📍 Location detected: {city} {pincode} · prices will reflect your area</div>}
            </div>
          </div>
        )}

        {/* LOADING */}
        {uiState === "loading" && (
          <div style={{ animation: "fadeUp .3s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ width: 16, height: 16, border: "2px solid #f0c030", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
              <span style={{ color: "#555", fontSize: 13, fontFamily: "'DM Mono',monospace" }}>{steps[tick % steps.length]}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 18, padding: "24px 20px" }}>
                  <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                    <div className="skel" style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0 }} />
                    <div className="skel" style={{ height: 14, flex: 1, marginTop: 4 }} />
                  </div>
                  <div className="skel" style={{ height: 44, width: 90, marginBottom: 8 }} />
                  <div className="skel" style={{ height: 11, width: "88%", marginBottom: 6 }} />
                  <div className="skel" style={{ height: 11, width: "65%", marginBottom: 20 }} />
                  <div className="skel" style={{ height: 38, borderRadius: 11 }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ERROR */}
        {uiState === "error" && (
          <div style={{ background: "#0e0800", border: "1px solid #2a1500", borderRadius: 16, padding: 28, animation: "fadeUp .3s ease both" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
            <div style={{ fontWeight: 700, color: "#f0c030", marginBottom: 8, fontSize: 16 }}>Something went wrong</div>
            <div style={{ fontSize: 12, color: "#666", fontFamily: "'DM Mono',monospace", whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.7 }}>{errMsg}</div>
            <button onClick={() => doSearch(curQuery)} style={{ marginTop: 16, background: "#1a1a1a", border: "1px solid #333", color: "#aaa", borderRadius: 10, padding: "8px 20px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              Try again
            </button>
          </div>
        )}

        {/* RESULTS */}
        {uiState === "results" && data && (
          <div style={{ animation: "fadeUp .35s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 10, color: "#333", fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 5 }}>
                  Estimated prices for {pincode && <span style={{ color: "#34d399" }}>· 📍 {pincode}</span>}
                </div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: "#f0c030", fontStyle: "italic" }}>"{curQuery}"</div>
              </div>
              {data.cheapest && data.savings > 0 && (
                <div style={{ textAlign: "right", background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.15)", borderRadius: 14, padding: "12px 20px" }}>
                  <div style={{ fontSize: 10, color: "#34d399", fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", marginBottom: 4 }}>EST. MAX SAVING</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#34d399", fontFamily: "'Playfair Display',serif" }}>~₹{data.savings}</div>
                  <div style={{ fontSize: 10, color: "#2a6650", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>verify on apps</div>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {PLATFORMS.map((p, i) => {
                const r = data.results?.[p.key] || { available: false, price: 0, item: "Not found" };
                const isCheapest = data.cheapest === p.key;
                const cheapPrice = data.cheapest ? data.results[data.cheapest]?.price : 0;
                const diff = r.price && cheapPrice ? r.price - cheapPrice : 0;

                return (
                  <div key={p.key} className="hov-card"
                    style={{
                      background: isCheapest ? "linear-gradient(155deg,rgba(52,211,153,0.07) 0%,#0f0f0f 60%)" : "#0f0f0f",
                      border: isCheapest ? "1px solid rgba(52,211,153,0.3)" : "1px solid #1a1a1a",
                      borderRadius: 18, padding: "26px 22px 22px", position: "relative",
                      animation: `fadeUp .4s ${i * 0.07}s ease both`,
                    }}>

                    {isCheapest && (
                      <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", background: "#34d399", color: "#000", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", padding: "4px 16px", borderRadius: "0 0 12px 12px", whiteSpace: "nowrap" }}>
                        ✓ Likely Cheapest
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, marginTop: isCheapest ? 14 : 0 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(255,255,255,0.03)", border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{p.emoji}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: p.color }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: "#333", marginTop: 1 }}>{p.tag}</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: "#555", fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", display: "block", marginBottom: 2 }}>EST. PRICE</span>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: r.available ? 40 : 28, fontWeight: 900, lineHeight: 1, color: isCheapest ? "#34d399" : "#eee" }}>
                        {r.available ? `₹${r.price}` : "—"}
                      </div>
                    </div>

                    <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", marginBottom: 12, height: 18 }}>
                      {r.available && isCheapest && data.savings > 0 && <span style={{ color: "#34d399" }}>~₹{data.savings} cheaper than others</span>}
                      {r.available && !isCheapest && diff > 0 && <span style={{ color: "#c0392b" }}>~₹{diff} more than cheapest</span>}
                    </div>

                    <div style={{ fontSize: 12, color: "#444", marginBottom: 20, lineHeight: 1.5, minHeight: 36, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {r.item || "Not typically available here"}
                    </div>

                    <a href={p.url(curQuery, pincode)} target="_blank" rel="noopener noreferrer" className="buy-btn"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        background: isCheapest ? "#34d399" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${isCheapest ? "#34d399" : "#2a2a2a"}`,
                        color: isCheapest ? "#000" : "#888",
                        borderRadius: 11, padding: "12px 16px", fontSize: 13, fontWeight: 700,
                        textDecoration: "none", width: "100%", boxSizing: "border-box",
                        transition: "opacity .15s, transform .15s",
                      }}>
                      {r.available ? "See Real Price ↗" : "Search ↗"}
                    </a>

                    {r.available && (
                      <div style={{ textAlign: "center", fontSize: 10, color: "#2a2a2a", marginTop: 8, fontFamily: "'DM Mono',monospace" }}>
                        verify on {p.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <PriceBar results={data.results} cheapestKey={data.cheapest} />

            <div style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "#222", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em", lineHeight: 1.8 }}>
              AI ESTIMATES · PRICES CHANGE DAILY · ALWAYS VERIFY ON APP BEFORE BUYING
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
