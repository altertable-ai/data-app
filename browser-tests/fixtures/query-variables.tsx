import { applyAppearance, type Theme } from '@altertable/data-app/appearance';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  defineQueryVariables,
  parseQueryVariables,
  type VariableValue,
} from '@altertable/data-app/contract';
import {
  injectDataAppStyles,
  VariableValueSelector,
} from '@altertable/data-app/react';
const definitions = defineQueryVariables({
  Text: { type: 'STRING', default: 'hello' },
  Count: { type: 'INTEGER', default: 2 },
  Fraction: { type: 'FLOAT', default: 1.5 },
  Enabled: { type: 'BOOLEAN', default: false, nullable: true },
  Interval: { type: 'INTERVAL', default: 'DAILY' },
  Duration: {
    type: 'DURATION',
    default: { amount: 1, unit: 'WEEK' },
    nullable: true,
  },
  Date: { type: 'DATETIME', default: new Date('2026-10-01T10:00:00Z') },
  Period: {
    type: 'DATETIMERANGE',
    default: { from: new Date('2026-09-01T00:00:00Z'), to: null },
  },
});
function App() {
  const [values, setValues] = useState<Record<string, VariableValue | null>>(
    parseQueryVariables(definitions, {})
  );
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => applyAppearance({ theme }), [theme]);
  return (
    <main
      className="altertable-data-app"
      data-theme={theme}
      style={{
        padding: 20,
        minHeight: '100vh',
        boxSizing: 'border-box',
        color: 'var(--at-text)',
        background: 'var(--at-background)',
        fontFamily: 'var(--at-font)',
      }}
    >
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Toggle theme
      </button>
      <h1>Query variables</h1>
      <p>
        Try each variable selector. The values below update with their SQL
        variable types.
      </p>
      <div style={{ display: 'grid', justifyItems: 'start', gap: 16 }}>
        {Object.entries(definitions).map(([label, definition]) => (
          <VariableValueSelector
            key={label}
            label={label}
            definition={definition}
            value={values[label]!}
            onChange={value =>
              setValues(previous => ({ ...previous, [label]: value }))
            }
          />
        ))}
      </div>
      <pre
        data-testid="values"
        style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
      >
        {JSON.stringify(values, null, 2)}
      </pre>
    </main>
  );
}
injectDataAppStyles();
createRoot(document.getElementById('root')!).render(<App />);
