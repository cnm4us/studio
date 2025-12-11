import type { FormEvent } from 'react';
import type { SpaceSummary } from '../App';

type DashboardViewProps = {
  spaces: SpaceSummary[];
  spacesLoading: boolean;
  spacesError: string | null;
  newSpaceName: string;
  newSpaceDescription: string;
  setNewSpaceName: (value: string) => void;
  setNewSpaceDescription: (value: string) => void;
  createSpaceLoading: boolean;
  createSpaceError: string | null;
  selectedSpaceId: number | null;
  onSubmitCreateSpace: (event: FormEvent) => void;
  onOpenSpace: (spaceId: number) => void;
};

export function DashboardView(props: DashboardViewProps) {
  const {
    spaces,
    spacesLoading,
    spacesError,
    newSpaceName,
    newSpaceDescription,
    setNewSpaceName,
    setNewSpaceDescription,
    createSpaceLoading,
    createSpaceError,
    selectedSpaceId,
    onSubmitCreateSpace,
    onOpenSpace,
  } = props;

  return (
    <>
      <form
        onSubmit={onSubmitCreateSpace}
        style={{
          marginBottom: '1rem',
          display: 'grid',
          gap: '0.5rem',
        }}
      >
        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem' }}>
            Name
          </label>
          <input
            type="text"
            required
            value={newSpaceName}
            onChange={(e) => setNewSpaceName(e.target.value)}
            style={{ width: '100%', padding: '0.4rem' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem' }}>
            Description (optional)
          </label>
          <textarea
            value={newSpaceDescription}
            onChange={(e) => setNewSpaceDescription(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: '0.4rem' }}
          />
        </div>
        {createSpaceError && (
          <p style={{ color: 'red', margin: 0 }}>{createSpaceError}</p>
        )}
        <div>
          <button type="submit" disabled={createSpaceLoading}>
            {createSpaceLoading ? 'Creating…' : 'Create space'}
          </button>
        </div>
      </form>

      {spacesLoading && <p>Loading spaces…</p>}
      {spacesError && (
        <p style={{ color: 'red', marginTop: 0 }}>{spacesError}</p>
      )}

      {!spacesLoading && !spacesError && spaces.length === 0 && (
        <p>No spaces yet. Create your first one above.</p>
      )}

      {!spacesLoading && !spacesError && spaces.length > 0 && (
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {spaces.map((space) => {
            const isSelected = selectedSpaceId === space.id;
            return (
              <li
                key={space.id}
                style={{
                  padding: '0.5rem 0',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#f5f5f5' : 'transparent',
                }}
                onClick={() => onOpenSpace(space.id)}
              >
                <div style={{ fontWeight: 600 }}>{space.name}</div>
                {space.description && (
                  <div style={{ fontSize: '0.9rem', color: '#555' }}>
                    {space.description}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
