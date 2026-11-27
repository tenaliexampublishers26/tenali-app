export interface ImportedYouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: string;
}

export interface PlaylistImportResult {
  playlistId?: string;
  playlistTitle?: string;
  items: ImportedYouTubeVideo[];
  source: 'youtube_api' | 'rss_feed' | 'bulk_urls';
  warning?: string;
}

const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/** Extracts an 11-character YouTube video ID from standard, short, embed, shorts, or live URLs. */
export function extractYouTubeVideoId(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (VIDEO_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');

    if (host === 'youtu.be') {
      const candidate = url.pathname.split('/').filter(Boolean)[0];
      return candidate && VIDEO_ID_REGEX.test(candidate) ? candidate : null;
    }

    if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
      const vParam = url.searchParams.get('v');
      if (vParam && VIDEO_ID_REGEX.test(vParam)) return vParam;

      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && ['embed', 'shorts', 'live', 'v'].includes(parts[0])) {
        const candidate = parts[1];
        return VIDEO_ID_REGEX.test(candidate) ? candidate : null;
      }
    }
  } catch {
    // Fallback regex for malformed URLs
    const match = trimmed.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/);
    if (match?.[1]) return match[1];
  }

  return null;
}

/** Extracts a YouTube playlist ID (e.g. PL..., UU..., OL...) from a URL or raw ID. */
export function extractYouTubePlaylistId(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^(PL|UU|FL|OL|RD)[a-zA-Z0-9_-]{10,}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(normalized);
    const listParam = url.searchParams.get('list');
    if (listParam && /^[a-zA-Z0-9_-]{10,}$/.test(listParam)) {
      return listParam;
    }
  } catch {
    const match = trimmed.match(/[?&]list=([a-zA-Z0-9_-]{10,})/);
    if (match?.[1]) return match[1];
  }

  return null;
}

export function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&fs=1`;
}

/** Builds a full-bleed responsive HTML5 iframe wrapper for mobile WebViews. */
export function buildYouTubeEmbedHtml(videoId: string): string {
  const embedUrl = getYouTubeEmbedUrl(videoId);
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
      iframe { width: 100%; height: 100%; border: 0; }
    </style>
  </head>
  <body>
    <iframe
      src="${embedUrl}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowfullscreen
    ></iframe>
  </body>
</html>`;
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseYouTubeRssFeed(xml: string): { playlistTitle?: string; items: ImportedYouTubeVideo[] } {
  const feedTitleMatch = xml.match(/<feed[\s\S]*?<title>([\s\S]*?)<\/title>/i);
  const playlistTitle = feedTitleMatch?.[1] ? decodeXmlEntities(feedTitleMatch[1].trim()) : undefined;

  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) || [];
  const items: ImportedYouTubeVideo[] = [];

  for (const entry of entries) {
    const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i);
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/i);
    const descMatch = entry.match(/<media:description>([\s\S]*?)<\/media:description>/i);

    const videoId = idMatch?.[1]?.trim();
    if (!videoId || !VIDEO_ID_REGEX.test(videoId)) continue;

    const title = titleMatch?.[1] ? decodeXmlEntities(titleMatch[1].trim()) : `YouTube Video (${videoId})`;
    const description = descMatch?.[1]
      ? decodeXmlEntities(descMatch[1].trim()).slice(0, 220)
      : 'Departmental video class';

    items.push({
      videoId,
      title,
      description: description || 'Departmental video class',
      videoUrl: getYouTubeWatchUrl(videoId),
      thumbnailUrl: getYouTubeThumbnailUrl(videoId),
      duration: 'Video',
    });
  }

  return { playlistTitle, items };
}

