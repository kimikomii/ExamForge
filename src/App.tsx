import { useEffect, useRef, useState } from 'react';
import { CheckCheck, Loader2 } from 'lucide-react';
import { Header } from './components/Header';
import { StudyInputSection } from './components/StudyInputSection';
import { ExamSummaryBanner } from './components/ExamSummaryBanner';
import { FillInBlanksSection } from './components/FillInBlanksSection';
import { McqCard } from './components/McqCard';
import { StructuredCard } from './components/StructuredCard';
import { ConfettiBurst } from './components/ConfettiBurst';
import {
  ScoreCelebrationModal,
  ScoreFeedbackModalData,
} from './components/ScoreCelebrationModal';
import { BossBattleBar } from './components/BossBattleBar';
import { MascotReaction, StudyMascot } from './components/StudyMascot';
import { postExamWithProgress } from './lib/api';
import {
  Eli12Explanation,
  ExamDifficulty,
  GradingResponse,
  MockExam,
  StudySource,
} from './types';

const SAMPLE_LECTURE_NOTES = `Lecture 4: Operating Systems — CPU Scheduling & Deadlocks

1. CPU Scheduling Criteria:
- CPU Utilization: Keep the CPU as busy as possible (typically 40% to 90%).
- Throughput: Number of processes completed per unit time.
- Turnaround Time: Total time from process submission to completion (waiting + execution + I/O).
- Waiting Time: Total time a process spends waiting in the ready queue.
- Response Time: Time from submission until the first response is produced (critical in interactive systems).

2. Common Scheduling Algorithms:
- First-Come, First-Served (FCFS): Non-preemptive FIFO queue. Simple, but suffers from the Convoy Effect where short processes get stuck behind one long CPU-bound process.
- Shortest Job First (SJF): Optimal minimum average waiting time, but impossible to know exact next CPU burst length in advance (predicted via exponential averaging). Can cause starvation for long jobs.
- Round Robin (RR): Preemptive algorithm designed for time-sharing systems. Each process gets a small fixed time quantum (q, typically 10-100ms). If q is too large, RR degenerates into FCFS; if q is too small, context-switch overhead dominates.
- Multilevel Feedback Queue (MLFQ): Allows processes to move between priority queues based on CPU burst behavior, favoring I/O-bound and interactive processes while preventing starvation via aging.

3. Deadlocks:
A deadlock occurs when a set of blocked processes each holds a resource and waits to acquire a resource held by another process in the set.
Four Necessary Conditions (Coffman Conditions — ALL four must hold simultaneously):
1) Mutual Exclusion: At least one resource must be held in a non-sharable mode.
2) Hold and Wait: A process is currently holding at least one resource and waiting to acquire additional resources held by other processes.
3) No Preemption: Resources cannot be forcibly taken from a process; they are released only voluntarily after completion.
4) Circular Wait: A closed chain of processes exists such that each process holds a resource needed by the next process in the chain.

Deadlock Handling Strategies:
- Prevention: Invalidate at least one of the four Coffman conditions by design (e.g., imposing a strict total ordering of resource types prevents Circular Wait).
- Avoidance: Dynamically examine resource-allocation state using the Banker's Algorithm to ensure the system never enters an unsafe state.
- Detection & Recovery: Allow deadlocks to occur, detect cycles via a Wait-For Graph, and recover by terminating processes or preempting resources.`;

