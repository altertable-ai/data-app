import { spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import { createServer, type Socket } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { open, protocol } from '@/scripts/dev-connection';

const root = await realpath(resolve(import.meta.dir, '..'));

const firstPort =
  30000 + (createHash('sha256').update(root).digest().readUInt32BE(0) % 25000);
const ports = Array.from({ length: 16 }, (_, index) => firstPort + index * 2);

// Kernel-owned listeners and connections replace persistent locks/PID leases.
// The handshake distinguishes another checkout or an unrelated local service.
async function serve() {
  const clients = new Set<Socket>();
  const connections = new Set<Socket>();
  let worker: ChildProcess | undefined;
  let workerExited: Promise<void> | undefined;
  let stopping = false;
  let current = '';
  let startup: ReturnType<typeof setTimeout> | undefined;
  let gatePort = 0;

  function relay(status: boolean) {
    let output = '';
    return (chunk: Buffer) => {
      output += chunk.toString();
      let end: number;
      while ((end = output.indexOf('\n')) >= 0) {
        const line = output.slice(0, end + 1);
        output = output.slice(end + 1);
        if (status && line.startsWith('DATA_APP_DEV ')) current = line;
        for (const socket of clients) socket.write(line);
      }
    };
  }
  const stdout = relay(true);
  const stderr = relay(false);
  async function stop() {
    if (stopping) return;
    stopping = true;
    clearTimeout(startup);
    // EOF also reaches the worker after an owner crash, without PID signalling.
    worker?.stdin?.end();
    await workerExited;
    for (const socket of connections) socket.end();
    server.close();
  }
  function leave(socket: Socket) {
    const subscribed = clients.delete(socket);
    if (subscribed && clients.size === 0) void stop();
  }
  const server = createServer(socket => {
    connections.add(socket);
    socket.on('error', () => socket.destroy());
    socket.once('close', () => {
      connections.delete(socket);
      leave(socket);
    });
    socket.write(
      `${JSON.stringify({ protocol, role: 'owner', root, pid: process.pid, stopping })}\n`
    );
    let input = '';
    socket.on('data', chunk => {
      input += chunk.toString();
      if (input.length > 128) {
        socket.destroy();
        return;
      }
      let end: number;
      while ((end = input.indexOf('\n')) >= 0) {
        const command = input.slice(0, end);
        input = input.slice(end + 1);
        if (command === 'subscribe' && !stopping && !clients.has(socket)) {
          clearTimeout(startup);
          clients.add(socket);
          if (current) socket.write(current);
          if (!worker) {
            worker = spawn(process.execPath, ['scripts/dev-watch.ts'], {
              cwd: root,
              env: {
                ...process.env,
                DATA_APP_DEV_MANAGED: '1',
                DATA_APP_DEV_SESSION: crypto.randomUUID(),
                DATA_APP_DEV_GATE_PORT: String(gatePort),
              },
              stdio: ['pipe', 'pipe', 'pipe'],
            });
            worker.stdout!.on('data', stdout);
            worker.stderr!.on('data', stderr);
            workerExited = new Promise(done => {
              worker!.once('exit', () => {
                if (!stopping)
                  for (const client of clients)
                    client.write('DATA_APP_DEV_OWNER_FAILED\n');
                done();
                void stop();
              });
              worker!.once('error', error => {
                stderr(Buffer.from(`${error.message}\n`));
                if (!stopping)
                  for (const client of clients)
                    client.write('DATA_APP_DEV_OWNER_FAILED\n');
                done();
                void stop();
              });
            });
          }
        } else if (command === 'detach') {
          const last = clients.size === 1 && clients.has(socket);
          leave(socket);
          if (!last) socket.end();
        } else if (command === 'subscribe' && stopping) socket.end();
      }
    });
  });

  for (const port of ports) {
    const held = await open(port + 1);
    held?.socket.destroy();
    // A suspended old worker cannot answer: an ambiguous occupied gate must
    // still block replacement, rather than being mistaken for another service.
    if (
      held &&
      !held.ambiguous &&
      (held.owner?.root !== root || held.owner.role !== 'worker')
    )
      continue;
    gatePort = port + 1;
    try {
      await new Promise<void>((done, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', () => {
          server.removeListener('error', reject);
          done();
        });
      });
      // No client may arrive if its launcher was killed during startup.
      startup = setTimeout(() => void stop(), 5000);
      for (const signal of ['SIGINT', 'SIGTERM'] as const)
        process.on(signal, () => void stop());
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw error;
      const existing = await open(port);
      existing?.socket.destroy();
      if (existing?.owner?.root === root && existing.owner.role === 'owner')
        return;
    }
  }
  throw new Error(
    'No free local watcher port. Stop unused local development services and retry.'
  );
}

async function attach() {
  let socket: Socket | undefined;
  let stopping = false;
  let generation = 0;
  let stopped = false;
  let failed = false;
  function detach() {
    if (stopping) return;
    stopping = true;
    if (socket) socket.write('detach\n');
  }
  for (const signal of ['SIGINT', 'SIGTERM'] as const)
    process.on(signal, detach);
  let launchAt = 0;
  const deadline = Date.now() + 15000;
  while (!socket && !stopping && Date.now() < deadline) {
    for (const port of ports) {
      const found = await open(port);
      if (
        found?.owner?.root === root &&
        found.owner.role === 'owner' &&
        !found.owner.stopping &&
        !stopping
      ) {
        socket = found.socket;
        console.log(
          `[data-app] Shared watcher PID ${found.owner.pid} for ${root}`
        );
        break;
      }
      found?.socket.destroy();
    }
    if (!socket && !stopping) {
      if (Date.now() >= launchAt) {
        spawn(process.execPath, [import.meta.filename, '--owner'], {
          cwd: root,
          detached: true,
          stdio: 'ignore',
        }).unref();
        launchAt = Date.now() + 1000;
      }
      await delay(100);
    }
  }
  if (!socket) {
    if (stopping) return;
    throw new Error(
      'Could not attach to the package watcher within 15 seconds. Check local network permissions and retry.'
    );
  }
  let output = '';
  const ended = new Promise<void>(done => socket!.once('close', () => done()));
  socket.on('data', chunk => {
    output += chunk.toString();
    let end: number;
    while ((end = output.indexOf('\n')) >= 0) {
      const line = output.slice(0, end);
      output = output.slice(end + 1);
      if (line === 'DATA_APP_DEV_OWNER_FAILED') {
        failed = true;
        continue;
      }
      process.stdout.write(`${line}\n`);
      if (line.startsWith('DATA_APP_DEV ')) {
        const status = JSON.parse(line.slice('DATA_APP_DEV '.length));
        generation = status.generation;
        if (status.event === 'stopped') stopped = true;
      }
    }
  });
  socket.write('subscribe\n');
  await ended;
  if (stopping) {
    if (!stopped)
      console.log(
        `DATA_APP_DEV ${JSON.stringify({ event: 'stopped', generation })}`
      );
  } else if (failed || !stopped)
    throw new Error(
      'Shared package watcher exited unexpectedly. Rerun bun run dev.'
    );
}

try {
  if (process.argv.includes('--owner')) await serve();
  else await attach();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
