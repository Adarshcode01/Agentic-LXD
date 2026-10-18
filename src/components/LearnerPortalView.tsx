import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Play,
  Award,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Check,
  X,
  FileCheck,
  Download,
  MessageSquare,
  HelpCircle,
  Eye,
  ShieldCheck,
  ListOrdered,
  ChevronRight,
  Layers,
  ChevronDown
} from 'lucide-react';
import { Course, CourseChapter, CourseScreen, Learner, LearnerCourseProgress, Certificate } from '../types/lms';
import { RolePlayTutorView } from './RolePlayTutorView';

interface LearnerPortalViewProps {
  currentLearner: Learner;
  courses: Course[];
  onCourseProgressUpdated: (progress: LearnerCourseProgress) => void;
  onCertificateIssued: (cert: Certificate) => void;
  onXapiEmitted: (statement: any) => void;
}

export const LearnerPortalView: React.FC<LearnerPortalViewProps> = ({
  currentLearner,
  courses,
  onCourseProgressUpdated,
  onCertificateIssued,
  onXapiEmitted
}) => {
  const [activeTab, setActiveTab] = useState<'assigned' | 'in_progress' | 'completed' | 'roleplay' | 'certificates'>('assigned');
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  
  // Player state
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
  const [currentScreenIdx, setCurrentScreenIdx] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [isViewingCertificate, setIsViewingCertificate] = useState<Certificate | null>(null);
  
  // Mobile smartphone player state
  const [showMobileOutline, setShowMobileOutline] = useState<boolean>(false);
  const [selectedScenarioChoice, setSelectedScenarioChoice] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  // Active playing course
  const activeCourse = courses.find(c => c.id === activeCourseId);

  // Filter learner assigned courses
  const assignedList = currentLearner.assignedCourses;
  const inProgressList = assignedList.filter(c => c.status === 'in_progress');
  const completedList = assignedList.filter(c => c.status === 'completed');

  // Handle launching a course
  const handleLaunchCourse = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    setActiveCourseId(courseId);
    const existing = currentLearner.assignedCourses.find(c => c.courseId === courseId);
    if (existing) {
      setCurrentChapterIdx(existing.currentChapterIdx || 0);
      setCurrentScreenIdx(existing.currentScreenIdx || 0);
    } else {
      setCurrentChapterIdx(0);
      setCurrentScreenIdx(0);
    }
    setQuizSubmitted(false);
    setQuizAnswers({});
    setSelectedScenarioChoice(null);
    setFlippedCards({});
    setShowMobileOutline(false);

    onXapiEmitted({
      id: `xapi-launch-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: { mbox: currentLearner.email, name: currentLearner.name },
      verb: { id: 'http://adlnet.gov/expapi/verbs/launched', display: { 'en-US': 'launched' } },
      object: { id: course.id, definition: { name: { 'en-US': course.title }, type: 'http://adlnet.gov/expapi/activities/course' } }
    });
  };

  // Handle navigating screens in player
  const handleNextScreen = () => {
    if (!activeCourse) return;
    const currentChapter = activeCourse.chapters[currentChapterIdx];
    if (!currentChapter) return;

    setSelectedScenarioChoice(null);
    setFlippedCards({});

    if (currentScreenIdx < currentChapter.screens.length - 1) {
      const nextScreen = currentScreenIdx + 1;
      setCurrentScreenIdx(nextScreen);
      updateProgress(currentChapterIdx, nextScreen, false);
    } else if (currentChapterIdx < activeCourse.chapters.length - 1) {
      const nextChapter = currentChapterIdx + 1;
      setCurrentChapterIdx(nextChapter);
      setCurrentScreenIdx(0);
      updateProgress(nextChapter, 0, false);
    } else {
      // Reached end of chapters -> Go to Quiz / Assessment
      updateProgress(currentChapterIdx, currentScreenIdx, false);
    }

    // Scroll window to top on mobile for fresh screen view
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevScreen = () => {
    setSelectedScenarioChoice(null);
    setFlippedCards({});

    if (currentScreenIdx > 0) {
      setCurrentScreenIdx(prev => prev - 1);
    } else if (currentChapterIdx > 0) {
      const prevChapter = currentChapterIdx - 1;
      setCurrentChapterIdx(prevChapter);
      const prevChapterScreens = activeCourse?.chapters[prevChapter]?.screens?.length || 1;
      setCurrentScreenIdx(prevChapterScreens - 1);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateProgress = (chIdx: number, scIdx: number, markCompleted: boolean, score?: number) => {
    if (!activeCourse) return;
    const totalScreens = activeCourse.chapters.reduce((acc, c) => acc + c.screens.length, 0);
    let completedScreens = 0;
    for (let c = 0; c < chIdx; c++) {
      completedScreens += activeCourse.chapters[c].screens.length;
    }
    completedScreens += (scIdx + 1);

    const progressPct = markCompleted ? 100 : Math.min(99, Math.round((completedScreens / Math.max(1, totalScreens)) * 100));

    const updated: LearnerCourseProgress = {
      courseId: activeCourse.id,
      courseTitle: activeCourse.title,
      status: markCompleted ? 'completed' : 'in_progress',
      progressPercent: progressPct,
      completedScreensCount: completedScreens,
      totalScreensCount: totalScreens,
      score: score !== undefined ? score : (markCompleted ? 88 : undefined),
      passed: markCompleted ? (score ? score >= 75 : true) : undefined,
      timeSpentMinutes: 14,
      lastActivityDate: new Date().toISOString(),
      completedAt: markCompleted ? new Date().toISOString() : undefined,
      currentChapterIdx: chIdx,
      currentScreenIdx: scIdx
    };

    onCourseProgressUpdated(updated);
  };

  const handleSubmitQuiz = () => {
    if (!activeCourse || !activeCourse.quiz || activeCourse.quiz.length === 0) return;
    setQuizSubmitted(true);

    let correctCount = 0;
    activeCourse.quiz.forEach((q, idx) => {
      if (quizAnswers[q.id || `q-${idx}`] === q.correctAnswerIndex) {
        correctCount++;
      }
    });

    const finalScore = Math.round((correctCount / activeCourse.quiz.length) * 100);
    const passed = finalScore >= 75;

    updateProgress(currentChapterIdx, currentScreenIdx, passed, finalScore);

    if (passed) {
      const cert: Certificate = {
        id: `CERT-${Date.now().toString().slice(-4)}`,
        learnerId: currentLearner.id,
        learnerName: currentLearner.name,
        courseId: activeCourse.id,
        courseTitle: activeCourse.title,
        completionDate: new Date().toISOString().split('T')[0],
        score: finalScore,
        verificationCode: `VRF-${Math.floor(1000 + Math.random() * 9000)}-${new Date().getFullYear()}`
      };
      onCertificateIssued(cert);
      setIsViewingCertificate(cert);
    }
  };

  // ==========================================
  // If actively playing a course: Interactive Player
  // ==========================================
  if (activeCourse) {
    const currentChapter = activeCourse.chapters[currentChapterIdx] || activeCourse.chapters[0];
    const currentScreen = currentChapter?.screens[currentScreenIdx];
    const totalScreensInCourse = activeCourse.chapters.reduce((acc, c) => acc + c.screens.length, 0);
    const isLastScreenInAllChapters = currentChapterIdx === activeCourse.chapters.length - 1 &&
      currentScreenIdx === (currentChapter?.screens?.length || 1) - 1;

    // Calculate overall course progress percentage for the linear bar
    let completedScreensCount = 0;
    for (let c = 0; c < currentChapterIdx; c++) {
      completedScreensCount += activeCourse.chapters[c].screens.length;
    }
    completedScreensCount += (currentScreenIdx + 1);
    const overallProgressPercent = Math.min(100, Math.round((completedScreensCount / Math.max(1, totalScreensInCourse)) * 100));

    return (
      <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-xs relative">
        {/* Player Header - Optimized with touch-friendly hitboxes */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setActiveCourseId(null)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0 active:scale-95"
              title="Return to My Learning"
              aria-label="Back to My Learning"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-blue-400 truncate tracking-wide">
                {activeCourse.title}
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                {currentChapter?.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 text-xs">
            {/* Outline Button trigger for Mobile */}
            <button
              onClick={() => setShowMobileOutline(true)}
              className="lg:hidden min-h-[40px] px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-700 text-slate-200 rounded-lg font-medium flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors"
              aria-label="Open Course Outline"
            >
              <ListOrdered className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] font-mono">{currentScreen?.screenNumber || currentScreenIdx + 1}/{currentChapter?.screens.length || 1}</span>
            </button>

            {/* Desktop Screen counter */}
            <span className="hidden lg:inline text-slate-400 text-xs font-mono">
              Screen {currentScreen?.screenNumber || currentScreenIdx + 1} of {currentChapter?.screens.length || 1}
            </span>

            <button
              onClick={() => setActiveCourseId(null)}
              className="hidden sm:inline-flex px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer transition-colors"
            >
              Exit
            </button>
          </div>
        </div>

        {/* Linear Progress Bar running under the header */}
        <div className="w-full bg-slate-800/90 h-1.5 overflow-hidden">
          <div
            className="bg-blue-500 h-full transition-all duration-300 ease-out"
            style={{ width: `${overallProgressPercent}%` }}
          />
        </div>

        {/* Player Layout: Desktop Sidebar + Main Learning Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[580px]">
          {/* Desktop-only Chapter & Screen Navigation Sidebar */}
          <div className="hidden lg:block border-r border-slate-200 bg-slate-50/50 p-4 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center justify-between">
              <span>Course Outline</span>
              <span className="font-mono text-[10px] text-slate-500">{overallProgressPercent}% Complete</span>
            </div>
            <div className="space-y-3">
              {activeCourse.chapters.map((ch, chIdx) => (
                <div key={ch.id} className="space-y-1">
                  <div className="text-xs font-semibold text-slate-700 px-2 py-1 flex items-center justify-between">
                    <span className="truncate">{ch.title}</span>
                    {chIdx < currentChapterIdx && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <div className="space-y-0.5 pl-2">
                    {ch.screens.map((sc, scIdx) => {
                      const isCurrent = chIdx === currentChapterIdx && scIdx === currentScreenIdx;
                      const isPast = chIdx < currentChapterIdx || (chIdx === currentChapterIdx && scIdx < currentScreenIdx);
                      return (
                        <button
                          key={sc.id}
                          onClick={() => {
                            setCurrentChapterIdx(chIdx);
                            setCurrentScreenIdx(scIdx);
                            setSelectedScenarioChoice(null);
                            setFlippedCards({});
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isCurrent
                              ? 'bg-blue-600 text-white font-semibold shadow-xs'
                              : isPast
                              ? 'text-slate-700 hover:bg-slate-200/60 font-medium'
                              : 'text-slate-400 hover:bg-slate-200/40'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-4 text-center font-mono text-[11px] opacity-75">{sc.screenNumber}</span>
                            <span className="truncate">{sc.title}</span>
                          </div>
                          {sc.kicker?.includes('Remediation') && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-bold uppercase bg-amber-200/80 text-amber-900 shrink-0">
                              AI
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Assessment Section Item */}
              {activeCourse.quiz && activeCourse.quiz.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <div className="text-xs font-bold text-slate-700 px-2 py-1 flex items-center justify-between">
                    <span>Final Assessment</span>
                    {quizSubmitted && <Award className="w-3.5 h-3.5 text-amber-500" />}
                  </div>
                  <div className="text-[11px] text-slate-500 px-2">
                    {activeCourse.quiz.length} Knowledge Check Questions
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Learning Content Stage - Responsive with generous mobile thumb clearance */}
          <div className="lg:col-span-3 p-4 sm:p-6 lg:p-8 pb-28 lg:pb-8 flex flex-col justify-between">
            {currentScreen ? (
              <div className="space-y-5 max-w-3xl">
                {/* Screen Kicker & Title */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {currentScreen.kicker && (
                      <span className="text-[11px] font-bold tracking-wider text-blue-600 uppercase">
                        {currentScreen.kicker}
                      </span>
                    )}
                    {currentScreen.kicker?.includes('Remediation') && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>AI Telemetry Remediation</span>
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
                    {currentScreen.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed">
                    {currentScreen.bodyText}
                  </p>
                </div>

                {/* Mobile-Optimized Interactive Widgets */}
                {/* 1. Comparison Cards (Stacked cleanly on mobile, side-by-side on tablet/desktop) */}
                {currentScreen.interactionType === 'comparison' && currentScreen.interactionData.comparisonItems && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-4">
                    {currentScreen.interactionData.comparisonItems.map((item, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
                        <div className="text-xs font-bold text-slate-800">{item.criteria}</div>
                        <div className="text-xs text-slate-700 p-3 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                          <strong className="text-blue-700 block mb-1">Option A:</strong>
                          {item.optionA}
                        </div>
                        <div className="text-xs text-slate-700 p-3 bg-emerald-50/50 rounded-lg border border-emerald-200/80 shadow-2xs">
                          <strong className="text-emerald-800 block mb-1">Option B:</strong>
                          {item.optionB}
                        </div>
                        {item.recommendation && (
                          <div className="text-[11px] text-slate-500 italic mt-1 bg-white p-2 rounded border border-slate-100">
                            <strong>Note:</strong> {item.recommendation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Interactive Flip Cards (Touch-friendly flip toggle on smartphones) */}
                {currentScreen.interactionType === 'flip_card' && currentScreen.interactionData.flipCards && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
                    {currentScreen.interactionData.flipCards.map((card, idx) => {
                      const isFlipped = !!flippedCards[idx];
                      return (
                        <div
                          key={idx}
                          onClick={() => setFlippedCards(prev => ({ ...prev, [idx]: !prev[idx] }))}
                          className={`p-4 sm:p-5 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.98] ${
                            isFlipped
                              ? 'bg-blue-50/80 border-blue-300 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-2">
                            <span>{card.category || 'Concept'}</span>
                            <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              {isFlipped ? 'Tap to close' : 'Tap to reveal'}
                            </span>
                          </div>
                          
                          <div className="text-sm font-bold text-slate-900">{card.front}</div>
                          
                          {isFlipped ? (
                            <div className="mt-2.5 pt-2.5 border-t border-blue-200/80 text-xs text-slate-700 leading-relaxed animate-in fade-in duration-200">
                              {card.back}
                            </div>
                          ) : (
                            <div className="mt-2 text-2xs text-slate-400 italic">
                              Tap card to reveal definition & workplace application...
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. Process Flow (Vertical clear sequence with 44px+ tap hitboxes) */}
                {currentScreen.interactionType === 'process_flow' && currentScreen.interactionData.processSteps && (
                  <div className="space-y-3 mt-4">
                    {currentScreen.interactionData.processSteps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-3.5 p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-2xs">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                          {step.stepNumber}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-bold text-slate-900">{step.title}</div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{step.description}</p>
                          {step.statusHint && (
                            <span className="inline-block mt-2 text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {step.statusHint}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. Scenario Decision (Touch-friendly decision cards with instant feedback) */}
                {currentScreen.interactionType === 'scenario' && currentScreen.interactionData.scenarioBranch && (
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/80 via-indigo-50/30 to-white border border-blue-200 rounded-xl space-y-3.5 mt-4 shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider bg-blue-100/70 px-2 py-0.5 rounded-full">
                        Workplace Scenario Challenge
                      </span>
                    </div>
                    
                    <p className="text-xs sm:text-sm font-medium text-slate-900 leading-relaxed">
                      {currentScreen.interactionData.scenarioBranch.context}
                    </p>

                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] font-semibold text-slate-600">Choose your response:</div>
                      {currentScreen.interactionData.scenarioBranch.choices.map((choice) => {
                        const isChosen = selectedScenarioChoice === choice.id;
                        return (
                          <button
                            key={choice.id}
                            onClick={() => setSelectedScenarioChoice(choice.id)}
                            className={`w-full text-left p-3.5 rounded-xl border text-xs leading-relaxed min-h-[48px] transition-all cursor-pointer active:scale-[0.99] flex flex-col justify-center ${
                              isChosen
                                ? choice.isOptimal
                                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs'
                                  : 'bg-rose-50 border-rose-400 text-rose-950 shadow-xs'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold">{choice.choiceText}</span>
                              {isChosen && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                                  choice.isOptimal ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                                }`}>
                                  {choice.isOptimal ? 'Optimal' : 'Risk'}
                                </span>
                              )}
                            </div>

                            {isChosen && (
                              <div className="mt-2 pt-2 border-t border-current/20 text-[11px] opacity-95">
                                <strong>Consequence:</strong> {choice.consequence}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Source Verification Citation */}
                {currentScreen.sourceExcerpt && (
                  <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-slate-500">
                      <strong>Policy Benchmark:</strong> "{currentScreen.sourceExcerpt}"
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Select a screen from the course outline to begin learning.</p>
              </div>
            )}

            {/* Assessment Section if on last screen */}
            {isLastScreenInAllChapters && activeCourse.quiz && activeCourse.quiz.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-200 max-w-3xl space-y-4">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">Knowledge Check & Final Assessment</h3>
                </div>

                <div className="space-y-4">
                  {activeCourse.quiz.map((q, qIdx) => (
                    <div key={q.id || qIdx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="text-xs sm:text-sm font-semibold text-slate-800">
                        {qIdx + 1}. {q.question}
                      </div>

                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = quizAnswers[q.id || `q-${qIdx}`] === optIdx;
                          const isCorrect = q.correctAnswerIndex === optIdx;
                          return (
                            <button
                              key={optIdx}
                              onClick={() => {
                                if (quizSubmitted) return;
                                setQuizAnswers(prev => ({ ...prev, [q.id || `q-${qIdx}`]: optIdx }));
                              }}
                              className={`w-full text-left p-3 rounded-xl text-xs transition-colors flex items-center justify-between min-h-[46px] cursor-pointer active:scale-[0.99] ${
                                quizSubmitted
                                  ? isCorrect
                                    ? 'bg-emerald-100 border border-emerald-300 text-emerald-900 font-semibold'
                                    : isSelected
                                    ? 'bg-rose-100 border border-rose-300 text-rose-900'
                                    : 'bg-white border border-slate-200 text-slate-500'
                                  : isSelected
                                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                  : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'
                              }`}
                            >
                              <span>{opt}</span>
                              {quizSubmitted && isCorrect && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                              {quizSubmitted && isSelected && !isCorrect && <X className="w-4 h-4 text-rose-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted && (
                        <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  {!quizSubmitted ? (
                    <button
                      onClick={handleSubmitQuiz}
                      className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs cursor-pointer min-h-[48px] transition-colors"
                    >
                      Submit Assessment & Complete Course
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Assessment Submitted Successfully!</span>
                      </span>
                      <button
                        onClick={() => {
                          setQuizSubmitted(false);
                          setQuizAnswers({});
                        }}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer p-1"
                      >
                        Retake Assessment
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Desktop In-Page Bottom Controls Bar */}
            <div className="hidden lg:flex pt-6 border-t border-slate-200 mt-8 items-center justify-between">
              <button
                onClick={handlePrevScreen}
                disabled={currentChapterIdx === 0 && currentScreenIdx === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous Screen</span>
              </button>

              <button
                onClick={handleNextScreen}
                disabled={isLastScreenInAllChapters}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                <span>{isLastScreenInAllChapters ? 'Proceed to Assessment' : 'Next Screen'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Smartphone Sticky Bottom Bar (Natural Thumb Zone) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-2.5 sm:p-3 px-4 shadow-lg flex items-center justify-between gap-2.5">
          <button
            onClick={handlePrevScreen}
            disabled={currentChapterIdx === 0 && currentScreenIdx === 0}
            className="flex-1 min-h-[46px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl active:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer shadow-2xs"
            aria-label="Previous Screen"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            onClick={() => setShowMobileOutline(true)}
            className="min-h-[46px] min-w-[46px] px-3 flex items-center justify-center rounded-xl bg-slate-100 text-slate-700 border border-slate-200 active:bg-slate-200 transition-colors cursor-pointer shrink-0"
            title="Course Outline"
            aria-label="Open Course Outline Drawer"
          >
            <ListOrdered className="w-4 h-4 text-blue-600" />
          </button>

          <button
            onClick={handleNextScreen}
            disabled={isLastScreenInAllChapters}
            className="flex-1 min-h-[46px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl active:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer shadow-sm"
            aria-label={isLastScreenInAllChapters ? 'Proceed to Assessment' : 'Next Screen'}
          >
            <span>{isLastScreenInAllChapters ? 'Assessment' : 'Next'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Slide-Up Bottom Sheet: Course Outline */}
        {showMobileOutline && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-in fade-in duration-150">
            <div
              className="fixed inset-0"
              onClick={() => setShowMobileOutline(false)}
            />
            <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-200">
              {/* Drawer Grab Handle */}
              <div className="pt-3 pb-1">
                <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto" />
              </div>

              {/* Drawer Header */}
              <div className="p-4 px-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Course Outline</h3>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {overallProgressPercent}% Complete · {completedScreensCount} of {totalScreensInCourse} screens
                  </div>
                </div>
                <button
                  onClick={() => setShowMobileOutline(false)}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center p-1 text-slate-400 hover:text-slate-700 active:bg-slate-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Chapters List */}
              <div className="p-4 overflow-y-auto space-y-4 flex-1">
                {activeCourse.chapters.map((ch, chIdx) => (
                  <div key={ch.id} className="space-y-1.5">
                    <div className="text-xs font-bold text-slate-800 px-2 py-1 bg-slate-50 rounded-lg flex items-center justify-between">
                      <span className="truncate">{ch.title}</span>
                      {chIdx < currentChapterIdx && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <div className="space-y-1 pl-1">
                      {ch.screens.map((sc, scIdx) => {
                        const isCurrent = chIdx === currentChapterIdx && scIdx === currentScreenIdx;
                        const isPast = chIdx < currentChapterIdx || (chIdx === currentChapterIdx && scIdx < currentScreenIdx);
                        return (
                          <button
                            key={sc.id}
                            onClick={() => {
                              setCurrentChapterIdx(chIdx);
                              setCurrentScreenIdx(scIdx);
                              setSelectedScenarioChoice(null);
                              setFlippedCards({});
                              setShowMobileOutline(false);
                            }}
                            className={`w-full text-left p-3 rounded-xl text-xs flex items-center justify-between min-h-[46px] cursor-pointer transition-colors ${
                              isCurrent
                                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                : isPast
                                ? 'text-slate-800 bg-slate-50 font-medium'
                                : 'text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <span className="w-5 text-center font-mono text-[11px] opacity-75">{sc.screenNumber}</span>
                              <span className="truncate">{sc.title}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {sc.kicker?.includes('Remediation') && (
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                  isCurrent ? 'bg-white text-blue-900' : 'bg-amber-100 text-amber-900'
                                }`}>
                                  AI
                                </span>
                              )}
                              {isPast && !isCurrent && (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Quiz Section in Drawer */}
                {activeCourse.quiz && activeCourse.quiz.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <button
                      onClick={() => {
                        setCurrentChapterIdx(activeCourse.chapters.length - 1);
                        setCurrentScreenIdx((activeCourse.chapters[activeCourse.chapters.length - 1]?.screens?.length || 1) - 1);
                        setShowMobileOutline(false);
                      }}
                      className="w-full text-left p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs flex items-center justify-between min-h-[46px]"
                    >
                      <div className="flex items-center gap-2 font-bold text-amber-950">
                        <Award className="w-4 h-4 text-amber-600" />
                        <span>Final Assessment ({activeCourse.quiz.length} Questions)</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-amber-600" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Certificate Modal - Fully Responsive on Mobile */}
        {isViewingCertificate && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 sm:p-8 shadow-2xl border-4 border-amber-400 text-center space-y-4">
              <Award className="w-14 sm:w-16 h-14 sm:h-16 text-amber-500 mx-auto animate-bounce" />
              <div className="text-[11px] font-bold uppercase tracking-widest text-amber-600">
                Official Certification of Completion
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">{isViewingCertificate.learnerName}</h2>
              <p className="text-xs text-slate-500">has successfully mastered and completed the certified program</p>
              <div className="p-3 bg-slate-50 rounded-xl font-bold text-xs sm:text-sm text-blue-900">
                {isViewingCertificate.courseTitle}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="block text-slate-400 text-[10px] uppercase font-bold">Score</span>
                  <span className="font-extrabold text-emerald-600 text-base">{isViewingCertificate.score}%</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="block text-slate-400 text-[10px] uppercase font-bold">Date Issued</span>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">{isViewingCertificate.completionDate}</span>
                </div>
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate">
                Certificate ID: {isViewingCertificate.verificationCode}
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                <button
                  onClick={() => setIsViewingCertificate(null)}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Certificate</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // Default Learner Dashboard: "My Learning"
  // ==========================================
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Learner Welcome Header - Responsive Mobile Grid */}
      <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-xs">
            {currentLearner.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight truncate">
              Welcome back, {currentLearner.name.split(' ')[0]}!
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {currentLearner.role} · {currentLearner.department}
            </p>
          </div>
        </div>

        {/* Mobile KPI Micro-Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-6 bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border border-slate-100 sm:border-0 text-center">
          <div className="p-1 sm:p-0">
            <div className="text-base sm:text-lg font-extrabold text-slate-900 tabular-nums">{assignedList.length}</div>
            <div className="text-[10px] sm:text-[11px] font-medium text-slate-500">Assigned</div>
          </div>
          <div className="p-1 sm:p-0 border-x border-slate-200 sm:border-0">
            <div className="text-base sm:text-lg font-extrabold text-emerald-600 tabular-nums">{completedList.length}</div>
            <div className="text-[10px] sm:text-[11px] font-medium text-slate-500">Completed</div>
          </div>
          <div className="p-1 sm:p-0">
            <div className="text-base sm:text-lg font-extrabold text-blue-600 tabular-nums">{currentLearner.avgScore}%</div>
            <div className="text-[10px] sm:text-[11px] font-medium text-slate-500">Avg Score</div>
          </div>
        </div>
      </div>

      {/* Horizontal Swipeable Segmented Tabs on Mobile */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs font-semibold text-slate-600 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('assigned')}
          className={`min-h-[40px] px-3.5 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-all ${
            activeTab === 'assigned'
              ? 'bg-blue-600 text-white font-bold shadow-xs'
              : 'hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          All Assigned ({assignedList.length})
        </button>

        <button
          onClick={() => setActiveTab('in_progress')}
          className={`min-h-[40px] px-3.5 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-all ${
            activeTab === 'in_progress'
              ? 'bg-blue-600 text-white font-bold shadow-xs'
              : 'hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          In Progress ({inProgressList.length})
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`min-h-[40px] px-3.5 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-all ${
            activeTab === 'completed'
              ? 'bg-blue-600 text-white font-bold shadow-xs'
              : 'hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Completed ({completedList.length})
        </button>

        <button
          onClick={() => setActiveTab('roleplay')}
          className={`min-h-[40px] px-3.5 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
            activeTab === 'roleplay'
              ? 'bg-purple-600 text-white font-bold shadow-xs'
              : 'text-purple-700 hover:bg-purple-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Simulation</span>
        </button>
      </div>

      {/* Tab Content: Course Cards */}
      {activeTab !== 'roleplay' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {(activeTab === 'assigned' ? assignedList : activeTab === 'in_progress' ? inProgressList : completedList).map((item) => {
            const course = courses.find(c => c.id === item.courseId);
            return (
              <div
                key={item.courseId}
                className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2.5">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                      item.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : item.status === 'in_progress'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {item.status === 'completed' ? 'Completed' : item.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                    </span>
                    <span className="text-slate-500 flex items-center gap-1 text-[11px] font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {course?.estimatedTimeMinutes || 20}m
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 line-clamp-1">{item.courseTitle}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {course?.description || 'Interactive training curriculum designed for certified workforce.'}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">Progress</span>
                      <span className="font-bold text-slate-900 tabular-nums">{item.progressPercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${item.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {item.score !== undefined && item.score > 0 && (
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-600 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="font-medium">Assessment Score:</span>
                      <span className="font-extrabold text-emerald-700 tabular-nums">{item.score}%</span>
                    </div>
                  )}
                </div>

                <div className="pt-3.5 border-t border-slate-100 mt-4">
                  <button
                    onClick={() => handleLaunchCourse(item.courseId)}
                    className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {item.status === 'completed' ? 'Review Course' : item.status === 'in_progress' ? 'Continue Learning' : 'Start Course'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}

          {assignedList.length === 0 && (
            <div className="col-span-1 md:col-span-3 text-center py-12 sm:py-16 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800">No courses currently assigned</h3>
              <p className="text-xs text-slate-500 mt-1">Your instructor or manager will assign modules shortly.</p>
            </div>
          )}
        </div>
      ) : (
        /* AI Scenario Simulation Integration */
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">AI Customer Role-Play Simulator</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Practice real borrower inquiries, difficult conversations, and compliance guidelines with instant AI coaching.
            </p>
          </div>
          <RolePlayTutorView
            onXapiEmitted={onXapiEmitted}
            onNavigateToTelemetry={() => {}}
          />
        </div>
      )}
    </div>
  );
};
