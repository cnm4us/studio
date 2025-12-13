import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import './App.css';
import { DashboardView } from './views/DashboardView';
import { ProjectView } from './views/ProjectView';
import { SpaceView } from './views/SpaceView';
import { CharacterDefinitionFormView } from './views/CharacterDefinitionFormView';
import { SceneDefinitionFormView } from './views/SceneDefinitionFormView';
import { StyleDefinitionFormView } from './views/StyleDefinitionFormView';
import { SpaceTasksView } from './views/SpaceTasksView';
import type {
  CharacterAppearanceMetadata,
  SceneDefinitionMetadata,
  StyleDefinitionMetadata,
} from './definitionMetadata';


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
  project_id: number | null;
  space_id: number | null;
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
  | { kind: 'spaceNewStyle'; spaceId: number }
  | { kind: 'spaceEditCharacter'; spaceId: number; definitionId: number }
  | { kind: 'spaceEditScene'; spaceId: number; definitionId: number }
  | { kind: 'spaceEditStyle'; spaceId: number; definitionId: number };

const parseHashRoute = (): Route => {
  const hash = window.location.hash.replace(/^#/, '');
  const parts = hash.split('/').filter(Boolean);

  if (parts.length === 0) {
    return { kind: 'dashboard' };
  }

  if (parts[0] === 'spaces' && parts[1]) {
    const id = Number(parts[1]);
    if (Number.isFinite(id) && id > 0) {
      if (parts[2] === 'characters') {
        if (parts[3] === 'new') {
          return { kind: 'spaceNewCharacter', spaceId: id };
        }
        if (parts[3] && parts[4] === 'edit') {
          const defId = Number(parts[3]);
          if (Number.isFinite(defId) && defId > 0) {
            return {
              kind: 'spaceEditCharacter',
              spaceId: id,
              definitionId: defId,
            };
          }
        }
      }
      if (parts[2] === 'scenes') {
        if (parts[3] === 'new') {
          return { kind: 'spaceNewScene', spaceId: id };
        }
        if (parts[3] && parts[4] === 'edit') {
          const defId = Number(parts[3]);
          if (Number.isFinite(defId) && defId > 0) {
            return {
              kind: 'spaceEditScene',
              spaceId: id,
              definitionId: defId,
            };
          }
        }
      }
      if (parts[2] === 'styles') {
        if (parts[3] === 'new') {
          return { kind: 'spaceNewStyle', spaceId: id };
        }
        if (parts[3] && parts[4] === 'edit') {
          const defId = Number(parts[3]);
          if (Number.isFinite(defId) && defId > 0) {
            return {
              kind: 'spaceEditStyle',
              spaceId: id,
              definitionId: defId,
            };
          }
        }
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
  } else if (route.kind === 'spaceEditCharacter') {
    window.location.hash = `#/spaces/${route.spaceId}/characters/${route.definitionId}/edit`;
  } else if (route.kind === 'spaceEditScene') {
    window.location.hash = `#/spaces/${route.spaceId}/scenes/${route.definitionId}/edit`;
  } else if (route.kind === 'spaceEditStyle') {
    window.location.hash = `#/spaces/${route.spaceId}/styles/${route.definitionId}/edit`;
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
  // Prompt is now per-task/per-render; no global task prompt state
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
  const [newCharacterDescription, setNewCharacterDescription] = useState('');
  const [characterMetadata, setCharacterMetadata] =
    useState<CharacterAppearanceMetadata>({});
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
  const [styleMetadata, setStyleMetadata] =
    useState<StyleDefinitionMetadata>({});
  const [sceneMetadata, setSceneMetadata] =
    useState<SceneDefinitionMetadata>({});

  const [projectCharacters, setProjectCharacters] = useState<
    DefinitionSummary[]
  >([]);
  const [projectScenes, setProjectScenes] = useState<DefinitionSummary[]>([]);
  const [projectStyles, setProjectStyles] = useState<DefinitionSummary[]>([]);
  const [projectDefinitionsLoading, setProjectDefinitionsLoading] =
    useState(false);
  const [projectDefinitionsError, setProjectDefinitionsError] = useState<
    string | null
  >(null);

  // Clone context for Space-level definitions
  const [cloneCharacterFromId, setCloneCharacterFromId] = useState<
    number | null
  >(null);
  const [cloneSceneFromId, setCloneSceneFromId] = useState<number | null>(null);
  const [cloneStyleFromId, setCloneStyleFromId] = useState<number | null>(null);

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
        void loadRenderedAssetsForProject(firstProject.id);
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
      const [charsRes, scenesRes, stylesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/definitions/characters`, {
          credentials: 'include',
        }),
        fetch(`/api/projects/${projectId}/definitions/scenes`, {
          credentials: 'include',
        }),
        fetch(`/api/projects/${projectId}/definitions/styles`, {
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
        setProjects([]);
        setSelectedProjectId(null);
        setProjectCharacters([]);
        setProjectScenes([]);
        setProjectStyles([]);
        return;
      }

      if (
        charsRes.status === 404 ||
        scenesRes.status === 404 ||
        stylesRes.status === 404
      ) {
        setProjectCharacters([]);
        setProjectScenes([]);
        setProjectStyles([]);
        setProjectDefinitionsError(
          'Project not found or not owned by this user.',
        );
        return;
      }

      if (!charsRes.ok || !scenesRes.ok || !stylesRes.ok) {
        throw new Error('PROJECT_DEFINITIONS_FETCH_FAILED');
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

      setProjectCharacters(charsBody.characters ?? []);
      setProjectScenes(scenesBody.scenes ?? []);
      setProjectStyles(stylesBody.styles ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load project assets.';
      setProjectDefinitionsError(message);
      setProjectCharacters([]);
      setProjectScenes([]);
      setProjectStyles([]);
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

  const loadSpaceTasks = async (spaceId: number): Promise<void> => {
    setTasksLoading(true);
    setTasksError(null);
    try {
      const res = await fetch(`/api/spaces/${spaceId}/tasks`, {
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
        setTasksError('Space not found or not owned by this user.');
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

  const loadRenderedAssetsForProject = async (
    projectId: number,
  ): Promise<void> => {
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

  const loadRenderedAssetsForSpace = async (spaceId: number): Promise<void> => {
    setAssetsLoading(true);
    setAssetsError(null);
    try {
      const res = await fetch(`/api/spaces/${spaceId}/rendered-assets`, {
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
        setAssetsError('Space not found or not owned by this user.');
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
    }
  }, [user]);

  const isAuthenticated = Boolean(user);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    // When we are on a project route, space-level task/render loads are
    // handled separately; avoid clobbering project task/render state here.
    if (route.kind === 'project') {
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
      route.kind === 'spaceNewStyle' ||
      route.kind === 'spaceEditCharacter' ||
      route.kind === 'spaceEditScene' ||
      route.kind === 'spaceEditStyle'
    ) {
      desiredSpaceId = route.spaceId;
    } else if (selectedSpaceId) {
      desiredSpaceId = selectedSpaceId;
    } else {
      desiredSpaceId = spaces[0]?.id ?? null;
    }

    if (desiredSpaceId) {
      if (desiredSpaceId !== selectedSpaceId) {
        setSelectedSpaceId(desiredSpaceId);
      }
      void loadProjects(desiredSpaceId);
      void loadDefinitions(desiredSpaceId);
      void loadSpaceTasks(desiredSpaceId);
      void loadRenderedAssetsForSpace(desiredSpaceId);
    }
  }, [isAuthenticated, selectedSpaceId, spaces, route]);

  const isDashboardRoute = route.kind === 'dashboard';
  const isSpaceOverviewRoute = route.kind === 'space';
  const isSpaceContextRoute =
    route.kind === 'space' ||
    route.kind === 'spaceNewCharacter' ||
    route.kind === 'spaceNewScene' ||
    route.kind === 'spaceNewStyle' ||
    route.kind === 'spaceEditCharacter' ||
    route.kind === 'spaceEditScene' ||
    route.kind === 'spaceEditStyle';
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
  const isEditCharacterRoute = route.kind === 'spaceEditCharacter';
  const isCreateSceneRoute = route.kind === 'spaceNewScene';
  const isEditSceneRoute = route.kind === 'spaceEditScene';
  const isCreateStyleRoute = route.kind === 'spaceNewStyle';
  const isEditStyleRoute = route.kind === 'spaceEditStyle';

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
        void loadRenderedAssetsForProject(project.id);
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

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const loadForEdit = async (): Promise<void> => {
      if (route.kind === 'spaceEditCharacter') {
        const { spaceId, definitionId } = route;
        try {
          const res = await fetch(
            `/api/spaces/${spaceId}/characters/${definitionId}`,
            { credentials: 'include' },
          );

          if (res.status === 401) {
            setUser(null);
            setSpaces([]);
            setSpaceCharacters([]);
            setSpaceScenes([]);
            setSpaceStyles([]);
            return;
          }

          if (!res.ok) {
            return;
          }

          const body = (await res.json().catch(() => null)) as
            | {
                character?: {
                  name?: string;
                  description?: string | null;
                  metadata?: CharacterAppearanceMetadata | null;
                };
              }
            | null;

          const character = body?.character;
          if (!character) {
            return;
          }

          setNewCharacterName(character.name ?? '');
          setNewCharacterDescription(character.description ?? '');

          let incomingMetadata: CharacterAppearanceMetadata = {};
          const rawCharacterMetadata = character.metadata as unknown;
          if (rawCharacterMetadata) {
            if (typeof rawCharacterMetadata === 'string') {
              try {
                incomingMetadata = JSON.parse(
                  rawCharacterMetadata,
                ) as CharacterAppearanceMetadata;
              } catch {
                incomingMetadata = {};
              }
            } else if (typeof rawCharacterMetadata === 'object') {
              incomingMetadata = rawCharacterMetadata as CharacterAppearanceMetadata;
            }
          }

          setCharacterMetadata((prev) => {
            const base = Object.keys(incomingMetadata).length
              ? incomingMetadata
              : prev;
            return {
              ...base,
              core_identity: {
                ...(base.core_identity ?? {}),
                name: character.name ?? base.core_identity?.name ?? '',
              },
            };
          });
        } catch {
          // Swallow; user can retry by reloading.
        }
      } else if (route.kind === 'spaceEditScene') {
        const { spaceId, definitionId } = route;
        try {
          const res = await fetch(
            `/api/spaces/${spaceId}/scenes/${definitionId}`,
            { credentials: 'include' },
          );

          if (res.status === 401) {
            setUser(null);
            setSpaces([]);
            setSpaceCharacters([]);
            setSpaceScenes([]);
            setSpaceStyles([]);
            return;
          }

          if (!res.ok) {
            return;
          }

          const body = (await res.json().catch(() => null)) as
            | {
                scene?: {
                  name?: string;
                  description?: string | null;
                  metadata?: SceneDefinitionMetadata | null;
                };
              }
            | null;

          const scene = body?.scene;
          if (!scene) {
            return;
          }

          setNewSceneName(scene.name ?? '');
          setNewSceneDescription(scene.description ?? '');

          let incomingMetadata: SceneDefinitionMetadata = {};
          const rawSceneMetadata = scene.metadata as unknown;
          if (rawSceneMetadata) {
            if (typeof rawSceneMetadata === 'string') {
              try {
                incomingMetadata = JSON.parse(
                  rawSceneMetadata,
                ) as SceneDefinitionMetadata;
              } catch {
                incomingMetadata = {};
              }
            } else if (typeof rawSceneMetadata === 'object') {
              incomingMetadata = rawSceneMetadata as SceneDefinitionMetadata;
            }
          }
          setSceneMetadata(incomingMetadata);
        } catch {
          // Swallow; user can retry by reloading.
        }
      } else if (route.kind === 'spaceEditStyle') {
        const { spaceId, definitionId } = route;
        try {
          const res = await fetch(
            `/api/spaces/${spaceId}/styles/${definitionId}`,
            { credentials: 'include' },
          );

          if (res.status === 401) {
            setUser(null);
            setSpaces([]);
            setSpaceCharacters([]);
            setSpaceScenes([]);
            setSpaceStyles([]);
            return;
          }

          if (!res.ok) {
            return;
          }

          const body = (await res.json().catch(() => null)) as
            | {
                style?: {
                  name?: string;
                  description?: string | null;
                  metadata?: StyleDefinitionMetadata | null;
                };
              }
            | null;

          const style = body?.style;
          if (!style) {
            return;
          }

          setNewStyleName(style.name ?? '');
          setNewStyleDescription(style.description ?? '');

          let incomingMetadata: StyleDefinitionMetadata = {};
          const rawStyleMetadata = style.metadata as unknown;
          if (rawStyleMetadata) {
            if (typeof rawStyleMetadata === 'string') {
              try {
                incomingMetadata = JSON.parse(
                  rawStyleMetadata,
                ) as StyleDefinitionMetadata;
              } catch {
                incomingMetadata = {};
              }
            } else if (typeof rawStyleMetadata === 'object') {
              incomingMetadata = rawStyleMetadata as StyleDefinitionMetadata;
            }
          }
          setStyleMetadata(incomingMetadata);
        } catch {
          // Swallow; user can retry by reloading.
        }
      }
    };

    if (
      route.kind === 'spaceEditCharacter' ||
      route.kind === 'spaceEditScene' ||
      route.kind === 'spaceEditStyle'
    ) {
      void loadForEdit();
    }
  }, [
    isAuthenticated,
    route,
    setUser,
    setSpaces,
    setSpaceCharacters,
    setSpaceScenes,
    setSpaceStyles,
    setNewCharacterName,
    setNewCharacterDescription,
    setCharacterMetadata,
    setNewSceneName,
    setNewSceneDescription,
    setSceneMetadata,
    setNewStyleName,
    setNewStyleDescription,
    setStyleMetadata,
  ]);

  // Prefill "new" definition forms when cloning from an existing space definition.
  useEffect(() => {
    if (!isAuthenticated) return;

    const doClonePrefill = async (): Promise<void> => {
      if (route.kind === 'spaceNewCharacter' && cloneCharacterFromId) {
        const { spaceId } = route;
        try {
          const res = await fetch(
            `/api/spaces/${spaceId}/characters/${cloneCharacterFromId}`,
            { credentials: 'include' },
          );
          if (!res.ok) {
            setCloneCharacterFromId(null);
            return;
          }
          const body = (await res.json().catch(() => null)) as
            | {
                character?: {
                  name?: string;
                  description?: string | null;
                  metadata?: CharacterAppearanceMetadata | null;
                };
              }
            | null;
          const character = body?.character;
          if (!character) {
            setCloneCharacterFromId(null);
            return;
          }

          const baseName = character.name ?? '';
          setNewCharacterName(
            baseName && !baseName.toLowerCase().includes('clone')
              ? `${baseName} (clone)`
              : baseName,
          );
          setNewCharacterDescription(character.description ?? '');

          let incomingMetadata: CharacterAppearanceMetadata = {};
          const raw = character.metadata as unknown;
          if (raw) {
            if (typeof raw === 'string') {
              try {
                incomingMetadata = JSON.parse(
                  raw,
                ) as CharacterAppearanceMetadata;
              } catch {
                incomingMetadata = {};
              }
            } else if (typeof raw === 'object') {
              incomingMetadata = raw as CharacterAppearanceMetadata;
            }
          }

          setCharacterMetadata((prev) => {
            const base = Object.keys(incomingMetadata).length
              ? incomingMetadata
              : prev;
            const name = baseName || base.core_identity?.name || '';
            return {
              ...base,
              core_identity: {
                ...(base.core_identity ?? {}),
                name,
              },
            };
          });
        } catch {
          // ignore and continue
        } finally {
          setCloneCharacterFromId(null);
        }
      } else if (route.kind === 'spaceNewScene' && cloneSceneFromId) {
        const { spaceId } = route;
        try {
          const res = await fetch(
            `/api/spaces/${spaceId}/scenes/${cloneSceneFromId}`,
            { credentials: 'include' },
          );
          if (!res.ok) {
            setCloneSceneFromId(null);
            return;
          }
          const body = (await res.json().catch(() => null)) as
            | {
                scene?: {
                  name?: string;
                  description?: string | null;
                  metadata?: SceneDefinitionMetadata | null;
                };
              }
            | null;
          const scene = body?.scene;
          if (!scene) {
            setCloneSceneFromId(null);
            return;
          }

          const baseName = scene.name ?? '';
          setNewSceneName(
            baseName && !baseName.toLowerCase().includes('clone')
              ? `${baseName} (clone)`
              : baseName,
          );
          setNewSceneDescription(scene.description ?? '');

          let incomingMetadata: SceneDefinitionMetadata = {};
          const raw = scene.metadata as unknown;
          if (raw) {
            if (typeof raw === 'string') {
              try {
                incomingMetadata = JSON.parse(
                  raw,
                ) as SceneDefinitionMetadata;
              } catch {
                incomingMetadata = {};
              }
            } else if (typeof raw === 'object') {
              incomingMetadata = raw as SceneDefinitionMetadata;
            }
          }
          setSceneMetadata(incomingMetadata);
        } catch {
          // ignore
        } finally {
          setCloneSceneFromId(null);
        }
      } else if (route.kind === 'spaceNewStyle' && cloneStyleFromId) {
        const { spaceId } = route;
        try {
          const res = await fetch(
            `/api/spaces/${spaceId}/styles/${cloneStyleFromId}`,
            { credentials: 'include' },
          );
          if (!res.ok) {
            setCloneStyleFromId(null);
            return;
          }
          const body = (await res.json().catch(() => null)) as
            | {
                style?: {
                  name?: string;
                  description?: string | null;
                  metadata?: StyleDefinitionMetadata | null;
                };
              }
            | null;
          const style = body?.style;
          if (!style) {
            setCloneStyleFromId(null);
            return;
          }

          const baseName = style.name ?? '';
          setNewStyleName(
            baseName && !baseName.toLowerCase().includes('clone')
              ? `${baseName} (clone)`
              : baseName,
          );
          setNewStyleDescription(style.description ?? '');

          let incomingMetadata: StyleDefinitionMetadata = {};
          const raw = style.metadata as unknown;
          if (raw) {
            if (typeof raw === 'string') {
              try {
                incomingMetadata = JSON.parse(raw) as StyleDefinitionMetadata;
              } catch {
                incomingMetadata = {};
              }
            } else if (typeof raw === 'object') {
              incomingMetadata = raw as StyleDefinitionMetadata;
            }
          }
          setStyleMetadata(incomingMetadata);
        } catch {
          // ignore
        } finally {
          setCloneStyleFromId(null);
        }
      }
    };

    void doClonePrefill();
  }, [
    isAuthenticated,
    route,
    cloneCharacterFromId,
    cloneSceneFromId,
    cloneStyleFromId,
    setNewCharacterName,
    setNewCharacterDescription,
    setCharacterMetadata,
    setNewSceneName,
    setNewSceneDescription,
    setSceneMetadata,
    setNewStyleName,
    setNewStyleDescription,
    setStyleMetadata,
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
    void loadProjects(spaceId);
    void loadDefinitions(spaceId);
    void loadSpaceTasks(spaceId);
    void loadRenderedAssetsForSpace(spaceId);
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
    void loadRenderedAssetsForProject(projectId);
    void loadProjectDefinitions(projectId);
  };

  const handleCloneSpaceDefinition = (
    kind: 'character' | 'scene' | 'style',
    definitionId: number,
  ): void => {
    if (!selectedSpaceId) return;

    if (kind === 'character') {
      setCloneCharacterFromId(definitionId);
      navigateTo({
        kind: 'spaceNewCharacter',
        spaceId: selectedSpaceId,
      });
    } else if (kind === 'scene') {
      setCloneSceneFromId(definitionId);
      navigateTo({
        kind: 'spaceNewScene',
        spaceId: selectedSpaceId,
      });
    } else {
      setCloneStyleFromId(definitionId);
      navigateTo({
        kind: 'spaceNewStyle',
        spaceId: selectedSpaceId,
      });
    }
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

    let metadata: CharacterAppearanceMetadata | SceneDefinitionMetadata | null =
      null;
    if (isCharacter) {
      metadata = {
        ...characterMetadata,
        core_identity: {
          ...(characterMetadata.core_identity ?? {}),
          name,
        },
      };
    } else {
      metadata = Object.keys(sceneMetadata).length > 0 ? sceneMetadata : null;
    }

    const pathSegment = isCharacter ? 'characters' : 'scenes';
    const isEditCharacter =
      isCharacter && route.kind === 'spaceEditCharacter';
    const isEditScene = !isCharacter && route.kind === 'spaceEditScene';
    const isEdit = isEditCharacter || isEditScene;

    let url = `/api/spaces/${selectedSpaceId}/${pathSegment}`;
    let method: 'POST' | 'PATCH' = 'POST';

    if (isEdit) {
      const definitionId =
        isEditCharacter && route.kind === 'spaceEditCharacter'
          ? route.definitionId
          : isEditScene && route.kind === 'spaceEditScene'
          ? route.definitionId
          : null;

      if (definitionId) {
        url = `/api/spaces/${selectedSpaceId}/${pathSegment}/${definitionId}`;
        method = 'PATCH';
      }
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          description: description || null,
          metadata,
        }),
      });

      if (method === 'PATCH') {
        if (res.status === 204) {
          if (isCharacter) {
            setNewCharacterName('');
            setNewCharacterDescription('');
            setCharacterMetadata({});
          } else {
            setNewSceneName('');
            setNewSceneDescription('');
            setSceneMetadata({});
          }
          if (selectedSpaceId) {
            void loadDefinitions(selectedSpaceId);
            navigateTo({ kind: 'space', spaceId: selectedSpaceId });
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
            'You must be logged in to edit definitions.',
          );
          setUser(null);
          setSpaces([]);
          setSpaceCharacters([]);
          setSpaceScenes([]);
          setSpaceStyles([]);
        } else if (code === 'INVALID_DEFINITION_ID') {
          setDeleteDefinitionError('The requested definition id is invalid.');
        } else if (code === 'NAME_REQUIRED') {
          setDeleteDefinitionError('A non-empty name is required.');
        } else if (code === 'NO_FIELDS_TO_UPDATE') {
          // no-op; UI should ensure we always send at least one field
        } else {
          setDeleteDefinitionError('Failed to edit definition.');
        }
        return;
      }

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
        setCharacterMetadata({});
      } else if (!isCharacter && body?.scene) {
        setSpaceScenes((prev) => [body.scene as DefinitionSummary, ...prev]);
        setNewSceneName('');
        setNewSceneDescription('');
        setSceneMetadata({});
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

  const handleCreateStyleDefinition = async (
    event: FormEvent,
  ): Promise<void> => {
    event.preventDefault();
    if (!user || !selectedSpaceId) return;

    setCreateDefinitionLoading(true);

    try {
      const metadata: StyleDefinitionMetadata | null =
        Object.keys(styleMetadata).length > 0 ? styleMetadata : null;

      const isEdit = route.kind === 'spaceEditStyle';
      let url = `/api/spaces/${selectedSpaceId}/styles`;
      let method: 'POST' | 'PATCH' = 'POST';

      if (isEdit) {
        const definitionId =
          route.kind === 'spaceEditStyle' ? route.definitionId : null;
        if (definitionId) {
          url = `/api/spaces/${selectedSpaceId}/styles/${definitionId}`;
          method = 'PATCH';
        }
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newStyleName,
          description: newStyleDescription || null,
          metadata,
        }),
      });

      if (method === 'PATCH') {
        if (res.status === 204) {
          setNewStyleName('');
          setNewStyleDescription('');
          setStyleMetadata({});

          if (selectedSpaceId) {
            void loadDefinitions(selectedSpaceId);
            navigateTo({ kind: 'space', spaceId: selectedSpaceId });
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
            'You must be logged in to edit definitions.',
          );
          setUser(null);
          setSpaces([]);
          setSpaceCharacters([]);
          setSpaceScenes([]);
          setSpaceStyles([]);
        } else if (code === 'INVALID_DEFINITION_ID') {
          setDeleteDefinitionError('The requested definition id is invalid.');
        } else if (code === 'NAME_REQUIRED') {
          setDeleteDefinitionError('A non-empty name is required.');
        } else if (code === 'NO_FIELDS_TO_UPDATE') {
          // no-op
        } else {
          setDeleteDefinitionError('Failed to edit definition.');
        }
        return;
      }

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
        setSpaceStyles((prev) => [body.style as DefinitionSummary, ...prev]);
        setNewStyleName('');
        setNewStyleDescription('');
        setStyleMetadata({});

        if (selectedSpaceId) {
          navigateTo({ kind: 'space', spaceId: selectedSpaceId });
        }
      } else {
        // eslint-disable-next-line no-console
        console.error('Style was created but not returned.');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create style.';
      // eslint-disable-next-line no-console
      console.error('[styles] Create style error:', message);
    } finally {
      setCreateDefinitionLoading(false);
    }
  };

  const handleDeleteSpaceDefinition = async (
    kind: 'character' | 'scene' | 'style',
    definitionId: number,
  ): Promise<void> => {
    if (!user || !selectedSpaceId) return;

    setDeleteDefinitionError(null);
    setDeleteDefinitionLoadingId(definitionId);

    try {
      const pathSegment =
        kind === 'character'
          ? 'characters'
          : kind === 'scene'
          ? 'scenes'
          : 'styles';

      const res = await fetch(
        `/api/spaces/${selectedSpaceId}/${pathSegment}/${definitionId}`,
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
        } else if (kind === 'scene') {
          setSpaceScenes((prev) =>
            prev.filter((definition) => definition.id !== definitionId),
          );
        } else {
          setSpaceStyles((prev) =>
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
        setSpaceStyles([]);
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

  const handleEditSpaceDefinition = (
    kind: 'character' | 'scene' | 'style',
    definitionId: number,
  ): void => {
    if (!selectedSpaceId) return;

    if (kind === 'character') {
      navigateTo({
        kind: 'spaceEditCharacter',
        spaceId: selectedSpaceId,
        definitionId,
      });
    } else if (kind === 'scene') {
      navigateTo({
        kind: 'spaceEditScene',
        spaceId: selectedSpaceId,
        definitionId,
      });
    } else {
      navigateTo({
        kind: 'spaceEditStyle',
        spaceId: selectedSpaceId,
        definitionId,
      });
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

      if (projectIdForImport) {
        void loadProjectDefinitions(projectIdForImport);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to import definitions.';
      setImportError(message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportSingleDefinition = (
    kind: 'character' | 'scene' | 'style',
    definitionId: number,
  ): void => {
    const projectIdForImport =
      selectedProjectId && isProjectRoute
        ? selectedProjectId
        : route.kind === 'project'
        ? route.projectId
        : null;
    if (!user || !selectedSpaceId || !projectIdForImport) return;

    setImportError(null);
    setImportLoading(true);

    (async () => {
      try {
        const payload: {
          characters?: number[];
          scenes?: number[];
          styles?: number[];
        } = {};

        if (kind === 'character') {
          payload.characters = [definitionId];
        } else if (kind === 'scene') {
          payload.scenes = [definitionId];
        } else {
          payload.styles = [definitionId];
        }

        const res = await fetch(
          `/api/projects/${projectIdForImport}/import`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
          },
        );

        const body = (await res.json().catch(() => null)) as
          | {
              imported?: {
                characters?: DefinitionSummary[];
                scenes?: DefinitionSummary[];
                styles?: DefinitionSummary[];
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
              'The selected definition could not be found for this space.',
            );
          } else {
            setImportError('Failed to import definition into project.');
          }
          return;
        }

        if (!body?.imported) {
          setImportError('Definition was imported but not returned.');
          return;
        }

        void loadProjectDefinitions(projectIdForImport);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to import definition.';
        setImportError(message);
      } finally {
        setImportLoading(false);
      }
    })();
  };

  const handleDeleteProjectDefinition = async (
    kind: 'character' | 'scene' | 'style',
    definitionId: number,
  ): Promise<void> => {
    const projectIdForDelete =
      selectedProjectId && isProjectRoute
        ? selectedProjectId
        : route.kind === 'project'
        ? route.projectId
        : null;
    if (!user || !projectIdForDelete) return;

    setProjectDefinitionsError(null);

    try {
      const res = await fetch(
        `/api/projects/${projectIdForDelete}/definitions/${kind === 'character' ? 'characters' : kind === 'scene' ? 'scenes' : 'styles'}/${definitionId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );

      if (res.status === 204) {
        if (kind === 'character') {
          setProjectCharacters((prev) =>
            prev.filter((definition) => definition.id !== definitionId),
          );
        } else if (kind === 'scene') {
          setProjectScenes((prev) =>
            prev.filter((definition) => definition.id !== definitionId),
          );
        } else {
          setProjectStyles((prev) =>
            prev.filter((definition) => definition.id !== definitionId),
          );
        }
        return;
      }

      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      const code = body?.error;

      if (code === 'DEFINITION_NOT_FOUND_FOR_PROJECT') {
        setProjectDefinitionsError('Definition not found for this project.');
      } else if (code === 'UNAUTHENTICATED') {
        setProjectDefinitionsError(
          'You must be logged in to modify project definitions.',
        );
        setUser(null);
        setSpaces([]);
        setProjectCharacters([]);
        setProjectScenes([]);
        setProjectStyles([]);
      } else if (code === 'INVALID_DEFINITION_ID') {
        setProjectDefinitionsError('The requested definition id is invalid.');
      } else {
        setProjectDefinitionsError('Failed to delete project definition.');
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to delete project definition.';
      setProjectDefinitionsError(message);
    }
  };

  const handleCreateTask = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!user) return;

    const isSpaceTaskContext = isSpaceContextRoute && !isProjectRoute;

    const projectIdForTask =
      !isSpaceTaskContext &&
      (selectedProjectId && isProjectRoute
        ? selectedProjectId
        : route.kind === 'project'
        ? route.projectId
        : null);

    const spaceIdForTask =
      isSpaceTaskContext && selectedSpaceId ? selectedSpaceId : null;

    if (!projectIdForTask && !spaceIdForTask) return;

    setCreateTaskError(null);
    setCreateTaskLoading(true);

    try {
      const baseUrl = projectIdForTask
        ? `/api/projects/${projectIdForTask}`
        : `/api/spaces/${spaceIdForTask}`;

      const res = await fetch(`${baseUrl}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newTaskName,
          description: newTaskDescription || null,
          prompt: null,
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
        } else if (code === 'SPACE_NOT_FOUND') {
          setCreateTaskError('Space not found or not owned by this user.');
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
      setNewTaskDescription('');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create task.';
      setCreateTaskError(message);
    } finally {
      setCreateTaskLoading(false);
    }
  };

  const handleRenderTask = async (params: {
    taskId: number;
    characterIds: number[];
    sceneId: number | null;
    styleId: number | null;
    prompt: string | null;
  }): Promise<void> => {
    if (!user) return;

    const { taskId, characterIds, sceneId, styleId, prompt } = params;

    setRenderError(null);
    setRenderingTaskId(taskId);

    try {
      const res = await fetch(`/api/tasks/${taskId}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: prompt ?? null,
          styleDefinitionId: styleId ?? null,
          characterDefinitionIds: characterIds ?? [],
          sceneDefinitionId: sceneId ?? null,
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

  const handleUpdateRenderedAssetState = async (
    assetId: number,
    state: 'draft' | 'approved' | 'archived',
  ): Promise<void> => {
    if (!user) return;

    setAssetsError(null);

    try {
      const res = await fetch(`/api/rendered-assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ state }),
      });

      const body = (await res.json().catch(() => null)) as
        | { asset?: RenderedAssetSummary; error?: string }
        | null;

      if (!res.ok) {
        const code = body?.error;
        if (code === 'UNAUTHENTICATED') {
          setAssetsError('You must be logged in to update rendered assets.');
          setUser(null);
          setSpaces([]);
          setProjects([]);
          setTasks([]);
          setRenderedAssets([]);
        } else if (code === 'RENDERED_ASSET_NOT_FOUND') {
          setAssetsError('Rendered asset not found or not owned by this user.');
        } else if (code === 'INVALID_RENDERED_ASSET_STATE') {
          setAssetsError('Invalid rendered asset state.');
        } else {
          setAssetsError('Failed to update rendered asset.');
        }
        return;
      }

      if (!body?.asset) {
        return;
      }

      if (state === 'archived') {
        setRenderedAssets((prev) => prev.filter((a) => a.id !== assetId));
      } else {
        setRenderedAssets((prev) =>
          prev.map((a) => (a.id === body.asset!.id ? body.asset! : a)),
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update rendered asset.';
      setAssetsError(message);
    }
  };

  const handleDeleteTask = async (taskId: number): Promise<void> => {
    if (!user) return;

    setTasksError(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.status === 204) {
        setTasks((prev) => prev.filter((task) => task.id !== taskId));
        setRenderedAssets((prev) =>
          prev.filter((asset) => asset.task_id !== taskId),
        );
        return;
      }

      const body = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      const code = body?.error;

      if (code === 'UNAUTHENTICATED') {
        setTasksError('You must be logged in to delete tasks.');
        setUser(null);
        setSpaces([]);
        setProjects([]);
        setTasks([]);
        setRenderedAssets([]);
      } else if (code === 'TASK_NOT_FOUND') {
        setTasksError('Task not found or not owned by this user.');
      } else if (code === 'TASK_HAS_APPROVED_RENDERS') {
        setTasksError(
          'Cannot delete this task because it has approved renders.',
        );
      } else if (code === 'INVALID_TASK_ID') {
        setTasksError('The requested task id is invalid.');
      } else {
        setTasksError('Failed to delete task.');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete task.';
      setTasksError(message);
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
                onEditDefinition={handleEditSpaceDefinition}
                onCloneDefinition={handleCloneSpaceDefinition}
              />
            )}

            {isSpaceOverviewRoute && selectedSpaceId && (
              <SpaceTasksView
                spaceCharacters={spaceCharacters}
                spaceScenes={spaceScenes}
                spaceStyles={spaceStyles}
                tasksLoading={tasksLoading}
                tasksError={tasksError}
                tasks={tasks}
                newTaskName={newTaskName}
                setNewTaskName={setNewTaskName}
                newTaskDescription={newTaskDescription}
                setNewTaskDescription={setNewTaskDescription}
                createTaskLoading={createTaskLoading}
                createTaskError={createTaskError}
                renderingTaskId={renderingTaskId}
                renderError={renderError}
                assetsLoading={assetsLoading}
                assetsError={assetsError}
                renderedAssets={renderedAssets}
                onCreateTask={handleCreateTask}
                onRenderTask={handleRenderTask}
                onUpdateRenderedAssetState={handleUpdateRenderedAssetState}
                onDeleteTask={handleDeleteTask}
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
                projectStyles={projectStyles}
                spaceCharacters={spaceCharacters}
                spaceScenes={spaceScenes}
                spaceStyles={spaceStyles}
                tasksLoading={tasksLoading}
                tasksError={tasksError}
                tasks={tasks}
                newTaskName={newTaskName}
                setNewTaskName={setNewTaskName}
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
          onImportSingleDefinition={handleImportSingleDefinition}
          onRemoveProjectDefinition={handleDeleteProjectDefinition}
          onUpdateRenderedAssetState={handleUpdateRenderedAssetState}
          onDeleteTask={handleDeleteTask}
        />
      )}
          </>
        )}
      </section>

      {(isCreateCharacterRoute || isEditCharacterRoute) &&
        currentSpace &&
        selectedSpaceId && (
          <CharacterDefinitionFormView
            mode={isEditCharacterRoute ? 'edit' : 'create'}
            spaceName={currentSpace.name}
            selectedSpaceId={selectedSpaceId}
            createDefinitionLoading={createDefinitionLoading}
            newCharacterName={newCharacterName}
            newCharacterDescription={newCharacterDescription}
            characterMetadata={characterMetadata}
            setNewCharacterName={setNewCharacterName}
            setNewCharacterDescription={setNewCharacterDescription}
            setCharacterMetadata={setCharacterMetadata}
            onSubmit={(e) => void handleCreateDefinition(e, 'character')}
            onCancel={() =>
              navigateTo({ kind: 'space', spaceId: selectedSpaceId })
            }
          />
        )}

      {(isCreateSceneRoute || isEditSceneRoute) &&
        currentSpace &&
        selectedSpaceId && (
          <SceneDefinitionFormView
            mode={isEditSceneRoute ? 'edit' : 'create'}
            spaceName={currentSpace.name}
            selectedSpaceId={selectedSpaceId}
            createDefinitionLoading={createDefinitionLoading}
            newSceneName={newSceneName}
            newSceneDescription={newSceneDescription}
            sceneMetadata={sceneMetadata}
            setNewSceneName={setNewSceneName}
            setNewSceneDescription={setNewSceneDescription}
            setSceneMetadata={setSceneMetadata}
            onSubmit={(e) => void handleCreateDefinition(e, 'scene')}
            onCancel={() =>
              navigateTo({ kind: 'space', spaceId: selectedSpaceId })
            }
          />
        )}

      {(isCreateStyleRoute || isEditStyleRoute) &&
        currentSpace &&
        selectedSpaceId && (
          <StyleDefinitionFormView
            mode={isEditStyleRoute ? 'edit' : 'create'}
            spaceName={currentSpace.name}
            selectedSpaceId={selectedSpaceId}
            createDefinitionLoading={createDefinitionLoading}
            newStyleName={newStyleName}
            newStyleDescription={newStyleDescription}
            styleMetadata={styleMetadata}
            setNewStyleName={setNewStyleName}
            setNewStyleDescription={setNewStyleDescription}
            setStyleMetadata={setStyleMetadata}
            onSubmit={(e) => void handleCreateStyleDefinition(e)}
            onCancel={() =>
              navigateTo({ kind: 'space', spaceId: selectedSpaceId })
            }
          />
        )}


    </main>
  );
}

export default App;
