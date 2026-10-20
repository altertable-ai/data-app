import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { TokenFlags, type Node } from 'typescript/unstable/ast';
import {
  createIdentifier,
  createImportTypeNode,
  createLiteralTypeNode,
  createStringLiteral,
} from 'typescript/unstable/ast/factory';
import {
  isIdentifier,
  isImportDeclaration,
  isNamedImports,
  isParameterDeclaration,
  isStringLiteral,
  isTypeQueryNode,
  isTypeParameterDeclaration,
} from 'typescript/unstable/ast/is';
import { visitEachChild } from 'typescript/unstable/ast/visitor';
import {
  API,
  NodeBuilderFlags,
  SignatureKind,
  SymbolFlags,
  TypeFlags,
  type Checker,
  type Project,
  type Signature,
  type Symbol,
  type Type,
} from 'typescript/unstable/async';

import { packages } from '@/scripts/packages';

// Generates REFERENCE.md from public source entry points: one line per app-authoring
// export and one per prop or option, resolved by the TypeScript checker.
// Runs in `bun run build` after declarations; `--check` compares the staged
// file without writing.

const root = process.cwd();
const output = join(root, 'REFERENCE.md');
const check = process.argv.includes('--check');
const maxDocLength = 200;
const maxTypeLength = 300;
const minCollapsedRun = 8;
const typeFlags =
  NodeBuilderFlags.UseSingleQuotesForStringLiteralType |
  NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope;
const absent = TypeFlags.Never | TypeFlags.Undefined;

const excludedEntries = [
  '@altertable/data-app/internal',
  '@altertable/data-app-bun/reload',
  '@altertable/data-app-manifest',
  '@altertable/data-app-embed',
];
const packageEntryPoints = packages.flatMap(({ directory, manifest }) =>
  Object.entries(manifest.exports).map(([subpath, target]) => ({
    specifier:
      subpath === '.' ? manifest.name : manifest.name + subpath.slice(1),
    file: resolve(
      directory,
      'src',
      target.import.slice('./dist/'.length).replace(/\.js$/, '.ts')
    ),
  }))
);
const entryPoints = packageEntryPoints.filter(
  ({ specifier }) =>
    !excludedEntries.some(
      entry => specifier === entry || specifier.startsWith(`${entry}/`)
    )
);

type Export = { name: string; symbol: Symbol; specifiers: string[] };
type Entry = Export & { kind: string; lines: string[] };
type Property = {
  name: string;
  optional: boolean;
  type: string;
  doc: string;
  variants?: string;
};

const failures: string[] = [];

function summarize(documentation: string) {
  const text = documentation.replace(/\s+/g, ' ').trim();
  if (text.length <= maxDocLength) return text;
  const sentences = text.match(/.*?[.!?](?=\s|$)|.+$/g) ?? [text];
  let summary = '';
  for (const sentence of sentences) {
    if (summary && summary.length + sentence.length > maxDocLength) break;
    summary += sentence;
  }
  return clip(summary.trim(), maxDocLength);
}

function clip(text: string, length: number) {
  return text.length > length
    ? `${text.slice(0, length - 1).trimEnd()}…`
    : text;
}

function fromDependency(symbol: Symbol) {
  return (
    symbol.declarations.length > 0 &&
    symbol.declarations.every(declaration =>
      declaration.path.includes('/node_modules/')
    )
  );
}

function dependencyName(path: string) {
  const name = path.match(/.*\/node_modules\/((?:@[^/]+\/)?[^/]+)/)?.[1];
  if (name === '@types/react') return 'React';
  if (name?.startsWith('@typescript/')) return 'built-in';
  return name ?? 'dependency';
}

