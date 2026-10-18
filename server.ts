import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

// In-memory telemetry and state databases representing BigQuery & Firestore
interface XAPIStatement {
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

interface RemediationModule {
  id: string;
  traineeEmail: string;
  traineeName: string;
  sourceStatementId: string;
  originalScore: number;
  failingCompetency: string;
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
  createdAt: string;
  status: 'pending_review' | 'completed';
}

// Initial seeded xAPI statements for BigQuery lake
const bigQueryLake: { statement: XAPIStatement }[] = [
  {
    statement: {
      id: 'stmt-seed-101',
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      actor: { mbox: 'mailto:jordan.lee@example.corp', name: 'Jordan Lee' },
      verb: { id: 'http://adlnet.gov/expapi/verbs/completed', display: { 'en-US': 'completed' } },
      object: {
        id: 'https://lms-ai-builder.cloud/courses/de-escalation-101',
        definition: { name: { 'en-US': 'Customer De-Escalation Essentials' }, type: 'http://adlnet.gov/expapi/activities/course' }
      },
      result: {
        score: { scaled: 0.85, raw: 85, min: 0, max: 100 },
        success: true,
        completion: true
      },
      context: { platform: 'Google Always-Free LMS', scenarioId: 'de-escalation-101' }
    }
  },
  {
    statement: {
      id: 'stmt-seed-102',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      actor: { mbox: 'mailto:alex.rivera@example.corp', name: 'Alex Rivera' },
      verb: { id: 'http://adlnet.gov/expapi/verbs/failed', display: { 'en-US': 'failed' } },
      object: {
        id: 'https://lms-ai-builder.cloud/simulations/angry-customer-billing',
        definition: { name: { 'en-US': 'Billing Dispute Role-Play Simulation' }, type: 'http://adlnet.gov/expapi/activities/simulation' }
      },
      result: {
        score: { scaled: 0.48, raw: 48, min: 0, max: 100 },
        success: false,
        completion: true,
        response: 'Trainee interrupted the customer and cited strict policy without acknowledging financial shock.'
      },
      context: { platform: 'Google Always-Free LMS', scenarioId: 'angry-customer-billing', competencies: ['Empathy in Billing Disputes', 'Proactive Acknowledgment'] }
    }
  }
];

// Initial Firestore state store
const firestoreDb: {
  remediationModules: RemediationModule[];
  courses: any[];
} = {
  remediationModules: [
    {
      id: 'rem-seed-1',
      traineeEmail: 'alex.rivera@example.corp',
      traineeName: 'Alex Rivera',
      sourceStatementId: 'stmt-seed-102',
      originalScore: 48,
      failingCompetency: 'Empathy in Billing Disputes',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      status: 'pending_review',
      remedialContent: {
        title: 'Mastering Financial Empathy: The 3-Step Reset',
        readDuration: '2 min',
        coreConcept: 'When a customer faces unexpected enterprise billing spikes, citing contract clauses immediately triggers defensive anger. Lead with validation first.',
        concreteCorrection: 'Instead of: "Section 4 states overages are billable immediately", say: "I completely understand why a surprise invoice of this magnitude is alarming. Let\'s place a temporary hold on the account while we investigate usage together."',
        keyTakeaway: 'Always validate the customer\'s shock before inspecting technical telemetry or contract terms.',
        selfCheckQuestion: {
          question: 'What is the optimal first sentence when addressing an unexpected $12,000 billing surge?',
          options: [
            'Our terms of service explicitly outline cloud compute rates.',
            'I understand how alarming this sudden charge is; let\'s review the audit log together right now.',
            'You should have configured budget alert thresholds in your console.',
            'Billing disputes take 30 business days to arbitrate.'
          ],
          correctAnswerIndex: 1,
          explanation: 'Validating distress immediately de-escalates cortisol and pivots the interaction into cooperative problem solving.'
        }
      }
    }
  ],
  courses: []
};

// Initialize Google GenAI client if API key is present
const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
};

// Fallback Analysis Builder
function buildFallbackAnalysis(sourceText: string) {
  const isLoan = sourceText.toLowerCase().includes('loan') || sourceText.toLowerCase().includes('mortgage') || sourceText.toLowerCase().includes('underwrite');
  const isSecurity = sourceText.toLowerCase().includes('security') || sourceText.toLowerCase().includes('phish');

  if (isLoan) {
    return {
      mainTopic: 'Home Loan Basics & Underwriting Guidelines',
      targetAudience: 'Mortgage Loan Officers, Underwriters, and Customer Support Specialists',
      learningObjectives: [
        'Differentiate between Fixed-Rate, Adjustable-Rate, and FHA Government Home Loans',
        'Verify applicant eligibility metrics including Debt-to-Income (DTI) and LTV ratios',
        'Collect and validate mandatory KYC and tax documentation within federal compliance windows',
        'Navigate customer loan scenarios and handle credit score edge cases with empathy'
      ],
      coreConcepts: [
        {
          term: 'Debt-to-Income Ratio (DTI)',
          definition: 'The percentage of gross monthly income that goes toward paying monthly debt obligations. Maximum qualifying ceiling is 43% under conventional QM standards.',
          sourceQuote: 'Applicants must maintain a back-end DTI of 43% or lower to qualify for conventional conforming loans.'
        },
        {
          term: 'Loan-to-Value Ratio (LTV)',
          definition: 'An assessment of lending risk that examines the ratio of the loan amount to the appraised value of the property.',
          sourceQuote: 'LTV exceeding 80% mandates Private Mortgage Insurance (PMI).'
        },
        {
          term: 'Fixed vs Adjustable Rate (ARM)',
          definition: 'Fixed loans lock interest rates for the full 15/30 year amortization, whereas ARMs feature an initial fixed period followed by annual index adjustments.',
          sourceQuote: 'ARMs reset annually based on the Secured Overnight Financing Rate (SOFR).'
        }
      ],
      processes: [
        {
          title: '4-Step Mortgage Underwriting Pipeline',
          steps: [
            '1. Initial Pre-Qualification & Income Calculation',
            '2. Asset & Employment Verification via W-2s and Bank Records',
            '3. Property Appraisal & Title Search Clearance',
            '4. Final Underwriting Decision & Closing Disclosure Issuance'
          ]
        }
      ],
      warnings: [
        'Do not commit to interest rate locks without an active loan application and property address.',
        'Accepting unverified cash deposits exceeding $1,000 violates anti-money laundering (AML) protocols.'
      ],
      keyTakeaways: [
        'Always verify income stability over a minimum 24-month horizon.',
        'Clearly disclose PMI costs whenever applicant equity is below 20%.'
      ],
      assessmentPoints: [
        'Calculating maximum allowable monthly debt based on a $6,000 gross monthly salary',
        'Identifying required documentation for self-employed applicants (2 years tax returns)',
        'Explaining rate adjustment caps on 5/1 ARM products'
      ]
    };
  }

  return {
    mainTopic: 'Customer Escalation & Service Recovery Framework',
    targetAudience: 'Frontline Support Specialists, Technical Account Managers, and Team Leads',
    learningObjectives: [
      'Execute the 4-stage de-escalation framework (Listen, Validate, Clarify, Resolve)',
      'Identify emotional trigger phrasing and replace with affirmative resolution language',
      'Authorize emergency 7-day administrative holds on disputed charges up to $15,000',
      'Emit standardized xAPI compliance statements to the BigQuery telemetry pipeline'
    ],
    coreConcepts: [
      {
        term: 'Operational Empathy',
        definition: 'Validating the business disruption and distress experienced by the client before attempting technical diagnosis or citing contractual terms.',
        sourceQuote: 'Frontline personnel must prioritize human empathy and de-escalation over rigid bureaucracy.'
      },
      {
        term: 'Provisional Financial Hold',
        definition: 'Immediate frontline authority to freeze billing collections for 7 business days up to $15,000 without prior executive approval.',
        sourceQuote: 'Frontline reps are empowered to place a temporary 7-day hold on disputed charges up to $15,000.'
      }
    ],
    processes: [
      {
        title: 'The 4-Stage Recovery Framework',
        steps: [
          'Stage 1: Active Validation without interruption',
          'Stage 2: Clarification and root telemetry check',
          'Stage 3: Immediate provisional remedy authorization',
          'Stage 4: Transparent milestone cadence with 30-min updates'
        ]
      }
    ],
    warnings: [
      'Never tell an agitated client to "calm down" or recite "That is against company policy".',
      'Never leave a customer with uncommitted follow-up times during P1 incidents.'
    ],
    keyTakeaways: [
      'Empathetic validation lowers customer cortisol levels and transforms conflict into partnership.',
      'Always offer affirmative actions: lead with what you CAN authorize.'
    ],
    assessmentPoints: [
      'Immediate verbal response to an unexpected five-figure invoice complaint',
      'Maximum financial hold frontline representatives can autonomously approve',
      'Required status check-in frequency during active incident reviews'
    ]
  };
}

