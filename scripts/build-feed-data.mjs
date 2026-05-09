import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = resolve(rootDir, "data", "feeds.json");
const outputPath = resolve(rootDir, "data", "feed-items.json");
const indexPath = resolve(rootDir, "index.html");
const fallbackImage = "./assets/icon.png";

const decodeEntities = (value = "") =>
  value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

const stripHtml = (value = "") =>
  decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (value = "", max = 96) => {
  const text = stripHtml(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
};

const textBetween = (source, tag) => {
  const match = source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeEntities(match[1]) : "";
};

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      "user-agent": "jun-archive-feed-builder/1.0",
      accept: "application/rss+xml, application/xml, text/html;q=0.9, */*;q=0.8"
    }
  });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.text();
};

const findImage = (source) => {
  const thumbnail = textBetween(source, "media:thumbnail");
  if (thumbnail) return thumbnail;

  const media = source.match(/<media:content[^>]+url="([^"]+)"/i);
  if (media?.[1]) return decodeEntities(media[1]);

  const enclosure = source.match(/<enclosure[^>]+url="([^"]+)"[^>]+type="image\//i);
  if (enclosure?.[1]) return decodeEntities(enclosure[1]);

  const ogImage = source.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i);
  if (ogImage?.[1]) return decodeEntities(ogImage[1]);

  const htmlImage = source.match(/<img[^>]+src=["']([^"']+)/i);
  return htmlImage?.[1] ? decodeEntities(htmlImage[1]) : fallbackImage;
};

const normalizeItem = (item) => ({
  source: item.source,
  title: item.title || "untitled",
  summary: item.summary || "",
  imageUrl: item.imageUrl || fallbackImage,
  publishedAt: item.publishedAt || null,
  displayDate: item.displayDate || formatDisplayDate(item.publishedAt),
  url: item.url,
  pinned: Boolean(item.pinned)
});

const formatDisplayDate = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}に公開`;
};

const parseRssItems = (xml, source, limit) => {
  const itemMatches = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);

  return itemMatches.slice(0, limit).map((item) => {
    const description = textBetween(item, "description") || textBetween(item, "content:encoded");
    return normalizeItem({
      source,
      title: textBetween(item, "title"),
      summary: truncate(description),
      imageUrl: findImage(item),
      publishedAt: new Date(textBetween(item, "pubDate") || textBetween(item, "dc:date")).toISOString(),
      url: textBetween(item, "link"),
      pinned: false
    });
  });
};

const parseStandfmPage = (html, config) => {
  const episodeBlocks = [...html.matchAll(/"__typename":"Episode"[\s\S]*?(?=},"client:|},"RXBpc|<\/script>)/g)]
    .map((match) => match[0])
    .slice(0, config.limit);

  const imageByRef = new Map(
    [...html.matchAll(/"__id":"client:([^"]+?:image)"[\s\S]*?"url":"([^"]+)"/g)].map((match) => [
      match[1],
      match[2].replace(/\\u002F/g, "/")
    ])
  );

  return episodeBlocks.map((block) => {
    const episodeId = block.match(/"episodeId":"([^"]+)"/)?.[1];
    const title = block.match(/"title":"((?:\\"|[^"])*)"/)?.[1]?.replace(/\\"/g, '"');
    const publishedAt = Number(block.match(/"publishedAt":(\d+)/)?.[1] || 0);
    const imageRef = block.match(/"image":\{"__ref":"client:([^"]+?:image)"\}/)?.[1];

    return normalizeItem({
      source: "standfm",
      title,
      summary: "stand.fmで話した記録です。",
      imageUrl: imageByRef.get(imageRef) || fallbackImage,
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
      url: episodeId ? `https://stand.fm/episodes/${episodeId}` : config.channelUrl,
      pinned: false
    });
  });
};

const loadPrevious = async () => {
  try {
    return JSON.parse(await readFile(outputPath, "utf8"));
  } catch {
    return { generatedAt: null, items: [] };
  }
};

const uniqueByUrl = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
};

const sortItems = (items) =>
  [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
  });

const escapeScriptJson = (value) =>
  JSON.stringify(value, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

const updateEmbeddedData = async (output) => {
  const html = await readFile(indexPath, "utf8");
  const payload = escapeScriptJson(output);
  const nextScript = `<script id="initial-feed-data" type="application/json">\n${payload}\n  </script>`;
  const pattern = /<script id="initial-feed-data" type="application\/json">[\s\S]*?<\/script>/;

  if (!pattern.test(html)) {
    throw new Error("initial-feed-data script tag was not found in index.html");
  }

  await writeFile(indexPath, html.replace(pattern, nextScript), "utf8");
};

const main = async () => {
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const previous = await loadPrevious();
  const fetchedBySource = {
    note: [],
    standfm: []
  };
  const errors = [];

  try {
    const noteXml = await fetchText(config.note.rssUrl);
    fetchedBySource.note = parseRssItems(noteXml, "note", config.note.limit);
  } catch (error) {
    errors.push(`note: ${error.message}`);
  }

  try {
    const standSource = config.standfm.rssUrl
      ? await fetchText(config.standfm.rssUrl)
      : await fetchText(config.standfm.channelUrl);
    fetchedBySource.standfm = config.standfm.rssUrl
        ? parseRssItems(standSource, "standfm", config.standfm.limit)
        : parseStandfmPage(standSource, config.standfm);
  } catch (error) {
    errors.push(`stand.fm: ${error.message}`);
  }

  const works = (config.works || []).map(normalizeItem);
  const previousItems = previous.items || [];
  const remoteItems = ["note", "standfm"].flatMap((source) => {
    const current = fetchedBySource[source];
    if (current.length > 0) return current;
    return previousItems.filter((item) => item.source === source);
  });
  const output = {
    generatedAt: new Date().toISOString(),
    errors,
    items: sortItems(uniqueByUrl([...works, ...remoteItems]))
  };

  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  await updateEmbeddedData(output);

  if (errors.length > 0) {
    console.warn(`Feed build completed with warnings: ${errors.join("; ")}`);
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
