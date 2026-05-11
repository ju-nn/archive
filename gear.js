const gearDetail = document.querySelector("#gear-detail");
const sectionTemplate = document.querySelector("#gear-detail-section-template");
const cardTemplate = document.querySelector("#gear-detail-card-template");
const categoryTemplate = document.querySelector("#gear-category-template");
const categoryNav = document.querySelector("#gear-category-nav");
const gearHeroTitle = document.querySelector("#gear-page-title");
const gearHeroText = document.querySelector("#gear-hero-text");

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
  if (kind === "product" || hasAmazonUrl) return "モノ";
  return "その他";
};

const renderGearCategories = (catalog) => {
  if (!categoryNav || !categoryTemplate) return;

  const categories = catalog.categories || [];
  const itemsByCategory = new Map();
  (catalog.items || []).forEach((item) => {
    if (!itemsByCategory.has(item.category)) itemsByCategory.set(item.category, []);
    itemsByCategory.get(item.category).push(item);
  });

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

  const sections = (catalog.categories || []).map((category) => {
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

    items.forEach((item) => {
      const card = cardTemplate.content.firstElementChild.cloneNode(true);
      const title = card.querySelector("h3");
      const note = card.querySelector("p");
      const link = card.querySelector(".gear-link");
      const badge = card.querySelector(".gear-kind");
      const amazonUrl = amazonUrlForGearItem(item, associateTag);
      const isService = item.kind === "service" || !amazonUrl;

      title.textContent = item.name;
      note.textContent = item.note;
      badge.textContent = kindLabel(item.kind, Boolean(amazonUrl));
      card.dataset.kind = isService ? "service" : "product";

      if (amazonUrl) {
        link.href = amazonUrl;
      } else {
        link.remove();
      }

      grid.append(card);
    });

    return section;
  }).filter(Boolean);

  gearDetail.replaceChildren(...sections);
};

const renderGearPage = (catalog) => {
  if (gearHeroTitle) gearHeroTitle.textContent = "使っているもの";
  if (gearHeroText) {
    gearHeroText.textContent = "働きすぎない暮らしのために、使っているものとサービスを、カテゴリごとにまとめています。";
  }
  renderGearCategories(catalog);
  renderGearDetail(catalog);
};

const loadGear = async () => {
  try {
    const response = await fetch(new URL("./data/gear.json", window.location.href), { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load gear.json: ${response.status}`);
    renderGearPage(await response.json());
  } catch (error) {
    console.error(error);
    renderGearPage(fallbackGearCatalog);
  }
};

loadGear();
