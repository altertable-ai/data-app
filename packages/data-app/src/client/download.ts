/** Start a browser download and release its temporary anchor and object URL. */
export function downloadBlob({
  filename,
  blob,
}: {
  filename: string;
  blob: Blob;
}): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
