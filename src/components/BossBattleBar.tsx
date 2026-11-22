import { RotateCcw, Timer, Trophy, Zap } from 'lucide-react';

interface BossBattleBarProps {
  timeLeft: number;
  isRunning: boolean;
  hasFinished: boolean;
  correctCount: number;
  answeredCount: number;
  totalQuestions: number;
  personalBest: number;
  isNewRecord: boolean;
  onStartOrRestart: () => void;
}

export function BossBattleBar({
  timeLeft,
  isRunning,
  hasFinished,
  correctCount,
  answeredCount,
  totalQuestions,
  personalBest,
  isNewRecord,
  onStartOrRestart,
}: BossBattleBarProps) {
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / 60) * 100));
  const isUrgent = isRunning && timeLeft <= 10;
  const completedEarly = hasFinished && answeredCount === totalQuestions && timeLeft > 0;

  return (
    <div
      role="region"
      aria-label="Boss Battle 60 second speed mode timer"
      className="rounded-xl border border-[#CFA364] dark:border-[#A67B5B] bg-[#FAF0DE] dark:bg-[#2B1E17] p-4 space-y-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
              isUrgent
                ? 'border-[#C57463] dark:border-[#A85B4C] bg-[#F9EBE7] dark:bg-[#3A221D] text-[#A94432] dark:text-[#E59B8C]'
                : 'border-[#CFA364] dark:border-[#A67B5B] bg-[#FAF7F2] dark:bg-[#1E1510] text-[#8B5A2B] dark:text-[#C29B61]'
            }`}
          >
            {isRunning ? <Zap className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-sm font-semibold text-[#5C4033] dark:text-[#E8DEC8]">
                Boss Battle · 60s Speed Mode
              </p>
              {isNewRecord && hasFinished && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#244A29] dark:text-[#9FD0A6]">
                  <Trophy className="h-3.5 w-3.5" />
                  <span>New Personal Best!</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#665042] dark:text-[#D4C3A3]">
              {hasFinished
                ? completedEarly
                  ? `Finished all ${totalQuestions} questions with ${timeLeft}s left (${correctCount} correct).`
                  : `Time's up! Speed round score: ${correctCount} / ${totalQuestions} correct. You can still review or finish below.`
                : isRunning
                  ? 'Race the clock — answer as many Section A MCQs as you can!'
                  : 'Press Start 60s Battle whenever you are ready to race.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto shrink-0">
          <div className="text-xs font-mono tabular-nums text-[#665042] dark:text-[#D4C3A3]">
            <span>Personal Best: </span>
            <strong className="text-[#5C4033] dark:text-[#E8DEC8]">
              {personalBest} / {totalQuestions}
            </strong>
          </div>

          <span
            aria-live="polite"
            className={`font-mono text-base sm:text-lg font-bold tabular-nums px-2.5 py-1 rounded-lg border ${
              isUrgent
                ? 'border-[#C57463] dark:border-[#A85B4C] bg-[#F9EBE7] dark:bg-[#3A221D] text-[#7A2E20] dark:text-[#E59B8C]'
                : completedEarly
                  ? 'border-[#749B78] dark:border-[#4F7D56] bg-[#EAF3EA] dark:bg-[#203324] text-[#244A29] dark:text-[#9FD0A6]'
                  : 'border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#1E1510] text-[#5C4033] dark:text-[#C29B61]'
            }`}
          >
            00:{String(timeLeft).padStart(2, '0')}
          </span>

          <button
            type="button"
            onClick={onStartOrRestart}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#5C4033] dark:bg-[#C29B61] px-3 py-2 text-xs font-semibold text-white dark:text-[#1E1510] hover:bg-[#8B5A2B] dark:hover:bg-[#A67B5B] transition-colors whitespace-nowrap shrink-0 min-h-[38px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{isRunning ? 'Restart 60s' : hasFinished ? 'Play Again' : 'Start 60s'}</span>
          </button>
        </div>
      </div>

      {/* Countdown progress track */}
      <div className="h-2 w-full rounded-full bg-[#E8DEC8] dark:bg-[#1E1510] overflow-hidden">
        <div
          style={{ width: `${progressPercent}%` }}
          className={`h-full rounded-full transition-[width] duration-300 ${
            isUrgent
              ? 'bg-[#A94432] dark:bg-[#D97D6C]'
              : completedEarly
                ? 'bg-[#356B3C] dark:bg-[#7EB886]'
                : 'bg-[#5C4033] dark:bg-[#C29B61]'
          }`}
        />
      </div>
    </div>
  );
}
