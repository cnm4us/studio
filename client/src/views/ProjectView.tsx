import type { FormEvent } from 'react';

type ProjectViewProps = {
  importLoading: boolean;
  importError: string | null;
  projectDefinitionsLoading: boolean;
  projectDefinitionsError: string | null;
  projectCharacters: any[];
  projectScenes: any[];
  selectedCharacterId: number | null;
  setSelectedCharacterId: (id: number | null) => void;
  selectedSceneId: number | null;
  setSelectedSceneId: (id: number | null) => void;
  selectedStyleId: number | null;
  setSelectedStyleId: (id: number | null) => void;
  spaceStyles: any[];
  tasksLoading: boolean;
  tasksError: string | null;
  tasks: any[];
  newTaskName: string;
  setNewTaskName: (value: string) => void;
  newTaskPrompt: string;
  setNewTaskPrompt: (value: string) => void;
  newTaskDescription: string;
  setNewTaskDescription: (value: string) => void;
  createTaskLoading: boolean;
  createTaskError: string | null;
  renderingTaskId: number | null;
  renderError: string | null;
  assetsLoading: boolean;
  assetsError: string | null;
  renderedAssets: any[];
  onImportDefinitionsToProject: (event: FormEvent) => void;
  onCreateTask: (event: FormEvent) => void;
  onRenderTask: (taskId: number) => void;
};

