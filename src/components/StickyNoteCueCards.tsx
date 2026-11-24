import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Pin,
  XCircle,
} from 'lucide-react';
import { Eli12Explanation, MCQQuestion } from '../types';

interface StickyNoteCueCardsProps {
  questions: MCQQuestion[];
  answers: Record<string, number>;
  comboStreak: number;
  eli12Map: Record<string, Eli12Explanation>;
  eli12Loading: Record<string, boolean>;
  eli12Status: Record<string, string | undefined>;
  eli12Errors: Record<string, string>;
  onSelectOption: (questionId: string, optionIndex: number) => void;
  onRequestEli12: (question: MCQQuestion) => void;
  onOpenFinalResults?: () => void;
  onActiveQuestionChange?: (questionId: string, cardNumber: number) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export function StickyNoteCueCards({
  questions,
  answers,
  comboStreak,
  eli12Map,
  eli12Loading,
  eli12Status,
  eli12Errors,
  onSelectOption,
  onRequestEli12,
  onOpenFinalResults,
  onActiveQuestionChange,
}: StickyNoteCueCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const safeIndex = questions.length > 0 ? Math.min(currentIndex, questions.length - 1) : 0;
  const activeId = questions[safeIndex]?.id;

  useEffect(() => {
    if (activeId && onActiveQuestionChange) {
      onActiveQuestionChange(activeId, safeIndex + 1);
    }
  }, [activeId, safeIndex, onActiveQuestionChange]);

  if (questions.length === 0) return null;

  const currentQuestion = questions[safeIndex];
  const selectedOption = answers[currentQuestion.id];
  const isAnswered = selectedOption !== undefined;
  const isCorrect = isAnswered && selectedOption === currentQuestion.correctIndex;
  const isWrong = isAnswered && selectedOption !== currentQuestion.correctIndex;

  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const correctCount = questions.filter((q) => answers[q.id] === q.correctIndex).length;
  const allCompleted = answeredCount === questions.length;

  const eli12 = eli12Map[currentQuestion.id];
  const isLoadingEli12 = Boolean(eli12Loading[currentQuestion.id]);
  const eli12StatusText = eli12Status[currentQuestion.id];
  const eli12Error = eli12Errors[currentQuestion.id];

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
  };

