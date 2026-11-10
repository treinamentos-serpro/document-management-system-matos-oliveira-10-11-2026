const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../src/app');

async function createTestServer(t, { maxFileSizeBytes = 1024 } = {}) {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  const app = createApp({
    ownerId: 'test-owner',
    storageDir,
    maxFileSizeBytes,
  });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.rm(storageDir, { recursive: true, force: true });
  });

  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    storageDir,
  };
}

function makeUploadForm(contents, { filename = 'relatorio.pdf', type = 'application/pdf' } = {}) {
  const form = new FormData();
  form.append('file', new Blob([contents], { type }), filename);
  return form;
}

test('listagem retorna uma lista vazia quando não há documentos', async (t) => {
  const { baseUrl } = await createTestServer(t);
  const response = await fetch(`${baseUrl}/documents`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { documents: [] });
});

test('upload, listagem e download usam os contratos definidos', async (t) => {
  const { baseUrl } = await createTestServer(t);
  const contents = Buffer.from('%PDF-1.7\nconteudo de teste');
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: makeUploadForm(contents, { filename: 'relatorio.pdf' }),
  });

  assert.equal(uploadResponse.status, 201);
  const { document } = await uploadResponse.json();
  assert.equal(document.originalName, 'relatorio.pdf');
  assert.equal(document.size, contents.length);
  assert.equal(document.owner, 'test-owner');
  assert.equal(document.contentType, 'application/pdf');
  assert.equal(typeof document.id, 'string');
  assert.equal('storedName' in document, false);

  const listResponse = await fetch(`${baseUrl}/documents`);
  assert.equal(listResponse.status, 200);
  assert.deepEqual((await listResponse.json()).documents, [document]);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.equal(downloadResponse.status, 200);
  assert.equal(downloadResponse.headers.get('content-type'), 'application/pdf');
  assert.match(downloadResponse.headers.get('content-disposition'), /filename="relatorio\.pdf"/);
  assert.equal(downloadResponse.headers.get('cache-control'), 'no-store');
  assert.deepEqual(Buffer.from(await downloadResponse.arrayBuffer()), contents);

  const missingResponse = await fetch(`${baseUrl}/documents/00000000-0000-4000-8000-000000000000/download`);
  assert.equal(missingResponse.status, 404);
  assert.equal((await missingResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');
});

test('upload rejeita arquivo ausente, tipo inválido, conteúdo incompatível e excesso de tamanho', async (t) => {
  const { baseUrl, storageDir } = await createTestServer(t, { maxFileSizeBytes: 16 });

  const missingResponse = await fetch(`${baseUrl}/upload`, { method: 'POST' });
  assert.equal(missingResponse.status, 400);
  assert.equal((await missingResponse.json()).error.code, 'FILE_REQUIRED');

  const unsupportedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: makeUploadForm('executavel', { filename: 'arquivo.exe', type: 'application/octet-stream' }),
  });
  assert.equal(unsupportedResponse.status, 415);
  assert.equal((await unsupportedResponse.json()).error.code, 'UNSUPPORTED_FILE_TYPE');

  const mismatchedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: makeUploadForm('nao e pdf'),
  });
  assert.equal(mismatchedResponse.status, 415);
  assert.equal((await mismatchedResponse.json()).error.code, 'UNSUPPORTED_FILE_TYPE');

  const oversizedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: makeUploadForm('%PDF-1.7 conteudo muito grande'),
  });
  assert.equal(oversizedResponse.status, 413);
  assert.equal((await oversizedResponse.json()).error.code, 'FILE_TOO_LARGE');

  assert.deepEqual(await fs.readdir(storageDir), []);
});