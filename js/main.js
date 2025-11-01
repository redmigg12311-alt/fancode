document.addEventListener("DOMContentLoaded", () => {
  const allCategoriesContainer = document.getElementById(
    "allCategoriesContainer"
  );
  const searchBar = document.getElementById("searchBar");
  let allMatches = [];

  // Load header & footer
  fetch("header.html")
    .then((r) => r.text())
    .then((d) => (document.getElementById("header-placeholder").innerHTML = d))
    .catch(console.error);

  fetch("footer.html")
    .then((r) => r.text())
    .then((d) => (document.getElementById("footer-container").innerHTML = d))
    .catch(console.error);

  // Format start time
  const formatStartTime = (t) => {
    const d = new Date(t);
    return isNaN(d)
      ? "-"
      : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Error message popup
  const showError = (msg) => {
    const div = document.createElement("div");
    div.className = "error-message";
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  };

  // Play stream
  function playChannel(match) {
    const { adfree_url, dai_url } = match;

    if (!adfree_url && !dai_url) {
      showError("No live stream available for this match.");
      return;
    }

    if (adfree_url && dai_url && adfree_url !== dai_url) {
      const overlay = document.createElement("div");
      overlay.id = "stream-select-overlay";
      overlay.innerHTML = `
              <div id="stream-select-box">
                <h3>Select Stream</h3>
                <button id="adfreeBtn">Ad-Free</button>
                <button id="daiBtn">Standard</button><br/>
                <button id="cancelBtn">Cancel</button>
              </div>
            `;
      document.body.appendChild(overlay);

      overlay.querySelector("#adfreeBtn").onclick = () => {
        overlay.remove();
        openJWPlayer(adfree_url, match);
      };
      overlay.querySelector("#daiBtn").onclick = () => {
        overlay.remove();
        openJWPlayer(dai_url, match);
      };
      overlay.querySelector("#cancelBtn").onclick = () => overlay.remove();
    } else {
      openJWPlayer(adfree_url || dai_url, match);
    }
  }

  function openJWPlayer(url, match) {
    const popup = document.getElementById("player-popup");
    popup.style.display = "flex";

    jwplayer("player-container").setup({
      file: url,
      width: "100%",
      aspectratio: "16:9",
      autostart: true,
      hlshtml: true,
      muted: true,
      image: match.src || "https://placehold.co/600x375?text=Match+Preview",
      abouttext: "Ultrawebs (HM)",
      playbackRateControls: true,
      cast: { appid: "CC1AD845" },
      airplay: true,
    });
  }

  document.getElementById("close-player").onclick = () => {
    const popup = document.getElementById("player-popup");
    popup.style.display = "none";
    jwplayer("player-container").stop();
  };

  // Match card
  function createMatchCard(match) {
    const card = document.createElement("div");
    card.className = "movie-card";
    card.onclick = () => playChannel(match);

    card.innerHTML = `
            <img src="${
              match.src || "https://placehold.co/600x375?text=No+Image"
            }" alt="${match.title || "Match"}"/>
            <div class="overlay">
              <div class="title">${match.title || "Untitled"}</div>
              <div class="teams">${
                match.team_1 && match.team_2
                  ? `${match.team_1} vs ${match.team_2}`
                  : match.match_name || ""
              }</div>
              <div class="event">${match.event_name || ""}</div>
              <div class="time">${formatStartTime(match.startTime)}</div>
              <span class="badge ${match.status === "LIVE" ? "live" : ""}">
                ${match.status || ""}
              </span>
            </div>`;
    return card;
  }

  // Movie section with scroll buttons
  function createSection(titleText, matches) {
    const section = document.createElement("section");
    section.className = "movie-section";

    const title = document.createElement("div");
    title.className = "section-title";
    title.textContent = titleText;

    const wrapper = document.createElement("div");
    wrapper.className = "scroll-wrapper";
    wrapper.style.position = "relative";

    const container = document.createElement("div");
    container.className = "movie-container";
    container.style.display = "flex";
    container.style.overflowX = "auto";
    container.style.scrollBehavior = "smooth";
    container.style.gap = "16px";

    const leftBtn = document.createElement("button");
    leftBtn.className = "scroll-btn left";
    leftBtn.innerHTML = "&#8249;";

    const rightBtn = document.createElement("button");
    rightBtn.className = "scroll-btn right";
    rightBtn.innerHTML = "&#8250;";

    wrapper.append(leftBtn, container, rightBtn);
    matches.forEach((m) => container.appendChild(createMatchCard(m)));
    section.append(title, wrapper);

    const scrollBy = () => {
      if (window.innerWidth >= 1200) return 600;
      if (window.innerWidth >= 768) return 400;
      return 250;
    };

    const updateBtns = () => {
      leftBtn.style.display = container.scrollLeft > 10 ? "block" : "none";
      rightBtn.style.display =
        container.scrollLeft + container.clientWidth <
        container.scrollWidth - 10
          ? "block"
          : "none";
    };

    leftBtn.onclick = () => {
      container.scrollBy({ left: -scrollBy(), behavior: "smooth" });
      setTimeout(updateBtns, 300);
    };
    rightBtn.onclick = () => {
      container.scrollBy({ left: scrollBy(), behavior: "smooth" });
      setTimeout(updateBtns, 300);
    };

    container.addEventListener("scroll", updateBtns);
    window.addEventListener("resize", updateBtns);
    setTimeout(updateBtns, 400);

    return section;
  }

  // Load matches
  async function loadMatches() {
    const urls = [
      "https://raw.githubusercontent.com/drmlive/fancode-live-events/main/fancode.json",
      "https://api.codetabs.com/v1/proxy?quest=https://raw.githubusercontent.com/drmlive/fancode-live-events/main/fancode.json",
    ];

    allCategoriesContainer.innerHTML =
      "<div style='color:#bbb;text-align:center;margin:20px;'>Loading matches...</div>";

    for (const url of urls) {
      try {
        const res = await fetch(url + "?_=" + Date.now());
        if (!res.ok) continue;
        const data = await res.json();
        allMatches = data.matches || [];
        renderMatches(allMatches);
        return;
      } catch (err) {
        console.warn("Retry failed, trying backup...");
      }
    }

    allCategoriesContainer.innerHTML =
      "<div style='color:#f77;text-align:center;margin:20px;'>Failed to load matches.</div>";
  }

  function renderMatches(matches) {
    allCategoriesContainer.innerHTML = "";
    if (!matches.length) {
      allCategoriesContainer.innerHTML =
        "<div style='color:#bbb;text-align:center;margin:20px;'>No matches available.</div>";
      return;
    }

    const live = matches.filter((m) => m.status === "LIVE");
    if (live.length)
      allCategoriesContainer.appendChild(createSection("Live Now", live));

    const categories = matches.reduce((acc, m) => {
      if (m.status === "LIVE") return acc;
      const cat = m.event_category || "Other Events";
      (acc[cat] ||= []).push(m);
      return acc;
    }, {});

    Object.keys(categories)
      .sort()
      .forEach((cat) =>
        allCategoriesContainer.appendChild(createSection(cat, categories[cat]))
      );
  }

  searchBar.oninput = () => {
    const q = searchBar.value.toLowerCase().trim();
    if (!q) return renderMatches(allMatches);
    const filtered = allMatches.filter(
      (m) =>
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
