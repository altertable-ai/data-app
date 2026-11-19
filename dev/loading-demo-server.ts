import page from '@/dev/loading-demo.html';

// Run `bun run build` first. This preview needs neither Docker nor lakehouse credentials.
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.PORT ?? 27428),
  development: true,
  routes: { '/': page },
});
console.log(`Widget loading lab: ${server.url}`);
