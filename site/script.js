// TRUST site — scroll-spy nav + Tools table + Compare
(() => {
  // ── Scroll-spy: highlight the nav link for the section in view ────
  function initScrollSpy() {
    const nav = document.querySelector(".tab-nav");
    const links = Array.from(document.querySelectorAll(".tab-nav a[href^='#']"));
    if (!links.length) return;
    const map = new Map();
    for (const link of links) {
      const id = link.getAttribute("href").slice(1);
      const sec = document.getElementById(id);
      if (sec) map.set(sec, link);
    }
    const sections = [...map.keys()];

    const setActive = (id) => {
      let active = null;
      for (const link of links) {
        const on = link.getAttribute("href") === `#${id}`;
        link.classList.toggle("active", on);
        if (on) active = link;
      }
      // On narrow viewports the nav scrolls horizontally: keep the active link in view.
      // Scroll the NAV only (via scrollLeft) — never the page. Calling scrollIntoView
      // here makes the browser animate the document back to the active anchor and
      // fights the user's touch-scroll on mobile (the "ping back to anchor" bug).
      if (active && nav && nav.scrollWidth > nav.clientWidth) {
        const center = active.offsetLeft + active.offsetWidth / 2;
        nav.scrollLeft = center - nav.clientWidth / 2;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the topmost intersecting section.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );
    for (const sec of sections) observer.observe(sec);

    // Default to first section.
    if (sections[0]) setActive(sections[0].id);
  }

  // ── Tools Table ──────────────────────────────────────────────────
  async function loadTools() {
    const tbody = document.getElementById("tools-tbody");
    if (!tbody) return;
    try {
      const res = await fetch("data/tools/registry.json");
      const entries = await res.json();
      if (!Array.isArray(entries) || !entries.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="muted center">No tools yet.</td></tr>';
        return;
      }

      const scorePill = (val) => {
        if (val === 0 || val == null) return '<span class="score-pill">—</span>';
        const band = Math.max(0, Math.min(3, Math.round(val)));
        return `<span class="score-pill" data-score="${band}">${val.toFixed(1)}</span>`;
      };
      const verdictLabel = (v) =>
        v ? v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
      const verdictClass = (v) =>
        v === "recommended"
          ? "verdict-recommended"
          : v === "conditional" || v === "needs_review"
            ? "verdict-provisional"
            : v === "not_recommended"
              ? "verdict-not-recommended"
              : "";
      const verdictCell = (v) =>
        `<td><span class="verdict ${verdictClass(v)}">${verdictLabel(v)}</span></td>`;
      const statusLabel = (s) =>
        s === "done" ? "Reviewed" : s === "in-progress" ? "In progress" : "Nominated";
      const statusClass = (s) =>
        s === "done" ? "done" : s === "in-progress" ? "in-progress" : "nominated";

      tbody.innerHTML = entries
        .map((e) => {
          const r = e.review;
          const name = `<a class="tool-link" href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.name)}</a>`;
          const category = esc((e.category || "").replace(/_/g, " "));
          if (!r) {
            return `<tr><td>${name}</td><td>${category}</td><td colspan="7" class="muted">Not yet reviewed</td></tr>`;
          }
          return `<tr>
            <td>${name}</td>
            <td>${category}</td>
            ${verdictCell(r.verdict)}
            <td class="num">${scorePill(r.scores?.TR)}</td>
            <td class="num">${scorePill(r.scores?.RE)}</td>
            <td class="num">${scorePill(r.scores?.US)}</td>
            <td class="num">${scorePill(r.scores?.SE)}</td>
            <td class="num">${scorePill(r.scores?.TC)}</td>
            <td><span class="status-badge ${statusClass(r.status)}">${statusLabel(r.status)}</span></td>
          </tr>`;
        })
        .join("");
    } catch (_e) {
      tbody.innerHTML =
        '<tr><td colspan="9" class="muted center">Could not load tools data.</td></tr>';
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

    const clear = document.getElementById("compare-clear");
    if (clear) {
      clear.addEventListener("click", () => {
        compareData.length = 0;
        renderCompare();
      });
    }
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
      const [cat] = (ev.rubricId || "").split(".");
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

  const cmpVerdictClass = (v) =>
    v === "pass" || v === "recommended"
      ? "verdict-recommended"
      : v === "conditional" || v === "needs_review"
        ? "verdict-provisional"
        : v === "fail" || v === "not_recommended"
          ? "verdict-not-recommended"
          : "";

  function renderCompare() {
    const results = document.getElementById("compare-results");
    const grid = document.getElementById("compare-grid");
    const thead = document.getElementById("compare-thead");
    const tbody = document.getElementById("compare-tbody");
    if (!results || !grid || !thead || !tbody) return;

    if (compareData.length === 0) {
      results.hidden = true;
      return;
    }
    results.hidden = false;

    grid.innerHTML = compareData
      .map((d, i) => {
        const cls = cmpVerdictClass(d.verdict);
        return `<div class="compare-card">
          <button class="compare-remove" data-idx="${i}" aria-label="Remove ${esc(d.toolName)}">&times;</button>
          <h3>${esc(d.toolName)}</h3>
          <div class="compare-url">${esc(d.toolUrl)}</div>
          <div><span class="verdict ${cls}">${esc(d.verdict || "—")}</span></div>
          <div class="compare-points">${d.totalScore.actual}/${d.totalScore.max} points</div>
        </div>`;
      })
      .join("");

    grid.querySelectorAll(".compare-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        compareData.splice(parseInt(btn.dataset.idx, 10), 1);
        renderCompare();
      });
    });

    const principleCodes = ["TR", "RE", "US", "SE", "TC"];
    thead.innerHTML = `<tr><th>Criterion</th>${compareData
      .map((d) => `<th>${esc(d.toolName)}</th>`)
      .join("")}</tr>`;

    const rows = [];
    rows.push(
      `<tr><td>Verdict</td>${compareData
        .map(
          (d) =>
            `<td><span class="verdict ${cmpVerdictClass(d.verdict)}">${esc(d.verdict || "—")}</span></td>`,
        )
        .join("")}</tr>`,
    );
    rows.push(
      `<tr><td>Score</td>${compareData
        .map((d) => `<td>${d.totalScore.actual}/${d.totalScore.max}</td>`)
        .join("")}</tr>`,
    );

    for (const code of principleCodes) {
      const values = compareData.map((d) => d.principles[code]);
      const filtered = values.filter((v) => v !== null);
      const best = filtered.length > 0 ? Math.max(...filtered) : null;
      rows.push(
        `<tr><td data-code="${code.toLowerCase()}">${code}</td>${values
          .map((v) => {
            const isBest = v === best && compareData.length > 1;
            return `<td${isBest ? ' class="highlight-best"' : ""}>${v !== null ? v.toFixed(1) : "—"}</td>`;
          })
          .join("")}</tr>`,
      );
    }

    const proseCell = (items) =>
      `<td class="cell-prose">${items.length ? items.map((s) => esc(s)).join("<br>") : "<em>—</em>"}</td>`;
    rows.push(
      `<tr><td class="cell-prose">Strengths</td>${compareData.map((d) => proseCell(d.strengths)).join("")}</tr>`,
    );
    rows.push(
      `<tr><td class="cell-prose">Weaknesses</td>${compareData.map((d) => proseCell(d.weaknesses)).join("")}</tr>`,
    );

    tbody.innerHTML = rows.join("");
  }

  // ── Utilities ────────────────────────────────────────────────────
  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  initScrollSpy();
  loadTools();
  initCompare();
})();