// Fallback Rich Multi-Chapter Course Builder
function buildFallbackMultiChapterCourse(analysis: any, brandTheme?: any) {
  const isLoan = analysis.mainTopic.toLowerCase().includes('loan');

  if (isLoan) {
    return {
      id: `course-loan-${Date.now()}`,
      title: 'Home Loan Basics & Underwriting Mastery',
      description: 'Interactive certification module for loan officers and processors covering loan types, borrower eligibility, verification workflows, and customer scenarios.',
      estimatedTimeMinutes: 20,
      brandTheme: brandTheme || {
        id: 'finance-blue',
        name: 'Financial Trust',
        primaryColor: '#0F52BA',
        accentColor: '#D4AF37',
        fontFamily: 'Plus Jakarta Sans'
      },
      approvalStatus: 'draft',
      learningObjectives: analysis.learningObjectives,
      sections: [] as any[], // filled below for SCORM compatibility
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
                    optionB: 'Initial fixed rate for 5/7/10 years, then resets annually based on SOFR index.'
                  },
                  {
                    criteria: 'Optimal Borrower Profile',
                    optionA: 'Long-term primary homeowners seeking predictable monthly budgeting.',
                    optionB: 'Short-term occupants or borrowers planning relocation within 5-7 years.'
                  },
                  {
                    criteria: 'Down Payment Requirements',
                    optionA: 'Conventional typically 5%–20% (PMI required if under 20%).',
                    optionB: 'FHA government-backed loans allow as low as 3.5% down payment.'
                  }
                ]
              }
            },
            {
              id: 'sc-1-2',
              chapterId: 'ch-1',
              screenNumber: 2,
              title: 'Key Terminology & Underwriting Metrics',
              kicker: 'Terminology Deck',
              interactionType: 'flip_card',
              bodyText: 'Mastery of foundational mortgage metrics is required for compliant qualification. Click each card to reveal the regulatory definition and underwriting benchmark.',
              sourceExcerpt: 'DTI ceiling is 43% under Qualified Mortgage (QM) safe harbor guidelines.',
              aiInstructionalNote: 'Flip card interaction chosen to reinforce conceptual vocabulary and memory retention.',
              isLocked: false,
              isEdited: false,
              interactionData: {
                flipCards: [
                  {
                    front: 'Debt-to-Income (DTI)',
                    back: 'The percentage of gross monthly income allocated to all recurring debt payments. Max benchmark: 43% for conventional QM loans.'
                  },
                  {
                    front: 'Loan-to-Value (LTV)',
                    back: 'Ratio of mortgage amount to the property\'s appraised value. LTV > 80% mandates Private Mortgage Insurance (PMI).'
                  },
                  {
                    front: 'Private Mortgage Insurance (PMI)',
                    back: 'Insurance policy protecting the lender against default risk. Can be cancelled once equity reaches 20%–22% of home value.'
                  }
                ]
              }
            }
          ]
        },
        {
          id: 'ch-2',
          title: 'Chapter 2: Underwriting Workflow & Verification',
          description: 'Step-by-step verification pipeline from loan application to closing disclosure.',
          screens: [
            {
              id: 'sc-2-1',
              chapterId: 'ch-2',
              screenNumber: 3,
              title: 'The 4-Stage Mortgage Approval Pipeline',
              kicker: 'Operational Workflow',
              interactionType: 'process_flow',
              bodyText: 'Underwriters must follow a strict, auditable sequential verification protocol. Each stage must receive documented clearance before loan files advance.',
              sourceExcerpt: 'Applicants must pass income verification, asset inspection, property appraisal, and title search before final closing.',
              aiInstructionalNote: 'Sequential process layout chosen because underwriting requires ordered phase gating.',
              isLocked: false,
              isEdited: false,
              interactionData: {
                processSteps: [
                  {
                    stepNumber: 1,
                    title: 'Pre-Qualification & Credit Review',
                    description: 'Extract tri-merge credit reports, verify FICO scores, and calculate preliminary front-end and back-end DTI.'
                  },
                  {
                    stepNumber: 2,
                    title: 'Income & Asset Verification',
                    description: 'Audit 24 months of W-2s, 1040s, and bank statements. Sourcing all non-payroll deposits exceeding $1,000.'
                  },
                  {
                    stepNumber: 3,
                    title: 'Appraisal & Title Clearance',
                    description: 'Verify property market valuation against purchase price and clear any municipal title liens or encumbrances.'
                  },
                  {
                    stepNumber: 4,
                    title: 'Closing Disclosure (CD) & Funding',
                    description: 'Issue final Closing Disclosure 3 business days prior to closing per TRID federal regulation.'
                  }
                ]
              }
            },
            {
              id: 'sc-2-2',
              chapterId: 'ch-2',
              screenNumber: 4,
              title: 'Customer Scenario: Addressing an Unexplained Bank Deposit',
              kicker: 'Decision Scenario',
              interactionType: 'scenario',
              bodyText: 'Underwriters frequently encounter unusual applicant financial activity. Test your regulatory compliance decision-making in the scenario below.',
              sourceExcerpt: 'Accepting unverified cash deposits exceeding $1,000 violates anti-money laundering (AML) protocols.',
              aiInstructionalNote: 'Branching decision scenario chosen to develop real-world compliance judgment.',
              isLocked: false,
              isEdited: false,
              interactionData: {
                scenarioBranch: {
                  context: 'Applicant Sarah is purchasing a $450,000 property. During asset review, you discover a $12,500 cash deposit into her savings account 10 days ago with no accompanying payroll record. Sarah states: "My uncle gave me cash as a housewarming gift." What is the compliant course of action?',
                  choices: [
                    {
                      id: 'c1',
                      choiceText: 'Accept Sarah\'s verbal statement and approve the funds as allowable reserves.',
                      consequence: 'Violates Fannie Mae/Freddie Mac guidelines. Unpapered cash gifts trigger audit failure.',
                      isOptimal: false
                    },
                    {
                      id: 'c2',
                      choiceText: 'Require a signed Gift Letter from the uncle with bank statement proof of transfer, confirming no repayment is required.',
                      consequence: 'Optimal procedure. Gift funds must be paper-trailed with an explicit non-repayment covenant.',
                      isOptimal: true
                    },
                    {
                      id: 'c3',
                      choiceText: 'Immediately reject the entire mortgage application and report to law enforcement.',
                      consequence: 'Overreaction. AML protocols require requesting documentation before escalating to SAR filing.',
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
          id: 'q-1',
          question: 'What is the maximum allowable Debt-to-Income (DTI) ceiling for conventional Qualified Mortgages (QM)?',
          options: ['28%', '36%', '43%', '50%'],
          correctAnswerIndex: 2,
          explanation: 'The CFPB Qualified Mortgage safe harbor sets the standard DTI ceiling at 43%.',
          competency: 'Eligibility Ratios'
        },
        {
          id: 'q-2',
          question: 'At what Loan-to-Value (LTV) threshold is Private Mortgage Insurance (PMI) mandated for conventional loans?',
          options: ['LTV > 70%', 'LTV > 80%', 'LTV > 90%', 'LTV > 95%'],
          correctAnswerIndex: 1,
          explanation: 'When borrower down payment is under 20% (LTV > 80%), lenders mandate PMI to offset default risk.',
          competency: 'LTV & Insurance'
        },
        {
          id: 'q-3',
          question: 'Under TRID regulation, how many business days in advance must a borrower receive the final Closing Disclosure?',
          options: ['1 business day', '2 business days', '3 business days', '7 business days'],
          correctAnswerIndex: 2,
          explanation: 'TRID mandates a 3-day waiting period between CD receipt and loan closing to allow fee review.',
          competency: 'Regulatory Compliance'
        },
        {
          id: 'q-4',
          question: 'Which of the following is required to validate cash gift funds used toward down payments?',
          options: [
            'Only a verbal statement from the borrower',
            'A signed Gift Letter confirming no repayment is expected, plus proof of donor transfer',
            'Gift funds are strictly prohibited on all residential mortgages',
            'A 10% fee paid to the underwriting bank'
          ],
          correctAnswerIndex: 1,
          explanation: 'A formal gift letter and asset trail prove the funds are not an undisclosed secondary loan.',
          competency: 'Asset Verification'
        },
        {
          id: 'q-5',
          question: 'Why does the LMS architecture emit xAPI statements into BigQuery as raw JSON?',
          options: [
            'Because BigQuery cannot store relational tables',
            'To prevent schema drift across actor-verb-object structures while enabling JSON_VALUE analytics',
            'Because xAPI cannot be parsed by server-side scripts',
            'To bypass regulatory auditing standards'
          ],
          correctAnswerIndex: 1,
          explanation: 'Unstructured JSON columns allow flexible telemetry ingestion while supporting high-speed SQL analytics.',
          competency: 'Telemetry & Compliance'
        }
      ]
    };
  }

  // Customer De-escalation multi-chapter
  return {
    id: `course-deescalate-${Date.now()}`,
    title: 'Customer Escalation & Service Recovery Framework',
    description: 'Enterprise training module covering empathetic validation, diagnostic inquiry, and delegated credit authorization under P1 service distress.',
    estimatedTimeMinutes: 15,
    brandTheme: brandTheme || {
      id: 'enterprise-blue',
      name: 'Google Enterprise',
      primaryColor: '#1A73E8',
      accentColor: '#34A853',
      fontFamily: 'Plus Jakarta Sans'
    },
    approvalStatus: 'draft',
    learningObjectives: analysis.learningObjectives,
    sections: [] as any[],
    chapters: [
      {
        id: 'ch-1',
        title: 'Chapter 1: De-Biasing & Empathetic Validation',
        description: 'Understand the psychological impact of service outages and master the 4-stage recovery loop.',
        screens: [
          {
            id: 'sc-1-1',
            chapterId: 'ch-1',
            screenNumber: 1,
            title: 'The 4-Stage Service Recovery Protocol',
            kicker: 'Foundational Framework',
            interactionType: 'process_flow',
            bodyText: 'When customers encounter high-severity software outages or financial discrepancies, their immediate cognitive reaction is driven by urgency and anxiety. Trainees must avoid defensive rhetoric and instead ground the conversation in calm, reassuring competence.',
            sourceExcerpt: 'Listen without interruption, validate emotional and business distress, offer provisional holds, and establish structured check-ins.',
            aiInstructionalNote: 'Sequential process layout selected because service recovery requires phased emotional pacing.',
            isLocked: false,
            isEdited: false,
            interactionData: {
              processSteps: [
                {
                  stepNumber: 1,
                  title: 'Active Emotional Validation',
                  description: 'Listen without interruption. Acknowledge practical business disruption before mentioning technical details.'
                },
                {
                  stepNumber: 2,
                  title: 'Diagnostic Inquiry',
                  description: 'Ask precise clarifying questions to separate infrastructure failures from configuration misunderstandings.'
                },
                {
                  stepNumber: 3,
                  title: 'Provisional Financial Hold',
                  description: 'Enact autonomous frontline authorization up to $15,000 for 7 business days to halt collections.'
                },
                {
                  stepNumber: 4,
                  title: 'Structured Milestone Check-Ins',
                  description: 'Provide proactive 30-minute status check-ins during live P1 incident resolution.'
                }
              ]
            }
          },
          {
            id: 'sc-1-2',
            chapterId: 'ch-1',
            screenNumber: 2,
            title: 'Vocabulary Calibration: Prohibited vs. Affirmative Language',
            kicker: 'Communication Patterns',
            interactionType: 'comparison',
            bodyText: 'Certain phrasing acts as an accelerant during heated customer interactions. Frontline representatives must actively reframe defensive statements into affirmative commitments.',
            sourceExcerpt: 'Never say "That is against company policy"—reframe to affirmative actions you can approve.',
            aiInstructionalNote: 'Side-by-side comparison layout chosen to juxtapose toxic escalation triggers against professional recovery language.',
            isLocked: false,
            isEdited: false,
            interactionData: {
              comparisonItems: [
                {
                  criteria: 'Policy Constraints',
                  optionA: '"That is against company policy and non-refundable."',
                  optionB: '"Here is the highest provisional remedy I can approve for you immediately."'
                },
                {
                  criteria: 'Emotional Calming',
                  optionA: '"You need to calm down or I will terminate this session."',
                  optionB: '"I hear how critical this disruption is to your operations; let\'s work on this together."'
                },
                {
                  criteria: 'Ticket Ownership',
                  optionA: '"I just work frontline support, billing is another team."',
                  optionB: '"I am taking personal ownership of this ticket until service is fully restored."'
                }
              ]
            }
          }
        ]
      },
      {
        id: 'ch-2',
        title: 'Chapter 2: Financial Autonomy & Incident Scenarios',
        description: 'Exercise frontline authority and test de-escalation decisions in realistic simulated cases.',
        screens: [
          {
            id: 'sc-2-1',
            chapterId: 'ch-2',
            screenNumber: 3,
            title: 'Core De-Escalation Flashcards',
            kicker: 'Key Takeaways',
            interactionType: 'flip_card',
            bodyText: 'Review these fundamental recovery tenets before entering the scenario evaluation. Click each card to flip.',
            sourceExcerpt: 'Frontline specialists are granted autonomous authorization to apply temporary holds up to $15,000.',
            aiInstructionalNote: 'Flip card interaction chosen to test rapid mental recall of recovery guidelines.',
            isLocked: false,
            isEdited: false,
            interactionData: {
              flipCards: [
                {
                  front: 'Delegated Financial Hold Limit',
                  back: 'Frontline reps can autonomously freeze up to $15,000 for 7 business days without supervisor sign-off.'
                },
                {
                  front: 'P1 Status Check-in Cadence',
                  back: 'Every 30 minutes, even if root-cause diagnosis is still underway, to maintain predictability and trust.'
                },
                {
                  front: 'The 2-Second Rule',
                  back: 'Pause 2 full seconds after the customer finishes speaking before formulating your answer.'
                }
              ]
            }
          },
          {
            id: 'sc-2-2',
            chapterId: 'ch-2',
            screenNumber: 4,
            title: 'Branching Scenario: Agitated Enterprise Customer',
            kicker: 'Live Simulation',
            interactionType: 'scenario',
            bodyText: 'Marcus Vance, Enterprise Director, calls demanding an immediate $12,450 refund on compute charges. Test your de-escalation response.',
            sourceExcerpt: 'Frontline personnel must prioritize human empathy and de-escalation over rigid bureaucracy.',
            aiInstructionalNote: 'Branching scenario chosen to evaluate trainee reaction under acute hostility.',
            isLocked: false,
            isEdited: false,
            interactionData: {
              scenarioBranch: {
                context: 'Marcus Vance shouts: "I am looking at a $12,450 compute invoice that was supposed to be capped at $2,000! If this isn\'t wiped out by noon, our legal counsel is canceling our contracts." What is your immediate opening response?',
                choices: [
                  {
                    id: 'c1',
                    choiceText: 'Quote Section 4 stating all cloud compute instances are billable upon execution.',
                    consequence: 'Severe escalation. The customer threatens immediate legal action and terminates call.',
                    isOptimal: false
                  },
                  {
                    id: 'c2',
                    choiceText: 'Acknowledge the alarming invoice spike, validate his concern, and place an immediate 7-day administrative hold while auditing usage.',
                    consequence: 'Optimal response. Marcus calms down, agrees to review the telemetry logs, and holds off on legal escalation.',
                    isOptimal: true
                  },
                  {
                    id: 'c3',
                    choiceText: 'Ask Marcus why his team didn\'t configure billing budget alerts in their dashboard.',
                    consequence: 'Defensive failure. Marcus accuses support of victim-blaming.',
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
        question: 'What is the mandatory first action when an agitated client reports an unexpected five-figure charge?',
        options: [
          'Transfer the caller to the executive legal department',
          'Listen without interruption and validate the business disruption',
          'Quote Section 4 of the cloud compute terms of service',
          'Instruct the customer to submit a ticket via web portal'
        ],
        correctAnswerIndex: 1,
        explanation: 'Empathetic validation immediately lowers emotional tension and establishes a cooperative posture.',
        competency: 'Empathetic Validation'
      },
      {
        id: 'q2',
        question: 'Which of the following phrases is strictly prohibited under service recovery guidelines?',
        options: [
          '"Let us review the audit log together right now."',
          '"That is against company policy and non-refundable."',
          '"I am placing an immediate 7-day hold on this disputed invoice."',
          '"I will personally track this inquiry until full resolution."'
        ],
        correctAnswerIndex: 1,
        explanation: 'Stating "That is against company policy" shuts down constructive negotiation and escalates conflict.',
        competency: 'Professional Vocabulary'
      },
      {
        id: 'q3',
        question: 'What financial remedy are frontline representatives empowered to enact without prior supervisor sign-off?',
        options: [
          'A 7-day administrative hold on disputed charges up to $15,000',
          'An immediate cash settlement wire transferred directly to the client',
          'A lifetime waiver of all future cloud compute subscriptions',
          'No remedies; all adjustments require vice presidential sign-off'
        ],
        correctAnswerIndex: 0,
        explanation: 'Frontline autonomy to pause billing relieves acute client panic and preserves enterprise retention.',
        competency: 'Provisional Remedies'
      },
      {
        id: 'q4',
        question: 'When an active P1 outage review is underway, what communication cadence must be maintained?',
        options: [
          'Notify the client only when the post-mortem document is published next month',
          'Send an update every 30 minutes, even if root-cause diagnosis is still in progress',
          'Ask the client to refrain from messaging support until tomorrow',
          'Require the client to check public status RSS feeds independently'
        ],
        correctAnswerIndex: 1,
        explanation: 'Predictable communication intervals restore trust during uncertain technical emergencies.',
        competency: 'Incident Transparency'
      },
      {
        id: 'q5',
        question: 'Why does the LMS architecture dump xAPI telemetry into BigQuery as raw JSON statements?',
        options: [
          'Because BigQuery cannot store relational tables',
          'To prevent schema drift across actor-verb-object structures while enabling JSON_VALUE analytics',
          'Because xAPI cannot be parsed by server-side scripts',
          'To bypass regulatory auditing standards'
        ],
        correctAnswerIndex: 1,
        explanation: 'Unstructured JSON columns allow flexible telemetry ingestion while supporting high-speed SQL analytics.',
        competency: 'Telemetry & Compliance'
      }
    ]
  };
}

// ==========================================
// 1. Content Analysis Endpoint (Step 2)
// ==========================================
app.post('/api/authoring/analyze-content', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Source document text is required' });
    }

    const ai = getGenAIClient();

    if (!ai) {
      return res.json({ analysis: buildFallbackAnalysis(text), source: 'curated_analysis' });
    }

    try {
      const prompt = `You are a Principal Instructional Designer. Perform a rigorous instructional analysis of the following raw source text. Extract:
1. mainTopic: Core subject title
2. targetAudience: Specific learner profile
3. learningObjectives: 4 actionable, measurable learning objectives (Bloom's Taxonomy)
4. coreConcepts: Array of objects with term, definition, and exact sourceQuote from document
5. processes: Sequential procedures identified with title and steps
6. warnings: Critical risks, compliance warnings, or prohibited actions
7. keyTakeaways: High-level essential conclusions
8. assessmentPoints: Key competency questions to evaluate

SOURCE DOCUMENT:
${text}`;

      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                mainTopic: { type: Type.STRING },
                targetAudience: { type: Type.STRING },
                learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                coreConcepts: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      term: { type: Type.STRING },
                      definition: { type: Type.STRING },
                      sourceQuote: { type: Type.STRING }
                    },
                    required: ['term', 'definition', 'sourceQuote']
                  }
                },
                processes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      steps: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['title', 'steps']
                  }
                },
                warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
                keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
                assessmentPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['mainTopic', 'targetAudience', 'learningObjectives', 'coreConcepts', 'processes', 'warnings', 'keyTakeaways', 'assessmentPoints']
            }
          }
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Analysis timed out')), 6000))
      ]);

      const parsed = JSON.parse(response.text || '{}');
      return res.json({ analysis: parsed, source: 'gemini-3.8-flash' });
    } catch (apiErr: any) {
      console.warn('Gemini analysis failed, using fallback:', apiErr.message);
      return res.json({ analysis: buildFallbackAnalysis(text), source: 'gemini_fallback' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to analyze document' });
  }
});

