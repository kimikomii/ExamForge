import { useEffect } from 'react';
import { Award, BookOpen, X } from 'lucide-react';

export interface ScoreFeedbackModalData {
  sectionLabel: string;
  percentage: number;
  earned: number;
  total: number;
  unitLabel: string;
  isAce: boolean;
}

interface ScoreCelebrationModalProps {
  data: ScoreFeedbackModalData | null;
  onClose: () => void;
}

export function ScoreCelebrationModal({ data, onClose }: ScoreCelebrationModalProps) {
  useEffect(() => {
    if (!data) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [data, onClose]);

  if (!data) return null;

  const { sectionLabel, percentage, earned, total, unitLabel, isAce } = data;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1510]/55 dark:bg-[#0D0906]/70 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="score-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] p-6 sm:p-7 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close score dialog"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-[#665042] dark:text-[#D4C3A3] hover:bg-[#EFE8DC] dark:hover:bg-[#38291E] hover:text-[#2C1E16] dark:hover:text-[#E8DEC8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div
            className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl border ${
              isAce
                ? 'border-[#749B78] dark:border-[#4F7D56] bg-[#EAF3EA] dark:bg-[#203324] text-[#356B3C] dark:text-[#9FD0A6]'
                : 'border-[#CFA364] dark:border-[#A67B5B] bg-[#FAF0DE] dark:bg-[#38291E] text-[#8B5A2B] dark:text-[#C29B61]'
            }`}
          >
            {isAce ? <Award className="h-7 w-7" /> : <BookOpen className="h-7 w-7" />}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-[#665042] dark:text-[#D4C3A3]">
              {sectionLabel}
            </p>
            <h2
              id="score-modal-title"
              className="font-display text-2xl font-bold tracking-tight text-[#5C4033] dark:text-[#E8DEC8]"
            >
              {isAce ? "You're an Ace! 🎉" : 'Good Effort!'}
            </h2>
          </div>

          <div className="w-full rounded-xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#F4EFE6] dark:bg-[#221812] px-4 py-3.5 space-y-1">
            <p className="font-display text-lg font-bold text-[#2C1E16] dark:text-[#E8DEC8] font-mono tabular-nums">
              {isAce
                ? `You scored ${percentage}% — Exam Ready!`
                : `You scored ${percentage}%`}
            </p>
            <p className="text-xs text-[#665042] dark:text-[#D4C3A3] font-mono tabular-nums">
              {earned} / {total} {unitLabel}
            </p>
          </div>

          {!isAce && (
            <p className="text-sm leading-relaxed text-[#665042] dark:text-[#D4C3A3]">
              Good effort! Review the highlighted terms and try again.
            </p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full inline-flex items-center justify-center rounded-xl bg-[#5C4033] dark:bg-[#C29B61] px-5 py-3 text-sm font-semibold text-white dark:text-[#1E1510] hover:bg-[#8B5A2B] dark:hover:bg-[#A67B5B] transition-colors min-h-[46px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61]"
          >
            Keep Studying
          </button>
        </div>
      </div>
    </div>
  );
}
