export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ success: false, error: 'URL wajib diisi' });

    const platform = detectPlatform(url);

    // Pake ssave API (gratis, no key)
    const ssaveResp = await fetch('https://api.ssave.cc/open/v1/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await ssaveResp.json();

    if (!data || !data.medias) {
      return res.json({ success: false, error: 'Gagal mengambil data' });
    }

    const medias = data.medias.map(m => ({
      url: m.resource_url || m.url,
      quality: m.quality || 'HD',
      type: m.media_type === 'audio' ? 'audio' : 'video'
    }));

    return res.json({
      success: true,
      title: data.title || 'Media',
      author: platform,
      thumbnail: data.thumbnail || '',
      medias: medias
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

function detectPlatform(url) {
  if (url.includes('tiktok')) return 'TikTok';
  if (url.includes('instagram')) return 'Instagram';
  if (url.includes('youtube') || url.includes('youtu.be')) return 'YouTube';
  if (url.includes('twitter') || url.includes('x.com')) return 'Twitter/X';
  if (url.includes('facebook')) return 'Facebook';
  return 'Unknown';
}
