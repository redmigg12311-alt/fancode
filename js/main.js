document.addEventListener("DOMContentLoaded", () => {

  const allCategoriesContainer = document.getElementById("allCategoriesContainer");
  const searchBar = document.getElementById("searchBar");

  let allMatches = [];

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

  /* ================= SECURE STREAM OPEN ================= */

  async function openSecureStream(matchId) {

    if (!matchId) {
      showError("Stream not available.");
      return;
    }

    try {
      // 1️⃣ Get signed token
      const tokenRes = await fetch(`/api/get-stream-token?match_id=${matchId}`);

      if (!tokenRes.ok) {
        showError("Unable to generate stream token.");
        return;
      }

      const { token, expiry } = await tokenRes.json();

      // 2️⃣ Open PLAYER PAGE (NOT API)
      const playerUrl =
        `/player.html?match_id=${matchId}&token=${token}&expiry=${expiry}`;

      const newWindow = window.open(playerUrl, "_blank");

      if (!newWindow) {
        showError("Popup blocked. Please allow popups.");
      }

    } catch (err) {
      console.error(err);
      showError("Unable to open stream.");
    }
  }

  /* ================= STREAM SELECTOR ================= */

  function showStreamSelector(match) {

    const { match_id, src, title } = match;

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
          <p>Start watching now</p>

          <div class="apple-buttons">
            <button class="apple-btn primary" id="appleWatch">
              ▶ Watch Live
            </button>
          </div>

          <button class="apple-close" id="appleClose">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("appleWatch").onclick = () => {
      overlay.remove();
      openSecureStream(match_id);
    };

    document.getElementById("appleClose").onclick = () => overlay.remove();

    overlay.addEventListener("click", (e) => {
      if (e.target.id === "apple-stream-overlay") overlay.remove();
    });
  }

  /* ================= PLAY CHANNEL ================= */

  function playChannel(match) {
    if (!match.match_id) {
      showError("No live stream available.");
      return;
    }
    showStreamSelector(match);
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
    if (live.length) {
      allCategoriesContainer.appendChild(createSection("Live Now", live));
    }

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