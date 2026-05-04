# Review Finalization

Pre-export step between completing the rubric and generating the PDF/zip.

## Flow

1. User finishes all rubric evaluations
2. User clicks "Finalize Review" (new button in Metadata tab or ActiveSession)
3. Finalization screen appears with:
   - **Overall conclusion** — free-text rich editor for reviewer's summary judgment
   - **Final grade** — dropdown or custom scale (to be defined; placeholder is pass/fail based on heuristics in nutrition label)
   - **Strengths** — bullet list, free text
   - **Weaknesses** — bullet list, free text
   - **Recommendations** — free text
   - **Attachments** — optional additional files (methodology notes, comparison tables)
4. On confirm, finalization data is saved to the session and included in export

## Data Model

```ts
interface ReviewFinalization {
  conclusion: string;          // overall summary
  grade: string;               // e.g. "pass", "conditional", "fail" — vocabulary TBD
  strengths: string[];         // bullet points
  weaknesses: string[];        // bullet points
  recommendations: string;    // free text
  finalizedAt: string;         // ISO timestamp
}
```

## Integration Points

- **Session store**: add `finalization: ReviewFinalization | null` to session state
- **Nutrition label**: replace placeholder verdict with `finalization.grade` + `finalization.conclusion` excerpt
- **PDF report**: add "Conclusions" page after scoring tables, before evidence index
- **CSV export**: add `review_conclusions.csv` with finalization fields
- **ActiveSession UI**: add "Finalize" tab or step after evaluation is complete (all questions scored)
- **SessionManager**: show finalization status badge in session cards

## Implementation Order

1. Add `ReviewFinalization` type to `lib/types.ts`
2. Add `finalization` field to session store with mutation actions
3. Create `components/FinalizationScreen.tsx`
4. Wire into `App.tsx` routing (after evaluation, before export)
5. Integrate finalization data into nutrition label (replace heuristics)
6. Add "Conclusions" page to PDF report
7. Add `review_conclusions.csv` to zip export

## Open Questions

- Grade vocabulary: simple pass/conditional/fail, or a numeric scale, or customizable per institution?
- Whether finalization is required before export or optional
- Whether a finalized review should become read-only (no further edits to scores)
- Whether the finalization step should enforce 100% completion (all questions scored)
