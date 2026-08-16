/**
 * upload.js — drag & drop zone behavior + an XHR-based uploader that
 * reports real upload progress (fetch() can't do this natively).
 */
const AppUpload = (() => {
  /** Wires a dropzone element + hidden file input together with drag/drop + click-to-browse. */
  function wireDropzone(dropzoneEl, inputEl, onFilesSelected) {
    dropzoneEl.addEventListener('click', () => inputEl.click());

    inputEl.addEventListener('change', () => {
      if (inputEl.files.length) onFilesSelected(Array.from(inputEl.files));
    });

    ['dragenter', 'dragover'].forEach((evt) =>
      dropzoneEl.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzoneEl.classList.add('dragover');
      })
    );

    ['dragleave', 'drop'].forEach((evt) =>
      dropzoneEl.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzoneEl.classList.remove('dragover');
      })
    );

    dropzoneEl.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length) onFilesSelected(files);
    });
  }

  /**
   * Uploads a FormData payload with progress callbacks, using XHR.
   * @returns {Promise<object>} parsed JSON response body
   */
  function uploadWithProgress(url, formData, { onProgress, headers = {} } = {}) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);

      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.onload = () => {
        let body;
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          return reject(new Error('Server returned an invalid response.'));
        }
        if (xhr.status >= 200 && xhr.status < 300 && body.ok) {
          resolve(body.data);
        } else {
          reject(new Error(body.message || `Upload failed (${xhr.status}).`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload.'));
      xhr.send(formData);
    });
  }

  function humanSize(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }

  function fileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const map = {
      pdf: '📕', doc: '📄', docx: '📄', xls: '📊', xlsx: '📊',
      ppt: '📽️', pptx: '📽️', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', webp: '🖼️'
    };
    return map[ext] || '📁';
  }

  return { wireDropzone, uploadWithProgress, humanSize, fileIcon };
})();
