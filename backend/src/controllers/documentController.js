function createContentDisposition(originalName) {
  const asciiName = originalName
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_')
    .replace(/[\r\n]/g, '_') || 'document';
  const encodedName = encodeURIComponent(originalName)
    .replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);

  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`;
}

function createDocumentController(documentService) {
  return {
    async upload(req, res, next) {
      try {
        const document = await documentService.uploadDocument(req.file);
        return res.status(201).json({ document });
      } catch (error) {
        return next(error);
      }
    },

    list(req, res, next) {
      try {
        const documents = documentService.listDocuments();
        return res.status(200).json({ documents });
      } catch (error) {
        return next(error);
      }
    },

    async download(req, res, next) {
      try {
        const { document, stream } = await documentService.getDocumentForDownload(req.params.id);
        res.status(200);
        res.setHeader('Content-Type', document.contentType);
        res.setHeader('Content-Disposition', createContentDisposition(document.originalName));
        res.setHeader('Cache-Control', 'no-store');

        stream.on('error', (error) => {
          if (res.headersSent) {
            res.destroy(error);
            return;
          }
          next(error);
        });

        return stream.pipe(res);
      } catch (error) {
        return next(error);
      }
    },
  };
}

module.exports = { createDocumentController };