const gearDetail = document.querySelector("#gear-detail");
const sectionTemplate = document.querySelector("#gear-detail-section-template");
const cardTemplate = document.querySelector("#gear-detail-card-template");
const categoryTemplate = document.querySelector("#gear-category-template");
const categoryNav = document.querySelector("#gear-category-nav");
const gearHeroTitle = document.querySelector("#gear-page-title");
const gearHeroText = document.querySelector("#gear-hero-text");
const sharedGearData = window.__GEAR_DATA__;
let gearTargetTimer = null;

const fallbackGearCatalog = {
  associateTag: "rlst-22",
  categories: [
    {
      id: "photo-vlog",
      title: "写真・Vlogの道具",
      summary: "歩きながらの記録を少しだけ映像っぽくするもの。",
      symbol: "撮",
      tone: "mint",
    },
  ],
  items: [
    {
      id: "ricoh-gr-iiix",
      category: "photo-vlog",
      kind: "product",
      name: "RICOH GR IIIx",
      note: "小さくて、日常を持ち歩けるカメラ。",
      amazonSearch: "RICOH GR IIIx",
    },
  ],
};

const categoryOrder = ["life", "making", "photo-vlog", "wear", "creature-care", "money-exit"];
const itemOrders = {
  life: ["stan-rice-cooker", "muji-bed", "panasonic-microwave", "nitori-washer-dryer", "dishwasher", "drip-oneger"],
  making: ["codex-app", "windows-pc", "github-account"],
  "photo-vlog": ["iphone", "ricoh-gr-iiix", "fujifilm-x-e4", "osmo-pocket-3", "blackmagic-camera", "dazz-cam"],
  wear: ["apple-watch", "airpods", "ipad-mini-6", "batoner-knit", "marka-shirt-coat", "on-cloudmonster", "ou-at-bag"],
  "creature-care": ["nekoya-clipper", "nekoya-water-bowl", "nekoya-food-bowl", "science-diet-cat-food"],
  "money-exit": ["sp500", "semi-retire-simulator"],
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

const kindLabel = (kind, hasAmazonUrl) => {
  if (kind === "service") return "サービス";
  if (kind === "asset") return "資産";
  if (kind === "product" || hasAmazonUrl) return "モノ";
  return "その他";
};

const compareByPreferredOrder = (orderList) => (a, b) => {
  const aIndex = orderList.indexOf(a.id);
  const bIndex = orderList.indexOf(b.id);
  const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
  const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
  if (safeA !== safeB) return safeA - safeB;
  return a.name.localeCompare(b.name, "ja");
};

const sortCategories = (categories) => [...categories].sort((a, b) => {
  const orderA = categoryOrder.indexOf(a.id);
  const orderB = categoryOrder.indexOf(b.id);
  const safeA = orderA === -1 ? Number.MAX_SAFE_INTEGER : orderA;
  const safeB = orderB === -1 ? Number.MAX_SAFE_INTEGER : orderB;
  if (safeA !== safeB) return safeA - safeB;
  return a.title.localeCompare(b.title, "ja");
});

const linkIcon = `
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path d="M14 5h5v5h-2V8.4l-6.3 6.3-1.4-1.4L15.6 7H14V5Z" fill="currentColor" />
    <path d="M6 6h6V4H5a1 1 0 0 0-1 1v7h2V6Zm12 12H6V10H4v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5h-2v5Z" fill="currentColor" />
  </svg>
`;

const amazonLinkIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12.2 6.1c2.5 0 4.2 1.4 4.2 3.7v5.3c0 .8.1 1.5.3 2.1h-2.2c-.1-.4-.2-.8-.2-1.2-.8.9-2 1.4-3.4 1.4-2.1 0-3.5-1.2-3.5-3 0-2 1.5-3.1 4.2-3.4l2.5-.3v-.7c0-1.2-.8-1.9-2.1-1.9-1.2 0-2.1.5-2.7 1.5L7.7 8.5c1-1.6 2.6-2.4 4.5-2.4Zm1.9 6.3-2.1.3c-1.5.2-2.2.7-2.2 1.6 0 .8.7 1.3 1.7 1.3 1.5 0 2.6-1 2.6-2.3v-.9Z" />
    <path d="M6.4 18.9c1.7 1 3.6 1.5 5.7 1.5 2.2 0 4.1-.5 5.7-1.5" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" />
  </svg>
`;

const renderGearCategories = (catalog) => {
  if (!categoryNav || !categoryTemplate) return;

  const categories = sortCategories(catalog.categories || []);
  const itemsByCategory = new Map();
  (catalog.items || []).forEach((item) => {
    if (!itemsByCategory.has(item.category)) itemsByCategory.set(item.category, []);
    itemsByCategory.get(item.category).push(item);
  });

  for (const [categoryId, items] of itemsByCategory.entries()) {
    const order = itemOrders[categoryId] || [];
    items.sort(compareByPreferredOrder(order));
  }

  const tiles = categories.map((category, index) => {
    const tile = categoryTemplate.content.firstElementChild.cloneNode(true);
    const link = tile.querySelector(".gear-category-link");
    const symbol = tile.querySelector(".gear-category-symbol");
    const title = tile.querySelector(".gear-category-title");
    const summary = tile.querySelector(".gear-category-summary");
    const count = tile.querySelector(".gear-category-count");
    const preview = tile.querySelector(".gear-category-preview");
    const items = itemsByCategory.get(category.id) || [];
    const featured = items.find((item) => item.featured) || items[0];

    tile.style.setProperty("--gear-delay", `${index * 40}ms`);
    tile.dataset.tone = category.tone || "neutral";

    if (featured) {
      link.href = `#gear-section-${category.id}`;
      preview.textContent = featured.name;
    } else {
      link.href = `#gear-section-${category.id}`;
      preview.textContent = "このカテゴリを見る";
    }

    symbol.textContent = category.symbol || "・";
    title.textContent = category.title;
    summary.textContent = category.summary || "";
    count.textContent = `${items.length}件`;

    return tile;
  });

  categoryNav.replaceChildren(...tiles);
};

