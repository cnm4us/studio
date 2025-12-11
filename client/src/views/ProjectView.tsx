import type { FormEvent } from 'react';
import { useState } from 'react';
import type { DefinitionSummary } from '../App';

type ProjectViewProps = {
  importLoading: boolean;
  importError: string | null;
  projectDefinitionsLoading: boolean;
  projectDefinitionsError: string | null;
  projectCharacters: DefinitionSummary[];
  projectScenes: DefinitionSummary[];
  projectStyles: DefinitionSummary[];
  selectedCharacterId: number | null;
  setSelectedCharacterId: (id: number | null) => void;
  selectedSceneId: number | null;
  setSelectedSceneId: (id: number | null) => void;
  selectedStyleId: number | null;
  setSelectedStyleId: (id: number | null) => void;
  spaceCharacters: DefinitionSummary[];
  spaceScenes: DefinitionSummary[];
  spaceStyles: DefinitionSummary[];
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
  onImportSingleDefinition: (
    kind: 'character' | 'scene' | 'style',
    definitionId: number,
  ) => void;
  onRemoveProjectDefinition: (
    kind: 'character' | 'scene' | 'style',
    definitionId: number,
  ) => void;
};

export function ProjectView(props: ProjectViewProps) {
  const {
    importLoading,
    importError,
    projectDefinitionsLoading,
    projectDefinitionsError,
    projectCharacters,
    projectScenes,
    projectStyles,
    selectedCharacterId,
    setSelectedCharacterId,
    selectedSceneId,
    setSelectedSceneId,
    selectedStyleId,
    setSelectedStyleId,
    spaceCharacters,
    spaceScenes,
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
    onImportSingleDefinition,
    onRemoveProjectDefinition,
  } = props;

  const [selectedSpaceCharacterId, setSelectedSpaceCharacterId] = useState<
    number | ''
  >('');
  const [selectedSpaceSceneId, setSelectedSpaceSceneId] = useState<
    number | ''
  >('');
  const [selectedSpaceStyleId, setSelectedSpaceStyleId] = useState<
    number | ''
  >('');
  const [detailsDefinition, setDetailsDefinition] =
    useState<DefinitionSummary | null>(null);

  const importedCharacterParentIds = new Set(
    projectCharacters
      .map((c) => c.parentId)
      .filter((id): id is number => typeof id === 'number' && Number.isFinite(id)),
  );
  const importedSceneParentIds = new Set(
    projectScenes
      .map((s) => s.parentId)
      .filter((id): id is number => typeof id === 'number' && Number.isFinite(id)),
  );
  const importedStyleParentIds = new Set(
    projectStyles
      .map((style) => style.parentId)
      .filter((id): id is number => typeof id === 'number' && Number.isFinite(id)),
  );

  const availableSpaceCharacters = spaceCharacters.filter(
    (c) => !importedCharacterParentIds.has(c.id),
  );
  const availableSpaceScenes = spaceScenes.filter(
    (s) => !importedSceneParentIds.has(s.id),
  );
  const availableSpaceStyles = spaceStyles.filter(
    (style) => !importedStyleParentIds.has(style.id),
  );

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
          marginTop: '1rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontSize: '0.9rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <label>
            Add character:{' '}
            <select
              value={selectedSpaceCharacterId}
              disabled={importLoading}
              onChange={(event) => {
                const val = event.target.value;
                if (!val) {
                  setSelectedSpaceCharacterId('');
                  return;
                }
                const id = Number(val);
                setSelectedSpaceCharacterId(id);
                if (!importLoading) {
                  onImportSingleDefinition('character', id);
                  setSelectedSpaceCharacterId('');
                }
              }}
              style={{ padding: '0.2rem 0.4rem' }}
            >
              <option value="">Select…</option>
              {availableSpaceCharacters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <label>
            Add scene:{' '}
            <select
              value={selectedSpaceSceneId}
              disabled={importLoading}
              onChange={(event) => {
                const val = event.target.value;
                if (!val) {
                  setSelectedSpaceSceneId('');
                  return;
                }
                const id = Number(val);
                setSelectedSpaceSceneId(id);
                if (!importLoading) {
                  onImportSingleDefinition('scene', id);
                  setSelectedSpaceSceneId('');
                }
              }}
              style={{ padding: '0.2rem 0.4rem' }}
            >
              <option value="">Select…</option>
              {availableSpaceScenes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <label>
            Add style:{' '}
            <select
              value={selectedSpaceStyleId}
              disabled={importLoading}
              onChange={(event) => {
                const val = event.target.value;
                if (!val) {
                  setSelectedSpaceStyleId('');
                  return;
                }
                const id = Number(val);
                setSelectedSpaceStyleId(id);
                if (!importLoading) {
                  onImportSingleDefinition('style', id);
                  setSelectedSpaceStyleId('');
                }
              }}
              style={{ padding: '0.2rem 0.4rem' }}
            >
              <option value="">Select…</option>
              {availableSpaceStyles.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div
        style={{
          marginTop: '1.5rem',
          borderTop: '1px solid #eee',
          paddingTop: '1rem',
        }}
      >
        <h4 style={{ marginTop: 0 }}>Project assets (characters, scenes & styles)</h4>

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
          projectScenes.length === 0 &&
          projectStyles.length === 0 && (
            <p>
              No imported characters, scenes, or styles yet for this project. Use
              the import controls above.
            </p>
          )}
        {!projectDefinitionsLoading &&
          !projectDefinitionsError &&
          (projectCharacters.length > 0 ||
            projectScenes.length > 0 ||
            projectStyles.length > 0) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
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
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.75rem',
                        }}
                      >
                        <div>
                          <button
                            type="button"
                            onClick={() => setDetailsDefinition(c)}
                            style={{
                              fontWeight: 600,
                              border: 'none',
                              background: 'none',
                              padding: 0,
                              margin: 0,
                              cursor: 'pointer',
                              textDecoration: 'underline',
                            }}
                          >
                            {c.name}
                          </button>
                          <div
                            style={{
                              fontSize: '0.8rem',
                              color: '#777',
                            }}
                          >
                            Status:{' '}
                            {c.isLocked ? 'Locked' : 'Not locked'}
                          </div>
                        </div>
                        <div>
                          <button
                            type="button"
                            disabled={c.isLocked}
                            onClick={() =>
                              onRemoveProjectDefinition('character', c.id)
                            }
                            style={{ fontSize: '0.8rem' }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
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
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.75rem',
                        }}
                      >
                        <div>
                          <button
                            type="button"
                            onClick={() => setDetailsDefinition(s)}
                            style={{
                              fontWeight: 600,
                              border: 'none',
                              background: 'none',
                              padding: 0,
                              margin: 0,
                              cursor: 'pointer',
                              textDecoration: 'underline',
                            }}
                          >
                            {s.name}
                          </button>
                          <div
                            style={{
                              fontSize: '0.8rem',
                              color: '#777',
                            }}
                          >
                            Status:{' '}
                            {s.isLocked ? 'Locked' : 'Not locked'}
                          </div>
                        </div>
                        <div>
                          <button
                            type="button"
                            disabled={s.isLocked}
                            onClick={() =>
                              onRemoveProjectDefinition('scene', s.id)
                            }
                            style={{ fontSize: '0.8rem' }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Project styles</strong>
                <ul
                  style={{
                    listStyle: 'none',
                    paddingLeft: 0,
                    marginTop: '0.5rem',
                  }}
                >
                  {projectStyles.map((style) => (
                    <li
                      key={style.id}
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
                          <button
                            type="button"
                            onClick={() => setDetailsDefinition(style)}
                            style={{
                              fontWeight: 600,
                              border: 'none',
                              background: 'none',
                              padding: 0,
                              margin: 0,
                              cursor: 'pointer',
                              textDecoration: 'underline',
                            }}
                          >
                            {style.name}
                          </button>
                          <div
                            style={{
                              fontSize: '0.8rem',
                              color: '#777',
                            }}
                          >
                            Status:{' '}
                            {style.isLocked ? 'Locked' : 'Not locked'}
                          </div>
                        </div>
                        <div>
                          <button
                            type="button"
                            disabled={style.isLocked}
                            onClick={() =>
                              onRemoveProjectDefinition('style', style.id)
                            }
                            style={{ fontSize: '0.8rem' }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
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
                {projectStyles.map((style) => (
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
      {detailsDefinition && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setDetailsDefinition(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              backgroundColor: '#fff',
              padding: '1rem',
              borderRadius: '8px',
              maxWidth: '480px',
              width: '90%',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>
              {detailsDefinition.name}
            </h4>
            <div
              style={{
                fontSize: '0.9rem',
                color: '#333',
                maxHeight: '260px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {detailsDefinition.description
                ? detailsDefinition.description
                : 'No description set for this definition yet.'}
            </div>
            <div
              style={{
                marginTop: '0.75rem',
                textAlign: 'right',
              }}
            >
              <button
                type="button"
                onClick={() => setDetailsDefinition(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
