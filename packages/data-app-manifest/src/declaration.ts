import ts from 'typescript';
/** Values decoded from the static declaration, without configuration schema validation. */
export type DataAppLiteralValue =
  | string
  | number
  | boolean
  | null
  | DataAppLiteralValue[]
  | DataAppManifest;

/** Authored properties are preserved; this does not assert a valid DataAppConfig. */
export type DataAppManifest = { [key: string]: DataAppLiteralValue };

/** Offsets are UTF-16 code units; lines and columns are one-based. End is exclusive. */
export type DataAppSourcePosition = {
  offset: number;
  line: number;
  column: number;
};
export type DataAppManifestDiagnostic = {
  code: 'syntax' | 'declaration' | 'literal';
  message: string;
  start: DataAppSourcePosition;
  end: DataAppSourcePosition;
  path?: (string | number)[];
};
export type DataAppManifestExtraction =
  | { manifest: DataAppManifest; diagnostics: [] }
  | { manifest: null; diagnostics: DataAppManifestDiagnostic[] };

export type ManifestDeclaration =
  | { node: ts.ObjectLiteralExpression; root: ts.SourceFile; diagnostics: [] }
  | { node: null; diagnostics: DataAppManifestDiagnostic[] };

/**
 * Locate the object literal passed to the one imported defineDataApp call, without
 * executing source, resolving imports, or reading files. Source uses TSX grammar.
 */
export function findManifestDeclarationNode(
  source: string
): ManifestDeclaration {
  const sourceName = 'source.tsx';
  const file = ts.createSourceFile(
    sourceName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  // An in-memory compiler host enables public syntax diagnostics and binding identity.
  // No import or library source is loaded, including app-authored modules.
  const program = ts.createProgram({
    rootNames: [sourceName],
    options: { noResolve: true, noLib: true, jsx: ts.JsxEmit.Preserve },
    host: {
      getSourceFile: name => (name === sourceName ? file : undefined),
      getDefaultLibFileName: () => '',
      writeFile: () => {},
      getCurrentDirectory: () => '',
      getCanonicalFileName: name => name,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      fileExists: name => name === sourceName,
      readFile: () => undefined,
    },
  });
  const diagnostics: DataAppManifestDiagnostic[] = [];
  function report(
    code: DataAppManifestDiagnostic['code'],
    message: string,
    node: ts.Node
  ) {
    diagnostics.push(diagnosticAt(file, code, message, node));
  }
  for (const diagnostic of program.getSyntacticDiagnostics(file)) {
    const start = diagnostic.start ?? 0;
    diagnostics.push({
      code: 'syntax',
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      start: position(file, start),
      end: position(file, start + (diagnostic.length ?? 0)),
    });
  }
  if (diagnostics.length) return { node: null, diagnostics };

  const checker = program.getTypeChecker();
  // The checker owns reference resolution, including merged namespaces and
  // enum/parameter shadows. Invalid duplicate lexical declarations can be omitted
  // from its symbols, so count direct module value declarations separately.
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
      if (clause?.isTypeOnly) continue;
      if (clause?.name) addBinding(clause.name);
      if (clause?.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings))
          addBinding(clause.namedBindings.name);
        else
          for (const binding of clause.namedBindings.elements)
            if (!binding.isTypeOnly) addBinding(binding.name);
      }
    } else if (ts.isImportEqualsDeclaration(statement) && !statement.isTypeOnly)
      addBinding(statement.name);
    else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations)
        addBinding(declaration.name);
    } else if (
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isEnumDeclaration(statement)
    ) {
      if (statement.name && ts.isIdentifier(statement.name))
        addBinding(statement.name);
    } else if (
      ts.isModuleDeclaration(statement) &&
      ts.isIdentifier(statement.name)
    ) {
      const symbol = checker.getSymbolAtLocation(statement.name);
      if (symbol && symbol.flags & ts.SymbolFlags.Value)
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
        if (moduleBindings.get(binding.name.text) !== 1)
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
      'Declare exactly one module-level call to the named defineDataApp import from @altertable/data-app.',
      calls[1] ?? calls[0] ?? file
    );
    return { node: null, diagnostics };
  }
  const call = calls[0]!;
  let expression: ts.Expression = call;
  while (isExpressionWrapper(expression.parent)) expression = expression.parent;
  const parent = expression.parent;
  const variable =
    ts.isVariableDeclaration(parent) &&
    parent.initializer === expression &&
    ts.isIdentifier(parent.name) &&
    moduleBindings.get(parent.name.text) === 1 &&
    ts.isVariableDeclarationList(parent.parent) &&
    !(parent.parent.flags & ts.NodeFlags.Using) &&
    ts.isVariableStatement(parent.parent.parent) &&
    parent.parent.parent.parent === file;
  const standalone = ts.isExpressionStatement(parent) && parent.parent === file;
  const defaultExport =
    ts.isExportAssignment(parent) &&
    !parent.isExportEquals &&
    parent.parent === file;
  if (
    !ts.isIdentifier(call.expression) ||
    !!call.questionDotToken ||
    !(variable || standalone || defaultExport)
  ) {
    report(
      'declaration',
      'Use defineDataApp in a direct module-level variable declaration, default export, or standalone call.',
      call
    );
    return { node: null, diagnostics };
  }
  const argument = call.arguments[0] && unwrapExpression(call.arguments[0]);
  if (
    call.arguments.length !== 1 ||
    !argument ||
    !ts.isObjectLiteralExpression(argument)
  ) {
    report(
      'declaration',
      'Pass one object literal to defineDataApp; parentheses, as, and satisfies wrappers are allowed.',
      call
    );
    return { node: null, diagnostics };
  }
  if (diagnostics.length) return { node: null, diagnostics };
  return { node: argument, root: file, diagnostics: [] };
}

