// TRUST Conference Site — Tab Navigation + Tools + Compare
(() => {
  const tabs = document.querySelectorAll(".tab-nav a");
  const panels = document.querySelectorAll(".tab-panel");

  function showTab(id) {
    tabs.forEach((a) => {
      a.classList.toggle("active", a.dataset.tab === id);
    });
    panels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === id);
    });
    history.replaceState(null, "", `#${id}`);
  }

  tabs.forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      showTab(a.dataset.tab);
    });
  });

  function initFromHash() {
    var hash = location.hash.slice(1);
    if (hash && document.getElementById(hash)) showTab(hash);
  }
  window.addEventListener("hashchange", initFromHash);
  initFromHash();

  // ── Tools Table ──────────────────────────────────────────────────
  async function loadTools() {
    const tbody = document.getElementById("tools-tbody");
    if (!tbody) return;
    try {
      const res = await fetch("data/tools.csv");
      const text = await res.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="9" style="text-align:center;color:var(--ut-muted)">No tools yet.</td></tr>';
        return;
      }
      tbody.innerHTML = rows
        .map((r) => {
          const verdictClass =
            r.verdict === "recommended"
              ? "verdict-recommended"
              : r.verdict === "conditional" || r.verdict === "needs_review"
                ? "verdict-provisional"
                : r.verdict === "not_recommended"
                  ? "verdict-not-recommended"
                  : "";
          const verdictLabel = r.verdict
            ? r.verdict.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
            : "—";
          const scorePill = (val) => {
            if (!val || val === "0") return '<span style="color:var(--ut-muted)">—</span>';
            const n = parseFloat(val);
            const cls = n >= 2.5 ? "high" : n >= 1.5 ? "mid" : "low";
            return `<span class="score-pill ${cls}">${n.toFixed(1)}</span>`;
          };
          const statusClass =
            r.status === "done" ? "done" : r.status === "in-progress" ? "in-progress" : "nominated";
          const statusLabel =
            r.status === "done"
              ? "Reviewed"
              : r.status === "in-progress"
                ? "In progress"
                : "Nominated";
          return `<tr>
          <td><a href="${r.tool_url}" target="_blank" rel="noopener" style="color:var(--trust-magenta)">${esc(r.tool_name)}</a></td>
          <td>${esc(r.category.replace(/_/g, " "))}</td>
          <td class="${verdictClass}">${verdictLabel}</td>
          <td>${scorePill(r.tr_score)}</td>
          <td>${scorePill(r.re_score)}</td>
          <td>${scorePill(r.us_score)}</td>
          <td>${scorePill(r.se_score)}</td>
          <td>${scorePill(r.tc_score)}</td>
          <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
        </tr>`;
        })
        .join("");
    } catch (_e) {
      tbody.innerHTML =
        '<tr><td colspan="9" style="text-align:center;color:var(--ut-muted)">Could not load tools data.</td></tr>';
    }
  }

  // ── Compare ──────────────────────────────────────────────────────
  const compareData = [];

  async function initCompare() {
    const drop = document.getElementById("compare-drop");
    const input = document.getElementById("compare-input");
    if (!drop || !input) return;

    drop.addEventListener("click", () => input.click());
    drop.addEventListener("dragover", (e) => {
      e.preventDefault();
      drop.classList.add("dragover");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("dragover"));
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      drop.classList.remove("dragover");
      handleFiles(e.dataTransfer.files);
    });
    input.addEventListener("change", () => handleFiles(input.files));

    document.getElementById("compare-clear").addEventListener("click", () => {
      compareData.length = 0;
      renderCompare();
    });
  }

  async function handleFiles(files) {
    for (const file of files) {
      try {
        const data = await parseZip(file);
        if (data) compareData.push(data);
      } catch (e) {
        console.warn("Failed to parse", file.name, e);
      }
    }
    renderCompare();
  }

  async function parseZip(file) {
    try {
      // Dynamic import of JSZip from CDN
      if (!window.JSZip) {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js";
        document.head.appendChild(s);
        await new Promise((resolve, reject) => {
          s.onload = resolve;
          s.onerror = () =>
            reject(new Error("Failed to load JSZip from CDN. Check your internet connection."));
        });
      }
      const zip = await JSZip.loadAsync(file);

      // Try session.json first
      const sessionFile = zip.file("session.json");
      if (!sessionFile) return null;
      const session = JSON.parse(await sessionFile.async("string"));

      return {
        fileName: file.name,
        toolName: session.metadata?.toolName || "Unknown",
        toolUrl: session.metadata?.toolUrl || "",
        verdict: session.finalization?.grade || "",
        conclusion: session.finalization?.conclusion || "",
        strengths: session.finalization?.strengths || [],
        weaknesses: session.finalization?.weaknesses || [],
        principles: extractPrincipleScores(session.evaluations || []),
        totalScore: computeTotal(session.evaluations || []),
      };
    } catch (err) {
      alert(err instanceof Error ? err.message : "An unexpected error occurred.");
      return null;
    }
  }

  function extractPrincipleScores(evaluations) {
    const principles = { TR: [], RE: [], US: [], SE: [], TC: [] };
    for (const ev of evaluations) {
      const [cat] = ev.rubricId.split(".");
      if (principles[cat] !== undefined && typeof ev.score === "number") {
        principles[cat].push(ev.score);
      }
    }
    const result = {};
    for (const [k, v] of Object.entries(principles)) {
      result[k] = v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : null;
    }
    return result;
  }

  function computeTotal(evaluations) {
    let total = 0,
      count = 0;
    for (const ev of evaluations) {
      if (typeof ev.score === "number") {
        total += ev.score;
        count++;
      }
    }
    return { actual: total, max: count * 3, answered: count };
  }

  function renderCompare() {
    const results = document.getElementById("compare-results");
    const grid = document.getElementById("compare-grid");
    const thead = document.getElementById("compare-thead");
    const tbody = document.getElementById("compare-tbody");

    if (compareData.length === 0) {
      results.style.display = "none";
      return;
    }
    results.style.display = "block";

    // Cards
    grid.innerHTML = compareData
      .map((d, i) => {
        const verdictClass =
          d.verdict === "pass"
            ? "verdict-recommended"
            : d.verdict === "conditional"
              ? "verdict-provisional"
              : d.verdict === "fail"
                ? "verdict-not-recommended"
                : "";
        return `<div class="compare-card">
        <button class="compare-remove" data-idx="${i}" title="Remove">&times;</button>
        <h3>${esc(d.toolName)}</h3>
        <div class="compare-url">${esc(d.toolUrl)}</div>
        <div class="${verdictClass}" style="margin-top:var(--space-xs);font-weight:600">${esc(d.verdict || "—")}</div>
        <div style="color:var(--ut-muted);font-size:0.85rem">${d.totalScore.actual}/${d.totalScore.max} points</div>
      </div>`;
      })
      .join("");

    // Remove handlers
    grid.querySelectorAll(".compare-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        compareData.splice(parseInt(btn.dataset.idx, 10), 1);
        renderCompare();
      });
    });

    // Comparison table
    const principleCodes = ["TR", "RE", "US", "SE", "TC"];
    thead.innerHTML = `<tr><th>Criterion</th>${compareData.map((d) => `<th>${esc(d.toolName)}</th>`).join("")}</tr>`;

    const rows = [];
    // Verdict row
    rows.push(
      `<tr><td>Verdict</td>${compareData
        .map((d) => {
          const cls =
            d.verdict === "pass"
              ? "verdict-recommended"
              : d.verdict === "conditional"
                ? "verdict-provisional"
                : d.verdict === "fail"
                  ? "verdict-not-recommended"
                  : "";
          return `<td class="${cls}">${esc(d.verdict || "—")}</td>`;
        })
        .join("")}</tr>`,
    );

    // Score row
    rows.push(
      `<tr><td>Score</td>${compareData.map((d) => `<td>${d.totalScore.actual}/${d.totalScore.max}</td>`).join("")}</tr>`,
    );

    // Per-principle rows
    for (const code of principleCodes) {
      const values = compareData.map((d) => d.principles[code]);
      const filtered = values.filter((v) => v !== null);
      const best = filtered.length > 0 ? Math.max(...filtered) : null;
      rows.push(
        `<tr><td style="color:var(--${code.toLowerCase()})">${code}</td>${values
          .map((v) => {
            const isBest = v === best && compareData.length > 1;
            return `<td${isBest ? ' class="highlight-best"' : ""}>${v !== null ? v.toFixed(1) : "—"}</td>`;
          })
          .join("")}</tr>`,
      );
    }

    // Strengths
    rows.push(
      `<tr><td>Strengths</td>${compareData.map((d) => `<td style="text-align:left;font-size:0.8rem">${d.strengths.length ? d.strengths.map((s) => esc(s)).join("<br>") : "<em>—</em>"}</td>`).join("")}</tr>`,
    );

    // Weaknesses
    rows.push(
      `<tr><td>Weaknesses</td>${compareData.map((d) => `<td style="text-align:left;font-size:0.8rem">${d.weaknesses.length ? d.weaknesses.map((w) => esc(w)).join("<br>") : "<em>—</em>"}</td>`).join("")}</tr>`,
    );

    tbody.innerHTML = rows.join("");
  }

  // ── Utilities ────────────────────────────────────────────────────
  function esc(s) {
    if (!s) return "";
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseCSV(text) {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim());
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = vals[i] || "";
      });
      return obj;
    });
  }

  // ── Init ─────────────────────────────────────────────────────────
  loadTools();
  initCompare();
})();
