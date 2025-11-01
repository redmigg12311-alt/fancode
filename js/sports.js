
document.addEventListener('DOMContentLoaded', function () {
    const allCategoriesContainer = document.getElementById("allCategoriesContainer");
    const searchBar = document.getElementById('searchBar');

    function formatStartTime(str) {
        if (!str) return '-';
        try {
            const date = new Date(str);
            if (isNaN(date)) return str;
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return str;
        }
    }

    function playChannel(match) {
        const streamUrl = match.adfree_url ?? match.dai_url;
        if (!streamUrl) {
            showErrorMessage('No live stream available for this match.');
            return;
        }
        if (!/\.(mp4|m3u8)(\?|$)/i.test(streamUrl)) {
            showErrorMessage('Unsupported stream format. Only .mp4 and .m3u8 are supported.');
            return;
        }
        window.open(streamUrl, "_blank", "noopener,noreferrer");
    }

    function showErrorMessage(message) {
        const existingMsg = document.querySelector('.error-message');
        if (existingMsg) existingMsg.remove();

        const msg = document.createElement('div');
        msg.className = 'error-message';
        msg.style.position = 'fixed';
        msg.style.bottom = '20px';
        msg.style.left = '50%';
        msg.style.transform = 'translateX(-50%)';
        msg.style.background = 'rgba(255, 0, 0, 0.8)';
        msg.style.color = '#fff';
        msg.style.padding = '10px 20px';
        msg.style.borderRadius = '4px';
        msg.style.zIndex = '10000';
        msg.style.maxWidth = '90%';
        msg.style.textAlign = 'center';
        msg.style.whiteSpace = 'nowrap';
        msg.textContent = message;
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 3000);
    }

    function createMatchCard(match) {
        const card = document.createElement("div");
        card.className = "movie-card";
        card.tabIndex = "0";
        card.setAttribute('aria-label', `${match.title || 'Match'} - ${match.team_1 || ''} vs ${match.team_2 || ''}`);
        const handlePlay = () => playChannel(match);
        card.addEventListener('click', handlePlay);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlePlay();
            }
        });

        const poster = document.createElement("img");
        poster.src = match.src || "https://placehold.co/600x375?text=No+Image";
        poster.alt = match.title || "Match Image";
        poster.loading = 'lazy';

        const overlay = document.createElement("div");
        overlay.className = "overlay";

        const title = document.createElement("div");
        title.className = "title";
        title.textContent = match.title || "Untitled Match";

        const teams = document.createElement("div");
        teams.className = "teams";
        if (match.team_1 && match.team_2) {
            teams.textContent = `${match.team_1} vs ${match.team_2}`;
        } else if (match.match_name) {
            teams.textContent = match.match_name;
        }

        const event = document.createElement("div");
        event.className = "event";
        event.textContent = match.event_name || "";

        const time = document.createElement("div");
        time.className = "time";
        time.textContent = formatStartTime(match.startTime);

        const badge = document.createElement("span");
        badge.className = "badge";
        if (match.status === "LIVE") {
            badge.classList.add("live");
            badge.textContent = "LIVE";
        } else {
            badge.textContent = match.status || "";
        }

        overlay.appendChild(title);
        if (teams.textContent) overlay.appendChild(teams);
        if (event.textContent) overlay.appendChild(event);
        overlay.appendChild(time);
        if (badge.textContent) overlay.appendChild(badge);

        card.appendChild(poster);
        card.appendChild(overlay);
        return card;
    }

    function createSection(titleText, matches) {
        if (!matches || matches.length === 0) return null;

        const section = document.createElement("section");
        section.className = "movie-section";

        const title = document.createElement("div");
        title.className = "section-title";
        title.textContent = titleText;

        const wrapper = document.createElement("div");
        wrapper.className = "grid-wrapper";

        const container = document.createElement("div");
        container.className = "movie-container grid";

        matches.forEach(match => {
            const card = createMatchCard(match);
            container.appendChild(card);
        });

        wrapper.appendChild(container);
        section.appendChild(title);
        section.appendChild(wrapper);
        return section;
    }

    function addGridScrollButtons() {
        document.querySelectorAll(".grid-wrapper").forEach(wrapper => {
            const grid = wrapper.querySelector(".grid");
            if (!grid) return;

            wrapper.querySelectorAll(".grid-scroll-btn").forEach(btn => btn.remove());

            if (grid.scrollWidth <= grid.clientWidth + 1) return;

            const leftBtn = document.createElement("button");
            leftBtn.className = "grid-scroll-btn left-btn";
            leftBtn.setAttribute("aria-label", "Scroll left");
            leftBtn.innerHTML = `<span class="material-icons" aria-hidden="true">chevron_left</span>`;

            const rightBtn = document.createElement("button");
            rightBtn.className = "grid-scroll-btn right-btn";
            rightBtn.setAttribute("aria-label", "Scroll right");
            rightBtn.innerHTML = `<span class="material-icons" aria-hidden="true">chevron_right</span>`;

            const scrollLeft = () => {
                grid.scrollBy({ left: -grid.clientWidth * 0.85, behavior: "smooth" });
                setTimeout(updateButtons, 400);
            };

            const scrollRight = () => {
                grid.scrollBy({ left: grid.clientWidth * 0.85, behavior: "smooth" });
                setTimeout(updateButtons, 400);
            };

            leftBtn.addEventListener("click", scrollLeft);
            rightBtn.addEventListener("click", scrollRight);

            function updateButtons() {
                leftBtn.disabled = grid.scrollLeft < 10;
                rightBtn.disabled = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 10;
            }

            wrapper.appendChild(leftBtn);
            wrapper.appendChild(rightBtn);

            updateButtons();
            grid.addEventListener("scroll", updateButtons);
            window.addEventListener("resize", updateButtons);
        });
    }

    function filterMatches(query) {
        const normalizedQuery = query.trim().toLowerCase();
        const allCards = document.querySelectorAll('.movie-card');
        let anyVisible = false;

        allCards.forEach(card => {
            const title = card.querySelector('.title')?.textContent.toLowerCase() || '';
            const teams = card.querySelector('.teams')?.textContent.toLowerCase() || '';
            const event = card.querySelector('.event')?.textContent.toLowerCase() || '';

            const isMatch = title.includes(normalizedQuery) ||
                teams.includes(normalizedQuery) ||
                event.includes(normalizedQuery);

            card.style.display = isMatch ? 'flex' : 'none';
            if (isMatch) anyVisible = true;
        });

        document.querySelectorAll('.movie-section').forEach(section => {
            const hasVisibleCards = Array.from(section.querySelectorAll('.movie-card'))
                .some(card => card.style.display !== 'none');
            section.style.display = hasVisibleCards ? '' : 'none';
        });

        return anyVisible;
    }

    function loadMatches(retryCount = 0) {
        const jsonUrl = "https://api.allorigins.win/raw?url=" +
            encodeURIComponent("https://raw.githubusercontent.com/drmlive/fancode-live-events/main/fancode.json") +
            "&cacheBust=" + Date.now();

        // Show loading message
        allCategoriesContainer.innerHTML =
            "<div style='color:#bbb; text-align:center; margin:20px;'>Loading matches...</div>";

        fetch(jsonUrl)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                const matches = Array.isArray(data?.matches) ? data.matches : [];

                if (matches.length === 0) {
                    allCategoriesContainer.innerHTML =
                        "<div style='color:#bbb; text-align:center; margin:20px;'>No matches available at the moment.</div>";
                    return;
                }

                allCategoriesContainer.innerHTML = "";

                const liveMatches = matches.filter(m =>
                    m.status === "LIVE" && (m.adfree_url || m.dai_url)
                );

                if (liveMatches.length > 0) {
                    const liveSection = createSection("Live Now", liveMatches);
                    if (liveSection) allCategoriesContainer.appendChild(liveSection);
                }

                const categorized = matches.reduce((acc, match) => {
                    if (match.status === "LIVE" && (match.adfree_url || match.dai_url)) return acc;
                    const cat = match.event_category || "Other Events";
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(match);
                    return acc;
                }, {});

                Object.keys(categorized)
                    .sort()
                    .forEach(cat => {
                        const section = createSection(cat, categorized[cat]);
                        if (section) allCategoriesContainer.appendChild(section);
                    });

                addGridScrollButtons();

                if (searchBar.value.trim()) {
                    filterMatches(searchBar.value);
                }
            })
            .catch(err => {
                console.error("Failed to load matches:", err);
                if (retryCount < 2) {
                    // Retry up to 3 times
                    setTimeout(() => loadMatches(retryCount + 1), 2000);
                } else {
                    allCategoriesContainer.innerHTML =
                        '<p style="color: #ff5555; text-align:center; padding:20px;">Failed to load matches. Please check your connection and try again.</p>';
                }
            });
    }

    // Search listener
    searchBar.addEventListener('input', () => {
        const query = searchBar.value;
        filterMatches(query);
    });

    // Initial load and auto-refresh
    loadMatches();
    setInterval(loadMatches, 5 * 60 * 1000); // 5 minutes
});
fetch("header.html")
    .then(res => res.text())
    .then(data => {
        document.getElementById("header-placeholder").innerHTML = data;
    });
fetch("footer.html")
    .then(res => res.text())
    .then(data => {
        document.getElementById("footer-container").innerHTML = data;
    });