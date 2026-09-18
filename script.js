const $ = id => document.getElementById(id);
const urlInput = $('urlInput');
const downloadBtn = $('downloadBtn');
const result = $('result');
const consoleBody = $('consoleBody');
const toast = $('toast');

let selectedQuality = '720';

function addLog(msg, type = 'info') {
  const line = document.createElement('div');
  line.className = 'log ' + type;
  const time = new Date().toLocaleTimeString('id-ID');
  line.textContent = `[${time}] ${msg}`;
  consoleBody.appendChild(line);
  consoleBody.scrollTop = consoleBody.scrollHeight;
}

function showToast(msg, type = 'success') {
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  setTimeout(() => toast.className = 'toast', 3000);
}

document.querySelectorAll('.quality-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedQuality = btn.dataset.q;
    const label = selectedQuality === 'audio' ? 'Audio Only' : selectedQuality + 'p';
    addLog(`Quality: ${label}`, 'info');
  });
});

downloadBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) return showToast('Masukkan link dulu!', 'error');
  if (!/^https?:\/\//.test(url)) return showToast('Link tidak valid!', 'error');

  downloadBtn.disabled = true;
  downloadBtn.textContent = 'Loading...';
  result.innerHTML = '<div class="placeholder"><div class="ph-icon">◇</div><p>Mengambil data...</p></div>';
  addLog(`Fetching: ${url.substring(0, 50)}...`, 'info');
  addLog(`Quality: ${selectedQuality === 'audio' ? 'Audio' : selectedQuality + 'p'}`, 'info');

  try {
    const resp = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, quality: selectedQuality })
    });

    const contentType = resp.headers.get('content-type');
    if (!contentType || !contentType.includes('json')) {
      throw new Error(`Server error (${resp.status})`);
    }

    const data = await resp.json();
    if (!data.success) throw new Error(data.error || 'Gagal');

    addLog(`OK! ${data.medias?.length || 0} media ditemukan`, 'success');
    renderResult(data);
  } catch (err) {
    addLog(`Error: ${err.message}`, 'failed');
    showToast(err.message, 'error');
    result.innerHTML = `<div class="placeholder"><div class="ph-icon">✕</div><p>${err.message}</p></div>`;
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.textContent = 'Download';
  }
});

function renderResult(data) {
  const title = data.title || 'Media';
  const author = data.author || 'Unknown';
  const thumb = data.thumbnail || '';
  const reqQ = data.requestedQuality || '';

  let html = '<div class="result-card">';
  if (thumb) html += `<img src="${thumb}" class="result-thumb" onerror="this.style.display='none'"/>`;
  html += `<div class="result-info"><strong>${escapeHtml(title)}</strong><br>Platform: ${escapeHtml(author)} ${reqQ ? '• Kualitas: ' + escapeHtml(reqQ) : ''}</div>`;
  html += '<div class="download-options">';

  if (data.medias && data.medias.length > 0) {
    data.medias.forEach((m, i) => {
      const q = (m.quality || '').toLowerCase();
      const isHD = q.includes('hd') || q.includes('1080') || q.includes('720') || q.includes('1440') || q.includes('2160') || q.includes('4k');
      const type = m.type === 'audio' ? 'Audio' : m.type === 'video' ? 'Video' : 'Media';
      html += `<a href="${m.url}" target="_blank" rel="noopener" class="dl-btn ${isHD ? 'hd' : ''}" download>
        <span class="label">⬇ ${type} ${i + 1}</span>
        <span class="tag">${escapeHtml(m.quality || 'Default')}</span>
      </a>`;
    });
  } else {
    html += '<div class="result-info">Tidak ada media</div>';
  }

  html += '</div></div>';
  result.innerHTML = html;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

$('clearLog').addEventListener('click', () => {
  consoleBody.innerHTML = '';
  addLog('Console cleared', 'info');
});

urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') downloadBtn.click(); });

addLog('All Downloader ready!', 'success');
addLog('Pilih kualitas, paste link, klik Download', 'info');