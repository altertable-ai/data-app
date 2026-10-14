import { Glob } from 'bun';
import { validateAppDeclaration } from '@/scripts/validate-app-declaration';

const patterns = process.argv.slice(2);
const diagnostics: string[] = [];
for (const pattern of patterns.length
  ? patterns
  : [
      'dev/app.ts',
      'dev/support.ts',
      'examples/starter-data-app/index.tsx',
      'examples/starter-local-data-app/app.ts',
    ]) {
  let matched = false;
  for await (const path of new Glob(pattern).scan('.')) {
    matched = true;
    diagnostics.push(
      ...validateAppDeclaration(await Bun.file(path).text(), path)
    );
  }
  if (!matched) diagnostics.push(`No files match ${pattern}.`);
}
for (const diagnostic of diagnostics) console.error(diagnostic);
if (diagnostics.length) process.exit(1);
