// The package build embeds the compiled classic script, never a runtime import.
declare const DATA_APP_BOOTSTRAP: string;

export const PAGE_CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'";
const inlineBootstrap = DATA_APP_BOOTSTRAP.replace(
  /<\/script/gi,
  match => `<\\${match.slice(1)}`
);

export function runtimeHtml(parentOrigin: string) {
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
