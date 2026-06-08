// TRUST Conference Site — Tab Navigation
(function () {
  const tabs = document.querySelectorAll(".tab-nav a");
  const panels = document.querySelectorAll(".tab-panel");

  function showTab(id) {
    // Update nav links
    tabs.forEach(function (a) {
      a.classList.toggle("active", a.dataset.tab === id);
    });
    // Update panels
    panels.forEach(function (panel) {
      panel.classList.toggle("active", panel.id === id);
    });
    // Update URL hash without scroll jump
    history.replaceState(null, "", "#" + id);
  }

  // Click handlers
  tabs.forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      showTab(a.dataset.tab);
    });
  });

  // Handle initial hash or browser back/forward
  function initFromHash() {
    var hash = location.hash.slice(1);
    if (hash && document.getElementById(hash)) {
      showTab(hash);
    }
  }
  window.addEventListener("hashchange", initFromHash);
  initFromHash();
})();
