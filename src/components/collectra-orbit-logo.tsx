type CollectraOrbitLogoProps = {
  className?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  ariaHidden?: boolean;
};

export function CollectraOrbitLogo({
  className = "",
  showWordmark = false,
  wordmarkClassName = "",
  ariaHidden = false
}: CollectraOrbitLogoProps) {
  const logoClassName = `collectra-orbit-logo${className ? ` ${className}` : ""}`;
  const mark = (
    <span className="collectra-orbit-mark">
      <span className="collectra-solar-halo" />
      <span className="collectra-orbit-ring collectra-orbit-ring-a" />
      <span className="collectra-orbit-ring collectra-orbit-ring-b" />
      <span className="collectra-solar-core">C</span>
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
      <span className={`collectra-orbit-wordmark${wordmarkClassName ? ` ${wordmarkClassName}` : ""}`}>Collectra</span>
    </span>
  );
}
