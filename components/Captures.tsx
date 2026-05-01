import { useState } from 'react';
import { useSessionStore } from '@/stores/session';
import { captureActiveTab } from '@/lib/capture';
import { getRubricQuestionIds, TRUST_RUBRIC } from '@/lib/rubric';
import { getCategoryLabel } from '@/lib/rubric';

export default function Captures() {
  const captures = useSessionStore((s) => s.captures);
  const addCapture = useSessionStore((s) => s.addCapture);
  const updateCapture = useSessionStore((s) => s.updateCapture);
  const linkCaptureToRubric = useSessionStore((s) => s.linkCaptureToRubric);
  const unlinkCaptureFromRubric = useSessionStore(
    (s) => s.unlinkCaptureFromRubric,
  );
  const [capturing, setCapturing] = useState(false);

  const allRubricIds = getRubricQuestionIds(TRUST_RUBRIC);

  const handleCapture = async () => {
    setCapturing(true);
    try {
      const capture = await captureActiveTab();
      addCapture(capture);
    } catch (err) {
      console.error('Capture failed:', err);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <button
        className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
        disabled={capturing}
        onClick={handleCapture}
      >
        {capturing ? 'Capturing...' : 'Quick Capture'}
      </button>

      {captures.length === 0 && (
        <p className="text-sm text-gray-400">
          No captures yet. Click above to capture the active tab.
        </p>
      )}

      {captures.map((capture) => (
        <div key={capture.id} className="border rounded p-2">
          <img
            src={capture.screenshotBase64}
            alt="Capture"
            className="w-full rounded border"
          />
          <p className="text-xs text-gray-500 mt-1 truncate">
            {capture.sourceUrl}
          </p>
          <p className="text-xs text-gray-400">
            {new Date(capture.timestamp).toLocaleTimeString()}
          </p>

          <textarea
            className="w-full border rounded text-xs p-1 mt-1"
            rows={2}
            placeholder="Notes..."
            value={capture.notes}
            onChange={(e) =>
              updateCapture(capture.id, { notes: e.target.value })
            }
          />

          <div className="mt-1">
            <p className="text-xs font-medium">Tagged Rubric Items:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {allRubricIds.map((rubricId) => {
                const linked = capture.linkedRubricIds.includes(rubricId);
                return (
                  <button
                    key={rubricId}
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      linked
                        ? 'bg-blue-100 border-blue-400 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-400'
                    }`}
                    onClick={() =>
                      linked
                        ? unlinkCaptureFromRubric(capture.id, rubricId)
                        : linkCaptureToRubric(capture.id, rubricId)
                    }
                  >
                    {rubricId}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
