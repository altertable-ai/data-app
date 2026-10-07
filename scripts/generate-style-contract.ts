import {
  dataAppStyleTokens,
  dataAppStyleClasses,
  dataAppStyleHooks,
} from '@/src/react/style-contract';

async function format(path: string, source: string) {
  const child = Bun.spawn(
    ['./node_modules/.bin/oxfmt', `--stdin-filepath=${path}`],
    {
      stdin: new Blob([source]),
      stdout: 'pipe',
      stderr: 'pipe',
    }
  );
  const [formatted, errors, status] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (status) throw new Error(`Could not format ${path}: ${errors}`);
  return formatted;
}

export async function generateStyleContract(check = false) {
  const entries = Object.entries(dataAppStyleTokens);
  const css =
    '/* Generated from style-contract.ts. Run bun run generate:styles. */\n:root {\n' +
    entries.map(([name, token]) => `  ${name}: ${token.default};`).join('\n') +
    '\n}\n';
  let docs =
    '# Styling reference\n\nGenerated from the package styling contract. Use components and typed props first;\nthese tokens and root selectors are supported customization hooks.\n\nSee [Styling](styling.md) for composition and ownership, and the\n[machine-readable contract](style-contract.json) for tooling.\n\n## Public tokens\n\n';
  const groups = [...new Set(entries.map(([, token]) => token.group))];
  for (const group of groups) {
    docs += `### ${group}\n\n| Token | Purpose | Default |\n| --- | --- | --- |\n`;
    docs +=
      entries
        .filter(([, token]) => token.group === group)
        .map(
          ([name, token]) =>
            `| \`${name}\` | ${token.description} | \`${token.default}\` |`
        )
        .join('\n') + '\n\n';
  }
  docs +=
    '## Stable classes\n\nComponent roots may be selected in CSS; render their components rather than\ncopying root classes onto native markup. Add app-owned classes through `className`\nfor local customization. Descendant classes are internal.\n\n| Class | Owner | Use |\n| --- | --- | --- |\n';
  docs += Object.entries(dataAppStyleClasses)
    .map(
      ([name, hook]) =>
        `| \`${name}\` | ${hook.component ? `\`<${hook.component}>\`` : 'Native markup'} | ${hook.kind === 'utility' ? 'Visually hidden accessible text' : 'Root CSS customization'} |`
    )
    .join('\n');
  docs +=
    "\n\n## Native control hooks\n\nPackage components set these automatically. Use them for custom native controls\nonly when a package component does not fit. Native semantics and accessibility\nremain the control author's responsibility.\n\n| Attribute | Values |\n| --- | --- |\n";
  docs +=
    Object.entries(dataAppStyleHooks)
      .map(
        ([name, values]) =>
          `| \`${name}\` | ${values.map(value => `\`${value}\``).join(', ')} |`
      )
      .join('\n') + '\n';
  for (const [path, source] of [
    ['src/react/tokens.css', css],
    ['docs/style-reference.md', docs],
    [
      'docs/style-contract.json',
      JSON.stringify(
        {
          tokens: dataAppStyleTokens,
          classes: dataAppStyleClasses,
          hooks: dataAppStyleHooks,
        },
        null,
        2
      ) + '\n',
    ],
  ]) {
    const generated = await format(path!, source!);
    if (check) {
      if ((await Bun.file(path!).text()) !== generated)
        throw new Error(`${path} is stale. Run bun run generate:styles.`);
    } else await Bun.write(path!, generated);
  }
}
if (import.meta.main)
  await generateStyleContract(process.argv.includes('--check'));
