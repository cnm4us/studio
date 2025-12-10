import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import './App.css';

type PublicUser = {
  id: number;
  email: string;
};

type SpaceSummary = {
  id: number;
  name: string;
  description?: string | null;
  createdAt?: string;
};

type ProjectSummary = {
  id: number;
  name: string;
  description?: string | null;
  createdAt?: string;
};

type DefinitionSummary = {
  id: number;
  type: 'character' | 'scene';
  scope: 'space' | 'project';
  name: string;
  description?: string | null;
  state: 'draft' | 'canonical' | 'deprecated' | 'archived';
  rootId?: number | null;
  parentId?: number | null;
  createdAt?: string;
};

type TaskSummary = {
  id: number;
  name: string;
  description: string | null;
  prompt: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
};

type RenderedAssetSummary = {
  id: number;
  project_id: number;
  task_id: number;
  type: string;
  file_key: string;
  file_url: string;
  state: 'draft' | 'approved' | 'archived';
};

type AuthMode = 'login' | 'register';

function App() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [spacesError, setSpacesError] = useState<string | null>(null);

  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceDescription, setNewSpaceDescription] = useState('');
  const [createSpaceLoading, setCreateSpaceLoading] = useState(false);
  const [createSpaceError, setCreateSpaceError] = useState<string | null>(null);

  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [createProjectLoading, setCreateProjectLoading] = useState(false);
  const [createProjectError, setCreateProjectError] = useState<string | null>(
    null,
  );
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null,
  );

  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskPrompt, setNewTaskPrompt] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [createTaskLoading, setCreateTaskLoading] = useState(false);
  const [createTaskError, setCreateTaskError] = useState<string | null>(null);
  const [renderingTaskId, setRenderingTaskId] = useState<number | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const [renderedAssets, setRenderedAssets] = useState<RenderedAssetSummary[]>(
    [],
  );
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);

  const [spaceCharacters, setSpaceCharacters] = useState<DefinitionSummary[]>(
    [],
  );
  const [spaceScenes, setSpaceScenes] = useState<DefinitionSummary[]>([]);
  const [definitionsLoading, setDefinitionsLoading] = useState(false);
  const [definitionsError, setDefinitionsError] = useState<string | null>(null);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [newCharacterDescription, setNewCharacterDescription] =
    useState('');
  const [newSceneName, setNewSceneName] = useState('');
  const [newSceneDescription, setNewSceneDescription] = useState('');
  const [createDefinitionLoading, setCreateDefinitionLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const loadCurrentUser = async (): Promise<void> => {
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.status === 401) {
        setUser(null);
        return;
      }
      if (!res.ok) {
        throw new Error('AUTH_ME_FAILED');
      }
      const data = (await res.json()) as { user: PublicUser };
      setUser(data.user);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to check auth status.';
      setAuthError(message);
      setUser(null);
    }
  };

  const loadSpaces = async (): Promise<void> => {
    setSpacesLoading(true);
    setSpacesError(null);
    try {
      const res = await fetch('/api/spaces', { credentials: 'include' });
      if (res.status === 401) {
        setUser(null);
        setSpaces([]);
        return;
      }
      if (!res.ok) {
        throw new Error('SPACES_FETCH_FAILED');
      }
      const data = (await res.json()) as { spaces: SpaceSummary[] };
      setSpaces(data.spaces);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load spaces.';
      setSpacesError(message);
    } finally {
      setSpacesLoading(false);
    }
  };

  const loadProjects = async (spaceId: number): Promise<void> => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const res = await fetch(`/api/spaces/${spaceId}/projects`, {
        credentials: 'include',
      });
      if (res.status === 401) {
        setUser(null);
        setSpaces([]);
        setProjects([]);
        return;
      }
      if (res.status === 404) {
        setProjects([]);
        setProjectsError('Space not found or not owned by this user.');
        return;
      }
      if (!res.ok) {
        throw new Error('PROJECTS_FETCH_FAILED');
      }
      const data = (await res.json()) as { projects: ProjectSummary[] };
      setProjects(data.projects);
      if (!selectedProjectId && data.projects.length > 0) {
        const firstProject = data.projects[0];
        setSelectedProjectId(firstProject.id);
        void loadProjectTasks(firstProject.id);
        void loadRenderedAssets(firstProject.id);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load projects.';
      setProjectsError(message);
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadProjectTasks = async (projectId: number): Promise<void> => {
    setTasksLoading(true);
    setTasksError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        credentials: 'include',
      });
      if (res.status === 401) {
        setUser(null);
        setSpaces([]);
        setProjects([]);
        setTasks([]);
        setRenderedAssets([]);
        return;
      }
      if (res.status === 404) {
        setTasks([]);
        setTasksError('Project not found or not owned by this user.');
        return;
      }
      if (!res.ok) {
        throw new Error('TASKS_FETCH_FAILED');
      }
      const data = (await res.json()) as { tasks: TaskSummary[] };
      setTasks(data.tasks ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load tasks.';
      setTasksError(message);
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  const loadRenderedAssets = async (projectId: number): Promise<void> => {
    setAssetsLoading(true);
    setAssetsError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/rendered-assets`, {
        credentials: 'include',
      });
      if (res.status === 401) {
        setUser(null);
        setSpaces([]);
        setProjects([]);
        setTasks([]);
        setRenderedAssets([]);
        return;
      }
      if (res.status === 404) {
        setRenderedAssets([]);
        setAssetsError('Project not found or not owned by this user.');
        return;
      }
      if (!res.ok) {
        throw new Error('RENDERED_ASSETS_FETCH_FAILED');
      }
      const data = (await res.json()) as {
        assets: RenderedAssetSummary[];
      };
      setRenderedAssets(data.assets ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load rendered assets.';
      setAssetsError(message);
      setRenderedAssets([]);
    } finally {
      setAssetsLoading(false);
    }
  };

  const loadDefinitions = async (spaceId: number): Promise<void> => {
    setDefinitionsLoading(true);
    setDefinitionsError(null);
    try {
      const [charsRes, scenesRes] = await Promise.all([
        fetch(`/api/spaces/${spaceId}/characters`, {
          credentials: 'include',
        }),
        fetch(`/api/spaces/${spaceId}/scenes`, {
          credentials: 'include',
        }),
      ]);

      if (charsRes.status === 401 || scenesRes.status === 401) {
        setUser(null);
        setSpaces([]);
        setSpaceCharacters([]);
        setSpaceScenes([]);
        return;
      }

      if (charsRes.status === 404 || scenesRes.status === 404) {
        setSpaceCharacters([]);
        setSpaceScenes([]);
        setDefinitionsError('Space not found or not owned by this user.');
        return;
      }

      if (!charsRes.ok || !scenesRes.ok) {
        throw new Error('DEFINITIONS_FETCH_FAILED');
      }

      const charsBody = (await charsRes.json()) as {
        characters: DefinitionSummary[];
      };
      const scenesBody = (await scenesRes.json()) as {
        scenes: DefinitionSummary[];
      };

      setSpaceCharacters(charsBody.characters ?? []);
      setSpaceScenes(scenesBody.scenes ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load definitions.';
      setDefinitionsError(message);
      setSpaceCharacters([]);
      setSpaceScenes([]);
    } finally {
      setDefinitionsLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadCurrentUser();
    })();
  }, []);

  useEffect(() => {
    if (user) {
      void loadSpaces();
    } else {
      setSpaces([]);
      setSelectedSpaceId(null);
      setProjects([]);
      setSelectedProjectId(null);
      setTasks([]);
      setRenderedAssets([]);
      setSpaceCharacters([]);
      setSpaceScenes([]);
    }
  }, [user]);

  const isAuthenticated = Boolean(user);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    if (!selectedSpaceId && spaces.length > 0) {
      const first = spaces[0];
      setSelectedSpaceId(first.id);
      void loadProjects(first.id);
      void loadDefinitions(first.id);
    }
  }, [isAuthenticated, selectedSpaceId, spaces]);

  const handleAuthSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const endpoint =
        authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
        }),
      });

      const body = (await res.json().catch(() => null)) as
        | { user?: PublicUser; error?: string }
        | null;

      if (!res.ok) {
        const code = body?.error;
        if (code === 'EMAIL_TAKEN') {
          setAuthError('That email address is already in use.');
        } else if (code === 'INVALID_CREDENTIALS') {
          setAuthError('Invalid email or password.');
        } else if (code === 'EMAIL_AND_PASSWORD_REQUIRED') {
          setAuthError('Email and password are required.');
        } else if (code === 'PASSWORD_TOO_SHORT') {
          setAuthError('Password is too short (minimum 8 characters).');
        } else {
          setAuthError('Authentication failed. Please try again.');
        }
        setUser(null);
        return;
      }

      if (!body?.user) {
        setAuthError('Authentication succeeded but no user was returned.');
        setUser(null);
        return;
      }

      setUser(body.user);
      setAuthEmail(body.user.email);
      setAuthPassword('');
      setAuthMode('login');
      await loadSpaces();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Authentication request failed.';
      setAuthError(message);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async (): Promise<void> => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore network errors on logout; treat as logged out locally
    } finally {
      setUser(null);
      setSpaces([]);
      setAuthLoading(false);
    }
  };

  const handleCreateSpace = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!user) return;

    setCreateSpaceError(null);
    setCreateSpaceLoading(true);

    try {
      const res = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newSpaceName,
          description: newSpaceDescription || null,
        }),
      });

      const body = (await res.json().catch(() => null)) as
        | { space?: SpaceSummary; error?: string }
        | null;

      if (!res.ok) {
        const code = body?.error;
        if (code === 'NAME_REQUIRED') {
          setCreateSpaceError('Space name is required.');
        } else if (code === 'SPACE_NAME_TAKEN') {
          setCreateSpaceError('You already have a space with that name.');
        } else if (code === 'UNAUTHENTICATED') {
          setCreateSpaceError('You must be logged in to create spaces.');
          setUser(null);
          setSpaces([]);
        } else {
          setCreateSpaceError('Failed to create space.');
        }
        return;
      }

      if (!body?.space) {
        setCreateSpaceError('Space was created but not returned.');
        return;
      }

      setSpaces((prev) => [body.space as SpaceSummary, ...prev]);
      setNewSpaceName('');
      setNewSpaceDescription('');

      if (!selectedSpaceId) {
        const created = body.space as SpaceSummary;
        setSelectedSpaceId(created.id);
        void loadProjects(created.id);
        void loadDefinitions(created.id);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create space.';
      setCreateSpaceError(message);
    } finally {
      setCreateSpaceLoading(false);
    }
  };

  const handleSelectSpace = (spaceId: number): void => {
    setSelectedSpaceId(spaceId);
    setProjects([]);
    setSelectedProjectId(null);
    setTasks([]);
    setRenderedAssets([]);
    setSpaceCharacters([]);
    setSpaceScenes([]);
    void loadProjects(spaceId);
    void loadDefinitions(spaceId);
  };

  const handleCreateProject = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!user || !selectedSpaceId) return;

    setCreateProjectError(null);
    setCreateProjectLoading(true);

    try {
      const res = await fetch(`/api/spaces/${selectedSpaceId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription || null,
        }),
      });

      const body = (await res.json().catch(() => null)) as
        | { project?: ProjectSummary; error?: string }
        | null;

      if (!res.ok) {
        const code = body?.error;
        if (code === 'NAME_REQUIRED') {
          setCreateProjectError('Project name is required.');
        } else if (code === 'PROJECT_NAME_TAKEN') {
          setCreateProjectError('You already have a project with that name.');
        } else if (code === 'UNAUTHENTICATED') {
          setCreateProjectError('You must be logged in to create projects.');
          setUser(null);
          setSpaces([]);
          setProjects([]);
        } else if (code === 'SPACE_NOT_FOUND') {
          setCreateProjectError('Space not found or not owned by this user.');
        } else {
          setCreateProjectError('Failed to create project.');
        }
        return;
      }

      if (!body?.project) {
        setCreateProjectError('Project was created but not returned.');
        return;
      }

      setProjects((prev) => [body.project as ProjectSummary, ...prev]);
      setNewProjectName('');
      setNewProjectDescription('');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create project.';
      setCreateProjectError(message);
    } finally {
      setCreateProjectLoading(false);
    }
  };

  const handleSelectProject = (projectId: number): void => {
    setSelectedProjectId(projectId);
    void loadProjectTasks(projectId);
    void loadRenderedAssets(projectId);
  };

  const handleCreateDefinition = async (
    event: FormEvent,
    kind: 'character' | 'scene',
  ): Promise<void> => {
    event.preventDefault();
    if (!user || !selectedSpaceId) return;

    setCreateDefinitionLoading(true);

    const isCharacter = kind === 'character';
    const name = isCharacter ? newCharacterName : newSceneName;
    const description = isCharacter
      ? newCharacterDescription
      : newSceneDescription;

    try {
      const res = await fetch(
        `/api/spaces/${selectedSpaceId}/${isCharacter ? 'characters' : 'scenes'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name,
            description: description || null,
          }),
        },
      );

      const body = (await res.json().catch(() => null)) as
        | { character?: DefinitionSummary; scene?: DefinitionSummary; error?: string }
        | null;

      if (!res.ok) {
        const code = body?.error;
        if (code === 'NAME_REQUIRED') {
          // handled by required input; keep message generic in console only
        } else if (code === 'UNAUTHENTICATED') {
          setUser(null);
          setSpaces([]);
          setSpaceCharacters([]);
          setSpaceScenes([]);
        } else if (code === 'SPACE_NOT_FOUND') {
          // space no longer accessible; leave to reload UX
        } else {
          // eslint-disable-next-line no-console
          console.error('[definitions] Create definition error code:', code);
        }
        return;
      }

      if (isCharacter && body?.character) {
        setSpaceCharacters((prev) => [body.character as DefinitionSummary, ...prev]);
        setNewCharacterName('');
        setNewCharacterDescription('');
      } else if (!isCharacter && body?.scene) {
        setSpaceScenes((prev) => [body.scene as DefinitionSummary, ...prev]);
        setNewSceneName('');
        setNewSceneDescription('');
      } else {
        // eslint-disable-next-line no-console
        console.error('Definition was created but not returned.');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create definition.';
      // eslint-disable-next-line no-console
      console.error('[definitions] Create definition error:', message);
    } finally {
      setCreateDefinitionLoading(false);
    }
  };

  const handleImportDefinitionsToProject = async (
    event: FormEvent,
  ): Promise<void> => {
    event.preventDefault();
    if (!user || !selectedSpaceId || !selectedProjectId) return;

    setImportError(null);
    setImportLoading(true);

    try {
      const characterIds = spaceCharacters.map((c) => c.id);
      const sceneIds = spaceScenes.map((s) => s.id);

      if (characterIds.length === 0 && sceneIds.length === 0) {
        setImportError('No space-level characters or scenes to import.');
        setImportLoading(false);
        return;
      }

      const res = await fetch(
        `/api/projects/${selectedProjectId}/import`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            characters: characterIds,
            scenes: sceneIds,
          }),
        },
      );

      const body = (await res.json().catch(() => null)) as
        | {
            imported?: {
              characters?: DefinitionSummary[];
              scenes?: DefinitionSummary[];
            };
            error?: string;
          }
        | null;

      if (!res.ok) {
        const code = body?.error;
        if (code === 'NO_DEFINITIONS_PROVIDED') {
          setImportError('No definitions were selected for import.');
        } else if (code === 'UNAUTHENTICATED') {
          setImportError('You must be logged in to import definitions.');
          setUser(null);
          setSpaces([]);
          setSpaceCharacters([]);
          setSpaceScenes([]);
        } else if (code === 'PROJECT_NOT_FOUND') {
          setImportError('Project not found or not owned by this user.');
        } else if (code === 'DEFINITION_NOT_FOUND_FOR_SPACE') {
          setImportError(
            'One or more definitions could not be found for this space.',
          );
        } else {
          setImportError('Failed to import definitions into project.');
        }
        return;
      }

      if (!body?.imported) {
        setImportError('Definitions were imported but not returned.');
        return;
      }

      // For now we do not surface project-level definitions in the UI,
      // but the import has succeeded at the API level.
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to import definitions.';
      setImportError(message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleCreateTask = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!user || !selectedProjectId) return;

    setCreateTaskError(null);
    setCreateTaskLoading(true);

    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newTaskName,
          description: newTaskDescription || null,
          prompt: newTaskPrompt || null,
        }),
      });

      const body = (await res.json().catch(() => null)) as
        | { task?: TaskSummary; error?: string }
        | null;

      if (!res.ok) {
        const code = body?.error;
        if (code === 'NAME_REQUIRED') {
          setCreateTaskError('Task name is required.');
        } else if (code === 'UNAUTHENTICATED') {
          setCreateTaskError('You must be logged in to create tasks.');
          setUser(null);
          setSpaces([]);
          setProjects([]);
          setTasks([]);
          setRenderedAssets([]);
        } else if (code === 'PROJECT_NOT_FOUND') {
          setCreateTaskError('Project not found or not owned by this user.');
        } else {
          setCreateTaskError('Failed to create task.');
        }
        return;
      }

      if (!body?.task) {
        setCreateTaskError('Task was created but not returned.');
        return;
      }

      setTasks((prev) => [body.task as TaskSummary, ...prev]);
      setNewTaskName('');
      setNewTaskPrompt('');
      setNewTaskDescription('');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create task.';
      setCreateTaskError(message);
    } finally {
      setCreateTaskLoading(false);
    }
  };

  const handleRenderTask = async (taskId: number): Promise<void> => {
    if (!user) return;

    setRenderError(null);
    setRenderingTaskId(taskId);

    try {
      const res = await fetch(`/api/tasks/${taskId}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      const body = (await res.json().catch(() => null)) as
        | {
            task?: TaskSummary;
            renderedAssets?: RenderedAssetSummary[];
            error?: string;
          }
        | null;

      if (!res.ok) {
        const code = body?.error;
        if (code === 'UNAUTHENTICATED') {
          setRenderError('You must be logged in to render tasks.');
          setUser(null);
          setSpaces([]);
          setProjects([]);
          setTasks([]);
          setRenderedAssets([]);
        } else if (code === 'TASK_NOT_FOUND') {
          setRenderError('Task not found or not owned by this user.');
        } else if (
          code === 'GEMINI_NOT_CONFIGURED' ||
          code === 'GEMINI_NO_IMAGE_RETURNED'
        ) {
          setRenderError(
            'Image generation is not configured or returned no image.',
          );
        } else if (code === 'S3_NOT_CONFIGURED') {
          setRenderError('S3 is not configured for uploads.');
        } else {
          setRenderError('Failed to render task.');
        }
        return;
      }

      if (body?.task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === body.task?.id ? (body.task as TaskSummary) : t)),
        );
      }

      if (body?.renderedAssets && body.renderedAssets.length > 0) {
        setRenderedAssets((prev) => [
          ...body.renderedAssets!,
          ...prev,
        ]);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to render task.';
      setRenderError(message);
    } finally {
      setRenderingTaskId(null);
    }
  };

  return (
    <main
      style={{
        padding: '1.5rem',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        maxWidth: '900px',
        margin: '0 auto',
      }}
    >
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Studio</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#555' }}>
            Minimal auth & spaces skeleton.
          </p>
        </div>
        {user && (
          <div style={{ textAlign: 'right', fontSize: '0.9rem' }}>
            <div>Signed in as</div>
            <div style={{ fontWeight: 600 }}>{user.email}</div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={authLoading}
              style={{ marginTop: '0.5rem' }}
            >
              {authLoading ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        )}
      </header>

      <section
        style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Account</h2>
        {!isAuthenticated && (
          <>
            <div style={{ marginBottom: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                disabled={authMode === 'login'}
                style={{
                  marginRight: '0.5rem',
                  padding: '0.4rem 0.75rem',
                  backgroundColor:
                    authMode === 'login' ? '#222' : 'transparent',
                  color: authMode === 'login' ? '#fff' : '#222',
                  border: '1px solid #222',
                  borderRadius: '4px',
                  cursor: authMode === 'login' ? 'default' : 'pointer',
                }}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                disabled={authMode === 'register'}
                style={{
                  padding: '0.4rem 0.75rem',
                  backgroundColor:
                    authMode === 'register' ? '#222' : 'transparent',
                  color: authMode === 'register' ? '#fff' : '#222',
                  border: '1px solid #222',
                  borderRadius: '4px',
                  cursor: authMode === 'register' ? 'default' : 'pointer',
                }}
              >
                Register
              </button>
            </div>

            {authError && (
              <p style={{ color: 'red', marginBottom: '0.75rem' }}>
                {authError}
              </p>
            )}

            <form onSubmit={handleAuthSubmit}>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem' }}
                />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem' }}
                />
              </div>
              <button type="submit" disabled={authLoading}>
                {authLoading
                  ? authMode === 'login'
                    ? 'Logging in…'
                    : 'Registering…'
                  : authMode === 'login'
                  ? 'Log in'
                  : 'Register'}
              </button>
            </form>
          </>
        )}
        {isAuthenticated && (
          <p style={{ marginBottom: 0 }}>
            You are signed in. Use the Spaces section below to manage your
            spaces.
          </p>
        )}
      </section>

      <section
        style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '1rem',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Spaces, Projects & Assets</h2>
        {!isAuthenticated && (
          <p style={{ color: '#555' }}>
            Log in or register to view and create spaces.
          </p>
        )}
        {isAuthenticated && (
          <>
            <form
              onSubmit={handleCreateSpace}
              style={{ marginBottom: '1rem', display: 'grid', gap: '0.5rem' }}
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
              <>
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
                        onClick={() => handleSelectSpace(space.id)}
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

                {selectedSpaceId && (
                  <div
                    style={{
                      marginTop: '1.5rem',
                      borderTop: '1px solid #eee',
                      paddingTop: '1rem',
                    }}
                  >
                    <h3 style={{ marginTop: 0 }}>Projects in selected space</h3>
                    <form
                      onSubmit={handleCreateProject}
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
                          onChange={(e) =>
                            setNewProjectDescription(e.target.value)
                          }
                          rows={2}
                          style={{ width: '100%', padding: '0.4rem' }}
                        />
                      </div>
                      {createProjectError && (
                        <p style={{ color: 'red', margin: 0 }}>
                          {createProjectError}
                        </p>
                      )}
                      <div>
                        <button type="submit" disabled={createProjectLoading}>
                          {createProjectLoading
                            ? 'Creating…'
                            : 'Create project'}
                        </button>
                      </div>
                    </form>

                    {projectsLoading && <p>Loading projects…</p>}
                    {projectsError && (
                      <p style={{ color: 'red', marginTop: 0 }}>
                        {projectsError}
                      </p>
                    )}
                    {!projectsLoading &&
                      !projectsError &&
                      projects.length === 0 && (
                        <p>
                          No projects yet in this space. Create your first one
                          above.
                        </p>
                      )}
                    {!projectsLoading &&
                      !projectsError &&
                      projects.length > 0 && (
                        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                          {projects.map((project) => (
                            <li
                              key={project.id}
                              style={{
                                padding: '0.5rem 0',
                                borderBottom: '1px solid #eee',
                                cursor: 'pointer',
                                backgroundColor:
                                  selectedProjectId === project.id
                                    ? '#f0f0f0'
                                    : 'transparent',
                              }}
                              onClick={() => handleSelectProject(project.id)}
                            >
                              <div style={{ fontWeight: 600 }}>
                                {project.name}
                              </div>
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
                    {selectedSpaceId && (
                      <div
                        style={{
                          marginTop: '1.5rem',
                          borderTop: '1px solid #eee',
                          paddingTop: '1rem',
                        }}
                      >
                        <h3 style={{ marginTop: 0 }}>
                          Space assets (characters & scenes)
                        </h3>

                        {definitionsError && (
                          <p style={{ color: 'red', marginTop: 0 }}>
                            {definitionsError}
                          </p>
                        )}

                        <form
                          onSubmit={(e) => handleCreateDefinition(e, 'character')}
                          style={{
                            marginBottom: '0.75rem',
                            display: 'grid',
                            gap: '0.4rem',
                          }}
                        >
                          <strong>New character</strong>
                          <input
                            type="text"
                            placeholder="Character name"
                            required
                            value={newCharacterName}
                            onChange={(e) =>
                              setNewCharacterName(e.target.value)
                            }
                            style={{ width: '100%', padding: '0.4rem' }}
                          />
                          <textarea
                            placeholder="Description (optional)"
                            value={newCharacterDescription}
                            onChange={(e) =>
                              setNewCharacterDescription(e.target.value)
                            }
                            rows={2}
                            style={{ width: '100%', padding: '0.4rem' }}
                          />
                          <button
                            type="submit"
                            disabled={createDefinitionLoading}
                          >
                            {createDefinitionLoading
                              ? 'Creating…'
                              : 'Add character'}
                          </button>
                        </form>

                        <form
                          onSubmit={(e) => handleCreateDefinition(e, 'scene')}
                          style={{
                            marginBottom: '0.75rem',
                            display: 'grid',
                            gap: '0.4rem',
                          }}
                        >
                          <strong>New scene</strong>
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
                            onChange={(e) =>
                              setNewSceneDescription(e.target.value)
                            }
                            rows={2}
                            style={{ width: '100%', padding: '0.4rem' }}
                          />
                          <button
                            type="submit"
                            disabled={createDefinitionLoading}
                          >
                            {createDefinitionLoading
                              ? 'Creating…'
                              : 'Add scene'}
                          </button>
                        </form>

                        {definitionsLoading && <p>Loading assets…</p>}
                        {!definitionsLoading &&
                          !definitionsError &&
                          spaceCharacters.length === 0 &&
                          spaceScenes.length === 0 && (
                            <p>
                              No characters or scenes yet in this space. Create
                              some above.
                            </p>
                          )}

                        {!definitionsLoading &&
                          (spaceCharacters.length > 0 ||
                            spaceScenes.length > 0) && (
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
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
                                      <div style={{ fontWeight: 600 }}>
                                        {c.name}
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
                                      <div style={{ fontWeight: 600 }}>
                                        {s.name}
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

                        {selectedProjectId && (
                          <div
                            style={{
                              marginTop: '1rem',
                              borderTop: '1px solid #eee',
                              paddingTop: '1rem',
                            }}
                          >
                            <form onSubmit={handleImportDefinitionsToProject}>
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
                              <h4 style={{ marginTop: 0 }}>
                                Tasks & renders for selected project
                              </h4>

                              <form
                                onSubmit={handleCreateTask}
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
                                    onChange={(e) =>
                                      setNewTaskName(e.target.value)
                                    }
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
                                    onChange={(e) =>
                                      setNewTaskPrompt(e.target.value)
                                    }
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
                                    onChange={(e) =>
                                      setNewTaskDescription(e.target.value)
                                    }
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
                                  >
                                    {createTaskLoading
                                      ? 'Creating…'
                                      : 'Create task'}
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
                              {!tasksLoading &&
                                !tasksError &&
                                tasks.length === 0 && (
                                  <p>
                                    No tasks yet for this project. Create one
                                    above.
                                  </p>
                                )}
                              {!tasksLoading &&
                                !tasksError &&
                                tasks.length > 0 && (
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
                                          <div style={{ fontWeight: 600 }}>
                                            {task.name}
                                          </div>
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
                                            onClick={() =>
                                              void handleRenderTask(task.id)
                                            }
                                            disabled={
                                              renderingTaskId === task.id ||
                                              task.status === 'running'
                                            }
                                          >
                                            {renderingTaskId === task.id
                                              ? 'Rendering…'
                                              : 'Render'}
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
                                <h5 style={{ marginTop: 0 }}>
                                  Rendered assets
                                </h5>

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
                                  renderedAssets.length === 0 && (
                                    <p>
                                      No rendered assets yet for this project.
                                      Run a render above.
                                    </p>
                                  )}
                                {!assetsLoading &&
                                  !assetsError &&
                                  renderedAssets.length > 0 && (
                                    <div
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns:
                                          'repeat(auto-fill, minmax(150px, 1fr))',
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
                                            <a
                                              href={asset.file_url}
                                              target="_blank"
                                              rel="noreferrer"
                                            >
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
                                            <a
                                              href={asset.file_url}
                                              target="_blank"
                                              rel="noreferrer"
                                            >
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
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default App;
