import http from "node:http";
import { extname, join, normalize } from "node:path";
import { readFile } from "node:fs/promises";

const port = Number(process.env.PORT || 4173);
const root = process.cwd();

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function json(res, status, payload) {
  send(res, status, JSON.stringify(payload), {
    "content-type": "application/json; charset=utf-8",
  });
}

function safeUrl(value) {
  try {
    const parsed = new URL(value);
    if (!["https:", "http:"].includes(parsed.protocol)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function findMetaImage(html, baseUrl) {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return new URL(match[1].replaceAll("&amp;", "&"), baseUrl).toString();
  }

  return null;
}

async function fetchImageFromUrl(inputUrl) {
  const url = safeUrl(inputUrl);
  if (!url) {
    return { error: "Anna kelvollinen http- tai https-linkki." };
  }

  const headers = {
    "accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "user-agent": "Mozilla/5.0 BeatCanvas/1.0",
  };

  const first = await fetch(url, { headers, redirect: "follow" });
  if (!first.ok) {
    return { error: `Kuvan haku epäonnistui (${first.status}).` };
  }

  const firstType = first.headers.get("content-type") || "";
  if (firstType.startsWith("image/")) {
    return {
      body: Buffer.from(await first.arrayBuffer()),
      type: firstType.split(";")[0],
      source: first.url,
    };
  }

  const html = await first.text();
  const metaImage = findMetaImage(html, first.url);
  if (!metaImage) {
    return { error: "En löytänyt sivulta jaettavaa kuvaa. Kokeile avata kuva Pinterestissä ja kopioida suora kuvalinkki, tai pudota kuva tiedostona." };
  }

  const second = await fetch(metaImage, { headers, redirect: "follow" });
  if (!second.ok) {
    return { error: `Pinterest-kuvan haku epäonnistui (${second.status}).` };
  }

  const secondType = second.headers.get("content-type") || "";
  if (!secondType.startsWith("image/")) {
    return { error: "Linkistä löytynyt esikatselu ei ollut kuvatiedosto." };
  }

  return {
    body: Buffer.from(await second.arrayBuffer()),
    type: secondType.split(";")[0],
    source: second.url,
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://localhost:${port}`);

    if (requestUrl.pathname === "/api/image") {
      const target = requestUrl.searchParams.get("url");
      if (!target) return json(res, 400, { error: "Kuvan linkki puuttuu." });

      const result = await fetchImageFromUrl(target);
      if (result.error) return json(res, 422, { error: result.error });

      return send(res, 200, result.body, {
        "content-type": result.type,
        "cache-control": "no-store",
        "x-image-source": encodeURIComponent(result.source),
      });
    }

    const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
    const filePath = normalize(join(root, pathname));

    if (!filePath.startsWith(root)) {
      return send(res, 403, "Forbidden");
    }

    const data = await readFile(filePath);
    send(res, 200, data, {
      "content-type": types[extname(filePath).toLowerCase()] || "application/octet-stream",
    });
  } catch (error) {
    if (error.code === "ENOENT") return send(res, 404, "Not found");
    console.error(error);
    send(res, 500, "Server error");
  }
});

server.listen(port, () => {
  console.log(`Beat video maker: http://localhost:${port}`);
});
