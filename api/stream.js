import crypto from "crypto";

export default function handler(req, res) {
  const { match_id, token, expiry } = req.query;

  if (!match_id || !token || !expiry) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const secret = process.env.STREAM_SECRET;

  if (Date.now() > Number(expiry)) {
    return res.status(403).json({ error: "Token expired" });
  }

  const expectedToken = crypto
    .createHmac("sha256", secret)
    .update(match_id + expiry)
    .digest("hex");

  if (token !== expectedToken) {
    return res.status(403).json({ error: "Invalid token" });
  }

  /* 🔒 DO NOT expose real URL in frontend */
  const STREAM_MAP = {
    "140317":
      "https://in-mc-fdlive.fancode.com/mumbai/140317_english_hls_a3519a753084938_1ta-di_h264/index.m3u8"
  };

  const streamUrl = STREAM_MAP[match_id];

  if (!streamUrl) {
    return res.status(404).json({ error: "Stream not found" });
  }

  return res.redirect(streamUrl);
}