import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentApi.js';

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png,.txt';
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getFileError(file) {
  if (!file) {
    return 'Selecione um arquivo para continuar.';
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'O arquivo excede o limite de 10 MiB.';
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!['pdf', 'jpg', 'jpeg', 'png', 'txt'].includes(extension)) {
    return 'Este tipo de arquivo não é aceito.';
  }

  return '';
}

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  return `${(size / (1024 * 1024)).toFixed(size >= 1024 * 1024 ? 1 : 2)} MB`;
}

export function UploadComponent({ onUploaded }) {
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  function chooseFile(file) {
    setError(getFileError(file));
    setSelectedFile(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = getFileError(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);
    setError('');
    try {
      await uploadDocument(selectedFile);
      setSelectedFile(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      await onUploaded();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label
        className={`upload-dropzone${isDragging ? ' is-dragging' : ''}${selectedFile ? ' has-file' : ''}`}
        htmlFor="document-file"
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          chooseFile(event.dataTransfer.files[0] || null);
        }}
      >
        <input
          ref={inputRef}
          id="document-file"
          className="visually-hidden"
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={(event) => chooseFile(event.target.files[0] || null)}
          disabled={isUploading}
        />
        <span className="upload-mark" aria-hidden="true">+</span>
        <span className="upload-copy">
          <strong>{selectedFile ? 'Documento selecionado' : 'Selecionar arquivo'}</strong>
          <span>{selectedFile ? selectedFile.name : 'PDF, JPEG, PNG ou TXT · até 10 MiB'}</span>
        </span>
        {selectedFile && <span className="file-size">{formatFileSize(selectedFile.size)}</span>}
      </label>

      <div className="upload-actions">
        <span className="upload-feedback" role="alert">{error}</span>
        <button className="button button-primary" type="submit" disabled={isUploading || !selectedFile}>
          {isUploading ? 'Enviando...' : 'Enviar documento'}
        </button>
      </div>
    </form>
  );
}