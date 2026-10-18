export type ScreenInteractionType =
  | 'process_flow'
  | 'flip_card'
  | 'timeline'
  | 'comparison'
  | 'scenario'
  | 'policy_quiz'
  | 'conversation'
  | 'summary';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  competency: string;
}

export interface ContentAnalysis {
  mainTopic: string;
  targetAudience: string;
  learningObjectives: string[];
  coreConcepts: {
    term: string;
    definition: string;
    sourceQuote: string;
  }[];
  processes: {
    title: string;
    steps: string[];
  }[];
  warnings: string[];
  keyTakeaways: string[];
  assessmentPoints: string[];
}

export interface CourseScreen {
  id: string;
  chapterId: string;
  screenNumber: number;
  title: string;
  kicker?: string;
  interactionType: ScreenInteractionType;
  bodyText: string;
  sourceExcerpt: string; // Original text from source document
  aiInstructionalNote: string; // Why AI structured it this way
  isLocked: boolean; // Locked by designer against AI overwrite
  isEdited: boolean; // Manually edited by designer
  interactionData: {
    processSteps?: {
      stepNumber: number;
      title: string;
      description: string;
      statusHint?: string;
    }[];
    flipCards?: {
      front: string;
      back: string;
      category?: string;
    }[];
    timelineMilestones?: {
      timeOrPhase: string;
      label: string;
      details: string;
    }[];
    comparisonItems?: {
      criteria: string;
      optionA: string;
      optionB: string;
      recommendation?: string;
    }[];
    scenarioBranch?: {
      context: string;
      choices: {
        id: string;
        choiceText: string;
        consequence: string;
        isOptimal: boolean;
      }[];
    };
    policyWarning?: {
      warning: string;
      rule: string;
    };
    quizInline?: QuizQuestion;
    characterDialogue?: {
      speaker: string;
      role: 'client' | 'agent';
      message: string;
    }[];
    summaryTakeaways?: string[];
  };
}

export interface CourseChapter {
  id: string;
  title: string;
  description: string;
  screens: CourseScreen[];
}

export interface BrandTheme {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  estimatedTimeMinutes: number;
  sourceRawText?: string;
  analysis?: ContentAnalysis;
  brandTheme: BrandTheme;
  chapters: CourseChapter[];
  quiz: QuizQuestion[];
  approvalStatus: 'draft' | 'approved';
  approvedVersion?: string;
  approvedAt?: string;
  approvedBy?: string;
  publishStatus?: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  enrollmentCount?: number;
  completionRate?: number;
  averageScore?: number;
  targetAudience?: string;
  // Legacy flat fields for SCORM runtime compatibility
  learningObjectives: string[];
  sections: {
    id: string;
    title: string;
    content: string;
    takeaways: string[];
    scenarioSnippet: string;
  }[];
}

export interface LearnerCourseProgress {
  courseId: string;
  courseTitle: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progressPercent: number;
  completedScreensCount: number;
  totalScreensCount: number;
  score?: number;
  passed?: boolean;
  timeSpentMinutes: number;
  lastActivityDate: string;
  completedAt?: string;
  certificateId?: string;
  currentChapterIdx: number;
  currentScreenIdx: number;
}

export interface Learner {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatarUrl?: string;
  assignedCourses: LearnerCourseProgress[];
  completedCoursesCount: number;
  avgScore: number;
  weakAreas: string[];
}

export interface Certificate {
  id: string;
  learnerId: string;
  learnerName: string;
  courseId: string;
  courseTitle: string;
  completionDate: string;
  score: number;
  verificationCode: string;
}

export interface XAPIStatement {
  id: string;
  timestamp: string;
  actor: {
    mbox: string;
    name: string;
  };
  verb: {
    id: string;
    display: Record<string, string>;
  };
  object: {
    id: string;
    definition: {
      name: Record<string, string>;
      type: string;
      description?: Record<string, string>;
    };
  };
  result?: {
    score?: {
      scaled: number;
      raw: number;
      min: number;
      max: number;
    };
    success?: boolean;
    completion?: boolean;
    response?: string;
    duration?: string;
  };
  context?: {
    platform?: string;
    scenarioId?: string;
    instructor?: string;
    competencies?: string[];
  };
}

export interface RolePlayMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  score?: number;
  deEscalationRating?: 'poor' | 'satisfactory' | 'mastery';
  coachingTip?: string;
  rubricBreakdown?: {
    empathy: number;
    clarity: number;
    problemSolving: number;
    professionalTone: number;
  };
}

export interface RemediationModule {
  id: string;
  traineeEmail: string;
  traineeName: string;
  sourceStatementId: string;
  originalScore: number;
  failingCompetency: string;
  createdAt: string;
  status: 'pending_review' | 'completed';
  remedialContent: {
    title: string;
    readDuration: string;
    coreConcept: string;
    concreteCorrection: string;
    keyTakeaway: string;
    selfCheckQuestion: {
      question: string;
      options: string[];
      correctAnswerIndex: number;
      explanation: string;
    };
  };
}

export interface SystemTelemetryState {
  bigQuery: {
    dataset: string;
    table: string;
    rowCount: number;
    recentStatements: { statement: XAPIStatement }[];
  };
  firestore: {
    remediationModules: RemediationModule[];
    courses: Course[];
  };
  alwaysFreeMetrics: {
    cloudRunRequests: number;
    cloudRunMonthlyLimit: number;
    geminiRpmUsed: number;
    geminiRpmLimit: number;
    bigQueryStorageBytes: number;
    bigQueryMonthlyStorageLimitBytes: number;
    firestoreStorageBytes: number;
    firestoreMonthlyLimitBytes: number;
  };
}
