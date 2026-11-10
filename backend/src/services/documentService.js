const { HttpError } = require('../errors/HttpError');
const { isValidContent, normalizeContentType } = require('./documentFileValidation');
const { createDocumentMetadata, toPublicDocument } = require('./documentMetadata');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  async function withUploadedFileCleanup(storedName, operation) {
    try {
      return await operation();
    } catch (error) {
      await removeUploadedFile(storedName);
      throw error;
    }
  }

  async function validateUploadedFile(file) {
    let buffer;
    try {
      buffer = await fileRepository.readFile(file.filename);
    } catch {
      throw new HttpError(500, 'UPLOAD_FAILED', 'Não foi possível armazenar o documento.');
    }

    const contentType = normalizeContentType(file.mimetype);
    if (!isValidContent(buffer, contentType)) {
      throw new HttpError(
        415,
        'UNSUPPORTED_FILE_TYPE',
        'O conteúdo do arquivo não corresponde ao tipo declarado.',
      );
    }

    return contentType;
  }

  function saveDocument(document) {
    try {
      documentRepository.save(document);
    } catch {
      throw new HttpError(500, 'UPLOAD_FAILED', 'Não foi possível registrar o documento.');
    }
  }

  return {
    async uploadDocument(file) {
      const owner = requireOwner();
      if (!file) {
        throw new HttpError(400, 'FILE_REQUIRED', 'Envie um arquivo no campo "file".');
      }

      return withUploadedFileCleanup(file.filename, async () => {
        const contentType = await validateUploadedFile(file);
        const document = createDocumentMetadata(file, owner, contentType);
        saveDocument(document);
        return toPublicDocument(document);
      });
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