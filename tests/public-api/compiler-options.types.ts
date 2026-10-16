// @ts-expect-error Missing side-effect imports must resolve.
import '@/tests/public-api/missing-side-effect-module';

// @ts-expect-error Every path in a value-returning function must return explicitly.
function incompleteReturn(enabled: boolean) {
  if (enabled) return 1;
}
void incompleteReturn;

class Parent {
  value() {
    return 1;
  }
}
class Child extends Parent {
  // @ts-expect-error Overridden members must declare intent.
  value() {
    return 2;
  }
}
void Child;

function unreachable() {
  return;
  // @ts-expect-error Unreachable statements are diagnosed.
  console.log('unreachable'); // eslint-disable-line no-unreachable
}
void unreachable;

function fallthrough(value: number) {
  switch (value) {
    // @ts-expect-error Switch branches cannot accidentally fall through.
    case 0:
      console.log('zero');
    case 1:
      return 1;
    default:
      return 2;
  }
}
void fallthrough;
