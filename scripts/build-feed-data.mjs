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

const fetchGraphql = async (query, variables) => {
  const response = await fetch("https://stand.fm/api/graphql", {
    method: "POST",
    headers: {
      "user-agent": "jun-archive-feed-builder/1.0",
      "App-Agent": "jun-archive-feed-builder/1.0",
      accept: "application/json",
      "content-type": "application/json"
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`https://stand.fm/api/graphql returned ${response.status}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    const message = payload.errors.map((error) => error.message).filter(Boolean).join("; ") || "stand.fm graphql request failed";
    throw new Error(message);
  }

  return payload.data;
};

const toStandfmNodeId = (channelId) => Buffer.from(`Channel:${channelId}`).toString("base64");

const findImage = (source) => {
  const thumbnail = textBetween(source, "media:thumbnail");
  if (thumbnail) return thumbnail;

  const thumbnailUrl = source.match(/<media:thumbnail[^>]+url="([^"]+)"/i);
  if (thumbnailUrl?.[1]) return decodeEntities(thumbnailUrl[1]);

  const media = source.match(/<media:content[^>]+url="([^"]+)"/i);
  if (media?.[1]) return decodeEntities(media[1]);

  const enclosure = source.match(/<enclosure[^>]+url="([^"]+)"[^>]+type="image\//i);
  if (enclosure?.[1]) return decodeEntities(enclosure[1]);

  const ogImage = source.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i);
  if (ogImage?.[1]) return decodeEntities(ogImage[1]);

  const htmlImage = source.match(/<img[^>]+src=["']([^"']+)/i);
  return htmlImage?.[1] ? decodeEntities(htmlImage[1]) : fallbackImage;
};

const formatDisplayDate = (dateValue, source = "") => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const suffix = source === "photo" ? "に撮影" : "に公開";
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}${suffix}`;
};

const normalizeItem = (item) => ({
  source: item.source,
  title: item.title || "untitled",
  kind: item.kind || "",
  summary: item.summary || "",
  imageUrl: item.imageUrl || fallbackImage,
  publishedAt: item.publishedAt || null,
  takenAt: item.takenAt || null,
  displayDate: item.displayDate || formatDisplayDate(item.takenAt || item.publishedAt, item.source),
  url: item.url,
  pinned: Boolean(item.pinned)
});

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

const parseYouTubeItems = (xml, limit) => {
  const entryMatches = [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);

  return entryMatches.slice(0, limit).map((entry) => {
    const url = entry.match(/<link[^>]+rel="alternate"[^>]+href="([^"]+)"/i)?.[1]
      || entry.match(/<link[^>]+href="([^"]+)"/i)?.[1];
    const description = textBetween(entry, "media:description");

    return normalizeItem({
      source: "youtube",
      title: textBetween(entry, "media:title") || textBetween(entry, "title"),
      summary: truncate(description),
      imageUrl: findImage(entry),
      publishedAt: new Date(textBetween(entry, "published") || textBetween(entry, "updated")).toISOString(),
      url: decodeEntities(url),
      pinned: false
    });
  });
};

const STAND_FM_CHANNEL_EPISODES_QUERY = `query ChannelEpisodesFragmentPaginationQuery(
  $after: String
  $first: Int = 10
  $id: ID!
) {
  node(id: $id) {
    __typename
    ...ChannelEpisodesFragment_2HEEH6
    id
  }
}

fragment ChannelEpisodesFragment_2HEEH6 on Channel {
  episodes(first: $first, after: $after) {
    edges {
      node {
        episodeId
        title
        publishedAt
        image {
          url
        }
        id
        __typename
      }
      cursor
    }
    pageInfo {
      endCursor
      hasNextPage
    }
  }
  pinnedEpisode {
    episodeId
    title
    publishedAt
    image {
      url
    }
    id
  }
  streamingLive {
    liveId
    id
  }
  id
}`;

const normalizeStandfmEpisode = (episode, pinned = false) =>
  normalizeItem({
    source: "standfm",
    title: episode?.title || "untitled",
    summary: "stand.fmで話した記録です。",
    imageUrl: episode?.image?.url || fallbackImage,
    publishedAt: episode?.publishedAt ? new Date(episode.publishedAt).toISOString() : null,
    url: episode?.episodeId ? `https://stand.fm/episodes/${episode.episodeId}` : "",
    pinned: false
  });

const fetchStandfmItems = async (channelId, pageSize = 100) => {
  const items = [];
  const seenCursors = new Set();
  let after = null;
  let pinnedAdded = false;
  const nodeId = toStandfmNodeId(channelId);

  while (true) {
    const data = await fetchGraphql(STAND_FM_CHANNEL_EPISODES_QUERY, {
      id: nodeId,
      first: pageSize,
      after
    });

    const channel = data?.node;
    if (!channel || channel.__typename !== "Channel") {
      throw new Error("stand.fm channel data was not returned");
    }

    if (!pinnedAdded && channel.pinnedEpisode?.episodeId) {
      items.push(normalizeStandfmEpisode(channel.pinnedEpisode, true));
      pinnedAdded = true;
    }

    const connection = channel.episodes;
    const edges = connection?.edges || [];
    for (const edge of edges) {
      const episode = edge?.node;
      if (episode?.episodeId) {
        items.push(normalizeStandfmEpisode(episode));
      }
    }

    const pageInfo = connection?.pageInfo;
    if (!pageInfo?.hasNextPage) break;
    if (!pageInfo.endCursor || seenCursors.has(pageInfo.endCursor)) break;

    seenCursors.add(pageInfo.endCursor);
    after = pageInfo.endCursor;
  }

  return items;
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
    standfm: [],
    youtube: []
  };
  const errors = [];

  try {
    const noteXml = await fetchText(config.note.rssUrl);
    fetchedBySource.note = parseRssItems(noteXml, "note", config.note.limit);
  } catch (error) {
    errors.push(`note: ${error.message}`);
  }

  try {
    fetchedBySource.standfm = await fetchStandfmItems(config.standfm.channelId);
  } catch (error) {
    errors.push(`stand.fm: ${error.message}`);
  }

  try {
    const youtubeXml = await fetchText(config.youtube.rssUrl);
    fetchedBySource.youtube = parseYouTubeItems(youtubeXml, config.youtube.limit);
  } catch (error) {
    errors.push(`YouTube: ${error.message}`);
  }

  const works = (config.works || []).map(normalizeItem);
  const photos = (config.photo || []).map(normalizeItem);
  const previousItems = previous.items || [];
  const remoteItems = ["note", "standfm", "youtube"].flatMap((source) => {
    const current = fetchedBySource[source];
    if (current.length > 0) return current;
    return previousItems.filter((item) => item.source === source);
  });
  const output = {
    generatedAt: new Date().toISOString(),
    errors,
    items: sortItems(uniqueByUrl([...works, ...photos, ...remoteItems]))
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
