import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import './App.css';
import { DashboardView } from './views/DashboardView';
import { ProjectView } from './views/ProjectView';
import { SpaceView } from './views/SpaceView';

type PublicUser = {
  id: number;
  email: string;
};

export type SpaceSummary = {
  id: number;
  name: string;
  description?: string | null;
  createdAt?: string;
};

export type ProjectSummary = {
  id: number;
  name: string;
  description?: string | null;
  createdAt?: string;
};

export type DefinitionSummary = {
  id: number;
  type: 'character' | 'scene' | 'style';
  scope: 'space' | 'project';
  name: string;
  description?: string | null;
  state: 'draft' | 'canonical' | 'deprecated' | 'archived';
  rootId?: number | null;
  parentId?: number | null;
  createdAt?: string;
   isCanonical?: boolean;
   isLocked?: boolean;
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

type Route =
  | { kind: 'dashboard' }
  | { kind: 'space'; spaceId: number }
  | { kind: 'project'; projectId: number }
  | { kind: 'spaceNewCharacter'; spaceId: number }
  | { kind: 'spaceNewScene'; spaceId: number }
  | { kind: 'spaceNewStyle'; spaceId: number };

const parseHashRoute = (): Route => {
  const hash = window.location.hash.replace(/^#/, '');
  const parts = hash.split('/').filter(Boolean);

  if (parts.length === 0) {
    return { kind: 'dashboard' };
  }

  if (parts[0] === 'spaces' && parts[1]) {
    const id = Number(parts[1]);
    if (Number.isFinite(id) && id > 0) {
      if (parts[2] === 'characters' && parts[3] === 'new') {
        return { kind: 'spaceNewCharacter', spaceId: id };
      }
      if (parts[2] === 'scenes' && parts[3] === 'new') {
        return { kind: 'spaceNewScene', spaceId: id };
      }
      if (parts[2] === 'styles' && parts[3] === 'new') {
        return { kind: 'spaceNewStyle', spaceId: id };
      }
      return { kind: 'space', spaceId: id };
    }
  }

  if (parts[0] === 'projects' && parts[1]) {
    const id = Number(parts[1]);
    if (Number.isFinite(id) && id > 0) {
      return { kind: 'project', projectId: id };
    }
  }

  return { kind: 'dashboard' };
};

const navigateTo = (route: Route): void => {
  if (route.kind === 'dashboard') {
    window.location.hash = '#/dashboard';
  } else if (route.kind === 'space') {
    window.location.hash = `#/spaces/${route.spaceId}`;
  } else if (route.kind === 'project') {
    window.location.hash = `#/projects/${route.projectId}`;
  } else if (route.kind === 'spaceNewCharacter') {
    window.location.hash = `#/spaces/${route.spaceId}/characters/new`;
  } else if (route.kind === 'spaceNewScene') {
    window.location.hash = `#/spaces/${route.spaceId}/scenes/new`;
  } else if (route.kind === 'spaceNewStyle') {
    window.location.hash = `#/spaces/${route.spaceId}/styles/new`;
  }
};

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
  const [characterAgeRange, setCharacterAgeRange] = useState('');
  const [characterGenderIdentity, setCharacterGenderIdentity] = useState('');
  const [characterPronouns, setCharacterPronouns] = useState('');
  const [characterSpecies, setCharacterSpecies] = useState('');
  const [characterPersonality, setCharacterPersonality] = useState('');
  const [characterArchetype, setCharacterArchetype] = useState('');
  const [newSceneName, setNewSceneName] = useState('');
  const [newSceneDescription, setNewSceneDescription] = useState('');
  const [createDefinitionLoading, setCreateDefinitionLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [deleteDefinitionLoadingId, setDeleteDefinitionLoadingId] = useState<
    number | null
  >(null);
  const [deleteDefinitionError, setDeleteDefinitionError] = useState<
    string | null
  >(null);
  const [spaceStyles, setSpaceStyles] = useState<DefinitionSummary[]>([]);
  const [newStyleName, setNewStyleName] = useState('');
  const [newStyleDescription, setNewStyleDescription] = useState('');
  const [selectedStyleId, setSelectedStyleId] = useState<number | null>(null);
  const [newStyleRenderDomain, setNewStyleRenderDomain] = useState('');
  const [newStyleGenres, setNewStyleGenres] = useState('');

  const [selectedCharacterId, setSelectedCharacterId] = useState<
    number | null
  >(null);
  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);

  const [projectCharacters, setProjectCharacters] = useState<
    DefinitionSummary[]
  >([]);
  const [projectScenes, setProjectScenes] = useState<DefinitionSummary[]>([]);
  const [projectDefinitionsLoading, setProjectDefinitionsLoading] =
    useState(false);
  const [projectDefinitionsError, setProjectDefinitionsError] = useState<
    string | null
  >(null);

  const [route, setRoute] = useState<Route>(() => parseHashRoute());

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = '#/dashboard';
    }

    const handleHashChange = (): void => {
      setRoute(parseHashRoute());
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

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
        void loadProjectDefinitions(firstProject.id);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load projects.';
      setProjectsError(message);
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadProjectDefinitions = async (
    projectId: number,
  ): Promise<void> => {
    setProjectDefinitionsLoading(true);
    setProjectDefinitionsError(null);
    try {
      const [charsRes, scenesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/definitions/characters`, {
          credentials: 'include',
        }),
        fetch(`/api/projects/${projectId}/definitions/scenes`, {
          credentials: 'include',
        }),
      ]);

      if (charsRes.status === 401 || scenesRes.status === 401) {
        setUser(null);
        setSpaces([]);
        setProjects([]);
        setSelectedProjectId(null);
        setProjectCharacters([]);
        setProjectScenes([]);
        return;
      }

      if (charsRes.status === 404 || scenesRes.status === 404) {
        setProjectCharacters([]);
        setProjectScenes([]);
        setProjectDefinitionsError(
          'Project not found or not owned by this user.',
        );
        return;
      }

      if (!charsRes.ok || !scenesRes.ok) {
        throw new Error('PROJECT_DEFINITIONS_FETCH_FAILED');
      }

      const charsBody = (await charsRes.json()) as {
        characters: DefinitionSummary[];
      };
      const scenesBody = (await scenesRes.json()) as {
        scenes: DefinitionSummary[];
      };

      setProjectCharacters(charsBody.characters ?? []);
      setProjectScenes(scenesBody.scenes ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load project assets.';
      setProjectDefinitionsError(message);
      setProjectCharacters([]);
      setProjectScenes([]);
    } finally {
      setProjectDefinitionsLoading(false);
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
      const [charsRes, scenesRes, stylesRes] = await Promise.all([
        fetch(`/api/spaces/${spaceId}/characters`, {
          credentials: 'include',
        }),
        fetch(`/api/spaces/${spaceId}/scenes`, {
          credentials: 'include',
        }),
        fetch(`/api/spaces/${spaceId}/styles`, {
          credentials: 'include',
        }),
      ]);

      if (
        charsRes.status === 401 ||
        scenesRes.status === 401 ||
        stylesRes.status === 401
      ) {
        setUser(null);
        setSpaces([]);
        setSpaceCharacters([]);
        setSpaceScenes([]);
        setSpaceStyles([]);
        return;
      }

      if (
        charsRes.status === 404 ||
        scenesRes.status === 404 ||
        stylesRes.status === 404
      ) {
        setSpaceCharacters([]);
        setSpaceScenes([]);
        setSpaceStyles([]);
        setDefinitionsError('Space not found or not owned by this user.');
        return;
      }

      if (!charsRes.ok || !scenesRes.ok || !stylesRes.ok) {
        throw new Error('DEFINITIONS_FETCH_FAILED');
      }

      const charsBody = (await charsRes.json()) as {
        characters: DefinitionSummary[];
      };
      const scenesBody = (await scenesRes.json()) as {
        scenes: DefinitionSummary[];
      };
      const stylesBody = (await stylesRes.json()) as {
        styles: DefinitionSummary[];
      };

      setSpaceCharacters(charsBody.characters ?? []);
      setSpaceScenes(scenesBody.scenes ?? []);
      setSpaceStyles(stylesBody.styles ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load definitions.';
      setDefinitionsError(message);
      setSpaceCharacters([]);
      setSpaceScenes([]);
      setSpaceStyles([]);
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
      setProjectCharacters([]);
      setProjectScenes([]);
      setSpaceStyles([]);
      setSelectedStyleId(null);
      setSelectedCharacterId(null);
      setSelectedSceneId(null);
    }
  }, [user]);

  const isAuthenticated = Boolean(user);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    if (spaces.length === 0) {
      return;
    }

    let desiredSpaceId: number | null = null;

    if (
      route.kind === 'space' ||
      route.kind === 'spaceNewCharacter' ||
      route.kind === 'spaceNewScene' ||
      route.kind === 'spaceNewStyle'
    ) {
      desiredSpaceId = route.spaceId;
    } else if (selectedSpaceId) {
      desiredSpaceId = selectedSpaceId;
    } else {
      desiredSpaceId = spaces[0]?.id ?? null;
    }

    if (desiredSpaceId && desiredSpaceId !== selectedSpaceId) {
      setSelectedSpaceId(desiredSpaceId);
      void loadProjects(desiredSpaceId);
      void loadDefinitions(desiredSpaceId);
    }
  }, [isAuthenticated, selectedSpaceId, spaces, route]);

  const isDashboardRoute = route.kind === 'dashboard';
  const isSpaceOverviewRoute = route.kind === 'space';
  const isSpaceContextRoute =
    route.kind === 'space' ||
    route.kind === 'spaceNewCharacter' ||
    route.kind === 'spaceNewScene' ||
    route.kind === 'spaceNewStyle';
  const isProjectRoute = route.kind === 'project';

  const currentSpace =
    selectedSpaceId != null
      ? spaces.find((space) => space.id === selectedSpaceId)
      : undefined;

  const currentProject =
    selectedProjectId != null
      ? projects.find((project) => project.id === selectedProjectId)
      : undefined;

  const isCreateCharacterRoute = route.kind === 'spaceNewCharacter';
  const isCreateSceneRoute = route.kind === 'spaceNewScene';
  const isCreateStyleRoute = route.kind === 'spaceNewStyle';

  // Debug: log route and selection to help diagnose project/task view issues.
  // eslint-disable-next-line no-console
  console.log(
    '[ui] route',
    route,
    'selectedSpaceId',
    selectedSpaceId,
    'selectedProjectId',
    selectedProjectId,
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    if (route.kind !== 'project') {
      return;
    }

    const targetProjectId = route.projectId;

    if (selectedProjectId === targetProjectId && selectedSpaceId) {
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/projects/${targetProjectId}`, {
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
          setProjectsError('Project not found or not owned by this user.');
          return;
        }

        if (!res.ok) {
          throw new Error('PROJECT_FETCH_FAILED');
        }

        const body = (await res.json()) as {
          project: {
            id: number;
            spaceId: number;
            name?: string;
            description?: string | null;
          };
        };

        const project = body.project;
        if (!project || !project.spaceId || !project.id) {
          setProjectsError('Project load response was invalid.');
          return;
        }

        setSelectedSpaceId(project.spaceId);
        setSelectedProjectId(project.id);

        void loadProjects(project.spaceId);
        void loadDefinitions(project.spaceId);
        void loadProjectTasks(project.id);
        void loadRenderedAssets(project.id);
        void loadProjectDefinitions(project.id);
      } catch (error: any) {
        const message =
          error instanceof Error ? error.message : 'Failed to load project.';
        setProjectsError(message);
      }
    })();
  }, [
    isAuthenticated,
    route,
    selectedProjectId,
    selectedSpaceId,
    setUser,
    setSpaces,
  ]);

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
    setProjectCharacters([]);
    setProjectScenes([]);
    setSpaceStyles([]);
    setSelectedStyleId(null);
    setSelectedCharacterId(null);
    setSelectedSceneId(null);
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
    // eslint-disable-next-line no-console
    console.log('[ui] handleSelectProject', { projectId });
    setSelectedProjectId(projectId);
    void loadProjectTasks(projectId);
    void loadRenderedAssets(projectId);
    void loadProjectDefinitions(projectId);
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

    const metadata = isCharacter
      ? {
          core_identity: {
            name,
            age_range: characterAgeRange || undefined,
            gender_identity: characterGenderIdentity || undefined,
            pronouns: characterPronouns || undefined,
            species: characterSpecies || undefined,
            personality_keywords:
              characterPersonality.trim().length > 0
                ? characterPersonality
                    .split(',')
                    .map((token) => token.trim())
                    .filter(Boolean)
                : undefined,
            archetype: characterArchetype || undefined,
          },
        }
      : undefined;

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
            metadata: metadata ?? null,
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
        setCharacterAgeRange('');
        setCharacterGenderIdentity('');
        setCharacterPronouns('');
        setCharacterSpecies('');
        setCharacterPersonality('');
        setCharacterArchetype('');
      } else if (!isCharacter && body?.scene) {
        setSpaceScenes((prev) => [body.scene as DefinitionSummary, ...prev]);
        setNewSceneName('');
        setNewSceneDescription('');
      } else {
        // eslint-disable-next-line no-console
        console.error('Definition was created but not returned.');
        return;
      }

      if (
        selectedSpaceId &&
        (route.kind === 'spaceNewCharacter' || route.kind === 'spaceNewScene')
      ) {
        navigateTo({ kind: 'space', spaceId: selectedSpaceId });
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

  const handleDeleteSpaceDefinition = async (
    kind: 'character' | 'scene',
    definitionId: number,
  ): Promise<void> => {
    if (!user || !selectedSpaceId) return;

    setDeleteDefinitionError(null);
    setDeleteDefinitionLoadingId(definitionId);

    try {
      const res = await fetch(
        `/api/spaces/${selectedSpaceId}/${kind === 'character' ? 'characters' : 'scenes'}/${definitionId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );

      if (res.status === 204) {
        if (kind === 'character') {
          setSpaceCharacters((prev) =>
            prev.filter((definition) => definition.id !== definitionId),
          );
        } else {
          setSpaceScenes((prev) =>
            prev.filter((definition) => definition.id !== definitionId),
          );
        }
        return;
      }

      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      const code = body?.error;

      if (code === 'DEFINITION_LOCKED') {
        setDeleteDefinitionError(
          'This definition is locked because it has been imported into a project.',
        );
      } else if (code === 'DEFINITION_NOT_FOUND') {
        setDeleteDefinitionError('Definition not found.');
      } else if (code === 'UNAUTHENTICATED') {
        setDeleteDefinitionError(
          'You must be logged in to delete definitions.',
        );
        setUser(null);
        setSpaces([]);
        setSpaceCharacters([]);
        setSpaceScenes([]);
      } else if (code === 'INVALID_DEFINITION_ID') {
        setDeleteDefinitionError('The requested definition id is invalid.');
      } else {
        setDeleteDefinitionError('Failed to delete definition.');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete definition.';
      setDeleteDefinitionError(message);
    } finally {
      setDeleteDefinitionLoadingId(null);
    }
  };

  const handleImportDefinitionsToProject = async (
    event: FormEvent,
  ): Promise<void> => {
    event.preventDefault();
    const projectIdForImport =
      selectedProjectId && isProjectRoute
        ? selectedProjectId
        : route.kind === 'project'
        ? route.projectId
        : null;
    if (!user || !selectedSpaceId || !projectIdForImport) return;

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

      const res = await fetch(`/api/projects/${projectIdForImport}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          characters: characterIds,
          scenes: sceneIds,
        }),
      });

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
    const projectIdForTask =
      selectedProjectId && isProjectRoute
        ? selectedProjectId
        : route.kind === 'project'
        ? route.projectId
        : null;
    if (!user || !projectIdForTask) return;

    setCreateTaskError(null);
    setCreateTaskLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectIdForTask}/tasks`, {
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
        body: JSON.stringify({
          styleDefinitionId: selectedStyleId ?? null,
          characterDefinitionId: selectedCharacterId ?? null,
          sceneDefinitionId: selectedSceneId ?? null,
        }),
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
        <nav
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => navigateTo({ kind: 'dashboard' })}
            style={{
              padding: '0.3rem 0.6rem',
              borderRadius: '4px',
              border: '1px solid #222',
              backgroundColor:
                isDashboardRoute ? '#222' : 'transparent',
              color: isDashboardRoute ? '#fff' : '#222',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Dashboard
          </button>
          {selectedSpaceId && (
          <button
            type="button"
            onClick={() =>
              navigateTo({ kind: 'space', spaceId: selectedSpaceId })
            }
              style={{
                padding: '0.3rem 0.6rem',
                borderRadius: '4px',
                border: '1px solid #222',
                backgroundColor:
                  isSpaceContextRoute ? '#222' : 'transparent',
                color: isSpaceContextRoute ? '#fff' : '#222',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Current space
            </button>
          )}
          {selectedProjectId && (
            <button
              type="button"
              onClick={() =>
                navigateTo({ kind: 'project', projectId: selectedProjectId })
              }
              style={{
                padding: '0.3rem 0.6rem',
                borderRadius: '4px',
                border: '1px solid #222',
                backgroundColor:
                  isProjectRoute ? '#222' : 'transparent',
                color: isProjectRoute ? '#fff' : '#222',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Current project
            </button>
          )}
        </nav>
        {user && (
          <div style={{ textAlign: 'right' }}>
            <button
              type="button"
              onClick={handleLogout}
              disabled={authLoading}
              style={{ padding: '0.4rem 0.75rem' }}
            >
              {authLoading ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        )}
      </header>

      {!isAuthenticated && (
        <section
          style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <h2 style={{ marginTop: 0 }}>Account</h2>
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
        </section>
      )}

      <section
        style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '1rem',
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          {isDashboardRoute && 'Spaces, Projects & Assets'}
          {isSpaceContextRoute && (currentSpace?.name ?? 'Space')}
          {isProjectRoute && (currentProject?.name ?? 'Project')}
        </h2>
        {isProjectRoute && (
          <p style={{ marginTop: '0.25rem', marginBottom: '0.75rem' }}>
            new stuff
          </p>
        )}
        {!isAuthenticated && (
          <p style={{ color: '#555' }}>
            Log in or register to view and create spaces.
          </p>
        )}
        {isAuthenticated && (
          <>
            {isDashboardRoute && (
              <DashboardView
                spaces={spaces}
                spacesLoading={spacesLoading}
                spacesError={spacesError}
                newSpaceName={newSpaceName}
                newSpaceDescription={newSpaceDescription}
                setNewSpaceName={setNewSpaceName}
                setNewSpaceDescription={setNewSpaceDescription}
                createSpaceLoading={createSpaceLoading}
                createSpaceError={createSpaceError}
                selectedSpaceId={selectedSpaceId}
                onSubmitCreateSpace={handleCreateSpace}
                onOpenSpace={(spaceId) => {
                  handleSelectSpace(spaceId);
                  navigateTo({ kind: 'space', spaceId });
                }}
              />
            )}

            {isSpaceOverviewRoute && selectedSpaceId && (
              <SpaceView
                projects={projects}
                projectsLoading={projectsLoading}
                projectsError={projectsError}
                selectedProjectId={selectedProjectId}
                newProjectName={newProjectName}
                newProjectDescription={newProjectDescription}
                setNewProjectName={setNewProjectName}
                setNewProjectDescription={setNewProjectDescription}
                createProjectLoading={createProjectLoading}
                createProjectError={createProjectError}
                spaceCharacters={spaceCharacters}
                spaceScenes={spaceScenes}
                spaceStyles={spaceStyles}
                definitionsLoading={definitionsLoading}
                definitionsError={definitionsError}
                deleteDefinitionLoadingId={deleteDefinitionLoadingId}
                deleteDefinitionError={deleteDefinitionError}
                onSubmitCreateProject={handleCreateProject}
                onOpenProject={(projectId) => {
                  handleSelectProject(projectId);
                  navigateTo({ kind: 'project', projectId });
                }}
                onCreateCharacter={() => {
                  if (!selectedSpaceId) return;
                  navigateTo({
                    kind: 'spaceNewCharacter',
                    spaceId: selectedSpaceId,
                  });
                }}
                onCreateScene={() => {
                  if (!selectedSpaceId) return;
                  navigateTo({
                    kind: 'spaceNewScene',
                    spaceId: selectedSpaceId,
                  });
                }}
                onCreateStyle={() => {
                  if (!selectedSpaceId) return;
                  navigateTo({
                    kind: 'spaceNewStyle',
                    spaceId: selectedSpaceId,
                  });
                }}
                onDeleteDefinition={handleDeleteSpaceDefinition}
              />
            )}

            {isProjectRoute && (
              <ProjectView
                importLoading={importLoading}
                importError={importError}
                projectDefinitionsLoading={projectDefinitionsLoading}
                projectDefinitionsError={projectDefinitionsError}
                projectCharacters={projectCharacters}
                projectScenes={projectScenes}
                selectedCharacterId={selectedCharacterId}
                setSelectedCharacterId={setSelectedCharacterId}
                selectedSceneId={selectedSceneId}
                setSelectedSceneId={setSelectedSceneId}
                selectedStyleId={selectedStyleId}
                setSelectedStyleId={setSelectedStyleId}
                spaceStyles={spaceStyles}
                tasksLoading={tasksLoading}
                tasksError={tasksError}
                tasks={tasks}
                newTaskName={newTaskName}
                setNewTaskName={setNewTaskName}
                newTaskPrompt={newTaskPrompt}
                setNewTaskPrompt={setNewTaskPrompt}
                newTaskDescription={newTaskDescription}
                setNewTaskDescription={setNewTaskDescription}
                createTaskLoading={createTaskLoading}
                createTaskError={createTaskError}
                renderingTaskId={renderingTaskId}
                renderError={renderError}
                assetsLoading={assetsLoading}
                assetsError={assetsError}
                renderedAssets={renderedAssets}
                onImportDefinitionsToProject={handleImportDefinitionsToProject}
                onCreateTask={handleCreateTask}
                onRenderTask={handleRenderTask}
              />
            )}
          </>
        )}
      </section>

      {isCreateCharacterRoute && currentSpace && (
        <section
          style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '1.5rem',
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Create character in {currentSpace.name}
          </h2>
          <form
            onSubmit={(e) => void handleCreateDefinition(e, 'character')}
            style={{
              marginTop: '0.5rem',
              display: 'grid',
              gap: '0.4rem',
            }}
          >
            <input
              type="text"
              placeholder="Character name"
              required
              value={newCharacterName}
              onChange={(e) => setNewCharacterName(e.target.value)}
              style={{ width: '100%', padding: '0.4rem' }}
            />
            <textarea
              placeholder="Description (optional)"
              value={newCharacterDescription}
              onChange={(e) => setNewCharacterDescription(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '0.4rem' }}
            />
            <input
              type="text"
              placeholder="Age range (e.g. early_30s)"
              value={characterAgeRange}
              onChange={(e) => setCharacterAgeRange(e.target.value)}
              style={{ width: '100%', padding: '0.4rem' }}
            />
            <input
              type="text"
              placeholder="Gender identity (e.g. woman)"
              value={characterGenderIdentity}
              onChange={(e) => setCharacterGenderIdentity(e.target.value)}
              style={{ width: '100%', padding: '0.4rem' }}
            />
            <input
              type="text"
              placeholder="Pronouns (e.g. she_her)"
              value={characterPronouns}
              onChange={(e) => setCharacterPronouns(e.target.value)}
              style={{ width: '100%', padding: '0.4rem' }}
            />
            <input
              type="text"
              placeholder="Species (e.g. human)"
              value={characterSpecies}
              onChange={(e) => setCharacterSpecies(e.target.value)}
              style={{ width: '100%', padding: '0.4rem' }}
            />
            <input
              type="text"
              placeholder="Personality keywords (comma-separated)"
              value={characterPersonality}
              onChange={(e) => setCharacterPersonality(e.target.value)}
              style={{ width: '100%', padding: '0.4rem' }}
            />
            <input
              type="text"
              placeholder="Archetype (e.g. maverick)"
              value={characterArchetype}
              onChange={(e) => setCharacterArchetype(e.target.value)}
              style={{ width: '100%', padding: '0.4rem' }}
            />
            <div style={{ marginTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={createDefinitionLoading}
                style={{ marginRight: '0.5rem' }}
              >
                {createDefinitionLoading ? 'Saving…' : 'Save character'}
              </button>
              <button
                type="button"
                onClick={() =>
                  selectedSpaceId &&
                  navigateTo({ kind: 'space', spaceId: selectedSpaceId })
                }
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {isCreateSceneRoute && currentSpace && (
        <section
          style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '1.5rem',
          }}
        >
          <h2 style={{ marginTop: 0 }}>Create scene in {currentSpace.name}</h2>
          <form
            onSubmit={(e) => void handleCreateDefinition(e, 'scene')}
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
            <div style={{ marginTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={createDefinitionLoading}
                style={{ marginRight: '0.5rem' }}
              >
                {createDefinitionLoading ? 'Saving…' : 'Save scene'}
              </button>
              <button
                type="button"
                onClick={() =>
                  selectedSpaceId &&
                  navigateTo({ kind: 'space', spaceId: selectedSpaceId })
                }
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {isCreateStyleRoute && currentSpace && (
        <section
          style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '1.5rem',
          }}
        >
          <h2 style={{ marginTop: 0 }}>Create style in {currentSpace.name}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!user || !selectedSpaceId) return;
              setCreateDefinitionLoading(true);
              (async () => {
                try {
                  const res = await fetch(
                    `/api/spaces/${selectedSpaceId}/styles`,
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      credentials: 'include',
                      body: JSON.stringify({
                        name: newStyleName,
                        description: newStyleDescription || null,
                        metadata:
                          newStyleRenderDomain || newStyleGenres
                            ? {
                                core_style: {
                                  render_domain:
                                    newStyleRenderDomain || undefined,
                                  genre:
                                    newStyleGenres
                                      .split(',')
                                      .map((token) => token.trim())
                                      .filter(Boolean) || undefined,
                                },
                              }
                            : null,
                      }),
                    },
                  );

                  const body = (await res.json().catch(() => null)) as
                    | {
                        style?: DefinitionSummary;
                        error?: string;
                      }
                    | null;

                  if (!res.ok) {
                    const code = body?.error;
                    if (code === 'NAME_REQUIRED') {
                      // basic validation already enforced by required input
                    } else if (code === 'UNAUTHENTICATED') {
                      setUser(null);
                      setSpaces([]);
                      setSpaceCharacters([]);
                      setSpaceScenes([]);
                      setSpaceStyles([]);
                    } else if (code === 'SPACE_NOT_FOUND') {
                      // space no longer accessible
                    } else {
                      // eslint-disable-next-line no-console
                      console.error('[styles] Create style error code:', code);
                    }
                    return;
                  }

                  if (body?.style) {
                    setSpaceStyles((prev) => [
                      body.style as DefinitionSummary,
                      ...prev,
                    ]);
                    setNewStyleName('');
                    setNewStyleDescription('');
                    setNewStyleRenderDomain('');
                    setNewStyleGenres('');

                    if (selectedSpaceId) {
                      navigateTo({ kind: 'space', spaceId: selectedSpaceId });
                    }
                  } else {
                    // eslint-disable-next-line no-console
                    console.error('Style was created but not returned.');
                  }
                } catch (err) {
                  const message =
                    err instanceof Error
                      ? err.message
                      : 'Failed to create style.';
                  // eslint-disable-next-line no-console
                  console.error('[styles] Create style error:', message);
                } finally {
                  setCreateDefinitionLoading(false);
                }
              })();
            }}
            style={{
              marginTop: '0.5rem',
              display: 'grid',
              gap: '0.4rem',
            }}
          >
            <input
              type="text"
              placeholder="Style name"
              required
              value={newStyleName}
              onChange={(e) => setNewStyleName(e.target.value)}
              style={{ width: '100%', padding: '0.4rem' }}
            />
            <textarea
              placeholder="Description (optional)"
              value={newStyleDescription}
              onChange={(e) => setNewStyleDescription(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '0.4rem' }}
            />
            <input
              type="text"
              placeholder="Render domain (e.g. comic_illustration)"
              value={newStyleRenderDomain}
              onChange={(e) => setNewStyleRenderDomain(e.target.value)}
              style={{ width: '100%', padding: '0.4rem' }}
            />
            <input
              type="text"
              placeholder="Genres (comma-separated, e.g. sci_fi, fantasy)"
              value={newStyleGenres}
              onChange={(e) => setNewStyleGenres(e.target.value)}
              style={{ width: '100%', padding: '0.4rem' }}
            />
            <div style={{ marginTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={createDefinitionLoading}
                style={{ marginRight: '0.5rem' }}
              >
                {createDefinitionLoading ? 'Saving…' : 'Save style'}
              </button>
              <button
                type="button"
                onClick={() =>
                  selectedSpaceId &&
                  navigateTo({ kind: 'space', spaceId: selectedSpaceId })
                }
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}

export default App;
