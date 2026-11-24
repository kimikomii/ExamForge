import { useEffect, useState } from 'react';
import { Lightbulb, Minus, X } from 'lucide-react';

export interface MascotReaction {
  id: number;
  text: string;
  mood: 'neutral' | 'happy' | 'oops' | 'hype';
}

export interface ZabellClue {
  label: string;
  text: string;
}

interface StudyMascotProps {
  reaction: MascotReaction;
  hasActiveExam: boolean;
  onRequestClue: () => ZabellClue | null;
}

const HOME_STUDY_TIPS = [
  'Upload your lecture PDF or paste notes to start!',
  'Try Quick Revision for 15 fast sticky-note cards!',
  'Turn on Boss Battle (60s Speed Mode) to test your rapid recall!',
  'Wrong answers right now are future marks saved on exam day.',
];

function ScholarlyOwlIcon({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Graduation cap top */}
      <path d="M24 5L8 12L24 19L40 12L24 5Z" fill="#5C4033" />
      <path d="M36 13.5V21" stroke="#C29B61" strokeWidth="2" strokeLinecap="round" />
      <circle cx="36" cy="22" r="1.8" fill="#C29B61" />

      {/* Owl body */}
      <ellipse cx="24" cy="30" rx="13" ry="13.5" fill="#8B5A2B" />
      <ellipse cx="24" cy="32.5" rx="8.5" ry="9" fill="#E8DEC8" />

      {/* Belly feather accents */}
      <path d="M21 31C22 32.5 26 32.5 27 31" stroke="#A67B5B" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M20 35C21.5 36.5 26.5 36.5 28 35" stroke="#A67B5B" strokeWidth="1.6" strokeLinecap="round" />

      {/* Eyes & scholarly glasses */}
      <circle cx="19" cy="23.5" r="4.5" fill="#FAF7F2" stroke="#2C1E16" strokeWidth="1.8" />
      <circle cx="29" cy="23.5" r="4.5" fill="#FAF7F2" stroke="#2C1E16" strokeWidth="1.8" />
      <path d="M23.5 23.5H24.5" stroke="#2C1E16" strokeWidth="1.8" />
      <circle cx="19" cy="23.5" r="1.8" fill="#2C1E16" />
      <circle cx="29" cy="23.5" r="1.8" fill="#2C1E16" />

      {/* Beak */}
      <path d="M24 25.5L22 28.5H26L24 25.5Z" fill="#D4A84F" />
    </svg>
  );
}

export function StudyMascot({
  reaction,
  hasActiveExam,
  onRequestClue,
}: StudyMascotProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isBubbleDismissed, setIsBubbleDismissed] = useState(false);
  const [tipIndex, setTipIndex] = useState<number | null>(null);
  const [activeClue, setActiveClue] = useState<ZabellClue | null>(null);

  useEffect(() => {
    setIsBubbleDismissed(false);
    setTipIndex(null);
    setActiveClue(null);
  }, [reaction.id]);

  const handleMascotClick = () => {
    setIsBubbleDismissed(false);
    if (hasActiveExam) {
      const clue = onRequestClue();
      if (clue) {
        setActiveClue(clue);
        setTipIndex(null);
        return;
      }
    }
    setActiveClue(null);
    setTipIndex((prev) => (prev === null ? 0 : (prev + 1) % HOME_STUDY_TIPS.length));
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => {
            setIsMinimized(false);
            setIsBubbleDismissed(false);
          }}
          aria-label="Show Zabell study mascot"
          title="Need a hint? Click Zabell!"
          className="inline-flex items-center gap-2 rounded-full border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] px-3 py-2 text-xs font-medium text-[#5C4033] dark:text-[#E8DEC8] shadow-md hover:border-[#8B5A2B] dark:hover:border-[#C29B61] transition-colors min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61]"
        >
          <ScholarlyOwlIcon className="h-5 w-5" />
          <span>Zabell 🦉</span>
        </button>
      </div>
    );
  }

  const displayText = activeClue
    ? activeClue.text
    : tipIndex !== null
      ? HOME_STUDY_TIPS[tipIndex]
      : reaction.text;

  const bubbleAccent = activeClue
    ? 'border-[#CFA364] dark:border-[#C29B61]'
    : reaction.mood === 'hype' && tipIndex === null
      ? 'border-[#749B78] dark:border-[#4F7D56]'
      : reaction.mood === 'oops' && tipIndex === null
        ? 'border-[#C57463] dark:border-[#A85B4C]'
        : 'border-[#D8CBB8] dark:border-[#4A3528]';

  const tooltipLabel = hasActiveExam
    ? 'Need a hint? Click Zabell!'
    : 'Need a study tip? Click Zabell!';

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 max-w-[calc(100vw-2rem)]"
    >
      {!isBubbleDismissed && (
        <div
          className={`w-[275px] rounded-2xl border ${bubbleAccent} bg-[#FAF7F2] dark:bg-[#2B1E17] p-3.5 shadow-lg text-[#2C1E16] dark:text-[#E8DEC8]`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[11px] font-semibold text-[#8B5A2B] dark:text-[#C29B61]">
              Zabell 🦉
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                aria-label="Hide Zabell"
                title="Minimize Zabell"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#665042] dark:text-[#D4C3A3] hover:bg-[#EFE8DC] dark:hover:bg-[#38291E] hover:text-[#2C1E16] dark:hover:text-[#E8DEC8] transition-colors"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsBubbleDismissed(true)}
                aria-label="Dismiss speech bubble"
                title="Dismiss message"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#665042] dark:text-[#D4C3A3] hover:bg-[#EFE8DC] dark:hover:bg-[#38291E] hover:text-[#2C1E16] dark:hover:text-[#E8DEC8] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {activeClue && (
            <div className="mb-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#6E4614] dark:text-[#C29B61]">
              <Lightbulb className="h-3.5 w-3.5 shrink-0" />
              <span>{activeClue.label}</span>
            </div>
          )}

          <p className="text-xs leading-relaxed text-[#2C1E16] dark:text-[#E8DEC8]">
            {displayText}
          </p>

          <p className="mt-2 text-[10px] text-[#7B6859] dark:text-[#9E8B6E]">
            {hasActiveExam ? 'Need a hint? Click Zabell!' : 'Click Zabell for more study tips'}
          </p>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        {isBubbleDismissed && (
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            aria-label="Hide Zabell"
            title="Minimize Zabell"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] text-[#665042] dark:text-[#D4C3A3] shadow-sm hover:text-[#2C1E16] dark:hover:text-[#E8DEC8] transition-colors"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={handleMascotClick}
          aria-label={`Zabell study mascot — ${tooltipLabel}`}
          title={tooltipLabel}
          className="animate-mascot-bob inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] shadow-lg hover:border-[#8B5A2B] dark:hover:border-[#C29B61] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61]"
        >
          <ScholarlyOwlIcon className="h-8 w-8" />
        </button>
      </div>
    </div>
  );
}
