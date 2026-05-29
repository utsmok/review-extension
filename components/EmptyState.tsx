interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  titleClassName?: string;
}

export default function EmptyState({ title, description, icon, titleClassName }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-ut-8 text-center">
      {icon && <div className="mb-ut-2">{icon}</div>}
      <p
        className={`text-ut-sm text-ut-muted font-bold mb-ut-1${titleClassName ? ` ${titleClassName}` : ""}`}
      >
        {title}
      </p>
      {description && <p className="text-ut-xs text-ut-slate">{description}</p>}
    </div>
  );
}
