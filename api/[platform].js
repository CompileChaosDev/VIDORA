/* Vercel Serverless Function:  /api/<platform>?url=LINK   (juga /api/auto dan /api/health)
   Memakai scrapr di server/scrapr. Batas waktu diatur di vercel.json (maxDuration). */
process.env.TOTAL_BUDGET = process.env.TOTAL_BUDGET || '50000';
process.env.SCRAPER_TIMEOUT = process.env.SCRAPER_TIMEOUT || '25000';
const { runPlatform, detectPlatform, CHAINS } = require('../server/server.js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();

  let platform = String(req.query.platform || '');
  if (platform === 'health') return res.status(200).json({ status: true, platforms: Object.keys(CHAINS).concat('yt') });

  const link = String(req.query.url || '').trim();
  if (!/^https?:\/\//i.test(link)) return res.status(400).json({ status: false, message: 'Link tidak valid' });
  if (platform === 'auto') platform = detectPlatform(link);
  if (platform !== 'yt' && platform !== 'resolver' && !CHAINS[platform]) {
    return res.status(404).json({ status: false, message: 'Platform tidak dikenal' });
  }
  try {
    const out = await runPlatform(platform, link);
    if (out.error) return res.status(502).json({ status: false, platform, message: out.error });
    return res.status(200).json({ status: true, platform, result: out.data });
  } catch (e) {
    return res.status(500).json({ status: false, message: e.message });
  }
};