export default function App() {
  const [source, setSource] = useState<StudySource>({
    type: 'text',
    notesText: '',
  });
  const [difficulty, setDifficulty] = useState<ExamDifficulty>('Standard Diploma Level');
  const [exam, setExam] = useState<MockExam | null>(null);
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateStatus, setGenerateStatus] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [mcqAnswers, setMcqAnswers] = useState<Record<string, number>>({});
  const [showOnlyWrongMcqs, setShowOnlyWrongMcqs] = useState(false);
  const [fillBlankPlacements, setFillBlankPlacements] = useState<Record<string, string>>({});
  const [fillBlanksChecked, setFillBlanksChecked] = useState(false);
  const [structuredAnswers, setStructuredAnswers] = useState<Record<string, string>>({});

  const [isGrading, setIsGrading] = useState(false);
  const [gradeStatus, setGradeStatus] = useState<string | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [grading, setGrading] = useState<GradingResponse | null>(null);

  const [eli12Map, setEli12Map] = useState<Record<string, Eli12Explanation>>({});
  const [eli12Loading, setEli12Loading] = useState<Record<string, boolean>>({});
  const [eli12Status, setEli12Status] = useState<Record<string, string | undefined>>({});
  const [eli12Errors, setEli12Errors] = useState<Record<string, string>>({});

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      return localStorage.getItem('examforge-theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    try {
      localStorage.setItem('examforge-theme', theme);
    } catch {
      // Ignore storage failures in restricted contexts
    }
  }, [theme]);

  const [confettiBurstKey, setConfettiBurstKey] = useState(0);
  const [scoreModal, setScoreModal] = useState<ScoreFeedbackModalData | null>(null);

  const [comboStreak, setComboStreak] = useState(0);
  const [bossBattleEnabled, setBossBattleEnabled] = useState(false);
  const [bossTimeLeft, setBossTimeLeft] = useState(60);
  const [bossRunning, setBossRunning] = useState(false);
  const [bossFinished, setBossFinished] = useState(false);
  const [bossIsNewRecord, setBossIsNewRecord] = useState(false);
  const [bossPersonalBest, setBossPersonalBest] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const saved = Number(localStorage.getItem('examforge-boss-best'));
      return Number.isFinite(saved) && saved > 0 ? saved : 0;
    } catch {
      return 0;
    }
  });

  const [mascotReaction, setMascotReaction] = useState<MascotReaction>({
    id: 0,
    text: "Hoo's ready to study? Paste notes or drop a PDF to begin!",
    mood: 'neutral',
  });

  const examTopRef = useRef<HTMLDivElement>(null);

  const pushMascot = (text: string, mood: MascotReaction['mood']) => {
    setMascotReaction((prev) => ({ id: prev.id + 1, text, mood }));
  };

  const triggerScoreFeedback = (feedback: ScoreFeedbackModalData) => {
    setScoreModal(feedback);
    if (feedback.isAce) {
      setConfettiBurstKey((prev) => prev + 1);
    }
  };

  const scrollToSection = (sectionId: string) => {
    if (sectionId === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (sectionId === 'input-section' && isInputCollapsed) {
      setIsInputCollapsed(false);
    }
    requestAnimationFrame(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const generateExam = async (isPracticeSetRefresh = false) => {
    setGenerateError(null);
    setGenerateStatus(null);
    setIsGenerating(true);

    const previousQuestions =
      isPracticeSetRefresh && exam
        ? [
            ...exam.mcqs.map((q) => q.question),
            ...(exam.fillInBlanks ?? []).map((q) => q.sentence),
            ...exam.structured.map((q) => q.question),
          ]
        : [];

    try {
      const data = await postExamWithProgress<MockExam>(
        '/api/exam/generate',
        {
          sourceType: source.type,
          notesText: source.type === 'text' ? source.notesText : undefined,
          pdfBase64: source.type === 'pdf' ? source.pdfBase64 : undefined,
          difficulty,
          previousQuestions,
        },
        (statusMsg) => setGenerateStatus(statusMsg)
      );

      setExam(data);
      setMcqAnswers({});
      setShowOnlyWrongMcqs(false);
      setFillBlankPlacements({});
      setFillBlanksChecked(false);
      setStructuredAnswers({});
      setGrading(null);
      setGradeError(null);
      setEli12Map({});
      setEli12Loading({});
      setEli12Status({});
      setEli12Errors({});
      setComboStreak(0);
      setScoreModal(null);
      setIsInputCollapsed(true);

      if (bossBattleEnabled) {
        setBossTimeLeft(60);
        setBossFinished(false);
        setBossIsNewRecord(false);
        setBossRunning(true);
        pushMascot(
          'Boss Battle live! 60 seconds on the clock—answer fast!',
          'hype'
        );
      } else {
        setBossRunning(false);
        setBossFinished(false);
        setBossTimeLeft(60);
        pushMascot(
          "Mock exam ready! Let's build a streak in Section A.",
          'neutral'
        );
      }

      setTimeout(() => {
        examTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : 'Unable to generate mock exam. Please try again.'
      );
    } finally {
      setIsGenerating(false);
      setGenerateStatus(null);
    }
  };

  const handleHeaderPrimaryAction = () => {
    if (exam) {
      generateExam(true);
    } else {
      setSource({ type: 'text', notesText: SAMPLE_LECTURE_NOTES });
      setIsInputCollapsed(false);
      setGenerateError(null);
      scrollToSection('input-section');
    }
  };

  const handleSelectMcqOption = (questionId: string, optionIndex: number) => {
    if (!exam || mcqAnswers[questionId] !== undefined) {
      return;
    }

    const targetQuestion = exam.mcqs.find((q) => q.id === questionId);
    const isCorrectPick = targetQuestion
      ? optionIndex === targetQuestion.correctIndex
      : false;
    const nextStreak = isCorrectPick ? comboStreak + 1 : 0;
    setComboStreak(nextStreak);

    const nextMcqAnswers = { ...mcqAnswers, [questionId]: optionIndex };
    setMcqAnswers(nextMcqAnswers);

    const prevAnswered = exam.mcqs.filter((q) => mcqAnswers[q.id] !== undefined).length;
    const nextAnswered = exam.mcqs.filter((q) => nextMcqAnswers[q.id] !== undefined).length;

    if (isCorrectPick) {
      if (nextStreak >= 5) {
        pushMascot(
          `${nextStreak}x Streak! Unstoppable professor energy right now!`,
          'hype'
        );
      } else if (nextStreak >= 3) {
        pushMascot(
          `${nextStreak}x Streak! Brain cells are locked in—keep rolling!`,
          'happy'
        );
      } else if (nextStreak === 2) {
        pushMascot('2x Streak! Warming up nicely.', 'happy');
      } else {
        pushMascot('Clean recall! Keep that momentum going.', 'happy');
      }
    } else {
      pushMascot(
        'Plot twist! Check the explanation—mistakes here save marks on exam day.',
        'oops'
      );
    }

    if (prevAnswered < exam.mcqs.length && nextAnswered === exam.mcqs.length) {
      const sectionCorrect = exam.mcqs.filter(
        (q) => nextMcqAnswers[q.id] === q.correctIndex
      ).length;
      const sectionTotal = exam.mcqs.length;
      const sectionPercent =
        sectionTotal > 0 ? Math.round((sectionCorrect / sectionTotal) * 100) : 0;

      const fillTotal = exam.fillInBlanks?.length ?? 0;
      const structuredTotal = exam.structured.reduce((sum, q) => sum + q.maxMarks, 0);
      const structuredEarned = grading
        ? grading.results.reduce((sum, r) => sum + r.score, 0)
        : 0;
      const overallTotal = sectionTotal + fillTotal + structuredTotal;
      const overallEarned =
        sectionCorrect + (fillBlanksChecked ? fillBlanksScore : 0) + structuredEarned;
      const overallPercent =
        overallTotal > 0 ? Math.round((overallEarned / overallTotal) * 100) : 0;

      const allSectionsDone = fillBlanksChecked && Boolean(grading);

      if (bossBattleEnabled && bossRunning) {
        setBossRunning(false);
        setBossFinished(true);
        if (sectionCorrect > bossPersonalBest) {
          setBossPersonalBest(sectionCorrect);
          setBossIsNewRecord(true);
          try {
            localStorage.setItem('examforge-boss-best', String(sectionCorrect));
          } catch {
            // Ignore storage failures
          }
        }
      }

      if (allSectionsDone && overallPercent >= 80 && sectionPercent < 80) {
        pushMascot(
          `${overallPercent}% overall! Dean's List energy right there!`,
          'hype'
        );
        triggerScoreFeedback({
          sectionLabel: 'Overall Exam Score',
          percentage: overallPercent,
          earned: overallEarned,
          total: overallTotal,
          unitLabel: 'marks total',
          isAce: true,
        });
      } else {
        const isAce = sectionPercent >= 80 || (allSectionsDone && overallPercent >= 80);
        if (isAce) {
          pushMascot(
            `${sectionPercent}% on Section A! You're cruising through these MCQs!`,
            'hype'
          );
        } else {
          pushMascot(
            `Section A wrapped (${sectionPercent}%). Peek at the wrong-answer filter to lock it in!`,
            'neutral'
          );
        }
        triggerScoreFeedback({
          sectionLabel: 'Section A · Multiple Choice',
          percentage: sectionPercent,
          earned: sectionCorrect,
          total: sectionTotal,
          unitLabel: 'questions correct',
          isAce,
        });
      }
    }
  };

  const handleGradeStructured = async () => {
    if (!exam) return;
    setGradeError(null);
    setGradeStatus(null);
    setIsGrading(true);

    try {
      const data = await postExamWithProgress<GradingResponse>(
        '/api/exam/grade',
        {
          sourceType: source.type,
          notesText: source.type === 'text' ? source.notesText : undefined,
          pdfBase64: source.type === 'pdf' ? source.pdfBase64 : undefined,
          difficulty: exam.difficulty,
          questions: exam.structured.map((q) => ({
            id: q.id,
            question: q.question,
            concept: q.concept,
            studentAnswer: structuredAnswers[q.id] ?? '',
            maxMarks: q.maxMarks,
          })),
        },
        (statusMsg) => setGradeStatus(statusMsg)
      );

      setGrading(data);

      const structuredEarned = data.results.reduce((sum, r) => sum + r.score, 0);
      const structuredTotal = exam.structured.reduce((sum, q) => sum + q.maxMarks, 0);
      const structuredPercent =
        structuredTotal > 0 ? Math.round((structuredEarned / structuredTotal) * 100) : 0;

      const mcqTotal = exam.mcqs.length;
      const fillTotal = exam.fillInBlanks?.length ?? 0;
      const combinedTotal = mcqTotal + fillTotal + structuredTotal;
      const combinedEarned =
        mcqCorrectCount + (fillBlanksChecked ? fillBlanksScore : 0) + structuredEarned;
      const overallPercent =
        combinedTotal > 0 ? Math.round((combinedEarned / combinedTotal) * 100) : 0;

      const otherSectionsComplete = mcqAnsweredCount === mcqTotal && fillBlanksChecked;

      if (overallPercent >= 80) {
        pushMascot(
          `${overallPercent}% overall! Coffee's on me—you crushed it!`,
          'hype'
        );
        triggerScoreFeedback({
          sectionLabel: 'Overall Exam Score',
          percentage: overallPercent,
          earned: combinedEarned,
          total: combinedTotal,
          unitLabel: 'marks total',
          isAce: true,
        });
      } else if (structuredPercent >= 80) {
        pushMascot(
          `${structuredPercent}% on Section C! Crisp technical definitions!`,
          'hype'
        );
        triggerScoreFeedback({
          sectionLabel: 'Section C · Structured Short Answer',
          percentage: structuredPercent,
          earned: structuredEarned,
          total: structuredTotal,
          unitLabel: 'marks awarded',
          isAce: true,
        });
      } else if (otherSectionsComplete) {
        pushMascot(
          'Graded! Check the missing key terms—next run will be unstoppable.',
          'neutral'
        );
        triggerScoreFeedback({
          sectionLabel: 'Overall Exam Score',
          percentage: overallPercent,
          earned: combinedEarned,
          total: combinedTotal,
          unitLabel: 'marks total',
          isAce: false,
        });
      } else {
        pushMascot(
          'Solid attempt! Use the missing key terms and ELI12 cards to sharpen up.',
          'neutral'
        );
        triggerScoreFeedback({
          sectionLabel: 'Section C · Structured Short Answer',
          percentage: structuredPercent,
          earned: structuredEarned,
          total: structuredTotal,
          unitLabel: 'marks awarded',
          isAce: false,
        });
      }

      setTimeout(() => {
        scrollToSection('score-summary');
      }, 60);
    } catch (err) {
      setGradeError(
        err instanceof Error ? err.message : 'Unable to grade answers right now.'
      );
    } finally {
      setIsGrading(false);
      setGradeStatus(null);
    }
  };

  const handleRequestEli12 = async (params: {
    id: string;
    question: string;
    concept: string;
    correctOrModelAnswer: string;
    studentAttempt?: string;
  }) => {
    const { id, question, concept, correctOrModelAnswer, studentAttempt } = params;
    setEli12Loading((prev) => ({ ...prev, [id]: true }));
    setEli12Status((prev) => ({ ...prev, [id]: undefined }));
    setEli12Errors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    try {
      const data = await postExamWithProgress<Eli12Explanation>(
        '/api/exam/eli12',
        {
          question,
          concept,
          correctOrModelAnswer,
          studentAttempt,
          sourceType: source.type,
          notesText: source.type === 'text' ? source.notesText : undefined,
          pdfBase64: source.type === 'pdf' ? source.pdfBase64 : undefined,
        },
        (statusMsg) => setEli12Status((prev) => ({ ...prev, [id]: statusMsg }))
      );

      setEli12Map((prev) => ({ ...prev, [id]: data }));
    } catch (err) {
      setEli12Errors((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : 'Failed to load analogy.',
      }));
    } finally {
      setEli12Loading((prev) => ({ ...prev, [id]: false }));
      setEli12Status((prev) => ({ ...prev, [id]: undefined }));
    }
  };

  const mcqAnsweredCount = exam
    ? exam.mcqs.filter((q) => mcqAnswers[q.id] !== undefined).length
    : 0;
  const mcqCorrectCount = exam
    ? exam.mcqs.filter((q) => mcqAnswers[q.id] === q.correctIndex).length
    : 0;
  const mcqEntries = exam ? exam.mcqs.map((q, idx) => ({ q, idx })) : [];
  const wrongMcqEntries = mcqEntries.filter(
    ({ q }) => mcqAnswers[q.id] !== undefined && mcqAnswers[q.id] !== q.correctIndex
  );
  const visibleMcqEntries = showOnlyWrongMcqs ? wrongMcqEntries : mcqEntries;

  const fillBlanksScore =
    exam && fillBlanksChecked
      ? (exam.fillInBlanks ?? []).filter((q) => {
          const chipId = fillBlankPlacements[q.id];
          if (!chipId) return false;
          const idx = Number(chipId.replace('wb-', ''));
          const placedWord = exam.wordBank?.[idx] ?? '';
          return placedWord.trim().toLowerCase() === q.answer.trim().toLowerCase();
        }).length
      : 0;

  const handlePlaceFillBlankChip = (questionId: string, chipId: string) => {
    if (fillBlanksChecked) return;
    setFillBlankPlacements((prev) => {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (v !== chipId) {
          next[k] = v;
        }
      }
      next[questionId] = chipId;
      return next;
    });
  };

  const handleRemoveFillBlankChip = (questionId: string) => {
    if (fillBlanksChecked) return;
    setFillBlankPlacements((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const handleCheckFillBlanks = () => {
    if (!exam || fillBlanksChecked) return;
    setFillBlanksChecked(true);

    const fillQuestions = exam.fillInBlanks ?? [];
    let runningStreak = comboStreak;
    let sectionBCorrect = 0;

    for (const q of fillQuestions) {
      const chipId = fillBlankPlacements[q.id];
      const idx = chipId ? Number(chipId.replace('wb-', '')) : -1;
      const placedWord = idx >= 0 ? (exam.wordBank?.[idx] ?? '') : '';
      const isRight =
        Boolean(chipId) &&
        placedWord.trim().toLowerCase() === q.answer.trim().toLowerCase();
      if (isRight) {
        sectionBCorrect += 1;
        runningStreak += 1;
      } else {
        runningStreak = 0;
      }
    }
    setComboStreak(runningStreak);

    const sectionBTotal = fillQuestions.length;
    const sectionBPercent =
      sectionBTotal > 0 ? Math.round((sectionBCorrect / sectionBTotal) * 100) : 0;

    const mcqTotal = exam.mcqs.length;
    const structuredTotal = exam.structured.reduce((sum, q) => sum + q.maxMarks, 0);
    const structuredEarned = grading
      ? grading.results.reduce((sum, r) => sum + r.score, 0)
      : 0;
    const overallTotal = mcqTotal + sectionBTotal + structuredTotal;
    const overallEarned = mcqCorrectCount + sectionBCorrect + structuredEarned;
    const overallPercent =
      overallTotal > 0 ? Math.round((overallEarned / overallTotal) * 100) : 0;

    const allSectionsDone = mcqAnsweredCount === mcqTotal && Boolean(grading);
    if (allSectionsDone && overallPercent >= 80 && sectionBPercent < 80) {
      pushMascot(
        `${overallPercent}% overall! Those fill-in-the-blanks sealed the deal!`,
        'hype'
      );
      triggerScoreFeedback({
        sectionLabel: 'Overall Exam Score',
        percentage: overallPercent,
        earned: overallEarned,
        total: overallTotal,
        unitLabel: 'marks total',
        isAce: true,
      });
    } else {
      const isAce = sectionBPercent >= 80 || (allSectionsDone && overallPercent >= 80);
      if (isAce) {
        pushMascot(
          `${sectionBPercent}% on Section B! Key terms memorized like a pro!`,
          'hype'
        );
      } else {
        pushMascot(
          'Good effort on Section B! Check the green terms to lock them in.',
          'neutral'
        );
      }
      triggerScoreFeedback({
        sectionLabel: 'Section B · Fill-in-the-Blanks',
        percentage: sectionBPercent,
        earned: sectionBCorrect,
        total: sectionBTotal,
        unitLabel: 'blanks correct',
        isAce,
      });
    }
  };

  // Boss Battle 60s countdown interval
  useEffect(() => {
    if (!bossBattleEnabled || !bossRunning) return;
    if (bossTimeLeft <= 0) return;

    const timerId = window.setInterval(() => {
      setBossTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [bossBattleEnabled, bossRunning, bossTimeLeft]);

  // Handle Boss Battle reaching 0s
  useEffect(() => {
    if (!bossBattleEnabled || !bossRunning || bossTimeLeft > 0) return;

    setBossRunning(false);
    setBossFinished(true);

    if (mcqCorrectCount > bossPersonalBest) {
      setBossPersonalBest(mcqCorrectCount);
      setBossIsNewRecord(true);
      try {
        localStorage.setItem('examforge-boss-best', String(mcqCorrectCount));
      } catch {
        // Ignore storage failures
      }
      pushMascot(
        `Time's up — ${mcqCorrectCount} correct! New Personal Best!`,
        'hype'
      );
    } else {
      pushMascot(
        `Time's up! You bagged ${mcqCorrectCount} MCQs in 60 seconds!`,
        'neutral'
      );
    }
  }, [bossBattleEnabled, bossRunning, bossTimeLeft, mcqCorrectCount, bossPersonalBest]);

  const handleToggleBossBattle = () => {
    setBossBattleEnabled((prev) => {
      const next = !prev;
      if (next) {
        setBossTimeLeft(60);
        setBossFinished(false);
        setBossIsNewRecord(false);
        if (exam && mcqAnsweredCount === 0) {
          setBossRunning(true);
          pushMascot(
            'Boss Battle activated! 60 seconds on the clock—go!',
            'hype'
          );
        } else {
          setBossRunning(false);
        }
      } else {
        setBossRunning(false);
        setBossFinished(false);
        setBossTimeLeft(60);
      }
      return next;
    });
  };

  const handleStartOrRestartBossBattle = () => {
    setMcqAnswers({});
    setShowOnlyWrongMcqs(false);
    setComboStreak(0);
    setScoreModal(null);
    setBossTimeLeft(60);
    setBossFinished(false);
    setBossIsNewRecord(false);
    setBossRunning(true);
    pushMascot(
      '60s Boss Battle started! Speed-read like a caffeinated owl!',
      'hype'
    );
  };

  // Dynamic Student Rank Title based on overall score across attempted/graded marks
  const structuredEarnedForRank = grading
    ? grading.results.reduce((sum, r) => sum + r.score, 0)
    : 0;
  const structuredTotalForRank = exam
    ? exam.structured.reduce((sum, q) => sum + q.maxMarks, 0)
    : 0;
  const fillTotalForRank = exam ? (exam.fillInBlanks?.length ?? 0) : 0;
  const rankAttemptedMarks =
    mcqAnsweredCount +
    (fillBlanksChecked ? fillTotalForRank : 0) +
    (grading ? structuredTotalForRank : 0);
  const rankEarnedMarks =
    mcqCorrectCount +
    (fillBlanksChecked ? fillBlanksScore : 0) +
    structuredEarnedForRank;
  const rankPercent =
    rankAttemptedMarks > 0
      ? Math.round((rankEarnedMarks / rankAttemptedMarks) * 100)
      : 0;

  const studentRankTitle =
    rankPercent >= 95
      ? 'Grandmaster Ace 👑'
      : rankPercent >= 80
        ? "Dean's List Contender 🏅"
        : rankPercent >= 50
          ? 'Lecture Survivor 📚'
          : 'Cramming Rookie ☕';

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F4EFE6] text-[#2C1E16] dark:bg-[#1E1510] dark:text-[#E8DEC8] transition-colors duration-150">
      <Header
        hasExam={Boolean(exam)}
        isGenerating={isGenerating}
        hasGraded={Boolean(grading) || fillBlanksChecked}
        rankTitle={studentRankTitle}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onNavigate={scrollToSection}
        onPrimaryAction={handleHeaderPrimaryAction}
      />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        {/* Clean Editorial Intro when no exam is generated */}
        {!exam && (
          <section className="max-w-3xl space-y-3">
            <p className="text-xs font-medium text-[#8B5A2B] dark:text-[#C29B61] tracking-wide">
              Active Recall &amp; Lecturer Feedback
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#5C4033] dark:text-[#E8DEC8] [text-wrap:balance]">
              Turn lecture slides and notes into timed-grade mock exams
            </h1>
            <p className="text-base leading-relaxed text-[#665042] dark:text-[#D4C3A3] max-w-2xl">
              Test your retention with instant multiple-choice diagnostics, write structured
              exam answers, and receive line-by-line grading with missing key terms and
              everyday analogies.
            </p>
          </section>
        )}

        {/* 1. Input Section */}
        <StudyInputSection
          source={source}
          difficulty={difficulty}
          bossBattleEnabled={bossBattleEnabled}
          isGenerating={isGenerating}
          statusMessage={generateStatus}
          error={generateError}
          hasExam={Boolean(exam)}
          isCollapsed={isInputCollapsed}
          onToggleCollapse={() => setIsInputCollapsed((prev) => !prev)}
          onSourceChange={setSource}
          onDifficultyChange={setDifficulty}
          onToggleBossBattle={handleToggleBossBattle}
          onGenerate={() => generateExam(false)}
        />

        {/* 2. Mock Exam Interface */}
        {exam && (
          <div ref={examTopRef} className="space-y-10 scroll-mt-24">
            <ExamSummaryBanner
              exam={exam}
              mcqAnsweredCount={mcqAnsweredCount}
              mcqCorrectCount={mcqCorrectCount}
              fillBlanksScore={fillBlanksScore}
              fillBlanksChecked={fillBlanksChecked}
              grading={grading}
              isGeneratingNewSet={isGenerating}
              statusMessage={generateStatus}
              onNewPracticeSet={() => generateExam(true)}
            />

            {/* Section A: Multiple Choice (20 Questions) */}
            <section id="section-a" aria-labelledby="section-a-heading" className="space-y-5 scroll-mt-24">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-[#D8CBB8] dark:border-[#4A3528]">
                <div>
                  <h2
                    id="section-a-heading"
                    className="font-display text-xl sm:text-2xl font-semibold text-[#5C4033] dark:text-[#E8DEC8]"
                  >
                    Section A · Multiple Choice
                  </h2>
                  <p className="mt-1 text-sm text-[#665042] dark:text-[#D4C3A3]">
                    Click an option to reveal instant feedback and explanations.
                  </p>
                </div>

                {/* Live MCQ Score Counter + Combo Streak */}
                <div
                  aria-live="polite"
                  className="inline-flex flex-wrap items-center gap-3 rounded-xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] px-4 py-2.5 text-xs sm:text-sm font-mono tabular-nums self-start sm:self-auto shrink-0"
                >
                  <span className="font-semibold text-[#5C4033] dark:text-[#C29B61]">
                    Score: {mcqCorrectCount} / {exam.mcqs.length}
                  </span>
                  <span aria-hidden="true" className="text-[#BFA98E] dark:text-[#6B503E]">·</span>
                  <span className="text-[#2C1E16] dark:text-[#E8DEC8]">
                    {mcqAnsweredCount} / {exam.mcqs.length} Answered
                  </span>
                  {(comboStreak > 0 || mcqAnsweredCount > 0) && (
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

              {bossBattleEnabled && (
                <BossBattleBar
                  timeLeft={bossTimeLeft}
                  isRunning={bossRunning}
                  hasFinished={bossFinished}
                  correctCount={mcqCorrectCount}
                  answeredCount={mcqAnsweredCount}
                  totalQuestions={exam.mcqs.length}
                  personalBest={bossPersonalBest}
                  isNewRecord={bossIsNewRecord}
                  onStartOrRestart={handleStartOrRestartBossBattle}
                />
              )}

              {visibleMcqEntries.length > 0 ? (
                <div className="space-y-4">
                  {visibleMcqEntries.map(({ q: mcq, idx }) => (
                    <McqCard
                      key={mcq.id}
                      question={mcq}
                      index={idx}
                      total={exam.mcqs.length}
                      selectedOptionIndex={mcqAnswers[mcq.id]}
                      eli12={eli12Map[mcq.id]}
                      isLoadingEli12={Boolean(eli12Loading[mcq.id])}
                      eli12Status={eli12Status[mcq.id]}
                      eli12Error={eli12Errors[mcq.id]}
                      onSelectOption={(optIdx) => handleSelectMcqOption(mcq.id, optIdx)}
                      onRequestEli12={() =>
                        handleRequestEli12({
                          id: mcq.id,
                          question: mcq.question,
                          concept: mcq.concept,
                          correctOrModelAnswer: `${mcq.options[mcq.correctIndex]} — ${mcq.explanation}`,
                          studentAttempt:
                            mcqAnswers[mcq.id] !== undefined
                              ? mcq.options[mcqAnswers[mcq.id]]
                              : undefined,
                        })
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] p-6 text-center space-y-2">
                  <p className="text-sm font-medium text-[#2C1E16] dark:text-[#E8DEC8]">
                    No wrong answers to review yet.
                  </p>
                  <p className="text-xs text-[#665042] dark:text-[#D4C3A3]">
                    {mcqAnsweredCount === 0
                      ? 'Answer questions above, then toggle this filter to review missed concepts.'
                      : `You have answered ${mcqAnsweredCount} question${mcqAnsweredCount === 1 ? '' : 's'} with zero mistakes so far.`}
                  </p>
                </div>
              )}

              {/* Bottom Wrong Answers Filter Toggle */}
              <div className="rounded-xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs sm:text-sm text-[#665042] dark:text-[#D4C3A3]">
                  <span className="font-medium text-[#5C4033] dark:text-[#E8DEC8]">Review Mode</span>
                  <span aria-hidden="true"> · </span>
                  <span className="font-mono tabular-nums">
                    {wrongMcqEntries.length} wrong {wrongMcqEntries.length === 1 ? 'answer' : 'answers'} so far
                  </span>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={showOnlyWrongMcqs}
                  onClick={() => setShowOnlyWrongMcqs((prev) => !prev)}
                  className={`inline-flex items-center justify-center gap-2.5 rounded-lg border px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 min-h-[42px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61] ${
                    showOnlyWrongMcqs
                      ? 'border-[#C57463] dark:border-[#A85B4C] bg-[#F9EBE7] dark:bg-[#3A221D] text-[#7A2E20] dark:text-[#F4DFDA] hover:bg-[#F3D8D1] dark:hover:bg-[#4B2C25]'
                      : 'border-[#D8CBB8] dark:border-[#4A3528] bg-[#F4EFE6] dark:bg-[#1E1510] text-[#2C1E16] dark:text-[#E8DEC8] hover:bg-[#EFE8DC] dark:hover:bg-[#38291E]'
                  }`}
                >
                  <span>{showOnlyWrongMcqs ? 'Showing Only Wrong Answers' : 'Show Only Wrong Answers'}</span>
                  <span className="font-mono tabular-nums text-xs opacity-80">
                    ({wrongMcqEntries.length})
                  </span>
                </button>
              </div>
            </section>

            {/* Section B: 10 Fill-in-the-Blanks with Word Bank */}
            <FillInBlanksSection
              questions={exam.fillInBlanks ?? []}
              wordBank={exam.wordBank ?? []}
              placements={fillBlankPlacements}
              isChecked={fillBlanksChecked}
              onPlaceChip={handlePlaceFillBlankChip}
              onRemoveChip={handleRemoveFillBlankChip}
              onCheckAnswers={handleCheckFillBlanks}
            />

            {/* Section C: Structured / Short-Answer (3 Questions) */}
            <section id="section-c" aria-labelledby="section-c-heading" className="space-y-5 scroll-mt-24">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-3 border-b border-[#D8CBB8] dark:border-[#4A3528]">
                <div>
                  <h2
                    id="section-c-heading"
                    className="font-display text-xl sm:text-2xl font-semibold text-[#5C4033] dark:text-[#E8DEC8]"
                  >
                    Section C · Structured Short Answer
                  </h2>
                  <p className="mt-1 text-sm text-[#665042] dark:text-[#D4C3A3]">
                    Type your responses below, then submit to the AI Lecturer for 5-mark rubric grading.
                  </p>
                </div>
                <p className="text-xs font-mono tabular-nums text-[#665042] dark:text-[#D4C3A3]">
                  {exam.structured.length} questions · 15 marks total
                </p>
              </div>

              <div className="space-y-5">
                {exam.structured.map((sq, idx) => {
                  const gradeForQ = grading?.results.find((r) => r.id === sq.id);
                  return (
                    <StructuredCard
                      key={sq.id}
                      question={sq}
                      index={idx}
                      total={exam.structured.length}
                      answer={structuredAnswers[sq.id] ?? ''}
                      grade={gradeForQ}
                      eli12={eli12Map[sq.id]}
                      isLoadingEli12={Boolean(eli12Loading[sq.id])}
                      eli12Status={eli12Status[sq.id]}
                      eli12Error={eli12Errors[sq.id]}
                      isGrading={isGrading}
                      onAnswerChange={(val) =>
                        setStructuredAnswers((prev) => ({ ...prev, [sq.id]: val }))
                      }
                      onRequestEli12={() =>
                        handleRequestEli12({
                          id: sq.id,
                          question: sq.question,
                          concept: sq.concept,
                          correctOrModelAnswer:
                            gradeForQ?.modelAnswer || 'See lecture material concept.',
                          studentAttempt: structuredAnswers[sq.id],
                        })
                      }
                    />
                  );
                })}
              </div>

              {/* 3. AI Lecturer Grader CTA */}
              <div className="rounded-2xl border border-[#D8CBB8] dark:border-[#4A3528] bg-[#FAF7F2] dark:bg-[#2B1E17] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-display text-base font-semibold text-[#5C4033] dark:text-[#E8DEC8]">
                    {grading ? 'Re-evaluate Updated Answers' : 'Ready for Lecturer Marking?'}
                  </p>
                  <p className="text-sm text-[#665042] dark:text-[#D4C3A3]">
                    Grades each structured answer out of 5 marks, identifies missing key terms, and builds your total score summary.
                  </p>
                  {isGrading && gradeStatus && (
                    <p role="status" className="pt-1 text-xs text-[#8B5A2B] dark:text-[#C29B61]">
                      {gradeStatus}
                    </p>
                  )}
                  {gradeError && (
                    <p role="alert" className="pt-1 text-xs text-[#7A2E20] dark:text-[#E59B8C]">
                      {gradeError}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isGrading}
                  onClick={handleGradeStructured}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5C4033] dark:bg-[#C29B61] px-5 py-3 text-sm font-semibold text-white dark:text-[#1E1510] hover:bg-[#8B5A2B] dark:hover:bg-[#A67B5B] disabled:opacity-60 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A2B] dark:focus-visible:ring-[#C29B61]"
                >
                  {isGrading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Grading Answers...</span>
                    </>
                  ) : (
                    <>
                      <CheckCheck className="h-4 w-4" />
                      <span>Grade My Structured Answers</span>
                    </>
                  )}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>

      <footer className="border-t border-[#D8CBB8] dark:border-[#4A3528] py-6 mt-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#665042] dark:text-[#D4C3A3]">
          <span>ExamForge · Student Practice &amp; Rubric Grading Workspace</span>
          <span>Questions and marking grounded strictly in your uploaded material</span>
        </div>
      </footer>

      <ConfettiBurst burstKey={confettiBurstKey} />
      <ScoreCelebrationModal data={scoreModal} onClose={() => setScoreModal(null)} />
      <StudyMascot reaction={mascotReaction} />
    </div>
  );
}