export function ProjectView(props: ProjectViewProps) {
  const {
    importLoading,
    importError,
    projectDefinitionsLoading,
    projectDefinitionsError,
    projectCharacters,
    projectScenes,
    selectedCharacterId,
    setSelectedCharacterId,
    selectedSceneId,
    setSelectedSceneId,
    selectedStyleId,
    setSelectedStyleId,
    spaceStyles,
    tasksLoading,
    tasksError,
    tasks,
    newTaskName,
    setNewTaskName,
    newTaskPrompt,
    setNewTaskPrompt,
    newTaskDescription,
    setNewTaskDescription,
    createTaskLoading,
    createTaskError,
    renderingTaskId,
    renderError,
    assetsLoading,
    assetsError,
    renderedAssets,
    onImportDefinitionsToProject,
    onCreateTask,
    onRenderTask,
  } = props;

  return (
    <div
      style={{
        marginTop: '1rem',
        borderTop: '1px solid #eee',
        paddingTop: '1rem',
      }}
    >
      <form onSubmit={onImportDefinitionsToProject}>
        <button type="submit" disabled={importLoading}>
          {importLoading
            ? 'Importing…'
            : 'Import all characters & scenes into selected project'}
        </button>
        {importError && (
          <p
            style={{
              color: 'red',
              marginTop: '0.5rem',
            }}
          >
            {importError}
          </p>
        )}
      </form>

      <div
        style={{
          marginTop: '1.5rem',
          borderTop: '1px solid #eee',
          paddingTop: '1rem',
        }}
      >
        <h4 style={{ marginTop: 0 }}>Project assets (imported characters & scenes)</h4>

        {projectDefinitionsLoading && <p>Loading project assets…</p>}
        {projectDefinitionsError && (
          <p
            style={{
              color: 'red',
              marginTop: 0,
            }}
          >
            {projectDefinitionsError}
          </p>
        )}
        {!projectDefinitionsLoading &&
          !projectDefinitionsError &&
          projectCharacters.length === 0 &&
          projectScenes.length === 0 && (
            <p>
              No imported characters or scenes yet for this project. Use the import
              button above.
            </p>
          )}
        {!projectDefinitionsLoading &&
          !projectDefinitionsError &&
          (projectCharacters.length > 0 || projectScenes.length > 0) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <strong>Project characters</strong>
                <ul
                  style={{
                    listStyle: 'none',
                    paddingLeft: 0,
                    marginTop: '0.5rem',
                  }}
                >
                  {projectCharacters.map((c) => (
                    <li
                      key={c.id}
                      style={{
                        padding: '0.4rem 0',
                        borderBottom: '1px solid #eee',
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: '#777',
                        }}
                      >
                        Imported from Space asset
                        {c.parentId ? ` #${c.parentId}` : ''}
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
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Project scenes</strong>
                <ul
                  style={{
                    listStyle: 'none',
                    paddingLeft: 0,
                    marginTop: '0.5rem',
                  }}
                >
                  {projectScenes.map((s) => (
                    <li
                      key={s.id}
                      style={{
                        padding: '0.4rem 0',
                        borderBottom: '1px solid #eee',
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: '#777',
                        }}
                      >
                        Imported from Space asset
                        {s.parentId ? ` #${s.parentId}` : ''}
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
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

        <h4 style={{ marginTop: 0 }}>Tasks & renders for selected project</h4>

        <div
          style={{
            marginBottom: '0.75rem',
            fontSize: '0.9rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <label>
              Render character (optional):{' '}
              <select
                value={selectedCharacterId ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCharacterId(val ? Number(val) : null);
                }}
                style={{ padding: '0.2rem 0.4rem' }}
              >
                <option value="">None</option>
                {projectCharacters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Render scene (optional):{' '}
              <select
                value={selectedSceneId ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedSceneId(val ? Number(val) : null);
                }}
                style={{ padding: '0.2rem 0.4rem' }}
              >
                <option value="">None</option>
                {projectScenes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Render style (optional):{' '}
              <select
                value={selectedStyleId ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedStyleId(val ? Number(val) : null);
                }}
                style={{ padding: '0.2rem 0.4rem' }}
              >
                <option value="">None</option>
                {spaceStyles.map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <form
          onSubmit={onCreateTask}
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
              Task name
            </label>
            <input
              type="text"
              required
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.4rem',
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.25rem',
              }}
            >
              Prompt (optional)
            </label>
            <textarea
              value={newTaskPrompt}
              onChange={(e) => setNewTaskPrompt(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                padding: '0.4rem',
              }}
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
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                padding: '0.4rem',
              }}
            />
          </div>
          {createTaskError && (
            <p
              style={{
                color: 'red',
                margin: 0,
              }}
            >
              {createTaskError}
            </p>
          )}
          <div>
            <button type="submit" disabled={createTaskLoading}>
              {createTaskLoading ? 'Creating…' : 'Create task'}
            </button>
          </div>
        </form>

        {tasksLoading && <p>Loading tasks…</p>}
        {tasksError && (
          <p
            style={{
              color: 'red',
              marginTop: 0,
            }}
          >
            {tasksError}
          </p>
        )}
        {!tasksLoading && !tasksError && tasks.length === 0 && (
          <p>No tasks yet for this project. Create one above.</p>
        )}
        {!tasksLoading && !tasksError && tasks.length > 0 && (
          <ul
            style={{
              listStyle: 'none',
              paddingLeft: 0,
            }}
          >
            {tasks.map((task) => (
              <li
                key={task.id}
                style={{
                  padding: '0.4rem 0',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{task.name}</div>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: '#555',
                    }}
                  >
                    Status: {task.status}
                  </div>
                  {task.description && (
                    <div
                      style={{
                        fontSize: '0.85rem',
                        color: '#555',
                      }}
                    >
                      {task.description}
                    </div>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => onRenderTask(task.id)}
                    disabled={
                      renderingTaskId === task.id || task.status === 'running'
                    }
                  >
                    {renderingTaskId === task.id ? 'Rendering…' : 'Render'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {renderError && (
          <p
            style={{
              color: 'red',
              marginTop: '0.5rem',
            }}
          >
            {renderError}
          </p>
        )}

        <div
          style={{
            marginTop: '1.5rem',
            borderTop: '1px solid #eee',
            paddingTop: '1rem',
          }}
        >
          <h5 style={{ marginTop: 0 }}>Rendered assets</h5>

          {assetsLoading && <p>Loading renders…</p>}
          {assetsError && (
            <p
              style={{
                color: 'red',
                marginTop: 0,
              }}
            >
              {assetsError}
            </p>
          )}
          {!assetsLoading && !assetsError && renderedAssets.length === 0 && (
            <p>No rendered assets yet for this project. Run a render above.</p>
          )}
          {!assetsLoading && !assetsError && renderedAssets.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {renderedAssets.map((asset) => (
                <div
                  key={asset.id}
                  style={{
                    border: '1px solid #eee',
                    borderRadius: '4px',
                    padding: '0.5rem',
                  }}
                >
                  {asset.type === 'image' ? (
                    <a href={asset.file_url} target="_blank" rel="noreferrer">
                      <img
                        src={asset.file_url}
                        alt=""
                        style={{
                          width: '100%',
                          height: 'auto',
                          display: 'block',
                        }}
                      />
                    </a>
                  ) : (
                    <a href={asset.file_url} target="_blank" rel="noreferrer">
                      {asset.file_key}
                    </a>
                  )}
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: '#555',
                      marginTop: '0.25rem',
                    }}
                  >
                    State: {asset.state}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

