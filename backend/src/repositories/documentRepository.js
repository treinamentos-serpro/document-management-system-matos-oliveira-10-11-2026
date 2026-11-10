function createDocumentRepository() {
  const documents = new Map();

  return {
    save(document) {
      documents.set(document.id, { ...document });
      return { ...document };
    },

    findById(id) {
      const document = documents.get(id);
      return document ? { ...document } : null;
    },

    findByOwner(owner) {
      return [...documents.values()]
        .filter((document) => document.owner === owner)
        .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
        .map((document) => ({ ...document }));
    },
  };
}

module.exports = { createDocumentRepository };