/**
 * pdf.js — the tool catalog (drives both the dashboard grid and the
 * dynamic tool panels) plus the generic panel renderer that wires
 * uploads, option fields, and results together for every tool.
 */
const AppTools = (() => {
  const TOOLS = [
    { id: 'merge', name: 'Merge PDF', desc: 'Combine multiple PDFs into one', icon: '🧩', category: 'pdf',
      endpoint: '/api/pdf/merge',
      uploads: [{ field: 'files', accept: '.pdf', multiple: true, label: 'PDF files (2 or more)', minFiles: 2 }] },

    { id: 'split', name: 'Split PDF', desc: 'Extract pages or split into single pages', icon: '✂️', category: 'pdf',
      endpoint: '/api/pdf/split',
      uploads: [{ field: 'file', accept: '.pdf', multiple: false, label: 'PDF file' }],
      options: [
        { name: 'mode', label: 'Split mode', type: 'pills', choices: [['range', 'Page range'], ['each', 'Every page']], default: 'range' },
        { name: 'ranges', label: 'Pages (e.g. 1-3,5)', type: 'text', placeholder: 'all', showIf: { mode: 'range' } }
      ] },

    { id: 'compress', name: 'Compress PDF', desc: 'Shrink file size for sharing', icon: '🗜️', category: 'pdf',
      endpoint: '/api/pdf/compress',
      uploads: [{ field: 'file', accept: '.pdf', multiple: false, label: 'PDF file' }],
      options: [{ name: 'quality', label: 'Quality', type: 'pills', choices: [['low', 'Smallest'], ['medium', 'Balanced'], ['high', 'Best quality']], default: 'medium' }] },

    { id: 'rotate', name: 'Rotate PDF', desc: 'Rotate all or selected pages', icon: '🔄', category: 'pdf',
      endpoint: '/api/pdf/rotate',
      uploads: [{ field: 'file', accept: '.pdf', multiple: false, label: 'PDF file' }],
      options: [
        { name: 'angle', label: 'Angle', type: 'pills', choices: [['90', '90°'], ['180', '180°'], ['270', '270°']], default: '90' },
        { name: 'pages', label: 'Pages (blank = all)', type: 'text', placeholder: 'e.g. 1,3-5' }
      ] },

    { id: 'delete-pages', name: 'Delete Pages', desc: 'Remove specific pages', icon: '🗑️', category: 'pdf',
      endpoint: '/api/pdf/delete-pages',
      uploads: [{ field: 'file', accept: '.pdf', multiple: false, label: 'PDF file' }],
      options: [{ name: 'pages', label: 'Pages to delete', type: 'text', placeholder: 'e.g. 2,4-5', required: true }] },

    { id: 'pdf-to-word', name: 'PDF to Word', desc: 'Convert PDF into an editable .docx', icon: '📄', category: 'convert',
      endpoint: '/api/pdf/pdf-to-word',
      uploads: [{ field: 'file', accept: '.pdf', multiple: false, label: 'PDF file' }] },

    { id: 'word-to-pdf', name: 'Word to PDF', desc: 'Convert .doc/.docx into PDF', icon: '📝', category: 'convert',
      endpoint: '/api/pdf/word-to-pdf',
      uploads: [{ field: 'file', accept: '.doc,.docx', multiple: false, label: 'Word document' }] },

    { id: 'excel-to-pdf', name: 'Excel to PDF', desc: 'Convert spreadsheets into PDF', icon: '📊', category: 'convert',
      endpoint: '/api/pdf/excel-to-pdf',
      uploads: [{ field: 'file', accept: '.xls,.xlsx', multiple: false, label: 'Excel file' }] },

    { id: 'ppt-to-pdf', name: 'PowerPoint to PDF', desc: 'Convert slide decks into PDF', icon: '📽️', category: 'convert',
      endpoint: '/api/pdf/ppt-to-pdf',
      uploads: [{ field: 'file', accept: '.ppt,.pptx', multiple: false, label: 'PowerPoint file' }] },

    { id: 'images-to-pdf', name: 'Image to PDF', desc: 'Combine photos into one PDF', icon: '🖼️', category: 'convert',
      endpoint: '/api/pdf/images-to-pdf',
      uploads: [{ field: 'files', accept: '.jpg,.jpeg,.png,.webp', multiple: true, label: 'Images (in order)', minFiles: 1 }] },

    { id: 'protect', name: 'Protect PDF', desc: 'Lock a PDF with a password', icon: '🔒', category: 'security',
      endpoint: '/api/pdf/protect',
      uploads: [{ field: 'file', accept: '.pdf', multiple: false, label: 'PDF file' }],
      options: [{ name: 'password', label: 'New password', type: 'password', required: true }] },

    { id: 'unlock', name: 'Unlock PDF', desc: 'Remove a known password', icon: '🔓', category: 'security',
      endpoint: '/api/pdf/unlock',
      uploads: [{ field: 'file', accept: '.pdf', multiple: false, label: 'Protected PDF' }],
      options: [{ name: 'password', label: 'Current password', type: 'password', required: true }] },

    { id: 'watermark', name: 'Add Watermark', desc: 'Stamp text or a logo across pages', icon: '💧', category: 'security',
      endpoint: '/api/pdf/watermark',
      uploads: [
        { field: 'pdf', accept: '.pdf', multiple: false, label: 'PDF file' },
        { field: 'image', accept: '.png,.jpg,.jpeg', multiple: false, label: 'Logo image (optional)', optional: true }
      ],
      options: [
        { name: 'text', label: 'Watermark text (optional)', type: 'text', placeholder: 'e.g. CONFIDENTIAL' },
        { name: 'opacity', label: 'Opacity', type: 'number', default: '0.25', min: '0.05', max: '1', step: '0.05' }
      ] },

    { id: 'signature', name: 'Add Signature', desc: 'Place a signature image on a page', icon: '✍️', category: 'security',
      endpoint: '/api/pdf/signature',
      uploads: [
        { field: 'pdf', accept: '.pdf', multiple: false, label: 'PDF file' },
        { field: 'signature', accept: '.png,.jpg,.jpeg', multiple: false, label: 'Signature image' }
      ],
      options: [{ name: 'page', label: 'Page number', type: 'number', default: '1', min: '1' }] },

    { id: 'scan', name: 'Scan Document', desc: 'Turn a photo into a clean PDF scan', icon: '📷', category: 'utility',
      endpoint: '/api/pdf/scan',
      uploads: [{ field: 'file', accept: 'image/*', multiple: false, label: 'Document photo' }],
      options: [{ name: 'mode', label: 'Style', type: 'pills', choices: [['color', 'Color'], ['grayscale', 'Grayscale'], ['bw', 'Black & white']], default: 'grayscale' }] },

    { id: 'extract-text', name: 'Extract Text', desc: 'Pull all text out of a PDF', icon: '🔤', category: 'utility',
      endpoint: '/api/pdf/extract-text',
      uploads: [{ field: 'file', accept: '.pdf', multiple: false, label: 'PDF file' }],
      resultKind: 'text' },

    { id: 'extract-images', name: 'Extract Images', desc: 'Pull embedded images out as a ZIP', icon: '🖼️', category: 'utility',
      endpoint: '/api/pdf/extract-images',
      uploads: [{ field: 'file', accept: '.pdf', multiple: false, label: 'PDF file' }] },

    { id: 'ocr', name: 'OCR', desc: 'Recognize text inside a scanned image', icon: '🔎', category: 'utility', pro: true,
      endpoint: '/api/pdf/ocr',
      uploads: [{ field: 'file', accept: 'image/*', multiple: false, label: 'Image with text' }],
      options: [{ name: 'lang', label: 'Language', type: 'select', choices: [['eng', 'English'], ['spa', 'Spanish'], ['fra', 'French'], ['ara', 'Arabic'], ['deu', 'German']], default: 'eng' }],
      resultKind: 'text' },

    { id: 'image-compress', name: 'Image Compressor', desc: 'Shrink photo file size', icon: '📉', category: 'utility',
      endpoint: '/api/image/compress',
      uploads: [{ field: 'file', accept: 'image/*', multiple: false, label: 'Image file' }],
      options: [
        { name: 'quality', label: 'Quality (1-100)', type: 'number', default: '75', min: '10', max: '100' },
        { name: 'maxWidth', label: 'Max width (px, optional)', type: 'number', placeholder: 'e.g. 1600' }
      ] },

    { id: 'bg-remove', name: 'Background Remover', desc: 'Cut out the background of a photo', icon: '🪄', category: 'utility',
      endpoint: '/api/image/remove-background',
      uploads: [{ field: 'file', accept: 'image/*', multiple: false, label: 'Image file' }] },

    { id: 'qr-generate', name: 'QR Generator', desc: 'Create a QR code from text or a link', icon: '▦', category: 'utility',
      endpoint: '/api/image/qr/generate', noFile: true,
      options: [{ name: 'content', label: 'Text or URL', type: 'text', required: true, placeholder: 'https://example.com' }],
      resultKind: 'qr' },

    { id: 'qr-scan', name: 'QR Scanner', desc: 'Scan a QR code with your camera', icon: '📡', category: 'utility',
      special: 'qr-scan' }
  ];

  function getTool(id) {
    return TOOLS.find((t) => t.id === id);
  }

  function renderGrid(category = 'all') {
    const grid = document.getElementById('tool-grid');
    const items = TOOLS.filter((t) => category === 'all' || t.category === category);
    grid.innerHTML = items.map((t) => `
      <button class="glass tool-card" data-tool="${t.id}">
        ${t.pro ? '<div class="pro-badge">👑 Pro Only</div>' : ''}
        <div class="tool-icon">${t.icon}</div>
        <div class="tool-name">${t.name}</div>
        <div class="tool-desc">${t.desc}</div>
      </button>
    `).join('');
    grid.querySelectorAll('.tool-card').forEach((card) => {
      card.addEventListener('click', () => openTool(card.dataset.tool));
    });
  }

  function openTool(id) {
    const tool = getTool(id);
    if (!tool) return;
    AppTelegram.haptic('light');

    if (tool.pro && !(AppState.getUser() && AppState.getUser().plan === 'pro')) {
      AppUI.toast('This feature is available in Pro plan only.', 'error');
      return;
    }

    document.getElementById('tool-panel-icon').textContent = tool.icon;
    document.getElementById('tool-panel-title').textContent = tool.name;
    document.getElementById('tool-panel-desc').textContent = tool.desc;
    AppUI.showView('tool');
    document.getElementById('topbar-title').textContent = tool.name;

    if (tool.special === 'qr-scan') return renderQrScanner();
    renderToolPanel(tool);
  }

  // ── Generic panel renderer ──────────────────────────────────
  const state = { files: {} }; // field -> File[]

  function renderToolPanel(tool) {
    state.files = {};
    const body = document.getElementById('tool-panel-body');
    let html = '';

    if (!tool.noFile) {
      tool.uploads.forEach((u) => {
        html += `
          <div class="field-group" data-upload-field="${u.field}">
            <label>${u.label}</label>
            <div class="dropzone" id="dz-${u.field}">
              <div class="dz-icon">📤</div>
              <div class="dz-title">Tap to browse or drag &amp; drop</div>
              <div class="dz-sub">${u.multiple ? 'Multiple files allowed' : 'One file'}</div>
              <input type="file" id="input-${u.field}" accept="${u.accept || ''}" ${u.multiple ? 'multiple' : ''} />
            </div>
            <div class="file-list" id="filelist-${u.field}"></div>
          </div>`;
      });
    }

    (tool.options || []).forEach((opt) => {
      html += renderOptionField(opt);
    });

    html += `
      <div class="progress-wrap hidden" id="progress-wrap">
        <div class="progress-track"><div class="progress-fill" id="progress-fill"></div></div>
        <div class="progress-label" id="progress-label">Uploading… 0%</div>
      </div>
      <button class="btn btn-primary btn-block" id="btn-run-tool">${tool.icon} Run ${tool.name}</button>
      <div id="tool-result"></div>
    `;

    body.innerHTML = html;

    if (!tool.noFile) {
      tool.uploads.forEach((u) => {
        state.files[u.field] = [];
        const dz = document.getElementById(`dz-${u.field}`);
        const input = document.getElementById(`input-${u.field}`);
        AppUpload.wireDropzone(dz, input, (files) => {
          state.files[u.field] = u.multiple ? files : [files[0]];
          renderFileList(u.field);
        });
      });
    }

    wireOptionInteractivity(tool);

    const runBtnEl = document.getElementById('btn-run-tool');
    runBtnEl.addEventListener('click', () => runTool(tool));

    // Inside Telegram, the native bottom MainButton runs the same action —
    // showing both was confusing (and let a double-tap fire the request
    // twice, doubling any error toast). Keep the in-page button only for
    // testing in a plain browser, where there's no MainButton at all.
    if (AppTelegram.isInsideTelegram()) {
      runBtnEl.classList.add('hidden');
    }

    AppTelegram.setMainButton({
      text: `Run ${tool.name}`,
      onClick: () => runTool(tool),
      visible: true
    });
  }

  function renderOptionField(opt) {
    const idAttr = `opt-${opt.name}`;
    if (opt.type === 'pills') {
      const pills = opt.choices.map(([val, label]) =>
        `<button type="button" class="radio-pill ${val === opt.default ? 'selected' : ''}" data-name="${opt.name}" data-value="${val}">${label}</button>`
      ).join('');
      return `<div class="field-group" data-option="${opt.name}" ${opt.showIf ? `data-show-if='${JSON.stringify(opt.showIf)}'` : ''}>
        <label>${opt.label}</label><div class="radio-pills">${pills}</div>
      </div>`;
    }
    if (opt.type === 'select') {
      const options = opt.choices.map(([val, label]) => `<option value="${val}" ${val === opt.default ? 'selected' : ''}>${label}</option>`).join('');
      return `<div class="field-group" data-option="${opt.name}">
        <label>${opt.label}</label><select id="${idAttr}">${options}</select>
      </div>`;
    }
    return `<div class="field-group" data-option="${opt.name}" ${opt.showIf ? `data-show-if='${JSON.stringify(opt.showIf)}'` : ''}>
      <label>${opt.label}</label>
      <input id="${idAttr}" type="${opt.type}" placeholder="${opt.placeholder || ''}"
        value="${opt.default || ''}" ${opt.min ? `min="${opt.min}"` : ''} ${opt.max ? `max="${opt.max}"` : ''} ${opt.step ? `step="${opt.step}"` : ''} />
    </div>`;
  }

  function wireOptionInteractivity(tool) {
    (tool.options || []).forEach((opt) => {
      if (opt.type !== 'pills') return;
      const group = document.querySelector(`[data-option="${opt.name}"]`);
      group.querySelectorAll('.radio-pill').forEach((pill) => {
        pill.addEventListener('click', () => {
          group.querySelectorAll('.radio-pill').forEach((p) => p.classList.remove('selected'));
          pill.classList.add('selected');
          applyShowIfRules(tool);
        });
      });
    });
    applyShowIfRules(tool);
  }

  function applyShowIfRules(tool) {
    (tool.options || []).forEach((opt) => {
      if (!opt.showIf) return;
      const group = document.querySelector(`[data-option="${opt.name}"]`);
      const [depName, depValue] = Object.entries(opt.showIf)[0];
      const current = getOptionValue(depName, tool);
      group.style.display = current === depValue ? '' : 'none';
    });
  }

  function getOptionValue(name, tool) {
    const opt = (tool.options || []).find((o) => o.name === name);
    if (!opt) return null;
    if (opt.type === 'pills') {
      const selected = document.querySelector(`[data-option="${name}"] .radio-pill.selected`);
      return selected ? selected.dataset.value : opt.default;
    }
    const el = document.getElementById(`opt-${name}`);
    return el ? el.value : null;
  }

  function renderFileList(field) {
    const list = document.getElementById(`filelist-${field}`);
    const files = state.files[field] || [];
    list.innerHTML = files.map((f, i) => `
      <div class="file-row">
        <span class="f-ico">${AppUpload.fileIcon(f.name)}</span>
        <span class="f-name">${f.name}</span>
        <span class="f-size">${AppUpload.humanSize(f.size)}</span>
        <button class="f-remove" data-field="${field}" data-index="${i}" aria-label="Remove file">✕</button>
      </div>
    `).join('');
    list.querySelectorAll('.f-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.files[btn.dataset.field].splice(parseInt(btn.dataset.index, 10), 1);
        renderFileList(btn.dataset.field);
      });
    });
  }

  let isRunning = false;

  async function runTool(tool) {
    if (isRunning) return; // guards against double-submit from MainButton + in-page button, or a double-tap
    isRunning = true;
    try {
      if (!tool.noFile) {
        for (const u of tool.uploads) {
          const files = state.files[u.field] || [];
          if (!u.optional && files.length < (u.minFiles || 1)) {
            return AppUI.toast(`Please add ${u.label.toLowerCase()}.`, 'error');
          }
        }
      }
      for (const opt of (tool.options || [])) {
        if (opt.required && !getOptionValue(opt.name, tool)) {
          return AppUI.toast(`${opt.label} is required.`, 'error');
        }
      }

      const formData = new FormData();
      if (!tool.noFile) {
        tool.uploads.forEach((u) => {
          (state.files[u.field] || []).forEach((f) => formData.append(u.field, f));
        });
      }
      (tool.options || []).forEach((opt) => {
        formData.append(opt.name, getOptionValue(opt.name, tool) ?? '');
      });

      const progressWrap = document.getElementById('progress-wrap');
      const progressFill = document.getElementById('progress-fill');
      const progressLabel = document.getElementById('progress-label');
      const runBtn = document.getElementById('btn-run-tool');

      progressWrap.classList.remove('hidden');
      runBtn.disabled = true;
      document.getElementById('tool-result').innerHTML = '';

      const data = await AppUpload.uploadWithProgress(tool.endpoint, formData, {
        headers: AppState.authHeaders(),
        onProgress: (pct) => {
          progressFill.style.width = `${pct}%`;
          progressLabel.textContent = pct < 100 ? `Uploading… ${pct}%` : 'Processing…';
        }
      });

      progressWrap.classList.add('hidden');
      runBtn.disabled = false;
      AppTelegram.haptic('success');
      AppState.incrementLocalOps();
      renderResult(tool, data);
    } catch (err) {
      document.getElementById('progress-wrap').classList.add('hidden');
      document.getElementById('btn-run-tool').disabled = false;
      AppUI.toast(err.message || 'Something went wrong.', 'error');
    } finally {
      isRunning = false;
    }
  }

  function renderResult(tool, data) {
    const box = document.getElementById('tool-result');
    const fullUrl = window.location.origin + data.downloadUrl;

    if (tool.resultKind === 'qr') {
      box.innerHTML = `
        <div class="glass result-card">
          <div class="qr-preview"><img src="${fullUrl}" alt="Generated QR code" width="220" height="220" /></div>
          <div class="result-actions">
            <a class="btn btn-primary" href="${fullUrl}" download>⬇️ Download</a>
            <button class="btn btn-ghost" id="btn-share-result">📤 Share</button>
          </div>
        </div>`;
    } else {
      box.innerHTML = `
        <div class="glass result-card">
          <div class="result-ico">✅</div>
          <h3>Done!</h3>
          <p>${data.filename} · ${data.size || ''}</p>
          ${data.preview ? `<div class="result-preview">${escapeHtml(data.preview)}${data.preview.length >= 2000 ? '…' : ''}</div>` : ''}
          <div class="result-actions">
            <a class="btn btn-primary" href="${fullUrl}" download="${data.filename}">⬇️ Download</a>
            <button class="btn btn-ghost" id="btn-share-result">📤 Share</button>
          </div>
        </div>`;
    }

    document.getElementById('btn-share-result').addEventListener('click', () => {
      AppTelegram.shareLink(fullUrl, `Here's your file from PDF Pro AI`);
    });

    AppTelegram.setMainButton({ text: 'Back to Dashboard', onClick: () => AppUI.showView('dashboard') });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── QR Scanner (pure client-side, uses camera + jsQR) ────────
  let scanStream = null;
  let scanRAF = null;

  function renderQrScanner() {
    const body = document.getElementById('tool-panel-body');
    body.innerHTML = `
      <video id="qr-scanner-video" autoplay playsinline muted></video>
      <canvas id="qr-canvas" class="hidden"></canvas>
      <div class="field-group" id="qr-scan-result" style="margin-top:14px;"></div>
      <button class="btn btn-ghost btn-block" id="btn-stop-scan">Stop camera</button>
    `;
    document.getElementById('btn-stop-scan').addEventListener('click', stopQrScanner);
    loadJsQr().then(startQrScanner).catch(() => {
      AppUI.toast('Could not load the QR scanning library. Check your connection.', 'error');
    });
  }

  const JSQR_CDNS = [
    'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.js',
    'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js'
  ];

  function loadJsQr() {
    if (window.jsQR) return Promise.resolve();
    return JSQR_CDNS.reduce(
      (chain, src) => chain.catch(() => loadScript(src)),
      Promise.reject()
    );
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function startQrScanner() {
    try {
      scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    } catch (err) {
      return AppUI.toast('Camera access denied or unavailable.', 'error');
    }
    const video = document.getElementById('qr-scanner-video');
    const canvas = document.getElementById('qr-canvas');
    const ctx = canvas.getContext('2d');
    video.srcObject = scanStream;

    const tick = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          onQrDecoded(code.data);
          return; // stop the loop once we find one
        }
      }
      scanRAF = requestAnimationFrame(tick);
    };
    scanRAF = requestAnimationFrame(tick);
  }

  function onQrDecoded(text) {
    AppTelegram.haptic('success');
    stopQrScanner(false);
    const isUrl = /^https?:\/\//i.test(text);
    document.getElementById('qr-scan-result').innerHTML = `
      <div class="glass result-card">
        <div class="result-ico">📡</div>
        <h3>QR code found</h3>
        <div class="result-preview">${escapeHtml(text)}</div>
        <div class="result-actions">
          ${isUrl ? `<a class="btn btn-primary" href="${text}" target="_blank" rel="noopener">Open link</a>` : ''}
          <button class="btn btn-ghost" id="btn-copy-qr">Copy text</button>
        </div>
      </div>`;
    document.getElementById('btn-copy-qr').addEventListener('click', () => {
      navigator.clipboard.writeText(text);
      AppUI.toast('Copied to clipboard', 'success');
    });
  }

  function stopQrScanner(clearStream = true) {
    if (scanRAF) cancelAnimationFrame(scanRAF);
    if (clearStream && scanStream) {
      scanStream.getTracks().forEach((t) => t.stop());
      scanStream = null;
    }
  }

  return { TOOLS, getTool, renderGrid, openTool, stopQrScanner };
})();
