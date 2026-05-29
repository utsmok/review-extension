interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  titleClassName?: string;
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  className?: string;
}

export default function EmptyState({
  title,
  description,
  icon,
  titleClassName,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={`empty-state flex flex-col items-center justify-center py-ut-8 text-center${className ? ` ${className}` : ""}`}>
      {icon && <div className="mb-ut-2">{icon}</div>}
      <p
        className={`text-ut-sm text-ut-muted font-bold mb-ut-1${titleClassName ? ` ${titleClassName}` : ""}`}
      >
        {title}
      </p>
      {description && <p className="text-ut-xs text-ut-slate mb-ut-3">{description}</p>}
      {action && (
        <button
          type="button"
          className="tab-empty-state__action"
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
