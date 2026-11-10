const express = require('express');

function createDocumentRouter({ controller, uploadMiddleware }) {
  const router = express.Router();

  router.post('/upload', uploadMiddleware, controller.upload);
  router.get('/documents', controller.list);
  router.get('/documents/:id/download', controller.download);

  return router;
}

module.exports = { createDocumentRouter };