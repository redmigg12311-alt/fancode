import crypto from "crypto";

export default function handler(req, res) {
  const { match_id } = req.query;

  if (!match_id) {
    return res.status(400).json({ error: "Match ID required" });
  }

  const secret = process.env.STREAM_SECRET;

  if (!secret) {
    return res.status(500).json({ error: "Secret not configured" });
  }

  const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

  const token = crypto
    .createHmac("sha256", secret)
    .update(match_id + expiry)
    .digest("hex");

  return res.status(200).json({ token, expiry });
}