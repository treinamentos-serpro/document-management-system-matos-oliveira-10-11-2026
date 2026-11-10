const path = require('node:path');
const { randomUUID } = require('node:crypto');

function getSafeOriginalName(originalName) {
  const name = path.posix.basename(String(originalName).replace(/\\/g, '/'))
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 255);

  return name || 'document';
}

function createDocumentMetadata(file, owner, contentType) {
  return {
    id: randomUUID(),
    originalName: getSafeOriginalName(file.originalname),
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    contentType,
    storedName: file.filename,
  };
}

function toPublicDocument(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
    contentType: document.contentType,
  };
}

module.exports = { createDocumentMetadata, toPublicDocument };