import { Handle, Position } from '@xyflow/react';
import { Layers, Menu, Play, TriangleAlert } from 'lucide-react';
import clsx from 'clsx';

export interface TaskNodeProps {
  data: {
    label: string;
    type: string;
    details: any;
    isTaskRoot: boolean;
    dimmed?: boolean;
    validationMode?: boolean;
    validationWarnings?: string[];
  };
}

export function TaskNode({ data }: TaskNodeProps) {
  const isStart = data.type === 'Start';
  const isMenu = data.type === 'Menu';

  const hasWarnings = data.validationMode && data.validationWarnings && data.validationWarnings.length > 0;

  return (
    <div className={clsx(
      "px-6 py-5 rounded-2xl shadow-xl font-sans w-full h-full flex flex-col justify-center backdrop-blur-md border-2 transition-all duration-300 relative overflow-hidden",
      hasWarnings ? "border-rose-500 shadow-rose-500/30" :
      isStart ? "bg-emerald-50 border-emerald-200 shadow-emerald-100" :
      isMenu ? "bg-amber-50 border-amber-200 shadow-amber-100" :
      "bg-white border-slate-200 shadow-slate-200",
      data.dimmed ? "opacity-20 grayscale scale-90" : "hover:scale-110",
      (!hasWarnings && !data.dimmed) && "hover:shadow-indigo-200/50 hover:border-indigo-300"
    )}>
      {/* Glossy top highlight - subtle for light theme */}
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-2xl"></div>

      {!isStart && <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-slate-300 !border-2 !border-slate-100 shadow-sm" />}
      
      <div className="flex flex-col items-center justify-center text-center gap-3 relative z-10">
        <div className={clsx(
          "p-3 rounded-xl shadow-lg",
          isStart ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/20" :
          isMenu ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/20" :
          "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 shadow-slate-200"
        )}>
          {isStart ? <Play className="w-7 h-7" fill="currentColor" /> : 
           isMenu ? <Menu className="w-7 h-7" /> : 
           <Layers className="w-7 h-7" />}
        </div>
        <div>
          <div className={clsx(
            "text-[10px] font-black uppercase tracking-[0.2em] mb-1.5",
            isStart ? "text-emerald-600" : isMenu ? "text-amber-600" : "text-slate-400"
          )}>
            {data.type}
          </div>
          <div className="text-xl font-black text-slate-800 break-words leading-tight">
            {data.label}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-slate-300 !border-2 !border-slate-100 shadow-sm" />
      
      {hasWarnings && (
        <div className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1.5 shadow-lg border-2 border-white animate-pulse">
          <TriangleAlert className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
