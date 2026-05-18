import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { EnvironmentsPage } from './features/environments/EnvironmentsPage';
import { FlowsPage } from './features/flows/FlowsPage';
import { YamlEditorPage } from './features/editor/YamlEditorPage';
import { SubstitutionsPage } from './features/substitutions/SubstitutionsPage';
import { GitPage } from './features/git/GitPage';
import { DeployLogPage } from './features/deploylog/DeployLogPage';
import { useAppStore } from './store/appStore';
import { api } from './api/client';
import './index.css';

function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/flows" replace />} />
          <Route path="/environments" element={<EnvironmentsPage />} />
          <Route path="/flows" element={<FlowsPage />} />
          <Route path="/editor" element={<YamlEditorPage />} />
          <Route path="/editor/:filename" element={<YamlEditorPage />} />
          <Route path="/substitutions" element={<SubstitutionsPage />} />
          <Route path="/git" element={<GitPage />} />
          <Route path="/log" element={<DeployLogPage />} />
        </Routes>
      </main>
      <StatusBar />
    </div>
  );
}

export default function App() {
  const { setProfiles, setArchyStatus } = useAppStore();

  useEffect(() => {
    // Boot: load profiles + check archy
    api.listProfiles()
      .then((profiles) => setProfiles(profiles))
      .catch(() => {});
    api.archyCheck()
      .then(({ installed, version }) => setArchyStatus(installed, version))
      .catch(() => setArchyStatus(false, null));
  }, [setProfiles, setArchyStatus]);

  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
