const state = {
  items: [],
  filter: "all",
  searchOpen: false,
  searchQuery: "",
  page: 1,
};

const grid = document.querySelector("#tile-grid");
const photoGrid = document.querySelector("#photo-grid");
const photoSection = document.querySelector(".photo-section");
const pager = document.querySelector(".pager");
const pagerPrev = document.querySelector("#pager-prev");
const pagerNext = document.querySelector("#pager-next");
const pagerStatus = document.querySelector("#pager-status");
const emptyState = document.querySelector("#empty-state");
const searchPanel = document.querySelector("#search-panel");
const searchToggle = document.querySelector("#search-toggle");
const searchInput = document.querySelector("#search-input");
const searchHint = document.querySelector("#search-hint");
const template = document.querySelector("#tile-template");
const photoTemplate = document.querySelector("#photo-template");
const tabs = [...document.querySelectorAll(".tab")];
const PAGE_SIZE = 9;

const sourceLabels = {
  note: "note",
  standfm: "stand.fm",
  works: "WORKS",
  youtube: "YouTube",
  photo: "Photo",
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
    if (item.source === "photo") return false;
    if (state.filter !== "all" && item.source !== state.filter) return false;
    if (!query) return true;
    return [item.title, item.summary, item.source, item.displayDate]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });
};

const photoItems = () => {
  const query = state.searchQuery.trim().toLowerCase();
  return state.items.filter((item) => {
    if (item.source !== "photo") return false;
    if (state.filter !== "all" && state.filter !== "photo") return false;
    if (!query) return true;
    return [item.title, item.summary, item.displayDate]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });
};

const totalPages = (count) => Math.max(1, Math.ceil(count / PAGE_SIZE));

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
  searchPanel.setAttribute("aria-hidden", String(!state.searchOpen));
  searchToggle.setAttribute("aria-expanded", String(state.searchOpen));
  searchHint.textContent = state.searchQuery ? `「${state.searchQuery}」で検索中` : "";
};

const syncPager = (items) => {
  const pages = totalPages(items.length);
  if (state.page > pages) {
    state.page = pages;
  }
  const current = items.length === 0 ? 0 : state.page;
  const hasMany = items.length > PAGE_SIZE;
  pager.hidden = !hasMany;
  pagerPrev.hidden = !hasMany || current <= 1;
  pagerNext.hidden = !hasMany || current >= pages;
  pagerStatus.textContent = hasMany ? `${current} / ${pages} ページ` : "";
};

const render = () => {
  const items = filteredItems();
  const pages = totalPages(items.length);
  const pageItems = items.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
  grid.replaceChildren();
  photoGrid.replaceChildren();
  emptyState.hidden = items.length > 0;

  pageItems.forEach((item, index) => {
    const tile = template.content.firstElementChild.cloneNode(true);
    const image = tile.querySelector(".tile-image");

    tile.href = item.url;
    tile.dataset.source = item.source;
    tile.style.setProperty("--tile-delay", `${Math.min(index, 12) * 40}ms`);
    image.src = item.imageUrl;
    image.alt = item.title;
    tile.querySelector(".tile-badge").textContent = sourceLabels[item.source] || item.source;
    tile.querySelector(".tile-title").textContent = item.title;
    const descriptionElement = tile.querySelector(".tile-description");
    const description = item.source === "works" ? item.summary : "";
    if (description) {
      descriptionElement.hidden = false;
      descriptionElement.textContent = description;
    }
    tile.querySelector(".tile-date").textContent = item.displayDate;
    grid.append(tile);
  });

  const photos = photoItems();
  photos.forEach((item) => {
    const card = photoTemplate.content.firstElementChild.cloneNode(true);
    const image = card.querySelector(".photo-image");
    image.src = item.imageUrl;
    image.alt = item.title;
    photoGrid.append(card);
  });

  const showPhotos = state.filter === "all" || state.filter === "photo";
  photoSection.hidden = !showPhotos || photos.length === 0;
  grid.hidden = state.filter === "photo";

  syncPager(items);
  if (pages === 1) {
    grid.dataset.pageCount = "1";
  } else {
    grid.dataset.pageCount = String(pages);
  }
};

const setItems = (items) => {
  state.items = normalizeItems(items);
  syncTabs();
  syncSearch();
  state.page = 1;
  render();
};

const setFilter = (filter) => {
  state.filter = filter;
  state.page = 1;
  tabs.forEach((tab) => {
    const isActive = tab.dataset.filter === filter;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  render();
};

const setSearchQuery = (query) => {
  state.searchQuery = query;
  state.page = 1;
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

pagerPrev.addEventListener("click", () => {
  if (state.page > 1) {
    state.page -= 1;
    render();
  }
});

pagerNext.addEventListener("click", () => {
  state.page += 1;
  render();
});

document.querySelector("#brand-home").addEventListener("click", () => {
  window.location.reload();
});

setItems(parseInitialData());
loadItems();
syncSearch();