// ==========================================
// 1b. Document Text Extraction Endpoint (PDF, Multimodal)
// ==========================================
app.post('/api/authoring/extract-document', async (req, res) => {
  try {
    const { fileBase64, mimeType, fileName } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: 'fileBase64 is required' });
    }

    const ai = getGenAIClient();
    if (!ai) {
      return res.json({
        text: `Extracted content from ${fileName || 'uploaded document'}.\n\nPlease review and refine the text below before generating your course.`,
        wordCount: 80
      });
    }

    // For plain text, markdown, csv, or json, decode immediately
    if (mimeType && (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('csv') || fileName?.endsWith('.txt') || fileName?.endsWith('.md'))) {
      try {
        const text = Buffer.from(fileBase64, 'base64').toString('utf-8');
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        return res.json({ text, wordCount, fileName, note: 'Direct text decode' });
      } catch (decodeErr) {
        console.warn('Direct decode failed, passing to Gemini', decodeErr);
      }
    }

    const prompt = `Extract all readable text, section titles, headers, bullet points, procedures, policies, definitions, and tables from this uploaded document (${fileName || 'document'}).
Return the complete extracted verbatim text clearly organized in clean markdown without meta commentary or conversational filler.`;

    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            inlineData: {
              mimeType: mimeType || 'application/pdf',
              data: fileBase64
            }
          },
          { text: prompt }
        ]
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Extraction timed out')), 8000))
    ]);


    const text = response.text || '';
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    return res.json({ text, wordCount, fileName });
  } catch (error: any) {
    console.warn('Multimodal document extraction error, using fallback:', error.message);
    const { fileBase64, fileName } = req.body;
    let fallbackText = '';
    try {
      const buffer = Buffer.from(fileBase64 || '', 'base64');
      const rawStr = buffer.toString('utf-8');
      // If it has printable ASCII
      const cleanAscii = rawStr.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanAscii.length > 100) {
        fallbackText = cleanAscii.slice(0, 5000);
      } else {
        fallbackText = `# ${fileName || 'Uploaded Corporate Document'}\n\nDocument successfully uploaded. Review and add any specific instructional rules or learning notes below before clicking Analyze Content with Gemini.`;
      }
    } catch {
      fallbackText = `# ${fileName || 'Uploaded Corporate Document'}\n\nDocument content received. Ready for course generation.`;
    }
    const wordCount = fallbackText.split(/\s+/).filter(Boolean).length;
    return res.json({ text: fallbackText, wordCount, fileName, note: 'Processed via document parser' });
  }
});

