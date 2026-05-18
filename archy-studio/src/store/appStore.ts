import { create } from 'zustand';

export interface Profile {
  id: string;
  name: string;
  region: string;
  orgName: string;
  division?: string;
  clientId: string;
  clientSecret: string;
  substitutions?: Record<string, string>;
  gitRemote?: string;
  gitBranch?: string;
  workspaceDir?: string;
  connectionStatus?: 'untested' | 'connected' | 'error';
}

export interface LogEntry {
  id: string;
  operationId: string;
  operationName: string;
  type: 'stdout' | 'stderr' | 'cmd' | 'error' | 'done';
  line: string;
  ts: number;
  exitCode?: number;
}

export interface Operation {
  id: string;
  name: string;
  profileId: string;
  status: 'running' | 'success' | 'error';
  startedAt: number;
  endedAt?: number;
}

export interface YamlFile {
  name: string;
  path: string;
  size: number;
  modified: string;
}

interface AppState {
  profiles: Profile[];
  activeProfileId: string | null;
  archyInstalled: boolean;
  archyVersion: string | null;
  logs: LogEntry[];
  operations: Operation[];
  activeFile: string | null;
  editorContent: string;
  yamlFiles: YamlFile[];

  setProfiles: (p: Profile[]) => void;
  addOrUpdateProfile: (p: Profile) => void;
  removeProfile: (id: string) => void;
  setActiveProfile: (id: string | null) => void;
  setArchyStatus: (installed: boolean, version: string | null) => void;
  addLog: (entry: LogEntry) => void;
  clearLogs: (operationId?: string) => void;
  addOperation: (op: Operation) => void;
  updateOperation: (id: string, upd: Partial<Operation>) => void;
  setActiveFile: (name: string | null) => void;
  setEditorContent: (c: string) => void;
  setYamlFiles: (files: YamlFile[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  profiles: [],
  activeProfileId: null,
  archyInstalled: false,
  archyVersion: null,
  logs: [],
  operations: [],
  activeFile: null,
  editorContent: '',
  yamlFiles: [],

  setProfiles: (profiles) => set({ profiles }),
  addOrUpdateProfile: (p) =>
    set((s) => ({
      profiles: s.profiles.find((x) => x.id === p.id)
        ? s.profiles.map((x) => (x.id === p.id ? p : x))
        : [...s.profiles, p],
    })),
  removeProfile: (id) =>
    set((s) => ({
      profiles: s.profiles.filter((p) => p.id !== id),
      activeProfileId: s.activeProfileId === id ? null : s.activeProfileId,
    })),
  setActiveProfile: (id) => set({ activeProfileId: id }),
  setArchyStatus: (archyInstalled, archyVersion) => set({ archyInstalled, archyVersion }),
  addLog: (entry) => set((s) => ({ logs: [...s.logs.slice(-4999), entry] })),
  clearLogs: (operationId) =>
    set((s) => ({
      logs: operationId ? s.logs.filter((l) => l.operationId !== operationId) : [],
    })),
  addOperation: (op) => set((s) => ({ operations: [op, ...s.operations.slice(0, 49)] })),
  updateOperation: (id, upd) =>
    set((s) => ({ operations: s.operations.map((o) => (o.id === id ? { ...o, ...upd } : o)) })),
  setActiveFile: (activeFile) => set({ activeFile }),
  setEditorContent: (editorContent) => set({ editorContent }),
  setYamlFiles: (yamlFiles) => set({ yamlFiles }),
}));
