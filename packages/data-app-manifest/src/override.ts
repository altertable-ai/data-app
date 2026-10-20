import ts from 'typescript';
import {
  findManifestDeclarationNode,
  isLiteralPropertyAssignment,
  nodeToManifest,
  unwrapExpression,
  type DataAppLiteralValue,
  type DataAppManifest,
  type DataAppManifestDiagnostic,
} from './declaration.ts';

/** The rewritten source, or the extraction diagnostics that prevent rewriting it. */
export type DataAppManifestOverride =
  | { source: string; diagnostics: [] }
  | { source: null; diagnostics: DataAppManifestDiagnostic[] };

type Path = (string | number)[];

type Member = {
  key: string;
  property: ts.PropertyAssignment;
  /** Whitespace and comments before the property. */
  leading: string;
  /** Whitespace and comments between the property and its comma. */
  beforeComma: string;
  comma: boolean;
  /** Comments that follow the property or its comma on the same line. */
  trailing: string;
  lineComment: boolean;
};

const printer = ts.createPrinter();
// ECMAScript IdentifierName: such keys need no quotes.
const identifierName = /^[\p{ID_Start}$_][\p{ID_Continue}$\u200C\u200D]*$/u;

/**
 * Rewrite the literal argument of the defineDataApp declaration that
 * extractDataAppManifest() reads, so that it extracts as `manifest`. Accepts the
 * same sources and otherwise returns their extraction diagnostics, without
 * executing source. Unchanged values keep their authored text and comments,
 * changed values are replaced in place, removed properties are deleted with their
 * comments, and new properties are appended in `manifest` order.
 * Throws a TypeError for values that literals cannot express, such as non-finite
 * numbers or `__proto__` keys.
 */
export function overrideDataAppManifest(
  source: string,
  manifest: DataAppManifest
): DataAppManifestOverride {
  if (!isObject(manifest))
    throw new TypeError('The manifest must be a plain object.');
  const declaration = findManifestDeclarationNode(source);
  if (!declaration.node)
    return { source: null, diagnostics: declaration.diagnostics };
  const { node, root } = declaration;
  const current = nodeToManifest(node, root);
  if (!current.manifest)
    return { source: null, diagnostics: current.diagnostics };
  return {
    source:
      root.text.slice(0, node.getStart(root)) +
      applyManifestChanges(node, root, current.manifest, manifest) +
      root.text.slice(node.getEnd()),
    diagnostics: [],
  };
}