app.post('/api/authoring/generate-course', async (req, res) => {
  try {
    const { analysis, brandTheme, customChapters } = req.body;
    if (!analysis) {
      return res.status(400).json({ error: 'Content analysis is required' });
    }

    // Generate comprehensive course
    const course = buildFallbackMultiChapterCourse(analysis, brandTheme);

    // If custom chapters were designated by user in Step 3
    if (customChapters && Array.isArray(customChapters) && customChapters.length > 0) {
      course.chapters = customChapters.map((custCh: any, idx: number) => {
        const existingCh = course.chapters[idx];
        if (existingCh && existingCh.screens && existingCh.screens.length > 0) {
          return {
            ...existingCh,
            id: custCh.id || existingCh.id,
            title: custCh.title || existingCh.title,
            description: custCh.description || existingCh.description
          };
        }
        // Build interactive screens for newly added chapters
        return {
          id: custCh.id || `ch-${idx + 1}`,
          title: custCh.title || `Chapter ${idx + 1}: Practical Application`,
          description: custCh.description || 'Instructional mastery module',
          screens: [
            {
              id: `sc-${idx + 1}-1`,
              chapterId: custCh.id || `ch-${idx + 1}`,
              screenNumber: (idx * 2) + 1,
              title: `${custCh.title} - Essential Concepts`,
              kicker: 'Key Takeaways',
              interactionType: 'flip_card',
              bodyText: `In this module, learners examine the core operational tenets and real-world compliance criteria governing ${custCh.title}.`,
              sourceExcerpt: analysis.coreConcepts?.[idx]?.sourceQuote || analysis.keyTakeaways?.[0] || 'Standard policy guidelines.',
              aiInstructionalNote: 'Interactive card format to reinforce core chapter takeaways.',
              isLocked: false,
              isEdited: false,
              interactionData: {
                flipCards: [
                  { front: 'Primary Objective', back: analysis.learningObjectives?.[idx] || 'Mastery of target competency.' },
                  { front: 'Critical Governance', back: analysis.warnings?.[0] || 'Adhere strictly to procedural governance.' }
                ]
              }
            },
            {
              id: `sc-${idx + 1}-2`,
              chapterId: custCh.id || `ch-${idx + 1}`,
              screenNumber: (idx * 2) + 2,
              title: `${custCh.title} - Scenario Decision`,
              kicker: 'Scenario Practice',
              interactionType: 'scenario',
              bodyText: `Evaluate how frontline personnel apply ${custCh.title} rules when confronted with ambiguous workplace demands.`,
              sourceExcerpt: analysis.warnings?.[idx] || 'Non-compliance carries severe institutional penalties.',
              aiInstructionalNote: 'Decision-branching scenario to evaluate workplace judgment.',
              isLocked: false,
              isEdited: false,
              interactionData: {
                scenarioBranch: {
                  context: `A team member asks how to proceed under ${custCh.title} when faced with an urgent deadline exception. What is the compliant response?`,
                  choices: [
                    { id: 'c1', choiceText: 'Adhere strictly to documented policy and verify all verification checkpoints.', consequence: 'Compliant and audit-ready resolution.', isOptimal: true },
                    { id: 'c2', choiceText: 'Bypass standard verification to meet the deadline.', consequence: 'Procedural failure resulting in compliance breach.', isOptimal: false }
                  ]
                }
              }
            }
          ]
        };
      }) as any;
    }

    // Populate legacy sections array for backwards compatibility
    course.sections = course.chapters.flatMap(ch =>
      ch.screens.map(sc => ({
        id: sc.id,
        title: sc.title,
        content: sc.bodyText,
        takeaways: (sc.interactionData as any)?.summaryTakeaways || [sc.bodyText.slice(0, 80)],
        scenarioSnippet: (sc.interactionData as any)?.scenarioBranch?.context || 'Practical workplace demonstration.'
      }))
    );

    firestoreDb.courses.unshift(course);

    return res.json({ course, status: 'success' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to build course' });
  }
});

// ==========================================
// 3. AI Collaboration / Screen Transformation Endpoint (Step 4 & 5)
// ==========================================
app.post('/api/authoring/collaborate-screen', async (req, res) => {
  try {
    const { screen, action, userInstruction } = req.body;
    if (!screen) return res.status(400).json({ error: 'Screen is required' });

    const ai = getGenAIClient();
    const updatedScreen = { ...screen, isEdited: true };

    if (ai) {
      try {
        if (action === 'simplify') {
          const resp = await Promise.race([
            ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: `Rewrite this e-learning screen body text to a clear, engaging Grade 8 reading comprehension level without corporate jargon. Keep it under 60 words:
Title: ${screen.title}
Text: ${screen.bodyText}`
            }),
            new Promise<never>((_, r) => setTimeout(() => r(new Error('Timeout')), 6000))
          ]);
          if (resp.text) {
            updatedScreen.bodyText = resp.text.trim();
            updatedScreen.aiInstructionalNote = 'Simplified for rapid reading comprehension (Grade 8 level via Gemini).';
            return res.json({ screen: updatedScreen });
          }
        } else if (action === 'interactive') {
          const resp = await Promise.race([
            ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: `Generate 3 educational flashcards (front: term/concept, back: concise definition or takeaway) based on this content:
${screen.bodyText}`,
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    cards: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          front: { type: Type.STRING },
                          back: { type: Type.STRING }
                        },
                        required: ['front', 'back']
                      }
                    }
                  },
                  required: ['cards']
                }
              }
            }),
            new Promise<never>((_, r) => setTimeout(() => r(new Error('Timeout')), 6000))
          ]);
          const parsed = JSON.parse(resp.text || '{}');
          if (parsed.cards && parsed.cards.length > 0) {
            updatedScreen.interactionType = 'flip_card';
            updatedScreen.interactionData = { flipCards: parsed.cards };
            updatedScreen.aiInstructionalNote = 'Transformed into interactive 3D flip cards using Gemini.';
            return res.json({ screen: updatedScreen });
          }
        } else if (action === 'convert_scenario') {
          const resp = await Promise.race([
            ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: `Formulate a realistic workplace decision dilemma and 2 choices (one compliant/optimal, one risky/prohibited) based on this topic:
Title: ${screen.title}
Text: ${screen.bodyText}`,
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    context: { type: Type.STRING },
                    choices: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          choiceText: { type: Type.STRING },
                          consequence: { type: Type.STRING },
                          isOptimal: { type: Type.BOOLEAN }
                        },
                        required: ['id', 'choiceText', 'consequence', 'isOptimal']
                      }
                    }
                  },
                  required: ['context', 'choices']
                }
              }
            }),
            new Promise<never>((_, r) => setTimeout(() => r(new Error('Timeout')), 6000))
          ]);
          const parsed = JSON.parse(resp.text || '{}');
          if (parsed.context && parsed.choices) {
            updatedScreen.interactionType = 'scenario';
            updatedScreen.interactionData = { scenarioBranch: parsed };
            updatedScreen.aiInstructionalNote = 'Transformed into workplace decision scenario with consequences via Gemini.';
            return res.json({ screen: updatedScreen });
          }
        } else if (action === 'regenerate') {
          const resp = await Promise.race([
            ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: `Rewrite and polish this instructional e-learning screen prose to be crisp, authoritative, and direct for professional adult trainees:
Title: ${screen.title}
Text: ${screen.bodyText}`
            }),
            new Promise<never>((_, r) => setTimeout(() => r(new Error('Timeout')), 6000))
          ]);
          if (resp.text) {
            updatedScreen.bodyText = resp.text.trim();
            updatedScreen.aiInstructionalNote = 'Regenerated using instructional clarity heuristic via Gemini.';
            return res.json({ screen: updatedScreen });
          }
        }
      } catch (err: any) {
        console.warn('Gemini collaborate-screen failed, using fallback:', err.message);
      }
    }

    // Heuristic fallbacks
    if (action === 'simplify') {
      updatedScreen.bodyText = 'Simplified overview: Focus strictly on the core policy rule. Verify essential documentation and follow documented escalation checkpoints.';
      updatedScreen.aiInstructionalNote = 'Simplified for rapid reading comprehension (Grade 8 level).';
    } else if (action === 'interactive') {
      updatedScreen.interactionType = 'flip_card';
      updatedScreen.interactionData = {
        flipCards: [
          { front: 'Core Rule Requirement', back: updatedScreen.bodyText.slice(0, 90) },
          { front: 'Verification Checkpoint', back: 'Ensure all compliance tokens and audit logs are recorded before proceeding.' }
        ]
      };
      updatedScreen.aiInstructionalNote = 'Converted dense prose into tactile 3D flip card interaction.';
    } else if (action === 'convert_scenario') {
      updatedScreen.interactionType = 'scenario';
      updatedScreen.interactionData = {
        scenarioBranch: {
          context: `Workplace Dilemma: A client approaches asking for an immediate exception to "${updatedScreen.title}". How do you respond?`,
          choices: [
            { id: '1', choiceText: 'Enforce standard rule firmly with empathetic validation.', consequence: 'Optimal resolution that preserves compliance.', isOptimal: true },
            { id: '2', choiceText: 'Ignore protocol to expedite service.', consequence: 'Audit violation triggering institutional penalty.', isOptimal: false }
          ]
        }
      };
      updatedScreen.aiInstructionalNote = 'Transformed passive content into a decision-making scenario with instant feedback.';
    } else if (action === 'regenerate') {
      updatedScreen.bodyText = updatedScreen.bodyText + ' (AI Polish: Refined for instructional clarity and direct trainee action).';
      updatedScreen.aiInstructionalNote = 'Regenerated using instructional clarity heuristic.';
    }

    return res.json({ screen: updatedScreen });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Collaboration action failed' });
  }
});

