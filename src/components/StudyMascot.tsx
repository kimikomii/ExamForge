import { useEffect, useState } from 'react';
import { Minus, X } from 'lucide-react';

export interface MascotReaction {
  id: number;
  text: string;
  mood: 'neutral' | 'happy' | 'oops' | 'hype';
}

interface StudyMascotProps {
  reaction: MascotReaction;
}

const EXTRA_QUIPS = [
  'Hydration check: sip some water between sections!',
  'Pro tip: read the stem twice before eyeing option A.',
  'Active recall beats re-reading slides every single time.',
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

export function StudyMascot({ reaction }: StudyMascotProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isBubbleDismissed, setIsBubbleDismissed] = useState(false);
  const [localQuipIndex, setLocalQuipIndex] = useState<number | null>(null);

  useEffect(() => {
    setIsBubbleDismissed(false);
    setLocalQuipIndex(null);
  }, [reaction.id]);

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => {
            setIsMinimized(false);
            setIsBubbleDismissed(false);
          }}
          aria-label="Show study mascot"
          title="Show Professor Hoot"
          className="inline-flex items-center gap-2 rounded-full border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] px-3 py-2 text-xs font-medium text-[#5C4033] dark:text-[#E8DEC8] shadow-md hover:border-[#8B5A2B] dark:hover:border-[#C29B61] transition-colors min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61]"
        >
          <ScholarlyOwlIcon className="h-5 w-5" />
          <span>Owl Buddy</span>
        </button>
      </div>
    );
  }

  const displayText =
    localQuipIndex !== null ? EXTRA_QUIPS[localQuipIndex] : reaction.text;

  const bubbleAccent =
    reaction.mood === 'hype'
      ? 'border-[#749B78] dark:border-[#4F7D56]'
      : reaction.mood === 'oops'
        ? 'border-[#C57463] dark:border-[#A85B4C]'
        : 'border-[#D8CBB8] dark:border-[#4A3528]';

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 max-w-[calc(100vw-2rem)]"
    >
      {!isBubbleDismissed && (
        <div
          className={`w-[260px] rounded-2xl border ${bubbleAccent} bg-[#FAF7F2] dark:bg-[#2B1E17] p-3.5 shadow-lg text-[#2C1E16] dark:text-[#E8DEC8]`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[11px] font-semibold text-[#8B5A2B] dark:text-[#C29B61]">
              Professor Hoot
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                aria-label="Hide study mascot"
                title="Minimize mascot"
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
          <p className="text-xs leading-relaxed text-[#2C1E16] dark:text-[#E8DEC8]">
            {displayText}
          </p>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        {isBubbleDismissed && (
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            aria-label="Hide study mascot"
            title="Minimize mascot"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] text-[#665042] dark:text-[#D4C3A3] shadow-sm hover:text-[#2C1E16] dark:hover:text-[#E8DEC8] transition-colors"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            if (isBubbleDismissed) {
              setIsBubbleDismissed(false);
            } else {
              setLocalQuipIndex((prev) =>
                prev === null ? 0 : (prev + 1) % EXTRA_QUIPS.length
              );
            }
          }}
          aria-label="Professor Hoot study mascot — click for a study tip"
          title="Click for a study tip"
          className="animate-mascot-bob inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] shadow-lg hover:border-[#8B5A2B] dark:hover:border-[#C29B61] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61]"
        >
          <ScholarlyOwlIcon className="h-8 w-8" />
        </button>
      </div>
    </div>
  );
}
