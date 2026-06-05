// Parse media source into a sandbox-friendly playable spec.
// For embed URLs, normalize YouTube/Vimeo to their official player URLs so we
// can apply strict params (no related, no title bar where supported).

export function parseSource(media) {
  if (!media) return null;
  if (media.sourceType === "direct") {
    return { kind: "direct", src: media.sourceUrl };
  }
  const url = (media.sourceUrl || "").trim();
  const yt = extractYouTubeId(url);
  if (yt) {
    const params = new URLSearchParams({
      autoplay: "1",
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
      iv_load_policy: "3",
    });
    return {
      kind: "youtube",
      src: `https://www.youtube-nocookie.com/embed/${yt}?${params.toString()}`,
    };
  }
  const vid = extractVimeoId(url);
  if (vid) {
    const params = new URLSearchParams({
      autoplay: "1",
      dnt: "1",
      title: "0",
      byline: "0",
      portrait: "0",
    });
    return {
      kind: "vimeo",
      src: `https://player.vimeo.com/video/${vid}?${params.toString()}`,
    };
  }
  return { kind: "embed", src: url };
}

function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return /^[a-zA-Z0-9_-]{6,}$/.test(id) ? id : null;
    }
    if (
      u.hostname.endsWith("youtube.com") ||
      u.hostname.endsWith("youtube-nocookie.com")
    ) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const parts = u.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "v"].includes(parts[0])) return parts[1] || null;
    }
  } catch {
    return null;
  }
  return null;
}

function extractVimeoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("vimeo.com") || u.hostname === "player.vimeo.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      for (const p of parts) {
        if (/^\d+$/.test(p)) return p;
      }
    }
  } catch {
    return null;
  }
  return null;
}
