const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { url, quality } = req.body || {};
  if (!url) return res.status(400).json({ success: false, error: 'URL wajib diisi' });

  try {
    const platform = detectPlatform(url);
    const isAudio = quality === 'audio';
    const qNum = parseInt(quality);

    let vQuality = '720';
    if (isAudio) vQuality = '720';
    else if (qNum >= 2160) vQuality = 'max';
    else if (qNum >= 1440) vQuality = '1440';
    else if (qNum >= 1080) vQuality = '1080';
    else if (qNum >= 720) vQuality = '720';
    else if (qNum >= 480) vQuality = '480';
    else vQuality = '360';

    const response = await axios.post('https://api.cobalt.tools/api/json', {
      url: url,
      vQuality: vQuality,
      isAudioOnly: isAudio,
      disableMetadata: false,
      filenamePattern: 'basic'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 30000
    });

    const data = response.data;
    if (!data || (!data.url && !data.picker)) {
      return res.json({ success: false, error: 'Gagal mengambil link. Coba link lain.' });
    }

    const medias = [];
    if (data.url) {
      medias.push({
        url: data.url,
        quality: isAudio ? 'Audio Only' : (data.quality || vQuality + 'p'),
        type: isAudio ? 'audio' : 'video'
      });
    }
    if (data.picker && Array.isArray(data.picker)) {
      data.picker.forEach((p, i) => {
        if (p.url) medias.push({ url: p.url, quality: p.quality || `Option ${i + 1}`, type: 'video' });
      });
    }
    if (data.audio) {
      medias.push({ url: data.audio, quality: 'Audio', type: 'audio' });
    }

    return res.json({
      success: true,
      title: data.filename || 'Media',
      author: platform,
      thumbnail: data.thumb || '',
      medias: medias,
      requestedQuality: isAudio ? 'Audio' : vQuality + 'p'
    });

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data?.text || error.message || 'Gagal'
    });
  }
};

function detectPlatform(url) {
  if (url.includes('tiktok')) return 'TikTok';
  if (url.includes('instagram')) return 'Instagram';
  if (url.includes('youtube') || url.includes('youtu.be')) return 'YouTube';
  if (url.includes('twitter') || url.includes('x.com')) return 'Twitter/X';
  if (url.includes('facebook') || url.includes('fb.watch')) return 'Facebook';
  if (url.includes('pinterest')) return 'Pinterest';
  if (url.includes('reddit')) return 'Reddit';
  return 'Unknown';
}