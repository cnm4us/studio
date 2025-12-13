import type { FormEvent } from 'react';
import { useState } from 'react';
import type { SpaceAssetSummary } from '../App';

type SpaceAssetsViewProps = {
  spaceId: number;
  spaceName: string;
  assets: SpaceAssetSummary[];
  loading: boolean;
  error: string | null;
  uploadLoading: boolean;
  uploadError: string | null;
  onReload: (type?: string) => void;
  onUpload: (payload: { name: string; type: string; file: File }) => void;
  onDelete: (assetId: number) => void;
};

const ASSET_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'character_face', label: 'Character · Face reference' },
  { value: 'character_body', label: 'Character · Body reference' },
  { value: 'character_hair', label: 'Character · Hair reference' },
  { value: 'character_full', label: 'Character · Full-character reference' },
  { value: 'character_prop', label: 'Character · Prop reference' },
  { value: 'character_clothing', label: 'Character · Clothing reference' },
  { value: 'scene_reference', label: 'Scene reference' },
  { value: 'style_reference', label: 'Style reference' },
];

export function SpaceAssetsView(props: SpaceAssetsViewProps) {
  const {
    spaceId,
    spaceName,
    assets,
    loading,
    error,
    uploadLoading,
    uploadError,
    onReload,
    onUpload,
    onDelete,
  } = props;

  const [filterType, setFilterType] = useState<string>('');
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewAsset, setPreviewAsset] = useState<SpaceAssetSummary | null>(
    null,
  );

  const handleFilterChange = (value: string): void => {
    setFilterType(value);
    onReload(value || undefined);
  };

  const handleSubmitUpload = (event: FormEvent): void => {
    event.preventDefault();
    if (!uploadFile || !uploadName || !uploadType) {
      return;
    }
    onUpload({
      name: uploadName,
      type: uploadType,
      file: uploadFile,
    });
    // Leave the list to be refreshed by parent state; clear local inputs.
    setUploadName('');
    setUploadType('');
    setUploadFile(null);
    const fileInput = document.getElementById(
      `space-${spaceId}-asset-file-input`,
    ) as HTMLInputElement | null;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const filteredAssets =
    filterType && filterType.trim().length > 0
      ? assets.filter((asset) => asset.type === filterType)
      : assets;

  const groupedByType: Record<string, SpaceAssetSummary[]> = {};
  for (const asset of filteredAssets) {
    if (!groupedByType[asset.type]) {
      groupedByType[asset.type] = [];
    }
    groupedByType[asset.type].push(asset);
  }

  return (
    <div
      style={{
        marginTop: '1rem',
        borderTop: '1px solid #eee',
        paddingTop: '1rem',
      }}
    >
      <h3 style={{ marginTop: 0 }}>Assets for {spaceName}</h3>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '0.75rem',
          alignItems: 'center',
        }}
      >
        <div>
          <label
            htmlFor="space-assets-type-filter"
            style={{
              display: 'block',
              marginBottom: '0.25rem',
              fontSize: '0.85rem',
            }}
          >
            Filter by type
          </label>
          <select
            id="space-assets-type-filter"
            value={filterType}
            onChange={(e) => handleFilterChange(e.target.value)}
            style={{ padding: '0.3rem', minWidth: '240px' }}
          >
            <option value="">All types</option>
            {ASSET_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => onReload(filterType || undefined)}
          disabled={loading}
          style={{ padding: '0.3rem 0.75rem' }}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <form
        onSubmit={handleSubmitUpload}
        style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          border: '1px solid #eee',
          borderRadius: '6px',
          display: 'grid',
          gap: '0.5rem',
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '0.25rem',
              fontSize: '0.85rem',
            }}
          >
            Asset name
          </label>
          <input
            type="text"
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            required
            style={{ width: '100%', padding: '0.35rem' }}
          />
        </div>
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '0.25rem',
              fontSize: '0.85rem',
            }}
          >
            Asset type
          </label>
          <select
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value)}
            required
            style={{ width: '100%', padding: '0.35rem' }}
          >
            <option value="">Select type…</option>
            {ASSET_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '0.25rem',
              fontSize: '0.85rem',
            }}
          >
            Image file
          </label>
          <input
            id={`space-${spaceId}-asset-file-input`}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files && e.target.files[0];
              setUploadFile(file ?? null);
            }}
            required
          />
        </div>
        {uploadError && (
          <p style={{ color: 'red', margin: 0 }}>{uploadError}</p>
        )}
        <div>
          <button type="submit" disabled={uploadLoading}>
            {uploadLoading ? 'Uploading…' : 'Upload asset'}
          </button>
        </div>
      </form>

      {error && (
        <p style={{ color: 'red', marginTop: 0, marginBottom: '0.5rem' }}>
          {error}
        </p>
      )}

      {loading && assets.length === 0 && <p>Loading assets…</p>}

      {!loading && assets.length === 0 && !error && (
        <p style={{ color: '#555' }}>
          No assets uploaded yet for this space. Use the form above to add
          character, scene, or style reference images.
        </p>
      )}

      {!loading && assets.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
          }}
        >
          {Object.entries(groupedByType).map(([type, typeAssets]) => {
            const label =
              ASSET_TYPE_OPTIONS.find((opt) => opt.value === type)?.label ??
              type;
            return (
              <div key={type}>
                <strong>{label}</strong>
                <ul
                  style={{
                    listStyle: 'none',
                    paddingLeft: 0,
                    marginTop: '0.5rem',
                  }}
                >
                  {typeAssets.map((asset) => (
                    <li
                      key={asset.id}
                      style={{
                        padding: '0.4rem 0',
                        borderBottom: '1px solid #eee',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setPreviewAsset(asset)}
                          style={{
                            border: 'none',
                            padding: 0,
                            background: 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <img
                            src={asset.fileUrl}
                            alt={asset.name}
                            style={{
                              width: '72px',
                              height: '72px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              border: '1px solid #ddd',
                            }}
                          />
                        </button>
                        <div>
                          <div style={{ fontWeight: 600 }}>{asset.name}</div>
                          {asset.createdAt && (
                            <div
                              style={{
                                fontSize: '0.8rem',
                                color: '#777',
                              }}
                            >
                              Created{' '}
                              {new Date(asset.createdAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => onDelete(asset.id)}
                          style={{ fontSize: '0.8rem' }}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
      {previewAsset && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={() => setPreviewAsset(null)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              padding: '0.75rem',
              borderRadius: '6px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              >
                {previewAsset.name}
              </div>
              <button
                type="button"
                onClick={() => setPreviewAsset(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                }}
              >
                ×
              </button>
            </div>
            <img
              src={previewAsset.fileUrl}
              alt={previewAsset.name}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                display: 'block',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
