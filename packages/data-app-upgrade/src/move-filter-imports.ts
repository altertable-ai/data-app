import ts from 'typescript';

const contract = '@altertable/data-app/contract';
const renamed = new Map([
  ['searchVariable', 'searchFilter'],
  ['choiceVariable', 'choiceFilter'],
  ['multiChoiceVariable', 'multiChoiceFilter'],
]);

/** Move named imports while preserving their local names and all call sites. */
export function moveFilterImports(source: string): string {
  const file = ts.createSourceFile('app.tsx', source, ts.ScriptTarget.Latest);
  const printer = ts.createPrinter();
  for (const statement of [...file.statements].reverse()) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      ![contract, '@altertable/data-app-react'].includes(
        statement.moduleSpecifier.text
      ) ||
      statement.attributes
    )
      continue;
    const clause = statement.importClause;
    const bindings = clause?.namedBindings;
    if (!clause || !bindings || !ts.isNamedImports(bindings)) continue;

    const kept: ts.ImportSpecifier[] = [];
    const moved: ts.ImportSpecifier[] = [];
    for (const item of bindings.elements) {
      const replacement = renamed.get((item.propertyName ?? item.name).text);
      if (!replacement) {
        kept.push(item);
        continue;
      }
      moved.push(
        ts.factory.updateImportSpecifier(
          item,
          item.isTypeOnly,
          ts.factory.createIdentifier(replacement),
          item.name
        )
      );
    }
    if (moved.length === 0) continue;

    const sameModule = statement.moduleSpecifier.text === contract;
    const singleQuote =
      source[statement.moduleSpecifier.getStart(file)] === "'";
    const declarations: ts.ImportDeclaration[] = [];
    if (sameModule || kept.length || clause.name)
      declarations.push(
        ts.factory.updateImportDeclaration(
          statement,
          statement.modifiers,
          ts.factory.updateImportClause(
            clause,
            clause.phaseModifier,
            clause.name,
            sameModule || kept.length
              ? ts.factory.updateNamedImports(
                  bindings,
                  sameModule ? [...kept, ...moved] : kept
                )
              : undefined
          ),
          ts.factory.createStringLiteral(
            statement.moduleSpecifier.text,
            singleQuote
          ),
          undefined
        )
      );
    if (!sameModule)
      declarations.push(
        ts.factory.createImportDeclaration(
          undefined,
          ts.factory.createImportClause(
            clause.phaseModifier,
            undefined,
            ts.factory.createNamedImports(moved)
          ),
          ts.factory.createStringLiteral(contract, singleQuote)
        )
      );

    const text = declarations
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
    source =
      source.slice(0, statement.getStart(file)) +
      text +
      source.slice(statement.end);
  }
  return source;
}
