export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { url, quality } = req.body || {};
  if (!url) return res.status(400).json({ success: false, error: 'URL wajib diisi' });

  try {
    const platform = detectPlatform(url);

    // ===== TIKTOK =====
    if (platform === 'TikTok') {
      return await handleTikTok(url, res);
    }

    // ===== INSTAGRAM =====
    if (platform === 'Instagram') {
      return await handleInstagram(url, res);
    }

    // ===== TWITTER/X =====
    if (platform === 'Twitter/X') {
      return await handleTwitter(url, res);
    }

    // ===== FACEBOOK =====
    if (platform === 'Facebook') {
      return await handleFacebook(url, res);
    }

    // ===== PINTEREST =====
    if (platform === 'Pinterest') {
      return await handlePinterest(url, res);
    }

    // ===== YOUTUBE =====
    if (platform === 'YouTube') {
      return res.json({
        success: false,
        error: 'YouTube belum di-support di Vercel. Coba TikTok, IG, Twitter, atau Facebook.'
      });
    }

    return res.json({ success: false, error: 'Platform tidak dikenali' });

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
}

// ===== TIKTOK via tikwm =====
async function handleTikTok(url, res) {
  const r = await fetch('https://www.tikwm.com/api/?url=' + encodeURIComponent(url) + '&hd=1');
  const d = await r.json();

  if (!d || d.code !== 0 || !d.data) {
    return res.json({ success: false, error: 'Gagal ambil TikTok. Coba link lain.' });
  }

  const medias = [];
  const dd = d.data;
  if (dd.hdplay) medias.push({ url: dd.hdplay, quality: 'HD No Watermark', type: 'video' });
  if (dd.play) medias.push({ url: dd.play, quality: 'SD', type: 'video' });
  if (dd.music) medias.push({ url: dd.music, quality: 'Audio', type: 'audio' });

  return res.json({
    success: true,
    title: dd.title || 'TikTok',
    author: 'TikTok',
    thumbnail: dd.cover || '',
    medias: medias,
    requestedQuality: 'HD'
  });
}

// ===== INSTAGRAM via snapinsta-style =====
async function handleInstagram(url, res) {
  // Pake ssave API
  const r = await fetch('https://api.ssave.cc/open/v1/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  const d = await r.json();

  if (!d || !d.medias || d.medias.length === 0) {
    return res.json({ success: false, error: 'Gagal ambil Instagram. Coba link lain.' });
  }

  const medias = d.medias.map(m => ({
    url: m.resource_url || m.url,
    quality: m.quality || (m.media_type === 'audio' ? 'Audio' : 'HD'),
    type: m.media_type === 'audio' ? 'audio' : 'video'
  }));

  return res.json({
    success: true,
    title: d.title || 'Instagram Media',
    author: 'Instagram',
    thumbnail: d.thumbnail || '',
    medias: medias
  });
}

// ===== TWITTER/X via cobalt mirror =====
async function handleTwitter(url, res) {
  const r = await fetch('https://co.wuk.sh/api/json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ url, vQuality: '720' })
  });
  const d = await r.json();

  if (!d || !d.url) {
    return res.json({ success: false, error: 'Gagal ambil Twitter. Coba link lain.' });
  }

  return res.json({
    success: true,
    title: 'Twitter Media',
    author: 'Twitter/X',
    thumbnail: '',
    medias: [{ url: d.url, quality: 'HD', type: 'video' }]
  });
}

// ===== FACEBOOK via ssave =====
async function handleFacebook(url, res) {
  const r = await fetch('https://api.ssave.cc/open/v1/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  const d = await r.json();

  if (!d || !d.medias || d.medias.length === 0) {
    return res.json({ success: false, error: 'Gagal ambil Facebook. Coba link lain.' });
  }

  const medias = d.medias.map(m => ({
    url: m.resource_url || m.url,
    quality: m.quality || 'HD',
    type: 'video'
  }));

  return res.json({
    success: true,
    title: d.title || 'Facebook Video',
    author: 'Facebook',
    thumbnail: d.thumbnail || '',
    medias: medias
  });
}

// ===== PINTEREST =====
async function handlePinterest(url, res) {
  // Pinterest biasanya gambar langsung dari URL
  const r = await fetch('https://api.ssave.cc/open/v1/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  const d = await r.json();

  if (!d || !d.medias || d.medias.length === 0) {
    return res.json({ success: false, error: 'Gagal ambil Pinterest.' });
  }

  const medias = d.medias.map(m => ({
    url: m.resource_url || m.url,
    quality: m.quality || 'HD',
    type: 'image'
  }));

  return res.json({
    success: true,
    title: d.title || 'Pinterest',
    author: 'Pinterest',
    thumbnail: d.thumbnail || '',
    medias: medias
  });
}

function detectPlatform(url) {
  if (url.includes('tiktok')) return 'TikTok';
  if (url.includes('instagram')) return 'Instagram';
  if (url.includes('youtube') || url.includes('youtu.be')) return 'YouTube';
  if (url.includes('twitter') || url.includes('x.com')) return 'Twitter/X';
  if (url.includes('facebook') || url.includes('fb.watch')) return 'Facebook';
  if (url.includes('pinterest')) return 'Pinterest';
  return 'Unknown';
                  }
