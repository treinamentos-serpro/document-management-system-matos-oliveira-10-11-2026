const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { HttpError } = require('../errors/HttpError');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSafeOriginalName(originalName) {
  const name = path.posix.basename(String(originalName).replace(/\\/g, '/'))
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 255);

  return name || 'document';
}

function isValidContent(buffer, contentType) {
  if (contentType === 'application/pdf') {
    return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  }

  if (contentType === 'image/png') {
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }

  if (contentType === 'image/jpeg') {
    return buffer.length >= 3
      && buffer[0] === 0xff
      && buffer[1] === 0xd8
      && buffer[2] === 0xff;
  }

  if (contentType === 'text/plain') {
    try {
      return !buffer.includes(0) && new TextDecoder('utf-8', { fatal: true }).decode(buffer) !== null;
    } catch {
      return false;
    }
  }

  return false;
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

function createDocumentService({ documentRepository, fileRepository, ownerId }) {
  function requireOwner() {
    if (typeof ownerId !== 'string' || !ownerId.trim()) {
      throw new HttpError(
        503,
        'DMS_OWNER_NOT_CONFIGURED',
        'O serviço de documentos não está configurado.',
      );
    }

    return ownerId.trim();
  }

  async function removeUploadedFile(storedName) {
    try {
      await fileRepository.remove(storedName);
    } catch {
      // A falha de limpeza não deve mascarar o erro original do upload.
    }
  }

  return {
    async uploadDocument(file) {
      const owner = requireOwner();
      if (!file) {
        throw new HttpError(400, 'FILE_REQUIRED', 'Envie um arquivo no campo "file".');
      }

      let buffer;
      try {
        buffer = await fileRepository.readFile(file.filename);
      } catch {
        await removeUploadedFile(file.filename);
        throw new HttpError(500, 'UPLOAD_FAILED', 'Não foi possível armazenar o documento.');
      }

      const contentType = file.mimetype.split(';', 1)[0].toLowerCase();
      if (!isValidContent(buffer, contentType)) {
        await removeUploadedFile(file.filename);
        throw new HttpError(
          415,
          'UNSUPPORTED_FILE_TYPE',
          'O conteúdo do arquivo não corresponde ao tipo declarado.',
        );
      }

      const document = {
        id: randomUUID(),
        originalName: getSafeOriginalName(file.originalname),
        size: file.size,
        uploadedAt: new Date().toISOString(),
        owner,
        contentType,
        storedName: file.filename,
      };

      try {
        documentRepository.save(document);
      } catch {
        await removeUploadedFile(file.filename);
        throw new HttpError(500, 'UPLOAD_FAILED', 'Não foi possível registrar o documento.');
      }

      return toPublicDocument(document);
    },

    listDocuments() {
      const owner = requireOwner();
      return documentRepository.findByOwner(owner).map(toPublicDocument);
    },

    async getDocumentForDownload(id) {
      const owner = requireOwner();
      if (!UUID_PATTERN.test(id)) {
        throw new HttpError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
      }

      const document = documentRepository.findById(id);
      if (!document || document.owner !== owner) {
        throw new HttpError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
      }

      try {
        await fileRepository.assertExists(document.storedName);
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new HttpError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
        }
        throw new HttpError(500, 'DOWNLOAD_FAILED', 'Não foi possível baixar o documento.');
      }

      return {
        document: toPublicDocument(document),
        stream: fileRepository.createReadStream(document.storedName),
      };
    },
  };
}

module.exports = { createDocumentService };