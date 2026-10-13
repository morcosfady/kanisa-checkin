// Amoinee logo: gold ring, budded Coptic cross, gold diamond centre. Pure SVG, no image.
export function Mark({ size = 48 }: { size?: number }) {
  const ends: [number, number][] = [[50, 17], [50, 83], [17, 50], [83, 50]];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="shrink-0">
      <circle cx="50" cy="50" r="47" fill="none" stroke="var(--gold-500)" strokeWidth="2.5" />
      <g fill="#f6eedc">
        <rect x="44" y="20" width="12" height="60" rx="3" />
        <rect x="20" y="44" width="60" height="12" rx="3" />
        {ends.map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r="8" />
            <circle cx={x + (y === 50 ? 0 : -9)} cy={y + (y === 50 ? -9 : 0)} r="4.5" />
            <circle cx={x + (y === 50 ? 0 : 9)} cy={y + (y === 50 ? 9 : 0)} r="4.5" />
          </g>
        ))}
      </g>
      <rect x="45" y="45" width="10" height="10" fill="var(--gold-500)" transform="rotate(45 50 50)" />
    </svg>
  );
}

type LogoProps = { variant?: "full" | "mark"; size?: number; stacked?: boolean };

// Cream text: use on burgundy or dark surfaces
export function Logo({ variant = "full", size = 48, stacked = false }: LogoProps) {
  if (variant === "mark") return <Mark size={size} />;
  return (
    <div className={`flex items-center gap-3 ${stacked ? "flex-col text-center" : ""}`}>
      <Mark size={size} />
      <div>
        <div className="font-display leading-none tracking-wider text-cream" style={{ fontSize: size * 0.6, fontWeight: 600 }}>
          AMOINEE
        </div>
        <div className="mt-1 font-[family-name:var(--font-coptic)] tracking-[0.3em] text-gold" style={{ fontSize: size * 0.24 }}>
          ⲁⲙⲱⲓⲛⲓ
        </div>
      </div>
    </div>
  );
}
