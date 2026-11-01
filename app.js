(() => {
  const cfg = window.DINUVOX_CONFIG || {};
  const dot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const availability = document.getElementById("availability");
  const enterBtn = document.getElementById("enterBtn");
  const offlinePanel = document.getElementById("offlinePanel");
  const catalog = document.getElementById("catalog");
  const shelfGrid = document.getElementById("shelfGrid");
  const search = document.getElementById("search");
  const libraryCount = document.getElementById("libraryCount");
  const movieCount = document.getElementById("movieCount");
  const seriesCount = document.getElementById("seriesCount");
  const lastUpdated = document.getElementById("lastUpdated");
  let currentKind = "movies", allMovies = [], allSeries = [], serverUrl = "";

  const cleanUrl = value => String(value || "").replace(/\/$/, "");
  function setOffline(message) {
    dot.className = "status-dot offline";
    statusText.textContent = "MEDIA SERVER OFFLINE";
    availability.textContent = message || "Your laptop server is not reachable.";
    libraryCount.textContent = "SERVER OFFLINE";
    enterBtn.classList.add("disabled");
    enterBtn.setAttribute("aria-disabled", "true");
    enterBtn.removeAttribute("href");
    offlinePanel.hidden = false;
    catalog.hidden = true;
  }
  function setOnline(url) {
    serverUrl = cleanUrl(url);
    dot.className = "status-dot online";
    statusText.textContent = "PROJECTION ROOM ONLINE";
    availability.textContent = "Your collection is ready.";
    enterBtn.classList.remove("disabled");
    enterBtn.setAttribute("aria-disabled", "false");
    enterBtn.href = serverUrl + "/";
    offlinePanel.hidden = true;
    catalog.hidden = false;
  }
  async function registryUrl() {
    if (!cfg.SUPABASE_PUBLISHABLE_KEY || cfg.SUPABASE_PUBLISHABLE_KEY.includes("PASTE_")) {
      throw new Error("Add the Supabase publishable key in config.js");
    }
    const endpoint = cfg.SUPABASE_URL + "/rest/v1/media_server_registry?id=eq.1&select=public_url,is_online,updated_at";
    const response = await fetch(endpoint, {headers: {apikey: cfg.SUPABASE_PUBLISHABLE_KEY, Authorization: "Bearer " + cfg.SUPABASE_PUBLISHABLE_KEY}, cache:"no-store"});
    if (!response.ok) throw new Error("Registry request failed (" + response.status + ")");
    const rows = await response.json();
    return rows[0] && rows[0].is_online && rows[0].public_url ? rows[0] : null;
  }
  async function checkServer() {
    try {
      const record = await registryUrl();
      if (!record) { setOffline("Start START_DINUVOX_PORTAL.bat on your laptop to reconnect."); return; }
      const url = cleanUrl(record.public_url);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6500);
      try {
        const response = await fetch(url + "/api/health", {mode:"cors",cache:"no-store",signal:controller.signal});
        if (!response.ok) throw new Error("Health check failed");
        const health = await response.json();
        if (!health.ok) throw new Error("Server reported unavailable");
        setOnline(url);
        await loadCatalogue();
        if (record.updated_at) lastUpdated.textContent = "TUNNEL UPDATED " + new Date(record.updated_at).toLocaleString();
      } finally { clearTimeout(timeout); }
    } catch (error) {
      setOffline(error.name === "AbortError" ? "The laptop server did not respond in time." : "The laptop server is not reachable. Start the DinuVoX launcher.");
      console.warn("DinuVoX connection:", error);
    }
  }
  async function loadCatalogue() {
    try {
      const response = await fetch(serverUrl + "/api/catalog", {mode:"cors",cache:"no-store"});
      if (!response.ok) throw new Error("Catalogue unavailable");
      const data = await response.json();
      allMovies = Array.isArray(data.movies) ? data.movies : [];
      allSeries = Array.isArray(data.web_series) ? data.web_series : [];
      movieCount.textContent = allMovies.length;
      seriesCount.textContent = allSeries.length;
      libraryCount.textContent = allMovies.length + " FILMS · " + allSeries.length + " SERIES";
      renderShelf();
    } catch (error) {
      console.warn("Catalogue:", error);
      setOffline("The server is online, but its catalogue could not be loaded. Check the frontend origin in FRONTEND_ORIGINS.");
    }
  }
  function renderShelf() {
    const term = search.value.trim().toLowerCase();
    const items = currentKind === "movies" ? allMovies : allSeries;
    const filtered = items.filter(item => (item.title || item.name || "").toLowerCase().includes(term));
    shelfGrid.innerHTML = "";
    if (!filtered.length) {
      shelfGrid.innerHTML = '<div class="shelf-card"><div class="shelf-title">No titles found</div><div class="shelf-meta">TRY ANOTHER SEARCH</div></div>';
      return;
    }
    filtered.forEach(item => {
      const title = item.title || item.name || "Untitled";
      const meta = currentKind === "movies" ? ((item.genres || []).join(" · ") || item.extension || "FILM") : ((item.episode_count || 0) + " EPISODES");
      const card = document.createElement("article");
      card.className = "shelf-card";
      const heading = document.createElement("div");
      heading.className = "shelf-title";
      heading.textContent = title;
      const details = document.createElement("div");
      details.className = "shelf-meta";
      details.textContent = meta;
      card.append(heading, details);
      shelfGrid.append(card);
    });
  }
  document.querySelectorAll(".tab").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b === button));
    currentKind = button.dataset.kind;
    renderShelf();
  }));
  search.addEventListener("input", renderShelf);
  checkServer();
  setInterval(checkServer, 20000);
  window.addEventListener("focus", checkServer);
})();