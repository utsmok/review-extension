import { useState } from 'react';
import { useSessionStore } from '@/stores/session';
import { exportSession } from '@/lib/export';

export default function Metadata() {
  const session = useSessionStore((s) => s.session);
  const updateMetadata = useSessionStore((s) => s.updateMetadata);
  const endSession = useSessionStore((s) => s.endSession);
  const captures = useSessionStore((s) => s.captures);
  const evaluations = useSessionStore((s) => s.evaluations);
  const [exporting, setExporting] = useState(false);

  if (!session) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportSession(session, captures, evaluations);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TRUST_Review_${session.toolName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      endSession();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-sm font-bold">Tool Details</h2>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium">Company</span>
        <input
          className="border rounded px-2 py-1 text-sm"
          value={session.company ?? ''}
          onChange={(e) => updateMetadata({ company: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium">Pricing</span>
        <input
          className="border rounded px-2 py-1 text-sm"
          value={session.pricing ?? ''}
          onChange={(e) => updateMetadata({ pricing: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium">Availability</span>
        <input
          className="border rounded px-2 py-1 text-sm"
          value={session.availability ?? ''}
          onChange={(e) => updateMetadata({ availability: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium">Terms & Conditions URL</span>
        <input
          className="border rounded px-2 py-1 text-sm"
          value={session.termsConditionsUrl ?? ''}
          onChange={(e) =>
            updateMetadata({ termsConditionsUrl: e.target.value })
          }
        />
      </label>

      <div className="mt-4 border-t pt-3">
        <p className="text-xs text-gray-500 mb-2">
          {captures.length} captures, {evaluations.length} evaluations
        </p>
        <button
          className="w-full bg-red-600 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
          disabled={exporting}
          onClick={handleExport}
        >
          {exporting ? 'Exporting...' : 'End Session & Export'}
        </button>
      </div>
    </div>
  );
}
