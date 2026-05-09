const state = {
  items: [],
  filter: "all",
};

const labels = {
  note: "note",
  standfm: "stand.fm",
  works: "works",
};

const grid = document.querySelector("#tile-grid");
const meta = document.querySelector("#feed-meta");
const emptyState = document.querySelector("#empty-state");
const template = document.querySelector("#tile-template");
const tabs = [...document.querySelectorAll(".tab")];

const formatCount = (items) => `${items.length}件`;

const sourceLabel = (source) => labels[source] || source;

const filteredItems = () => {
  if (state.filter === "all") return state.items;
  return state.items.filter((item) => item.source === state.filter);
};

const render = () => {
  const items = filteredItems();
  grid.replaceChildren();
  emptyState.hidden = items.length > 0;
  meta.textContent = `${sourceLabel(state.filter)} / ${formatCount(items)}`;

  items.forEach((item) => {
    const tile = template.content.firstElementChild.cloneNode(true);
    const image = tile.querySelector(".tile-image");

    tile.href = item.url;
    tile.dataset.source = item.source;
    image.src = item.imageUrl || "./assets/icon.png";
    image.alt = item.title;
    tile.querySelector(".tile-source").textContent = sourceLabel(item.source);
    tile.querySelector(".tile-title").textContent = item.title;
    tile.querySelector(".tile-summary").textContent = item.summary || "";
    grid.append(tile);
  });
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
    const response = await fetch("./data/feed-items.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`feed-items.json returned ${response.status}`);
    const data = await response.json();
    state.items = Array.isArray(data.items) ? data.items : [];
    render();
  } catch (error) {
    console.error(error);
    meta.textContent = "読み込みに失敗しました";
    emptyState.textContent = "投稿データを読み込めませんでした。";
    emptyState.hidden = false;
  }
};

tabs.forEach((tab) => {
  tab.setAttribute("role", "tab");
  tab.addEventListener("click", () => setFilter(tab.dataset.filter));
});

loadItems();
