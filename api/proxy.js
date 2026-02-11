export default async function handler(req, res) {
  const { segment } = req.query;

  if (!segment) {
    return res.status(400).send("Missing segment");
  }

  try {
    const response = await fetch(segment);

    const buffer = await response.arrayBuffer();

    res.setHeader("Content-Type", "video/MP2T");
    res.status(200).send(Buffer.from(buffer));

  } catch (err) {
    res.status(500).send("Segment fetch failed");
  }
}