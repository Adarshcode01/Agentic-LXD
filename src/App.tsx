import React, { useState, useEffect } from 'react';
import { Header, UserRole, DesignerTab } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { CourseCatalogView } from './components/CourseCatalogView';
import { AuthoringStudio } from './components/AuthoringStudio';
import { LearnerPortalView } from './components/LearnerPortalView';
import { LearnerManagementView } from './components/LearnerManagementView';
import { AnalyticsView } from './components/AnalyticsView';
import { MultimediaStudioView } from './components/MultimediaStudioView';
import { Course, Learner, LearnerCourseProgress, Certificate, XAPIStatement } from './types/lms';
import { INITIAL_COURSES, INITIAL_LEARNERS, INITIAL_CERTIFICATES } from './data/seedData';
import {
  auth,
  loginWithGoogle,
  loginAnonymously,
  logoutUser,
  saveCourseToFirestore,
  loadCoursesFromFirestore
} from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  // Role & Navigation state
  const [currentRole, setCurrentRole] = useState<UserRole>('designer');
  const [activeDesignerTab, setActiveDesignerTab] = useState<DesignerTab>('dashboard');

  // Core Data Collections
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [learners, setLearners] = useState<Learner[]>(INITIAL_LEARNERS);
  const [certificates, setCertificates] = useState<Certificate[]>(INITIAL_CERTIFICATES);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(INITIAL_COURSES[0]);

  // Stepper override for authoring studio
  const [forceAuthoringStep, setForceAuthoringStep] = useState<number | null>(null);

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Monitor Firebase Auth state & auto authenticate
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const firestoreCourses = await loadCoursesFromFirestore(user.uid);
          if (firestoreCourses && firestoreCourses.length > 0) {
            setCourses(prev => {
              const existingIds = new Set(firestoreCourses.map(c => c.id));
              return [...firestoreCourses, ...prev.filter(c => !existingIds.has(c.id))];
            });
            setCurrentCourse(firestoreCourses[0]);
          }
        } catch (err) {
          console.warn('Could not load Firestore courses on auth change:', err);
        }
      } else {
        // Run in local guest mode when not signed in
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Google sign in error:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Actions from Dashboard / Courses / Studio
  const handleCreateCourse = () => {
    setCurrentRole('designer');
    setActiveDesignerTab('create');
    setForceAuthoringStep(1);
  };

  const handleOpenCourseInStudio = (course: Course) => {
    setCurrentCourse(course);
    setCurrentRole('designer');
    setActiveDesignerTab('create');
    setForceAuthoringStep(4);
  };

  const handlePreviewCourseAsLearner = (course: Course) => {
    setCurrentCourse(course);
    setCurrentRole('learner');
  };

  const handleCourseUpdated = async (updatedCourse: Course) => {
    setCurrentCourse(updatedCourse);
    setCourses(prev => {
      const idx = prev.findIndex(c => c.id === updatedCourse.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedCourse;
        return copy;
      }
      return [updatedCourse, ...prev];
    });

    if (currentUser?.uid) {
      await saveCourseToFirestore(updatedCourse, currentUser.uid);
    }
  };

  const handlePublishCourse = async (courseId: string) => {
    const target = courses.find(c => c.id === courseId);
    if (!target) return;

    const published: Course = {
      ...target,
      publishStatus: 'published',
      publishedAt: new Date().toISOString(),
      approvalStatus: 'approved',
      approvedVersion: target.approvedVersion || 'v1.0'
    };

    await handleCourseUpdated(published);
    alert(`"${published.title}" has been successfully published to your LMS!`);
  };

  const handleAssignCourseToLearners = (courseId: string, learnerIds: string[], dueDate?: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    setLearners(prev => prev.map(learner => {
      if (learnerIds.includes(learner.id)) {
        const alreadyAssigned = learner.assignedCourses.some(ac => ac.courseId === courseId);
        if (alreadyAssigned) return learner;

        const newAssignment: LearnerCourseProgress = {
          courseId: course.id,
          courseTitle: course.title,
          status: 'not_started',
          progressPercent: 0,
          completedScreensCount: 0,
          totalScreensCount: course.chapters.reduce((acc, ch) => acc + ch.screens.length, 0) || 4,
          timeSpentMinutes: 0,
          lastActivityDate: new Date().toISOString(),
          currentChapterIdx: 0,
          currentScreenIdx: 0
        };

        return {
          ...learner,
          assignedCourses: [newAssignment, ...learner.assignedCourses]
        };
      }
      return learner;
    }));

    // Update course enrollment count
    setCourses(prev => prev.map(c => {
      if (c.id === courseId) {
        return { ...c, enrollmentCount: (c.enrollmentCount || 0) + learnerIds.length };
      }
      return c;
    }));

    alert(`Course successfully assigned to ${learnerIds.length} learner(s)!`);
  };

  const handleCourseProgressUpdated = (progress: LearnerCourseProgress) => {
    setLearners(prev => prev.map(learner => {
      if (learner.id === INITIAL_LEARNERS[0].id) {
        const existingIdx = learner.assignedCourses.findIndex(ac => ac.courseId === progress.courseId);
        let updatedList = [...learner.assignedCourses];
        if (existingIdx >= 0) {
          updatedList[existingIdx] = progress;
        } else {
          updatedList.push(progress);
        }

        const completedCount = updatedList.filter(c => c.status === 'completed').length;
        const scoredItems = updatedList.filter(c => c.score !== undefined && c.score > 0);
        const avg = scoredItems.length > 0
          ? Math.round(scoredItems.reduce((acc, c) => acc + (c.score || 0), 0) / scoredItems.length)
          : learner.avgScore;

        return {
          ...learner,
          assignedCourses: updatedList,
          completedCoursesCount: completedCount,
          avgScore: avg
        };
      }
      return learner;
    }));
  };

  const handleCertificateIssued = (cert: Certificate) => {
    setCertificates(prev => [cert, ...prev]);
  };

  const handleImproveCourseWithAi = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    // Simulate AI adding an extra interactive scenario to Chapter 2
    const updatedChapters = course.chapters.map((ch, idx) => {
      if (idx === 1) {
        return {
          ...ch,
          screens: [
            ...ch.screens,
            {
              id: `sc-ai-remediation-${Date.now()}`,
              chapterId: ch.id,
              screenNumber: ch.screens.length + 1,
              title: 'Practical Scenario: TRID 3-Day Rule in Practice',
              kicker: 'AI Recommended Remediation',
              interactionType: 'scenario' as const,
              bodyText: 'A borrower asks to expedite closing by signing the Closing Disclosure only 1 business day before consummation because their moving truck is booked.',
              sourceExcerpt: 'TRID mandates a minimum 3 business day review period before consummation without waiver exceptions.',
              aiInstructionalNote: 'Remediation scenario generated to resolve the 42% question failure rate identified in analytics.',
              isLocked: false,
              isEdited: true,
              interactionData: {
                scenarioBranch: {
                  context: 'What compliant action should the loan processor take?',
                  choices: [
                    {
                      id: 'c1',
                      choiceText: 'Grant an exception to maintain client satisfaction.',
                      consequence: 'Severe CFPB compliance violation! TRID cooling-off periods cannot be waived for convenience.',
                      isOptimal: false
                    },
                    {
                      id: 'c2',
                      choiceText: 'Explain the mandatory federal TRID 3-day timeline clearly and adjust the closing date accordingly.',
                      consequence: 'Correct! Adhering to the 3-day window protects both borrower and lender.',
                      isOptimal: true
                    }
                  ]
                }
              }
            }
          ]
        };
      }
      return ch;
    });

    const improvedCourse: Course = {
      ...course,
      chapters: updatedChapters
    };

    handleCourseUpdated(improvedCourse);
  };

  // Select active learner profile for learner portal
  const activeLearnerProfile = learners[0] || INITIAL_LEARNERS[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Universal Simplified Header */}
      <Header
        currentRole={currentRole}
        onChangeRole={setCurrentRole}
        activeDesignerTab={activeDesignerTab}
        onSelectDesignerTab={setActiveDesignerTab}
        currentUser={currentUser}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-8">
        {/* ======================================================== */}
        {/* INSTRUCTIONAL DESIGNER & ADMIN EXPERIENCE */}
        {/* ======================================================== */}
        {currentRole === 'designer' && (
          <>
            {activeDesignerTab === 'dashboard' && (
              <DashboardView
                courses={courses}
                learners={learners}
                onCreateCourse={handleCreateCourse}
                onOpenCourse={handleOpenCourseInStudio}
                onPreviewCourse={handlePreviewCourseAsLearner}
                onNavigateToTab={setActiveDesignerTab}
              />
            )}

            {activeDesignerTab === 'courses' && (
              <CourseCatalogView
                courses={courses}
                learners={learners}
                onCreateCourse={handleCreateCourse}
                onOpenCourse={handleOpenCourseInStudio}
                onPreviewCourse={handlePreviewCourseAsLearner}
                onPublishCourse={handlePublishCourse}
                onAssignCourse={(c) => {
                  handleAssignCourseToLearners(c.id, [INITIAL_LEARNERS[0].id, INITIAL_LEARNERS[1].id]);
                }}
              />
            )}

            {activeDesignerTab === 'create' && (
              <AuthoringStudio
                currentCourse={currentCourse}
                onCourseUpdated={handleCourseUpdated}
                onXapiEmitted={() => {}}
                forceStep={forceAuthoringStep}
                onClearForceStep={() => setForceAuthoringStep(null)}
                onPublishToLms={(c) => handlePublishCourse(c.id)}
                onViewInLearnerPortal={handlePreviewCourseAsLearner}
              />
            )}

            {activeDesignerTab === 'learners' && (
              <LearnerManagementView
                learners={learners}
                courses={courses}
                onAssignCourseToLearners={handleAssignCourseToLearners}
              />
            )}

            {activeDesignerTab === 'analytics' && (
              <AnalyticsView
                courses={courses}
                learners={learners}
                onImproveCourseWithAi={handleImproveCourseWithAi}
                onRefreshTelemetry={() => {}}
                onNavigateToStudio={(courseId) => {
                  const targetCourse = courses.find(c => c.id === courseId);
                  if (targetCourse) {
                    handleOpenCourseInStudio(targetCourse);
                  }
                }}
              />
            )}

            {activeDesignerTab === 'ai_studio' && (
              <MultimediaStudioView />
            )}
          </>
        )}

        {/* ======================================================== */}
        {/* LEARNER PORTAL EXPERIENCE */}
        {/* ======================================================== */}
        {currentRole === 'learner' && (
          <LearnerPortalView
            currentLearner={activeLearnerProfile}
            courses={courses}
            onCourseProgressUpdated={handleCourseProgressUpdated}
            onCertificateIssued={handleCertificateIssued}
            onXapiEmitted={() => {}}
          />
        )}
      </main>

      {/* Clean, Quiet Prose Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-slate-700">AI-Powered E-Learning Platform</span>
            <span>·</span>
            <span>Create · Design · Review · Approve · Publish · Distribute · Learn · Track · Analyse · Improve</span>
          </div>
          <div>
            Built with Gemini AI & Google Cloud
          </div>
        </div>
      </footer>
    </div>
  );
}
