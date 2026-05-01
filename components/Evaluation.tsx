import { useSessionStore } from '@/stores/session';
import { TRUST_RUBRIC, getCategoryLabel } from '@/lib/rubric';
import type { PassFailScore, RubricScore } from '@/lib/types';

export default function Evaluation() {
  const evaluations = useSessionStore((s) => s.evaluations);
  const captures = useSessionStore((s) => s.captures);
  const setEvaluation = useSessionStore((s) => s.setEvaluation);

  const getEvaluation = (rubricId: string) =>
    evaluations.find((e) => e.rubricId === rubricId);

  const getEvidenceCaptures = (rubricId: string) =>
    captures.filter((c) => c.linkedRubricIds.includes(rubricId));

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Quality Gates */}
      <section>
        <h2 className="text-sm font-bold mb-2">
          Quality Gates (Pass/Fail)
        </h2>
        {Object.entries(TRUST_RUBRIC.quality_gate).map(
          ([category, questions]) => (
            <div key={category} className="mb-3">
              <h3 className="text-xs font-semibold text-gray-600 mb-1">
                {getCategoryLabel(category)}
              </h3>
              {Object.entries(questions).map(([qId, question]) => {
                const rubricId = `${category}.${qId}`;
                const ev = getEvaluation(rubricId);
                const evidence = getEvidenceCaptures(rubricId);
                return (
                  <div key={qId} className="border rounded p-2 mb-1">
                    <p className="text-xs font-medium">{qId}</p>
                    <p className="text-[10px] text-gray-500 mb-1">
                      {question.requirement}
                    </p>
                    <div className="flex gap-2 mb-1">
                      {(['pass', 'fail'] as PassFailScore[]).map((val) => (
                        <label
                          key={val}
                          className="flex items-center gap-1 text-xs"
                        >
                          <input
                            type="radio"
                            name={rubricId}
                            checked={ev?.score === val}
                            onChange={() =>
                              setEvaluation(rubricId, { score: val })
                            }
                          />
                          {val.charAt(0).toUpperCase() + val.slice(1)}
                        </label>
                      ))}
                    </div>
                    {evidence.length > 0 && (
                      <p className="text-[10px] text-gray-400">
                        {evidence.length} evidence capture(s)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ),
        )}
      </section>

      {/* Scoring Rubric */}
      <section>
        <h2 className="text-sm font-bold mb-2">Scoring Rubric (0-3)</h2>
        {Object.entries(TRUST_RUBRIC.scoring_rubric).map(
          ([category, questions]) => (
            <div key={category} className="mb-3">
              <h3 className="text-xs font-semibold text-gray-600 mb-1">
                {getCategoryLabel(category)}
              </h3>
              {Object.entries(questions).map(([qId, levels]) => {
                const rubricId = `${category}.${qId}`;
                const ev = getEvaluation(rubricId);
                const evidence = getEvidenceCaptures(rubricId);
                return (
                  <div key={qId} className="border rounded p-2 mb-1">
                    <p className="text-xs font-medium">{qId}</p>
                    <div className="flex gap-2 my-1">
                      {([0, 1, 2, 3] as RubricScore[]).map((val) => (
                        <label
                          key={val}
                          className="flex items-center gap-1 text-xs"
                          title={levels[String(val)]}
                        >
                          <input
                            type="radio"
                            name={rubricId}
                            checked={ev?.score === val}
                            onChange={() =>
                              setEvaluation(rubricId, { score: val })
                            }
                          />
                          {val}
                        </label>
                      ))}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {[0, 1, 2, 3].map((n) => (
                        <p key={n}>
                          <strong>{n}:</strong> {levels[String(n) as keyof typeof levels]}
                        </p>
                      ))}
                    </div>
                    <textarea
                      className="w-full border rounded text-xs p-1 mt-1"
                      rows={2}
                      placeholder="Notes..."
                      value={ev?.notes ?? ''}
                      onChange={(e) =>
                        setEvaluation(rubricId, { notes: e.target.value })
                      }
                    />
                    {evidence.length > 0 && (
                      <p className="text-[10px] text-gray-400">
                        {evidence.length} evidence capture(s)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ),
        )}
      </section>
    </div>
  );
}
