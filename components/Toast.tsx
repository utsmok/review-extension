import { type ToastType, useToastStore } from "@/stores/toast";

const typeStyles: Record<ToastType, { bg: string; border: string; text: string; label: string }> = {
  error: {
    bg: "bg-[color-mix(in_srgb,var(--ut-red)_10%,var(--ut-white))]",
    border: "border-[color-mix(in_srgb,var(--ut-red)_30%,var(--ut-border))]",
    text: "text-ut-red",
    label: "Error",
  },
  success: {
    bg: "bg-[color-mix(in_srgb,var(--ut-green)_10%,var(--ut-white))]",
    border: "border-[color-mix(in_srgb,var(--ut-green)_30%,var(--ut-border))]",
    text: "text-ut-green",
    label: "Success",
  },
  warning: {
    bg: "bg-[color-mix(in_srgb,var(--state-warning)_10%,var(--ut-white))]",
    border: "border-[color-mix(in_srgb,var(--state-warning)_30%,var(--ut-border))]",
    text: "text-state-warning",
    label: "Warning",
  },
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9998] flex flex-col gap-ut-1 p-ut-2"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const style = typeStyles[t.type];
        return (
          <div
            key={t.id}
            className={`toast-enter flex items-start gap-ut-2 px-ut-3 py-ut-2 border rounded-ut-sm ${style.bg} ${style.border}`}
            role={t.type === "error" ? "alert" : "status"}
            aria-live={t.type === "error" ? "assertive" : "polite"}
          >
            <span
              className={`text-ut-xs font-heading font-bold uppercase tracking-ut-label ${style.text} shrink-0`}
            >
              {style.label}
            </span>
            <span className="text-ut-xs text-ut-text flex-1 font-body leading-snug">
              {t.message}
            </span>
            {t.action && (
              <button
                type="button"
                className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-blue hover:underline shrink-0"
                onClick={() => {
                  t.action?.onClick();
                  removeToast(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              className="text-ut-slate hover:text-ut-text shrink-0 leading-none text-ut-sm"
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
}
