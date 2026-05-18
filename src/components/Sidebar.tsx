import { X, TriangleAlert } from 'lucide-react';

interface SidebarProps {
  node: any;
  onClose: () => void;
}

export function Sidebar({ node, onClose }: SidebarProps) {
  if (!node) return null;

  const data = node.data;

    const renderDetails = (details: any, depth = 0) => {
    if (!details || typeof details !== 'object') {
      return <span className="text-slate-700 break-words font-medium">{String(details)}</span>;
    }

    return (
      <div className={`pl-${depth > 0 ? 3 : 0} flex flex-col gap-1.5 w-full`}>
        {Object.entries(details).map(([key, value]) => {
          // Skip large nested objects that are already rendered as nodes (like actions)
          if (key === 'actions' && Array.isArray(value)) {
            return (
              <div key={key} className="py-2 border-b border-slate-100 last:border-0">
                <span className="font-bold text-indigo-500 text-xs tracking-wider uppercase">{key}:</span>
                <span className="ml-2 text-xs text-slate-400 italic">[{value.length} actions in flow]</span>
              </div>
            );
          }
          if (key === 'cases' && Array.isArray(value)) {
            return (
              <div key={key} className="py-2 border-b border-slate-100 last:border-0">
                <span className="font-bold text-indigo-500 text-xs tracking-wider uppercase">{key}:</span>
                <span className="ml-2 text-xs text-slate-400 italic">[{value.length} cases]</span>
              </div>
            );
          }

          return (
            <div key={key} className="py-2 border-b border-slate-100 last:border-0">
              <span className="font-bold text-indigo-500 text-xs tracking-wider uppercase block mb-1">{key}</span>
              <div className="text-sm bg-slate-50 p-2.5 rounded-lg border border-slate-200 shadow-sm">
                {renderDetails(value, depth + 1)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-96 bg-white/95 backdrop-blur-2xl border-l border-slate-200 shadow-2xl flex flex-col h-full overflow-hidden absolute right-0 top-0 z-50 transform transition-transform duration-300">
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
        <div>
          <h2 className="text-xl font-black text-slate-800">{data.label}</h2>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
            {data.type}
          </span>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200 group"
        >
          <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
        {data.validationMode && data.validationWarnings && data.validationWarnings.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4 shadow-sm">
            <h3 className="text-rose-800 font-bold text-sm mb-2 flex items-center gap-2">
              <TriangleAlert className="w-4 h-4" />
              Configuration Warnings
            </h3>
            <ul className="list-disc list-inside space-y-1">
              {data.validationWarnings.map((warning: string, i: number) => (
                <li key={i} className="text-rose-600 text-xs font-medium leading-tight">{warning}</li>
              ))}
            </ul>
          </div>
        )}
      
        {data.details && Object.keys(data.details).length > 0 ? (
          renderDetails(data.details)
        ) : (
          <div className="text-slate-400 italic text-sm text-center mt-12 bg-slate-50 p-6 rounded-xl border border-slate-100">
            No additional details available for this node.
          </div>
        )}
      </div>
    </div>
  );
}
