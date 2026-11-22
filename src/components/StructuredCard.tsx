import { AlertCircle, CheckCircle2, Lightbulb, Loader2 } from 'lucide-react';
import {
  Eli12Explanation,
  StructuredGradeResult,
  StructuredQuestion,
} from '../types';

interface StructuredCardProps {
  question: StructuredQuestion;
  index: number;
  total: number;
  answer: string;
  grade: StructuredGradeResult | undefined;
  eli12: Eli12Explanation | undefined;
  isLoadingEli12: boolean;
  eli12Status: string | undefined;
  eli12Error: string | undefined;
  isGrading: boolean;
  onAnswerChange: (value: string) => void;
  onRequestEli12: () => void;
}

export function StructuredCard({
  question,
  index,
  total,
  answer,
  grade,
  eli12,
  isLoadingEli12,
  eli12Status,
  eli12Error,
  isGrading,
  onAnswerChange,
  onRequestEli12,
}: StructuredCardProps) {
  const isLowScore = grade !== undefined && grade.score < 4;
  const isPerfect = grade !== undefined && grade.score === grade.maxMarks;

  return (
    <article className="rounded-2xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#665042] dark:text-[#D4C3A3]">
        <div className="flex items-center gap-2">
          <span className="font-mono tabular-nums font-medium text-[#5C4033] dark:text-[#C29B61]">
            Question {String(index + 1).padStart(2, '0')} of {String(total).padStart(2, '0')}
          </span>
          <span aria-hidden="true">·</span>
          <span>{question.contextTag}</span>
          <span aria-hidden="true">·</span>
          <span>{question.concept}</span>
        </div>
        <span className="font-mono tabular-nums text-[#665042] dark:text-[#D4C3A3]">
          {question.maxMarks} marks
        </span>
      </div>

      <h3 className="mt-3 font-display text-base sm:text-lg font-medium leading-snug text-[#2C1E16] dark:text-[#E8DEC8]">
        {question.question}
      </h3>

      <div className="mt-4">
        <label htmlFor={`structured-answer-${question.id}`} className="sr-only">
          Your answer for structured question {index + 1}
        </label>
        <textarea
          id={`structured-answer-${question.id}`}
          value={answer}
          disabled={isGrading}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Write your structured response here. Include key definitions, mechanisms, and clear reasoning..."
          className="w-full min-h-[130px] rounded-xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FFFFFF] dark:bg-[#1E1510] px-4 py-3 text-sm sm:text-[15px] leading-relaxed text-[#2C1E16] dark:text-[#E8DEC8] placeholder:text-[#8C7564] dark:placeholder:text-[#9E8B6E] focus:border-[#8B5A2B] dark:focus:border-[#C29B61] focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 dark:focus:ring-[#C29B61]/25 disabled:opacity-70 resize-y"
        />
      </div>

      {grade && (
        <div className="mt-5 pt-5 border-t border-[#D8CBB8] dark:border-[#4A3528] space-y-4">
          {/* Score Header & Feedback */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {isPerfect ? (
                <CheckCircle2 className="h-5 w-5 text-[#356B3C] dark:text-[#7EB886] shrink-0" />
              ) : isLowScore ? (
                <AlertCircle className="h-5 w-5 text-[#A94432] dark:text-[#D97D6C] shrink-0" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-[#8B5A2B] dark:text-[#C29B61] shrink-0" />
              )}
              <span className="font-display text-base font-semibold text-[#5C4033] dark:text-[#E8DEC8] font-mono tabular-nums">
                Score: {grade.score}/{grade.maxMarks}
              </span>
              <span
                className={`text-xs font-medium ${
                  isPerfect
                    ? 'text-[#244A29] dark:text-[#9FD0A6]'
                    : isLowScore
                      ? 'text-[#7A2E20] dark:text-[#E59B8C]'
                      : 'text-[#8B5A2B] dark:text-[#C29B61]'
                }`}
              >
                {isPerfect
                  ? 'Full Marks'
                  : isLowScore
                    ? 'Needs Review'
                    : 'Good Answer'}
              </span>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-[#2C1E16] dark:text-[#E8DEC8]">{grade.feedback}</p>

          {/* Missing Key Terms */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[#665042] dark:text-[#D4C3A3]">
              Missing Key Terms for Full Marks
            </p>
            {grade.missingKeyTerms.length > 0 ? (
              <p className="text-sm text-[#7A2E20] dark:text-[#E59B8C] leading-relaxed">
                {grade.missingKeyTerms.join(' · ')}
              </p>
            ) : (
              <p className="text-sm text-[#244A29] dark:text-[#9FD0A6]">
                None — all essential technical terms were included.
              </p>
            )}
          </div>

          {/* Ideal Model Answer */}
          <div className="rounded-xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#F4EFE6] dark:bg-[#221812] p-4 space-y-1.5">
            <p className="text-xs font-semibold text-[#5C4033] dark:text-[#C29B61]">Ideal Model Answer</p>
            <p className="text-sm leading-relaxed text-[#2C1E16] dark:text-[#E8DEC8]">{grade.modelAnswer}</p>
          </div>

          {/* Explain Like I'm 12 for low-scoring answers */}
          {isLowScore && !eli12 && (
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
