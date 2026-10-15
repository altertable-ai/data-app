import {
  type DeclaredView,
  type ViewResult,
  useDeclaredResult,
} from '@/src/react/view-runtime';

type Alpha = { kind: 'alpha'; count: number };
type Beta = { kind: 'beta'; label: string };
type AlphaInput = { version: number };
type BetaInput = { search: string };

// Compile-only calls: result inference follows each supplied declaration.
function verifyViewResults(
  alpha: DeclaredView<Alpha, AlphaInput, { operation: 'alpha' }>,
  beta: DeclaredView<Beta, BetaInput, { operation: 'beta' }>,
  chooseAlpha: boolean,
  mismatched: ViewResult<Alpha, BetaInput>
) {
  const single = useDeclaredResult(alpha);
  const singleResult: ViewResult<Alpha, AlphaInput> = single;
  // @ts-expect-error Single-view results retain their exact data fields.
  void single.snapshot?.data.label;

  const result = useDeclaredResult(chooseAlpha ? alpha : beta);
  const branches: ViewResult<Alpha, AlphaInput> | ViewResult<Beta, BetaInput> =
    result;
  // @ts-expect-error Conditional results keep each data type paired with its own input.
  const incompatible: typeof result = mismatched;
  // @ts-expect-error An inferred conditional result never exposes arbitrary fields.
  void result.snapshot?.data.invented;
  return { singleResult, branches, incompatible };
}

void verifyViewResults;
