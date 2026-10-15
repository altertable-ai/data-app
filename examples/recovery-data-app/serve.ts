// eslint-disable-next-line no-restricted-imports -- Packaged examples resolve their own files.
import page from './index.html';

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.PORT ?? 0),
  // Exercise production recovery without a development overlay intercepting intentional failures.
  development: false,
  routes: { '/': page },
});
console.log(`Recovery example running at ${server.url}`);