function applyManifestChanges(
  declaration: ts.ObjectLiteralExpression,
  root: ts.SourceFile,
  current: DataAppManifest,
  next: DataAppManifest
): string {
  const text = root.text;
  const authoredString = firstStringLiteral(declaration);
  const singleQuote = authoredString
    ? text[authoredString.getStart(root)] === "'"
    : true;

  function rewrite(
    node: ts.Expression,
    before: DataAppLiteralValue,
    after: unknown,
    path: Path
  ): string {
    if (sameLiteral(before, after))
      return text.slice(node.getStart(root), node.getEnd());
    const value = unwrapExpression(node);
    if (value !== node)
      return (
        text.slice(node.getStart(root), value.getStart(root)) +
        rewrite(value, before, after, path) +
        text.slice(value.getEnd(), node.getEnd())
      );
    if (
      ts.isObjectLiteralExpression(node) &&
      isObject(before) &&
      isObject(after)
    )
      return rewriteObject(node, before, after, path);
    return print(after, path, node);
  }

  function rewriteObject(
    node: ts.ObjectLiteralExpression,
    before: DataAppManifest,
    after: DataAppManifest,
    path: Path
  ): string {
    const keys = Object.keys(after);
    if (!keys.length) return '{}';
    if (!node.properties.length) return print(after, path);

    const members: Member[] = [];
    const list = node
      .getChildren(root)
      .find(child => child.kind === ts.SyntaxKind.SyntaxList);
    const children = list?.getChildren(root) ?? [];
    let start = node.getStart(root) + 1;
    for (const [index, property] of children.entries()) {
      // Skips commas: extraction accepted the object, so every property is a
      // literal-named assignment.
      if (!isLiteralPropertyAssignment(property)) continue;
      const key = property.name.text;
      const sibling = children[index + 1];
      const comma =
        sibling?.kind === ts.SyntaxKind.CommaToken ? sibling : undefined;
      const end = comma ? comma.getEnd() : property.getEnd();
      const comments = ts.getTrailingCommentRanges(text, end);
      const memberEnd = comments?.at(-1)?.end ?? end;
      members.push({
        key,
        property,
        leading: text.slice(start, property.getStart(root)),
        beforeComma: comma
          ? text.slice(property.getEnd(), comma.getStart(root))
          : '',
        comma: !!comma,
        trailing: text.slice(end, memberEnd),
        lineComment:
          comments?.at(-1)?.kind === ts.SyntaxKind.SingleLineCommentTrivia,
      });
      start = memberEnd;
    }
    const closing = text.slice(start, node.getEnd());

    // New properties follow the indentation and trailing comma of the last one.
    const last = members.at(-1)!;
    const lineEnding = /\r\n|\n/.exec(node.getText(root))?.[0] ?? '\n';
    const newline = last.leading.lastIndexOf('\n');
    const separator =
      newline < 0
        ? ' '
        : lineEnding + /^[ \t]*/.exec(last.leading.slice(newline + 1))![0];
    const parts = [
      ...members
        .filter(member => Object.hasOwn(after, member.key))
        .map(
          ({ key, property, leading, beforeComma, trailing, lineComment }) => ({
            body:
              leading +
              text.slice(
                property.getStart(root),
                property.initializer.getStart(root)
              ) +
              rewrite(property.initializer, before[key]!, after[key], [
                ...path,
                key,
              ]) +
              text.slice(property.initializer.getEnd(), property.getEnd()),
            beforeComma,
            trailing,
            resume: lineComment ? indentAt(property.getStart(root)) : undefined,
          })
        ),
      ...keys
        .filter(key => !Object.hasOwn(before, key))
        .map(key => ({
          body: `${separator}${printKey(key, path)}: ${print(after[key], [...path, key])}`,
          beforeComma: '',
          trailing: '',
          resume: undefined,
        })),
    ];

    // Text that would continue a line comment moves to a new line.
    let object = '{';
    let resume: string | undefined;
    function append(chunk: string) {
      object +=
        resume === undefined || /^[ \t]*[\r\n\u2028\u2029]/.test(chunk)
          ? chunk
          : chunk.replace(/^[ \t]*/, lineEnding + resume);
    }
    for (const [index, part] of parts.entries()) {
      append(part.body);
      object +=
        part.beforeComma +
        (index < parts.length - 1 || last.comma ? ',' : '') +
        part.trailing;
      resume = part.resume;
    }
    if (resume !== undefined) resume = indentAt(node.getStart(root));
    append(closing);
    return object;
  }

  function indentAt(position: number): string {
    const { line } = root.getLineAndCharacterOfPosition(position);
    return /^[ \t]*/.exec(
      text.slice(root.getPositionOfLineAndCharacter(line, 0))
    )![0];
  }

  function print(value: unknown, path: Path, replaced?: ts.Node): string {
    if (typeof value === 'string') return printString(value, replaced);
    if (typeof value === 'number' && Number.isFinite(value))
      return Object.is(value, -0) ? '-0' : String(value);
    if (typeof value === 'boolean' || value === null) return String(value);
    if (Array.isArray(value)) {
      const elements: string[] = [];
      // Indexes rather than map(), which would skip holes.
      for (let index = 0; index < value.length; index++)
        elements.push(print(value[index], [...path, index]));
      return `[${elements.join(', ')}]`;
    }
    if (isObject(value)) {
      const entries = Object.entries(value);
      if (!entries.length) return '{}';
      return `{ ${entries
        .map(
          ([key, item]) =>
            `${printKey(key, path)}: ${print(item, [...path, key])}`
        )
        .join(', ')} }`;
    }
    throw new TypeError(
      `${describe(path)}: use only strings, finite numbers, booleans, null, arrays, and plain objects.`
    );
  }

  function printString(value: string, replaced?: ts.Node): string {
    // Templates keep multiline strings such as SQL readable.
    const literal =
      value.includes('\n') ||
      (replaced && ts.isNoSubstitutionTemplateLiteral(replaced))
        ? ts.factory.createNoSubstitutionTemplateLiteral(value)
        : ts.factory.createStringLiteral(
            value,
            replaced && ts.isStringLiteral(replaced)
              ? text[replaced.getStart(root)] === "'"
              : singleQuote
          );
    return printLiteral(literal);
  }

  function printKey(key: string, path: Path): string {
    if (key === '__proto__')
      throw new TypeError(
        `${describe([...path, key])}: a literal __proto__ key sets the prototype instead.`
      );
    return identifierName.test(key)
      ? key
      : printLiteral(ts.factory.createStringLiteral(key, singleQuote));
  }

  function printLiteral(literal: ts.Expression): string {
    // Non-ASCII text stays readable instead of becoming \u escapes.
    ts.setEmitFlags(literal, ts.EmitFlags.NoAsciiEscaping);
    return printer.printNode(ts.EmitHint.Unspecified, literal, root);
  }

  return rewrite(declaration, current, next, []);
}

function sameLiteral(before: DataAppLiteralValue, after: unknown): boolean {
  if (Array.isArray(before))
    return (
      Array.isArray(after) &&
      before.length === after.length &&
      before.every(
        (value, index) => index in after && sameLiteral(value, after[index])
      )
    );
  if (isObject(before)) {
    if (!isObject(after)) return false;
    const keys = Object.keys(before);
    return (
      keys.length === Object.keys(after).length &&
      keys.every(
        key =>
          Object.hasOwn(after, key) && sameLiteral(before[key]!, after[key])
      )
    );
  }
  return Object.is(before, after);
}

function isObject(value: unknown): value is DataAppManifest {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function firstStringLiteral(node: ts.Node): ts.StringLiteral | undefined {
  return ts.isStringLiteral(node)
    ? node
    : ts.forEachChild(node, firstStringLiteral);
}

function describe(path: Path): string {
  return path.length
    ? path
        .map((segment, index) =>
          typeof segment === 'number'
            ? `[${segment}]`
            : index
              ? `.${segment}`
              : segment
        )
        .join('')
    : 'The manifest';
}
