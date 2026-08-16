const fs = require('fs-extra');
const path = require('path');
const appConfig = require('../config/app');
const { makeOutputPath } = require('../utils/helpers');

/**
 * Remove the background from an image.
 *
 * Real background removal needs a trained segmentation model (e.g. rembg / U2-Net)
 * or a hosted API — it cannot be done reliably with plain image processing.
 * This wires up the remove.bg API when REMOVE_BG_API_KEY is set. Without a key,
 * it throws a clear, actionable error rather than silently returning a fake result.
 *
 * To self-host instead of using remove.bg, run the open-source `rembg` Python
 * service alongside this app and swap the fetch URL below for your own endpoint.
 *
 * @param {string} imagePath
 */
async function removeBackground(imagePath) {
  if (!appConfig.removeBgApiKey) {
    throw new Error(
      'Background removal is not configured. Set REMOVE_BG_API_KEY in .env (see https://www.remove.bg/api), ' +
      'or self-host the open-source "rembg" service and point this function at it.'
    );
  }

  const FormData = require('form-data'); // lazy require: only needed when this feature is used
  const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

  const form = new FormData();
  form.append('image_file', fs.createReadStream(imagePath), path.basename(imagePath));
  form.append('size', 'auto');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': appConfig.removeBgApiKey },
    body: form
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Background removal failed: ${errText}`);
  }

  const outputPath = makeOutputPath('.png');
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(outputPath, buffer);
  return outputPath;
}

module.exports = removeBackground;
