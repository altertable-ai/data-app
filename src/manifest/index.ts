/** Static tooling only; never import this entry into an app's runtime bundle. */
import ts from 'typescript';
import {
  validateDataAppManifest,
  type DataAppManifest,
} from '@/src/manifest/validation';
export { validateDataAppManifest } from '@/src/manifest/validation';
export type {
  DataAppManifest,
  DataAppManifestIssue,
  DataAppManifestValidation,
} from '@/src/manifest/validation';

/** Offsets are UTF-16 code units; lines and columns are one-based. End is exclusive. */
export type DataAppSourcePosition = {
  offset: number;
  line: number;
  column: number;
};
export type DataAppManifestDiagnostic = {
  code: 'syntax' | 'declaration' | 'literal' | 'schema';
  message: string;
  start: DataAppSourcePosition;
  end: DataAppSourcePosition;
  path?: (string | number)[];
};
export type DataAppManifestExtraction = {
  manifest: DataAppManifest | null;
  diagnostics: DataAppManifestDiagnostic[];
};

/**
 * Read one imported defineDataApp declaration from TS/TSX without executing source,
 * resolving imports, reading files, or invoking callbacks. Requires the optional
 * TypeScript 5.9 tooling peer. Any diagnostic prevents a manifest from being returned.
 */
