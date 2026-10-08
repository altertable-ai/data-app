import { describe, expect, test } from 'vitest';

// Execute the built deployment artifact, without rebundling package source.
const { default: worker } = await import(
  import.meta.resolve('@altertable/data-app/worker')
);
const bindings = {
  DOMAIN_NAME: 'altertableusercontent.dev',
  PARENT_ORIGINS: 'https://altertable.dev https://*.preview.altertable.dev',
};
const previewUrl = 'https://my-report-app-1.altertableusercontent.dev/';

function request(parent?: string, method = 'GET', config = bindings) {
  const url = new URL(previewUrl);
  if (parent !== undefined) url.searchParams.set('__altertable_parent', parent);

  return worker.fetch(new Request(url, { method }), config);
}

describe('published Worker', () => {
  test('serves unstyled classic bootstrap with restrictive headers and empty HEAD', async () => {
    const get = request();
    const head = request(undefined, 'HEAD');
    expect(get.status).toBe(200);
    expect(head.status).toBe(200);
    expect([...head.headers]).toEqual([...get.headers]);
    expect(await head.text()).toBe('');
    expect(get.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(get.headers.get('referrer-policy')).toBe('no-referrer');
    expect(get.headers.get('x-content-type-options')).toBe('nosniff');
    expect(get.headers.get('content-security-policy')).toBe(
      "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors https://altertable.dev https://*.preview.altertable.dev"
    );
  });

  test.each([
    'https://altertableusercontent.dev/',
    'https://report-app-1.altertableusercontent.dev/',
    'https://my-report-app-0.altertableusercontent.dev/',
    'https://my-report-app-01.altertableusercontent.dev/',
    'https://nested.my-report-app-1.altertableusercontent.dev/',
    'https://my-report-app-1.altertableusercontent.dev.evil.example/',
    `https://${'a'.repeat(60)}-b-app-1.altertableusercontent.dev/`,
    `${previewUrl}asset.js`,
  ])('rejects invalid preview URL %s', url => {
    expect(worker.fetch(new Request(url), bindings).status).toBe(404);
  });

  test('keeps method validation and Allow header', () => {
    const response = request(undefined, 'POST');
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, HEAD');
  });

  test.each([
    'https://altertable.dev',
    'https://branch-42.preview.altertable.dev',
  ])('selects deployment-approved parent %s', async parent => {
    const response = request(parent);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(`data-parent-origin="${parent}"`);
  });

  test.each([
    'https://evil.example',
    'https://preview.altertable.dev',
    'https://nested.branch.preview.altertable.dev',
    'https://branch.preview.altertable.dev.evil.example',
    'https://-branch.preview.altertable.dev',
    'https://branch-.preview.altertable.dev',
    'http://branch.preview.altertable.dev',
    'https://branch.preview.altertable.dev:8443',
    'https://altertable.dev/',
    'https://altertable.dev/path',
    'https://altertable.dev#fragment',
    'https://user@altertable.dev',
    'null',
    '',
  ])('rejects untrusted selection %s', parent => {
    expect(request(parent).status).toBe(403);
  });

  test('validates parent selection for HEAD', () => {
    expect(request('https://evil.example', 'HEAD').status).toBe(403);
  });

  test('rejects duplicate selection and does not trust a referrer', async () => {
    const url = `${previewUrl}?__altertable_parent=https://altertable.dev&__altertable_parent=https://altertable.dev`;
    expect(worker.fetch(new Request(url), bindings).status).toBe(403);
    const response = worker.fetch(
      new Request(previewUrl, {
        headers: { Referer: 'https://evil.example/' },
      }),
      bindings
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(
      'data-parent-origin="https://altertable.dev"'
    );
  });

  test('wildcard-only configuration requires an explicit approved selection', () => {
    const config = {
      ...bindings,
      PARENT_ORIGINS: 'https://*.preview.altertable.dev',
    };
    expect(request(undefined, 'GET', config).status).toBe(503);
    expect(
      request('https://branch.preview.altertable.dev', 'GET', config).status
    ).toBe(200);
  });

  test.each([
    undefined,
    '',
    ' ',
    '*',
    'https://altertable.dev/',
    'http://*.preview.altertable.dev',
    'https://*.*.altertable.dev',
    'https://*.preview.altertable.dev:8443',
    'https://altertable.dev https://bad.example/path',
  ])('fails closed for invalid/defaultless configuration %s', config => {
    expect(
      request(undefined, 'GET', {
        ...bindings,
        PARENT_ORIGINS: config as string,
      }).status
    ).toBe(503);
  });

  test('escapes the configured attribute and normalizes CSP whitespace', async () => {
    const response = request(undefined, 'GET', {
      ...bindings,
      PARENT_ORIGINS: "  https://host'example.test\nhttps://other.example  ",
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(
      'data-parent-origin="https://host&#39;example.test"'
    );
    expect(response.headers.get('content-security-policy')).toMatch(
      /frame-ancestors https:\/\/host'example.test https:\/\/other.example$/
    );
  });
});
