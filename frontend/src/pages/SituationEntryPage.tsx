import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, formatApiError } from '../api/client';
import {
  BehaviouralAnswer,
  BehaviouralQuestion,
  QuestionsResponse,
  ReflectionSession,
} from '../types';
import { BrainToMapTransition } from '../components/common/BrainToMapTransition';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Send,
  Info,
  AlertCircle,
  HelpCircle,
  Check,
  Mic,
  MicOff,
} from 'lucide-react';

// Web Speech API interfaces for browser speech recognition
export interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message?: string;
}

export interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | undefined => {
  if (typeof window === 'undefined') return undefined;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
};

const DEMO_SITUATION =
  "My manager asked me to take on an urgent project with an immediate deadline, but my schedule is already committed to quarterly team deliverables. I want to say yes to maintain rapport, but I am worried about compromising delivery quality.";

const DEMO_CONTEXT =
  "Maintaining a reputation for reliable delivery without burnout is important to me.";

const FALLBACK_QUESTIONS: BehaviouralQuestion[] = [
  {
    id: 'q1',
    theme: 'Immediate Focus & Trigger',
    question:
      'Looking back at this moment, what aspect felt most prominent in shaping your immediate reaction?',
    options: [
      'The compressed deadline or urgency',
      'How the request was communicated without checking bandwidth',
      'Conflict with my existing commitments and delivery quality',
      'None of these / Something else',
    ],
    placeholder:
      'e.g. The sudden expectation to absorb urgent work without discussing tradeoffs...',
  },
  {
    id: 'q2',
    theme: 'Influencing Factors',
    question:
      'Might any personal or situational factors (such as workload, fatigue, stakes, or pacing) have influenced your capacity in that moment?',
    options: [
      'Heavy ongoing workload and high delivery expectations',
      'Pressure to maintain rapport and appear dependable',
      'Fatigue or lack of buffer time to think clearly',
      'None of these / I felt rested and composed',
    ],
    placeholder:
      'e.g. High delivery pressure and lack of buffer time...',
  },
  {
    id: 'q3',
    theme: 'Prior Response Patterns',
    question:
      'When faced with similar priority conflicts or requests in the past, how have you typically tended to respond?',
    options: [
      'Saying yes quickly to maintain harmony, then feeling overloaded',
      'Delaying or agonizing over my response before deciding',
      'Pushing back firmly right away',
      'It varies depending on the person / None of these',
    ],
    placeholder:
      'e.g. I tend to agree immediately out of habit, then struggle later...',
  },
];

