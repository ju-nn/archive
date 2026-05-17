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
const tocToggle = document.querySelector("#toc-toggle");
const tocClose = document.querySelector("#toc-close");
const tocPanel = document.querySelector("#toc-panel");
const tocSide = document.querySelector("#toc-side");
const tocMain = document.querySelector("#toc-main");
const gearList = document.querySelector("#gear-list");
const sharedGearData = window.__GEAR_DATA__;
const tabs = [...document.querySelectorAll(".tab")];
const initialFilter = new URLSearchParams(window.location.search).get("filter");
const initialView = new URLSearchParams(window.location.search).get("view");
const PAGE_SIZE = 12;
const tocState = {
  monthSections: [],
  sideLinks: new Map(),
  sideYears: new Map(),
};

const sourceLabels = {
  note: "note",
  standfm: "stand.fm",
  works: "制作物",
  youtube: "YouTube",
  photo: "写真",
};

const fallbackGearCatalog = {
  associateTag: "rlst-22",
  featuredIds: ["ricoh-gr-iiix", "codex-app", "stan-rice-cooker", "sp500"],
  items: [
    { id: "ricoh-gr-iiix", name: "RICOH GR IIIx", note: "小さくて、日常を持ち歩けるカメラ。", amazonSearch: "RICOH GR IIIx", featured: true },
    { id: "codex-app", name: "Codex App", note: "作りたいものを、形にするための相棒。", featured: true },
    { id: "stan-rice-cooker", name: "STAN. 炊飯器", note: "自炊のハードルを下げてくれる生活インフラ。", amazonSearch: "STAN 炊飯器", featured: true },
    { id: "sp500", name: "S&P500", note: "働きすぎない未来のための、静かな逃げ道。", featured: true },
  ],
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

const monthKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (value) => {
  const date = new Date(`${value}-01T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
};

const tocSourceLabels = {
  note: "note",
  standfm: "stand.fm",
  works: "制作物",
  youtube: "YouTube",
  photo: "写真",
};

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
  searchToggle.classList.toggle("is-open", state.searchOpen);
  searchHint.textContent = state.searchQuery ? `「${state.searchQuery}」で検索中` : "";
};

const closeSearch = ({ clearQuery = false } = {}) => {
  state.searchOpen = false;
  if (clearQuery) {
    searchInput.value = "";
    setSearchQuery("");
    return;
  }
  syncSearch();
};

const openSearch = () => {
  state.searchOpen = true;
  syncSearch();
  searchInput.focus();
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
    const badge = tile.querySelector(".tile-badge");
    badge.textContent = sourceLabels[item.source] || item.source;
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

const renderToc = () => {
  const items = sortItems(normalizeItems(state.items)).filter((item) => Boolean(item.publishedAt));
  const grouped = new Map();

  items.forEach((item) => {
    const key = monthKey(item.publishedAt);
    if (!key) return;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  });

  tocSide.replaceChildren();
  tocMain.replaceChildren();
  tocState.monthSections = [];
  tocState.sideLinks.clear();
  tocState.sideYears.clear();

  const yearGroups = new Map();
  [...grouped.keys()].sort((a, b) => b.localeCompare(a)).forEach((key) => {
    const year = key.slice(0, 4);
    if (!yearGroups.has(year)) yearGroups.set(year, []);
    yearGroups.get(year).push(key);
  });

  yearGroups.forEach((monthKeys, year) => {
    const yearWrap = document.createElement("div");
    yearWrap.className = "toc-side-year";
    yearWrap.dataset.year = year;

    const yearLink = document.createElement("a");
    yearLink.href = `#toc-year-${year}`;
    yearLink.textContent = `${year}年`;
    yearLink.className = "toc-side-year-link";
    yearWrap.append(yearLink);

    monthKeys.forEach((key) => {
      const monthLink = document.createElement("a");
      monthLink.href = `#toc-month-${key}`;
      monthLink.textContent = monthLabel(key);
      monthLink.className = "toc-side-month-link";
      monthLink.dataset.month = key;
      tocState.sideLinks.set(key, monthLink);
      yearWrap.append(monthLink);
    });
    tocState.sideYears.set(year, yearWrap);
    tocSide.append(yearWrap);

    const group = document.createElement("section");
    group.className = "toc-group";
    group.id = `toc-year-${year}`;

    const heading = document.createElement("h3");
    heading.textContent = `${year}年`;
    group.append(heading);

    const list = document.createElement("div");
    list.className = "toc-list";

    monthKeys.forEach((key) => {
      const monthSection = document.createElement("section");
      monthSection.className = "toc-month";
      monthSection.id = `toc-month-${key}`;
      monthSection.dataset.month = key;
      tocState.monthSections.push(monthSection);

      grouped.get(key).forEach((item) => {
        const row = document.createElement("a");
        row.className = "toc-row";
        row.href = item.url;
        row.target = "_blank";
        row.rel = "noopener noreferrer";
        const badge = document.createElement("span");
        badge.className = "toc-badge";
        badge.textContent = tocSourceLabels[item.source] || item.source || "";
        const title = document.createElement("span");
        title.className = "toc-title";
        title.textContent = item.title;
        const date = document.createElement("span");
        date.className = "toc-date";
        date.textContent = item.displayDate?.replace("に公開", "") || "";
        row.append(badge, title, date);
        monthSection.append(row);
      });

      list.append(monthSection);
    });

    group.append(list);
    tocMain.append(group);
  });

  updateTocActive();
};

