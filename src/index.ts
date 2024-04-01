import net from 'node:net';
import fs from 'node:fs/promises';

const mocks = new Map();

const shmockDir = '.shmocks';
const socketPath = `${shmockDir}/shmock.sock`;

let server: ReturnType<typeof net.createServer>|null = null;

export class Console {
  #client;

  constructor(client: net.Socket) {
    this.#client = client;
  }

  log(...args: any[]) {
    this.#client.write(`${JSON.stringify({
      stream: 'stdout',
      args,
    })}\n`);
  }

  error(...args: any[]) {
    this.#client.write(`${JSON.stringify({
      stream: 'stderr',
      args,
    })}\n`)
  }
}

export async function setup() {
  if (server) {
    return;
  }
  const path = process.env.PATH;
  const paths = path ? path.split(':') : [];
  paths.unshift(shmockDir);
  // Doesn't work, see https://github.com/oven-sh/bun/issues/9747
  // $.env({ PATH: paths.join(':')});
  try {
    await fs.access(shmockDir);
    await fs.rm(shmockDir, { recursive: true, force: true });
  } catch (e) {
    // ignore
  }
  await fs.mkdir(shmockDir);

  try {
    await fs.access(socketPath);
    await fs.rm(socketPath);
  } catch(e) {
    // ignore
  }

  server = net.createServer((client) => {
    client.setEncoding('utf8');
    client.on('data', (data: string) => {
      const invocation: Invocation = JSON.parse(data);
      if (mocks.has(invocation.command)) {
        const mock = mocks.get(invocation.command);
        const result = mock(new Console(client), ...invocation.args);
        client.end(JSON.stringify({exit: result}));
      } else {
        console.error(`received invalid invocation ${invocation.command}`);
        client.end(JSON.stringify({stream: 'stderr', args: ['A teus iz fargekumen'], exit: 1}));
      }
    });
  }).listen(socketPath);

}

export async function cleanup() {
  const path = process.env.PATH;
  const paths = path ? path.split(':') : [];
  process.env.PATH = paths.filter((path) => shmockDir === path).join(':');
  await fs.rm(shmockDir, { recursive: true, force: true });
  mocks.clear();
  if (server) {
    server.close();
    server = null;
  }
}

type Invocation = {
  command: string,
  args: any[],
}

export async function mount<F extends (...args: any[]) => any>(name: string, mock: F): Promise<F> {
  if (!mocks.size) {
    await setup();
  }
  mocks.set(name, mock);
  try {
    await fs.access(`${shmockDir}/${name}`);
  } catch(e) {
    const client = await import.meta.resolve('./shmock-client.ts');
    await fs.link(client, `${shmockDir}/${name}`);
  }
  return mock;
}

export async function unmount(name: string) {
  await fs.unlink(`${shmockDir}/${name}`);
  mocks.delete(name);
  if (!mocks.size) {
    await cleanup();
  }
}

export async function unmountAll() {
  for await (const mock of mocks.keys()) {
    await unmount(mock);
  }
}
