import { injectDataAppStyles } from '@altertable/data-app-react';
import { Sheet } from '@altertable/data-app-react/ui';
import { getDataAppTransport } from '@altertable/data-app/client';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const bridge = getDataAppTransport()!;
injectDataAppStyles();
document.body.style.margin = '0';

function App() {
  const [rows, setRows] = useState(25);
  const [sizing, setSizing] = useState(true);
  const [inspecting, setInspecting] = useState(false);
  useEffect(
    () => (sizing ? bridge.supportContentSizing() : undefined),
    [sizing]
  );

  return (
    <main>
      <button onClick={() => setRows(value => value + 1)}>Load more</button>
      <button onClick={() => setSizing(value => !value)}>
        {sizing ? 'Pause sizing' : 'Resume sizing'}
      </button>
      <button onClick={() => setInspecting(true)}>Inspect report</button>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} style={{ height: 80 }}>
            Row {index + 1}
          </li>
        ))}
      </ul>
      <Sheet
        open={inspecting}
        onOpenChange={setInspecting}
        title="Report details"
      >
        Report information
      </Sheet>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
