/** Build-time app validation for Node and Bun; never import this from an app. */
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

export type AppDiagnostic = {
  code: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
};

export type AppValidationOptions = {
  /** TypeScript/TSX entry files. Imported files are checked too. */
  entrypoints: readonly string[];
  /** Project directory containing the app's installed dependencies. */
  cwd?: string;
  /** Optional project settings for paths, imports, and environment types. */
  tsconfig?: string;
};

export type AppValidationResult = {
  success: boolean;
  diagnostics: AppDiagnostic[];
};

/** Typecheck without running app code. The caller must stop bundling on failure. */
export async function validateApp({
  entrypoints,
  cwd = process.cwd(),
  tsconfig,
}: AppValidationOptions): Promise<AppValidationResult> {
  if (!entrypoints.length)
    throw new Error('App validation needs an entrypoint.');
  const directory = resolve(cwd);
  const require = createRequire(join(directory, 'package.json'));
  const compiler = join(
    dirname(require.resolve('typescript/package.json')),
    'bin/tsc'
  );
  const temporary = await mkdtemp(join(directory, '.data-app-validate-'));
  try {
    const project = join(temporary, 'tsconfig.json');
    await writeFile(
      project,
      JSON.stringify({
        ...(tsconfig ? { extends: resolve(directory, tsconfig) } : {}),
        compilerOptions: {
          target: 'ESNext',
          module: 'Preserve',
          moduleResolution: 'bundler',
          jsx: 'react-jsx',
          lib: ['ESNext', 'DOM', 'DOM.Iterable'],
          ...(tsconfig ? {} : { types: [] }),
          strict: true,
          alwaysStrict: true,
          noImplicitAny: true,
          noImplicitThis: true,
          strictBindCallApply: true,
          strictBuiltinIteratorReturn: true,
          strictFunctionTypes: true,
          strictNullChecks: true,
          strictPropertyInitialization: true,
          useUnknownInCatchVariables: true,
          noCheck: false,
          noEmit: true,
          emitDeclarationOnly: false,
          incremental: false,
          composite: false,
          skipLibCheck: true,
        },
        files: entrypoints.map(entry => resolve(directory, entry)),
        include: [],
        exclude: [],
      })
    );
    const output = await new Promise<{ success: boolean; text: string }>(
      (accept, reject) => {
        execFile(
          process.execPath,
          [compiler, '--project', project, '--pretty', 'false'],
          {
            cwd: directory,
            timeout: 60_000,
            maxBuffer: 8 * 1024 * 1024,
          },
          (error, stdout, stderr) => {
            if (error && (typeof error.code !== 'number' || error.signal)) {
              reject(error);
              return;
            }
            accept({ success: !error, text: `${stdout}${stderr}` });
          }
        );
      }
    );
    const diagnostics: AppDiagnostic[] = [];
    for (const line of output.text.split(/\r?\n/)) {
      const match = /^(?:(.+)\((\d+),(\d+)\): )?error TS(\d+): (.*)$/.exec(
        line
      );
      if (match) {
        diagnostics.push({
          code: `TS${match[4]}`,
          message: match[5]!,
          ...(match[1]
            ? {
                file: resolve(directory, match[1]),
                line: Number(match[2]),
                column: Number(match[3]),
              }
            : {}),
        });
      } else if (line.trim() && diagnostics.length) {
        diagnostics[diagnostics.length - 1]!.message += `\n${line}`;
      }
    }
    if (!output.success && !diagnostics.length)
      throw new Error(
        `App compiler failed without diagnostics: ${output.text}`
      );
    return { success: output.success, diagnostics };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
