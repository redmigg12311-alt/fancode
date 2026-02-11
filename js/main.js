document.addEventListener("DOMContentLoaded", () => {

  const allCategoriesContainer = document.getElementById("allCategoriesContainer");
  const searchBar = document.getElementById("searchBar");
  const playerPopup = document.getElementById("player-popup");
  const closeBtn = document.getElementById("close-player");

  let allMatches = [];
  let playerInstance = null;

  /* ================= HEADER / FOOTER ================= */

  fetch("header.html")
    .then(r => r.text())
    .then(d => document.getElementById("header-placeholder").innerHTML = d)
    .catch(console.error);

  fetch("footer.html")
    .then(r => r.text())
    .then(d => document.getElementById("footer-container").innerHTML = d)
    .catch(console.error);

  /* ================= HELPERS ================= */

  const formatStartTime = (t) => {
    const d = new Date(t);
    return isNaN(d)
      ? "-"
      : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const showError = (msg) => {
    const div = document.createElement("div");
    div.className = "error-message";
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  };

  /* ================= PLAYER ================= */

  function showLoader() {
    const loader = document.createElement("div");
    loader.id = "player-loader";
    loader.innerHTML = "Loading stream...";
    playerPopup.appendChild(loader);
  }

  function removeLoader() {
    const loader = document.getElementById("player-loader");
    if (loader) loader.remove();
  }

  function openPlayer(streamUrl) {
    if (!streamUrl) {
      showError("Stream is not available right now.");
      return;
    }

    playerPopup.classList.add("active");
    showLoader();

    if (playerInstance) {
      playerInstance.remove();
      playerInstance = null;
    }

    playerInstance = jwplayer("player-container");

    playerInstance.setup({
      file: streamUrl,
      type: "hls",
      autostart: true,
      width: "100%",
      aspectratio: "16:9",
    });

    playerInstance.on("ready", () => {
      removeLoader();
    });

    playerInstance.on("error", () => {
      removeLoader();
      showError("This stream is not available right now.");
      closePlayer();
    });

    playerInstance.on("setupError", () => {
      removeLoader();
      showError("Unable to load the player.");
      closePlayer();
    });
  }

  function closePlayer() {
    if (playerInstance) {
      playerInstance.stop();
      playerInstance.remove();
      playerInstance = null;
    }

    playerPopup.classList.remove("active");
  }

  closeBtn.onclick = closePlayer;

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePlayer();
  });

  playerPopup.addEventListener("click", (e) => {
    if (e.target === playerPopup) closePlayer();
  });

  /* ================= APPLE TV STREAM SELECT ================= */

  function showStreamSelector(match) {
    const { adfree_url, dai_url, src, title } = match;

    const overlay = document.createElement("div");
    overlay.id = "apple-stream-overlay";

    overlay.innerHTML = `
      <div class="apple-modal">
        <div class="apple-preview">
          <img src="${src || "https://placehold.co/800x450"}" />
          <div class="apple-gradient"></div>
        </div>

        <div class="apple-content">
          <h2>${title || "Live Stream"}</h2>
          <p>Choose how you want to watch</p>

          <div class="apple-buttons">
            ${adfree_url ? `
              <button class="apple-btn primary" id="appleAdfree">
                ▶ Watch Ad-Free
              </button>
            ` : ""}

            ${dai_url ? `
              <button class="apple-btn secondary" id="appleStandard">
                ▶ Watch Standard
              </button>
            ` : ""}
          </div>

          <button class="apple-close" id="appleClose">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    if (adfree_url) {
      document.getElementById("appleAdfree").onclick = () => {
        overlay.remove();
        openPlayer(adfree_url);
      };
    }

    if (dai_url) {
      document.getElementById("appleStandard").onclick = () => {
        overlay.remove();
        openPlayer(dai_url);
      };
    }

    document.getElementById("appleClose").onclick = () => overlay.remove();

    overlay.addEventListener("click", (e) => {
      if (e.target.id === "apple-stream-overlay") overlay.remove();
    });
  }

  /* ================= PLAY CHANNEL ================= */

  function playChannel(match) {
    const { adfree_url, dai_url } = match;

    if (!adfree_url && !dai_url) {
      showError("No live stream available.");
      return;
    }

    if (adfree_url && dai_url && adfree_url !== dai_url) {
      showStreamSelector(match);
    } else {
      openPlayer(adfree_url || dai_url);
    }
  }

  /* ================= MATCH CARD ================= */

  function createMatchCard(match) {
    const card = document.createElement("div");
    card.className = "movie-card";
    card.onclick = () => playChannel(match);

    card.innerHTML = `
      <img src="${match.src || "https://placehold.co/600x375?text=No+Image"}" />
      <div class="overlay">
        <div class="title">${match.title || "Untitled"}</div>
        <div class="teams">${
          match.team_1 && match.team_2
            ? `${match.team_1} vs ${match.team_2}`
            : match.match_name || ""
        }</div>
        <div class="event">${match.event_name || ""}</div>
        <div class="time">${formatStartTime(match.startTime)}</div>
        <span class="badge ${
          match.status === "LIVE"
            ? "live"
            : match.status === "UPCOMING"
            ? "upcoming"
            : ""
        }">
          ${match.status || ""}
        </span>
      </div>
    `;

    return card;
  }

  /* ================= SECTION ================= */

  function createSection(titleText, matches) {
    const section = document.createElement("section");
    section.className = "movie-section";

    const title = document.createElement("div");
    title.className = "section-title";
    title.textContent = titleText;

    const container = document.createElement("div");
    container.className = "movie-container";

    matches.forEach(m => container.appendChild(createMatchCard(m)));

    section.append(title, container);
    return section;
  }

  /* ================= LOAD MATCHES ================= */

  async function loadMatches() {
    try {
      const res = await fetch(
        "https://raw.githubusercontent.com/drmlive/fancode-live-events/main/fancode.json?_=" +
          Date.now()
      );

      const data = await res.json();
      allMatches = data.matches || [];
      renderMatches(allMatches);

    } catch (err) {
      allCategoriesContainer.innerHTML =
        "<div style='color:#f77;text-align:center;'>Failed to load matches.</div>";
    }
  }

  function renderMatches(matches) {
    allCategoriesContainer.innerHTML = "";

    if (!matches.length) {
      allCategoriesContainer.innerHTML =
        "<div style='color:#bbb;text-align:center;'>No matches available.</div>";
      return;
    }

    const live = matches.filter(m => m.status === "LIVE");
    if (live.length)
      allCategoriesContainer.appendChild(createSection("Live Now", live));

    const grouped = matches.reduce((acc, m) => {
      if (m.status === "LIVE") return acc;
      const cat = m.event_category || "Other Events";
      (acc[cat] ||= []).push(m);
      return acc;
    }, {});

    Object.keys(grouped)
      .sort()
      .forEach(cat =>
        allCategoriesContainer.appendChild(createSection(cat, grouped[cat]))
      );
  }

  /* ================= SEARCH ================= */

  searchBar.oninput = () => {
    const q = searchBar.value.toLowerCase().trim();

    if (!q) return renderMatches(allMatches);

    const filtered = allMatches.filter(m =>
      m.title?.toLowerCase().includes(q) ||
      m.event_name?.toLowerCase().includes(q) ||
      m.team_1?.toLowerCase().includes(q) ||
      m.team_2?.toLowerCase().includes(q)
    );

    renderMatches(filtered);
  };

  loadMatches();
  setInterval(loadMatches, 300000);

});