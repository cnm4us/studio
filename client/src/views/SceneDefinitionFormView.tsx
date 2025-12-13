import type { FormEvent } from 'react';
import type { SceneDefinitionMetadata } from '../definitionMetadata';
import { sceneDefinitionConfig } from '../config/sceneDefinitions';
import type { SpaceAssetSummary } from '../App';
import { findAssetBinding } from '../../../shared/definition_config/assetReferenceMapping.js';

type SceneDefinitionFormViewProps = {
  mode: 'create' | 'edit';
  spaceName: string;
  selectedSpaceId: number | null;
  createDefinitionLoading: boolean;
  newSceneName: string;
  newSceneDescription: string;
  sceneMetadata: SceneDefinitionMetadata;
  spaceAssets?: SpaceAssetSummary[];
  setNewSceneName: (value: string) => void;
  setNewSceneDescription: (value: string) => void;
  setSceneMetadata: (
    updater:
      | SceneDefinitionMetadata
      | ((prev: SceneDefinitionMetadata) => SceneDefinitionMetadata),
  ) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
};

type SceneCategoryValue = {
  [propertyKey: string]:
    | string
    | string[]
    | number
    | boolean
    | Array<unknown>
    | null
    | undefined;
};

export function SceneDefinitionFormView(props: SceneDefinitionFormViewProps) {
  const {
    mode,
    spaceName,
    selectedSpaceId,
    createDefinitionLoading,
    newSceneName,
    newSceneDescription,
    sceneMetadata,
    spaceAssets = [],
    setNewSceneName,
    setNewSceneDescription,
    setSceneMetadata,
    onSubmit,
    onCancel,
  } = props;

  const isEdit = mode === 'edit';

  return (
    <section
      style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '1rem',
        marginTop: '1.5rem',
      }}
    >
      <h2 style={{ marginTop: 0 }}>
        {isEdit
          ? `Edit scene in ${spaceName}`
          : `Create scene in ${spaceName}`}
      </h2>
      <form
        onSubmit={onSubmit}
        style={{
          marginTop: '0.5rem',
          display: 'grid',
          gap: '0.4rem',
        }}
      >
        <input
          type="text"
          placeholder="Scene name"
          required
          value={newSceneName}
          onChange={(e) => setNewSceneName(e.target.value)}
          style={{ width: '100%', padding: '0.4rem' }}
        />
        <textarea
          placeholder="Description (optional)"
          value={newSceneDescription}
          onChange={(e) => setNewSceneDescription(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: '0.4rem' }}
        />
        <div
          style={{
            marginTop: '0.5rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid #eee',
          }}
        >
          <h3 style={{ margin: '0 0 0.25rem' }}>Scene configuration</h3>
          <p
            style={{
              margin: '0 0 0.5rem',
              fontSize: '0.85rem',
              color: '#555',
            }}
          >
            Define the environment, layout, lighting, atmosphere, and narrative
            role for this scene. These details flow into renders and help keep
            panels consistent.
          </p>
          {sceneDefinitionConfig.categories
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((category) => (
              <div
                key={category.key}
                style={{
                  marginBottom: '0.75rem',
                  padding: '0.5rem 0.25rem 0.25rem',
                  borderTop: '1px solid #f0f0f0',
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: '0.25rem',
                  }}
                >
                  {category.label}
                </div>
                {category.description && (
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: '#666',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {category.description}
                  </div>
                )}
                {category.properties.map((prop) => {
                  const categoryValue =
                    (sceneMetadata as any)[
                      category.key as keyof SceneDefinitionMetadata
                    ] as Record<string, unknown> | undefined;
                  const rawValue = categoryValue
                    ? (categoryValue as any)[prop.key]
                    : undefined;

                  let inputValue = '';
                  if (prop.type === 'tags') {
                    inputValue = Array.isArray(rawValue)
                      ? (rawValue as string[]).join(', ')
                      : '';
                  } else if (
                    prop.type === 'string' ||
                    prop.type === 'enum'
                  ) {
                    if (typeof rawValue === 'string') {
                      inputValue = rawValue;
                    }
                  } else if (prop.type === 'number') {
                    if (typeof rawValue === 'number') {
                      inputValue = String(rawValue);
                    }
                  }

                  const inputId = `scene-${category.key}-${prop.key}`;

                  const assetBinding = findAssetBinding(
                    'scene',
                    category.key,
                    prop.key,
                  );

                  if (assetBinding) {
                    const assetType = assetBinding.assetType;
                    const availableAssets = spaceAssets.filter(
                      (asset) => asset.type === assetType,
                    );

                    const baseCategory =
                      (sceneMetadata as any)[
                        assetBinding.metadataCategoryKey as keyof SceneDefinitionMetadata
                      ] as SceneCategoryValue | undefined;

                    const rawIds =
                      baseCategory?.[assetBinding.metadataPropertyKey];

                    let selectedIds: string[] = [];
                    if (Array.isArray(rawIds)) {
                      selectedIds = rawIds.map((value) => String(value));
                    } else if (
                      typeof rawIds === 'string' &&
                      rawIds.trim().length > 0
                    ) {
                      selectedIds = [rawIds.trim()];
                    }

                    const uniqueSelectedIds = Array.from(
                      new Set(selectedIds),
                    );

                    const selectedAssets = uniqueSelectedIds
                      .map((id) => {
                        const numeric = Number(id);
                        if (!Number.isFinite(numeric)) return null;
                        return spaceAssets.find(
                          (asset) => asset.id === numeric,
                        );
                      })
                      .filter(Boolean) as SpaceAssetSummary[];

                    const handleAddAsset = (assetId: number): void => {
                      const id = String(assetId);
                      setSceneMetadata((prev) => {
                        const prevCategory =
                          (prev as any)[
                            assetBinding.metadataCategoryKey as keyof SceneDefinitionMetadata
                          ] as SceneCategoryValue | undefined;
                        const nextCategory: SceneCategoryValue = {
                          ...(prevCategory ?? {}),
                        };
                        const current =
                          (nextCategory[
                            assetBinding.metadataPropertyKey
                          ] as string[] | undefined) ?? [];
                        if (!current.includes(id)) {
                          nextCategory[assetBinding.metadataPropertyKey] = [
                            ...current,
                            id,
                          ];
                        }
                        return {
                          ...prev,
                          [assetBinding.metadataCategoryKey]:
                            Object.keys(nextCategory).length > 0
                              ? nextCategory
                              : undefined,
                        };
                      });
                    };

                    const handleRemoveAsset = (assetId: number): void => {
                      const id = String(assetId);
                      setSceneMetadata((prev) => {
                        const prevCategory =
                          (prev as any)[
                            assetBinding.metadataCategoryKey as keyof SceneDefinitionMetadata
                          ] as SceneCategoryValue | undefined;
                        const nextCategory: SceneCategoryValue = {
                          ...(prevCategory ?? {}),
                        };
                        const current =
                          (nextCategory[
                            assetBinding.metadataPropertyKey
                          ] as string[] | undefined) ?? [];
                        const nextIds = current.filter(
                          (value) => value !== id,
                        );
                        if (nextIds.length > 0) {
                          nextCategory[assetBinding.metadataPropertyKey] =
                            nextIds;
                        } else {
                          delete nextCategory[assetBinding.metadataPropertyKey];
                        }
                        return {
                          ...prev,
                          [assetBinding.metadataCategoryKey]:
                            Object.keys(nextCategory).length > 0
                              ? nextCategory
                              : undefined,
                        };
                      });
                    };

                    return (
                      <div key={prop.key} style={{ marginBottom: '0.5rem' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.25rem',
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 500,
                            }}
                          >
                            {prop.label}
                          </div>
                          {availableAssets.length === 0 && (
                            <span
                              style={{
                                fontSize: '0.8rem',
                                color: '#777',
                              }}
                            >
                              No matching assets in this space yet.
                            </span>
                          )}
                        </div>
                        {selectedAssets.length > 0 && (
                          <div
                            style={{
                              marginBottom: '0.25rem',
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '0.35rem',
                            }}
                          >
                            {selectedAssets.map((asset) => (
                              <span
                                key={asset.id}
                                style={{
                                  borderRadius: '999px',
                                  border: '1px solid #444',
                                  padding: '0.1rem 0.4rem',
                                  fontSize: '0.8rem',
                                  backgroundColor: '#222',
                                  color: '#fff',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                              >
                                <span>{asset.name}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveAsset(asset.id)
                                  }
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    padding: 0,
                                  }}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        {availableAssets.length > 0 && (
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '0.35rem',
                            }}
                          >
                            {availableAssets.map((asset) => (
                              <button
                                key={asset.id}
                                type="button"
                                onClick={() => handleAddAsset(asset.id)}
                                style={{
                                  borderRadius: '999px',
                                  border: '1px solid #ccc',
                                  padding: '0.15rem 0.5rem',
                                  fontSize: '0.8rem',
                                  backgroundColor: '#f7f7f7',
                                  cursor: 'pointer',
                                }}
                              >
                                {asset.name}
                              </button>
                            ))}
                          </div>
                        )}
                        {prop.description && (
                          <div
                            style={{
                              fontSize: '0.8rem',
                              color: '#666',
                              marginTop: '0.1rem',
                            }}
                          >
                            {prop.description}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={prop.key} style={{ marginBottom: '0.5rem' }}>
                      <label
                        htmlFor={inputId}
                        style={{
                          display: 'block',
                          fontWeight: 500,
                          marginBottom: '0.15rem',
                        }}
                      >
                        {prop.label}
                      </label>
                      {prop.type === 'tags' &&
                        (() => {
                          const categoryValueForTags =
                            (sceneMetadata as any)[
                              category.key as keyof SceneDefinitionMetadata
                            ] as SceneCategoryValue | undefined;
                          const rawTags = categoryValueForTags
                            ? (categoryValueForTags as any)[prop.key]
                            : undefined;
                          const selectedTags = Array.isArray(rawTags)
                            ? (rawTags as string[])
                            : [];
                          const availableOptions =
                            prop.options && prop.options.length > 0
                              ? prop.options.filter(
                                  (opt) => !selectedTags.includes(opt.value),
                                )
                              : [];
                          return (
                            <>
                              {availableOptions.length > 0 && (
                                <div
                                  style={{
                                    margin: '0.25rem 0',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '0.25rem',
                                  }}
                                >
                                  {availableOptions.map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() =>
                                        setSceneMetadata((prev) => {
                                          const prevCategory =
                                            (prev as any)[
                                              category.key as keyof SceneDefinitionMetadata
                                            ] as SceneCategoryValue | undefined;
                                          const nextCategory: SceneCategoryValue =
                                            {
                                              ...(prevCategory ?? {}),
                                            };
                                          const current =
                                            (nextCategory[
                                              prop.key
                                            ] as string[] | undefined) ?? [];
                                          if (!current.includes(opt.value)) {
                                            nextCategory[prop.key] = [
                                              ...current,
                                              opt.value,
                                            ];
                                          }
                                          return {
                                            ...prev,
                                            [category.key]:
                                              Object.keys(nextCategory).length >
                                              0
                                                ? nextCategory
                                                : undefined,
                                          };
                                        })
                                      }
                                      style={{
                                        borderRadius: '999px',
                                        border: '1px solid #ccc',
                                        padding: '0.15rem 0.5rem',
                                        fontSize: '0.8rem',
                                        backgroundColor: '#f7f7f7',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {selectedTags.length > 0 && (
                                <div
                                  style={{
                                    margin: '0.15rem 0 0.25rem',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '0.25rem',
                                  }}
                                >
                                  {selectedTags.map((tag) => {
                                    const optionLabel =
                                      prop.options?.find(
                                        (opt) => opt.value === tag,
                                      )?.label ?? tag;
                                    return (
                                      <span
                                        key={tag}
                                        style={{
                                          borderRadius: '999px',
                                          border: '1px solid #444',
                                          padding: '0.1rem 0.4rem',
                                          fontSize: '0.8rem',
                                          backgroundColor: '#222',
                                          color: '#fff',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.25rem',
                                        }}
                                      >
                                        <span>{optionLabel}</span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setSceneMetadata((prev) => {
                                              const prevCategory =
                                                (prev as any)[
                                                  category.key as keyof SceneDefinitionMetadata
                                                ] as SceneCategoryValue | undefined;
                                              const nextCategory: SceneCategoryValue =
                                                {
                                                  ...(prevCategory ?? {}),
                                                };
                                              const current =
                                                (nextCategory[
                                                  prop.key
                                                ] as string[] | undefined) ??
                                                [];
                                              const next = current.filter(
                                                (value) => value !== tag,
                                              );
                                              if (next.length > 0) {
                                                nextCategory[prop.key] = next;
                                              } else {
                                                delete nextCategory[prop.key];
                                              }
                                              return {
                                                ...prev,
                                                [category.key]:
                                                  Object.keys(nextCategory)
                                                    .length > 0
                                                    ? nextCategory
                                                    : undefined,
                                              };
                                            })
                                          }
                                          style={{
                                            border: 'none',
                                            background: 'transparent',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            padding: 0,
                                          }}
                                        >
                                          ×
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      {(prop.type === 'enum' &&
                        prop.options &&
                        prop.options.length > 0 && (
                          <select
                            id={inputId}
                            value={inputValue}
                            onChange={(e) => {
                              const value = e.target.value;
                              setSceneMetadata((prev) => {
                                const prevCategory =
                                  (prev as any)[
                                    category.key as keyof SceneDefinitionMetadata
                                  ] as SceneCategoryValue | undefined;
                                const nextCategory: SceneCategoryValue = {
                                  ...(prevCategory ?? {}),
                                };

                                if (value) {
                                  nextCategory[prop.key] = value;
                                } else {
                                  delete nextCategory[prop.key];
                                }

                                return {
                                  ...prev,
                                  [category.key]:
                                    Object.keys(nextCategory).length > 0
                                      ? nextCategory
                                      : undefined,
                                };
                              });
                            }}
                            style={{ width: '100%', padding: '0.35rem' }}
                          >
                            <option value="">Select (optional)</option>
                            {prop.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )) || (
                        <input
                          id={inputId}
                          type={prop.type === 'number' ? 'number' : 'text'}
                          value={prop.type === 'tags' ? (undefined as any) : inputValue}
                          onChange={(e) => {
                            const text = e.target.value;
                            if (prop.type === 'tags') {
                              if (!text.includes(' ') && !text.includes(',')) {
                                return;
                              }
                              const tokens = text
                                .split(/[, ]/)
                                .map((token) => token.trim())
                                .filter((token) => token.length > 0);
                              if (tokens.length === 0) {
                                e.target.value = '';
                                return;
                              }
                              setSceneMetadata((prev) => {
                                const prevCategory =
                                  (prev as any)[
                                    category.key as keyof SceneDefinitionMetadata
                                  ] as SceneCategoryValue | undefined;
                                const nextCategory: SceneCategoryValue = {
                                  ...(prevCategory ?? {}),
                                };
                                const current =
                                  (nextCategory[prop.key] as string[] | undefined) ??
                                  [];
                                const merged = Array.from(
                                  new Set([...current, ...tokens]),
                                );
                                if (merged.length > 0) {
                                  nextCategory[prop.key] = merged;
                                } else {
                                  delete nextCategory[prop.key];
                                }
                                return {
                                  ...prev,
                                  [category.key]:
                                    Object.keys(nextCategory).length > 0
                                      ? nextCategory
                                      : undefined,
                                };
                              });
                              e.target.value = '';
                            } else if (prop.type === 'number') {
                              const numeric = text.trim();
                              setSceneMetadata((prev) => {
                                const prevCategory =
                                  (prev as any)[
                                    category.key as keyof SceneDefinitionMetadata
                                  ] as SceneCategoryValue | undefined;
                                const nextCategory: SceneCategoryValue = {
                                  ...(prevCategory ?? {}),
                                };
                                if (numeric.length === 0) {
                                  delete nextCategory[prop.key];
                                } else {
                                  const parsed = Number(numeric);
                                  if (!Number.isNaN(parsed)) {
                                    nextCategory[prop.key] = parsed;
                                  }
                                }
                                return {
                                  ...prev,
                                  [category.key]:
                                    Object.keys(nextCategory).length > 0
                                      ? nextCategory
                                      : undefined,
                                };
                              });
                            } else {
                              setSceneMetadata((prev) => {
                                const prevCategory =
                                  (prev as any)[
                                    category.key as keyof SceneDefinitionMetadata
                                  ] as SceneCategoryValue | undefined;
                                const nextCategory: SceneCategoryValue = {
                                  ...(prevCategory ?? {}),
                                };
                                const nextValue =
                                  text.trim().length > 0 ? text : undefined;
                                if (nextValue) {
                                  nextCategory[prop.key] = nextValue;
                                } else {
                                  delete nextCategory[prop.key];
                                }
                                return {
                                  ...prev,
                                  [category.key]:
                                    Object.keys(nextCategory).length > 0
                                      ? nextCategory
                                      : undefined,
                                };
                              });
                            }
                          }}
                          style={{ width: '100%', padding: '0.35rem' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <button
            type="submit"
            disabled={createDefinitionLoading}
            style={{ marginRight: '0.5rem' }}
          >
            {createDefinitionLoading
              ? 'Saving…'
              : isEdit
              ? 'Save changes'
              : 'Save scene'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedSpaceId) {
                onCancel();
              }
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
