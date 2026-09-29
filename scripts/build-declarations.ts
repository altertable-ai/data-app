import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

const declarations = resolve('dist/types');

// Repository aliases are an authoring convention. Published declarations must
// resolve independently of the consumer's tsconfig and source tree.
for await (const name of new Bun.Glob('**/*.d.ts').scan(declarations)) {
  const path = resolve(declarations, name);
  const source = await readFile(path, 'utf8');
  const rewritten = source
    // CSS is bundled as the explicit public stylesheet. Component side-effect
    // imports carry no declaration information and refer to unpublished assets.
    .replace(/^import\s+['"][^'"]+\.css['"];\s*$/gm, '')
    .replace(
      /\b(from\s*|import\s*|import\(\s*)(['"])((?:@\/src\/|\.)[^'"]+)\2/g,
      (_match, prefix: string, quote: string, target: string) => {
        let resolved = target.startsWith('@/src/')
          ? resolve(declarations, target.slice('@/src/'.length))
          : resolve(dirname(path), target);
        resolved = resolved.replace(/\.(?:js|ts|tsx)$/, '');
        if (!existsSync(`${resolved}.d.ts`))
          resolved = resolve(resolved, 'index');
        if (!existsSync(`${resolved}.d.ts`))
          throw new Error(
            `Unresolved declaration import in ${name}: ${target}`
          );

        let specifier = relative(dirname(path), resolved).split(sep).join('/');
        if (!specifier.startsWith('.')) specifier = `./${specifier}`;

        return `${prefix}${quote}${specifier}.js${quote}`;
      }
    );
  if (rewritten.includes('@/'))
    throw new Error(`Unresolved repository alias in ${name}`);

  await writeFile(path, rewritten);
}
