import { useEffect, useState } from 'react';
import './App.css';

type SpaceSummary = {
  id: number;
  name: string;
  description?: string | null;
};

function App() {
  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSpaces = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/spaces');
        if (!res.ok) {
          throw new Error('SPACES_FETCH_FAILED');
        }
        const data = (await res.json()) as { spaces: SpaceSummary[] };
        setSpaces(data.spaces);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load spaces.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadSpaces();
  }, []);

  return (
    <main style={{ padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Studio</h1>
      <p>
        Welcome to Studio. This is a placeholder dashboard; spaces will appear
        here once the domain model is implemented.
      </p>
      <section style={{ marginTop: '1rem' }}>
        <h2>Spaces</h2>
        {loading && <p>Loading spaces…</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {!loading && !error && spaces.length === 0 && (
          <p>No spaces yet.</p>
        )}
        {!loading && !error && spaces.length > 0 && (
          <ul>
            {spaces.map((space) => (
              <li key={space.id}>
                <strong>{space.name}</strong>
                {space.description && <span> — {space.description}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default App;
