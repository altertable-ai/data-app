import ts from 'typescript';

const contractModule = '@altertable/data-app/contract';
const reactModule = '@altertable/data-app-react';
const filterExports = new Map([
  ['searchVariable', 'searchFilter'],
  ['choiceVariable', 'choiceFilter'],
  ['multiChoiceVariable', 'multiChoiceFilter'],
]);

function renameFilterImport(specifier: ts.ImportSpecifier): ts.ImportSpecifier {
  const exportedName = (specifier.propertyName ?? specifier.name).text;
  const replacement = filterExports.get(exportedName);
  return replacement
    ? ts.factory.updateImportSpecifier(
        specifier,
        specifier.isTypeOnly,
        ts.factory.createIdentifier(replacement),
        specifier.name
      )
    : specifier;
}

function rewriteImport(
  declaration: ts.ImportDeclaration,
  file: ts.SourceFile
): ts.ImportDeclaration[] {
  const { moduleSpecifier, importClause } = declaration;
  const bindings = importClause?.namedBindings;
  if (
    !ts.isStringLiteral(moduleSpecifier) ||
    declaration.attributes ||
    !importClause ||
    !bindings ||
    !ts.isNamedImports(bindings)
  )
    return [];

  const moduleName = moduleSpecifier.text;
  if (moduleName !== contractModule && moduleName !== reactModule) return [];

  const specifiers = bindings.elements.map(renameFilterImport);
  const renamedFilters = specifiers.filter(
    (specifier, index) => specifier !== bindings.elements[index]
  );
  if (renamedFilters.length === 0) return [];

  const singleQuote = file.text[moduleSpecifier.getStart(file)] === "'";
  const remaining =
    moduleName === contractModule
      ? specifiers
      : bindings.elements.filter(
          (specifier, index) => specifier === specifiers[index]
        );
  const replacements: ts.ImportDeclaration[] = [];
  if (remaining.length || importClause.name) {
    const clause = ts.factory.updateImportClause(
      importClause,
      importClause.phaseModifier,
      importClause.name,
      remaining.length
        ? ts.factory.updateNamedImports(bindings, remaining)
        : undefined
    );
    replacements.push(
      ts.factory.updateImportDeclaration(
        declaration,
        declaration.modifiers,
        clause,
        ts.factory.createStringLiteral(moduleName, singleQuote),
        undefined
      )
    );
  }
  if (moduleName === reactModule)
    replacements.push(
      ts.factory.createImportDeclaration(
        undefined,
        ts.factory.createImportClause(
          importClause.phaseModifier,
          undefined,
          ts.factory.createNamedImports(renamedFilters)
        ),
        ts.factory.createStringLiteral(contractModule, singleQuote)
      )
    );
  return replacements;
}

/** Move named imports while preserving their local names and call sites. */
export function moveFilterImports(source: string): string {
  const file = ts.createSourceFile('app.tsx', source, ts.ScriptTarget.Latest);
  const printer = ts.createPrinter();
  const chunks: string[] = [];
  let cursor = 0;
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const replacements = rewriteImport(statement, file);
    if (!replacements.length) continue;

    const replacement = replacements
      .map(declaration =>
        printer.printNode(
          ts.EmitHint.Unspecified,
          ts.setEmitFlags(
            declaration,
            ts.EmitFlags.NoLeadingComments | ts.EmitFlags.NoTrailingComments
          ),
          file
        )
      )
      .join('\n');
    chunks.push(source.slice(cursor, statement.getStart(file)), replacement);
    cursor = statement.end;
  }
  chunks.push(source.slice(cursor));
  return chunks.join('');
}
