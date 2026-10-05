export const PAGE_CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'";
export function runtimeHtml(parentOrigin: string, bootstrap: string) {
  const inlineBootstrap = bootstrap.replace(
    /<\/script/gi,
    match => `<\\${match.slice(1)}`
  );
  const attribute = parentOrigin
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll("'", '&#39;');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="${PAGE_CSP}">
  </head>
  <body>
    <div id="root"></div>
    <script data-parent-origin="${attribute}">${inlineBootstrap}</script>
  </body>
</html>
`;
}
