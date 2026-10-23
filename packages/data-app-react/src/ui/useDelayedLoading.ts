import { useEffect, useState } from 'react';

/** Keep short requests quiet; restart the delay for every request. */
export function useDelayedLoading(loading: boolean, delay = 2000) {
  const [state, setState] = useState({ loading, elapsed: false });
  if (state.loading !== loading) setState({ loading, elapsed: false });

  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(
      () => setState({ loading: true, elapsed: true }),
      delay
    );
    return () => window.clearTimeout(timer);
  }, [loading, delay]);

  return loading && state.loading && state.elapsed;
}
