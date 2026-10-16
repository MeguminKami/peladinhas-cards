// Apenas IDs de vídeo: nunca se usa um URL introduzido pelo utilizador no iframe.
export function youtubeVideoId(value) {
  const input = String(value || "").trim();
  if (!input) return "";
  try {
    const url = new URL(input);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port
    )
      return null;
    const host = url.hostname.toLowerCase();
    let id;
    if (["youtu.be", "www.youtu.be"].includes(host)) id = url.pathname.slice(1);
    else if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
      ].includes(host)
    ) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else
        id = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/)?.[1];
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id || "") ? id : null;
  } catch {
    return null;
  }
}

export function youtubePlayer(id) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(id || "")) return "";
  return `<section class="panel game-video"><h2>Vídeo da Peladinha</h2><div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Vídeo da Peladinha no YouTube" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><p class="muted small">Vídeo alojado no YouTube. Se a reprodução estiver bloqueada pelo autor, <a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener noreferrer">ver no YouTube ↗</a>.</p></section>`;
}
