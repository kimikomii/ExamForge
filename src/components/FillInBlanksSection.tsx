import { DragEvent, useMemo, useState } from 'react';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { FillInBlankQuestion } from '../types';

interface FillInBlanksSectionProps {
  questions: FillInBlankQuestion[];
  wordBank: string[];
  placements: Record<string, string>; // questionId -> chipId
  isChecked: boolean;
  onPlaceChip: (questionId: string, chipId: string) => void;
  onRemoveChip: (questionId: string) => void;
  onCheckAnswers: () => void;
  onFocusQuestion?: (questionId: string) => void;
}

interface WordChip {
  chipId: string;
  word: string;
}

export function FillInBlanksSection({
  questions,
  wordBank,
  placements,
  isChecked,
  onPlaceChip,
  onRemoveChip,
  onCheckAnswers,
  onFocusQuestion,
}: FillInBlanksSectionProps) {
  const [selectedChipId, setSelectedChipId] = useState<string | null>(null);
  const [dragOverQuestionId, setDragOverQuestionId] = useState<string | null>(null);

  const chips: WordChip[] = useMemo(
    () => wordBank.map((word, idx) => ({ chipId: `wb-${idx}`, word })),
    [wordBank]
  );

  const chipById = useMemo(() => {
    const map = new Map<string, WordChip>();
    for (const c of chips) {
      map.set(c.chipId, c);
    }
    return map;
  }, [chips]);

  const usedChipIds = useMemo(() => new Set(Object.values(placements)), [placements]);

  const placedCount = Object.keys(placements).length;
  const correctCount = isChecked
    ? questions.filter((q) => {
        const placedChipId = placements[q.id];
        if (!placedChipId) return false;
        const placedWord = chipById.get(placedChipId)?.word ?? '';
        return placedWord.trim().toLowerCase() === q.answer.trim().toLowerCase();
      }).length
    : 0;

  const handleChipClick = (chipId: string) => {
    if (isChecked || usedChipIds.has(chipId)) return;
    setSelectedChipId((prev) => (prev === chipId ? null : chipId));
  };

  const handleBlankClick = (questionId: string) => {
    if (isChecked) return;
    const currentlyPlaced = placements[questionId];
    if (selectedChipId) {
      onPlaceChip(questionId, selectedChipId);
      setSelectedChipId(null);
    } else if (currentlyPlaced) {
      onRemoveChip(questionId);
    }
  };

  const handleDragStart = (e: DragEvent<HTMLButtonElement>, chipId: string) => {
    if (isChecked || usedChipIds.has(chipId)) return;
    e.dataTransfer.setData('text/plain', chipId);
    e.dataTransfer.effectAllowed = 'move';
    setSelectedChipId(chipId);
  };

  const handleDropOnBlank = (e: DragEvent<HTMLButtonElement>, questionId: string) => {
    e.preventDefault();
    setDragOverQuestionId(null);
    if (isChecked) return;
    const chipId = e.dataTransfer.getData('text/plain') || selectedChipId;
    if (chipId && chipById.has(chipId)) {
      onPlaceChip(questionId, chipId);
      setSelectedChipId(null);
    }
  };

  const selectedChipWord = selectedChipId ? chipById.get(selectedChipId)?.word : null;

  return (
    <section
      id="section-b"
      aria-labelledby="section-b-heading"
      className="space-y-5 scroll-mt-24"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-[#D8CBB8] dark:border-[#4A3528]">
        <div>
          <h2
            id="section-b-heading"
            className="font-display text-xl sm:text-2xl font-semibold text-[#5C4033] dark:text-[#E8DEC8]"
          >
            Section B · Fill-in-the-Blanks
          </h2>
          <p className="mt-1 text-sm text-[#665042] dark:text-[#D4C3A3]">
            Drag a word from the Word Bank into a blank, or tap a word then tap a blank. Click any filled blank to return its word.
          </p>
        </div>

        <div
          aria-live="polite"
          className="inline-flex items-center gap-3 rounded-xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] px-4 py-2.5 text-xs sm:text-sm font-mono tabular-nums self-start sm:self-auto shrink-0"
        >
          {isChecked ? (
            <span className="font-semibold text-[#5C4033] dark:text-[#C29B61]">
              Score: {correctCount} / {questions.length}
            </span>
          ) : (
            <span className="text-[#2C1E16] dark:text-[#E8DEC8]">
              {placedCount} / {questions.length} Filled
            </span>
          )}
        </div>
      </div>

      {/* Shuffled Word Bank */}
      <div className="rounded-2xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-[#5C4033] dark:text-[#E8DEC8]">
            Word Bank ({chips.length - usedChipIds.size} of {chips.length} remaining)
          </p>
          {selectedChipWord && !isChecked && (
            <p className="text-xs text-[#8B5A2B] dark:text-[#C29B61]">
              Selected: <strong>{selectedChipWord}</strong> — tap any blank below to place it
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5" role="list" aria-label="Word Bank">
          {chips.map(({ chipId, word }) => {
            const isUsed = usedChipIds.has(chipId);
            const isSelected = selectedChipId === chipId;

            return (
              <button
                key={chipId}
                type="button"
                role="listitem"
                draggable={!isChecked && !isUsed}
                disabled={isChecked || isUsed}
                onDragStart={(e) => handleDragStart(e, chipId)}
                onDragEnd={() => setDragOverQuestionId(null)}
                onClick={() => handleChipClick(chipId)}
                className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors duration-150 min-h-[42px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61] ${
                  isUsed
                    ? 'border-[#D8CBB8]/60 dark:border-[#4A3528]/50 bg-[#EFE8DC]/60 dark:bg-[#1E1510]/60 text-[#9A8675] dark:text-[#7D6A54] cursor-default line-through'
                    : isSelected
                      ? 'border-[#5C4033] dark:border-[#C29B61] bg-[#5C4033] dark:bg-[#C29B61] text-white dark:text-[#1E1510] ring-2 ring-[#8B5A2B]/30 dark:ring-[#C29B61]/35 cursor-pointer'
                      : 'border-[#C7B69E] dark:border-[#5C4435] bg-[#F4EFE6] dark:bg-[#221812] text-[#2C1E16] dark:text-[#E8DEC8] hover:border-[#8B5A2B] dark:hover:border-[#C29B61] hover:bg-[#EFE8DC] dark:hover:bg-[#38291E] cursor-grab active:cursor-grabbing'
                }`}
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>

      {/* 10 Fill-in-the-Blank Sentences */}
      <div className="space-y-3.5">
        {questions.map((q, idx) => {
          const placedChipId = placements[q.id];
          const placedWord = placedChipId ? chipById.get(placedChipId)?.word : undefined;
          const isCorrect =
            isChecked &&
            Boolean(placedWord) &&
            placedWord!.trim().toLowerCase() === q.answer.trim().toLowerCase();
          const isWrong = isChecked && !isCorrect;
          const isDragOver = dragOverQuestionId === q.id;

          const segments = q.sentence.split('___');
          const beforeText = segments[0] ?? q.sentence;
          const afterText = segments.slice(1).join('___');

          return (
            <article
              key={q.id}
              data-exam-question-id={q.id}
              onFocusCapture={() => onFocusQuestion?.(q.id)}
              onPointerDown={() => onFocusQuestion?.(q.id)}
              className="rounded-2xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#665042] dark:text-[#D4C3A3]">
                <div className="flex items-center gap-2">
                  <span className="font-mono tabular-nums font-medium text-[#5C4033] dark:text-[#C29B61]">
                    Blank {String(idx + 1).padStart(2, '0')} of{' '}
                    {String(questions.length).padStart(2, '0')}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{q.concept}</span>
                </div>
                <span className="font-mono tabular-nums text-[#665042] dark:text-[#D4C3A3]">1 mark</span>
              </div>

              <div className="text-sm sm:text-base leading-relaxed text-[#2C1E16] dark:text-[#E8DEC8]">
                <span>{beforeText}</span>
                <button
                  type="button"
                  disabled={isChecked}
                  onClick={() => handleBlankClick(q.id)}
                  onDragOver={(e) => {
                    if (!isChecked) {
                      e.preventDefault();
                      setDragOverQuestionId(q.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverQuestionId === q.id) {
                      setDragOverQuestionId(null);
                    }
                  }}
                  onDrop={(e) => handleDropOnBlank(e, q.id)}
                  aria-label={
                    placedWord
                      ? `Blank ${idx + 1}: ${placedWord}. Click to return word to bank.`
                      : `Blank ${idx + 1}: empty. Tap or drop a word here.`
                  }
                  className={`mx-1.5 inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold align-baseline transition-colors min-w-[120px] min-h-[38px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61] ${
                    isChecked
                      ? isCorrect
                        ? 'border-[#749B78] dark:border-[#4F7D56] bg-[#EAF3EA] dark:bg-[#203324] text-[#244A29] dark:text-[#DCEBD9]'
                        : 'border-[#C57463] dark:border-[#A85B4C] bg-[#F9EBE7] dark:bg-[#3A221D] text-[#7A2E20] dark:text-[#F4DFDA]'
                      : isDragOver
                        ? 'border-[#5C4033] dark:border-[#C29B61] bg-[#EFE8DC] dark:bg-[#38291E] text-[#5C4033] dark:text-[#E8DEC8]'
                        : placedWord
                          ? 'border-[#8B5A2B] dark:border-[#C29B61] bg-[#EFE8DC] dark:bg-[#38291E] text-[#5C4033] dark:text-[#E8DEC8] hover:border-[#C57463] dark:hover:border-[#A85B4C] hover:bg-[#F9EBE7] dark:hover:bg-[#3A221D] hover:text-[#7A2E20] dark:hover:text-[#E59B8C] cursor-pointer'
                          : selectedChipId
                            ? 'border-dashed border-[#8B5A2B] dark:border-[#C29B61] bg-[#EFE8DC]/70 dark:bg-[#38291E]/70 text-[#5C4033] dark:text-[#C29B61] hover:bg-[#EFE8DC] dark:hover:bg-[#38291E] cursor-pointer'
                            : 'border-dashed border-[#BFA98E] dark:border-[#5C4435] bg-[#F4EFE6] dark:bg-[#1E1510] text-[#665042] dark:text-[#D4C3A3] hover:border-[#8B5A2B] dark:hover:border-[#C29B61]'
                  }`}
                >
                  <span>{placedWord ?? '___'}</span>
                  {!isChecked && placedWord && (
                    <RotateCcw className="h-3 w-3 opacity-70 shrink-0" aria-hidden="true" />
                  )}
                </button>
                <span>{afterText}</span>
              </div>

              {isChecked && (
                <div className="pt-2 border-t border-[#D8CBB8] dark:border-[#4A3528] flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#244A29] dark:text-[#9FD0A6]">
                      <CheckCircle2 className="h-4 w-4 text-[#356B3C] dark:text-[#7EB886] shrink-0" />
                      <span>Correct</span>
                    </span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1.5 font-medium text-[#7A2E20] dark:text-[#E59B8C]">
                        <XCircle className="h-4 w-4 text-[#A94432] dark:text-[#D97D6C] shrink-0" />
                        <span>{placedWord ? 'Incorrect' : 'Unanswered'}</span>
                      </span>
                      <span aria-hidden="true" className="text-[#BFA98E] dark:text-[#6B503E]">·</span>
                      <span className="text-[#2C1E16] dark:text-[#E8DEC8]">
                        Correct answer:{' '}
                        <strong className="font-semibold text-[#244A29] dark:text-[#9FD0A6]">{q.answer}</strong>
                      </span>
                    </>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Check Section B Answers Button */}
      <div className="rounded-2xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="font-display text-base font-semibold text-[#5C4033] dark:text-[#E8DEC8]">
            {isChecked
              ? `Section B Checked · ${correctCount} / ${questions.length} Correct`
              : 'Finished Filling the Blanks?'}
          </p>
          <p className="text-sm text-[#665042] dark:text-[#D4C3A3]">
            {isChecked
              ? 'Your Section B score has been added to the Total Exam Score Summary above.'
              : 'Checks all 10 blanks against the lecture key terms and updates your total exam score.'}
          </p>
        </div>

        <button
          type="button"
          disabled={isChecked}
          onClick={onCheckAnswers}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5C4033] dark:bg-[#C29B61] px-5 py-3 text-sm font-semibold text-white dark:text-[#1E1510] hover:bg-[#8B5A2B] dark:hover:bg-[#A67B5B] disabled:bg-[#D8CBB8] dark:disabled:bg-[#3A2B22] disabled:text-[#7B6859] dark:disabled:text-[#8E7C64] disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61]"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{isChecked ? 'Section B Checked' : 'Check Section B Answers'}</span>
        </button>
      </div>
    </section>
  );
}
