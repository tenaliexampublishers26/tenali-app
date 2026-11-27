import React, { createContext, useContext, useState } from 'react';
import { Chapter, Exam, Question } from '../models';
import { DataService } from '../services/dataService';

interface McqContextValue {
  exams: Exam[];
  chapters: Chapter[];
  questions: Question[];
  selectedExam: Exam | null;
  selectedChapter: Chapter | null;
  selectedLanguage: string;
  currentIndex: number;
  isLoading: boolean;
  errorMessage: string | null;
  currentQuestion: Question | null;
  selectedOptionForCurrent: string | undefined;
  isCurrentLocked: boolean;
  correctAnswersCount: number;
  wrongAnswersCount: number;
  userAnswers: Record<number, string>;
  loadExams: () => Promise<void>;
  selectExam: (exam: Exam) => Promise<void>;
  selectChapterAndLanguage: (chapter: Chapter, languageCode: string) => Promise<void>;
  setLanguage: (langCode: string) => void;
  chooseOption: (option: string) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  goToQuestion: (index: number) => void;
  resetPractice: () => void;
}

const McqContext = createContext<McqContextValue | null>(null);

export const McqProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [answerLocked, setAnswerLocked] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentQuestion =
    questions.length > 0 && currentIndex < questions.length
      ? questions[currentIndex]
      : null;
  const selectedOptionForCurrent = userAnswers[currentIndex];
  const isCurrentLocked = answerLocked[currentIndex] ?? false;

  const correctAnswersCount = questions.reduce((acc, q, idx) => {
    if (
      userAnswers[idx] &&
      userAnswers[idx].toUpperCase() === q.correctOption?.toUpperCase()
    ) {
      return acc + 1;
    }
    return acc;
  }, 0);

  const wrongAnswersCount = questions.reduce((acc, q, idx) => {
    if (
      userAnswers[idx] &&
      userAnswers[idx].toUpperCase() !== q.correctOption?.toUpperCase()
    ) {
      return acc + 1;
    }
    return acc;
  }, 0);

  const loadExams = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const list = await DataService.getExams();
      setExams(list);
    } catch (e: any) {
      setErrorMessage(e?.message ?? String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const selectExam = async (exam: Exam) => {
    setSelectedExam(exam);
    setChapters([]);
    setIsLoading(true);
    try {
      const list = await DataService.getChapters(exam.id);
      setChapters(list);
    } catch (e: any) {
      setErrorMessage(e?.message ?? String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const selectChapterAndLanguage = async (chapter: Chapter, languageCode: string) => {
    setSelectedChapter(chapter);
    setSelectedLanguage(languageCode);
    setCurrentIndex(0);
    setUserAnswers({});
    setAnswerLocked({});
    setIsLoading(true);
    try {
      const qs = await DataService.getPracticeQuestions(chapter.id, languageCode);
      setQuestions(qs);
    } catch (e: any) {
      setErrorMessage(e?.message ?? String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const setLanguage = (langCode: string) => {
    if (selectedLanguage !== langCode) {
      setSelectedLanguage(langCode);
      if (selectedChapter) {
        selectChapterAndLanguage(selectedChapter, langCode);
      }
    }
  };

  const chooseOption = (option: string) => {
    if (answerLocked[currentIndex]) return;
    setUserAnswers((prev) => ({ ...prev, [currentIndex]: option }));
    setAnswerLocked((prev) => ({ ...prev, [currentIndex]: true }));
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
  };

  const previousQuestion = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) setCurrentIndex(index);
  };

  const resetPractice = () => {
    setCurrentIndex(0);
    setUserAnswers({});
    setAnswerLocked({});
  };

  return (
    <McqContext.Provider
      value={{
        exams,
        chapters,
        questions,
        selectedExam,
        selectedChapter,
        selectedLanguage,
        currentIndex,
        isLoading,
        errorMessage,
        currentQuestion,
        selectedOptionForCurrent,
        isCurrentLocked,
        correctAnswersCount,
        wrongAnswersCount,
        userAnswers,
        loadExams,
        selectExam,
        selectChapterAndLanguage,
        setLanguage,
        chooseOption,
        nextQuestion,
        previousQuestion,
        goToQuestion,
        resetPractice,
      }}
    >
      {children}
    </McqContext.Provider>
  );
};

export const useMcq = () => {
  const ctx = useContext(McqContext);
  if (!ctx) throw new Error('useMcq must be used inside McqProvider');
  return ctx;
};
