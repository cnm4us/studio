import type React from 'react';
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
  spaceReferenceConstraints: DefinitionSummary[];
  definitionsLoading: boolean;
  definitionsError: string | null;
  deleteDefinitionLoadingId: number | null;
  deleteDefinitionError: string | null;
  onSubmitCreateProject: (event: FormEvent) => void;
  onOpenProject: (projectId: number) => void;
  onCreateCharacter: () => void;
  onCreateScene: () => void;
  onCreateStyle: () => void;
  onCreateReferenceConstraint: () => void;
  onDeleteDefinition: (
    kind: 'character' | 'scene' | 'style' | 'reference_constraint',
    definitionId: number,
  ) => void;
  onEditDefinition: (
    kind: 'character' | 'scene' | 'style' | 'reference_constraint',
    definitionId: number,
  ) => void;
  onCloneDefinition: (
    kind: 'character' | 'scene' | 'style' | 'reference_constraint',
    definitionId: number,
  ) => void;
  onOpenAssets: () => void;
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
    spaceReferenceConstraints,
    definitionsLoading,
    definitionsError,
    deleteDefinitionLoadingId,
    deleteDefinitionError,
    onSubmitCreateProject,
    onOpenProject,
    onCreateCharacter,
    onCreateScene,
    onCreateStyle,
    onCreateReferenceConstraint,
    onDeleteDefinition,
    onEditDefinition,
    onCloneDefinition,
    onOpenAssets,
  } = props;

  const primaryActionButtonStyle: React.CSSProperties = {
    backgroundColor: '#800020',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '0.4rem 0.8rem',
    cursor: 'pointer',
  };

  const renderDefinitionRow = (
    label: string,
    kind: 'character' | 'scene' | 'style' | 'reference_constraint',
    items: DefinitionSummary[],
  ): React.ReactElement | null => {
    if (items.length === 0) {
      return null;
    }

    return (
      <div
        style={{
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: '1.05rem',
            marginBottom: '0.5rem',
          }}
        >
          {label}
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                flex: '1 1 calc(33.333% - 0.75rem)',
                minWidth: '220px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                padding: '0.5rem 0.75rem',
                backgroundColor: '#fafafa',
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: '0.25rem',
                }}
              >
                {item.name}
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#777',
                  marginBottom: '0.4rem',
                }}
              >
                {item.isCanonical ? 'Canonical' : 'Draft'}
                {item.isLocked ? ' · Locked' : ''}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.4rem',
                  fontSize: '0.8rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => onCloneDefinition(kind, item.id)}
                  style={{ fontSize: '0.8rem' }}
                >
                  Clone
                </button>
                {!item.isLocked && (
                  <button
                    type="button"
                    onClick={() => onEditDefinition(kind, item.id)}
                    style={{ fontSize: '0.8rem' }}
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDeleteDefinition(kind, item.id)}
                  disabled={
                    deleteDefinitionLoadingId === item.id || item.isLocked
                  }
                  style={{ fontSize: '0.8rem' }}
                >
                  {deleteDefinitionLoadingId === item.id
                    ? 'Deleting…'
                    : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
          Space assets (characters, scenes, styles & constraints)
        </h3>

        <div
          style={{
            marginBottom: '0.75rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <button
            type="button"
            onClick={onCreateCharacter}
            style={primaryActionButtonStyle}
          >
            Character +
          </button>
          <button
            type="button"
            onClick={onCreateScene}
            style={primaryActionButtonStyle}
          >
            Scene +
          </button>
          <button
            type="button"
            onClick={onCreateStyle}
            style={primaryActionButtonStyle}
          >
            Style +
          </button>
          <button
            type="button"
            onClick={onCreateReferenceConstraint}
            style={primaryActionButtonStyle}
          >
            Reference Constraint +
          </button>
          <button
            type="button"
            onClick={onOpenAssets}
            style={primaryActionButtonStyle}
          >
            Assets +
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
          spaceScenes.length === 0 &&
          spaceStyles.length === 0 &&
          spaceReferenceConstraints.length === 0 && (
            <p>
              No characters, scenes, styles, or reference constraints yet in
              this space. Create some above.
            </p>
          )}

        {!definitionsLoading &&
          (spaceCharacters.length > 0 ||
            spaceScenes.length > 0 ||
            spaceStyles.length > 0 ||
            spaceReferenceConstraints.length > 0) && (
            <div style={{ marginBottom: '1rem' }}>
              {renderDefinitionRow('Characters', 'character', spaceCharacters)}
              {renderDefinitionRow('Scenes', 'scene', spaceScenes)}
              {renderDefinitionRow('Styles', 'style', spaceStyles)}
              {renderDefinitionRow(
                'Reference Constraints',
                'reference_constraint',
                spaceReferenceConstraints,
              )}
            </div>
          )}
      </div>
    </div>
  );
}
