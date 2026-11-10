const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');
const { HttpError } = require('../errors/HttpError');

const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const KNOWN_TYPES = new Map([
  ['application/pdf', new Set(['.pdf'])],
  ['image/jpeg', new Set(['.jpg', '.jpeg'])],
  ['image/png', new Set(['.png'])],
  ['text/plain', new Set(['.txt'])],
]);
const DEFAULT_MIME_TYPES = [...KNOWN_TYPES.keys()];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseMaxFileSize(value = process.env.MAX_FILE_SIZE_BYTES) {
  if (value === undefined || value === '') {
    return DEFAULT_MAX_FILE_SIZE_BYTES;
  }

  const maxFileSizeBytes = Number(value);
  if (!Number.isSafeInteger(maxFileSizeBytes) || maxFileSizeBytes < 1) {
    throw new Error('MAX_FILE_SIZE_BYTES deve ser um inteiro positivo.');
  }

  return maxFileSizeBytes;
}

function parseAllowedMimeTypes(value = process.env.ALLOWED_FILE_TYPES) {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_MIME_TYPES;
  }

  const mimeTypes = value.split(',').map((mimeType) => mimeType.trim().toLowerCase());
  const hasUnknownType = mimeTypes.some((mimeType) => !KNOWN_TYPES.has(mimeType));

  if (hasUnknownType || mimeTypes.length === 0) {
    throw new Error('ALLOWED_FILE_TYPES contém um tipo não suportado.');
  }

  return [...new Set(mimeTypes)];
}

function createLocalFileRepository({
  storageDir = path.resolve(__dirname, '../../storage'),
  maxFileSizeBytes = parseMaxFileSize(),
  allowedMimeTypes = parseAllowedMimeTypes(),
} = {}) {
  const resolvedStorageDir = path.resolve(storageDir);
  const allowedTypes = new Set(allowedMimeTypes);
  fs.mkdirSync(resolvedStorageDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: resolvedStorageDir,
    filename: (req, file, callback) => callback(null, randomUUID()),
  });

  const uploadMiddleware = multer({
    storage,
    limits: { fileSize: maxFileSizeBytes, files: 1, fields: 0 },
    fileFilter: (req, file, callback) => {
      const normalizedMimeType = file.mimetype.split(';', 1)[0].toLowerCase();
      const extension = path.extname(file.originalname.replace(/\\/g, '/')).toLowerCase();
      const expectedExtensions = KNOWN_TYPES.get(normalizedMimeType);

      if (!allowedTypes.has(normalizedMimeType)
        || !expectedExtensions
        || !expectedExtensions.has(extension)) {
        return callback(new HttpError(
          415,
          'UNSUPPORTED_FILE_TYPE',
          'O tipo de arquivo não é permitido ou não corresponde à extensão.',
        ));
      }

      return callback(null, true);
    },
  }).single('file');

  function getPath(storedName) {
    if (typeof storedName !== 'string' || !UUID_PATTERN.test(storedName)) {
      throw new Error('Identificador interno de arquivo inválido.');
    }

    return path.join(resolvedStorageDir, storedName);
  }

  return {
    uploadMiddleware,
    readFile(storedName) {
      return fsPromises.readFile(getPath(storedName));
    },
    assertExists(storedName) {
      return fsPromises.access(getPath(storedName));
    },
    createReadStream(storedName) {
      return fs.createReadStream(getPath(storedName));
    },
    async remove(storedName) {
      try {
        await fsPromises.unlink(getPath(storedName));
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    },
  };
}

module.exports = {
  createLocalFileRepository,
  parseAllowedMimeTypes,
  parseMaxFileSize,
};