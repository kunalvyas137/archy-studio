import { useState } from 'react';
import { HelpCircle, X, Zap, Menu, Layers, GitBranch, PhoneForwarded, StopCircle, Database } from 'lucide-react';
import clsx from 'clsx';

export function Legend() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-6 left-6 z-10 bg-white shadow-xl hover:shadow-2xl border border-slate-200 text-slate-600 px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 hover:-translate-y-1"
      >
        <HelpCircle className="w-5 h-5 text-indigo-500" />
        Flow Key / Legend
      </button>
    );
  }

  return (
    <div className="absolute bottom-6 left-6 z-10 bg-white/95 backdrop-blur-xl shadow-2xl border border-slate-200 rounded-xl w-80 overflow-hidden flex flex-col transform transition-all duration-300">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-slate-800">Flow Key</h3>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-5 space-y-5">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Major Steps</h4>
          <div className="space-y-3">
            <LegendItem icon={<Zap className="w-4 h-4" />} color="bg-emerald-50 text-emerald-600 border-emerald-200" label="Start Point" desc="Where the flow begins" />
            <LegendItem icon={<Menu className="w-4 h-4" />} color="bg-amber-50 text-amber-600 border-amber-200" label="Menu" desc="User makes a selection" />
            <LegendItem icon={<Layers className="w-4 h-4" />} color="bg-slate-50 text-slate-600 border-slate-200" label="Task / Group" desc="A grouped set of actions" />
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Actions</h4>
          <div className="space-y-3">
            <LegendItem icon={<PhoneForwarded className="w-4 h-4" />} color="bg-indigo-50 text-indigo-500 border-indigo-200" label="Transfers" desc="Moving the caller to a queue/number" />
            <LegendItem icon={<GitBranch className="w-4 h-4" />} color="bg-orange-50 text-orange-500 border-orange-200" label="Decisions" desc="Logic branches based on data" />
            <LegendItem icon={<Database className="w-4 h-4" />} color="bg-purple-50 text-purple-500 border-purple-200" label="Data Actions" desc="Fetching or updating CRM/Backend data" />
            <LegendItem icon={<StopCircle className="w-4 h-4" />} color="bg-rose-50 text-rose-500 border-rose-200" label="Disconnects" desc="The call ends here" />
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ icon, color, label, desc }: { icon: React.ReactNode, color: string, label: string, desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={clsx("p-1.5 rounded-md border shadow-sm", color)}>
        {icon}
      </div>
      <div>
        <div className="text-xs font-bold text-slate-700 leading-none mb-1">{label}</div>
        <div className="text-[10px] text-slate-500 leading-tight">{desc}</div>
      </div>
    </div>
  );
}
