function exactOrigin(value: string) {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol) || url.origin !== value) {
    throw new Error('Expected an exact HTTP(S) parent origin.');
  }

  return url;
}

// Selection can only choose an origin approved by deployment configuration.
export function trustedParent(config: string, searchParams: URLSearchParams) {
  if (typeof config !== 'string' || !config.trim()) {
    throw new Error('Missing trusted parent origins.');
  }
  const allowed = config
    .trim()
    .split(/\s+/)
    .map(value => {
      const wildcard = value.startsWith('https://*.');
      const url = exactOrigin(wildcard ? value.replace('*.', '') : value);
      if (url.hostname.includes('*') || (wildcard && url.port)) {
        throw new Error('Invalid parent origin pattern.');
      }

      return { value, url, wildcard };
    });
  const requested = searchParams.getAll('__altertable_parent');
  if (!requested.length) {
    const fallback = allowed.find(origin => !origin.wildcard);
    if (!fallback)
      throw new Error('An exact default parent origin is required.');

    return fallback.value;
  }
  if (requested.length !== 1) return null;
  let url: URL;
  try {
    url = exactOrigin(requested[0]!);
  } catch {
    return null;
  }
  const permitted = allowed.some(origin => {
    if (!origin.wildcard) return origin.value === requested[0];
    if (url.protocol !== 'https:' || url.port) return false;
    const suffix = `.${origin.url.hostname}`;

    return (
      url.hostname.endsWith(suffix) &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(
        url.hostname.slice(0, -suffix.length)
      )
    );
  });

  return permitted ? requested[0]! : null;
}
