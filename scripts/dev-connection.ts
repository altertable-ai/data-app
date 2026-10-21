import { connect, type Socket } from 'node:net';

export const protocol = 'data-app-dev/1';

type Owner = {
  role: string;
  protocol: string;
  root: string;
  pid: number;
  stopping: boolean;
};

export async function open(port: number) {
  return new Promise<
    { socket: Socket; owner?: Owner; ambiguous?: boolean } | undefined
  >(done => {
    const socket = connect({ host: '127.0.0.1', port });
    let buffer = '';
    let occupied = false;
    let settled = false;
    socket.once('connect', () => {
      occupied = true;
    });
    const timeout = setTimeout(() => finish(), 500);
    function finish(owner?: Owner, responsive = false) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.removeListener('data', read);
      if (owner) done({ socket, owner });
      else {
        socket.destroy();
        done(occupied ? { socket, ambiguous: !responsive } : undefined);
      }
    }
    function read(chunk: Buffer) {
      buffer += chunk.toString();
      if (buffer.length > 4096) {
        finish(undefined, true);
        return;
      }
      const end = buffer.indexOf('\n');
      if (end < 0) return;
      try {
        const owner = JSON.parse(buffer.slice(0, end));
        if (
          owner.protocol === protocol &&
          typeof owner.role === 'string' &&
          typeof owner.root === 'string' &&
          Number.isSafeInteger(owner.pid)
        )
          finish(owner);
        else finish(undefined, true);
      } catch {
        finish(undefined, true);
      }
    }
    socket.on('data', read);
    socket.once('error', () => finish());
    socket.once('end', () => finish(undefined, true));
  });
}
