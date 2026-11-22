import { CheckCircle2, Lightbulb, Loader2, XCircle } from 'lucide-react';
import { Eli12Explanation, MCQQuestion } from '../types';

interface McqCardProps {
  question: MCQQuestion;
  index: number;
  total: number;
  selectedOptionIndex: number | undefined;
  eli12: Eli12Explanation | undefined;
  isLoadingEli12: boolean;
  eli12Status: string | undefined;
  eli12Error: string | undefined;
  onSelectOption: (optionIndex: number) => void;
  onRequestEli12: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export function McqCard({
  question,
  index,
  total,
  selectedOptionIndex,
  eli12,
  isLoadingEli12,
  eli12Status,
  eli12Error,
  onSelectOption,
  onRequestEli12,
}: McqCardProps) {
  const isAnswered = selectedOptionIndex !== undefined;
  const isCorrect = isAnswered && selectedOptionIndex === question.correctIndex;
  const isWrong = isAnswered && selectedOptionIndex !== question.correctIndex;

  return (
    <article className="rounded-2xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] p-5 sm:p-6">
      {/* Unboxed quiet metadata header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#665042] dark:text-[#D4C3A3]">
        <div className="flex items-center gap-2">
          <span className="font-mono tabular-nums font-medium text-[#5C4033] dark:text-[#C29B61]">
            Question {String(index + 1).padStart(2, '0')} of {String(total).padStart(2, '0')}
          </span>
          <span aria-hidden="true">·</span>
          <span>{question.concept}</span>
        </div>
        <span className="font-mono tabular-nums text-[#665042] dark:text-[#D4C3A3]">1 mark</span>
      </div>

      <h3 className="mt-3 font-display text-base sm:text-lg font-medium leading-snug text-[#2C1E16] dark:text-[#E8DEC8]">
        {question.question}
      </h3>

      <div className="mt-4 grid grid-cols-1 gap-2.5" role="radiogroup" aria-label={`Question ${index + 1} options`}>
        {question.options.map((option, optIdx) => {
          const isThisSelected = selectedOptionIndex === optIdx;
          const isThisCorrectOption = optIdx === question.correctIndex;

          let containerClasses =
            'border-[#D8CBB8] dark:border-[#4A3528] bg-[#F4EFE6]/70 dark:bg-[#221812] text-[#2C1E16] dark:text-[#E8DEC8] hover:border-[#8B5A2B] dark:hover:border-[#C29B61] hover:bg-[#EFE8DC] dark:hover:bg-[#38291E]';
          let letterClasses =
            'border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#1E1510] text-[#5C4033] dark:text-[#D4C3A3]';
          let statusLabel: string | null = null;
          let statusKind: 'correct' | 'wrong' | null = null;

          if (isAnswered) {
            if (isThisCorrectOption) {
              containerClasses =
                'border-[#749B78] dark:border-[#4F7D56] bg-[#EAF3EA] dark:bg-[#203324] text-[#244A29] dark:text-[#DCEBD9]';
              letterClasses =
                'border-[#749B78] dark:border-[#5D8E65] bg-[#D9EAD9] dark:bg-[#2A422F] text-[#244A29] dark:text-[#E2F0DF]';
              statusLabel = 'Correct';
              statusKind = 'correct';
            } else if (isThisSelected && !isThisCorrectOption) {
              containerClasses =
                'border-[#C57463] dark:border-[#A85B4C] bg-[#F9EBE7] dark:bg-[#3A221D] text-[#7A2E20] dark:text-[#F4DFDA]';
              letterClasses =
                'border-[#C57463] dark:border-[#B5695A] bg-[#F3D8D1] dark:bg-[#4B2C25] text-[#7A2E20] dark:text-[#F6E4DF]';
              statusLabel = 'Incorrect';
              statusKind = 'wrong';
            } else {
              containerClasses =
                'border-[#D8CBB8]/70 dark:border-[#4A3528]/60 bg-[#F4EFE6]/50 dark:bg-[#1E1510]/60 text-[#7B6859] dark:text-[#9E8B6E]';
              letterClasses =
                'border-[#D8CBB8]/80 dark:border-[#4A3528]/70 bg-[#FAF7F2] dark:bg-[#241A13] text-[#7B6859] dark:text-[#9E8B6E]';
            }
          }

          return (
            <button
              key={optIdx}
              type="button"
              role="radio"
              aria-checked={isThisSelected}
              onClick={() => onSelectOption(optIdx)}
              className={`w-full text-left rounded-xl border px-4 py-3 text-sm sm:text-[15px] transition-colors duration-150 flex items-start justify-between gap-3 min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61] ${containerClasses}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-semibold ${letterClasses}`}
                >
                  {OPTION_LETTERS[optIdx] ?? optIdx + 1}
                </span>
                <span className="leading-relaxed">{option}</span>
              </div>

              {statusKind && (
                <span
                  className={`mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium shrink-0 whitespace-nowrap ${
                    statusKind === 'correct'
                      ? 'text-[#244A29] dark:text-[#9FD0A6]'
                      : 'text-[#7A2E20] dark:text-[#E59B8C]'
                  }`}
                >
                  {statusKind === 'correct' ? (
                    <CheckCircle2 className="h-4 w-4 text-[#356B3C] dark:text-[#7EB886]" />
                  ) : (
                    <XCircle className="h-4 w-4 text-[#A94432] dark:text-[#D97D6C]" />
                  )}
                  <span>{statusLabel}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Immediate Feedback Explanation */}
      {isAnswered && (
        <div className="mt-4 pt-4 border-t border-[#D8CBB8] dark:border-[#4A3528] space-y-3">
          <div className="flex items-start gap-2.5 text-sm leading-relaxed">
            {isCorrect ? (
              <CheckCircle2 className="h-4 w-4 text-[#356B3C] dark:text-[#7EB886] mt-1 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-[#A94432] dark:text-[#D97D6C] mt-1 shrink-0" />
            )}
            <p className="text-[#2C1E16] dark:text-[#E8DEC8]">
              <span
                className={
                  isCorrect
                    ? 'font-semibold text-[#244A29] dark:text-[#9FD0A6]'
                    : 'font-semibold text-[#7A2E20] dark:text-[#E59B8C]'
                }
              >
                {isCorrect ? 'Correct: ' : 'Explanation: '}
              </span>
              {question.explanation}
            </p>
          </div>

          {/* Explain Like I'm 12 booster for wrong MCQs */}
          {isWrong && !eli12 && (
            <div>
              <button
                type="button"
                disabled={isLoadingEli12}
                onClick={onRequestEli12}
                className="inline-flex items-center gap-2 rounded-lg border border-[#CFA364] dark:border-[#A67B5B] bg-[#FAF0DE] dark:bg-[#38291E] px-3.5 py-2 text-xs sm:text-sm font-medium text-[#6E4614] dark:text-[#E8DEC8] hover:bg-[#F4E3C5] dark:hover:bg-[#463325] disabled:opacity-60 transition-colors min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61]"
              >
                {isLoadingEli12 ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Building simple analogy...</span>
                  </>
                ) : (
                  <>
                    <Lightbulb className="h-4 w-4 text-[#6E4614] dark:text-[#C29B61]" />
                    <span>Explain Like I&apos;m 12</span>
                  </>
                )}
              </button>
              {isLoadingEli12 && eli12Status && (
                <p role="status" className="mt-2 text-xs text-[#8B5A2B] dark:text-[#C29B61]">
                  {eli12Status}
                </p>
              )}
              {eli12Error && (
                <p role="alert" className="mt-2 text-xs text-[#7A2E20] dark:text-[#E59B8C]">
                  {eli12Error}
                </p>
              )}
            </div>
          )}

          {eli12 && (
            <div className="rounded-xl border border-[#CFA364]/70 dark:border-[#A67B5B]/70 bg-[#FAF0DE] dark:bg-[#241A13] p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#6E4614] dark:text-[#C29B61]">
                <Lightbulb className="h-4 w-4 shrink-0" />
                <span>Simple Analogy · {eli12.analogyTitle}</span>
              </div>
              <p className="text-sm leading-relaxed text-[#2C1E16] dark:text-[#E8DEC8]">{eli12.analogy}</p>
              <p className="text-xs leading-relaxed text-[#665042] dark:text-[#D4C3A3]">
                <span className="font-semibold text-[#2C1E16] dark:text-[#E8DEC8]">Exam Rule: </span>
                {eli12.keyTakeaway}
              </p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
