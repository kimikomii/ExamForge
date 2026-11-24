import { useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';

interface HeaderProps {
  hasExam: boolean;
  isQuickRevision?: boolean;
  isGenerating: boolean;
  hasGraded: boolean;
  rankTitle: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onNavigate: (sectionId: string) => void;
  onPrimaryAction: () => void;
}

export function Header({
  hasExam,
  isQuickRevision = false,
  isGenerating,
  hasGraded,
  rankTitle,
  theme,
  onToggleTheme,
  onNavigate,
  onPrimaryAction,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = hasExam
    ? isQuickRevision
      ? [
          { id: 'upload-view', label: 'Upload Notes' },
          { id: 'score-summary', label: 'Deck Overview' },
          { id: 'quick-revision-deck', label: 'Cue Cards' },
        ]
      : [
          { id: 'upload-view', label: 'Upload Notes' },
          ...(hasGraded ? [{ id: 'score-summary', label: 'Score Summary' }] : []),
          { id: 'section-a', label: 'Section A' },
          { id: 'section-b', label: 'Section B' },
          { id: 'section-c', label: 'Section C' },
        ]
    : [
        { id: 'input-section', label: 'Material Input' },
        { id: 'how-it-works', label: 'Exam Format' },
      ];

  const handleLinkClick = (id: string) => {
    setMobileMenuOpen(false);
    onNavigate(id);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2]/95 dark:bg-[#2B1E17]/95 backdrop-blur-md transition-colors duration-150">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Logo & Wordmark */}
        <button
          type="button"
          onClick={() => handleLinkClick('top')}
          aria-label="ExamForge home"
          className="group inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 rounded-md py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61]"
        >
          <svg
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
            className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 text-[#5C4033] group-hover:text-[#8B5A2B] dark:text-[#E8DEC8] dark:group-hover:text-[#F5ECD9] dark:drop-shadow-[0_0_8px_rgba(232,222,200,0.45)] transition-all duration-150"
          >
            {/* 8-tooth forged gear outer ring */}
            <g transform="translate(20 20)">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <path
                  key={angle}
                  d="M -2.6 -17.4 L 2.6 -17.4 L 3.7 -13.2 L -3.7 -13.2 Z"
                  fill="currentColor"
                  transform={`rotate(${angle})`}
                />
              ))}
              <circle r="13.8" fill="currentColor" />
              {/* Recessed khaki (light) / dark brown (dark) gear well */}
              <circle
                r="10.2"
                className="fill-[#F4EFE6] dark:fill-[#1E1510] transition-colors duration-150"
              />
              <circle
                r="8.8"
                stroke="currentColor"
                strokeWidth="0.9"
                strokeOpacity="0.35"
                fill="none"
              />
            </g>

            {/* Forge spark crest above the book spine */}
            <path
              d="M 20 8.8 L 21.1 11.4 L 23.6 12.4 L 21.1 13.4 L 20 15.8 L 18.9 13.4 L 16.4 12.4 L 18.9 11.4 Z"
              className="fill-[#8B5A2B] dark:fill-[#E8DEC8] transition-colors duration-150"
            />

            {/* Forged open book */}
            <path
              d="M 9.2 17.5 C 13.2 16.1, 17.2 16.8, 20 19 C 22.8 16.8, 26.8 16.1, 30.8 17.5 L 30.8 29 C 26.8 27.6, 22.8 28.2, 20 30.4 C 17.2 28.2, 13.2 27.6, 9.2 29 Z"
              fill="currentColor"
              strokeLinejoin="round"
            />
            <path
              d="M 11 19 C 14.2 18, 17.3 18.6, 19.3 20.3 L 19.3 28.1 C 17 26.7, 13.9 26.3, 11 27.3 Z"
              className="fill-[#FAF7F2] dark:fill-[#2B1E17] transition-colors duration-150"
            />
            <path
              d="M 29 19 C 25.8 18, 22.7 18.6, 20.7 20.3 L 20.7 28.1 C 23 26.7, 26.1 26.3, 29 27.3 Z"
              className="fill-[#FAF7F2] dark:fill-[#2B1E17] transition-colors duration-150"
            />
            {/* Crisp page rule lines */}
            <path
              d="M 12.7 21.5 Q 15.2 21, 17.5 22 M 12.7 24.2 Q 15.2 23.7, 17.5 24.7"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
            <path
              d="M 27.3 21.5 Q 24.8 21, 22.5 22 M 27.3 24.2 Q 24.8 23.7, 22.5 24.7"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          </svg>

          <span className="font-sans text-lg sm:text-xl font-bold uppercase tracking-[0.06em] leading-none text-[#5C4033] group-hover:text-[#8B5A2B] dark:text-[#E8DEC8] dark:group-hover:text-[#F5ECD9] dark:drop-shadow-[0_0_8px_rgba(232,222,200,0.35)] transition-all duration-150">
            EXAMFORGE
          </span>
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[#665042] dark:text-[#D4C3A3]"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleLinkClick(item.id)}
              className="hover:text-[#2C1E16] dark:hover:text-[#E8DEC8] transition-colors duration-150 whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#8B5A2B] dark:hover:border-[#C29B61] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61] rounded-sm"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Student Rank + Theme Toggle + Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <span
            aria-label={`Current student rank: ${rankTitle}`}
            className="hidden sm:inline-flex items-center text-xs font-semibold text-[#8B5A2B] dark:text-[#C29B61] whitespace-nowrap shrink-0"
          >
            {rankTitle}
          </span>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D8CBB8] dark:border-[#4A3528] bg-[#F4EFE6] dark:bg-[#1E1510] px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium text-[#5C4033] dark:text-[#E8DEC8] hover:bg-[#EFE8DC] dark:hover:bg-[#38291E] hover:border-[#BFA98E] dark:hover:border-[#A67B5B] transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61]"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4 text-[#C29B61] shrink-0" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-[#5C4033] shrink-0" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isGenerating}
            onClick={onPrimaryAction}
            className="inline-flex items-center justify-center rounded-lg bg-[#5C4033] dark:bg-[#C29B61] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white dark:text-[#1E1510] hover:bg-[#8B5A2B] dark:hover:bg-[#A67B5B] disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61]"
          >
            {hasExam ? 'New Practice Set' : 'Load Sample Notes'}
          </button>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center rounded-lg border border-[#D8CBB8] dark:border-[#4A3528] bg-[#F4EFE6] dark:bg-[#1E1510] p-2 text-[#5C4033] dark:text-[#E8DEC8] hover:text-[#2C1E16] dark:hover:text-[#C29B61] hover:border-[#BFA98E] dark:hover:border-[#A67B5B] min-h-[40px] min-w-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61]"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="md:hidden border-t border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] px-4 py-3 flex flex-col gap-1"
        >
          <div className="px-3 py-1.5 text-xs font-semibold text-[#8B5A2B] dark:text-[#C29B61]">
            Rank: {rankTitle}
          </div>
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleLinkClick(item.id)}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#2C1E16] dark:text-[#E8DEC8] hover:bg-[#EFE8DC] dark:hover:bg-[#38291E] transition-colors min-h-[44px]"
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
