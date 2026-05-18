import { Handle, Position } from '@xyflow/react';
import { 
  PlayCircle, PhoneForwarded, GitBranch, Terminal, 
  Database, StopCircle, RefreshCw, Layers, TriangleAlert
} from 'lucide-react';
import clsx from 'clsx';

export interface ActionNodeProps {
  data: {
    label: string;
    type: string;
    details: any;
    dimmed?: boolean;
    validationMode?: boolean;
    validationWarnings?: string[];
  };
}

const getIconForType = (type: string) => {
  switch (type) {
    case 'playAudio':
    case 'setWhisperAudio':
      return <PlayCircle className="w-5 h-5 text-blue-600" />;
    case 'transferToAcd':
    case 'transferToFlow':
    case 'transferToNumber':
      return <PhoneForwarded className="w-5 h-5 text-indigo-600" />;
    case 'switch':
    case 'decision':
      return <GitBranch className="w-5 h-5 text-orange-600" />;
    case 'updateData':
      return <RefreshCw className="w-5 h-5 text-emerald-600" />;
    case 'dataTableLookup':
      return <Database className="w-5 h-5 text-purple-600" />;
    case 'disconnect':
    case 'endTask':
      return <StopCircle className="w-5 h-5 text-rose-600" />;
    case 'callTask':
    case 'jumpToTask':
    case 'jumpToMenu':
    case 'callCommonModule':
      return <Layers className="w-5 h-5 text-teal-600" />;
    default:
      return <Terminal className="w-5 h-5 text-slate-500" />;
  }
};

const getBorderColorClass = (type: string) => {
  switch (type) {
    case 'playAudio':
    case 'setWhisperAudio':
      return 'border-l-blue-500 shadow-sm hover:shadow-md';
    case 'transferToAcd':
    case 'transferToFlow':
    case 'transferToNumber':
      return 'border-l-indigo-500 shadow-sm hover:shadow-md';
    case 'switch':
    case 'decision':
      return 'border-l-orange-500 shadow-sm hover:shadow-md';
    case 'updateData':
      return 'border-l-emerald-500 shadow-sm hover:shadow-md';
    case 'dataTableLookup':
      return 'border-l-purple-500 shadow-sm hover:shadow-md';
    case 'disconnect':
    case 'endTask':
      return 'border-l-rose-500 shadow-sm hover:shadow-md';
    case 'callTask':
    case 'jumpToTask':
    case 'jumpToMenu':
    case 'callCommonModule':
      return 'border-l-teal-500 shadow-sm hover:shadow-md';
    default:
      return 'border-l-slate-400 shadow-sm hover:shadow-md';
  }
};

export const getReadableType = (type: string) => {
  switch (type) {
    case 'playAudio':
    case 'setWhisperAudio': return 'Play Message';
    case 'transferToAcd': return 'Transfer to Queue';
    case 'transferToFlow': return 'Transfer to Flow';
    case 'transferToNumber': return 'Transfer to Number';
    case 'switch':
    case 'decision': return 'Decision Point';
    case 'updateData': return 'Update Data';
    case 'dataTableLookup': return 'Look up Data';
    case 'disconnect': return 'End Call';
    case 'endTask': return 'End Task';
    case 'callTask': return 'Execute Task';
    case 'jumpToTask': return 'Jump to Task';
    case 'jumpToMenu': return 'Jump to Menu';
    case 'callCommonModule': return 'Execute Module';
    default: return type;
  }
};

export function ActionNode({ data }: ActionNodeProps) {
  const hasWarnings = data.validationMode && data.validationWarnings && data.validationWarnings.length > 0;

  return (
    <div className={clsx(
      "px-5 py-4 min-w-[220px] rounded-xl font-sans flex flex-col bg-white border-l-[8px] transition-all duration-300 relative",
      hasWarnings ? "border-rose-500 border-y-rose-500 border-r-rose-500 shadow-lg shadow-rose-500/30" : `border border-slate-200 shadow-sm ${getBorderColorClass(data.type)}`,
      data.dimmed ? "opacity-20 grayscale scale-90" : "hover:scale-[1.05]",
      (!hasWarnings && !data.dimmed) && "shadow-md hover:shadow-slate-200"
    )}>
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 !bg-slate-300 !border-slate-100" />
      
      <div className="flex items-center gap-4">
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          {getIconForType(data.type)}
        </div>
        <div className="flex-1">
          <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 mb-0.5">
            {getReadableType(data.type)}
          </div>
          <div className="text-[13px] font-bold text-slate-800 leading-tight">
            {data.label}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 !bg-slate-300 !border-slate-100" />
      
      {hasWarnings && (
        <div className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1.5 shadow-lg border-2 border-white animate-pulse z-10">
          <TriangleAlert className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
