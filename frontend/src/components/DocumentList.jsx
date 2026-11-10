import { DownloadButton } from './DownloadButton.jsx';

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(0)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getFileLabel(contentType) {
  const labels = {
    'application/pdf': 'PDF',
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'text/plain': 'TXT',
  };
  return labels[contentType] || 'ARQUIVO';
}

export function DocumentList({ documents, isLoading, error, onRetry }) {
  return (
    <div className="document-list">
      <div className="document-list-header" aria-hidden="true">
        <span>DOCUMENTO</span>
        <span>TIPO</span>
        <span>ADICIONADO</span>
        <span>TAMANHO</span>
        <span />
      </div>

      {isLoading ? (
        <p className="list-state" role="status">Carregando documentos...</p>
      ) : error ? (
        <div className="list-state list-error" role="alert">
          <span>{error}</span>
          <button className="text-button" type="button" onClick={onRetry}>Tentar novamente</button>
        </div>
      ) : documents.length === 0 ? (
        <p className="list-state">Nenhum documento registrado.</p>
      ) : (
        <ul className="document-rows">
          {documents.map((document) => (
            <li className="document-row" key={document.id}>
              <span className="document-name" title={document.originalName}>
                <span className="document-file-mark" aria-hidden="true">{getFileLabel(document.contentType)}</span>
                <span>{document.originalName}</span>
              </span>
              <span className="document-type">{getFileLabel(document.contentType)}</span>
              <time className="document-date" dateTime={document.uploadedAt}>
                {formatDate(document.uploadedAt)}
              </time>
              <span className="document-size">{formatFileSize(document.size)}</span>
              <DownloadButton document={document} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}