const renderGearDetail = (catalog) => {
  if (!gearDetail || !sectionTemplate || !cardTemplate) return;

  const associateTag = catalog.associateTag || fallbackGearCatalog.associateTag;
  const itemsByCategory = new Map();
  (catalog.items || []).forEach((item) => {
    if (!itemsByCategory.has(item.category)) itemsByCategory.set(item.category, []);
    itemsByCategory.get(item.category).push(item);
  });

  const sections = sortCategories(catalog.categories || []).map((category) => {
    const items = itemsByCategory.get(category.id) || [];
    if (items.length === 0) return null;

    const section = sectionTemplate.content.firstElementChild.cloneNode(true);
    const heading = section.querySelector("h2");
    const summary = section.querySelector(".gear-detail-summary");
    const count = section.querySelector(".gear-detail-count");
    const grid = section.querySelector(".gear-detail-grid");
    const anchor = section.querySelector(".gear-detail-anchor");

    heading.textContent = category.title;
    summary.textContent = category.summary || "";
    count.textContent = `${items.length}件`;
    anchor.id = `gear-section-${category.id}`;
    section.dataset.categoryId = category.id;

    items.forEach((item) => {
      const card = cardTemplate.content.firstElementChild.cloneNode(true);
      const title = card.querySelector("h3");
      const note = card.querySelector("p");
      const link = card.querySelector(".gear-link");
      const badge = card.querySelector(".gear-kind");
      const amazonUrl = amazonUrlForGearItem(item, associateTag);
      const externalUrl = item.url || "";
      const linkText = item.linkLabel || (externalUrl ? "開く" : "Amazonで見る");
      const isService = item.kind === "service" || !amazonUrl;
      const iconMarkup = externalUrl ? linkIcon : amazonLinkIcon;

      title.textContent = item.name;
      note.textContent = item.note;
      badge.textContent = kindLabel(item.kind, Boolean(amazonUrl));
      card.dataset.kind = isService ? "service" : "product";
      link.setAttribute("aria-label", linkText);
      link.setAttribute("data-tooltip", linkText);

      if (externalUrl) {
        link.href = externalUrl;
      } else if (amazonUrl) {
        link.href = amazonUrl;
      } else {
        link.remove();
        grid.append(card);
        return;
      }

      link.innerHTML = iconMarkup;
      link.setAttribute("title", linkText);
      link.setAttribute("data-kind", externalUrl ? "external" : "amazon");

      grid.append(card);
    });

    return section;
  }).filter(Boolean);

  gearDetail.replaceChildren(...sections);
};

const clearGearTargetHighlight = () => {
  if (!gearDetail) return;
  gearDetail.querySelectorAll(".gear-detail-section.is-target").forEach((section) => {
    section.classList.remove("is-target");
  });
};

const focusGearTargetFromHash = () => {
  if (!gearDetail) return;

  const hash = window.location.hash;
  if (!hash || !hash.startsWith("#gear-section-")) {
    clearGearTargetHighlight();
    return;
  }

  const anchor = document.getElementById(hash.slice(1));
  const section = anchor?.closest(".gear-detail-section");
  if (!section) return;

  clearGearTargetHighlight();
  section.classList.add("is-target");

  if (gearTargetTimer) {
    window.clearTimeout(gearTargetTimer);
  }

  requestAnimationFrame(() => {
    section.scrollIntoView({ block: "start", behavior: "auto" });
  });

  gearTargetTimer = window.setTimeout(() => {
    section.classList.remove("is-target");
  }, 1800);
};

const renderGearPage = (catalog) => {
  if (gearHeroTitle) gearHeroTitle.textContent = "つかっているもの";
  if (gearHeroText) {
    gearHeroText.textContent = "無理におすすめするというより、自分の暮らしに残った道具の記録です。";
  }
  renderGearCategories(catalog);
  renderGearDetail(catalog);
  focusGearTargetFromHash();
};

const loadGear = async () => {
  if (sharedGearData) {
    renderGearPage(sharedGearData);
    return;
  }

  renderGearPage(fallbackGearCatalog);
};

window.addEventListener("hashchange", focusGearTargetFromHash);

loadGear();