export function extractDataAppManifest(
  source: string
): DataAppManifestExtraction {
  const fileName = 'data-app.tsx';
  const file = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  // An in-memory compiler host enables public syntax diagnostics and binding identity.
  // No import or library source is loaded, including app-authored modules.
  const program = ts.createProgram({
    rootNames: [fileName],
    options: { noResolve: true, noLib: true, jsx: ts.JsxEmit.Preserve },
    host: {
      getSourceFile: name => (name === fileName ? file : undefined),
      getDefaultLibFileName: () => '',
      writeFile: () => {},
      getCurrentDirectory: () => '',
      getCanonicalFileName: name => name,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      fileExists: name => name === fileName,
      readFile: () => undefined,
    },
  });
  const diagnostics: DataAppManifestDiagnostic[] = [];
  function position(offset: number): DataAppSourcePosition {
    const { line, character } = file.getLineAndCharacterOfPosition(offset);
    return { offset, line: line + 1, column: character + 1 };
  }
  function report(
    code: DataAppManifestDiagnostic['code'],
    message: string,
    node: ts.Node,
    path?: (string | number)[]
  ) {
    diagnostics.push({
      code,
      message,
      start: position(node.getStart(file)),
      end: position(node.getEnd()),
      ...(path ? { path } : {}),
    });
  }
  for (const diagnostic of program.getSyntacticDiagnostics(file)) {
    const start = diagnostic.start ?? 0;
    diagnostics.push({
      code: 'syntax',
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      start: position(start),
      end: position(start + (diagnostic.length ?? 0)),
    });
  }
  if (diagnostics.length) return { manifest: null, diagnostics };

  const checker = program.getTypeChecker();
  const moduleBindings = new Map<string, number>();
  function addBinding(name: ts.BindingName) {
    if (ts.isIdentifier(name))
      moduleBindings.set(name.text, (moduleBindings.get(name.text) ?? 0) + 1);
    else
      for (const element of name.elements)
        if (ts.isBindingElement(element)) addBinding(element.name);
  }
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      if (clause?.name) addBinding(clause.name);
      if (clause?.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings))
          addBinding(clause.namedBindings.name);
        else
          for (const binding of clause.namedBindings.elements)
            addBinding(binding.name);
      }
    } else if (ts.isImportEqualsDeclaration(statement))
      addBinding(statement.name);
    else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations)
        addBinding(declaration.name);
    } else if (
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isEnumDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isModuleDeclaration(statement)
    ) {
      if (statement.name && ts.isIdentifier(statement.name))
        addBinding(statement.name);
    }
  }
  const imports = new Set<ts.Symbol>();
  for (const statement of file.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== '@altertable/data-app'
    )
      continue;
    const clause = statement.importClause;
    if (
      !clause ||
      clause.isTypeOnly ||
      !clause.namedBindings ||
      !ts.isNamedImports(clause.namedBindings)
    )
      continue;
    for (const binding of clause.namedBindings.elements) {
      if (
        binding.isTypeOnly ||
        (binding.propertyName ?? binding.name).text !== 'defineDataApp'
      )
        continue;
      const symbol = checker.getSymbolAtLocation(binding.name);
      if (symbol) {
        if (
          symbol.declarations?.length !== 1 ||
          moduleBindings.get(binding.name.text) !== 1
        )
          report(
            'declaration',
            'The defineDataApp import binding is ambiguous.',
            binding
          );
        imports.add(symbol);
      }
    }
  }
  const calls: ts.CallExpression[] = [];
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      let callee: ts.Expression = node.expression;
      while (
        ts.isParenthesizedExpression(callee) ||
        ts.isAsExpression(callee) ||
        ts.isTypeAssertionExpression(callee) ||
        ts.isNonNullExpression(callee) ||
        ts.isSatisfiesExpression(callee)
      )
        callee = callee.expression;
      if (ts.isIdentifier(callee)) {
        const symbol = checker.getSymbolAtLocation(callee);
        if (symbol && imports.has(symbol)) calls.push(node);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  if (calls.length !== 1) {
    report(
      'declaration',
      'Declare exactly one module-level const initialized with the named defineDataApp import from @altertable/data-app.',
      calls[1] ?? calls[0] ?? file
    );
    return { manifest: null, diagnostics };
  }
  const call = calls[0]!;
  const declaration = call.parent;
  if (
    !ts.isIdentifier(call.expression) ||
    !!call.questionDotToken ||
    !ts.isVariableDeclaration(declaration) ||
    declaration.initializer !== call ||
    !ts.isIdentifier(declaration.name) ||
    moduleBindings.get(declaration.name.text) !== 1 ||
    !ts.isVariableDeclarationList(declaration.parent) ||
    !(declaration.parent.flags & ts.NodeFlags.Const) ||
    declaration.parent.declarations.length !== 1 ||
    !ts.isVariableStatement(declaration.parent.parent) ||
    declaration.parent.parent.parent !== file
  ) {
    report(
      'declaration',
      'defineDataApp must directly initialize a single module-level const identifier.',
      call
    );
    return { manifest: null, diagnostics };
  }
  const argument = call.arguments[0];
  if (
    call.arguments.length !== 1 ||
    !argument ||
    !ts.isObjectLiteralExpression(argument)
  ) {
    report(
      'declaration',
      'Pass one direct object literal to defineDataApp.',
      call
    );
    return { manifest: null, diagnostics };
  }

  const locations = new Map<string, ts.Node>();
  function read(node: ts.Expression, path: (string | number)[]): unknown {
    locations.set(JSON.stringify(path), node);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      return node.text;
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (node.kind === ts.SyntaxKind.NullKeyword) return null;
    if (
      ts.isNumericLiteral(node) ||
      (ts.isPrefixUnaryExpression(node) &&
        (node.operator === ts.SyntaxKind.PlusToken ||
          node.operator === ts.SyntaxKind.MinusToken) &&
        ts.isNumericLiteral(node.operand))
    ) {
      const value = ts.isNumericLiteral(node)
        ? Number(node.text)
        : Number((node.operand as ts.NumericLiteral).text) *
          (node.operator === ts.SyntaxKind.MinusToken ? -1 : 1);
      if (Number.isFinite(value)) return value;
      report('literal', 'Numbers must be finite.', node, path);
      return undefined;
    }
    if (ts.isArrayLiteralExpression(node))
      return node.elements.map((element, index) =>
        read(element, [...path, index])
      );
    if (ts.isObjectLiteralExpression(node)) {
      const entries: [string, unknown][] = [];
      const keys = new Set<string>();
      for (const property of node.properties) {
        if (
          !ts.isPropertyAssignment(property) ||
          !(
            ts.isIdentifier(property.name) ||
            ts.isStringLiteral(property.name) ||
            ts.isNumericLiteral(property.name)
          )
        ) {
          report(
            'literal',
            'Use explicit literal properties without spreads, computed keys, shorthand, methods, or accessors.',
            property,
            path
          );
          continue;
        }
        const key = property.name.text;
        const propertyPath = [...path, key];
        if (keys.has(key))
          report(
            'literal',
            `Duplicate property ${key}.`,
            property.name,
            propertyPath
          );
        keys.add(key);
        entries.push([key, read(property.initializer, propertyPath)]);
      }
      // __proto__ and other special names are ordinary data keys, never assignments.
      return Object.fromEntries(entries);
    }
    report(
      'literal',
      'Use only literal objects, arrays, strings, finite signed numbers, booleans, and null.',
      node,
      path
    );
    return undefined;
  }
  const value = read(argument, []);
  if (!diagnostics.length) {
    const validation = validateDataAppManifest(value);
    for (const issue of validation.issues) {
      let path = issue.path;
      while (!locations.has(JSON.stringify(path)) && path.length)
        path = path.slice(0, -1);
      report(
        'schema',
        issue.message,
        locations.get(JSON.stringify(path)) ?? argument,
        issue.path
      );
    }
    if (!diagnostics.length)
      return { manifest: validation.manifest, diagnostics };
  }
  return { manifest: null, diagnostics };
}
