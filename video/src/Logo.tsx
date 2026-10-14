import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "./theme";

// Gold ring draws, cross appears, then the name fades in
export const Mark: React.FC<{ size: number; progress?: number }> = ({ size, progress = 1 }) => {
  const ends: [number, number][] = [[50, 17], [50, 83], [17, 50], [83, 50]];
  const ring = 2 * Math.PI * 47;
  const crossOpacity = interpolate(progress, [0.45, 0.85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const crossScale = interpolate(progress, [0.45, 0.85], [0.85, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="47" fill="none" stroke={C.gold} strokeWidth="2.5" strokeDasharray={ring} strokeDashoffset={ring * (1 - Math.min(1, progress / 0.5))} transform="rotate(-90 50 50)" />
      <g fill="#f6eedc" opacity={crossOpacity} transform={`translate(50 50) scale(${crossScale}) translate(-50 -50)`}>
        <rect x="44" y="20" width="12" height="60" rx="3" />
        <rect x="20" y="44" width="60" height="12" rx="3" />
        {ends.map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r="8" />
            <circle cx={x + (y === 50 ? 0 : -9)} cy={y + (y === 50 ? -9 : 0)} r="4.5" />
            <circle cx={x + (y === 50 ? 0 : 9)} cy={y + (y === 50 ? 9 : 0)} r="4.5" />
          </g>
        ))}
        <rect x="45" y="45" width="10" height="10" fill={C.gold} transform="rotate(45 50 50)" />
      </g>
    </svg>
  );
};

export const LogoAnim: React.FC<{ size?: number; delay?: number; stacked?: boolean }> = ({ size = 220, delay = 0, stacked = true }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = Math.max(0, f - delay * fps) / fps;
  const p = Math.min(1, t / 1.6);
  const text = interpolate(t, [1.4, 2.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", flexDirection: stacked ? "column" : "row", alignItems: "center", gap: size * 0.12 }}>
      <Mark size={size} progress={p} />
      <div style={{ textAlign: stacked ? "center" : "left", opacity: text, transform: `translateY(${(1 - text) * 14}px)` }}>
        <div style={{ fontFamily: FONT.title, fontSize: size * 0.34, letterSpacing: size * 0.04, color: C.cream, lineHeight: 1 }}>AMOINEE</div>
        <div style={{ fontFamily: FONT.coptic, fontSize: size * 0.15, letterSpacing: size * 0.06, color: "#e6cf8f", marginTop: size * 0.06 }}>ⲁⲙⲱⲓⲛⲓ</div>
      </div>
    </div>
  );
};
