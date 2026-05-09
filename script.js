const state = {
  items: [],
  filter: "all",
  searchOpen: false,
  searchQuery: "",
};

const grid = document.querySelector("#tile-grid");
const emptyState = document.querySelector("#empty-state");
const searchPanel = document.querySelector("#search-panel");
const searchToggle = document.querySelector("#search-toggle");
const searchInput = document.querySelector("#search-input");
const searchHint = document.querySelector("#search-hint");
const template = document.querySelector("#tile-template");
const tabs = [...document.querySelectorAll(".tab")];

const sourceLabels = {
  note: "note",
  standfm: "stand.fm",
  works: "WORKS",
  youtube: "YouTube",
};

const displayDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}に公開`;
};

const parseInitialData = () => {
  const element = document.querySelector("#initial-feed-data");
  if (!element?.textContent) return [];

  try {
    const data = JSON.parse(element.textContent);
    return Array.isArray(data.items) ? data.items : [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

const normalizeItems = (items) =>
  items.filter((item) => item?.url && item?.title).map((item) => ({
    ...item,
    imageUrl: item.imageUrl || "./assets/icon.png",
    displayDate: item.displayDate || displayDate(item.publishedAt),
  }));

const filteredItems = () => {
  const query = state.searchQuery.trim().toLowerCase();
  return state.items.filter((item) => {
    if (state.filter !== "all" && item.source !== state.filter) return false;
    if (!query) return true;
    return [item.title, item.summary, item.source, item.displayDate]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });
};

const syncTabs = () => {
  const sources = new Set(state.items.map((item) => item.source));
  tabs.forEach((tab) => {
    const filter = tab.dataset.filter;
    tab.hidden = filter !== "all" && !sources.has(filter);
  });

  if (state.filter !== "all" && !sources.has(state.filter)) {
    state.filter = "all";
  }
};

const syncSearch = () => {
  searchPanel.hidden = !state.searchOpen;
  searchToggle.setAttribute("aria-expanded", String(state.searchOpen));
  searchHint.textContent = state.searchQuery ? `「${state.searchQuery}」で検索中` : "";
};

const render = () => {
  const items = filteredItems();
  grid.replaceChildren();
  emptyState.hidden = items.length > 0;

  items.forEach((item, index) => {
    const tile = template.content.firstElementChild.cloneNode(true);
    const image = tile.querySelector(".tile-image");

    tile.href = item.url;
    tile.dataset.source = item.source;
    tile.style.setProperty("--tile-delay", `${Math.min(index, 12) * 40}ms`);
    image.src = item.imageUrl;
    image.alt = item.title;
    tile.querySelector(".tile-badge").textContent = sourceLabels[item.source] || item.source;
    tile.querySelector(".tile-title").textContent = item.title;
    tile.querySelector(".tile-date").textContent = item.displayDate;
    grid.append(tile);
  });
};

const setItems = (items) => {
  state.items = normalizeItems(items);
  syncTabs();
  syncSearch();
  render();
};

const setFilter = (filter) => {
  state.filter = filter;
  tabs.forEach((tab) => {
    const isActive = tab.dataset.filter === filter;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  render();
};

const setSearchQuery = (query) => {
  state.searchQuery = query;
  syncSearch();
  render();
};

const loadItems = async () => {
  try {
    const response = await fetch(new URL("./data/feed-items.json", window.location.href), { cache: "no-store" });
    if (!response.ok) throw new Error(`feed-items.json returned ${response.status}`);
    const data = await response.json();
    if (Array.isArray(data.items) && data.items.length > 0) {
      setItems(data.items);
    }
  } catch (error) {
    console.warn("Using embedded feed data.", error);
  }
};

tabs.forEach((tab) => {
  tab.setAttribute("role", "tab");
  tab.addEventListener("click", () => setFilter(tab.dataset.filter));
});

searchToggle.addEventListener("click", () => {
  state.searchOpen = !state.searchOpen;
  syncSearch();
  if (state.searchOpen) {
    searchInput.focus();
  } else {
    searchInput.value = "";
    setSearchQuery("");
  }
});

searchInput.addEventListener("input", () => {
  setSearchQuery(searchInput.value);
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    searchInput.value = "";
    setSearchQuery("");
    state.searchOpen = false;
    syncSearch();
    searchToggle.focus();
  }
});

setItems(parseInitialData());
loadItems();