/**
 * Decode the declaration's literal data. References, calls, interpolations, and
 * other non-literal values are diagnostics; no source is executed.
 */
export function nodeToManifest(
  node: ts.ObjectLiteralExpression,
  root: ts.SourceFile
): DataAppManifestExtraction {
  const diagnostics: DataAppManifestDiagnostic[] = [];
  function report(
    code: DataAppManifestDiagnostic['code'],
    message: string,
    at: ts.Node,
    path: (string | number)[]
  ) {
    diagnostics.push(diagnosticAt(root, code, message, at, path));
  }

  function read(
    node: ts.Expression,
    path: (string | number)[]
  ): DataAppLiteralValue {
    node = unwrapExpression(node);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      return node.text;
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (node.kind === ts.SyntaxKind.NullKeyword) return null;
    const signed =
      ts.isPrefixUnaryExpression(node) &&
      (node.operator === ts.SyntaxKind.PlusToken ||
        node.operator === ts.SyntaxKind.MinusToken)
        ? node
        : undefined;
    const operand = signed ? unwrapExpression(signed.operand) : node;
    if (ts.isNumericLiteral(operand)) {
      const value =
        Number(operand.text) *
        (signed?.operator === ts.SyntaxKind.MinusToken ? -1 : 1);
      if (Number.isFinite(value)) return value;
      report('literal', 'Numbers must be finite.', node, path);
      return null;
    }
    if (ts.isArrayLiteralExpression(node))
      return node.elements.map((element, index) =>
        read(element, [...path, index])
      );
    if (ts.isObjectLiteralExpression(node)) return readObject(node, path);
    report(
      'literal',
      'Use only literal objects, arrays, strings, finite signed numbers, booleans, and null.',
      node,
      path
    );
    return null;
  }
  function readObject(
    node: ts.ObjectLiteralExpression,
    path: (string | number)[]
  ): DataAppManifest {
    const entries: [string, DataAppLiteralValue][] = [];
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
      if (key === '__proto__') {
        report(
          'literal',
          'Prototype setters are not manifest data properties.',
          property.name,
          [...path, key]
        );
        continue;
      }
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
    return Object.fromEntries(entries);
  }
  const manifest = readObject(node, []);
  if (diagnostics.length) return { manifest: null, diagnostics };
  return { manifest, diagnostics: [] };
}

function position(file: ts.SourceFile, offset: number): DataAppSourcePosition {
  const { line, character } = file.getLineAndCharacterOfPosition(offset);
  return { offset, line: line + 1, column: character + 1 };
}

function diagnosticAt(
  file: ts.SourceFile,
  code: DataAppManifestDiagnostic['code'],
  message: string,
  node: ts.Node,
  path?: (string | number)[]
): DataAppManifestDiagnostic {
  return {
    code,
    message,
    start: position(file, node.getStart(file)),
    end: position(file, node.getEnd()),
    ...(path ? { path } : {}),
  };
}

function isExpressionWrapper(
  node: ts.Node
): node is
  | ts.ParenthesizedExpression
  | ts.AsExpression
  | ts.SatisfiesExpression {
  return (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node)
  );
}

export function unwrapExpression(node: ts.Expression): ts.Expression {
  while (isExpressionWrapper(node)) node = node.expression;
  return node;
}
