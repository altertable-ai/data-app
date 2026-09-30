import { trustedParent } from '@/src/worker/trusted-parent';

// The package build embeds the compiled classic script, never a runtime import.
declare const DATA_APP_BOOTSTRAP: string;

interface WorkerBindings {
  DOMAIN_NAME: string;
  PARENT_ORIGINS: string;
}

const TOKEN_RE = /^(?=.{1,63}$)[a-z0-9]+(?:-[a-z0-9]+)+-app-[1-9][0-9]*$/;
const PAGE_CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'";
const inlineBootstrap = DATA_APP_BOOTSTRAP.replace(/<\/script/gi, match =>
  match.replace('<', '<\\')
);

function runtimeHtml(parentOrigin: string) {
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

function isPreviewHost(hostname: string, domainName: string) {
  const suffix = `.${domainName}`;

  return (
    hostname.endsWith(suffix) &&
    TOKEN_RE.test(hostname.slice(0, -suffix.length))
  );
}

export default {
  fetch(request: Request, env: WorkerBindings) {
    const url = new URL(request.url);
    if (!isPreviewHost(url.hostname, env.DOMAIN_NAME) || url.pathname !== '/') {
      return new Response(null, { status: 404 });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, {
        status: 405,
        headers: { Allow: 'GET, HEAD' },
      });
    }
    let parent: string | null;
    try {
      parent = trustedParent(env.PARENT_ORIGINS, url.searchParams);
    } catch {
      return new Response(null, { status: 503 });
    }
    if (!parent) return new Response(null, { status: 403 });

    return new Response(
      request.method === 'HEAD' ? null : runtimeHtml(parent),
      {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': `${PAGE_CSP}; frame-ancestors ${env.PARENT_ORIGINS.trim().split(/\s+/).join(' ')}`,
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'no-referrer',
        },
      }
    );
  },
};
