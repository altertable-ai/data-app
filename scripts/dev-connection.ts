import { connect, type Socket } from 'node:net';

export const protocol = 'data-app-dev/1';

type WatcherPeer = {
  role: string;
  protocol: string;
  root: string;
  pid: number;
  stopping: boolean;
};

type PortProbe =
  | { kind: 'free' | 'unresponsive' | 'other-service' }
  | { kind: 'watcher'; socket: Socket; peer: WatcherPeer };

export function probeWatcherPort(port: number): Promise<PortProbe> {
  return new Promise(done => {
    const socket = connect({ host: '127.0.0.1', port }).setEncoding('utf8');
    let buffer = '';
    let occupied = false;
    let settled = false;
    socket.once('connect', () => {
      occupied = true;
    });
    const timeout = setTimeout(() => finish(), 500);
    function finish(
      result: PortProbe = { kind: occupied ? 'unresponsive' : 'free' }
    ) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.removeListener('data', read);
      if (result.kind !== 'watcher') socket.destroy();
      done(result);
    }
    function read(chunk: string) {
      buffer += chunk;
      if (buffer.length > 4096) {
        finish({ kind: 'other-service' });
        return;
      }
      const end = buffer.indexOf('\n');
      if (end < 0) return;
      try {
        const peer = JSON.parse(buffer.slice(0, end));
        if (
          peer.protocol === protocol &&
          typeof peer.role === 'string' &&
          typeof peer.root === 'string' &&
          Number.isSafeInteger(peer.pid)
        )
          finish({ kind: 'watcher', socket, peer });
        else finish({ kind: 'other-service' });
      } catch {
        finish({ kind: 'other-service' });
      }
    }
    socket.on('data', read);
    socket.once('error', () => finish());
    socket.once('end', () =>
      finish({ kind: occupied ? 'other-service' : 'free' })
    );
  });
}
