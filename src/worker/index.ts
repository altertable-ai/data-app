import {
  PAGE_CSP,
  runtimeHtml as renderRuntimeHtml,
} from '@/src/core/runtime-html';
import { trustedParent } from '@/src/worker/trusted-parent';

// The package build embeds the compiled classic script, never a runtime import.
declare const DATA_APP_BOOTSTRAP: string;

interface WorkerBindings {
  DOMAIN_NAME: string;
  PARENT_ORIGINS: string;
}

const TOKEN_RE = /^(?=.{1,63}$)[a-z0-9]+(?:-[a-z0-9]+)+-app-[1-9][0-9]*$/;
function runtimeHtml(parentOrigin: string) {
  return renderRuntimeHtml(parentOrigin, DATA_APP_BOOTSTRAP);
}

function isPreviewHost(hostname: string, domainName: string) {
  const suffix = `.${domainName}`;

  return (
    hostname.endsWith(suffix) &&
    TOKEN_RE.test(hostname.slice(0, -suffix.length))
  );
}

export default {
  runtimeHtml,
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
