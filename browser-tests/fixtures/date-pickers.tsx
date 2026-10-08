import { applyAppearance, type Theme } from '@altertable/data-app/appearance';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  DatePicker,
  DateRangePicker,
  injectDataAppStyles,
  type OpenDateRange,
} from '@altertable/data-app/react';
function App() {
  const [date, setDate] = useState<string | null>('2026-10-01');
  const [period, setPeriod] = useState<OpenDateRange | null>({
    start: '2026-09-01',
    end: null,
  });
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
      <h1>Date pickers</h1>
      <div style={{ display: 'grid', justifyItems: 'start', gap: 16 }}>
        <DatePicker label="Date" value={date} onChange={setDate} />
        <DateRangePicker
          allowOpenRange
          label="Period"
          timeZone="UTC"
          value={period}
          onChange={setPeriod}
          onClear={() => setPeriod(null)}
        />
      </div>
      <pre
        data-testid="values"
        style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
      >
        {JSON.stringify({ Date: date, Period: period }, null, 2)}
      </pre>
    </main>
  );
}
injectDataAppStyles();
createRoot(document.getElementById('root')!).render(<App />);
