document.addEventListener("DOMContentLoaded", () => {

  const allCategoriesContainer = document.getElementById("allCategoriesContainer");
  const searchBar = document.getElementById("searchBar");

  let allMatches = [];

  /* ================= HEADER / FOOTER ================= */

  async function loadLayout() {
    try {
      const header = await fetch("header.html").then(r => r.text());
      const footer = await fetch("footer.html").then(r => r.text());

      document.getElementById("header-placeholder").innerHTML = header;
      document.getElementById("footer-container").innerHTML = footer;
    } catch (err) {
      console.error("Layout load error:", err);
    }
  }

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

  async function openSecureStream(match) {

    if (!match?.match_id) {
      showError("Stream not available.");
      return;
    }

    try {

      // 1️⃣ Open blank window immediately (avoids popup blocking)
      const newWindow = window.open("", "_blank");

      if (!newWindow) {
        showError("Popup blocked. Please allow popups.");
        return;
      }

      // 2️⃣ Get signed token
      const tokenRes = await fetch(`/api/get-stream-token?match_id=${match.match_id}`);

      if (!tokenRes.ok) {
        newWindow.close();
        showError("Unable to generate stream token.");
        return;
      }

      const { token, expiry } = await tokenRes.json();

      // 3️⃣ Redirect blank window to player page
      const playerUrl =
        `/player.html?match_id=${match.match_id}` +
        `&token=${token}` +
        `&expiry=${expiry}` +
        `&title=${encodeURIComponent(match.title || "Live Stream")}`;

      newWindow.location.href = playerUrl;

    } catch (err) {
      console.error("Secure stream error:", err);
      showError("Unable to open stream.");
    }
  }

  /* ================= STREAM SELECTOR ================= */

  function showStreamSelector(match) {

    const overlay = document.createElement("div");
    overlay.id = "apple-stream-overlay";

    overlay.innerHTML = `
      <div class="apple-modal">
        <div class="apple-preview">
          <img src="${match.src || "https://placehold.co/800x450"}" />
          <div class="apple-gradient"></div>
        </div>

        <div class="apple-content">
          <h2>${match.title || "Live Stream"}</h2>
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
      openSecureStream(match);
    };

    document.getElementById("appleClose").onclick = () => overlay.remove();

    overlay.addEventListener("click", (e) => {
      if (e.target.id === "apple-stream-overlay") overlay.remove();
    });
  }

  /* ================= PLAY CHANNEL ================= */

  function playChannel(match) {
    if (!match?.match_id) {
      showError("No live stream available.");
      return;
    }
    showStreamSelector(match);
  }

  /* ================= MATCH CARD ================= */

  function createMatchCard(match) {

    const card = document.createElement("div");
    card.className = "movie-card";

    card.addEventListener("click", () => playChannel(match));

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
      console.error("Match load error:", err);
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

  searchBar.addEventListener("input", () => {

    const q = searchBar.value.toLowerCase().trim();

    if (!q) {
      renderMatches(allMatches);
      return;
    }

    const filtered = allMatches.filter(m =>
      m.title?.toLowerCase().includes(q) ||
      m.event_name?.toLowerCase().includes(q) ||
      m.team_1?.toLowerCase().includes(q) ||
      m.team_2?.toLowerCase().includes(q)
    );

    renderMatches(filtered);
  });

  /* ================= INIT ================= */

  loadLayout();
  loadMatches();
  setInterval(loadMatches, 300000);

});