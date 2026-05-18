import { useCallback, useRef, useState } from 'react';
import { streamArchy } from '../api/client';
import { useAppStore } from '../store/appStore';
import type { LogEntry } from '../store/appStore';

type StreamStatus = 'idle' | 'running' | 'success' | 'error';

interface UseArchyStreamResult {
  status: StreamStatus;
  lines: LogEntry[];
  run: (endpoint: string, body: Record<string, unknown>, operationName: string) => void;
  abort: () => void;
  clear: () => void;
}

let opCounter = 0;

export function useArchyStream(): UseArchyStreamResult {
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [lines, setLines] = useState<LogEntry[]>([]);
  const abortRef = useRef<(() => void) | null>(null);
  const addLog = useAppStore((s) => s.addLog);
  const addOperation = useAppStore((s) => s.addOperation);
  const updateOperation = useAppStore((s) => s.updateOperation);

  const run = useCallback(
    (endpoint: string, body: Record<string, unknown>, operationName: string) => {
      if (abortRef.current) abortRef.current();
      setStatus('running');
      setLines([]);
      const operationId = `op-${++opCounter}-${Date.now()}`;
      addOperation({ id: operationId, name: operationName, profileId: (body.profileId as string) || '', status: 'running', startedAt: Date.now() });

      abortRef.current = streamArchy(endpoint, body, (event) => {
        if (event.type === 'done') {
          const succeeded = event.exitCode === 0;
          setStatus(succeeded ? 'success' : 'error');
          updateOperation(operationId, {
            status: succeeded ? 'success' : 'error',
            endedAt: Date.now(),
          });
          const doneEntry: LogEntry = {
            id: `${operationId}-done`,
            operationId,
            operationName,
            type: 'done',
            line: succeeded ? '✅ Command completed successfully' : `❌ Command failed (exit ${event.exitCode})`,
            ts: event.ts,
            exitCode: event.exitCode,
          };
          setLines((prev) => [...prev, doneEntry]);
          addLog(doneEntry);
        } else {
          const entry: LogEntry = {
            id: `${operationId}-${event.ts}-${Math.random()}`,
            operationId,
            operationName,
            type: event.type as LogEntry['type'],
            line: event.line || '',
            ts: event.ts,
          };
          setLines((prev) => [...prev, entry]);
          addLog(entry);
        }
      });
    },
    [addLog, addOperation, updateOperation]
  );

  const abort = useCallback(() => {
    if (abortRef.current) { abortRef.current(); abortRef.current = null; }
    setStatus('idle');
  }, []);

  const clear = useCallback(() => setLines([]), []);

  return { status, lines, run, abort, clear };
}
