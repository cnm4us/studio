import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import type { DefinitionSummary } from '../App';

type ProjectViewProps = {
  importLoading: boolean;
  importError: string | null;
  projectDefinitionsLoading: boolean;
  projectDefinitionsError: string | null;
  projectCharacters: DefinitionSummary[];
  projectScenes: DefinitionSummary[];
  projectStyles: DefinitionSummary[];
  projectReferenceConstraints: DefinitionSummary[];
  spaceCharacters: DefinitionSummary[];
  spaceScenes: DefinitionSummary[];
  spaceStyles: DefinitionSummary[];
  spaceReferenceConstraints: DefinitionSummary[];
  tasksLoading: boolean;
  tasksError: string | null;
  tasks: any[];
  newTaskName: string;
  setNewTaskName: (value: string) => void;
  newTaskDescription: string;
  setNewTaskDescription: (value: string) => void;
  createTaskLoading: boolean;
  createTaskError: string | null;
  renderingTaskId: number | null;
  renderError: string | null;
  assetsLoading: boolean;
  assetsError: string | null;
  renderedAssets: any[];
  onUpdateRenderedAssetState: (
    assetId: number,
    state: 'draft' | 'approved' | 'archived',
  ) => void;
  onDeleteTask: (taskId: number) => void;
  onChangeTaskAspectRatio: (taskId: number, aspectRatio: string | null) => void;
  onImportDefinitionsToProject: (event: FormEvent) => void;
  onCreateTask: (event: FormEvent) => void;
  onRenderTask: (params: {
    taskId: number;
    characterIds: number[];
    sceneId: number | null;
    styleId: number | null;
    referenceConstraintId: number | null;
    prompt: string | null;
  }) => void;
  onImportSingleDefinition: (
    kind: 'character' | 'scene' | 'style' | 'reference_constraint',
    definitionId: number,
  ) => void;
  onRemoveProjectDefinition: (
    kind: 'character' | 'scene' | 'style' | 'reference_constraint',
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
    projectReferenceConstraints,
    spaceCharacters,
    spaceScenes,
    spaceStyles,
    spaceReferenceConstraints,
    tasksLoading,
    tasksError,
    tasks,
    newTaskName,
    setNewTaskName,
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
    onUpdateRenderedAssetState,
    onDeleteTask,
    onChangeTaskAspectRatio,
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
  const [selectedSpaceReferenceConstraintId, setSelectedSpaceReferenceConstraintId] =
    useState<number | ''>('');
  const [detailsDefinition, setDetailsDefinition] =
    useState<DefinitionSummary | null>(null);
  const [selectedRenderedAsset, setSelectedRenderedAsset] = useState<any | null>(
    null,
  );
  const [castByTaskId, setCastByTaskId] = useState<
    Record<
      number,
      {
        characters: number[];
        sceneId: number | null;
        styleId: number | null;
        referenceConstraintId: number | null;
        prompt: string;
      }
    >
  >({});

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
  const importedReferenceConstraintParentIds = new Set(
    projectReferenceConstraints
      .map((rc) => rc.parentId)
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
  const availableSpaceReferenceConstraints = spaceReferenceConstraints.filter(
    (rc) => !importedReferenceConstraintParentIds.has(rc.id),
  );

  useEffect(() => {
    if (!selectedRenderedAsset) {
      return;
    }
    const latest = renderedAssets.find(
      (asset) => asset.id === selectedRenderedAsset.id,
    );
    if (!latest) {
      setSelectedRenderedAsset(null);
      return;
    }
    if (latest !== selectedRenderedAsset) {
      setSelectedRenderedAsset(latest);
    }
  }, [renderedAssets, selectedRenderedAsset]);

  const getCastForTask = (taskId: number) =>
    castByTaskId[taskId] ?? {
      characters: [],
      sceneId: null,
      styleId: null,
      referenceConstraintId: null,
      prompt: '',
    };

  const updateCastForTask = (
    taskId: number,
    updater: (prev: {
      characters: number[];
      sceneId: number | null;
      styleId: number | null;
      referenceConstraintId: number | null;
      prompt: string;
    }) => {
      characters: number[];
      sceneId: number | null;
      styleId: number | null;
      referenceConstraintId: number | null;
      prompt: string;
    },
  ) => {
    setCastByTaskId((prev) => {
      const current = getCastForTask(taskId);
      return {
        ...prev,
        [taskId]: updater(current),
      };
    });
  };

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
            Add reference constraint:{' '}
            <select
              value={selectedSpaceReferenceConstraintId}
              disabled={importLoading}
              onChange={(event) => {
                const val = event.target.value;
                if (!val) {
                  setSelectedSpaceReferenceConstraintId('');
                  return;
                }
                const id = Number(val);
                setSelectedSpaceReferenceConstraintId(id);
                if (!importLoading) {
                  onImportSingleDefinition('reference_constraint', id);
                  setSelectedSpaceReferenceConstraintId('');
                }
              }}
              style={{ padding: '0.2rem 0.4rem' }}
            >
              <option value="">Select…</option>
              {availableSpaceReferenceConstraints.map((rc) => (
                <option key={rc.id} value={rc.id}>
                  {rc.name}
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
        <h4 style={{ marginTop: 0 }}>
          Project assets (characters, scenes, styles & constraints)
        </h4>

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
          projectStyles.length === 0 &&
          projectReferenceConstraints.length === 0 && (
            <p>
              No imported characters, scenes, styles, or reference constraints
              yet for this project. Use the import controls above.
            </p>
          )}
        {!projectDefinitionsLoading &&
          !projectDefinitionsError &&
          (projectCharacters.length > 0 ||
            projectScenes.length > 0 ||
            projectStyles.length > 0 ||
            projectReferenceConstraints.length > 0) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr',
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
                            style={{
                              fontSize: '0.8rem',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: '#c62828',
                              color: '#fff',
                              cursor: c.isLocked ? 'default' : 'pointer',
                            }}
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
                            style={{
                              fontSize: '0.8rem',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: '#c62828',
                              color: '#fff',
                              cursor: s.isLocked ? 'default' : 'pointer',
                            }}
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
                            style={{
                              fontSize: '0.8rem',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: '#c62828',
                              color: '#fff',
                              cursor: style.isLocked ? 'default' : 'pointer',
                            }}
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
                <strong>Project reference constraints</strong>
                <ul
                  style={{
                    listStyle: 'none',
                    paddingLeft: 0,
                    marginTop: '0.5rem',
                  }}
                >
                  {projectReferenceConstraints.map((rc) => (
                    <li
                      key={rc.id}
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
                            onClick={() => setDetailsDefinition(rc)}
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
                            {rc.name}
                          </button>
                          <div
                            style={{
                              fontSize: '0.8rem',
                              color: '#777',
                            }}
                          >
                            Status:{' '}
                            {rc.isLocked ? 'Locked' : 'Not locked'}
                          </div>
                        </div>
                        <div>
                          <button
                            type="button"
                            disabled={rc.isLocked}
                            onClick={() =>
                              onRemoveProjectDefinition(
                                'reference_constraint',
                                rc.id,
                              )
                            }
                            style={{
                              fontSize: '0.8rem',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: '#c62828',
                              color: '#fff',
                              cursor: rc.isLocked ? 'default' : 'pointer',
                            }}
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
            <button
              type="submit"
              disabled={createTaskLoading}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#2e7d32',
                color: '#fff',
                cursor: createTaskLoading ? 'default' : 'pointer',
              }}
            >
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
              (() => {
                const cast = getCastForTask(task.id);
                const assetsForTask = renderedAssets.filter(
                  (asset) => asset.task_id === task.id,
                );

                return (
                  <li
                    key={task.id}
                    style={{
                      listStyle: 'none',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: '#fdf3e2',
                        border: '1px solid #d2a679',
                        borderRadius: '8px',
                        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)',
                        padding: '0.75rem 0.9rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              marginBottom: task.description ? '0.15rem' : 0,
                            }}
                          >
                            {task.name}
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
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: '0.3rem',
                            fontSize: '0.85rem',
                            color: '#555',
                            textAlign: 'right',
                          }}
                        >
                          <div>Status: {task.status}</div>
                          <label
                            style={{
                              fontSize: '0.8rem',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              gap: '0.15rem',
                            }}
                          >
                            <span>Aspect ratio:</span>
                            <select
                              value={
                                (task.aspectRatio ??
                                  (task as any).aspect_ratio ??
                                  '') as string
                              }
                              onChange={(event) =>
                                onChangeTaskAspectRatio(
                                  task.id,
                                  event.target.value || null,
                                )
                              }
                              style={{
                                padding: '0.15rem 0.4rem',
                                fontSize: '0.8rem',
                              }}
                            >
                              <option value="">Auto</option>
                              <option value="1:1">1:1</option>
                              <option value="3:4">3:4</option>
                              <option value="4:3">4:3</option>
                              <option value="9:16">9:16</option>
                              <option value="16:9">16:9</option>
                            </select>
                          </label>
                          {(() => {
                            const hasApproved = renderedAssets.some(
                              (asset) =>
                                asset.task_id === task.id &&
                                asset.state === 'approved',
                            );
                            if (hasApproved) {
                              return null;
                            }
                            return (
                              <button
                                type="button"
                                onClick={() => onDeleteTask(task.id)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#b71c1c',
                                  cursor: 'pointer',
                                  fontSize: '0.9rem',
                                  padding: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.15rem',
                                }}
                                aria-label="Delete task (no approved renders)"
                                title="Delete task (only allowed when there are no approved renders)"
                              >
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: '0.8rem',
                                    height: '0.8rem',
                                    borderRadius: '2px',
                                    border: '1px solid currentColor',
                                    position: 'relative',
                                  }}
                                >
                                  <span
                                    style={{
                                      position: 'absolute',
                                      top: '50%',
                                      left: '50%',
                                      width: '70%',
                                      height: '2px',
                                      backgroundColor: 'currentColor',
                                      transform:
                                        'translate(-50%, -50%) rotate(45deg)',
                                    }}
                                  />
                                  <span
                                    style={{
                                      position: 'absolute',
                                      top: '50%',
                                      left: '50%',
                                      width: '70%',
                                      height: '2px',
                                      backgroundColor: 'currentColor',
                                      transform:
                                        'translate(-50%, -50%) rotate(-45deg)',
                                    }}
                                  />
                                </span>
                                <span>Delete</span>
                              </button>
                            );
                          })()}
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: '0.25rem',
                          fontSize: '0.85rem',
                        }}
                      >
                        <div
                          style={{
                            marginBottom: '0.25rem',
                            fontWeight: 600,
                          }}
                        >
                          Cast
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            marginBottom: '0.35rem',
                          }}
                        >
                          <label>
                            Add character:{' '}
                            <select
                              value=""
                              onChange={(event) => {
                                const val = event.target.value;
                                if (!val) return;
                                const id = Number(val);
                                updateCastForTask(task.id, (prev) => {
                                  if (prev.characters.includes(id)) {
                                    return prev;
                                  }
                                  return {
                                    ...prev,
                                    characters: [...prev.characters, id],
                                  };
                                });
                              }}
                              style={{ padding: '0.2rem 0.4rem' }}
                            >
                              <option value="">Select…</option>
                              {projectCharacters.map((def) => (
                                <option key={def.id} value={def.id}>
                                  {def.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Add scene:{' '}
                            <select
                              value={cast.sceneId ?? ''}
                              onChange={(event) => {
                                const val = event.target.value;
                                updateCastForTask(task.id, (prev) => ({
                                  ...prev,
                                  sceneId: val ? Number(val) : null,
                                }));
                              }}
                              style={{ padding: '0.2rem 0.4rem' }}
                            >
                              <option value="">None</option>
                              {projectScenes.map((def) => (
                                <option key={def.id} value={def.id}>
                                  {def.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Add style:{' '}
                            <select
                              value={cast.styleId ?? ''}
                              onChange={(event) => {
                                const val = event.target.value;
                                updateCastForTask(task.id, (prev) => ({
                                  ...prev,
                                  styleId: val ? Number(val) : null,
                                }));
                              }}
                              style={{ padding: '0.2rem 0.4rem' }}
                            >
                              <option value="">None</option>
                              {projectStyles.map((def) => (
                                <option key={def.id} value={def.id}>
                                  {def.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Reference constraint:{' '}
                            <select
                              value={cast.referenceConstraintId ?? ''}
                              onChange={(event) => {
                                const val = event.target.value;
                                updateCastForTask(task.id, (prev) => ({
                                  ...prev,
                                  referenceConstraintId: val
                                    ? Number(val)
                                    : null,
                                }));
                              }}
                              style={{ padding: '0.2rem 0.4rem' }}
                            >
                              <option value="">None</option>
                              {projectReferenceConstraints.map((def) => (
                                <option key={def.id} value={def.id}>
                                  {def.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.35rem',
                            marginBottom: '0.35rem',
                          }}
                        >
                          {cast.characters.map((id) => {
                            const def = projectCharacters.find(
                              (c) => c.id === id,
                            );
                            if (!def) return null;
                            return (
                              <span
                                key={`char-${id}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  padding: '0.15rem 0.35rem',
                                  borderRadius: '999px',
                                  backgroundColor: '#eee',
                                }}
                              >
                                {def.name}
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCastForTask(task.id, (prev) => ({
                                      ...prev,
                                      characters: prev.characters.filter(
                                        (cid) => cid !== id,
                                      ),
                                    }))
                                  }
                                  style={{
                                    border: 'none',
                                    background: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}

                          {cast.sceneId != null && (() => {
                            const def = projectScenes.find(
                              (s) => s.id === cast.sceneId,
                            );
                            if (!def) return null;
                            return (
                              <span
                                key="scene-pill"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  padding: '0.15rem 0.35rem',
                                  borderRadius: '999px',
                                  backgroundColor: '#e3f2fd',
                                }}
                              >
                                {def.name}
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCastForTask(task.id, (prev) => ({
                                      ...prev,
                                      sceneId: null,
                                    }))
                                  }
                                  style={{
                                    border: 'none',
                                    background: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })()}

                          {cast.styleId != null && (() => {
                            const def = projectStyles.find(
                              (s) => s.id === cast.styleId,
                            );
                            if (!def) return null;
                            return (
                              <span
                                key="style-pill"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  padding: '0.15rem 0.35rem',
                                  borderRadius: '999px',
                                  backgroundColor: '#f3e5f5',
                                }}
                              >
                                {def.name}
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCastForTask(task.id, (prev) => ({
                                      ...prev,
                                      styleId: null,
                                    }))
                                  }
                                  style={{
                                    border: 'none',
                                    background: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })()}
                          {cast.referenceConstraintId != null && (() => {
                            const def = projectReferenceConstraints.find(
                              (s) => s.id === cast.referenceConstraintId,
                            );
                            if (!def) return null;
                            return (
                              <span
                                key="reference-constraint-pill"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  padding: '0.15rem 0.35rem',
                                  borderRadius: '999px',
                                  backgroundColor: '#ffe0b2',
                                }}
                              >
                                {def.name}
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCastForTask(task.id, (prev) => ({
                                      ...prev,
                                      referenceConstraintId: null,
                                    }))
                                  }
                                  style={{
                                    border: 'none',
                                    background: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '0.85rem',
                        }}
                      >
                        <div
                          style={{
                            marginBottom: '0.25rem',
                            fontWeight: 600,
                          }}
                        >
                          Prompt
                        </div>
                        <div
                          style={{
                            padding: '0 0.5rem',
                          }}
                        >
                          <textarea
                            value={cast.prompt}
                            onChange={(event) =>
                              updateCastForTask(task.id, (prev) => ({
                                ...prev,
                                prompt: event.target.value,
                              }))
                            }
                            rows={2}
                            style={{
                              width: '100%',
                              padding: '0.35rem',
                              fontSize: '0.85rem',
                            }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          marginTop: '0.5rem',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            onRenderTask({
                              taskId: task.id,
                              characterIds: cast.characters,
                              sceneId: cast.sceneId,
                              styleId: cast.styleId,
                              referenceConstraintId:
                                cast.referenceConstraintId,
                              prompt: cast.prompt || null,
                            })
                          }
                          disabled={renderingTaskId === task.id}
                          style={{
                            padding: '0.35rem 0.9rem',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: '#1565c0',
                            color: '#fff',
                            cursor:
                              renderingTaskId === task.id
                                ? 'default'
                                : 'pointer',
                          }}
                        >
                          {renderingTaskId === task.id
                            ? 'Rendering…'
                            : 'Render'}
                        </button>
                      </div>

                      {assetsForTask.length > 0 && (
                        <div
                          style={{
                            marginTop: '0.4rem',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              marginBottom: '0.25rem',
                            }}
                          >
                            Rendered assets for this task
                          </div>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns:
                                'repeat(auto-fill, minmax(120px, 1fr))',
                              gap: '0.5rem',
                            }}
                          >
                            {assetsForTask.map((asset) => (
                              <div
                                key={asset.id}
                                style={{
                                  border: '1px solid #555',
                                  borderRadius: '4px',
                                  padding: '0.35rem',
                                  backgroundColor: '#fff',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => setSelectedRenderedAsset(asset)}
                                  style={{
                                    border: 'none',
                                    padding: 0,
                                    margin: 0,
                                    background: 'none',
                                    cursor: 'pointer',
                                    width: '100%',
                                    textAlign: 'left',
                                  }}
                                >
                                  {asset.type === 'image' ? (
                                    <img
                                      src={asset.file_url}
                                      alt=""
                                      style={{
                                        width: '100%',
                                        height: 'auto',
                                        display: 'block',
                                      }}
                                    />
                                  ) : (
                                    <span
                                      style={{
                                        fontSize: '0.8rem',
                                        textDecoration: 'underline',
                                      }}
                                    >
                                      {asset.file_key}
                                    </span>
                                  )}
                                </button>
                                <div
                                  style={{
                                    fontSize: '0.75rem',
                                    color: '#555',
                                    marginTop: '0.15rem',
                                  }}
                                >
                                  State: {asset.state}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })()
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
          <h5 style={{ marginTop: 0 }}>Approved rendered assets</h5>

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
          {!assetsLoading && !assetsError && (() => {
            const approved = renderedAssets.filter(
              (asset) => asset.state === 'approved',
            );

            if (approved.length === 0) {
              return (
                <p>
                  No approved rendered assets yet for this project. Approve a
                  render above to see it here.
                </p>
              );
            }

            return (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                {approved.map((asset) => (
                  <div
                    key={asset.id}
                    style={{
                      border: '1px solid #555',
                      borderRadius: '4px',
                      padding: '0.5rem',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedRenderedAsset(asset)}
                      style={{
                        border: 'none',
                        padding: 0,
                        margin: 0,
                        background: 'none',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                      }}
                    >
                      {asset.type === 'image' ? (
                        <img
                          src={asset.file_url}
                          alt=""
                          style={{
                            width: '100%',
                            height: 'auto',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            textDecoration: 'underline',
                          }}
                        >
                          {asset.file_key}
                        </span>
                      )}
                    </button>
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
            );
          })()}
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
      {selectedRenderedAsset && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
          onClick={() => setSelectedRenderedAsset(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              backgroundColor: '#fff',
              padding: '0.75rem 0.75rem 0.9rem',
              borderRadius: '8px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedRenderedAsset(null)}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: '0.4rem',
                right: '0.4rem',
                border: '2px solid #fff',
                backgroundColor: '#000',
                cursor: 'pointer',
                fontSize: '1.1rem',
                lineHeight: 1,
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                padding: 0,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              ×
            </button>
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                paddingTop: '0.4rem',
              }}
            >
              {selectedRenderedAsset.type === 'image' ? (
                <img
                  src={selectedRenderedAsset.file_url}
                  alt=""
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                />
              ) : (
                <a
                  href={selectedRenderedAsset.file_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {selectedRenderedAsset.file_key}
                </a>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '0.5rem',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.85rem',
                  color: '#555',
                }}
              >
                State: {selectedRenderedAsset.state}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '0.4rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onUpdateRenderedAssetState(
                      selectedRenderedAsset.id,
                      'draft',
                    );
                    setSelectedRenderedAsset(null);
                  }}
                  style={{
                    padding: '0.3rem 0.7rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#757575',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateRenderedAssetState(
                      selectedRenderedAsset.id,
                      'approved',
                    );
                    setSelectedRenderedAsset(null);
                  }}
                  style={{
                    padding: '0.3rem 0.7rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#2e7d32',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateRenderedAssetState(
                      selectedRenderedAsset.id,
                      'archived',
                    )
                  }
                  style={{
                    padding: '0.3rem 0.7rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#c62828',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
