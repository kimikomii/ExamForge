import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import { AlertTriangle, FileText, Loader2, Trash2, Upload, Zap } from 'lucide-react';
import { ExamDifficulty, StudySource } from '../types';

interface StudyInputSectionProps {
  source: StudySource;
  difficulty: ExamDifficulty;
  bossBattleEnabled: boolean;
  isGenerating: boolean;
  statusMessage: string | null;
  error: string | null;
  hasExam: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSourceChange: (next: StudySource) => void;
  onDifficultyChange: (next: ExamDifficulty) => void;
  onToggleBossBattle: () => void;
  onGenerate: () => void;
}

const DIFFICULTY_OPTIONS: {
  value: ExamDifficulty;
  summary: string;
}[] = [
  {
    value: 'Standard Diploma Level',
    summary: 'Balanced recall, conceptual clarity, and standard applied coursework scenarios.',
  },
  {
    value: 'Hard / Tricky',
    summary: 'Subtle MCQ distractors, edge-case traps, and multi-step analytical questions.',
  },
  {
    value: 'Quick Revision',
    summary: 'High-yield core definitions and fundamental checks for fast pre-exam review.',
  },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function StudyInputSection({
  source,
  difficulty,
  bossBattleEnabled,
  isGenerating,
  statusMessage,
  error,
  hasExam,
  isCollapsed,
  onToggleCollapse,
  onSourceChange,
  onDifficultyChange,
  onToggleBossBattle,
  onGenerate,
}: StudyInputSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const selectedDifficultyMeta =
    DIFFICULTY_OPTIONS.find((d) => d.value === difficulty) ?? DIFFICULTY_OPTIONS[0];

  const handlePdfFile = (file: File) => {
    setFileError(null);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setFileError('Please select a valid PDF document (.pdf).');
      return;
    }
    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      setFileError('PDF exceeds the 15 MB limit. Try a smaller file or paste notes directly.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.replace(/^data:[^;]+;base64,/i, '').replace(/\s+/g, '');
      if (!base64) {
        setFileError('Could not extract PDF data. Please try another PDF file.');
        return;
      }
      onSourceChange({
        ...source,
        type: 'pdf',
        pdfBase64: base64,
        pdfName: file.name,
        pdfSizeBytes: file.size,
      });
    };
    reader.onerror = () => {
      setFileError('Could not read the selected PDF file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePdfFile(file);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handlePdfFile(file);
    }
  };

  const wordCount = source.notesText.trim()
    ? source.notesText.trim().split(/\s+/).length
    : 0;

  const isLargePdf =
    source.type === 'pdf' &&
    Boolean(source.pdfBase64) &&
    (source.pdfSizeBytes ?? 0) > 4 * 1024 * 1024;

  const canSubmit =
    !isGenerating &&
    (source.type === 'pdf'
      ? Boolean(source.pdfBase64)
      : source.notesText.trim().length >= 30);

  if (hasExam && isCollapsed) {
    return (
      <section
        id="input-section"
        aria-label="Lecture material summary"
        className="rounded-xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#665042] dark:text-[#D4C3A3]">
            <span>Active Source Material</span>
            <span aria-hidden="true">·</span>
            <span>{difficulty}</span>
            {bossBattleEnabled && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-[#8B5A2B] dark:text-[#C29B61]">
                  Boss Battle (60s)
                </span>
              </>
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-[#2C1E16] dark:text-[#E8DEC8] truncate">
            {source.type === 'pdf'
              ? `${source.pdfName ?? 'Uploaded PDF'} (${formatBytes(source.pdfSizeBytes ?? 0)})`
              : `Pasted Lecture Notes (${wordCount} words)`}
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="inline-flex items-center justify-center rounded-lg border border-[#D8CBB8] dark:border-[#4A3528] bg-[#F4EFE6] dark:bg-[#1E1510] px-4 py-2 text-xs sm:text-sm font-medium text-[#5C4033] dark:text-[#E8DEC8] hover:bg-[#EAE1D3] dark:hover:bg-[#38291E] hover:text-[#2C1E16] dark:hover:text-[#E8DEC8] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
        >
          Edit Source Material
        </button>
      </section>
    );
  }

  return (
    <section
      id="input-section"
      aria-labelledby="input-heading"
      className="rounded-2xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] p-5 sm:p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#D8CBB8] dark:border-[#4A3528]">
        <div>
          <h2
            id="input-heading"
            className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-[#5C4033] dark:text-[#E8DEC8]"
          >
            Lecture Material Input
          </h2>
          <p className="mt-1.5 text-sm text-[#665042] dark:text-[#D4C3A3] max-w-2xl leading-relaxed">
            Upload a lecture PDF or paste your study notes below. ExamForge builds a tailored
            33-question mock exam across objective MCQs, fill-in-the-blanks, and structured answers.
          </p>
        </div>

        {hasExam && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="self-start sm:self-auto text-xs font-medium text-[#665042] dark:text-[#D4C3A3] hover:text-[#2C1E16] dark:hover:text-[#E8DEC8] underline underline-offset-4 whitespace-nowrap shrink-0 py-1"
          >
            Collapse Input
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Input Mode Tabs + Textarea or PDF Dropzone */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Input method"
              className="inline-flex items-center gap-1 rounded-lg bg-[#EFE8DC] dark:bg-[#1E1510] p-1 border border-[#D8CBB8] dark:border-[#4A3528]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={source.type === 'text'}
                onClick={() => onSourceChange({ ...source, type: 'text' })}
                className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[38px] ${
                  source.type === 'text'
                    ? 'bg-[#5C4033] dark:bg-[#C29B61] text-white dark:text-[#1E1510] shadow-sm'
                    : 'text-[#665042] dark:text-[#D4C3A3] hover:text-[#2C1E16] dark:hover:text-[#E8DEC8]'
                }`}
              >
                Paste Lecture Notes
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={source.type === 'pdf'}
                onClick={() => onSourceChange({ ...source, type: 'pdf' })}
                className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[38px] ${
                  source.type === 'pdf'
                    ? 'bg-[#5C4033] dark:bg-[#C29B61] text-white dark:text-[#1E1510] shadow-sm'
                    : 'text-[#665042] dark:text-[#D4C3A3] hover:text-[#2C1E16] dark:hover:text-[#E8DEC8]'
                }`}
              >
                Upload PDF Document
              </button>
            </div>

            {source.type === 'text' && (
              <div className="flex items-center gap-3 text-xs text-[#665042] dark:text-[#D4C3A3] font-mono tabular-nums">
                <span>{wordCount} words</span>
                {source.notesText.length > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={() => onSourceChange({ ...source, notesText: '' })}
                      className="font-sans text-[#665042] dark:text-[#D4C3A3] hover:text-[#7A2E20] dark:hover:text-[#E59B8C] transition-colors"
                    >
                      Clear text
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {source.type === 'text' ? (
            <div>
              <label htmlFor="lecture-notes-textarea" className="sr-only">
                Raw lecture notes
              </label>
              <textarea
                id="lecture-notes-textarea"
                value={source.notesText}
                onChange={(e) =>
                  onSourceChange({ ...source, type: 'text', notesText: e.target.value })
                }
                placeholder="Paste your lecture slides, textbook summary, or class notes here (minimum ~30 characters)..."
                className="w-full min-h-[260px] rounded-xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FFFFFF] dark:bg-[#1E1510] px-4 py-3.5 text-sm sm:text-[15px] leading-relaxed text-[#2C1E16] dark:text-[#E8DEC8] placeholder:text-[#8C7564] dark:placeholder:text-[#9E8B6E] focus:border-[#8B5A2B] dark:focus:border-[#C29B61] focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 dark:focus:ring-[#C29B61]/25 resize-y"
              />
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={`min-h-[260px] rounded-xl border border-dashed transition-colors flex flex-col items-center justify-center p-6 text-center ${
                isDragging
                  ? 'border-[#8B5A2B] dark:border-[#C29B61] bg-[#EFE8DC] dark:bg-[#38291E]'
                  : 'border-[#C7B69E] dark:border-[#5C4435] bg-[#F4EFE6]/60 dark:bg-[#1E1510]/80 hover:border-[#8B5A2B] dark:hover:border-[#C29B61]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={onFileInputChange}
                className="hidden"
                aria-label="Upload PDF lecture document"
              />

              {source.pdfBase64 ? (
                <div className="flex flex-col items-center gap-3 max-w-md">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFE8DC] dark:bg-[#38291E] border border-[#D8CBB8] dark:border-[#4A3528] text-[#5C4033] dark:text-[#C29B61]">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-semibold text-[#2C1E16] dark:text-[#E8DEC8] break-all">
                      {source.pdfName}
                    </p>
                    <p className="mt-1 text-xs text-[#665042] dark:text-[#D4C3A3] font-mono tabular-nums">
                      PDF Ready · {formatBytes(source.pdfSizeBytes ?? 0)}
                    </p>
                  </div>
                  {isLargePdf && (
                    <div
                      role="status"
                      className="flex items-start gap-2 rounded-lg border border-[#CFA364] dark:border-[#A67B5B] bg-[#FAF0DE] dark:bg-[#38291E] px-3.5 py-2.5 text-left text-xs leading-relaxed text-[#6E4614] dark:text-[#E8DEC8]"
                    >
                      <AlertTriangle className="h-4 w-4 text-[#8B5A2B] dark:text-[#C29B61] shrink-0 mt-0.5" />
                      <span>
                        This PDF is quite large—if it fails, try pasting the chapter text or compressing the PDF.
                      </span>
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] px-4 py-2 text-xs font-medium text-[#5C4033] dark:text-[#E8DEC8] hover:bg-[#EFE8DC] dark:hover:bg-[#38291E] transition-colors min-h-[40px]"
                    >
                      Replace PDF
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onSourceChange({
                          ...source,
                          pdfBase64: undefined,
                          pdfName: undefined,
                          pdfSizeBytes: undefined,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#C57463]/50 dark:border-[#A85B4C] bg-[#F9EBE7] dark:bg-[#3A221D] px-3.5 py-2 text-xs font-medium text-[#7A2E20] dark:text-[#E59B8C] hover:bg-[#F3DDD6] dark:hover:bg-[#4B2C25] transition-colors min-h-[40px]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 max-w-md">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFE8DC] dark:bg-[#38291E] border border-[#D8CBB8] dark:border-[#4A3528] text-[#5C4033] dark:text-[#C29B61]">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-medium text-[#2C1E16] dark:text-[#E8DEC8]">
                      Drop your lecture PDF here
                    </p>
                    <p className="mt-1 text-xs text-[#665042] dark:text-[#D4C3A3]">
                      Supports lecture slides, handouts, and study guides up to 15 MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 inline-flex items-center justify-center rounded-lg border border-[#C7B69E] dark:border-[#5C4435] bg-[#FAF7F2] dark:bg-[#2B1E17] px-4 py-2.5 text-xs sm:text-sm font-medium text-[#5C4033] dark:text-[#E8DEC8] hover:bg-[#EFE8DC] dark:hover:bg-[#38291E] transition-colors min-h-[44px]"
                  >
                    Browse PDF File
                  </button>
                </div>
              )}

              {fileError && (
                <p role="alert" className="mt-3 text-xs text-[#7A2E20] dark:text-[#E59B8C]">
                  {fileError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right: Difficulty Configuration & Primary CTA */}
        <div
          id="how-it-works"
          className="lg:col-span-4 flex flex-col justify-between gap-6 rounded-xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#F4EFE6] dark:bg-[#221812] p-5"
        >
          <div className="space-y-5">
            <div>
              <label
                htmlFor="difficulty-select"
                className="block text-sm font-medium text-[#2C1E16] dark:text-[#E8DEC8] mb-2"
              >
                Exam Difficulty
              </label>
              <select
                id="difficulty-select"
                value={difficulty}
                onChange={(e) => onDifficultyChange(e.target.value as ExamDifficulty)}
                className="w-full min-h-[44px] rounded-lg border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#1E1510] px-3.5 py-2.5 text-sm text-[#2C1E16] dark:text-[#E8DEC8] focus:border-[#8B5A2B] dark:focus:border-[#C29B61] focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 dark:focus:ring-[#C29B61]/25"
              >
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-relaxed text-[#665042] dark:text-[#D4C3A3]">
                {selectedDifficultyMeta.summary}
              </p>
            </div>

            {/* Optional Boss Battle (60s Speed Mode) Toggle */}
            <div className="pt-4 border-t border-[#D8CBB8] dark:border-[#4A3528] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2C1E16] dark:text-[#E8DEC8]">
                  <Zap className="h-3.5 w-3.5 text-[#8B5A2B] dark:text-[#C29B61] shrink-0" />
                  <span>Boss Battle (60s Speed Mode)</span>
                </span>
                <p className="mt-0.5 text-xs text-[#665042] dark:text-[#D4C3A3]">
                  Race the 60s Section A timer &amp; track your Personal Best.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={bossBattleEnabled}
                aria-label="Toggle Boss Battle 60 second speed mode"
                onClick={onToggleBossBattle}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61] ${
                  bossBattleEnabled
                    ? 'border-[#5C4033] dark:border-[#C29B61] bg-[#5C4033] dark:bg-[#C29B61]'
                    : 'border-[#C7B69E] dark:border-[#4A3528] bg-[#E8DEC8] dark:bg-[#1E1510]'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full transition-transform duration-150 ${
                    bossBattleEnabled
                      ? 'translate-x-6 bg-white dark:bg-[#1E1510]'
                      : 'translate-x-1 bg-[#5C4033] dark:bg-[#D4C3A3]'
                  }`}
                />
              </button>
            </div>

            <div className="pt-4 border-t border-[#D8CBB8] dark:border-[#4A3528] space-y-2.5 text-xs text-[#665042] dark:text-[#D4C3A3]">
              <p className="font-medium text-[#2C1E16] dark:text-[#E8DEC8]">Generated Exam Blueprint</p>
              <div className="flex items-center justify-between">
                <span>Section A · Objective MCQ</span>
                <span className="font-mono tabular-nums text-[#2C1E16] dark:text-[#E8DEC8]">20 questions</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Section B · Fill-in-the-Blanks</span>
                <span className="font-mono tabular-nums text-[#2C1E16] dark:text-[#E8DEC8]">10 questions</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Section C · Short Answer</span>
                <span className="font-mono tabular-nums text-[#2C1E16] dark:text-[#E8DEC8]">3 × 5 marks</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Study Boosters</span>
                <span className="font-mono text-[#2C1E16] dark:text-[#E8DEC8]">AI Grader + ELI12</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={onGenerate}
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#5C4033] dark:bg-[#C29B61] px-5 py-3 text-sm font-semibold text-white dark:text-[#1E1510] hover:bg-[#8B5A2B] dark:hover:bg-[#A67B5B] disabled:bg-[#D8CBB8] dark:disabled:bg-[#3A2B22] disabled:text-[#7B6859] dark:disabled:text-[#8E7C64] disabled:cursor-not-allowed transition-colors duration-150 min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analyzing Material...</span>
                </>
              ) : (
                <span>Generate Mock Exam</span>
              )}
            </button>

            {isGenerating && statusMessage && (
              <p role="status" className="text-xs leading-relaxed text-[#8B5A2B] dark:text-[#C29B61]">
                {statusMessage}
              </p>
            )}

            {error && (
              <p role="alert" className="text-xs leading-relaxed text-[#7A2E20] dark:text-[#E59B8C]">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
