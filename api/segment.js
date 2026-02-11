export default async function handler(req, res) {

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing segment URL" });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.fancode.com/"
      }
    });

    const buffer = await response.arrayBuffer();

    res.setHeader("Content-Type", "video/MP2T");
    res.send(Buffer.from(buffer));

  } catch (err) {
    res.status(500).json({ error: "Segment fetch failed" });
  }
}