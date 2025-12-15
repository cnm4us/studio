import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import type { DefinitionSummary } from '../App';

type SpaceTasksViewProps = {
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
  onCreateTask: (event: FormEvent) => void;
  onRenderTask: (params: {
    taskId: number;
    characterIds: number[];
    sceneId: number | null;
    styleId: number | null;
    referenceConstraintId: number | null;
    prompt: string | null;
  }) => void;
  onUpdateRenderedAssetState: (
    assetId: number,
    state: 'draft' | 'approved' | 'archived',
  ) => void;
  onDeleteTask: (taskId: number) => void;
};

export function SpaceTasksView(props: SpaceTasksViewProps) {
  const {
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
    onCreateTask,
    onRenderTask,
    onUpdateRenderedAssetState,
    onDeleteTask,
  } = props;

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

  const [selectedRenderedAsset, setSelectedRenderedAsset] = useState<
    any | null
  >(null);

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

  return (
    <div
      style={{
        marginTop: '1.5rem',
        borderTop: '1px solid #eee',
        paddingTop: '1rem',
      }}
    >
      <h3 style={{ marginTop: 0 }}>Space tasks & renders</h3>

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
        <p>No tasks yet for this space. Create one above.</p>
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
                          gap: '0.25rem',
                          fontSize: '0.85rem',
                          color: '#555',
                          textAlign: 'right',
                        }}
                      >
                        <div>Status: {task.status}</div>
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
                            {spaceCharacters.map((def) => (
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
                            {spaceScenes.map((def) => (
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
                            {spaceStyles.map((def) => (
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
                            {spaceReferenceConstraints.map((def) => (
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
                          const def = spaceCharacters.find(
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
                          const def = spaceScenes.find(
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
                          const def = spaceStyles.find(
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
                          const def = spaceReferenceConstraints.find(
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
                        disabled={renderingTaskId === task.id}
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
                        style={{
                          padding: '0.4rem 0.9rem',
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
                              <div
                                style={{
                                  display: 'flex',
                                  gap: '0.25rem',
                                  marginTop: '0.25rem',
                                  flexWrap: 'wrap',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateRenderedAssetState(
                                      asset.id,
                                      'draft',
                                    )
                                  }
                                  disabled={asset.state === 'draft'}
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '4px',
                                    border: '1px solid #999',
                                    backgroundColor:
                                      asset.state === 'draft'
                                        ? '#eee'
                                        : '#fff',
                                    cursor:
                                      asset.state === 'draft'
                                        ? 'default'
                                        : 'pointer',
                                  }}
                                >
                                  Draft
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateRenderedAssetState(
                                      asset.id,
                                      'approved',
                                    )
                                  }
                                  disabled={asset.state === 'approved'}
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '4px',
                                    border: '1px solid #2e7d32',
                                    backgroundColor:
                                      asset.state === 'approved'
                                        ? '#c8e6c9'
                                        : '#fff',
                                    cursor:
                                      asset.state === 'approved'
                                        ? 'default'
                                        : 'pointer',
                                  }}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateRenderedAssetState(
                                      asset.id,
                                      'archived',
                                    )
                                  }
                                  disabled={asset.state === 'archived'}
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '4px',
                                    border: '1px solid #b71c1c',
                                    backgroundColor:
                                      asset.state === 'archived'
                                        ? '#ffcdd2'
                                        : '#fff',
                                    cursor:
                                      asset.state === 'archived'
                                        ? 'default'
                                        : 'pointer',
                                  }}
                                >
                                  Archive
                                </button>
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
        {!assetsLoading &&
          !assetsError &&
          renderedAssets.filter((asset) => asset.state === 'approved').length ===
            0 && <p>No approved renders yet for this space.</p>}
        {!assetsLoading &&
          !assetsError &&
          renderedAssets.filter((asset) => asset.state === 'approved').length >
            0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {renderedAssets
                .filter((asset) => asset.state === 'approved')
                .map((asset) => (
                  <div
                    key={asset.id}
                    style={{
                      border: '1px solid #999',
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
                  </div>
                ))}
            </div>
          )}
      </div>
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