const amazonUrlForGearItem = (item, associateTag) => {
  if (item.amazonUrl) {
    const url = new URL(item.amazonUrl, window.location.href);
    if (url.hostname.includes("amazon.")) {
      url.searchParams.set("tag", associateTag);
    }
    return url.href;
  }
  if (!item.amazonSearch) return "";
  return `https://www.amazon.co.jp/s?k=${encodeURIComponent(item.amazonSearch)}&tag=${associateTag}`;
};

const renderGear = (catalog) => {
  if (!gearList) return;

  const itemsByCategory = new Map();
  (catalog.items || []).forEach((item) => {
    if (!itemsByCategory.has(item.category)) itemsByCategory.set(item.category, []);
    itemsByCategory.get(item.category).push(item);
  });

  const categories = catalog.categories || [];
  const nodes = categories.map((category, index) => {
    const items = itemsByCategory.get(category.id) || [];
    const featured = items.find((item) => item.featured) || items[0];
    const card = document.createElement("article");
    card.className = "gear-category-card gear-category-card--compact";
    card.style.setProperty("--gear-delay", `${index * 40}ms`);
    card.dataset.tone = category.tone || "neutral";

    const link = document.createElement("a");
    link.className = "gear-category-link";
    link.href = `./gear.html#gear-section-${category.id}`;

    const symbol = document.createElement("span");
    symbol.className = "gear-category-symbol";
    symbol.textContent = category.symbol || "・";

    const copy = document.createElement("span");
    copy.className = "gear-category-copy";

    const title = document.createElement("span");
    title.className = "gear-category-title";
    title.textContent = category.title;

    const summary = document.createElement("span");
    summary.className = "gear-category-summary";
    summary.textContent = category.summary || "";

    copy.append(title, summary);

    const preview = document.createElement("span");
    preview.className = "gear-category-preview";
    preview.textContent = featured ? featured.name : "一覧を見る";

    const count = document.createElement("span");
    count.className = "gear-category-count";
    count.textContent = `${items.length}件`;

    link.append(symbol, copy, preview, count);
    card.append(link);
    return card;
  });

  gearList.replaceChildren(...nodes);
};

const loadGear = async () => {
  if (sharedGearData) {
    renderGear(sharedGearData);
    return;
  }

  renderGear(fallbackGearCatalog);
};

const setView = (view) => {
  const showToc = view === "toc";
  if (showToc && state.searchOpen) {
    closeSearch();
  }
  tocPanel.hidden = !showToc;
  tocToggle.setAttribute("aria-expanded", String(showToc));
  tocToggle.classList.toggle("is-open", showToc);
  document.body.classList.toggle("is-toc-view", showToc);
  if (showToc) requestAnimationFrame(updateTocActive);
};

const updateTocActive = () => {
  if (tocPanel.hidden || tocState.monthSections.length === 0) return;
  const probeY = window.innerHeight * 0.35;
  let currentMonth = tocState.monthSections[0]?.dataset.month || "";

  for (const section of tocState.monthSections) {
    const rect = section.getBoundingClientRect();
    if (rect.top <= probeY) {
      currentMonth = section.dataset.month || currentMonth;
    }
  }

  tocState.sideLinks.forEach((link, month) => {
    link.classList.toggle("is-active", month === currentMonth);
  });

  tocState.sideYears.forEach((yearWrap) => {
    const links = [...yearWrap.querySelectorAll(".toc-side-month-link")];
    const isActiveYear = links.some((link) => link.classList.contains("is-active"));
    yearWrap.classList.toggle("is-active", isActiveYear);
  });
};

const setItems = (items) => {
  state.items = sortItems(normalizeItems(items));
  syncTabs();
  syncSearch();
  state.page = 1;
  render();
  renderToc();
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
  if (state.searchOpen) {
    closeSearch({ clearQuery: true });
    return;
  }
  setView("feed");
  openSearch();
});

searchInput.addEventListener("input", () => {
  setSearchQuery(searchInput.value);
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSearch({ clearQuery: true });
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

tocToggle.addEventListener("click", () => {
  const showToc = tocPanel.hidden;
  setView(showToc ? "toc" : "feed");
});

tocClose.addEventListener("click", () => setView("feed"));

window.addEventListener("scroll", updateTocActive, { passive: true });
window.addEventListener("resize", updateTocActive);

setItems(parseInitialData());
if (tabs.some((tab) => tab.dataset.filter === initialFilter)) {
  setFilter(initialFilter);
}
loadItems();
syncSearch();
renderToc();
loadGear();
if (initialView === "toc") {
  setView("toc");
}
photoModal.hidden = true;
