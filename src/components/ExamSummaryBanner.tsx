import { Loader2, RefreshCw } from 'lucide-react';
import { GradingResponse, MockExam } from '../types';

interface ExamSummaryBannerProps {
  exam: MockExam;
  mcqAnsweredCount: number;
  mcqCorrectCount: number;
  fillBlanksScore: number;
  fillBlanksChecked: boolean;
  grading: GradingResponse | null;
  isGeneratingNewSet: boolean;
  statusMessage: string | null;
  onNewPracticeSet: () => void;
}

export function ExamSummaryBanner({
  exam,
  mcqAnsweredCount,
  mcqCorrectCount,
  fillBlanksScore,
  fillBlanksChecked,
  grading,
  isGeneratingNewSet,
  statusMessage,
  onNewPracticeSet,
}: ExamSummaryBannerProps) {
  const mcqTotal = exam.mcqs.length;
  const fillBlanksTotal = exam.fillInBlanks.length;
  const structuredTotal = exam.structured.reduce((sum, q) => sum + q.maxMarks, 0);
  const structuredEarned = grading
    ? grading.results.reduce((sum, r) => sum + r.score, 0)
    : 0;

  const combinedTotal = mcqTotal + fillBlanksTotal + structuredTotal;
  const combinedEarned =
    mcqCorrectCount + (fillBlanksChecked ? fillBlanksScore : 0) + structuredEarned;
  const combinedPercent =
    combinedTotal > 0 ? Math.round((combinedEarned / combinedTotal) * 100) : 0;

  const showScoreSummary = Boolean(grading) || fillBlanksChecked;

  return (
    <section
      id="score-summary"
      aria-label="Exam overview and score summary"
      className="rounded-2xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] p-5 sm:p-7"
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#665042] dark:text-[#D4C3A3]">
            <span>Mock Examination</span>
            <span aria-hidden="true">·</span>
            <span>{exam.difficulty}</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#5C4033] dark:text-[#E8DEC8]">
            {exam.topicTitle}
          </h2>
          {exam.sourceSummary && (
            <p className="text-sm leading-relaxed text-[#665042] dark:text-[#D4C3A3]">{exam.sourceSummary}</p>
          )}
        </div>

        <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
          <button
            type="button"
            disabled={isGeneratingNewSet}
            onClick={onNewPracticeSet}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5C4033] dark:bg-[#C29B61] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white dark:text-[#1E1510] hover:bg-[#8B5A2B] dark:hover:bg-[#A67B5B] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61]"
          >
            {isGeneratingNewSet ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating New Set...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>New Practice Set</span>
              </>
            )}
          </button>
          {isGeneratingNewSet && statusMessage && (
            <p role="status" className="text-xs text-[#8B5A2B] dark:text-[#C29B61]">
              {statusMessage}
            </p>
          )}
        </div>
      </div>

      {/* Total Exam Score Summary */}
      {showScoreSummary ? (
        <div className="mt-6 pt-6 border-t border-[#D8CBB8] dark:border-[#4A3528] space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[#8B5A2B]/40 dark:border-[#C29B61]/60 bg-[#EFE8DC] dark:bg-[#38291E] p-4">
              <p className="text-xs font-medium text-[#665042] dark:text-[#D4C3A3]">Total Exam Score</p>
              <div className="mt-1.5 flex items-baseline gap-2.5">
                <span className="font-display text-2xl sm:text-3xl font-bold text-[#2C1E16] dark:text-[#E8DEC8] font-mono tabular-nums">
                  {combinedEarned}/{combinedTotal}
                </span>
                <span className="font-mono text-sm font-semibold text-[#5C4033] dark:text-[#C29B61] tabular-nums">
                  {combinedPercent}%
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#F4EFE6] dark:bg-[#221812] p-4">
              <p className="text-xs font-medium text-[#665042] dark:text-[#D4C3A3]">Section A · Objective</p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-[#2C1E16] dark:text-[#E8DEC8] font-mono tabular-nums">
                  {mcqCorrectCount}/{mcqTotal}
                </span>
                <span className="text-xs text-[#665042] dark:text-[#D4C3A3] font-mono tabular-nums">
                  ({mcqAnsweredCount}/{mcqTotal} answered)
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#F4EFE6] dark:bg-[#221812] p-4">
              <p className="text-xs font-medium text-[#665042] dark:text-[#D4C3A3]">Section B · Fill-in-Blanks</p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-[#2C1E16] dark:text-[#E8DEC8] font-mono tabular-nums">
                  {fillBlanksChecked ? `${fillBlanksScore}/${fillBlanksTotal}` : `—/${fillBlanksTotal}`}
                </span>
                <span className="text-xs text-[#665042] dark:text-[#D4C3A3]">
                  {fillBlanksChecked ? 'checked' : 'pending check'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#F4EFE6] dark:bg-[#221812] p-4">
              <p className="text-xs font-medium text-[#665042] dark:text-[#D4C3A3]">Section C · Structured</p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-[#2C1E16] dark:text-[#E8DEC8] font-mono tabular-nums">
                  {grading ? `${structuredEarned}/${structuredTotal}` : `—/${structuredTotal}`}
                </span>
                <span className="text-xs text-[#665042] dark:text-[#D4C3A3]">
                  {grading ? 'marks awarded' : 'pending grading'}
                </span>
              </div>
            </div>
          </div>

          {grading?.overallFeedback && (
            <p className="text-sm leading-relaxed text-[#2C1E16] dark:text-[#E8DEC8]">
              <span className="font-semibold text-[#5C4033] dark:text-[#C29B61]">Lecturer Summary: </span>
              {grading.overallFeedback}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-5 pt-4 border-t border-[#D8CBB8] dark:border-[#4A3528] flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#665042] dark:text-[#D4C3A3]">
          <span>
            Section A:{' '}
            <strong className="font-mono tabular-nums text-[#2C1E16] dark:text-[#E8DEC8]">
              {mcqAnsweredCount}/{mcqTotal}
            </strong>{' '}
            answered ({mcqCorrectCount} correct)
          </span>
          <span>
            Section B:{' '}
            <strong className="font-mono tabular-nums text-[#2C1E16] dark:text-[#E8DEC8]">
              {fillBlanksTotal}
            </strong>{' '}
            fill-in-the-blanks
          </span>
          <span>
            Section C:{' '}
            <strong className="font-mono tabular-nums text-[#2C1E16] dark:text-[#E8DEC8]">
              {exam.structured.length}
            </strong>{' '}
            structured questions ({structuredTotal} marks)
          </span>
        </div>
      )}
    </section>
  );
}