export const SituationEntryPage: React.FC = () => {
  const navigate = useNavigate();

  // Journey steps: 'situation' | 'questions'
  const [step, setStep] = useState<'situation' | 'questions'>('situation');

  // Step 0: Situation & Context
  const [situation, setSituation] = useState('');
  const [optionalContext, setOptionalContext] = useState('');
  const [showOptionalContext, setShowOptionalContext] = useState(false);

  // Speech-to-text dictation state
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const baseTextBeforeSpeechRef = useRef<string>('');
  const isMountedRef = useRef(true);

  // Step 1-3: Behavioural Questions
  const [questions, setQuestions] = useState<BehaviouralQuestion[]>(FALLBACK_QUESTIONS);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({
    q1: '',
    q2: '',
    q3: '',
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(
    'Examining situation with Gemini reflection engine and structuring the network...'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clean up speech recognition when component unmounts
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const handleStartRecording = () => {
    const SpeechRecognitionClass = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionClass) {
      setSpeechError(
        'Speech recognition is not supported in this browser. Please type your situation directly or use Chrome, Edge, or Safari.'
      );
      return;
    }

    setSpeechError(null);
    const baseText = situation.trim();
    baseTextBeforeSpeechRef.current = baseText;

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = typeof navigator !== 'undefined' ? (navigator.language || 'en-US') : 'en-US';
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        if (!isMountedRef.current) return;
        setIsRecording(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (!isMountedRef.current) return;

        let sessionFinal = '';
        let sessionInterim = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (res.isFinal) {
            sessionFinal += (sessionFinal ? ' ' : '') + text.trim();
          } else {
            sessionInterim += (sessionInterim ? ' ' : '') + text.trim();
          }
        }

        const sessionText = (
          sessionFinal
            ? sessionFinal + (sessionInterim ? ' ' + sessionInterim : '')
            : sessionInterim
        ).trim();

        if (!sessionText) return;

        const prefix = baseTextBeforeSpeechRef.current;
        const combined = prefix ? `${prefix} ${sessionText}` : sessionText;
        setSituation(combined.slice(0, 4000));
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (!isMountedRef.current) return;
        setIsRecording(false);
        recognitionRef.current = null;

        if (event.error === 'not-allowed') {
          setSpeechError(
            'Microphone access was denied. Please allow microphone permissions in your browser.'
          );
        } else if (event.error === 'no-speech') {
          setSpeechError('No speech was detected. Please try speaking into your microphone again.');
        } else if (event.error === 'audio-capture') {
          setSpeechError('No microphone could be found. Please check your audio input settings.');
        } else if (event.error === 'network') {
          setSpeechError('Speech recognition network error. Please check your internet connection.');
        } else if (event.error === 'service-not-allowed') {
          setSpeechError(
            'Speech recognition service is not permitted by your browser or platform settings.'
          );
        } else if (event.error !== 'aborted') {
          setSpeechError(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        if (!isMountedRef.current) return;
        setIsRecording(false);
        recognitionRef.current = null;
      };

      recognition.start();
    } catch (err: any) {
      setIsRecording(false);
      recognitionRef.current = null;
      setSpeechError(
        err?.message || 'Unable to start speech recognition. Please type your situation.'
      );
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  const handleLoadDemoScenario = () => {
    if (isRecording) {
      handleStopRecording();
    }
    setSituation(DEMO_SITUATION);
    setOptionalContext(DEMO_CONTEXT);
    setShowOptionalContext(true);
  };

  // Step 0 Submit -> Generate Questions & Proceed to Question 1
  const handleProceedToQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRecording) {
      handleStopRecording();
    }
    if (!situation.trim() || situation.trim().length < 10 || isLoading) return;

    setIsLoading(true);
    setLoadingMessage('Generating tailored reflective questions for your situation...');
    setErrorMessage(null);

    try {
      const res = await apiClient.post<QuestionsResponse>('/reflections/questions', {
        situation: situation.trim(),
        context: optionalContext.trim() || undefined,
      });

      if (res.data && res.data.questions && res.data.questions.length === 3) {
        setQuestions(res.data.questions);
      } else {
        setQuestions(FALLBACK_QUESTIONS);
      }
      setCurrentQuestionIndex(0);
      setStep('questions');
    } catch (err: any) {
      // If questions endpoint fails, fallback cleanly to standard tailored questions
      // so user journey is never blocked
      console.warn('Questions endpoint failed; using fallback questions:', err);
      setQuestions(FALLBACK_QUESTIONS);
      setCurrentQuestionIndex(0);
      setStep('questions');
    } finally {
      setIsLoading(false);
    }
  };

  // Select a suggestion pill
  const handleSelectOptionPill = (questionId: string, optionText: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionText,
    }));
  };

  // Step questions navigation
  const handleNextQuestion = () => {
    const currentQ = questions[currentQuestionIndex];
    const currentAnswer = answers[currentQ?.id || ''] || '';
    if (!currentAnswer.trim()) return;

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    } else {
      setStep('situation');
    }
  };

  // Final Submit (after question 3) -> Call /reflections/analyze
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentQ = questions[currentQuestionIndex];
    const currentAnswer = answers[currentQ?.id || ''] || '';
    if (!currentAnswer.trim() || isLoading) return;

    setIsLoading(true);
    setLoadingMessage('Synthesizing your situation and behavioural context into the reflection map...');
    setErrorMessage(null);

    const behavioural_answers: BehaviouralAnswer[] = questions.map((q) => ({
      question_id: q.id,
      theme: q.theme,
      question: q.question,
      answer: (answers[q.id] || '').trim(),
    }));

    try {
      const res = await apiClient.post<ReflectionSession>('/reflections/analyze', {
        situation: situation.trim(),
        context: optionalContext.trim() || undefined,
        behavioural_answers,
      });

      navigate(`/reflections/${res.data.id}`);
    } catch (err: any) {
      setErrorMessage(formatApiError(err));
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6">
        <div className="paper-card p-8 sm:p-12 max-w-lg w-full bg-white text-center shadow-md">
          <BrainToMapTransition statusMessage={loadingMessage} />
        </div>
      </div>
    );
  }

  // STEP 1: Describe Situation
  if (step === 'situation') {
    return (
      <div className="flex-1 py-10 px-4 sm:px-6 max-w-3xl mx-auto w-full space-y-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs text-charcoal-500 hover:text-charcoal-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </button>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium bg-sage-100 text-sage-800">
            <span>Step 1 of 2: The Situation</span>
          </div>
          <h2 className="font-serif text-3xl font-medium text-charcoal-900">
            Describe the Situation
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
            What is currently happening? Write what occurred or what is causing hesitation in your own words.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong>Analysis Error:</strong>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="paper-card p-6 sm:p-8 bg-white shadow-sm space-y-6">
          <form onSubmit={handleProceedToQuestions} className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <label htmlFor="situation-textarea" className="text-xs font-medium text-charcoal-800">
                    The Situation <span className="text-charcoal-400 font-normal">(required)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleToggleRecording}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-all shadow-xs ${
                      isRecording
                        ? 'bg-red-50 text-red-800 border border-red-300 hover:bg-red-100 ring-2 ring-red-200'
                        : 'bg-paper-100 hover:bg-paper-200 text-charcoal-700 hover:text-charcoal-900 border border-paper-300'
                    }`}
                    title={isRecording ? 'Click to stop voice dictation' : 'Dictate your situation using your microphone'}
                    aria-label={isRecording ? 'Stop voice dictation' : 'Dictate situation with microphone'}
                  >
                    {isRecording ? (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <MicOff className="w-3.5 h-3.5 text-red-600" />
                        <span className="font-medium text-red-900">Listening... (Click to stop)</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-sage-800" />
                        <span>Dictate</span>
                      </>
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleLoadDemoScenario}
                  className="text-[11px] text-sage-700 hover:text-sage-900 flex items-center gap-1 underline underline-offset-2"
                  title="Fill realistic workplace workload scenario for live demonstration"
                >
                  <Sparkles className="w-3 h-3" />
                  Fill Demo Scenario: Workload & Priorities
                </button>
              </div>

              {speechError && (
                <div
                  role="alert"
                  className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>{speechError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpeechError(null)}
                    className="text-amber-700 hover:text-amber-900 text-[11px] font-medium"
                    aria-label="Dismiss speech recognition error"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <textarea
                id="situation-textarea"
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                placeholder="e.g. My manager assigned an urgent project while my calendar is completely packed..."
                rows={5}
                required
                minLength={10}
                maxLength={4000}
                disabled={isLoading}
                className="w-full p-3.5 text-sm rounded-lg border border-paper-300 bg-paper-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sage-700 focus:border-sage-700 leading-relaxed transition-colors disabled:opacity-60"
              />
              <div className="flex justify-between text-[11px] text-charcoal-400">
                <span>Minimum 10 characters</span>
                <span>{situation.length} / 4000</span>
              </div>
            </div>

            {/* Optional context toggle */}
            <div className="pt-2">
              {!showOptionalContext ? (
                <button
                  type="button"
                  onClick={() => setShowOptionalContext(true)}
                  className="text-xs text-charcoal-500 hover:text-charcoal-800 flex items-center gap-1.5"
                >
                  <span>+ Add optional personal context</span>
                  <span className="text-[10px] text-charcoal-400">(e.g. priority or relationship detail)</span>
                </button>
              ) : (
                <div className="space-y-2 p-4 rounded-lg bg-paper-100/60 border border-paper-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-charcoal-700 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-sage-700" />
                      Optional Context
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowOptionalContext(false)}
                      className="text-[11px] text-charcoal-400 hover:text-charcoal-600"
                    >
                      Hide
                    </button>
                  </div>
                  <textarea
                    value={optionalContext}
                    onChange={(e) => setOptionalContext(e.target.value)}
                    placeholder="e.g. Protecting my professional reputation is a key concern for me..."
                    rows={2}
                    maxLength={1000}
                    disabled={isLoading}
                    className="w-full p-2.5 text-xs rounded border border-paper-300 bg-white focus:outline-none focus:ring-1 focus:ring-sage-700"
                  />
                </div>
              )}
            </div>

            {/* Notice */}
            <div className="p-3 rounded-lg bg-paper-100/50 border border-paper-200 text-[11px] text-charcoal-500 leading-normal">
              <strong>Privacy & AI Disclosure:</strong> Your text is processed with Google Gemini structured reflection prompts to map facts, tentative hypotheses, and unknowns. It will not be permanently stored in user history unless you explicitly click "Save reflection".
            </div>

            <button
              type="submit"
              disabled={isLoading || situation.trim().length < 10}
              className="w-full py-3 px-5 rounded-xl bg-charcoal-900 text-paper-50 text-sm font-medium hover:bg-charcoal-800 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Continue to Reflection Questions</span>
              <ArrowRight className="w-4 h-4 text-sage-300" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // STEP 2: Three Behavioural Questions (presented one at a time)
  const currentQ = questions[currentQuestionIndex] || questions[0];
  const currentAnswer = answers[currentQ.id] || '';
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 max-w-3xl mx-auto w-full space-y-6">
      {/* Top Navigation */}
      <button
        onClick={handlePrevQuestion}
        className="inline-flex items-center gap-1.5 text-xs text-charcoal-500 hover:text-charcoal-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {currentQuestionIndex === 0 ? 'Back to Situation' : 'Previous Question'}
      </button>

      {/* Progress & Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-charcoal-600">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium bg-sage-100 text-sage-800">
            <span>Step 2 of 2: Behavioural Context</span>
            <span>•</span>
            <span>Question {currentQuestionIndex + 1} of 3</span>
          </div>
          <span className="text-[11px] text-charcoal-400">
            {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% complete
          </span>
        </div>

        {/* 3-segment progress bar */}
        <div className="w-full grid grid-cols-3 gap-2">
          {questions.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx <= currentQuestionIndex ? 'bg-sage-600' : 'bg-paper-200'
              }`}
            />
          ))}
        </div>

        <h2 className="font-serif text-2xl sm:text-3xl font-medium text-charcoal-900">
          Reflective Behavioural Check
        </h2>
        <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
          Exploring your reaction, personal tendencies, and influencing factors helps map the situation with greater clarity and depth.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong>Error:</strong>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Main Question Card */}
      <div className="paper-card p-6 sm:p-8 bg-white shadow-sm space-y-6">
        <form
          onSubmit={isLastQuestion ? handleFinalSubmit : (e) => { e.preventDefault(); handleNextQuestion(); }}
          className="space-y-6"
        >
          {/* Question Theme & Prompt */}
          <div className="space-y-3 border-b border-paper-200 pb-4">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-sage-700 bg-sage-50 px-2.5 py-1 rounded border border-sage-200/60 inline-block">
              {currentQ.theme}
            </span>
            <h3 className="font-serif text-xl sm:text-2xl text-charcoal-900 leading-snug">
              {currentQ.question}
            </h3>
          </div>

          {/* Quick-Select Suggestion Options */}
          {currentQ.options && currentQ.options.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-charcoal-700 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-sage-600" />
                <span>Quick suggestions (select or write your own below):</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {currentQ.options.map((option, idx) => {
                  const isSelected = currentAnswer === option;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectOptionPill(currentQ.id, option)}
                      className={`text-xs text-left px-3.5 py-2 rounded-lg border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-sage-100 text-sage-900 border-sage-400 font-medium shadow-xs'
                          : 'bg-paper-50 hover:bg-paper-100 text-charcoal-700 border-paper-200'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-sage-700 shrink-0" />}
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Answer Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-charcoal-800">
                Your Answer <span className="text-charcoal-400 font-normal">(editable)</span>
              </label>
              <span className="text-[11px] text-charcoal-400">
                {currentAnswer.length} / 2000
              </span>
            </div>
            <textarea
              value={currentAnswer}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [currentQ.id]: e.target.value,
                }))
              }
              placeholder={currentQ.placeholder || 'Type your reflection in your own words...'}
              rows={4}
              required
              maxLength={2000}
              disabled={isLoading}
              className="w-full p-3.5 text-sm rounded-lg border border-paper-300 bg-paper-50/40 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sage-700 focus:border-sage-700 leading-relaxed transition-colors"
            />
          </div>

          {/* Epistemic Safety Notice */}
          <div className="p-3 rounded-lg bg-paper-100/60 border border-paper-200 text-[11px] text-charcoal-500 leading-relaxed">
            <strong>Reflective Context:</strong> Your response is retained strictly as user-reported context to enrich your reflection map. ONE PAUSE will never use this to diagnose you or assign fixed personality labels.
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handlePrevQuestion}
              className="px-4 py-2.5 rounded-lg border border-paper-300 bg-white hover:bg-paper-100 text-charcoal-700 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{currentQuestionIndex === 0 ? 'Back to Situation' : 'Previous'}</span>
            </button>

            {isLastQuestion ? (
              <button
                type="submit"
                disabled={isLoading || !currentAnswer.trim()}
                className="py-3 px-6 rounded-xl bg-charcoal-900 text-paper-50 text-sm font-medium hover:bg-charcoal-800 disabled:opacity-40 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Send className="w-4 h-4 text-sage-300" />
                <span>Generate Reflection Map</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextQuestion}
                disabled={!currentAnswer.trim()}
                className="py-2.5 px-5 rounded-xl bg-charcoal-900 text-paper-50 text-xs font-medium hover:bg-charcoal-800 disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>Next Question</span>
                <ArrowRight className="w-3.5 h-3.5 text-sage-300" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
