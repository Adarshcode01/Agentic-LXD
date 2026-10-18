import { Course, Learner, Certificate } from '../types/lms';

export const INITIAL_COURSES: Course[] = [
  {
    id: 'mortgage-underwriting-101',
    title: 'Home Loan Basics & Underwriting Mastery',
    description: 'Interactive certification module for loan officers and processors covering loan types, borrower eligibility, verification workflows, and customer scenarios.',
    estimatedTimeMinutes: 20,
    targetAudience: 'Mortgage Loan Officers, Underwriters, and Processors',
    approvalStatus: 'approved',
    approvedVersion: 'v1.0',
    approvedAt: '2026-09-30T10:00:00Z',
    approvedBy: 'Lead Instructional Designer',
    publishStatus: 'published',
    publishedAt: '2026-09-30T10:30:00Z',
    enrollmentCount: 42,
    completionRate: 74,
    averageScore: 86,
    brandTheme: {
      id: 'finance-blue',
      name: 'Financial Trust',
      primaryColor: '#0F52BA',
      accentColor: '#D4AF37',
      fontFamily: 'Plus Jakarta Sans'
    },
    learningObjectives: [
      'Differentiate between Fixed-Rate, Adjustable-Rate, and FHA Government Home Loans',
      'Verify applicant eligibility metrics including Debt-to-Income (DTI) and LTV ratios',
      'Collect and validate mandatory KYC and tax documentation within federal compliance windows',
      'Navigate customer loan scenarios and handle credit score edge cases with empathy'
    ],
    sections: [
      {
        id: 'sec-1',
        title: 'Types of Home Loans',
        content: 'Structural differences between Fixed-Rate, ARM, and FHA loans.',
        takeaways: ['Fixed-rate ensures predictable amortization', 'FHA allows 3.5% down'],
        scenarioSnippet: 'Evaluating a first-time homebuyer with low down payment.'
      },
      {
        id: 'sec-2',
        title: 'Borrower Eligibility & Ratios',
        content: 'Step-by-step DTI and LTV calculation benchmarks.',
        takeaways: ['Back-end DTI cap is 43%', 'LTV > 80% mandates PMI'],
        scenarioSnippet: 'Assessing a self-employed borrower with $8,400 monthly income.'
      }
    ],
    chapters: [
      {
        id: 'ch-1',
        title: 'Chapter 1: Types of Home Loans',
        description: 'Explore the structural differences, rate terms, and risk profiles of primary loan vehicles.',
        screens: [
          {
            id: 'sc-1-1',
            chapterId: 'ch-1',
            screenNumber: 1,
            title: 'Comparing Loan Products: Fixed vs. ARM vs. FHA',
            kicker: 'Loan Foundations',
            interactionType: 'comparison',
            bodyText: 'Choosing the right mortgage structure depends heavily on the borrower\'s investment horizon, risk tolerance, and down payment capacity. Underwriters must guide clients toward sustainable financing.',
            sourceExcerpt: 'Fixed-rate mortgages offer predictable amortizing schedules, while ARMs offer lower entry rates that adjust periodically.',
            aiInstructionalNote: 'Comparison card layout chosen to let loan officers contrast rate stability against initial payment savings.',
            isLocked: false,
            isEdited: false,
            interactionData: {
              comparisonItems: [
                {
                  criteria: 'Interest Rate Behavior',
                  optionA: 'Fixed for the entire 15 or 30 year term; zero payment volatility.',
                  optionB: 'Initial fixed rate for 5/7/10 years, then resets annually based on SOFR index.',
                  recommendation: 'Fixed is ideal for long-term homeowners.'
                },
                {
                  criteria: 'Down Payment Requirements',
                  optionA: 'Conventional typically 5%–20% (PMI required if under 20%).',
                  optionB: 'FHA government-backed loans allow as low as 3.5% down payment.',
                  recommendation: 'FHA offers low entry barriers.'
                },
                {
                  criteria: 'Credit Score Thresholds',
                  optionA: 'Conventional typically requires 620+ FICO benchmark.',
                  optionB: 'FHA permits scores down to 580 with 3.5% down, or 500 with 10% down.'
                }
              ]
            }
          },
          {
            id: 'sc-1-2',
            chapterId: 'ch-1',
            screenNumber: 2,
            title: 'Key Terms & Industry Concepts',
            kicker: 'Vocabulary & Definitions',
            interactionType: 'flip_card',
            bodyText: 'Familiarize yourself with foundational underwriting terminology before proceeding to eligibility calculations.',
            sourceExcerpt: 'DTI, LTV, and TRID define the three pillars of risk assessment.',
            aiInstructionalNote: 'Interactive flip cards encourage active recall for critical regulatory definitions.',
            isLocked: false,
            isEdited: false,
            interactionData: {
              flipCards: [
                {
                  front: 'Debt-to-Income (DTI)',
                  back: 'The percentage of gross monthly income allocated to recurring debt obligations. Max 43% for QM loans.',
                  category: 'Ratio'
                },
                {
                  front: 'Loan-to-Value (LTV)',
                  back: 'Ratio of mortgage balance to appraised property value. LTV > 80% mandates Private Mortgage Insurance (PMI).',
                  category: 'Risk'
                },
                {
                  front: 'TRID 3-Day Rule',
                  back: 'Federal rule requiring the Closing Disclosure (CD) to be received at least 3 business days before closing.',
                  category: 'Compliance'
                }
              ]
            }
          }
        ]
      },
      {
        id: 'ch-2',
        title: 'Chapter 2: Underwriting Pipeline & Verification',
        description: 'Master the 4-stage pipeline from pre-qualification to final closing disclosure.',
        screens: [
          {
            id: 'sc-2-1',
            chapterId: 'ch-2',
            screenNumber: 1,
            title: '4-Stage Loan Approval Process',
            kicker: 'Workflow Execution',
            interactionType: 'process_flow',
            bodyText: 'Every conforming residential loan traverses four regulated stages to ensure federal compliance and risk minimization.',
            sourceExcerpt: 'The underwriting pipeline requires rigorous verification at each milestone before releasing funds.',
            aiInstructionalNote: 'Process flow visualizes linear sequence with clear verification checkpoints.',
            isLocked: false,
            isEdited: false,
            interactionData: {
              processSteps: [
                {
                  stepNumber: 1,
                  title: 'Pre-Qualification',
                  description: 'Initial triaging of credit score, stated income, and target purchase price.',
                  statusHint: 'Completed by Loan Officer'
                },
                {
                  stepNumber: 2,
                  title: 'Documentation & Verification',
                  description: 'W-2s, 1040 tax returns, bank statements, and employment verification.',
                  statusHint: 'Processor Review'
                },
                {
                  stepNumber: 3,
                  title: 'Appraisal & Title Search',
                  description: 'Independent property valuation and title search for outstanding liens.',
                  statusHint: 'Underwriting Sign-Off'
                },
                {
                  stepNumber: 4,
                  title: 'Closing Disclosure & Funding',
                  description: 'TRID 3-day CD waiting window, signing ceremony, and wire release.',
                  statusHint: 'Final Funding'
                }
              ]
            }
          },
          {
            id: 'sc-2-2',
            chapterId: 'ch-2',
            screenNumber: 2,
            title: 'Scenario: Handling Unpapered Cash Deposits',
            kicker: 'Real-World Case Study',
            interactionType: 'scenario',
            bodyText: 'During asset verification for borrower Marcus Vance, you spot an unexplained $12,500 cash deposit into his checking account 14 days ago.',
            sourceExcerpt: 'Unpapered cash deposits exceeding $1,000 must have verifiable paper trails or be excluded from reserves.',
            aiInstructionalNote: 'Decision-tree scenario gives learners hands-on anti-money-laundering judgment.',
            isLocked: false,
            isEdited: false,
            interactionData: {
              scenarioBranch: {
                context: 'The borrower states the $12,500 was a gift from an uncle, but no gift letter exists. The closing date is in 9 days.',
                choices: [
                  {
                    id: 'c1',
                    choiceText: 'Accept Marcus\'s verbal explanation and proceed to final loan approval.',
                    consequence: 'Audit Violation! Federal QM rules mandate written, signed gift letters verifying no repayment obligation.',
                    isOptimal: false
                  },
                  {
                    id: 'c2',
                    choiceText: 'Require an executed Gift Letter and 30-day donor bank statement verifying funds transfer.',
                    consequence: 'Optimal Compliance! Sourcing the gift satisfies Fannie Mae underwriting guidelines completely.',
                    isOptimal: true
                  },
                  {
                    id: 'c3',
                    choiceText: 'Immediately deny the loan application without offering document cure options.',
                    consequence: 'Customer Loss! Borrowers are entitled to cure unverified funds or exclude them if reserve ratios permit.',
                    isOptimal: false
                  }
                ]
              }
            }
          }
        ]
      }
    ],
    quiz: [
      {
        id: 'q1',
        question: 'Under standard Qualified Mortgage (QM) guidelines, what is the maximum back-end Debt-to-Income (DTI) ratio benchmark?',
        options: ['28%', '36%', '43%', '50%'],
        correctAnswerIndex: 2,
        explanation: '43% is the standard regulatory QM benchmark for conventional loans.',
        competency: 'DTI Analysis'
      },
      {
        id: 'q2',
        question: 'At what Loan-to-Value (LTV) threshold is Private Mortgage Insurance (PMI) mandated on conventional loans?',
        options: ['LTV > 70%', 'LTV > 75%', 'LTV > 80%', 'LTV > 90%'],
        correctAnswerIndex: 2,
        explanation: 'When the borrower provides less than 20% down payment (LTV > 80%), PMI is mandatory.',
        competency: 'PMI Regulations'
      },
      {
        id: 'q3',
        question: 'How many business days prior to closing must the borrower receive the final Closing Disclosure (CD)?',
        options: ['1 business day', '2 business days', '3 business days', '5 business days'],
        correctAnswerIndex: 2,
        explanation: 'TRID mandates a minimum 3 business day review window before loan consummation.',
        competency: 'TRID Compliance'
      }
    ]
  },
  {
    id: 'cybersecurity-basics-2026',
    title: 'Enterprise Cyber Defense & Phishing Awareness',
    description: 'Mandatory annual information security training covering social engineering, credential hygiene, ransomware protocols, and incident reporting.',
    estimatedTimeMinutes: 15,
    targetAudience: 'All Employees & Contractors',
    approvalStatus: 'approved',
    approvedVersion: 'v2.1',
    approvedAt: '2026-08-15T09:00:00Z',
    approvedBy: 'Chief Information Security Officer',
    publishStatus: 'published',
    publishedAt: '2026-08-16T11:00:00Z',
    enrollmentCount: 150,
    completionRate: 91,
    averageScore: 92,
    brandTheme: {
      id: 'cyber-dark',
      name: 'Cyber Shield',
      primaryColor: '#0EA5E9',
      accentColor: '#10B981',
      fontFamily: 'Plus Jakarta Sans'
    },
    learningObjectives: [
      'Recognize spear-phishing and executive impersonation techniques',
      'Deploy hardware MFA and passkey authentication practices',
      'Follow immediate containment procedures for suspicious email links'
    ],
    sections: [],
    chapters: [],
    quiz: []
  },
  {
    id: 'esg-compliance-draft',
    title: 'Corporate ESG Reporting & Carbon Accounting',
    description: 'Environmental, Social, and Governance compliance module for procurement and finance leads.',
    estimatedTimeMinutes: 25,
    targetAudience: 'Finance, Operations, and Procurement Leads',
    approvalStatus: 'draft',
    publishStatus: 'draft',
    enrollmentCount: 0,
    completionRate: 0,
    averageScore: 0,
    brandTheme: {
      id: 'eco-green',
      name: 'Sustainable Growth',
      primaryColor: '#059669',
      accentColor: '#F59E0B',
      fontFamily: 'Plus Jakarta Sans'
    },
    learningObjectives: [
      'Measure Scope 1, 2, and 3 emissions across corporate supply chains',
      'Comply with CSRD and SEC climate risk disclosure rules'
    ],
    sections: [],
    chapters: [],
    quiz: []
  }
];

