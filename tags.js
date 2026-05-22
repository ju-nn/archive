const tagNav = document.querySelector("#tag-filter-nav");
const tagResultList = document.querySelector("#tag-result-list");
const tagHint = document.querySelector("#tag-browser-hint");

const tagDefinitions = [
  {
    id: "semi-retire",
    label: "セミリタイア",
    description: "働きすぎない暮らし、お金、逃げ道の話。",
    keywords: ["セミリタイア", "fire", "サイドfire", "自由", "働き", "資産", "投資", "逃げ道"],
  },
  {
    id: "life",
    label: "生活改善",
    description: "暮らしを少し軽くする道具や考えごと。",
    keywords: ["生活", "暮らし", "家", "固定費", "買って", "コーヒー", "無印", "食洗機", "ベッド"],
  },
  {
    id: "making",
    label: "制作",
    description: "作ったもの、個人開発、公開したツール。",
    keywords: ["制作", "作っ", "公開", "ゲーム", "ツール", "ジユウノコンパス", "逃げ道.xlsx", "ポートフォリオ"],
  },
  {
    id: "camera",
    label: "カメラ",
    description: "写真、動画、Vlog、撮影まわりの記録。",
    keywords: ["写真", "カメラ", "vlog", "動画", "osmo", "iphone", "猫と暮らす"],
  },
  {
    id: "small-notes",
    label: "考えごと",
    description: "日々の気づきや、少し内側にあるメモ。",
    keywords: ["考え", "理由", "話", "自己管理", "努力", "弱さ", "気持ち", "余裕"],
  },
];

const sourceLabels = {
  note: "文章",
  standfm: "音声",
  works: "制作物",
  youtube: "動画",
  photo: "写真",
};

let tagItems = [];
let activeTag = tagDefinitions[0].id;

const displayDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};

const sortItems = (items) =>
  [...items].sort((a, b) => {
    const aDate = a.source === "photo" ? a.takenAt || a.publishedAt : a.publishedAt || a.takenAt;
    const bDate = b.source === "photo" ? b.takenAt || b.publishedAt : b.publishedAt || b.takenAt;
    return new Date(bDate || 0) - new Date(aDate || 0);
  });

const normalizeText = (value) => (value || "").toString().toLowerCase();

const itemMatchesTag = (item, tag) => {
  const haystack = normalizeText([item.title, item.summary, item.source, item.displayDate].filter(Boolean).join(" "));
  return tag.keywords.some((keyword) => haystack.includes(normalizeText(keyword)));
};

const itemsForTag = (tagId) => {
  const tag = tagDefinitions.find((item) => item.id === tagId) || tagDefinitions[0];
  return tagItems.filter((item) => itemMatchesTag(item, tag)).slice(0, 12);
};

const isExternalUrl = (url) => /^https?:\/\//.test(url || "");

const renderTags = () => {
  const buttons = tagDefinitions.map((tag) => {
    const button = document.createElement("button");
    button.className = "tag-filter-button";
    button.type = "button";
    button.role = "tab";
    button.dataset.tag = tag.id;
    button.setAttribute("aria-controls", "tag-result-list");
    button.textContent = tag.label;
    button.addEventListener("click", () => {
      activeTag = tag.id;
      history.replaceState(null, "", `#${tag.id}`);
      render();
    });
    return button;
  });

  tagNav.replaceChildren(...buttons);
};

const renderResults = () => {
  const tag = tagDefinitions.find((item) => item.id === activeTag) || tagDefinitions[0];
  const items = itemsForTag(tag.id);

  tagHint.textContent = `${tag.description} ${items.length}件を表示しています。`;
  tagNav.querySelectorAll(".tag-filter-button").forEach((button) => {
    const isActive = button.dataset.tag === tag.id;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "このタグに合う記録はまだ少なそうです。";
    tagResultList.replaceChildren(empty);
    return;
  }

  const cards = items.map((item) => {
    const link = document.createElement("a");
    link.className = "tag-result-card";
    link.href = item.source === "photo" ? `../${item.url.replace("./", "")}` : item.url;
    if (isExternalUrl(item.url)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }

    const badge = document.createElement("span");
    badge.className = "tag-result-badge";
    badge.textContent = sourceLabels[item.source] || item.source;

    const title = document.createElement("span");
    title.className = "tag-result-title";
    title.textContent = item.title;

    const summary = document.createElement("span");
    summary.className = "tag-result-summary";
    summary.textContent = item.summary || item.displayDate || "";

    const date = document.createElement("span");
    date.className = "tag-result-date";
    date.textContent = item.displayDate || displayDate(item.publishedAt || item.takenAt);

    link.append(badge, title, summary, date);
    return link;
  });

  tagResultList.replaceChildren(...cards);
};

const render = () => {
  renderResults();
};

const loadItems = async () => {
  renderTags();

  const hashTag = location.hash.replace("#", "");
  if (tagDefinitions.some((tag) => tag.id === hashTag)) {
    activeTag = hashTag;
  }

  try {
    const response = await fetch(new URL("../data/feed-items.json", window.location.href), { cache: "no-store" });
    if (!response.ok) throw new Error(`feed-items.json returned ${response.status}`);
    const data = await response.json();
    tagItems = sortItems(Array.isArray(data.items) ? data.items : []);
  } catch (error) {
    console.warn("Could not load tag items.", error);
    tagItems = [];
  }

  render();
};

window.addEventListener("hashchange", () => {
  const hashTag = location.hash.replace("#", "");
  if (!tagDefinitions.some((tag) => tag.id === hashTag)) return;
  activeTag = hashTag;
  render();
});

loadItems();
