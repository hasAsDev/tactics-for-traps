interface XpBarProps {
  xpIntoLevel: number;
  xpForNext: number;
  level: number;
}

const PIPS = 20;

/** Thanh XP gồm 20 ô rời (không bao giờ tô nửa ô). */
export function XpBar({ xpIntoLevel, xpForNext, level }: XpBarProps) {
  const ratio = xpForNext > 0 ? Math.min(1, Math.max(0, xpIntoLevel / xpForNext)) : 0;
  const lit = Math.floor(ratio * PIPS);
  const remaining = Math.max(0, xpForNext - xpIntoLevel);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={xpForNext}
      aria-valuenow={xpIntoLevel}
      aria-valuetext={`${xpIntoLevel}/${xpForNext} XP · còn ${remaining} XP để lên Level ${level + 1}`}
      className="frame inline-flex gap-[2px] bg-ink p-[2px]"
    >
      {Array.from({ length: PIPS }, (_, i) => (
        <span
          key={i}
          className={
            i < lit
              ? "block h-3 w-3 bg-gold-500 shadow-[inset_0_2px_0_0_var(--color-gold-300),inset_0_-2px_0_0_var(--color-wood-600)]"
              : "block h-3 w-3 bg-felt-800"
          }
        />
      ))}
    </div>
  );
}
