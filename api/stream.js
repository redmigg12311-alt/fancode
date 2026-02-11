export default async function handler(req, res) {
  const { match_id, token, expiry } = req.query;

  if (!match_id || !token || !expiry) {
    return res.status(400).send("Missing parameters");
  }

  const secret = process.env.STREAM_SECRET;
  const crypto = require("crypto");

  // Expiry check
  if (Date.now() > parseInt(expiry)) {
    return res.status(403).send("Token expired");
  }

  // Recreate token
  const expectedToken = crypto
    .createHmac("sha256", secret)
    .update(match_id + expiry)
    .digest("hex");

  if (token !== expectedToken) {
    return res.status(403).send("Invalid token");
  }

  // 🔥 REAL STREAM URL (server side only)
  const realStream =
    "https://in-mc-fdlive.fancode.com/mumbai/140317_english_hls_a3519a753084938_1ta-di_h264/index.m3u8";

  try {
    const response = await fetch(realStream);
    let playlist = await response.text();

    // Rewrite segment URLs (optional)
    playlist = playlist.replace(
      /https:\/\/.*\.ts/g,
      (match) =>
        `/api/proxy?segment=${encodeURIComponent(match)}`
    );

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.status(200).send(playlist);

  } catch (err) {
    res.status(500).send("Unable to fetch stream");
  }
}