// Seed do servidor backend do Document Management System.
//
// Este arquivo é apenas um ponto de partida mínimo. Ao longo do workshop você
// vai usar o Agent Mode do GitHub Copilot para construir as camadas:
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const express = require('express');
const multer = require('multer');
const { HttpError } = require('./errors/HttpError');
const { createDocumentRepository } = require('./repositories/documentRepository');
const { createLocalFileRepository } = require('./repositories/localFileRepository');
const { createDocumentRouter } = require('./routes/documentRoutes');
const { createDocumentService } = require('./services/documentService');
const { createDocumentController } = require('./controllers/documentController');

function createApp({
  ownerId = process.env.DMS_OWNER_ID,
  storageDir,
  maxFileSizeBytes,
  allowedMimeTypes,
} = {}) {
  const app = express();
  const documentRepository = createDocumentRepository();
  const fileRepository = createLocalFileRepository({
    storageDir,
    maxFileSizeBytes,
    allowedMimeTypes,
  });
  const documentService = createDocumentService({
    documentRepository,
    fileRepository,
    ownerId,
  });
  const documentController = createDocumentController(documentService);

  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(createDocumentRouter({
    controller: documentController,
    uploadMiddleware: fileRepository.uploadMiddleware,
  }));

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    if (error instanceof multer.MulterError) {
      const isFileTooLarge = error.code === 'LIMIT_FILE_SIZE';
      const status = isFileTooLarge ? 413 : 400;
      const code = isFileTooLarge ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD';
      const message = isFileTooLarge
        ? 'O arquivo excede o limite permitido.'
        : 'A requisição de upload é inválida.';

      return res.status(status).json({ error: { code, message } });
    }

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({
        error: { code: error.code, message: error.message },
      });
    }

    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Ocorreu um erro interno.',
      },
    });
  });

  return app;
}

const app = createApp();

if (require.main === module) {
  const PORT = process.env.PORT || 3000;

  if (!process.env.DMS_OWNER_ID?.trim()) {
    console.error('Defina DMS_OWNER_ID para iniciar o backend do DMS.');
    process.exitCode = 1;
  } else {
    app.listen(PORT, () => {
      console.log(`DMS backend ouvindo na porta ${PORT}`);
    });
  }
}

module.exports = app;
module.exports.createApp = createApp;