/** Unique-symbol keys and private fields are internal and print unstable ids. */
function isSymbolKeyed(symbol: Symbol) {
  return /^__[@#]/.test(symbol.name);
}

class Reference {
  private readonly owners = new Map<number, string>();

  private readonly imports = new Map<
    string,
    Map<string, { module: string; exported: string }>
  >();

  private readonly checker: Checker;

  constructor(private readonly project: Project) {
    this.checker = project.checker;
  }

  private async doc(symbol: Symbol) {
    const [documentation, tags] = await Promise.all([
      this.checker.getDocumentationCommentOfSymbol(symbol),
      this.checker.getJsDocTagsOfSymbol(symbol),
    ]);
    const notes = [summarize(documentation)];
    for (const { name, text = '' } of tags) {
      if (name === 'deprecated')
        notes.unshift(`Deprecated${text ? `: ${summarize(text)}` : '.'}`);
      if (name === 'default' || name === 'defaultValue')
        notes.push(`Default: ${summarize(text)}.`);
    }
    return notes.filter(Boolean).join(' ');
  }

  private async text(type: Type, flags = 0) {
    const text = await this.checker.typeToString(
      type,
      undefined,
      typeFlags | flags
    );
    return clip(text.replace(/\s+/g, ' ').trim(), maxTypeLength);
  }

  private async typeOf(symbol: Symbol, context: string) {
    const type = await this.checker.getTypeOfSymbol(symbol);
    if (!type || type.isErrorType()) {
      failures.push(`${context} has no resolvable type.`);
      return undefined;
    }
    return type;
  }

  /** Object shapes whose properties are worth listing one per line. */
  private async shapes(type: Type): Promise<Type[] | undefined> {
    const defined = (await this.checker.getNonNullableType(type)) ?? type;
    if (defined.isUnionType()) {
      const members = await defined.getTypes();
      const shapes: Type[] = [];
      for (const member of members) {
        const shape = await this.shapes(member);
        if (!shape) return undefined;
        shapes.push(...shape);
      }
      return shapes.length ? shapes : undefined;
    }
    if (!(defined.flags & (TypeFlags.Object | TypeFlags.Intersection)))
      return undefined;
    if (
      (await this.checker.isArrayType(defined)) ||
      (await this.checker.isTupleType(defined))
    )
      return undefined;
    const [calls, constructs, properties] = await Promise.all([
      this.checker.getSignaturesOfType(defined, SignatureKind.Call),
      this.checker.getSignaturesOfType(defined, SignatureKind.Construct),
      this.checker.getPropertiesOfType(defined),
    ]);
    if (calls.length || constructs.length || !properties.length)
      return undefined;
    return [defined];
  }

  private async properties(shape: Type, context: string) {
    const properties: Property[] = [];
    const inherited = new Set<string>();
    for (const property of await this.checker.getPropertiesOfType(shape)) {
      if (fromDependency(property)) {
        inherited.add(dependencyName(property.declarations[0]!.path));
        continue;
      }
      if (isSymbolKeyed(property)) continue;
      const type = await this.typeOf(property, `${context}.${property.name}`);
      if (!type || type.flags & absent) continue;
      const optional = Boolean(property.flags & SymbolFlags.Optional);
      let text = await this.text(type);
      if (optional) text = text.replace(/ \| undefined$/, '');
      properties.push({
        name: property.name,
        optional,
        type: text,
        doc: await this.doc(property),
      });
    }
    return { properties, inherited };
  }

  /** Merges union variants: shared props once, the rest tagged by variant. */
  private async propertyLines(prefix: string, shapes: Type[]) {
    const variants = await Promise.all(
      shapes.map(shape => this.properties(shape, prefix))
    );
    const merged = new Map<string, Property & { in: number[] }>();
    for (const [index, { properties }] of variants.entries()) {
      for (const property of properties) {
        const key = `${property.name}\0${property.type}`;
        const existing = merged.get(key);
        if (existing) {
          existing.optional ||= property.optional;
          existing.in.push(index + 1);
        } else merged.set(key, { ...property, in: [index + 1] });
      }
    }
    const total = variants.length;
    const lines = collapse(
      prefix,
      [...merged.values()].map(({ in: present, ...property }) =>
        present.length === total
          ? property
          : {
              ...property,
              variants: `${present.length > 1 ? 'variants' : 'variant'} ${present.join(', ')} of ${total}`,
            }
      )
    );
    const inherited = new Set(
      variants.flatMap(variant => [...variant.inherited])
    );
    if (inherited.size)
      lines.push(
        `${prefix}.…: plus props inherited from ${[...inherited]
          .sort((left, right) => left.localeCompare(right, 'en'))
          .join(', ')}`
      );
    return lines;
  }

  private async kind(name: string, signatures: readonly Signature[]) {
    if (/^use[A-Z]/.test(name)) return 'hook';
    if (!/^[A-Z]/.test(name)) return 'function';
    for (const signature of signatures) {
      const returned = await this.checker.getReturnTypeOfSignature(signature);
      const text = returned ? await this.text(returned) : '';
      if (!/^(?:Element|ReactNode|JSX\.Element)\b/.test(text))
        return 'function';
    }
    return 'component';
  }

  private parameterName(parameter: Symbol, kind: string) {
    if (!parameter.name.startsWith('__')) return parameter.name;
    return kind === 'component' ? 'props' : 'options';
  }

  private async externalImports(path: string) {
    const cached = this.imports.get(path);
    if (cached) return cached;
    const imports = new Map<string, { module: string; exported: string }>();
    const source = await this.project.program.getSourceFile(path);
    for (const statement of source?.statements ?? []) {
      if (
        !isImportDeclaration(statement) ||
        !isStringLiteral(statement.moduleSpecifier) ||
        statement.moduleSpecifier.text.startsWith('.')
      )
        continue;
      const bindings = statement.importClause?.namedBindings;
      if (!bindings || !isNamedImports(bindings)) continue;
      for (const binding of bindings.elements)
        imports.set(binding.name.text, {
          module: statement.moduleSpecifier.text,
          exported: binding.propertyName?.text ?? binding.name.text,
        });
    }
    this.imports.set(path, imports);
    return imports;
  }

  /** Keep declared types, qualifying imported values whose local aliases are opaque. */
  private async declared(symbol: Symbol | undefined) {
    const declaration = symbol?.declarations[0];
    const node = await declaration?.resolve(this.project);
    if (!node || !declaration) return undefined;
    const type = isTypeParameterDeclaration(node)
      ? node
      : isParameterDeclaration(node)
        ? node.type
        : undefined;
    if (!type) return undefined;
    const imports = await this.externalImports(declaration.path);
    function qualify(node: Node): Node {
      if (isTypeQueryNode(node) && isIdentifier(node.exprName)) {
        const imported = imports.get(node.exprName.text);
        if (imported)
          return createImportTypeNode(
            true,
            createLiteralTypeNode(
              createStringLiteral(imported.module, TokenFlags.SingleQuote)
            ),
            undefined,
            createIdentifier(imported.exported),
            node.typeArguments
          );
      }
      return visitEachChild(node, qualify);
    }
    return (await this.project.emitter.printNode(qualify(type))).replace(
      /\s+/g,
      ' '
    );
  }

  private async signature(signature: Signature, kind: string) {
    const typeParameters = await Promise.all(
      (await signature.getTypeParameters()).map(
        async parameter =>
          (await this.declared(await parameter.getSymbol())) ??
          (await this.text(parameter))
      )
    );
    const parameters = await signature.getParameters();
    const list = await Promise.all(
      parameters.map(async (parameter, index) => {
        const type = await this.checker.getTypeOfSymbol(parameter);
        const rest =
          signature.hasRestParameter && index === parameters.length - 1
            ? '...'
            : '';
        const optional = parameter.flags & SymbolFlags.Optional ? '?' : '';
        let text =
          (await this.declared(parameter)) ??
          (type ? await this.text(type) : 'unknown');
        if (text.startsWith('{') && type && (await this.shapes(type)))
          text = '{…}';
        return `${rest}${this.parameterName(parameter, kind)}${optional}: ${clip(text, maxTypeLength)}`;
      })
    );
    const generic = typeParameters.length
      ? `<${typeParameters.join(', ')}>`
      : '';
    const returned = await this.checker.getReturnTypeOfSignature(signature);
    const result =
      kind === 'component' || !returned ? '' : `: ${await this.text(returned)}`;
    return clip(`${generic}(${list.join(', ')})${result}`, maxTypeLength);
  }

  private async callable(name: string, type: Type) {
    const signatures = await this.checker.getSignaturesOfType(
      type,
      SignatureKind.Call
    );
    const kind = await this.kind(name, signatures);
    const heads: string[] = [];
    const members: string[] = [];
    for (const signature of signatures) {
      heads.push(await this.signature(signature, kind));
      for (const parameter of await signature.getParameters()) {
        const parameterType = await this.checker.getTypeOfSymbol(parameter);
        const shapes = parameterType && (await this.shapes(parameterType));
        if (!parameterType || !shapes) continue;
        const prefix =
          kind === 'component' && signatures.length === 1
            ? name
            : `${name}.${this.parameterName(parameter, kind)}`;
        const owner =
          (await parameterType.getAliasSymbol()) ??
          (await parameterType.getSymbol());
        if (owner && !this.owners.has(owner.id))
          this.owners.set(owner.id, prefix);
        members.push(...(await this.propertyLines(prefix, shapes)));
      }
    }
    for (const property of await this.checker.getPropertiesOfType(type)) {
      if (fromDependency(property) || isSymbolKeyed(property)) continue;
      const member = await this.typeOf(property, `${name}.${property.name}`);
      if (!member) continue;
      const calls = await this.checker.getSignaturesOfType(
        member,
        SignatureKind.Call
      );
      const memberKind = await this.kind(property.name, calls);
      const text = calls.length
        ? (
            await Promise.all(
              calls.map(call => this.signature(call, memberKind))
            )
          ).join('; ')
        : await this.text(member);
      members.push(`${name}.${property.name}: ${text}`);
    }
    return {
      kind,
      head: heads.join('; '),
      members: [...new Set(members)],
    };
  }

  async value(exported: Export): Promise<Entry> {
    const { name, symbol } = exported;
    const doc = await this.doc(symbol);
    const type = await this.typeOf(symbol, name);
    if (!type) return { ...exported, kind: 'unresolved', lines: [] };
    const calls = await this.checker.getSignaturesOfType(
      type,
      SignatureKind.Call
    );
    if (calls.length) {
      const { kind, head, members } = await this.callable(name, type);
      return { ...exported, kind, lines: [joinDoc(head, doc), ...members] };
    }
    const shapes = await this.shapes(type);
    if (shapes) {
      const named = await type.getAliasSymbol();
      return {
        ...exported,
        kind: 'const',
        lines: [
          joinDoc(named ? await this.text(type) : '', doc),
          ...(await this.propertyLines(name, shapes)),
        ],
      };
    }
    return {
      ...exported,
      kind: 'const',
      lines: [joinDoc(await this.text(type), doc)],
    };
  }

  async type(exported: Export): Promise<Entry> {
    const { name, symbol } = exported;
    const doc = await this.doc(symbol);
    const type = await this.checker.getDeclaredTypeOfSymbol(symbol);
    if (type.isErrorType()) {
      failures.push(`${name} has no resolvable type.`);
      return { ...exported, kind: 'unresolved', lines: [] };
    }
    const kind =
      symbol.flags & SymbolFlags.Class
        ? 'class'
        : symbol.flags & SymbolFlags.Enum
          ? 'enum'
          : 'type';
    const parameters = (await type.getAliasTypeArguments()).length
      ? await type.getAliasTypeArguments()
      : type.isClassOrInterface()
        ? await type.getTypeParameters()
        : [];
    const generic = parameters.length
      ? `<${(await Promise.all(parameters.map(parameter => this.text(parameter)))).join(', ')}>`
      : '';
    const owner = this.owners.get(symbol.id);
    const shapes = await this.shapes(type);
    if (owner && shapes)
      return {
        ...exported,
        kind,
        lines: [joinDoc(`${generic} = props listed as ${owner}.*`, doc)],
      };
    if (shapes)
      return {
        ...exported,
        kind,
        lines: [
          joinDoc(generic, doc),
          ...(await this.propertyLines(name, shapes)),
        ],
      };
    return {
      ...exported,
      kind,
      lines: [
        joinDoc(
          `${generic} = ${await this.text(type, NodeBuilderFlags.InTypeAlias)}`,
          doc
        ),
      ],
    };
  }
}

function joinDoc(text: string, doc: string) {
  return [text.trim(), doc].filter(Boolean).join(' — ');
}

/** Long runs of undocumented props with one type, such as style tokens, share a line. */
function collapse(prefix: string, properties: Property[]) {
  const lines: string[] = [];
  function line({ name, optional, type, doc, variants }: Property) {
    return `${prefix}.${name}${optional ? '?' : ''}: ${type}${variants ? ` [${variants}]` : ''}${doc ? ` — ${doc}` : ''}`;
  }
  for (let start = 0; start < properties.length;) {
    const first = properties[start]!;
    let end = start + 1;
    function plain(property: Property) {
      return (
        !property.doc &&
        !property.variants &&
        property.type === first.type &&
        property.optional === first.optional
      );
    }
    while (end < properties.length && plain(first) && plain(properties[end]!))
      end++;
    if (end - start >= minCollapsedRun) {
      const names = properties.slice(start, end).map(({ name }) => name);
      lines.push(
        `${prefix}.{${names.join(', ')}}${first.optional ? '?' : ''}: ${first.type}`
      );
    } else
      for (const property of properties.slice(start, end))
        lines.push(line(property));
    start = end;
  }
  return lines;
}

async function collect({ checker, program }: Project) {
  const exports = new Map<string, Export>();
  for (const { specifier, file } of entryPoints) {
    const source = await program.getSourceFile(file);
    const module = source && (await checker.getSymbolAtLocation(source));
    if (!module) {
      failures.push(`${specifier}: cannot load ${file}.`);
      continue;
    }
    for (const exported of await checker.getExportsOfModule(module)) {
      const symbol =
        exported.flags & SymbolFlags.Alias
          ? await checker.getAliasedSymbol(exported)
          : exported;
      if (
        (await checker.isUnknownSymbol(symbol)) ||
        !symbol.declarations.length
      ) {
        failures.push(
          `${specifier}: export ${exported.name} does not resolve.`
        );
        continue;
      }
      if (
        symbol.declarations.every(declaration =>
          declaration.path.includes('/src/embed/')
        )
      )
        continue;
      const key = `${exported.name}\0${symbol.id}`;
      const existing = exports.get(key);
      if (existing) existing.specifiers.push(specifier);
      else
        exports.set(key, {
          name: exported.name,
          symbol,
          specifiers: [specifier],
        });
    }
  }
  return [...exports.values()];
}

async function generate() {
  const directory = await mkdtemp(join(tmpdir(), 'data-app-reference-'));
  const config = join(directory, 'tsconfig.json');
  await writeFile(
    config,
    JSON.stringify({
      compilerOptions: {
        target: 'ESNext',
        module: 'Preserve',
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        paths: Object.fromEntries(
          packageEntryPoints.map(({ specifier, file }) => [specifier, [file]])
        ),
        jsx: 'react-jsx',
        strict: true,
        noEmit: true,
        typeRoots: [join(root, 'node_modules/@types')],
        types: ['bun'],
      },
      files: entryPoints.map(entry => entry.file),
    })
  );
  const api = new API({ cwd: root });
  try {
    const snapshot = await api.updateSnapshot({ openProjects: [config] });
    const project = snapshot.getProjects()[0];
    if (!project)
      throw new Error('TypeScript did not load the source entry points.');
    const exports = await collect(project);
    const reference = new Reference(project);
    const entries: Entry[] = [];
    // Values first so props types can point at the component that lists them.
    for (const exported of exports)
      if (exported.symbol.flags & (SymbolFlags.Function | SymbolFlags.Variable))
        entries.push(await reference.value(exported));
    for (const exported of exports)
      if (
        exported.symbol.flags &
        (SymbolFlags.Class |
          SymbolFlags.Enum |
          SymbolFlags.Interface |
          SymbolFlags.TypeAlias)
      )
        entries.push(await reference.type(exported));
      else if (
        !(exported.symbol.flags & (SymbolFlags.Function | SymbolFlags.Variable))
      )
        failures.push(
          `${exported.name}: unsupported symbol flags ${exported.symbol.flags}.`
        );
    return entries.sort(
      (left, right) =>
        left.name.toLowerCase().localeCompare(right.name.toLowerCase(), 'en') ||
        left.name.localeCompare(right.name, 'en') ||
        left.kind.localeCompare(right.kind, 'en') ||
        left.specifiers[0]!.localeCompare(right.specifiers[0]!, 'en')
    );
  } finally {
    await api.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function render(entries: Entry[]) {
  const body = entries.flatMap(({ name, kind, specifiers, lines }) => {
    const [first = '', ...rest] = lines;
    const head = `${name} (${kind}, ${specifiers.join(', ')})`;
    return [first ? `${head}: ${first}` : head, ...rest];
  });
  const header = `# @altertable/data-app API reference

Generated from public source entry points by \`bun run build\`; do not
edit. Embedding APIs are excluded. Each of the ${entries.length} app-authoring
exports has one heading line, then one line per prop, option, or field, so one
search returns everything about a name:

- \`rg '^LineChart\\b' REFERENCE.md\` prints \`LineChart\` and its props.
- \`rg '^LineChart' REFERENCE.md\` adds \`LineChartItem\` and \`LineChartProps\`.
- \`rg '@altertable/data-app-react/ui[,)]' REFERENCE.md\` lists one entry point.

Line shapes:

- \`Name (kind, import specifiers): signature or type — JSDoc summary\`. A name
  exported by two entry points as different values, such as \`DataApp\`, has
  one heading per entry point.
- \`Name.prop: Type\` is required; \`Name.prop?: Type\` is optional. Component
  props follow the component name. Other functions add the parameter name.
- \`[variant 2 of 3]\` marks a prop that only some branches of a union accept.
- \`= props listed as Name.*\` points from a props type to its component.

Hosted apps must pass the required \`defineDataApp.config.scope\`,
\`DataApp.story\`, and \`DataApp.datasets\` from \`@altertable/data-app-react\`.
`;
  for (const [, example] of header.matchAll(/`([A-Za-z]+(?:\.[a-z]+)+)`/g))
    if (!body.some(line => line.startsWith(`${example}:`)))
      failures.push(`Header example ${example} is not a required prop.`);
  return `${header}
\`\`\`text
${body.join('\n')}
\`\`\`
`;
}

const reference = render(await generate());
for (const alias of new Set(reference.match(/\b[A-Za-z_$][\w$]*\$\d+\b/g)))
  failures.push(
    `Bundler alias ${alias} has no standalone meaning in the reference.`
  );
if (failures.length)
  throw new Error(
    `REFERENCE.md generation failed:\n${failures.map(failure => `- ${failure}`).join('\n')}`
  );

if (check) {
  // The build rewrites the working copy, so compare with the staged file.
  const staged = Bun.spawnSync(['git', 'show', ':REFERENCE.md'], { cwd: root });
  if (staged.exitCode !== 0 || staged.stdout.toString() !== reference)
    throw new Error(
      'REFERENCE.md is stale. Run `bun run build` and commit REFERENCE.md.'
    );
} else {
  await writeFile(output, reference);
  await writeFile(join(root, 'packages/data-app/REFERENCE.md'), reference);
}
