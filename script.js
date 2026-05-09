const state = {
  items: [],
  filter: "all",
};

const grid = document.querySelector("#tile-grid");
const emptyState = document.querySelector("#empty-state");
const template = document.querySelector("#tile-template");
const tabs = [...document.querySelectorAll(".tab")];

const sourceLabels = {
  note: "note",
  standfm: "stand.fm",
  works: "WORKS",
  youtube: "YouTube",
  x: "X",
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
  if (state.filter === "all") return state.items;
  return state.items.filter((item) => item.source === state.filter);
};

const render = () => {
  const items = filteredItems();
  grid.replaceChildren();
  emptyState.hidden = items.length > 0;

  items.forEach((item) => {
    const tile = template.content.firstElementChild.cloneNode(true);
    const image = tile.querySelector(".tile-image");

    tile.href = item.url;
    tile.dataset.source = item.source;
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

setItems(parseInitialData());
loadItems();
