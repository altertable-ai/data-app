import { localLakehouse } from '../index.ts';
import { serveAppFile, type AppFilePreview } from './serve.ts';

/** Run a CLI preview using ALTERTABLE_APP_FILE, PORT, and localLakehouse() credentials.
 * Launch from the installed runtime project. stop() also removes signal handlers.
 * Importing this module does not start a server or change the process lifecycle. */
export async function runAppFilePreview(): Promise<AppFilePreview> {
  const file = process.env.ALTERTABLE_APP_FILE;
  if (!file)
    throw new Error(
      'Missing ALTERTABLE_APP_FILE. Set an absolute app source path.'
    );

  // Resolve from the caller's installed project, including with isolated installs.
  const runtimeDirectory = process.cwd();
  const preview = await serveAppFile({
    file,
    port: process.env.PORT === undefined ? undefined : Number(process.env.PORT),
    lakehouse: localLakehouse(),
    resolveDependency: specifier =>
      Bun.resolveSync(specifier, runtimeDirectory),
  });

  async function stop() {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    await preview.stop();
  }
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  console.log(`Data app running at ${preview.url} (${file})`);
  return { url: preview.url, stop };
}
