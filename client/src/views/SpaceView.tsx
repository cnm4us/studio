import type { FormEvent } from 'react';
import type { DefinitionSummary, ProjectSummary } from '../App';

type SpaceViewProps = {
  projects: ProjectSummary[];
  projectsLoading: boolean;
  projectsError: string | null;
  selectedProjectId: number | null;
  newProjectName: string;
  newProjectDescription: string;
  setNewProjectName: (value: string) => void;
  setNewProjectDescription: (value: string) => void;
  createProjectLoading: boolean;
  createProjectError: string | null;
  spaceCharacters: DefinitionSummary[];
  spaceScenes: DefinitionSummary[];
  spaceStyles: DefinitionSummary[];
  definitionsLoading: boolean;
  definitionsError: string | null;
  deleteDefinitionLoadingId: number | null;
  deleteDefinitionError: string | null;
  onSubmitCreateProject: (event: FormEvent) => void;
  onOpenProject: (projectId: number) => void;
  onCreateCharacter: () => void;
  onCreateScene: () => void;
  onCreateStyle: () => void;
  onDeleteDefinition: (
    kind: 'character' | 'scene',
    definitionId: number,
  ) => void;
};

export function SpaceView(props: SpaceViewProps) {
  const {
    projects,
    projectsLoading,
    projectsError,
    selectedProjectId,
    newProjectName,
    newProjectDescription,
    setNewProjectName,
    setNewProjectDescription,
    createProjectLoading,
    createProjectError,
    spaceCharacters,
    spaceScenes,
    spaceStyles,
    definitionsLoading,
    definitionsError,
    deleteDefinitionLoadingId,
    deleteDefinitionError,
    onSubmitCreateProject,
    onOpenProject,
    onCreateCharacter,
    onCreateScene,
    onCreateStyle,
    onDeleteDefinition,
  } = props;

  return (
    <div
      style={{
        marginTop: '1.5rem',
        borderTop: '1px solid #eee',
        paddingTop: '1rem',
      }}
    >
      <h3 style={{ marginTop: 0 }}>Projects in selected space</h3>

      <form
        onSubmit={onSubmitCreateProject}
        style={{
          marginBottom: '1rem',
          display: 'grid',
          gap: '0.5rem',
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '0.25rem',
            }}
          >
            Project name
          </label>
          <input
            type="text"
            required
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            style={{ width: '100%', padding: '0.4rem' }}
          />
        </div>
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '0.25rem',
            }}
          >
            Description (optional)
          </label>
          <textarea
            value={newProjectDescription}
            onChange={(e) => setNewProjectDescription(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: '0.4rem' }}
          />
        </div>
        {createProjectError && (
          <p style={{ color: 'red', margin: 0 }}>{createProjectError}</p>
        )}
        <div>
          <button type="submit" disabled={createProjectLoading}>
            {createProjectLoading ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </form>

      {projectsLoading && <p>Loading projects…</p>}
      {projectsError && (
        <p style={{ color: 'red', marginTop: 0 }}>{projectsError}</p>
      )}
      {!projectsLoading && !projectsError && projects.length === 0 && (
        <p>No projects yet in this space. Create your first one above.</p>
      )}
      {!projectsLoading && !projectsError && projects.length > 0 && (
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {projects.map((project) => (
            <li
              key={project.id}
              style={{
                padding: '0.5rem 0',
                borderBottom: '1px solid #eee',
                cursor: 'pointer',
                backgroundColor:
                  selectedProjectId === project.id ? '#f0f0f0' : 'transparent',
              }}
              onClick={() => onOpenProject(project.id)}
            >
              <div style={{ fontWeight: 600 }}>{project.name}</div>
              {project.description && (
                <div
                  style={{
                    fontSize: '0.9rem',
                    color: '#555',
                  }}
                >
                  {project.description}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div
        style={{
          marginTop: '1.5rem',
          borderTop: '1px solid #eee',
          paddingTop: '1rem',
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          Space assets (characters, scenes & styles)
        </h3>

        <div
          style={{
            marginBottom: '0.75rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <button type="button" onClick={onCreateCharacter}>
            Create character
          </button>
          <button type="button" onClick={onCreateScene}>
            Create scene
          </button>
          <button type="button" onClick={onCreateStyle}>
            Create style
          </button>
        </div>
        {definitionsError && (
          <p style={{ color: 'red', marginTop: 0 }}>{definitionsError}</p>
        )}
        {deleteDefinitionError && (
          <p style={{ color: 'red', marginTop: '0.25rem' }}>
            {deleteDefinitionError}
          </p>
        )}

        {definitionsLoading && <p>Loading assets…</p>}
        {!definitionsLoading &&
          !definitionsError &&
          spaceCharacters.length === 0 &&
          spaceScenes.length === 0 && (
            <p>
              No characters or scenes yet in this space. Create some above.
            </p>
          )}

        {!definitionsLoading &&
          (spaceCharacters.length > 0 || spaceScenes.length > 0) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <strong>Characters</strong>
                <ul
                  style={{
                    listStyle: 'none',
                    paddingLeft: 0,
                    marginTop: '0.5rem',
                  }}
                >
                  {spaceCharacters.map((c) => (
                    <li
                      key={c.id}
                      style={{
                        padding: '0.4rem 0',
                        borderBottom: '1px solid #eee',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.75rem',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          <div
                            style={{
                              fontSize: '0.8rem',
                              color: '#777',
                            }}
                          >
                            {c.isCanonical ? 'Canonical' : 'Draft'}
                            {c.isLocked ? ' · Locked' : ''}
                          </div>
                          {c.description && (
                            <div
                              style={{
                                fontSize: '0.85rem',
                                color: '#555',
                              }}
                            >
                              {c.description}
                            </div>
                          )}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              onDeleteDefinition('character', c.id)
                            }
                            disabled={
                              deleteDefinitionLoadingId === c.id || c.isLocked
                            }
                            style={{
                              fontSize: '0.8rem',
                            }}
                          >
                            {deleteDefinitionLoadingId === c.id
                              ? 'Deleting…'
                              : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Scenes</strong>
                <ul
                  style={{
                    listStyle: 'none',
                    paddingLeft: 0,
                    marginTop: '0.5rem',
                  }}
                >
                  {spaceScenes.map((s) => (
                    <li
                      key={s.id}
                      style={{
                        padding: '0.4rem 0',
                        borderBottom: '1px solid #eee',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.75rem',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.name}</div>
                          <div
                            style={{
                              fontSize: '0.8rem',
                              color: '#777',
                            }}
                          >
                            {s.isCanonical ? 'Canonical' : 'Draft'}
                            {s.isLocked ? ' · Locked' : ''}
                          </div>
                          {s.description && (
                            <div
                              style={{
                                fontSize: '0.85rem',
                                color: '#555',
                              }}
                            >
                              {s.description}
                            </div>
                          )}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              onDeleteDefinition('scene', s.id)
                            }
                            disabled={
                              deleteDefinitionLoadingId === s.id || s.isLocked
                            }
                            style={{
                              fontSize: '0.8rem',
                            }}
                          >
                            {deleteDefinitionLoadingId === s.id
                              ? 'Deleting…'
                              : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Styles</strong>
                <ul
                  style={{
                    listStyle: 'none',
                    paddingLeft: 0,
                    marginTop: '0.5rem',
                  }}
                >
                  {spaceStyles.map((style) => (
                    <li
                      key={style.id}
                      style={{
                        padding: '0.4rem 0',
                        borderBottom: '1px solid #eee',
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{style.name}</div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: '#777',
                        }}
                      >
                        {style.isCanonical ? 'Canonical' : 'Draft'}
                        {style.isLocked ? ' · Locked' : ''}
                      </div>
                      {style.description && (
                        <div
                          style={{
                            fontSize: '0.85rem',
                            color: '#555',
                          }}
                        >
                          {style.description}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
