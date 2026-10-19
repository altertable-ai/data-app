import type { RuleTester } from 'oxlint/plugins-dev';

type Rule = Parameters<RuleTester['run']>[1];

function isAssertion(name: string) {
  return name === 'invariant' || /^assert[A-Z]/.test(name);
}

/** Authoring contracts belong in types; only untrusted input is checked at runtime. */
const noRuntimeAssertion: Rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow runtime assertions where a compile-time contract can hold.',
    },
    messages: {
      assertion:
        'Encode this contract in types instead of asserting it at runtime.',
      throw:
        'Encode this contract in types instead of throwing. Checks on untrusted input or the runtime environment may opt out with a disable comment that names the boundary.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && isAssertion(node.callee.name))
          context.report({ node, messageId: 'assertion' });
      },
      ThrowStatement(node) {
        if (node.argument.type === 'NewExpression')
          context.report({ node, messageId: 'throw' });
      },
    };
  },
};

export default {
  meta: { name: 'data-app' },
  rules: { 'no-runtime-assertion': noRuntimeAssertion },
};
