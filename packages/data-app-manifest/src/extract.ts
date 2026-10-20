import {
  findManifestDeclarationNode,
  nodeToManifest,
  type DataAppManifestExtraction,
} from './declaration.ts';

/**
 * Read one imported defineDataApp declaration from TS/TSX without executing source,
 * resolving imports, reading files, or invoking callbacks. Any diagnostic prevents
 * a manifest from being returned. This tooling package loads its TypeScript compiler.
 * Source uses TSX grammar, matching hosted app compilation.
 * Hosts own source limits, execution deadlines, diagnostic caps, and app typechecking.
 */
export function extractDataAppManifest(
  source: string
): DataAppManifestExtraction {
  const declaration = findManifestDeclarationNode(source);
  if (!declaration.node)
    return { manifest: null, diagnostics: declaration.diagnostics };
  return nodeToManifest(declaration.node, declaration.root);
}
