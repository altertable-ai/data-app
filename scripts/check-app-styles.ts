import { Glob } from 'bun';
import { validateAuthoredStyles } from '@/src/react/style-validation';

await import('@/scripts/check-style-integrity');

const requested = process.argv.slice(2);
const paths = requested.length
  ? requested
  : ['examples/**/*.{tsx,css,html}', 'dev/*.{tsx,css,html}'];
let failed = false;
for (const pattern of paths) {
  let matched = false;
  for await (const path of new Glob(pattern).scan('.')) {
    matched = true;
    const diagnostics = validateAuthoredStyles(
      await Bun.file(path).text(),
      path.endsWith('.css') ? 'css' : 'markup'
    );
    for (const diagnostic of diagnostics) {
      console.error(`${path}: ${diagnostic}`);
      failed = true;
    }
  }
  if (requested.length && !matched) {
    console.error(`No files match ${pattern}.`);
    failed = true;
  }
}
if (failed) process.exit(1);
