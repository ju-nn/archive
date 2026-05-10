const state = {
  items: [],
  filter: "all",
  searchOpen: false,
  searchQuery: "",
  page: 1,
  photoIndex: 0,
  photoItems: [],
};

const grid = document.querySelector("#tile-grid");
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
const photoModal = document.querySelector("#photo-modal");
const photoModalClose = document.querySelector("#photo-modal-close");
const photoModalPrev = document.querySelector("#photo-modal-prev");
const photoModalNext = document.querySelector("#photo-modal-next");
const photoModalImage = document.querySelector("#photo-modal-image");
const photoModalCaption = document.querySelector("#photo-modal-caption");
const tabs = [...document.querySelectorAll(".tab")];
const initialFilter = new URLSearchParams(window.location.search).get("filter");
const PAGE_SIZE = 15;

const sourceLabels = {
  note: "note",
  standfm: "stand.fm",
  works: "制作物",
  youtube: "YouTube",
  photo: "写真",
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

const formatPhotoModalMeta = (item) => [
  ["撮影日", item.displayDate],
  ["機種", item.camera],
  ["レンズ", item.lensModel],
  ["F値", item.aperture],
  ["露出", item.exposureTime],
  ["ISO", item.iso],
  ["焦点距離", item.focalLength && item.focalLength35mm ? `${item.focalLength} (${item.focalLength35mm})` : item.focalLength || item.focalLength35mm]
].filter(([, value]) => Boolean(value));

const sortItems = (items) =>
  [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

    const aDate = a.source === "photo" ? a.takenAt || a.publishedAt : a.publishedAt || a.takenAt;
    const bDate = b.source === "photo" ? b.takenAt || b.publishedAt : b.publishedAt || b.takenAt;

    return new Date(bDate || 0) - new Date(aDate || 0);
  });

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

const filteredPhotoItems = () => filteredItems().filter((item) => item.source === "photo");

const totalPages = (count) => Math.max(1, Math.ceil(count / PAGE_SIZE));

const scrollToFeedTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
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
  pagerStatus.textContent = hasMany ? `${current}ページ目を表示中` : "";
};

const render = () => {
  const items = filteredItems();
  state.photoItems = filteredPhotoItems();
  if (state.photoIndex >= state.photoItems.length) {
    state.photoIndex = Math.max(0, state.photoItems.length - 1);
  }
  const pages = totalPages(items.length);
  const pageItems = items.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
  grid.replaceChildren();
  emptyState.hidden = items.length > 0;

  pageItems.forEach((item, index) => {
    if (item.source === "photo") {
      const card = photoTemplate.content.firstElementChild.cloneNode(true);
      const image = card.querySelector(".photo-image");
      const date = card.querySelector(".tile-date");
      image.src = item.imageUrl;
      image.alt = item.title;
      image.addEventListener("load", () => {
        card.dataset.orientation = image.naturalHeight > image.naturalWidth ? "portrait" : "landscape";
      }, { once: true });
      card.style.setProperty("--tile-delay", `${Math.min(index, 12) * 40}ms`);
      card.dataset.source = "photo";
      date.textContent = item.displayDate;
      card.tabIndex = 0;
      card.addEventListener("click", () => openPhotoModal(item));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPhotoModal(item);
        }
      });
      grid.append(card);
      return;
    }

    const tile = template.content.firstElementChild.cloneNode(true);
    const image = tile.querySelector(".tile-image");

    tile.href = item.url;
    tile.dataset.source = item.source;
    tile.style.setProperty("--tile-delay", `${Math.min(index, 12) * 40}ms`);
    image.src = item.imageUrl;
    image.alt = item.title;
    tile.querySelector(".tile-badge").textContent = sourceLabels[item.source] || item.source;
    const pin = tile.querySelector(".tile-pin");
    pin.hidden = !item.pinned;
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

  grid.hidden = false;

  syncPager(items);
  if (pages === 1) {
    grid.dataset.pageCount = "1";
  } else {
    grid.dataset.pageCount = String(pages);
  }
};

const setItems = (items) => {
  state.items = sortItems(normalizeItems(items));
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

const showPhoto = (index) => {
  if (!state.photoItems.length) return;
  const normalizedIndex = (index + state.photoItems.length) % state.photoItems.length;
  state.photoIndex = normalizedIndex;
  const item = state.photoItems[normalizedIndex];
  photoModalImage.src = item.imageUrl;
  photoModalImage.alt = item.title;
  const meta = formatPhotoModalMeta(item);
  photoModalCaption.replaceChildren();
  const title = document.createElement("div");
  title.className = "photo-modal-title";
  title.textContent = item.title;
  photoModalCaption.append(title);
  if (meta.length > 0) {
    const list = document.createElement("dl");
    list.className = "photo-modal-meta";
    meta.forEach(([label, value]) => {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      list.append(dt, dd);
    });
    photoModalCaption.append(list);
  }
  const hasMany = state.photoItems.length > 1;
  photoModalPrev.hidden = !hasMany;
  photoModalNext.hidden = !hasMany;
};

const openPhotoModal = (item) => {
  const index = state.photoItems.findIndex((photo) => photo.url === item.url);
  if (index === -1) return;
  showPhoto(index);
  photoModal.hidden = false;
  photoModal.showModal();
};

const closePhotoModal = () => {
  if (photoModal.open) {
    photoModal.close();
  }
  photoModal.hidden = true;
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
    scrollToFeedTop();
  }
});

pagerNext.addEventListener("click", () => {
  state.page += 1;
  render();
  scrollToFeedTop();
});

photoModalClose.addEventListener("click", closePhotoModal);
photoModalPrev.addEventListener("click", () => showPhoto(state.photoIndex - 1));
photoModalNext.addEventListener("click", () => showPhoto(state.photoIndex + 1));

photoModal.addEventListener("click", (event) => {
  if (event.target === photoModal) {
    closePhotoModal();
  }
});

photoModal.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePhotoModal();
    return;
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    showPhoto(state.photoIndex - 1);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    showPhoto(state.photoIndex + 1);
  }
});

document.querySelector("#brand-home").addEventListener("click", () => {
  window.location.reload();
});

setItems(parseInitialData());
if (tabs.some((tab) => tab.dataset.filter === initialFilter)) {
  setFilter(initialFilter);
}
loadItems();
syncSearch();
photoModal.hidden = true;
