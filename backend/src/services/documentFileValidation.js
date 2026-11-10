function normalizeContentType(mimeType) {
  return mimeType.split(';', 1)[0].toLowerCase();
}

function isValidContent(buffer, contentType) {
  if (contentType === 'application/pdf') {
    return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  }

  if (contentType === 'image/png') {
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }

  if (contentType === 'image/jpeg') {
    return buffer.length >= 3
      && buffer[0] === 0xff
      && buffer[1] === 0xd8
      && buffer[2] === 0xff;
  }

  if (contentType === 'text/plain') {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      return !buffer.includes(0);
    } catch {
      return false;
    }
  }

  return false;
}

module.exports = { isValidContent, normalizeContentType };