/** Resolves a single video's title via YouTube's CORS-friendly oEmbed endpoint when available. */
export async function fetchYouTubeVideoTitle(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(getYouTubeWatchUrl(videoId))}&format=json`
    );
    if (!res.ok) return null;
    const json = await res.json();
    return typeof json?.title === 'string' && json.title.trim() ? json.title.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Imports videos from a YouTube playlist URL/ID.
 * Uses YouTube Data API v3 when `apiKey` is supplied (fetches full playlist & works on Web + Mobile),
 * otherwise falls back to the public YouTube RSS playlist feed (up to 15 latest videos, native mobile).
 */
export async function importYouTubePlaylist(
  playlistUrlOrId: string,
  apiKey?: string
): Promise<PlaylistImportResult> {
  const playlistId = extractYouTubePlaylistId(playlistUrlOrId);
  if (!playlistId) {
    throw new Error('Could not find a valid YouTube Playlist ID in the link.');
  }

  const trimmedKey = apiKey?.trim();
  if (trimmedKey) {
    const items: ImportedYouTubeVideo[] = [];
    let nextPageToken: string | undefined;
    let guard = 0;

    do {
      const params = new URLSearchParams({
        part: 'snippet,contentDetails',
        maxResults: '50',
        playlistId,
        key: trimmedKey,
      });
      if (nextPageToken) params.set('pageToken', nextPageToken);

      const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`);
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`YouTube API error (${res.status}): ${errBody.slice(0, 180) || res.statusText}`);
      }

      const data = await res.json();
      const rawItems = Array.isArray(data?.items) ? data.items : [];
      for (const item of rawItems) {
        const snippet = item?.snippet;
        const videoId = item?.contentDetails?.videoId || snippet?.resourceId?.videoId;
        const title = snippet?.title;
        if (!videoId || !VIDEO_ID_REGEX.test(videoId)) continue;
        if (title === 'Deleted video' || title === 'Private video') continue;

        items.push({
          videoId,
          title: title || `Lesson (${videoId})`,
          description: (snippet?.description || 'Departmental video class').slice(0, 220),
          videoUrl: getYouTubeWatchUrl(videoId),
          thumbnailUrl:
            snippet?.thumbnails?.high?.url ||
            snippet?.thumbnails?.medium?.url ||
            getYouTubeThumbnailUrl(videoId),
          duration: 'Video',
        });
      }

      nextPageToken = data?.nextPageToken;
      guard++;
    } while (nextPageToken && guard < 10);

    return {
      playlistId,
      items,
      source: 'youtube_api',
    };
  }

  // Fallback without API key: YouTube public playlist RSS feed
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`;
    const res = await fetch(rssUrl);
    if (!res.ok) {
      throw new Error(`Playlist feed returned HTTP ${res.status}`);
    }
    const xml = await res.text();
    const parsed = parseYouTubeRssFeed(xml);
    return {
      playlistId,
      playlistTitle: parsed.playlistTitle,
      items: parsed.items,
      source: 'rss_feed',
      warning:
        parsed.items.length >= 15
          ? 'No YouTube API Key provided: YouTube RSS returns the latest 15 videos. Add a YouTube Data API v3 key to import larger playlists.'
          : undefined,
    };
  } catch (e: any) {
    throw new Error(
      `Could not fetch playlist directly (${e?.message || 'network/CORS restriction'}). Enter a YouTube Data API v3 key above, or paste video links line-by-line in the Bulk Links box.`
    );
  }
}

/**
 * Parses multi-line YouTube links (supports `URL` or `Title | URL` per line)
 * and resolves missing titles via YouTube oEmbed.
 */
export async function parseBulkYouTubeLinks(rawText: string): Promise<PlaylistImportResult> {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const parsedEntries: { videoId: string; explicitTitle?: string }[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    let explicitTitle: string | undefined;
    let urlPart = line;

    if (line.includes('|')) {
      const [left, ...rest] = line.split('|');
      if (left.trim() && rest.join('|').trim()) {
        explicitTitle = left.trim();
        urlPart = rest.join('|').trim();
      }
    }

    const videoId = extractYouTubeVideoId(urlPart);
    if (videoId && !seen.has(videoId)) {
      seen.add(videoId);
      parsedEntries.push({ videoId, explicitTitle });
    }
  }

  const items: ImportedYouTubeVideo[] = await Promise.all(
    parsedEntries.map(async ({ videoId, explicitTitle }, idx) => {
      const resolvedTitle = explicitTitle || (await fetchYouTubeVideoTitle(videoId));
      return {
        videoId,
        title: resolvedTitle || `Video Lesson ${idx + 1}`,
        description: 'Departmental video class',
        videoUrl: getYouTubeWatchUrl(videoId),
        thumbnailUrl: getYouTubeThumbnailUrl(videoId),
        duration: 'Video',
      };
    })
  );

  return {
    items,
    source: 'bulk_urls',
  };
}
