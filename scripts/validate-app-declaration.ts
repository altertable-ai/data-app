import { parseSync, Visitor, type Node } from 'oxc-parser';

/** Check extraction syntax without importing or evaluating app code. Shape is checked by TypeScript. */
export function validateAppDeclaration(
  source: string,
  filename: string
): string[] {
  const parsed = parseSync(filename, source);
  if (parsed.errors.length)
    return parsed.errors.map(error => `${filename}: ${error.message}`);
  const program = parsed.program;
  const imports = new Set<string>();
  const initializers = new Set<number>();
  for (const statement of program.body) {
    if (
      statement.type === 'ImportDeclaration' &&
      statement.source.value === '@altertable/data-app' &&
      statement.importKind !== 'type'
    ) {
      for (const specifier of statement.specifiers) {
        if (
          specifier.type === 'ImportSpecifier' &&
          specifier.importKind !== 'type' &&
          (specifier.imported.type === 'Identifier'
            ? specifier.imported.name
            : specifier.imported.value) === 'defineDataApp'
        )
          imports.add(specifier.local.name);
      }
    }
    const declaration =
      statement.type === 'ExportNamedDeclaration'
        ? statement.declaration
        : statement;
    if (
      declaration?.type === 'VariableDeclaration' &&
      declaration.kind === 'const'
    ) {
      for (const variable of declaration.declarations) {
        if (
          variable.id.type === 'Identifier' &&
          variable.init?.type === 'CallExpression' &&
          !variable.init.optional
        )
          initializers.add(variable.init.start);
      }
    }
  }
  if (!imports.size)
    return [
      `${filename}: Expected a named defineDataApp import from @altertable/data-app.`,
    ];
  const diagnostics: string[] = [];
  function report(node: Node, message: string) {
    const lines = source.slice(0, node.start).split('\n');
    diagnostics.push(
      `${filename}:${lines.length}:${lines.at(-1)!.length + 1}: ${message}`
    );
  }
  function literal(node: Node): void {
    switch (node.type) {
      case 'ObjectExpression':
        for (const property of node.properties) {
          if (
            property.type !== 'Property' ||
            property.computed ||
            property.method ||
            property.shorthand ||
            property.kind !== 'init'
          )
            report(
              property,
              'App declarations require literal properties; no spreads, computed keys, methods, or shorthand references.'
            );
          else literal(property.value);
        }
        return;
      case 'ArrayExpression':
        for (const item of node.elements) {
          if (item) literal(item);
          else report(node, 'App declaration arrays cannot contain holes.');
        }
        return;
      case 'Literal':
        if (
          node.value === null ||
          typeof node.value === 'string' ||
          typeof node.value === 'boolean' ||
          (typeof node.value === 'number' && Number.isFinite(node.value))
        )
          return;
        break;
      case 'TemplateLiteral':
        if (!node.expressions.length) return;
        break;
      case 'UnaryExpression':
        if (
          (node.operator === '-' || node.operator === '+') &&
          node.argument.type === 'Literal' &&
          typeof node.argument.value === 'number' &&
          Number.isFinite(node.argument.value)
        )
          return;
        break;
    }
    report(
      node,
      'App declarations require literal data. Move expressions outside defineDataApp(); pass dynamic SQL values through declared parameters.'
    );
  }
  let calls = 0;
  new Visitor({
    CallExpression(node) {
      if (node.callee.type !== 'Identifier' || !imports.has(node.callee.name))
        return;
      calls++;
      if (!initializers.has(node.start))
        report(node, 'defineDataApp() must initialize a module-level const.');
      if (
        node.arguments.length !== 1 ||
        node.arguments[0]?.type !== 'ObjectExpression'
      )
        report(node, 'defineDataApp() requires one direct object literal.');
      else literal(node.arguments[0]);
    },
  }).visit(program);
  if (calls !== 1)
    diagnostics.push(
      `${filename}: Declare exactly one module-level defineDataApp() call; found ${calls}.`
    );
  return diagnostics;
}
