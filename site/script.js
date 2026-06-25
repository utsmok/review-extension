// TRUST site — scroll-spy nav + Tools table + Compare
(() => {
  // ── Scroll-spy: highlight the nav link for the section in view ────
  function initScrollSpy() {
    const topNav = document.querySelector(".tab-nav");
    const topLinks = Array.from(document.querySelectorAll(".tab-nav a[href^='#']"));
    const subLinks = Array.from(document.querySelectorAll(".sub-nav a[href^='#']"));
    if (!topLinks.length) return;

    // Leaf sections that carry a sub-nav link, plus Contact (a top-level target
    // with no sub-nav of its own). Each leaf resolves to its parent .group.
    const subMap = new Map();
    for (const link of subLinks) {
      const sec = document.getElementById(link.getAttribute("href").slice(1));
      if (sec) subMap.set(sec, link);
    }
    const leaves = [...subMap.keys()];
    const contact = document.getElementById("contact");
    if (contact && !subMap.has(contact)) leaves.push(contact);

    const setActive = (id) => {
      const sec = document.getElementById(id);
      const group = sec?.closest(".group");
      const groupId = group ? group.id : id; // Contact resolves to itself
      // Drive the dynamic accent: purple → blue → green → orange → purple.
      const accent =
        groupId === "background"
          ? "var(--tr)"
          : groupId === "extension"
            ? "var(--re)"
            : groupId === "next"
              ? "var(--se)"
              : "var(--trust-magenta)";
      document.documentElement.style.setProperty("--active-accent", accent);
      let activeTop = null;
      for (const link of topLinks) {
        const on = link.getAttribute("href") === `#${groupId}`;
        link.classList.toggle("active", on);
        if (on) activeTop = link;
      }
      // On narrow viewports the top nav scrolls horizontally: keep the active
      // group link in view (scrollLeft only — never scroll the page).
      if (activeTop && topNav && topNav.scrollWidth > topNav.clientWidth) {
        const center = activeTop.offsetLeft + activeTop.offsetWidth / 2;
        topNav.scrollLeft = center - topNav.clientWidth / 2;
      }
      // Sub-nav: highlight only the active section's own pill.
      for (const link of subLinks) {
        link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );
    for (const sec of leaves) observer.observe(sec);
    if (leaves[0]) setActive(leaves[0].id);
  }

  // ── Tools Table ──────────────────────────────────────────────────
  async function loadTools() {
    const tbody = document.getElementById("tools-tbody");
    if (!tbody) return;
    try {
      const res = await fetch("data/tools/registry.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

    // Make the drop zone keyboard-operable (it's a div, not a native control).
    drop.setAttribute("tabindex", "0");
    drop.setAttribute("role", "button");
    drop.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        input.click();
      }
    });

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

    // Aria-live polite region for compare results announcements.
    const results = document.getElementById("compare-results");
    if (results && !results.querySelector("[aria-live]")) {
      const status = document.createElement("div");
      status.setAttribute("aria-live", "polite");
      status.className = "sr-only";
      status.id = "compare-status";
      results.insertBefore(status, results.firstChild);
    }

    const clear = document.getElementById("compare-clear");
    if (clear) {
      clear.addEventListener("click", () => {
        compareData.length = 0;
        renderCompare();
      });
    }
  }
  function showFileError(msg) {
    let el = document.getElementById("compare-error");
    if (!el) {
      el = document.createElement("div");
      el.id = "compare-error";
      el.setAttribute("role", "alert");
      el.className = "compare-error";
      const drop = document.getElementById("compare-drop");
      if (drop) drop.parentNode.insertBefore(el, drop.nextSibling);
    }
    el.textContent = msg;
    // Auto-dismiss after 6 seconds.
    clearTimeout(el._tid);
    el._tid = setTimeout(() => {
      el.textContent = "";
    }, 6000);
  }

  async function handleFiles(files) {
    showFileError("");
    let errors = 0;
    let lastError = null;
    for (const file of files) {
      try {
        const data = await parseZip(file);
        if (data) compareData.push(data);
        else errors++;
      } catch (e) {
        console.warn("Failed to parse", file.name, e);
        lastError = e;
        errors++;
      }
    }
    if (errors > 0) {
      const total = files.length;
      showFileError(
        total === 1 && lastError?.message
          ? lastError.message
          : total === 1
            ? "Could not read that file — it may not be a valid TRUST review archive."
            : `${errors} of ${total} file${errors > 1 ? "s" : ""} could not be read.`,
      );
    }
    renderCompare();
  }

  async function parseZip(file) {
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

    const status = document.getElementById("compare-status");

    if (compareData.length === 0) {
      results.hidden = true;
      if (status) status.textContent = "Comparison results cleared.";
      return;
    }
    results.hidden = false;
    if (status)
      status.textContent = `Comparison results updated — ${compareData.length} session${compareData.length > 1 ? "s" : ""} loaded.`;

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
    thead.innerHTML = `<tr><th scope="col">Criterion</th>${compareData
      .map((d) => `<th scope="col">${esc(d.toolName)}</th>`)
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

/* =====================================================================
   Motion — scroll progress, scroll reveals
   Self-contained block; does not modify any existing functions.
   ===================================================================== */
(() => {
  // Mark JS active so [data-reveal] only hides when enhancement is running.
  // Without JS, html.js is never set and all content stays visible.
  document.documentElement.classList.add("js");

  const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Auto-tag meaningful blocks for scroll reveal (hero has its own entrance) ─ */
  document.querySelectorAll(".install-grid, .links-grid, .roadmap-grid").forEach((grid) => {
    if (grid.closest("#top")) return;
    grid.setAttribute("data-reveal-stagger", "");
    grid.querySelectorAll(":scope > *").forEach((c) => {
      c.setAttribute("data-reveal", "");
    });
  });
  document
    .querySelectorAll(
      ".section-head, .notice, .card, .at-a-glance, .screenshot-row, .ref-list, .authors, .example-actions, .table-wrap",
    )
    .forEach((el) => {
      if (el.closest("#top")) return;
      el.setAttribute("data-reveal", "");
    });

  const revealTargets = document.querySelectorAll("[data-reveal]");

  /* ── Scroll progress + reveal ──────────────────────────────────────── */
  // Progress: cheap per-frame — reads scrollTop, sets a CSS var the compositor
  // consumes via transform. No layout cost.
  const bar = document.querySelector(".scroll-progress");
  const updateProgress = () => {
    if (!bar) return;
    const max = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    bar.style.setProperty(
      "--scroll-progress",
      max > 0 ? document.documentElement.scrollTop / max : 0,
    );
  };

  // Reveal: IntersectionObserver fires on enter with NO per-frame layout reads
  // (getBoundingClientRect inside a scroll handler janks mobile scrolling). A
  // debounced catch-up runs ONCE after scrolling settles to recover anything a
  // fast fling or anchor jump skipped — zero cost during the scroll itself.
  const revealAllInView = () => {
    const vh = window.innerHeight;
    document.querySelectorAll("[data-reveal]:not(.revealed)").forEach((el) => {
      if (el.getBoundingClientRect().top < vh) el.classList.add("revealed");
    });
  };

  if (prefersReduced) {
    revealTargets.forEach((el) => {
      el.classList.add("revealed");
    });
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 },
    );
    revealTargets.forEach((el) => {
      io.observe(el);
    });

    let ticking = false;
    let settle = null;
    const onScroll = () => {
      document.body.classList.add("is-scrolling");
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          updateProgress();
          ticking = false;
        });
      }
      if (settle) clearTimeout(settle);
      settle = setTimeout(() => {
        document.body.classList.remove("is-scrolling");
        revealAllInView();
      }, 150);
    };
    updateProgress();
    revealAllInView();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  }
})();

/* =====================================================================
   Nav toggle (mobile dropdown) + abstract modal
   Self-contained; does not touch scroll-spy or motion logic.
   ===================================================================== */
(() => {
  // ── Mobile nav dropdown ───────────────────────────────────────────
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("tab-nav");
  const closeNav = () => {
    if (!nav || !toggle) return;
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // Close after following a section link so the menu doesn't strand open.
    nav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", closeNav);
    });
    // Close when a click lands outside the header.
    document.addEventListener("click", (e) => {
      if (nav.classList.contains("open") && !e.target.closest(".site-header")) closeNav();
    });
  }
  // ── Abstract & references modal (<dialog>) ───────────────────────
  const modal = document.getElementById("abstract-modal");
  // Remember the opener so focus returns to it when the dialog closes —
  // without this, Escape/backdrop close strands keyboard users on <body>.
  let lastTrigger = null;
  const openModal = (e) => {
    e?.preventDefault();
    closeNav(); // don't strand the mobile menu open behind the modal
    lastTrigger = e?.currentTarget || document.activeElement;
    if (modal && typeof modal.showModal === "function") modal.showModal();
    else if (modal) modal.setAttribute("open", "");
  };
  const closeModal = () => {
    if (modal && typeof modal.close === "function") modal.close();
    else if (modal) modal.removeAttribute("open");
  };
  document.querySelectorAll("[data-open-abstract]").forEach((b) => {
    b.addEventListener("click", openModal);
  });
  document.querySelectorAll("[data-close-abstract]").forEach((b) => {
    b.addEventListener("click", closeModal);
  });
  if (modal) {
    // Return focus to the opener — the native "close" event fires for every
    // dismissal path (Escape, backdrop click, close button).
    modal.addEventListener("close", () => {
      if (lastTrigger) {
        lastTrigger.focus();
        lastTrigger = null;
      }
    });
    // Backdrop click: native <dialog> makes the dialog itself the click target
    // for clicks on the backdrop area.
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
    // [N] citation markers: scroll the reference into view within the modal.
    modal.querySelectorAll('a[href^="#ref-"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const target = modal.querySelector(a.getAttribute("href"));
        if (target)
          target.scrollIntoView({
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
            block: "start",
          });
      });
    });
  }
})();
