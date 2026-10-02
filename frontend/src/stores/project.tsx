import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import type { ProjectItem } from '../types';

interface ProjectContextValue {
  projects: ProjectItem[];
  currentProject: ProjectItem | null;
  loading: boolean;
  loadProjects: () => Promise<void>;
  selectProject: (p: ProjectItem) => void;
  createProject: (data: { name: string; type?: string; description?: string }) => Promise<ProjectItem>;
  deleteProject: (id: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const DEFAULT_PROJECT: ProjectItem = {
  id: 'p1',
  name: '微表情识别（MER）研究',
  title: '微表情识别（MER）研究',
  type: 'research',
  field: '计算机视觉 · 情感计算',
  description: '基于自注意力与 AU 解剖拓扑融合的细粒度微表情识别课题',
  status: 'active',
  created_at: new Date().toISOString(),
  stats: { documents: 14, experiments: 6, charts: 9, manuscripts: 2 },
};

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<ProjectItem[]>([DEFAULT_PROJECT]);
  const [currentProject, setCurrentProject] = useState<ProjectItem | null>(() => {
    try {
      const saved = localStorage.getItem('sciencex_current_project');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PROJECT;
  });
  const [loading, setLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ items: ProjectItem[] } | ProjectItem[]>('/projects');
      const items = (res as any)?.items || (Array.isArray(res) ? res : []);
      if (items.length > 0) {
        setProjects(items);
        setCurrentProject((prev) => {
          if (!prev) return items[0];
          const found = items.find((p: any) => p.id === prev.id);
          return found || items[0];
        });
      }
    } catch {
      // 容灾模式保持现有列表
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const selectProject = useCallback((p: ProjectItem) => {
    setCurrentProject(p);
    try {
      localStorage.setItem('sciencex_current_project', JSON.stringify(p));
    } catch {}
  }, []);

  const createProject = useCallback(async (data: { name: string; type?: string; description?: string }) => {
    const p = await api<ProjectItem>('/projects', { method: 'POST', body: data });
    setProjects((xs) => [p, ...xs]);
    selectProject(p);
    return p;
  }, [selectProject]);

  const deleteProject = useCallback(async (id: string) => {
    await api(`/projects/${id}`, { method: 'DELETE' });
    setProjects((xs) => {
      const filtered = xs.filter((p) => p.id !== id);
      if (currentProject?.id === id && filtered.length > 0) {
        selectProject(filtered[0]);
      }
      return filtered;
    });
  }, [currentProject, selectProject]);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        loading,
        loadProjects,
        selectProject,
        createProject,
        deleteProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProject must be used within ProjectProvider');
  }
  return ctx;
}
