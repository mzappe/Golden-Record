type GoldenRecordOrbitLogoProps = {
  className?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  ariaHidden?: boolean;
};

export function GoldenRecordOrbitLogo({
  className = "",
  showWordmark = false,
  wordmarkClassName = "",
  ariaHidden = false
}: GoldenRecordOrbitLogoProps) {
  const logoClassName = `golden-record-orbit-logo${className ? ` ${className}` : ""}`;
  const mark = (
    <span className="golden-record-orbit-mark">
      <span className="golden-record-solar-halo" />
      <span className="golden-record-orbit-ring golden-record-orbit-ring-a" />
      <span className="golden-record-orbit-ring golden-record-orbit-ring-b" />
      <span className="golden-record-solar-core">GR</span>
    </span>
  );

  if (!showWordmark) {
    return (
      <span className={logoClassName} aria-hidden={ariaHidden}>
        {mark}
      </span>
    );
  }

  return (
    <span className={logoClassName} aria-hidden={ariaHidden}>
      {mark}
      <span className={`golden-record-orbit-wordmark${wordmarkClassName ? ` ${wordmarkClassName}` : ""}`}>Golden Record</span>
    </span>
  );
}
