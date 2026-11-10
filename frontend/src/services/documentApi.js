const API_BASE = '/api';

async function getResponseError(response) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const error = new Error(payload?.error?.message || 'Não foi possível concluir a solicitação.');
  error.code = payload?.error?.code || 'REQUEST_FAILED';
  error.status = response.status;
  return error;
}

async function requestJson(url, options) {
  const response = await fetch(`${API_BASE}${url}`, options);
  if (!response.ok) {
    throw await getResponseError(response);
  }
  return response.json();
}

export async function listDocuments() {
  const payload = await requestJson('/documents');
  return payload.documents;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const payload = await requestJson('/upload', {
    method: 'POST',
    body: formData,
  });
  return payload.document;
}

function getDownloadFilename(contentDisposition, fallbackName) {
  const encodedName = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encodedName) {
    try {
      return decodeURIComponent(encodedName);
    } catch {
      // Use the ordinary filename when the encoded header is malformed.
    }
  }

  const ordinaryName = contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1];
  return ordinaryName || fallbackName;
}

export async function downloadDocument(document) {
  const response = await fetch(`${API_BASE}/documents/${encodeURIComponent(document.id)}/download`);
  if (!response.ok) {
    throw await getResponseError(response);
  }

  return {
    blob: await response.blob(),
    filename: getDownloadFilename(
      response.headers.get('content-disposition'),
      document.originalName,
    ),
  };
}