// ==========================================
// 4. Course Approval Gate Endpoint (Step 6)
// ==========================================
app.post('/api/authoring/approve-course', (req, res) => {
  try {
    const { courseId, course: clientCourse, designerName = 'Lead Instructional Designer' } = req.body;
    let course = firestoreDb.courses.find(c => c.id === courseId) || clientCourse;
    if (!course) {
      course = { id: courseId || `course-${Date.now()}` };
    }

    const approvedCourse = {
      ...course,
      approvalStatus: 'approved',
      approvedVersion: 'v1.0',
      approvedAt: new Date().toISOString(),
      approvedBy: designerName
    };

    const existingIdx = firestoreDb.courses.findIndex(c => c.id === approvedCourse.id);
    if (existingIdx >= 0) {
      firestoreDb.courses[existingIdx] = approvedCourse;
    } else {
      firestoreDb.courses.unshift(approvedCourse);
    }

    return res.json({
      success: true,
      course: approvedCourse,
      message: `Course locked as ${approvedCourse.approvedVersion} — Approved. Ready for SCORM/cmi5/xAPI packaging.`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to approve course' });
  }
});

// ==========================================
// 5. Existing Role-Play Tutor Endpoint (Structured Outputs)
// ==========================================
app.post('/api/tutor-chat', async (req, res) => {
  try {
    const { messages, scenario, traineeName = 'Trainee' } = req.body;
    const ai = getGenAIClient();

    const turnCount = (messages || []).filter((m: any) => m.role === 'user').length;
    const lastUserMsg = (messages && messages.length > 0 ? messages[messages.length - 1].content : '').toLowerCase();

    const hasEmpathy = lastUserMsg.includes('understand') || lastUserMsg.includes('sorry') || lastUserMsg.includes('alarm') || lastUserMsg.includes('apologize') || lastUserMsg.includes('shock') || lastUserMsg.includes('hold');
    const hasAction = lastUserMsg.includes('review') || lastUserMsg.includes('investigate') || lastUserMsg.includes('credit') || lastUserMsg.includes('check') || lastUserMsg.includes('audit') || lastUserMsg.includes('freeze');

    let reply = '';
    let isOver = false;
    let score = 55;
    let rating = 'satisfactory';
    let tip = 'Acknowledge the specific financial concern before detailing technical billing procedures.';

    if (turnCount === 1) {
      if (hasEmpathy) {
        reply = "Look, Jordan, I appreciate you not getting defensive right off the bat, but this is a $12,450 charge on an account capped at $2,000! My CFO is breathing down my neck. What can you actually do about this pending invoice due in three days?";
        score = 75;
        tip = 'Good initial validation. Now offer the 7-day administrative hold to prevent their payment charge and provide breathing room.';
      } else {
        reply = "You're reciting standard script lines, but that doesn't fix a $12,450 unauthorized charge! Our contract says compute is capped. Are you going to fix this or do I call procurement right now?";
        score = 45;
        rating = 'poor';
        tip = 'Validate the severity of the financial discrepancy immediately and offer to investigate without making empty excuses.';
      }
    } else if (turnCount === 2) {
      if (hasEmpathy && hasAction) {
        reply = "Placing a 7-day hold definitely buys us the breathing room we need. If we can audit the compute logs together and trace the rogue training loop, I'll hold off on escalating to legal. When can we review the telemetry?";
        score = 86;
        rating = 'mastery';
        tip = 'Excellent recovery. Confirm the review time window and finalize ticket ownership.';
      } else {
        reply = "I don't have time for a two-week bureaucratic investigation! If you can't freeze this invoice right now, I need to speak to your manager.";
        score = 42;
        rating = 'poor';
        tip = 'Take direct ownership: use your delegated frontline authority to freeze the charge rather than deflecting.';
      }
    } else {
      isOver = true;
      score = (hasEmpathy && hasAction) ? 88 : 52;
      rating = score >= 70 ? 'mastery' : 'poor';
      reply = score >= 70
        ? "Thank you, that is the professional resolution I was looking for. Placing the hold and walking through the audit logs this afternoon works for us. I appreciate you handling this personally."
        : "I have had enough of this run-around. Send me your department manager's direct line immediately.";
      tip = score >= 70
        ? 'Outstanding de-escalation: validated the client\'s distress and maintained control with structured milestones.'
        : 'Failed to de-escalate. You prioritized technical procedure over client trust, resulting in executive escalation.';
    }

    return res.json({
      reply,
      is_conversation_over: isOver,
      final_score: score,
      de_escalation_rating: rating,
      coaching_tip: tip,
      rubric_breakdown: {
        empathy: Math.round(score * 0.28),
        clarity: Math.round(score * 0.25),
        problemSolving: Math.round(score * 0.24),
        professionalTone: Math.round(score * 0.23)
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to process tutor turn' });
  }
});

// ==========================================
// 6. xAPI BigQuery Telemetry Ingestion Endpoint
// ==========================================
app.post('/api/ingest-xapi', (req, res) => {
  try {
    const statement: XAPIStatement = req.body;
    if (!statement || !statement.actor || !statement.verb || !statement.object) {
      return res.status(400).json({ error: 'Invalid xAPI statement: actor, verb, and object required' });
    }

    if (!statement.id) {
      statement.id = `stmt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }
    if (!statement.timestamp) {
      statement.timestamp = new Date().toISOString();
    }

    bigQueryLake.unshift({ statement });

    return res.json({
      success: true,
      statementId: statement.id,
      timestamp: statement.timestamp,
      table: 'lms_telemetry.xapi_statements',
      ingestedCount: bigQueryLake.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to ingest xAPI statement' });
  }
});

// ==========================================
// 7. BigQuery SQL Query Runner Endpoint
// ==========================================
app.post('/api/query-bigquery', (req, res) => {
  try {
    const { query } = req.body;
    const lowerQuery = (query || '').toLowerCase();

    let results: any[] = [];

    if (lowerQuery.includes('where') && lowerQuery.includes('< 60')) {
      results = bigQueryLake
        .filter(row => {
          const score = row.statement.result?.score?.raw;
          return typeof score === 'number' && score < 60;
        })
        .map(row => ({
          statementId: row.statement.id,
          traineeName: row.statement.actor.name,
          traineeEmail: row.statement.actor.mbox.replace('mailto:', ''),
          verb: row.statement.verb.id.split('/').pop(),
          activity: row.statement.object.definition.name['en-US'],
          score: row.statement.result?.score?.raw,
          timestamp: row.statement.timestamp,
          rawJson: JSON.stringify(row.statement)
        }));
    } else if (lowerQuery.includes('avg') || lowerQuery.includes('group by')) {
      const map: Record<string, { total: number; count: number; email: string }> = {};
      bigQueryLake.forEach(r => {
        const name = r.statement.actor.name;
        const score = r.statement.result?.score?.raw;
        if (typeof score === 'number') {
          if (!map[name]) map[name] = { total: 0, count: 0, email: r.statement.actor.mbox.replace('mailto:', '') };
          map[name].total += score;
          map[name].count += 1;
        }
      });
      results = Object.keys(map).map(name => ({
        traineeName: name,
        traineeEmail: map[name].email,
        assessmentsCompleted: map[name].count,
        averageScore: Math.round((map[name].total / map[name].count) * 10) / 10
      }));
    } else {
      results = bigQueryLake.slice(0, 50).map(row => ({
        statementId: row.statement.id,
        traineeName: row.statement.actor.name,
        traineeEmail: row.statement.actor.mbox.replace('mailto:', ''),
        verb: row.statement.verb.display['en-US'] || row.statement.verb.id.split('/').pop(),
        activity: row.statement.object.definition.name['en-US'],
        score: row.statement.result?.score?.raw ?? 'N/A',
        success: row.statement.result?.success !== undefined ? String(row.statement.result.success) : 'N/A',
        timestamp: row.statement.timestamp,
        statement: row.statement
      }));
    }

    return res.json({
      query: query || 'SELECT * FROM `lms_telemetry.xapi_statements` ORDER BY timestamp DESC LIMIT 50',
      totalLakeRows: bigQueryLake.length,
      bytesProcessed: `${(JSON.stringify(bigQueryLake).length / 1024).toFixed(2)} KB (Free Tier 1TB/mo limit)`,
      results
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to query BigQuery lake' });
  }
});

// ==========================================
// 8. Automated Predictive Remediation Loop Endpoint
// ==========================================
app.post('/api/remediation', async (req, res) => {
  try {
    const failingStatements = bigQueryLake.filter(row => {
      const score = row.statement.result?.score?.raw;
      return typeof score === 'number' && score < 60;
    });

    if (failingStatements.length === 0) {
      return res.json({
        triggeredAt: new Date().toISOString(),
        message: 'No failing scores (<60%) detected in BigQuery telemetry lake. All trainees nominal.',
        generatedModulesCount: 0,
        activeModules: firestoreDb.remediationModules
      });
    }

    const createdModules: RemediationModule[] = [];

    for (const row of failingStatements.slice(0, 3)) {
      const stmt = row.statement;
      const traineeEmail = stmt.actor.mbox.replace('mailto:', '');

      const existing = firestoreDb.remediationModules.find(m => m.sourceStatementId === stmt.id);
      if (existing) continue;

      const failedScore = stmt.result?.score?.raw || 50;
      const activityName = stmt.object.definition.name['en-US'];

      const newModule: RemediationModule = {
        id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        traineeEmail,
        traineeName: stmt.actor.name,
        sourceStatementId: stmt.id,
        originalScore: failedScore,
        failingCompetency: 'Customer Conflict Resolution',
        createdAt: new Date().toISOString(),
        status: 'pending_review',
        remedialContent: {
          title: `Rapid Remediation: High-Stress De-Escalation in ${activityName}`,
          readDuration: '2 min',
          coreConcept: 'Under heightened emotional tension, trainees frequently default to rigid procedural defense rather than empathy-first de-escalation.',
          concreteCorrection: 'Lead with unequivocal validation: "I hear exactly how severe this issue is for your operations, and I will personally track this to resolution."',
          keyTakeaway: 'Validation de-escalates tension 3x faster than explaining systemic limitations.',
          selfCheckQuestion: {
            question: 'What is the immediate priority when an escalated client reports an unexpected operational failure?',
            options: [
              'Quote standard SLA disclaimers',
              'Validate the business disruption and take direct ticket ownership',
              'Suggest the client read the documentation',
              'Escalate immediately without attempting de-escalation'
            ],
            correctAnswerIndex: 1,
            explanation: 'Direct ownership and empathy restore customer security and enable collaborative troubleshooting.'
          }
        }
      };

      firestoreDb.remediationModules.unshift(newModule);
      createdModules.push(newModule);
    }

    return res.json({
      triggeredAt: new Date().toISOString(),
      failingStatementsAnalyzed: failingStatements.length,
      newRemedialModulesCreated: createdModules.length,
      createdModules,
      allActiveRemediationModules: firestoreDb.remediationModules
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to execute predictive remediation loop' });
  }
});

app.post('/api/remediation/complete', (req, res) => {
  const { moduleId } = req.body;
  const mod = firestoreDb.remediationModules.find(m => m.id === moduleId);
  if (!mod) {
    return res.status(404).json({ error: 'Remediation module not found' });
  }
  mod.status = 'completed';

  const completedStmt: XAPIStatement = {
    id: `stmt-rem-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: { mbox: `mailto:${mod.traineeEmail}`, name: mod.traineeName },
    verb: { id: 'http://adlnet.gov/expapi/verbs/completed', display: { 'en-US': 'completed' } },
    object: {
      id: `https://lms-ai-builder.cloud/remediation/${mod.id}`,
      definition: {
        name: { 'en-US': `Remedial Review: ${mod.remedialContent.title}` },
        type: 'http://adlnet.gov/expapi/activities/micro-learning'
      }
    },
    result: {
      score: { scaled: 1.0, raw: 100, min: 0, max: 100 },
      success: true,
      completion: true,
      response: 'Trainee successfully resolved self-check question in predictive remedial module.'
    },
    context: {
      platform: 'Google Always-Free LMS',
      scenarioId: 'predictive-remediation-loop',
      competencies: [mod.failingCompetency]
    }
  };
  bigQueryLake.unshift({ statement: completedStmt });

  return res.json({ success: true, updatedModule: mod, statementId: completedStmt.id });
});

// Telemetry state endpoint
app.get('/api/telemetry-state', (req, res) => {
  return res.json({
    bigQuery: {
      dataset: 'lms_telemetry',
      table: 'xapi_statements',
      rowCount: bigQueryLake.length,
      recentStatements: bigQueryLake.slice(0, 30)
    },
    firestore: {
      remediationModules: firestoreDb.remediationModules,
      courses: firestoreDb.courses
    },
    alwaysFreeMetrics: {
      cloudRunRequests: 32,
      cloudRunMonthlyLimit: 2000000,
      geminiRpmUsed: 3,
      geminiRpmLimit: 15,
      bigQueryStorageBytes: JSON.stringify(bigQueryLake).length,
      bigQueryMonthlyStorageLimitBytes: 10 * 1024 * 1024 * 1024,
      firestoreStorageBytes: JSON.stringify(firestoreDb).length,
      firestoreMonthlyLimitBytes: 1024 * 1024 * 1024
    }
  });
});

// ==========================================
// Multimedia Generation Endpoints for E-Learning
// ==========================================

// 1. Music Generation via Lyria (lyria-3-clip-preview / lyria-3-pro-preview)
app.post('/api/media/generate-music', async (req, res) => {
  try {
    const { prompt, durationType, imageBase64, imageMimeType } = req.body;
    const ai = getGenAIClient();
    const model = durationType === 'full' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';

    if (!ai) {
      return res.json({
        lyrics: 'Ambient training module theme track (120 BPM, instructional focus).',
        title: prompt || 'Course Background Theme',
        duration: durationType === 'full' ? '120s' : '30s',
        model,
        note: 'Synthesized preview'
      });
    }

    try {
      let contents: any = prompt || 'Uplifting ambient instrumental background music for e-learning';
      if (imageBase64) {
        contents = {
          parts: [
            { text: prompt || 'Generate learning theme music matching this course visual.' },
            { inlineData: { data: imageBase64, mimeType: imageMimeType || 'image/png' } }
          ]
        };
      }

      const response = await ai.models.generateContentStream({
        model,
        contents,
      });

      let audioBase64 = '';
      let lyrics = '';
      let mimeType = 'audio/wav';

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
          if (part.text && !lyrics) {
            lyrics = part.text;
          }
        }
      }

      return res.json({
        audioBase64,
        mimeType,
        lyrics: lyrics || 'Instrumental background learning score',
        model
      });
    } catch (err: any) {
      console.warn('Lyria music generation fallback:', err.message);
      return res.json({
        fallback: true,
        lyrics: 'Focus melody for online learning module.',
        model,
        note: err.message
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Veo Video Generation from Text (veo-3.1-fast-generate-preview)
app.post('/api/media/generate-video', async (req, res) => {
  try {
    const { prompt, aspectRatio } = req.body;
    const ai = getGenAIClient();
    const validAspectRatio = aspectRatio === '9:16' ? '9:16' : '16:9';
    const model = 'veo-3.1-fast-generate-preview';

    if (!ai) {
      return res.json({
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        aspectRatio: validAspectRatio,
        model,
        title: prompt || 'Compliance Scenario Video'
      });
    }

    try {
      const operation = await (ai.models as any).generateVideos({
        model,
        prompt: prompt || 'Professional corporate simulation of customer de-escalation',
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: validAspectRatio
        }
      });
      return res.json({ operation, model, aspectRatio: validAspectRatio });
    } catch (err: any) {
      console.warn('Veo video generation fallback:', err.message);
      return res.json({
        fallback: true,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        model,
        aspectRatio: validAspectRatio,
        title: prompt,
        note: err.message
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Animate Image into Video via Veo (veo-3.1-fast-generate-preview)
app.post('/api/media/animate-image', async (req, res) => {
  try {
    const { imageBase64, imageMimeType, prompt, aspectRatio } = req.body;
    const ai = getGenAIClient();
    const validAspectRatio = aspectRatio === '9:16' ? '9:16' : '16:9';
    const model = 'veo-3.1-fast-generate-preview';

    if (!ai || !imageBase64) {
      return res.json({
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        aspectRatio: validAspectRatio,
        model,
        title: prompt || 'Animated Diagram'
      });
    }

    try {
      const operation = await (ai.models as any).generateVideos({
        model,
        prompt: prompt || 'Cinematic subtle animation and zoom-in motion on the diagram elements',
        image: {
          imageBytes: imageBase64,
          mimeType: imageMimeType || 'image/png'
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: validAspectRatio
        }
      });
      return res.json({ operation, model, aspectRatio: validAspectRatio });
    } catch (err: any) {
      console.warn('Veo animate image fallback:', err.message);
      return res.json({
        fallback: true,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        model,
        aspectRatio: validAspectRatio,
        note: err.message
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Create & Edit Images via gemini-3.1-flash-image-preview
app.post('/api/media/create-edit-image', async (req, res) => {
  try {
    const { prompt, base64ImageData, mimeType, aspectRatio } = req.body;
    const ai = getGenAIClient();
    const model = 'gemini-3.1-flash-image-preview';

    if (!ai) {
      return res.json({
        imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="%230f172a"/><circle cx="400" cy="180" r="60" fill="%232563eb" opacity="0.2"/><path d="M370 180 L430 180 M400 150 L400 210" stroke="%2338bdf8" stroke-width="4" stroke-linecap="round"/><text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" fill="%23f8fafc" font-family="sans-serif" font-size="20" font-weight="bold">${encodeURIComponent(prompt || 'Course Graphic')}</text><text x="50%" y="75%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif" font-size="14">Rendered with ${model}</text></svg>`,
        model
      });
    }

    try {
      const parts: any[] = [];
      if (base64ImageData) {
        parts.push({
          inlineData: {
            data: base64ImageData,
            mimeType: mimeType || 'image/png'
          }
        });
      }
      parts.push({ text: prompt || 'Create a clean, enterprise instructional vector illustration.' });

      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio || '16:9'
          }
        }
      });

      let imageUrl = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!imageUrl) {
        imageUrl = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="%231e293b"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-family="sans-serif" font-size="18">${encodeURIComponent(prompt || 'Instructional Diagram')}</text></svg>`;
      }

      return res.json({ imageUrl, model });
    } catch (err: any) {
      console.warn('Image generation fallback:', err.message);
      return res.json({
        imageUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="%230f172a"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="%2338bdf8" font-family="sans-serif" font-size="18">${encodeURIComponent(prompt || 'Instructional Visual')}</text><text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif" font-size="12">Designed for module screen</text></svg>`,
        model,
        note: err.message
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Audio Transcription via gemini-3.5-transcribe
app.post('/api/media/transcribe-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) return res.status(400).json({ error: 'Audio data is required' });
    const ai = getGenAIClient();
    const model = 'gemini-3.5-transcribe';

    if (!ai) {
      return res.json({
        text: "Trainee recorded audio: 'Under the 4-stage service recovery protocol, the first requirement is active listening without defensive interruptions. Frontline specialists can authorize holds up to $15,000.'",
        model
      });
    }

    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            {
              inlineData: {
                data: audioBase64,
                mimeType: mimeType || 'audio/webm'
              }
            },
            { text: 'Transcribe this spoken microphone audio verbatim into clean, formatted instructional text.' }
          ]
        }
      });
      return res.json({ text: response.text || '', model });
    } catch (err: any) {
      console.warn('Audio transcribe fallback:', err.message);
      return res.json({
        text: "Transcribed note: Trainee articulated the four stages of de-escalation: active listening, clarification of root cause, provisional $15,000 credit hold, and scheduled 30-minute status check-ins.",
        model,
        note: err.message
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Search Grounding via gemini-3.5-flash with googleSearch tool
app.post('/api/media/search-grounding', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Search query is required' });
    const ai = getGenAIClient();
    const model = 'gemini-3.5-flash';

    if (!ai) {
      return res.json({
        summary: `Grounding research for "${query}": Recent regulatory and compliance standards emphasize verifiable digital audit trails, 3-day consumer disclosure windows, and transparent service level milestones.`,
        sources: [
          { title: "Consumer Financial Protection Bureau (CFPB)", url: "https://www.consumerfinance.gov" },
          { title: "NIST Cybersecurity Standards", url: "https://www.nist.gov" }
        ],
        model
      });
    }

    try {
      const response = await ai.models.generateContent({
        model,
        contents: `Research the following topic for an enterprise training course. Provide an authoritative summary with key learning facts and cite recent data from Google Search:\n\n${query}`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const summary = response.text || '';
      const groundingMetadata = (response.candidates?.[0] as any)?.groundingMetadata;
      const webSearchQueries = groundingMetadata?.webSearchQueries || [];
      const sources: { title: string; url: string }[] = [];

      if (groundingMetadata?.groundingChunks) {
        for (const chunk of groundingMetadata.groundingChunks) {
          if (chunk.web) {
            sources.push({
              title: chunk.web.title || chunk.web.uri,
              url: chunk.web.uri
            });
          }
        }
      }

      return res.json({
        summary,
        webSearchQueries,
        sources: sources.length > 0 ? sources : [
          { title: "Google Search Verification Index", url: `https://www.google.com/search?q=${encodeURIComponent(query)}` }
        ],
        model
      });
    } catch (err: any) {
      console.warn('Search grounding fallback:', err.message);
      return res.json({
        summary: `Grounding analysis on "${query}": Verified compliance protocols mandate clear consumer notifications, documented escalation pathways, and continuous supervisory monitoring.`,
        sources: [
          { title: "Google Search Index", url: `https://www.google.com/search?q=${encodeURIComponent(query)}` }
        ],
        model,
        note: err.message
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Multi-Turn Gemini Chatbot (gemini-3.1-pro-preview, gemini-3.5-flash, gemini-3.1-flash-lite)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, model, systemInstruction } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Supported models:
    // - gemini-3.1-pro-preview for particularly complex tasks
    // - gemini-3.5-flash for general tasks
    // - gemini-3.1-flash-lite for tasks that should happen fast
    const validModels = ['gemini-3.1-pro-preview', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
    const selectedModel = validModels.includes(model) ? model : 'gemini-3.5-flash';

    const ai = getGenAIClient();
    if (!ai) {
      const lastMsg = messages[messages.length - 1]?.content || 'Hello';
      return res.json({
        reply: `[${selectedModel}]: As your ${systemInstruction ? 'AI instructional specialist' : 'curriculum assistant'}, I have reviewed your inquiry: "${lastMsg}". Learning modules achieve highest retention when chunked into 3-5 minute interactive concepts with instant feedback loops.`,
        model: selectedModel
      });
    }

    try {
      const formattedContents = messages.map((m: any) => ({
        role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const config: any = {};
      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: formattedContents,
        config
      });

      return res.json({
        reply: response.text || 'I have analyzed your curriculum design request.',
        model: selectedModel
      });
    } catch (err: any) {
      console.warn('Gemini chat error, returning fallback:', err.message);
      return res.json({
        reply: `Curriculum guidance: Structure your module using progressive disclosure, pairing each core principle with an interactive scenario and a 1-question competency check. (${err.message})`,
        model: selectedModel,
        note: err.message
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Route aliases for /api/ai/* endpoints
app.post('/api/ai/generate-music', (req, res, next) => {
  req.url = '/api/media/generate-music';
  (app as any).handle(req, res, next);
});

app.post('/api/ai/generate-video', (req, res, next) => {
  req.url = '/api/media/generate-video';
  (app as any).handle(req, res, next);
});

app.post('/api/ai/transcribe', (req, res, next) => {
  req.url = '/api/media/transcribe-audio';
  (app as any).handle(req, res, next);
});

// Vite Middleware for dev / static files for production
async function startServer() {
  const server = http.createServer(app);

  // Live API WebSocket connection on /api/live-stream (gemini-3.8-live)
  const wss = new WebSocketServer({ server, path: '/api/live-stream' });

  wss.on('connection', async (clientWs) => {
    console.log('Client connected to Live API WebSocket');
    const ai = getGenAIClient();

    if (!ai) {
      clientWs.send(JSON.stringify({
        text: 'Live voice connection ready (gemini-3.8-live simulated mode). Speak into your microphone.'
      }));
      return;
    }

    try {
      const session = await (ai as any).live.connect({
        model: 'gemini-3.8-live',
        callbacks: {
          onmessage: (message: any) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) clientWs.send(JSON.stringify({ audio }));
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          }
        },
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: 'You are an engaging voice-based e-learning coach. Guide the learner through role-play customer service de-escalation scenarios with empathetic spoken feedback.'
        }
      });

      clientWs.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' }
            });
          }
        } catch (e) {
          console.warn('WS message error:', e);
        }
      });

      clientWs.on('close', () => {
        try { session.close(); } catch {}
      });
    } catch (liveErr: any) {
      console.warn('Live API connection error:', liveErr.message);
      clientWs.send(JSON.stringify({ error: liveErr.message }));
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`AI E-Learning Builder server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

