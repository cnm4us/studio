import type { FormEvent } from 'react';
import type {
  ReferenceConstraintMetadata,
} from '../definitionMetadata';
import { referenceConstraintConfig } from '../config/referenceConstraints';
import type { SpaceAssetSummary } from '../App';

type ReferenceConstraintDefinitionFormViewProps = {
  mode: 'create' | 'edit';
  spaceName: string;
  selectedSpaceId: number | null;
  createDefinitionLoading: boolean;
  newConstraintName: string;
  newConstraintDescription: string;
  constraintMetadata: ReferenceConstraintMetadata;
  spaceAssets?: SpaceAssetSummary[];
  setNewConstraintName: (value: string) => void;
  setNewConstraintDescription: (value: string) => void;
  setConstraintMetadata: (
    updater:
      | ReferenceConstraintMetadata
      | ((prev: ReferenceConstraintMetadata) => ReferenceConstraintMetadata),
  ) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
};

export function ReferenceConstraintDefinitionFormView(
  props: ReferenceConstraintDefinitionFormViewProps,
) {
  const {
    mode,
    spaceName,
    selectedSpaceId,
    createDefinitionLoading,
    newConstraintName,
    newConstraintDescription,
    constraintMetadata,
    spaceAssets = [],
    setNewConstraintName,
    setNewConstraintDescription,
    setConstraintMetadata,
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
          ? `Edit reference constraint in ${spaceName}`
          : `Create reference constraint in ${spaceName}`}
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
          placeholder="Reference constraint name"
          required
          value={newConstraintName}
          onChange={(e) => setNewConstraintName(e.target.value)}
          style={{ width: '100%', padding: '0.4rem' }}
        />
        <textarea
          placeholder="Description (optional)"
          value={newConstraintDescription}
          onChange={(e) => setNewConstraintDescription(e.target.value)}
          rows={2}
          style={{ width: '100%', padding: '0.4rem' }}
        />
        <div
          style={{
            marginTop: '0.5rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid #eee',
          }}
        >
          <h3 style={{ margin: '0 0 0.25rem' }}>Constraint configuration</h3>
          <p
            style={{
              margin: '0 0 0.5rem',
              fontSize: '0.85rem',
              color: '#555',
            }}
          >
            Describe how strictly the model should follow reference images for
            identity, layout, pose, camera, and style application.
          </p>
          {referenceConstraintConfig.categories
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
                    (constraintMetadata as any)[
                      category.key as keyof ReferenceConstraintMetadata
                    ] as Record<string, unknown> | undefined;
                  const rawValue = categoryValue
                    ? (categoryValue as any)[prop.key]
                    : undefined;

                  let inputValue = '';
                  if (prop.type === 'tags') {
                    inputValue = Array.isArray(rawValue)
                      ? (rawValue as string[]).join(', ')
                      : '';
                  } else if (typeof rawValue === 'string') {
                    inputValue = rawValue;
                  }

                  const inputId = `ref-constraint-${category.key}-${prop.key}`;

                  // Special handling for reference_images category: treat fields
                  // as asset ID collections and render asset selectors.
                  if (category.key === 'reference_images') {
                    const baseCategory =
                      (constraintMetadata as any)
                        .reference_images as
                        | Record<string, unknown>
                        | undefined;
                    const rawIds = baseCategory?.[prop.key];

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

                    // Map property to asset type filter.
                    let assetTypes: string[] = [];
                    if (prop.key === 'face_reference_image_ids') {
                      assetTypes = ['character_face'];
                    } else if (prop.key === 'apparel_reference_image_ids') {
                      assetTypes = ['character_clothing'];
                    } else if (prop.key === 'character_reference_image_ids') {
                      assetTypes = [
                        'character_face',
                        'character_body',
                        'character_hair',
                        'character_full',
                        'character_prop',
                        'character_clothing',
                      ];
                    } else if (prop.key === 'scene_reference_image_ids') {
                      assetTypes = ['scene_reference'];
                    } else if (prop.key === 'style_reference_image_ids') {
                      assetTypes = ['style_reference'];
                    }

                    const availableAssets = spaceAssets.filter((asset) =>
                      assetTypes.length > 0
                        ? assetTypes.includes(asset.type)
                        : true,
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
                      setConstraintMetadata((prev) => {
                        const prevCategory =
                          (prev.reference_images as
                            | {
                                [key: string]: string | string[] | undefined;
                              }
                            | undefined) ?? {};
                        const nextCategory: {
                          [key: string]: string | string[] | undefined;
                        } = { ...prevCategory };
                        const current =
                          (nextCategory[prop.key] as string[] | undefined) ??
                          [];
                        if (!current.includes(id)) {
                          nextCategory[prop.key] = [...current, id];
                        }
                        const next: ReferenceConstraintMetadata = {
                          ...prev,
                          reference_images:
                            Object.keys(nextCategory).length > 0
                              ? nextCategory
                              : undefined,
                        };
                        return next;
                      });
                    };

                    const handleRemoveAsset = (assetId: number): void => {
                      const id = String(assetId);
                      setConstraintMetadata((prev) => {
                        const prevCategory =
                          (prev.reference_images as
                            | {
                                [key: string]: string | string[] | undefined;
                              }
                            | undefined) ?? {};
                        const nextCategory: {
                          [key: string]: string | string[] | undefined;
                        } = { ...prevCategory };
                        const current =
                          (nextCategory[prop.key] as string[] | undefined) ??
                          [];
                        const nextIds = current.filter((value) => value !== id);
                        if (nextIds.length > 0) {
                          nextCategory[prop.key] = nextIds;
                        } else {
                          delete nextCategory[prop.key];
                        }
                        const next: ReferenceConstraintMetadata = {
                          ...prev,
                          reference_images:
                            Object.keys(nextCategory).length > 0
                              ? nextCategory
                              : undefined,
                        };
                        return next;
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
                                  onClick={() => handleRemoveAsset(asset.id)}
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
                          marginBottom: '0.2rem',
                        }}
                      >
                        {prop.label}
                      </label>
                      {prop.type === 'tags' && prop.options && (
                        <>
                          <div
                            style={{
                              marginBottom: '0.25rem',
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '0.35rem',
                            }}
                          >
                            {prop.options.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() =>
                                  setConstraintMetadata((prev) => {
                                    const prevCategory =
                                      (prev as any)[
                                        category.key as keyof ReferenceConstraintMetadata
                                      ] as
                                        | Record<
                                            string,
                                            string | string[] | undefined
                                          >
                                        | undefined;
                                    const nextCategory: Record<
                                      string,
                                      string | string[] | undefined
                                    > = {
                                      ...(prevCategory ?? {}),
                                    };
                                    const current =
                                      (nextCategory[prop.key] as
                                        | string[]
                                        | undefined) ?? [];
                                    if (!current.includes(opt.value)) {
                                      nextCategory[prop.key] = [
                                        ...current,
                                        opt.value,
                                      ];
                                    }
                                    return {
                                      ...prev,
                                      [category.key]:
                                        Object.keys(nextCategory).length > 0
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
                          {Array.isArray(rawValue) &&
                            (rawValue as string[]).length > 0 && (
                              <div
                                style={{
                                  margin: '0.15rem 0 0.25rem',
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '0.25rem',
                                }}
                              >
                                {(rawValue as string[]).map((tag) => {
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
                                          setConstraintMetadata((prev) => {
                                            const prevCategory =
                                              (prev as any)[
                                                category.key as keyof ReferenceConstraintMetadata
                                              ] as
                                                | Record<
                                                    string,
                                                    string | string[] | undefined
                                                  >
                                                | undefined;
                                            const nextCategory: Record<
                                              string,
                                              string | string[] | undefined
                                            > = {
                                              ...(prevCategory ?? {}),
                                            };
                                            const current =
                                              (nextCategory[
                                                prop.key
                                              ] as string[] | undefined) ?? [];
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
                                                Object.keys(
                                                  nextCategory,
                                                ).length > 0
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
                      )}
                      {prop.type === 'enum' &&
                      prop.options &&
                      prop.options.length > 0 ? (
                        <select
                          id={inputId}
                          value={inputValue}
                          onChange={(e) => {
                            const value = e.target.value;
                            setConstraintMetadata((prev) => {
                              const prevCategory =
                                (prev as any)[
                                  category.key as keyof ReferenceConstraintMetadata
                                ] as
                                  | Record<
                                      string,
                                      string | string[] | undefined
                                    >
                                  | undefined;
                              const nextCategory: Record<
                                string,
                                string | string[] | undefined
                              > = { ...(prevCategory ?? {}) };

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
                      ) : prop.type !== 'tags' ? (
                        <input
                          id={inputId}
                          type="text"
                          value={inputValue}
                          onChange={(e) => {
                            const text = e.target.value;
                            setConstraintMetadata((prev) => {
                              const prevCategory =
                                (prev as any)[
                                  category.key as keyof ReferenceConstraintMetadata
                                ] as
                                  | Record<
                                      string,
                                      string | string[] | undefined
                                    >
                                  | undefined;
                              const nextCategory: Record<
                                string,
                                string | string[] | undefined
                              > = { ...(prevCategory ?? {}) };
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
                          }}
                          style={{ width: '100%', padding: '0.35rem' }}
                        />
                      ) : null}
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
              : 'Save reference constraint'}
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
