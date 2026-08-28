/**
 * Projects API
 * ------------
 * All mutating requests include credentials: 'include' so the HttpOnly
 * session cookie is automatically sent with each request.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface Project {
  id?: string;
  name: string;
  category: string;
  location: string;
  shortDescription: string;
  projectStatus: string;
  coverImage: string;
  publishStatus: 'published' | 'draft';
  showOnLandingPage: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const fetchProjects = async (): Promise<Project[]> => {
  const response = await fetch(`${API_BASE}/api/projects`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch projects');
  return response.json();
};

export const fetchProjectById = async (id: string): Promise<Project> => {
  const projects = await fetchProjects();
  const project = projects.find((p) => p.id === id);
  if (!project) throw new Error('Project not found');
  return project;
};

export const createProject = async (project: Project): Promise<Project> => {
  const response = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(project),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create project');
  }
  return response.json();
};

export const updateProject = async (
  id: string,
  project: Partial<Project>
): Promise<Project> => {
  const response = await fetch(`${API_BASE}/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(project),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update project');
  }
  return response.json();
};

export const deleteProject = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/api/projects/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete project');
  }
};
