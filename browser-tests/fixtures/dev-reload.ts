// Framed apps are bundled by the server, outside this page's hot-reloaded graph.
if (import.meta.hot)
  new EventSource('/__dev/reload').onmessage = () => location.reload();