export const INITIAL_LEARNERS: Learner[] = [
  {
    id: 'lrn-101',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@company.com',
    role: 'Junior Loan Officer',
    department: 'Retail Lending',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    completedCoursesCount: 1,
    avgScore: 90,
    weakAreas: ['TRID 3-Day Waiting Period'],
    assignedCourses: [
      {
        courseId: 'mortgage-underwriting-101',
        courseTitle: 'Home Loan Basics & Underwriting Mastery',
        status: 'completed',
        progressPercent: 100,
        completedScreensCount: 4,
        totalScreensCount: 4,
        score: 90,
        passed: true,
        timeSpentMinutes: 19,
        lastActivityDate: '2026-09-29T14:20:00Z',
        completedAt: '2026-09-29T14:40:00Z',
        certificateId: 'CERT-HLB-9921',
        currentChapterIdx: 1,
        currentScreenIdx: 1
      },
      {
        courseId: 'cybersecurity-basics-2026',
        courseTitle: 'Enterprise Cyber Defense & Phishing Awareness',
        status: 'in_progress',
        progressPercent: 65,
        completedScreensCount: 3,
        totalScreensCount: 5,
        timeSpentMinutes: 10,
        lastActivityDate: '2026-09-30T11:15:00Z',
        currentChapterIdx: 0,
        currentScreenIdx: 2
      }
    ]
  },
  {
    id: 'lrn-102',
    name: 'Michael Chen',
    email: 'michael.chen@company.com',
    role: 'Underwriting Associate',
    department: 'Credit Underwriting',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    completedCoursesCount: 0,
    avgScore: 78,
    weakAreas: ['DTI Calculation Benchmarks', 'Self-Employed Tax Forms'],
    assignedCourses: [
      {
        courseId: 'mortgage-underwriting-101',
        courseTitle: 'Home Loan Basics & Underwriting Mastery',
        status: 'in_progress',
        progressPercent: 50,
        completedScreensCount: 2,
        totalScreensCount: 4,
        score: 75,
        timeSpentMinutes: 12,
        lastActivityDate: '2026-09-30T09:45:00Z',
        currentChapterIdx: 0,
        currentScreenIdx: 1
      }
    ]
  },
  {
    id: 'lrn-103',
    name: 'Aisha Patel',
    email: 'aisha.patel@company.com',
    role: 'Mortgage Processor',
    department: 'Retail Lending',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    completedCoursesCount: 1,
    avgScore: 94,
    weakAreas: [],
    assignedCourses: [
      {
        courseId: 'mortgage-underwriting-101',
        courseTitle: 'Home Loan Basics & Underwriting Mastery',
        status: 'completed',
        progressPercent: 100,
        completedScreensCount: 4,
        totalScreensCount: 4,
        score: 95,
        passed: true,
        timeSpentMinutes: 21,
        lastActivityDate: '2026-09-28T16:30:00Z',
        completedAt: '2026-09-28T17:00:00Z',
        certificateId: 'CERT-HLB-9922',
        currentChapterIdx: 1,
        currentScreenIdx: 1
      }
    ]
  },
  {
    id: 'lrn-104',
    name: 'David Rodriguez',
    email: 'david.rodriguez@company.com',
    role: 'Loan Originator',
    department: 'Branch Banking',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    completedCoursesCount: 0,
    avgScore: 0,
    weakAreas: [],
    assignedCourses: [
      {
        courseId: 'mortgage-underwriting-101',
        courseTitle: 'Home Loan Basics & Underwriting Mastery',
        status: 'not_started',
        progressPercent: 0,
        completedScreensCount: 0,
        totalScreensCount: 4,
        timeSpentMinutes: 0,
        lastActivityDate: '2026-09-27T10:00:00Z',
        currentChapterIdx: 0,
        currentScreenIdx: 0
      }
    ]
  }
];

export const INITIAL_CERTIFICATES: Certificate[] = [
  {
    id: 'CERT-HLB-9921',
    learnerId: 'lrn-101',
    learnerName: 'Sarah Jenkins',
    courseId: 'mortgage-underwriting-101',
    courseTitle: 'Home Loan Basics & Underwriting Mastery',
    completionDate: '2026-09-29',
    score: 90,
    verificationCode: 'VRF-9921-2026'
  },
  {
    id: 'CERT-HLB-9922',
    learnerId: 'lrn-103',
    learnerName: 'Aisha Patel',
    courseId: 'mortgage-underwriting-101',
    courseTitle: 'Home Loan Basics & Underwriting Mastery',
    completionDate: '2026-09-28',
    score: 95,
    verificationCode: 'VRF-9922-2026'
  }
];
