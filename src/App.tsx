import { Suspense, lazy } from 'react';
import { ReactFlowProvider } from '@xyflow/react';

// Lazy load the heavy FlowApp to drastically reduce initial bundle size
const FlowApp = lazy(() => import('./FlowApp'));

export default function App() {
  return (
    <ReactFlowProvider>
      <Suspense fallback={
        <div className="w-full h-screen flex flex-col items-center justify-center bg-[#0b1120] text-indigo-400">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <div className="text-sm font-semibold uppercase tracking-widest">Loading Visualizer...</div>
        </div>
      }>
        <FlowApp />
      </Suspense>
    </ReactFlowProvider>
  );
}
