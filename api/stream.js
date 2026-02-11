import crypto from "crypto";

export default async function handler(req, res) {

  const { match_id, token, expiry } = req.query;

  if (!match_id || !token || !expiry) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const secret = process.env.STREAM_SECRET;

  const expectedToken = crypto
    .createHmac("sha256", secret)
    .update(match_id + expiry)
    .digest("hex");

  if (expectedToken !== token) {
    return res.status(403).json({ error: "Invalid token" });
  }

  if (Date.now() > parseInt(expiry)) {
    return res.status(403).json({ error: "Token expired" });
  }

  // 🔥 Get original stream URL from your JSON logic
  const originalStream =
    `https://in-mc-fdlive.fancode.com/mumbai/${match_id}_english_hls/index.m3u8`;

  try {
    const response = await fetch(originalStream, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.fancode.com/"
      }
    });

    let playlist = await response.text();

    // 🔥 Rewrite segment URLs
    playlist = playlist.replace(
      /(.*\.ts)/g,
      (match) =>
        `/api/segment?url=${encodeURIComponent(
          new URL(match, originalStream).href
        )}`
    );

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.send(playlist);

  } catch (err) {
    res.status(500).json({ error: "Stream fetch failed" });
  }
}