  return (
    <section
      id="quick-revision-deck"
      aria-labelledby="quick-revision-heading"
      className="space-y-6 scroll-mt-24"
    >
      {/* Header + Live Score & Streak */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-[#D8CBB8] dark:border-[#4A3528]">
        <div>
          <h2
            id="quick-revision-heading"
            className="font-display text-xl sm:text-2xl font-semibold text-[#5C4033] dark:text-[#E8DEC8]"
          >
            Quick Revision · Sticky-Note Cue Cards
          </h2>
          <p className="mt-1 text-sm text-[#665042] dark:text-[#D4C3A3]">
            Flip through all {questions.length} core definition cards. Click an option for instant feedback.
          </p>
        </div>

        <div
          aria-live="polite"
          className="inline-flex flex-wrap items-center gap-3 rounded-xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] px-4 py-2.5 text-xs sm:text-sm font-mono tabular-nums self-start sm:self-auto shrink-0"
        >
          <span className="font-semibold text-[#5C4033] dark:text-[#C29B61]">
            Score: {correctCount} / {questions.length}
          </span>
          <span aria-hidden="true" className="text-[#BFA98E] dark:text-[#6B503E]">·</span>
          <span className="text-[#2C1E16] dark:text-[#E8DEC8]">
            {answeredCount} / {questions.length} Answered
          </span>
          {(comboStreak > 0 || answeredCount > 0) && (
            <>
              <span aria-hidden="true" className="text-[#BFA98E] dark:text-[#6B503E]">·</span>
              <span
                className={
                  comboStreak >= 1
                    ? 'font-semibold text-[#8B5A2B] dark:text-[#C29B61]'
                    : 'text-[#665042] dark:text-[#D4C3A3]'
                }
              >
                {comboStreak}x Streak {comboStreak >= 1 ? '🔥' : ''}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Card Progress Grid */}
      <div className="max-w-2xl mx-auto space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-1.5" role="tablist" aria-label="Cue card selector">
          {questions.map((q, idx) => {
            const ans = answers[q.id];
            const cardDone = ans !== undefined;
            const cardRight = cardDone && ans === q.correctIndex;
            const isActive = idx === safeIndex;

            let btnClasses =
              'border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] text-[#665042] dark:text-[#D4C3A3] hover:border-[#8B5A2B] dark:hover:border-[#C29B61]';

            if (cardDone) {
              btnClasses = cardRight
                ? 'border-[#749B78] dark:border-[#4F7D56] bg-[#EAF3EA] dark:bg-[#203324] text-[#244A29] dark:text-[#DCEBD9]'
                : 'border-[#C57463] dark:border-[#A85B4C] bg-[#F9EBE7] dark:bg-[#3A221D] text-[#7A2E20] dark:text-[#F4DFDA]';
            }

            if (isActive) {
              btnClasses +=
                ' ring-2 ring-[#5C4033] dark:ring-[#C29B61] ring-offset-1 ring-offset-[#F4EFE6] dark:ring-offset-[#1E1510] font-bold';
            }

            return (
              <button
                key={q.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Jump to Card ${idx + 1}`}
                onClick={() => setCurrentIndex(idx)}
                className={`h-8 w-8 rounded-md border text-xs font-mono tabular-nums transition-all duration-150 focus-visible:outline-none ${btnClasses}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tactile Khaki / Cream Sticky-Note Cue Card */}
      <div className="max-w-2xl mx-auto pt-3">
        <article className="relative rounded-2xl border-2 border-[#D4C09B] dark:border-[#5C4435] bg-[#FDF7E4] dark:bg-[#2F2219] p-6 sm:p-8 shadow-[0_14px_30px_-10px_rgba(92,64,51,0.22),0_4px_10px_-2px_rgba(92,64,51,0.12)] dark:shadow-[0_18px_34px_-10px_rgba(0,0,0,0.65)] -rotate-[0.45deg] hover:rotate-0 transition-transform duration-200">
          {/* Pinned top edge & masking tape accent */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center justify-center"
          >
            <div className="h-6 w-24 rounded-sm bg-[#E5D4B3]/90 dark:bg-[#4A3528]/95 border border-[#C9B288]/80 dark:border-[#785942] shadow-sm flex items-center justify-center">
              <Pin className="h-3.5 w-3.5 text-[#5C4033] dark:text-[#C29B61] rotate-12" />
            </div>
          </div>

          {/* Card Counter & Concept */}
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E4D5B7] dark:border-[#4A3528] text-xs">
            <span className="font-mono tabular-nums font-bold tracking-wide text-[#5C4033] dark:text-[#C29B61]">
              Card {safeIndex + 1} of {questions.length}
            </span>
            <span className="font-medium text-[#665042] dark:text-[#D4C3A3]">
              {currentQuestion.concept}
            </span>
          </div>

          {/* Question */}
          <h3 className="mt-4 font-display text-lg sm:text-xl font-semibold leading-snug text-[#2C1E16] dark:text-[#E8DEC8]">
            {currentQuestion.question}
          </h3>

          {/* 4 Multiple Choice Options (A, B, C, D) */}
          <div
            className="mt-5 grid grid-cols-1 gap-2.5"
            role="radiogroup"
            aria-label={`Card ${safeIndex + 1} options`}
          >
            {currentQuestion.options.map((option, optIdx) => {
              const isThisSelected = selectedOption === optIdx;
              const isThisCorrectOption = optIdx === currentQuestion.correctIndex;

              let containerClasses =
                'border-[#D9C8A6] dark:border-[#4A3528] bg-[#FAF1D6]/80 dark:bg-[#231912] text-[#2C1E16] dark:text-[#E8DEC8] hover:border-[#8B5A2B] dark:hover:border-[#C29B61] hover:bg-[#F5E8C6] dark:hover:bg-[#38291E]';
              let letterClasses =
                'border-[#D4C09B] dark:border-[#4A3528] bg-[#FDF7E4] dark:bg-[#1E1510] text-[#5C4033] dark:text-[#D4C3A3]';
              let statusKind: 'correct' | 'wrong' | null = null;
              let statusLabel: string | null = null;

              if (isAnswered) {
                if (isThisCorrectOption) {
                  containerClasses =
                    'border-[#749B78] dark:border-[#4F7D56] bg-[#EAF3EA] dark:bg-[#203324] text-[#244A29] dark:text-[#DCEBD9]';
                  letterClasses =
                    'border-[#749B78] dark:border-[#5D8E65] bg-[#D9EAD9] dark:bg-[#2A422F] text-[#244A29] dark:text-[#E2F0DF]';
                  statusKind = 'correct';
                  statusLabel = 'Correct';
                } else if (isThisSelected && !isThisCorrectOption) {
                  containerClasses =
                    'border-[#C57463] dark:border-[#A85B4C] bg-[#F9EBE7] dark:bg-[#3A221D] text-[#7A2E20] dark:text-[#F4DFDA]';
                  letterClasses =
                    'border-[#C57463] dark:border-[#B5695A] bg-[#F3D8D1] dark:bg-[#4B2C25] text-[#7A2E20] dark:text-[#F6E4DF]';
                  statusKind = 'wrong';
                  statusLabel = 'Incorrect';
                } else {
                  containerClasses =
                    'border-[#E2D3B5]/80 dark:border-[#4A3528]/60 bg-[#FAF1D6]/45 dark:bg-[#1E1510]/60 text-[#7B6859] dark:text-[#9E8B6E]';
                  letterClasses =
                    'border-[#E2D3B5] dark:border-[#4A3528]/70 bg-[#FDF7E4] dark:bg-[#241A13] text-[#7B6859] dark:text-[#9E8B6E]';
                }
              }

              return (
                <button
                  key={optIdx}
                  type="button"
                  role="radio"
                  aria-checked={isThisSelected}
                  onClick={() => onSelectOption(currentQuestion.id, optIdx)}
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

          {/* Instant 1-Sentence Explanation on the Sticky Note */}
          {isAnswered && (
            <div className="mt-5 pt-4 border-t border-dashed border-[#D4C09B] dark:border-[#4A3528] space-y-3">
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
                    {isCorrect ? 'Right on! ' : 'Quick Note: '}
                  </span>
                  {currentQuestion.explanation}
                </p>
              </div>

              {isWrong && !eli12 && (
                <div>
                  <button
                    type="button"
                    disabled={isLoadingEli12}
                    onClick={() => onRequestEli12(currentQuestion)}
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
                  {isLoadingEli12 && eli12StatusText && (
                    <p role="status" className="mt-2 text-xs text-[#8B5A2B] dark:text-[#C29B61]">
                      {eli12StatusText}
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
                  <p className="text-sm leading-relaxed text-[#2C1E16] dark:text-[#E8DEC8]">
                    {eli12.analogy}
                  </p>
                  <p className="text-xs leading-relaxed text-[#665042] dark:text-[#D4C3A3]">
                    <span className="font-semibold text-[#2C1E16] dark:text-[#E8DEC8]">
                      Exam Rule:{' '}
                    </span>
                    {eli12.keyTakeaway}
                  </p>
                </div>
              )}
            </div>
          )}
        </article>

        {/* Flip Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={safeIndex === 0}
            onClick={handlePrev}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] px-4 py-2.5 text-sm font-medium text-[#5C4033] dark:text-[#E8DEC8] hover:bg-[#EFE8DC] dark:hover:bg-[#38291E] disabled:opacity-45 disabled:cursor-not-allowed transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-3">
            {allCompleted && onOpenFinalResults && (
              <button
                type="button"
                onClick={onOpenFinalResults}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#CFA364] dark:border-[#A67B5B] bg-[#FAF0DE] dark:bg-[#38291E] px-4 py-2.5 text-sm font-semibold text-[#6E4614] dark:text-[#E8DEC8] hover:bg-[#F4E3C5] dark:hover:bg-[#463325] transition-colors min-h-[44px]"
              >
                <Award className="h-4 w-4 text-[#8B5A2B] dark:text-[#C29B61]" />
                <span>View Deck Score</span>
              </button>
            )}

            <button
              type="button"
              disabled={safeIndex >= questions.length - 1}
              onClick={handleNext}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5C4033] dark:bg-[#C29B61] px-5 py-2.5 text-sm font-semibold text-white dark:text-[#1E1510] hover:bg-[#8B5A2B] dark:hover:bg-[#A67B5B] disabled:opacity-45 disabled:cursor-not-allowed transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61]"
            >
              <span>Next Card</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
