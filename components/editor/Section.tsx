import type { ReactNode } from "react";

/** Titled section with an optional one-line description and trailing action. */
export interface SectionProps {
  title: string;
  description?: string;
  /** Trailing control (e.g. an "Add" button) aligned to the right of the title. */
  action?: ReactNode;
  children: ReactNode;
}

export default function Section({ title, description, action, children }: SectionProps) {
  return (
    <section className="space-y-ut-2">
      <div className="flex items-start justify-between gap-ut-2">
        <div className="min-w-0">
          <h2 className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-ut-xs text-ut-muted leading-relaxed">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
