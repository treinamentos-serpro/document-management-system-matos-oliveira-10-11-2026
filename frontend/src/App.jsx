import { useEffect, useState } from 'react';
import { DocumentList } from './components/DocumentList.jsx';
import { UploadComponent } from './components/UploadComponent.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let isCurrent = true;

    setIsLoading(true);
    setListError('');
    listDocuments()
      .then((result) => {
        if (isCurrent) {
          setDocuments(result);
        }
      })
      .catch((error) => {
        if (isCurrent) {
          setListError(error.message);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [refreshKey]);

  async function handleUploadComplete() {
    setNotice('Documento enviado.');
    setRefreshKey((currentKey) => currentKey + 1);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>ARQUIVO<span className="brand-period">.</span></span>
        </a>
        <div className="topbar-meta">
          <span className="status-dot" aria-hidden="true" />
          <span>Biblioteca local</span>
        </div>
      </header>

      <div id="top" className="content-wrap">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">ESPAÇO DE TRABALHO</p>
            <h1 id="page-title">Documentos<span className="heading-period">.</span></h1>
          </div>
          <div className="document-total" aria-live="polite">
            <span className="total-number">{documents.length.toString().padStart(2, '0')}</span>
            <span className="total-label">ARQUIVOS<br />REGISTRADOS</span>
          </div>
        </section>

        <section className="upload-section" aria-labelledby="upload-section-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ENTRADA</p>
              <h2 id="upload-section-title">Adicionar documento</h2>
            </div>
            <span className="section-index">01 / 02</span>
          </div>
          <UploadComponent onUploaded={handleUploadComplete} />
        </section>

        <div className="notice-slot" aria-live="polite">
          {notice && <p className="success-notice">{notice}</p>}
        </div>

        <section className="documents-section" aria-labelledby="documents-section-title">
          <div className="section-heading list-heading">
            <div>
              <p className="eyebrow">ARQUIVO</p>
              <h2 id="documents-section-title">Recentes</h2>
            </div>
            <span className="section-index">02 / 02</span>
          </div>
          <DocumentList
            documents={documents}
            isLoading={isLoading}
            error={listError}
            onRetry={() => setRefreshKey((currentKey) => currentKey + 1)}
          />
        </section>

        <footer className="page-footer">
          <span>DMS <span className="brand-period">/</span> DOCUMENTOS</span>
          <span>ARMAZENAMENTO LOCAL</span>
        </footer>
      </div>
    </main>
  );
}
