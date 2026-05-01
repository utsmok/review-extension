import { useState } from 'react';
import { useSessionStore } from '@/stores/session';

export default function SessionInit() {
  const startSession = useSessionStore((s) => s.startSession);
  const [toolName, setToolName] = useState('');
  const [toolUrl, setToolUrl] = useState('');

  const handleStart = () => {
    if (!toolName.trim() || !toolUrl.trim()) return;
    startSession({
      toolName: toolName.trim(),
      toolUrl: toolUrl.trim(),
      startTime: new Date().toISOString(),
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-lg font-bold">TRUST Review</h1>
      <p className="text-sm text-gray-600">
        Evaluate academic search tools against the TRUST framework.
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Tool Name *</span>
        <input
          className="border rounded px-2 py-1 text-sm"
          value={toolName}
          onChange={(e) => setToolName(e.target.value)}
          placeholder="e.g. Semantic Scholar"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Tool URL *</span>
        <input
          className="border rounded px-2 py-1 text-sm"
          value={toolUrl}
          onChange={(e) => setToolUrl(e.target.value)}
          placeholder="https://..."
        />
      </label>

      <button
        className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
        disabled={!toolName.trim() || !toolUrl.trim()}
        onClick={handleStart}
      >
        Start Review Session
      </button>
    </div>
  );
}
