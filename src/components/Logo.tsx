// Amoinee mark: gold ring, budded Coptic cross, gold diamond centre
export function Mark({ size = 48 }: { size?: number }) {
  const ends: [number, number][] = [[50, 17], [50, 83], [17, 50], [83, 50]];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="47" fill="none" stroke="var(--color-gold)" strokeWidth="2.5" />
      <g fill="var(--color-cream)">
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
      <rect x="45" y="45" width="10" height="10" fill="var(--color-gold)" transform="rotate(45 50 50)" />
    </svg>
  );
}

export function Logo({ size = 48, stacked = false }: { size?: number; stacked?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${stacked ? "flex-col text-center" : ""}`}>
      <Mark size={size} />
      <div>
        <div className="font-[family-name:var(--font-cinzel)] leading-none tracking-wider text-cream" style={{ fontSize: size * 0.6 }}>
          AMOINEE
        </div>
        <div className="mt-1 font-[family-name:var(--font-coptic)] tracking-[0.3em] text-gold" style={{ fontSize: size * 0.24 }}>
          ⲁⲙⲱⲓⲛⲓ
        </div>
      </div>
    </div>
  );
}
