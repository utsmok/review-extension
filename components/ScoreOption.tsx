import React from "react";

interface ScoreOptionProps {
  name: string;
  isActive: boolean;
  isDisabled?: boolean;
  className?: string;
  dataScore?: string | number;
  dataJudgment?: string;
  children: React.ReactNode;
  onClick: () => void;
}

export const ScoreOption = React.memo(function ScoreOption({
  name,
  isActive,
  isDisabled = false,
  className = "",
  dataScore,
  dataJudgment,
  children,
  onClick,
}: ScoreOptionProps) {
  return (
    <label
      className={className}
      data-active={isActive ? "true" : undefined}
      data-score={dataScore}
      data-judgment={dataJudgment}
      tabIndex={isDisabled ? -1 : 0}
      onClick={(e) => {
        e.preventDefault();
        if (!isDisabled) onClick();
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isDisabled) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <input
        type="radio"
        name={name}
        checked={isActive}
        onChange={() => {}}
        className="sr-only"
        disabled={isDisabled}
        tabIndex={-1}
      />
      {children}
    </label>
  );
});
