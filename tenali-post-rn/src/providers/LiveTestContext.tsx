import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { LiveTest, LiveTestSubmission, Question } from '../models';
import { DataService } from '../services/dataService';

interface LiveTestContextValue {
  liveTests: LiveTest[];
  currentTest: LiveTest | null;
  questions: Question[];
  currentIndex: number;
  selectedAnswers: Record<string, string>;
  remainingSeconds: number;
  isSubmitted: boolean;
  lastSubmission: LiveTestSubmission | null;
  isLoading: boolean;
  errorMessage: string | null;
  currentQuestion: Question | null;
  formattedTimeRemaining: string;
  loadLiveTests: () => Promise<void>;
  startLiveTest: (test: LiveTest) => Promise<boolean>;
  selectOption: (questionId: string, option: string) => void;
  clearOption: (questionId: string) => void;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  submitTest: (studentName: string, phoneNumber: string) => Promise<LiveTestSubmission | null>;
}

const LiveTestContext = createContext<LiveTestContextValue | null>(null);

export const LiveTestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [liveTests, setLiveTests] = useState<LiveTest[]>([]);
  const [currentTest, setCurrentTest] = useState<LiveTest | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<LiveTestSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const currentQuestion =
    questions.length > 0 && currentIndex < questions.length
      ? questions[currentIndex]
      : null;

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const formattedTimeRemaining =
    hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;

  const loadLiveTests = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const list = await DataService.getLiveTests();
      setLiveTests(list);
    } catch (e: any) {
      setErrorMessage(e?.message ?? String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const startLiveTest = async (test: LiveTest) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentTest(test);
    setIsSubmitted(false);
    setLastSubmission(null);
    setSelectedAnswers({});
    setCurrentIndex(0);
    setRemainingSeconds(test.durationMinutes * 60);
    setIsLoading(true);
    try {
      const qs = await DataService.getLiveTestQuestions(test.id);
      setQuestions(qs);
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setIsLoading(false);
      return true;
    } catch (e: any) {
      setErrorMessage(e?.message ?? String(e));
      setIsLoading(false);
      return false;
    }
  };

  const selectOption = (questionId: string, option: string) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const clearOption = (questionId: string) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) setCurrentIndex(index);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
  };

  const previousQuestion = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const submitTest = async (studentName: string, phoneNumber: string) => {
    if (isSubmitted || !currentTest) return null;
    if (timerRef.current) clearInterval(timerRef.current);
    setIsLoading(true);
    try {
      const sub = await DataService.submitLiveTest({
        testId: currentTest.id,
        studentName,
        phoneNumber,
        answers: selectedAnswers,
      });
      setIsSubmitted(true);
      setLastSubmission(sub);
      return sub;
    } catch (e: any) {
      setErrorMessage(e?.message ?? String(e));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LiveTestContext.Provider
      value={{
        liveTests,
        currentTest,
        questions,
        currentIndex,
        selectedAnswers,
        remainingSeconds,
        isSubmitted,
        lastSubmission,
        isLoading,
        errorMessage,
        currentQuestion,
        formattedTimeRemaining,
        loadLiveTests,
        startLiveTest,
        selectOption,
        clearOption,
        goToQuestion,
        nextQuestion,
        previousQuestion,
        submitTest,
      }}
    >
      {children}
    </LiveTestContext.Provider>
  );
};

export const useLiveTest = () => {
  const ctx = useContext(LiveTestContext);
  if (!ctx) throw new Error('useLiveTest must be used inside LiveTestProvider');
  return ctx;
};
