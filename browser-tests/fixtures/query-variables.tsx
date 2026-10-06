import { applyAppearance, type Theme } from '@altertable/data-app/appearance';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  type QueryVariableDefinitions,
  type VariableValue,
} from '@altertable/data-app/contract';
import {
  injectDataAppStyles,
  VariableValueSelector,
} from '@altertable/data-app/react';
const definitions = [
  { name: 'Text', nullable: false, type: 'STRING', default: 'hello' },
  { name: 'Count', nullable: false, type: 'INTEGER', default: 2 },
  { name: 'Fraction', nullable: false, type: 'FLOAT', default: 1.5 },
  { name: 'Enabled', type: 'BOOLEAN', default: false, nullable: true },
  { name: 'Interval', nullable: false, type: 'INTERVAL', default: 'DAILY' },
  {
    name: 'Duration',
    type: 'DURATION',
    default: { amount: 1, unit: 'WEEK' },
    nullable: true,
  },
  {
    name: 'Date',
    nullable: false,
    type: 'DATETIME',
    default: new Date('2026-10-01T10:00:00Z'),
  },
  {
    name: 'Period',
    nullable: false,
    type: 'DATETIMERANGE',
    default: { from: new Date('2026-09-01T00:00:00Z'), to: null },
  },
] as const satisfies QueryVariableDefinitions;
function App() {
  const [values, setValues] = useState<Record<string, VariableValue | null>>(
    Object.fromEntries(
      definitions.map(definition => [definition.name, definition.default])
    )
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
        {definitions
          .map(definition => [definition.name, definition] as const)
          .map(([label, definition]) => (
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
