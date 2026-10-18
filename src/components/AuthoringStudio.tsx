import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import {
  Upload, Sparkles, FileText, CheckCircle2, ChevronRight, Lock, Unlock,
  Play, Download, RefreshCw, Eye, Edit3, Plus, Trash2, ArrowRight,
  Layers, Sliders, Check, HelpCircle, AlertTriangle, ShieldCheck,
  BookOpen, Compass, CornerDownRight, FileCode, SplitSquareVertical,
  FileCheck, X, FileUp, File, Mic, Square, Radio, Activity, TrendingUp, Zap
} from 'lucide-react';
import { Course, CourseChapter, CourseScreen, ContentAnalysis, BrandTheme } from '../types/lms';
import {
  createScorm12PackageZip,
  createCmi5PackageZip,
  createXapiBundleZip,
  generateCourseHtml
} from '../lib/scormGenerator';

interface AuthoringStudioProps {
  currentCourse: Course | null;
  onCourseUpdated: (course: Course) => void;
  onXapiEmitted: (statement: any) => void;
  forceStep?: number | null;
  onClearForceStep?: () => void;
  onPublishToLms?: (course: Course) => void;
  onViewInLearnerPortal?: (course: Course) => void;
}

const PRESET_DOCUMENTS = [
  {
    id: 'home-loan',
    title: 'Home Loan Basics & Underwriting SOP',
    type: 'Policy / Underwriting SOP',
    text: `HOME LOAN UNDERWRITING AND CONVENTIONAL QUALIFICATION STANDARD (BANK-MORT-301)

1. PURPOSE & QUALIFIED MORTGAGE SCOPE
This document outlines standard conforming lending criteria for residential real estate mortgages under CFPB Qualified Mortgage (QM) safe harbor rules.

2. LOAN PRODUCT CLASSIFICATIONS
- 30-Year & 15-Year Fixed-Rate: Principal and interest payment remains identical over the full amortization period. Recommended for borrowers with long-term tenure intent.
- 5/1 and 7/1 Adjustable-Rate Mortgages (ARM): Introductory interest rate fixed for 5 or 7 years, then adjusts annually based on the 30-day average Secured Overnight Financing Rate (SOFR) index with a 2/1/5 cap structure.
- Government-Backed (FHA & VA): Minimum down payments as low as 3.5% for FHA borrowers, requiring upfront and annual Mortgage Insurance Premiums (MIP).

3. MANDATORY BORROWER ELIGIBILITY RATIOS
- Debt-to-Income (DTI) Ceiling: Back-end DTI (total monthly housing expense plus all recurring monthly credit obligations divided by gross monthly income) must not exceed 43%.
- Loan-to-Value (LTV) Ratios: Conforming loans exceeding 80% LTV require Private Mortgage Insurance (PMI) until principal amortization or home appraisal verification achieves 20% equity.

4. ASSET VERIFICATION & SOURCE OF FUNDS
- Minimum 24 months of stable employment and income verification via IRS Form W-2s and signed 1040 returns.
- Unpapered or unexplained cash deposits exceeding $1,000 are strictly prohibited from reserve calculations under Anti-Money Laundering (AML) and USA PATRIOT Act regulations.
- Gift funds are permissible only when accompanied by a formally signed Gift Letter confirming no repayment is expected or implied.

5. TRID TIMING AND CLOSING DISCLOSURE MANDATE
The lender must deliver the Closing Disclosure (CD) at least 3 business days prior to loan consummation.`
  },
  {
    id: 'customer-deescalation',
    title: 'Customer Escalation & Service Recovery Framework',
    type: 'Operations SOP',
    text: `CUSTOMER SERVICE RESOLUTION AND DE-ESCALATION STANDARD (SOP-402)
1. PURPOSE & PRINCIPLES
When customers experience significant service disruptions, operational failures, or billing discrepancies, frontline personnel must prioritize human empathy and de-escalation over rigid bureaucracy.

2. THE 4-STAGE RECOVERY FRAMEWORK
- Stage 1: Active Validation. Listen without interrupting. Acknowledge emotional and practical business distress. Never tell a client to "calm down".
- Stage 2: Clarification & Diagnostic. Ask focused questions to confirm the root failure. Distinguish between systemic platform bugs and configuration misunderstandings.
- Stage 3: Immediate Provisional Remedy. Offer immediate authorized holds or interim workarounds. Frontline reps are empowered to place a temporary 7-day hold on disputed charges up to $15,000 without prior executive approval.
- Stage 4: Transparent Resolution & Milestones. Commit to structured 30-minute status check-ins during active P1 outages.

3. PROHIBITED PHRASES
- "That is against company policy." (Replace with: "Here is the highest resolution I can approve right now.")
- "I just work support." (Replace with: "I am taking personal ownership of this ticket.")

4. TELEMETRY & COMPLIANCE
All customer escalations and resolutions must emit standardized xAPI statements to the central telemetry lake for audit compliance and predictive quality retraining.`
  },
  {
    id: 'cybersecurity',
    title: 'Zero-Trust Incident & Phishing Response SOP',
    type: 'Security Protocol',
    text: `INFORMATION SECURITY & ZERO-TRUST INCIDENT PROTOCOL (SEC-801)
1. INCIDENT TRIAGE MANDATE
Employees must report suspicious emails, credential prompts, or unexpected OAuth authorization screens within 15 minutes of occurrence.

2. CONTAINMENT WORKFLOW
- Step 1: Disconnect device from local enterprise Wi-Fi immediately.
- Step 2: Trigger Emergency Session Revocation in the Identity Provider console to invalidate all active refresh tokens.
- Step 3: Notify the Security Operations Center (SOC) using out-of-band communication (secure telephone line, not compromised email).

3. PROHIBITED ACTIONS
- Do not forward phishing emails to colleagues for verification.
- Do not attempt to reply to the attacker or run diagnostic scripts independently.`
  }
];

const BRAND_THEMES: BrandTheme[] = [
  { id: 'enterprise-blue', name: 'Google Enterprise', primaryColor: '#1A73E8', accentColor: '#34A853', fontFamily: 'Plus Jakarta Sans' },
  { id: 'finance-navy', name: 'Financial Trust', primaryColor: '#0F52BA', accentColor: '#D4AF37', fontFamily: 'Plus Jakarta Sans' },
  { id: 'clinical-teal', name: 'Clinical Healthcare', primaryColor: '#0D9488', accentColor: '#0284C7', fontFamily: 'Plus Jakarta Sans' },
  { id: 'cyber-dark', name: 'Cyber Intelligence', primaryColor: '#4F46E5', accentColor: '#06B6D4', fontFamily: 'Plus Jakarta Sans' }
];

// Helper to extract clean text from any uploaded document (DOCX, PPTX, PDF, TXT, MD, JSON)
async function extractTextFromAnyFile(file: File): Promise<{ text: string; wordCount: number }> {
  const fileName = file.name.toLowerCase();

  // 1. Word Document (.docx)
  if (fileName.endsWith('.docx')) {
    try {
      const zip = await JSZip.loadAsync(file);
      const docXml = await zip.file('word/document.xml')?.async('text');
      if (docXml) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(docXml, 'text/xml');
        const paragraphs = Array.from(xml.getElementsByTagName('w:p'));
        const lines = paragraphs.map(p => {
          const texts = Array.from(p.getElementsByTagName('w:t'));
          return texts.map(t => t.textContent).join('');
        }).filter(line => line.trim().length > 0);
        const text = lines.join('\n\n');
        return { text, wordCount: text.split(/\s+/).filter(Boolean).length };
      }
    } catch (e) {
      console.warn('DOCX extraction fallback', e);
    }
  }

  // 2. PowerPoint Presentation (.pptx)
  if (fileName.endsWith('.pptx')) {
    try {
      const zip = await JSZip.loadAsync(file);
      const slideFiles = Object.keys(zip.files)
        .filter(k => k.startsWith('ppt/slides/slide') && k.endsWith('.xml'))
        .sort();
      const allSlideTexts: string[] = [];
      for (const slidePath of slideFiles) {
        const slideXml = await zip.file(slidePath)?.async('text');
        if (slideXml) {
          const parser = new DOMParser();
          const xml = parser.parseFromString(slideXml, 'text/xml');
          const textNodes = Array.from(xml.getElementsByTagName('a:t'));
          const slideText = textNodes.map(t => t.textContent).join(' ');
          if (slideText.trim()) {
            allSlideTexts.push(`--- Slide ${slidePath.replace(/[^0-9]/g, '')} ---\n${slideText}`);
          }
        }
      }
      if (allSlideTexts.length > 0) {
        const text = allSlideTexts.join('\n\n');
        return { text, wordCount: text.split(/\s+/).filter(Boolean).length };
      }
    } catch (e) {
      console.warn('PPTX extraction fallback', e);
    }
  }

  // 3. PDF (.pdf) - Uses Gemini multimodal extraction via server endpoint
  if (fileName.endsWith('.pdf')) {
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const base64Data = res.split(',')[1] || res;
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/authoring/extract-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: base64,
          mimeType: 'application/pdf',
          fileName: file.name
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text && data.text.trim().length > 0) {
          return { text: data.text, wordCount: data.wordCount || data.text.split(/\s+/).filter(Boolean).length };
        }
      }
    } catch (pdfErr) {
      console.warn('Multimodal PDF extraction fallback', pdfErr);
    }
  }

  // 4. Fallback / Plain text reader (TXT, Markdown, CSV, JSON, HTML, Script)
  try {
    const text = await file.text();
    return { text, wordCount: text.split(/\s+/).filter(Boolean).length };
  } catch (err) {
    return { text: `Uploaded content from ${file.name}`, wordCount: 4 };
  }
}

export const AuthoringStudio: React.FC<AuthoringStudioProps> = ({
  currentCourse,
  onCourseUpdated,
  onXapiEmitted,
  forceStep,
  onClearForceStep,
  onPublishToLms,
  onViewInLearnerPortal
}) => {
  // Authoring lifecycle stages:
  // 1: Upload -> 2: Analyse -> 3: Structure -> 4: Studio (Review/Edit) -> 5: Approve -> 6: Package & Distribute
  const [lifecycleStep, setLifecycleStep] = useState<number>(currentCourse ? 4 : 1);

  // Sync if parent requests specific step (e.g. Upload button in top bar)
  React.useEffect(() => {
    if (forceStep) {
      setLifecycleStep(forceStep);
      if (forceStep === 1) {
        setActiveInputTab('upload');
      }
      if (onClearForceStep) onClearForceStep();
    }
  }, [forceStep, onClearForceStep]);

  // Step 1: Input source state
  const [rawText, setRawText] = useState<string>(PRESET_DOCUMENTS[0].text);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('home-loan');
  const [selectedTheme, setSelectedTheme] = useState<BrandTheme>(BRAND_THEMES[0]);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{ name: string; size: string; type: string; wordCount: number } | null>(null);
  const [isReadingFile, setIsReadingFile] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [activeInputTab, setActiveInputTab] = useState<'upload' | 'templates' | 'paste' | 'voice'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio recording & Speech-to-Text state (gemini-3.5-transcribe)
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [isVoiceTranscribing, setIsVoiceTranscribing] = useState(false);
  const voiceMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceAudioChunksRef = useRef<Blob[]>([]);

  const handleStartVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      voiceMediaRecorderRef.current = recorder;
      voiceAudioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) voiceAudioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(voiceAudioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          setIsVoiceTranscribing(true);
          try {
            const res = await fetch('/api/media/transcribe-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64Data, mimeType: 'audio/webm' })
            });
            const data = await res.json();
            if (data.text) {
              setRawText(data.text);
              setUploadedFileInfo({
                name: 'Microphone Spoken Lecture.webm',
                size: `${Math.round(audioBlob.size / 1024)} KB`,
                type: 'Spoken Audio Lecture (gemini-3.5-transcribe)',
                wordCount: data.text.split(/\s+/).filter(Boolean).length
              });
            }
          } catch (err: any) {
            setStudioNotice({ text: 'Voice transcription error: ' + err.message, type: 'error' });
          } finally {
            setIsVoiceTranscribing(false);
          }
        };
      };

      recorder.start();
      setIsVoiceRecording(true);
    } catch (err: any) {
      setStudioNotice({ text: 'Microphone access denied or unavailable: ' + err.message, type: 'error' });
    }
  };

  const handleStopVoiceRecording = () => {
    if (voiceMediaRecorderRef.current && isVoiceRecording) {
      voiceMediaRecorderRef.current.stop();
      setIsVoiceRecording(false);
    }
  };

  // Step 2: Content Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(currentCourse?.analysis || null);
  const [showSourceDiff, setShowSourceDiff] = useState<boolean>(false);
  const [studioNotice, setStudioNotice] = useState<{ text: string; type: 'info' | 'error' } | null>(null);

  // Step 3: Structure Outline state
  const [isGeneratingCourse, setIsGeneratingCourse] = useState<boolean>(false);
  const [customChapters, setCustomChapters] = useState<{ id: string; title: string; description: string }[]>([
    { id: 'ch-1', title: 'Chapter 1: Types of Home Loans', description: 'Fixed-Rate, ARM, and FHA government loan structures' },
    { id: 'ch-2', title: 'Chapter 2: Underwriting Workflow & Verification', description: 'DTI ratios, asset validation, and TRID disclosure timing' }
  ]);

  // Step 4: 3-Pane Studio state
  const [selectedScreenCoord, setSelectedScreenCoord] = useState<{ chapterIdx: number; screenIdx: number }>({ chapterIdx: 0, screenIdx: 0 });
  const [isCollaborating, setIsCollaborating] = useState<boolean>(false);
  const [showTelemetryInsights, setShowTelemetryInsights] = useState<boolean>(false);

  // Telemetry-driven course improvement / remediation handler
  const handleAddTelemetryRemediation = (targetChapterIdx: number = 1) => {
    if (!currentCourse) return;
    const targetIdx = Math.min(targetChapterIdx, currentCourse.chapters.length - 1);
    const ch = currentCourse.chapters[targetIdx] || currentCourse.chapters[0];
    if (!ch) return;

    // Check if remediation already exists
    const existingIdx = ch.screens.findIndex(s => s.kicker?.includes('Remediation') || s.id.includes('remediation'));
    if (existingIdx >= 0) {
      setSelectedScreenCoord({ chapterIdx: targetIdx, screenIdx: existingIdx });
      setShowTelemetryInsights(false);
      return;
    }

    const newScreen: CourseScreen = {
      id: `sc-ai-remediation-${Date.now()}`,
      chapterId: ch.id,
      screenNumber: ch.screens.length + 1,
      title: 'Practical Scenario: TRID 3-Day Rule in Practice',
      kicker: 'AI Recommended Remediation',
      interactionType: 'scenario',
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
    };

    const updatedChapters = currentCourse.chapters.map((c, idx) => {
      if (idx === targetIdx) {
        return {
          ...c,
          screens: [...c.screens, newScreen]
        };
      }
      return c;
    });

    const updatedCourse = {
      ...currentCourse,
      chapters: updatedChapters
    };

    onCourseUpdated(updatedCourse);
    setSelectedScreenCoord({ chapterIdx: targetIdx, screenIdx: ch.screens.length });
    setShowTelemetryInsights(false);
  };

  // Packaging state
  const [isPackaging, setIsPackaging] = useState<string | null>(null);
  const [hasPublishedToLms, setHasPublishedToLms] = useState<boolean>(false);
  const [lrsEndpoint, setLrsEndpoint] = useState<string>('https://lrs.example.corp/xAPI/');
  const [lrsAuthKey, setLrsAuthKey] = useState<string>('Basic dXNlcm5hbWU6cGFzc3dvcmQ=');

  // Handle preset selection
  const handleSelectPreset = (docId: string) => {
    setSelectedPresetId(docId);
    const doc = PRESET_DOCUMENTS.find(d => d.id === docId);
    if (doc) {
      setRawText(doc.text);
      if (docId === 'home-loan') {
        setSelectedTheme(BRAND_THEMES[1]); // Finance
        setCustomChapters([
          { id: 'ch-1', title: 'Chapter 1: Types of Home Loans', description: 'Fixed-Rate, ARM, and FHA government loan structures' },
          { id: 'ch-2', title: 'Chapter 2: Underwriting Workflow & Verification', description: 'DTI ratios, asset validation, and TRID disclosure timing' }
        ]);
      } else {
        setSelectedTheme(BRAND_THEMES[0]); // Enterprise
        setCustomChapters([
          { id: 'ch-1', title: 'Chapter 1: De-Biasing & Empathetic Validation', description: 'Cognitive distress pacing and 4-stage recovery' },
          { id: 'ch-2', title: 'Chapter 2: Financial Autonomy & Incident Scenarios', description: 'Delegated holds and real-time de-escalation' }
        ]);
      }
    }
  };

  // File upload processing for any document format (PDF, DOCX, PPTX, TXT, MD, etc.)
  const handleFileProcess = async (file: File) => {
    setIsReadingFile(true);
    try {
      const { text, wordCount } = await extractTextFromAnyFile(file);

      setRawText(text);
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${Math.round(file.size / 1024)} KB`;
      setUploadedFileInfo({
        name: file.name,
        size: sizeStr,
        type: file.type || file.name.split('.').pop()?.toUpperCase() || 'DOCUMENT',
        wordCount
      });
      setActiveInputTab('upload');
    } catch (err: any) {
      setStudioNotice({ text: 'Could not read file: ' + err.message, type: 'error' });
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileProcess(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleClearUploadedFile = () => {
    setUploadedFileInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setRawText(PRESET_DOCUMENTS[0].text);
  };

  // Step 1 -> 2: Trigger AI Analysis
  const handleAnalyzeContent = async () => {
    if (!rawText.trim()) return;
    setIsAnalyzing(true);
    setStudioNotice(null);
    try {
      const res = await fetch('/api/authoring/analyze-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText })
      });
      const data = await res.json();
      setAnalysis(data.analysis);
      setLifecycleStep(2);
    } catch (e: any) {
      setStudioNotice({ text: 'Analysis error: ' + e.message, type: 'error' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 3 -> 4: Generate Course from Approved Structure
  const handleBuildCourse = async () => {
    if (!analysis) return;
    setIsGeneratingCourse(true);
    setStudioNotice(null);
    try {
      const res = await fetch('/api/authoring/generate-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis,
          brandTheme: selectedTheme,
          customChapters: customChapters
        })
      });
      const data = await res.json();
      onCourseUpdated(data.course);
      setLifecycleStep(4);
      setSelectedScreenCoord({ chapterIdx: 0, screenIdx: 0 });
    } catch (e: any) {
      setStudioNotice({ text: 'Course generation error: ' + e.message, type: 'error' });
    } finally {
      setIsGeneratingCourse(false);
    }
  };

  // Step 4: AI Collaboration on Current Screen
  const handleCollaborate = async (action: 'regenerate' | 'simplify' | 'improve' | 'interactive' | 'convert_scenario' | 'lock') => {
    if (!currentCourse) return;
    const { chapterIdx, screenIdx } = selectedScreenCoord;
    const chapter = currentCourse.chapters[chapterIdx];
    if (!chapter) return;
    const screen = chapter.screens[screenIdx];
    if (!screen) return;

    if (action === 'lock') {
      const updatedScreen = { ...screen, isLocked: !screen.isLocked };
      const updatedChapters = [...currentCourse.chapters];
      updatedChapters[chapterIdx].screens[screenIdx] = updatedScreen;
      onCourseUpdated({ ...currentCourse, chapters: updatedChapters });
      return;
    }

    if (screen.isLocked) {
      setStudioNotice({ text: 'This screen is locked by the instructional designer against AI modifications.', type: 'info' });
      return;
    }

    setIsCollaborating(true);
    setStudioNotice(null);
    try {
      const res = await fetch('/api/authoring/collaborate-screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screen, action })
      });
      const data = await res.json();
      const updatedChapters = [...currentCourse.chapters];
      updatedChapters[chapterIdx].screens[screenIdx] = data.screen;
      onCourseUpdated({ ...currentCourse, chapters: updatedChapters });
    } catch (e: any) {
      setStudioNotice({ text: 'Collaboration error: ' + e.message, type: 'error' });
    } finally {
      setIsCollaborating(false);
    }
  };

  // Step 5: Approve Course
  const handleApproveCourse = async () => {
    if (!currentCourse) return;
    setStudioNotice(null);
    try {
      const res = await fetch('/api/authoring/approve-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: currentCourse.id,
          course: currentCourse,
          designerName: 'Lead Instructional Designer'
        })
      });
      const data = await res.json();
      onCourseUpdated(data.course || { ...currentCourse, approvalStatus: 'approved', approvedVersion: 'v1.0', approvedAt: new Date().toISOString() });
      setLifecycleStep(6);
    } catch (e: any) {
      setStudioNotice({ text: 'Approval error: ' + e.message, type: 'error' });
    }
  };

  // Package Downloads
  const handleDownload = async (format: 'scorm12' | 'cmi5' | 'xapi') => {
    if (!currentCourse) return;
    setIsPackaging(format);
    setStudioNotice(null);
    try {
      let blob: Blob;
      let filename: string;

      if (format === 'scorm12') {
        blob = await createScorm12PackageZip(currentCourse);
        filename = `${currentCourse.id}_SCORM12.zip`;
      } else if (format === 'cmi5') {
        blob = await createCmi5PackageZip(currentCourse);
        filename = `${currentCourse.id}_cmi5.zip`;
      } else {
        blob = await createXapiBundleZip(currentCourse, { endpoint: lrsEndpoint, key: lrsAuthKey });
        filename = `${currentCourse.id}_xAPI_bundle.zip`;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setStudioNotice({ text: 'Packaging error: ' + e.message, type: 'error' });
    } finally {
      setIsPackaging(null);
    }
  };

  // Active Screen in Studio
  const activeChapter = currentCourse?.chapters?.[selectedScreenCoord.chapterIdx];
  const activeScreen = activeChapter?.screens?.[selectedScreenCoord.screenIdx];

  return (
    <div className="space-y-6">
      {studioNotice && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium shadow-2xs ${
          studioNotice.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{studioNotice.text}</span>
          </div>
          <button
            onClick={() => setStudioNotice(null)}
            className="p-1 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Studio Top Control Strip & Quick Step Access */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-2xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 rounded">
              Instructional Authoring Pipeline
            </span>
            <span className="text-xs text-slate-500 font-medium">Stage {lifecycleStep} of 6</span>
          </div>
          <h1 className="text-base font-bold text-slate-900 mt-1">
            {lifecycleStep === 1 && 'Step 1: Upload Raw Content & Document Ingestion'}
            {lifecycleStep === 2 && 'Step 2: Gemini Content Analysis & Source Separation'}
            {lifecycleStep === 3 && 'Step 3: Instructional Plan & Chapter Hierarchy'}
            {lifecycleStep === 4 && 'Step 4: Interactive 3-Pane Authoring Studio'}
            {lifecycleStep === 5 && 'Step 5: Instructional Quality & Approval Gate'}
            {lifecycleStep === 6 && 'Step 6: Standards Packaging (SCORM 1.2, cmi5, xAPI)'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {lifecycleStep !== 1 && (
            <button
              onClick={() => {
                setLifecycleStep(1);
                setActiveInputTab('upload');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>+ Upload New Document</span>
            </button>
          )}

          {currentCourse && lifecycleStep !== 4 && (
            <button
              onClick={() => setLifecycleStep(4)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-slate-600" />
              <span>Live Studio (Step 4)</span>
            </button>
          )}
        </div>
      </div>

      {/* Step Navigator Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        <div className="flex items-center justify-between overflow-x-auto gap-2 text-xs font-semibold">
          {[
            { num: 1, label: 'Upload Content' },
            { num: 2, label: 'Gemini Analysis' },
            { num: 3, label: 'Course Structure' },
            { num: 4, label: '3-Pane Authoring Studio' },
            { num: 5, label: 'Quality Approval' },
            { num: 6, label: 'Package & Distribute' }
          ].map((st) => (
            <button
              key={st.num}
              onClick={() => {
                if (st.num <= 3 || currentCourse) setLifecycleStep(st.num);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                lifecycleStep === st.num
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : lifecycleStep > st.num
                  ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-2xs ${
                lifecycleStep === st.num ? 'bg-white text-blue-600 font-bold' : 'bg-slate-200 text-slate-700'
              }`}>
                {st.num}
              </span>
              <span>{st.label}</span>
              {lifecycleStep > st.num && <Check className="w-3 h-3 text-emerald-600" />}
            </button>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* STEP 1: UPLOAD RAW CONTENT OR SELECT PRESET */}
      {/* ======================================================== */}
      {lifecycleStep === 1 && (
        <div className="space-y-6">
          {/* Studio Step 1 Header & Instructions */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                  Step 1 of 6 · Document Ingestion
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2">
                  Upload Any Document or Corporate SOP
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                  Upload training documents in <strong>PDF, Word (DOCX/DOC), PowerPoint (PPTX), Markdown, Plain Text, or SOP/Transcript</strong> formats. Gemini 3.8 Flash extracts the core learning concepts, sequential processes, compliance warnings, and assessment points without altering your source content.
                </p>
              </div>

              {/* Input Mode Selector Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveInputTab('upload')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    activeInputTab === 'upload'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Upload Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInputTab('templates')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    activeInputTab === 'templates'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Preset Policies (3)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInputTab('paste')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    activeInputTab === 'paste'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Paste Content</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInputTab('voice')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    activeInputTab === 'voice'
                      ? 'bg-white text-purple-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5 text-purple-600" />
                  <span>Record Voice Lecture</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left column: Upload dropzone or preset selector */}
            <div className="lg:col-span-6 space-y-6">
              {activeInputTab === 'upload' && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Upload Document File
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Drag & drop or browse from your computer.
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-2xs font-semibold rounded">
                      Multimodal Engine Ready
                    </span>
                  </div>

                  {/* Hidden native file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileInputChange}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.markdown,.json,.csv,.rtf,.srt,.vtt"
                    className="hidden"
                  />

                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                      isDragOver
                        ? 'border-blue-500 bg-blue-50/80 shadow-md scale-[1.01]'
                        : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                        {isReadingFile ? (
                          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                        ) : (
                          <Upload className="w-6 h-6 text-blue-600" />
                        )}
                      </div>

                      <div>
                        <div className="text-sm font-bold text-slate-800">
                          {isReadingFile
                            ? 'Extracting Document Text with Gemini...'
                            : 'Click to Browse Files or Drag & Drop Here'}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          Supports PDF (.pdf), Word (.docx, .doc), PowerPoint (.pptx), Markdown (.md), Text (.txt, .srt, .vtt)
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                      >
                        <FileUp className="w-4 h-4" />
                        <span>Browse Files on Device</span>
                      </button>
                    </div>
                  </div>

                  {/* Uploaded File Status Card */}
                  {uploadedFileInfo && (
                    <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            <FileCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 break-all">
                              {uploadedFileInfo.name}
                            </div>
                            <div className="flex items-center gap-2 text-2xs text-slate-600 mt-0.5">
                              <span className="font-semibold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                                {uploadedFileInfo.type}
                              </span>
                              <span>{uploadedFileInfo.size}</span>
                              <span>·</span>
                              <span className="font-mono text-emerald-700 font-bold">
                                {uploadedFileInfo.wordCount.toLocaleString()} words extracted
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={handleClearUploadedFile}
                            className="text-xs text-red-500 hover:text-red-700 font-semibold p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="text-2xs text-emerald-800 flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Document text parsed into memory. Review or edit the extracted text on the right before proceeding.</span>
                      </div>
                    </div>
                  )}

                  {/* Supported Format Badges */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Compatible Formats & Parsing Engine
                    </span>
                    <div className="flex flex-wrap gap-1.5 text-2xs font-mono">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded border border-slate-200">.pdf (Gemini Multimodal)</span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded border border-slate-200">.docx / .doc (Word XML)</span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded border border-slate-200">.pptx (Slide Deck XML)</span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded border border-slate-200">.md / .txt (Markdown/Prose)</span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded border border-slate-200">.srt / .vtt (Audio Transcripts)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Template selector tab */}
              {activeInputTab === 'templates' && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Preset Enterprise SOP Policies
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select a pre-loaded policy document to test the full authoring pipeline immediately.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {PRESET_DOCUMENTS.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => handleSelectPreset(doc.id)}
                        className={`w-full text-left p-3.5 rounded-lg border transition-all cursor-pointer ${
                          selectedPresetId === doc.id && !uploadedFileInfo
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{doc.title}</span>
                          <span className="text-2xs font-mono px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600">
                            {doc.type}
                          </span>
                        </div>
                        <div className="text-2xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                          {doc.text.slice(0, 140)}...
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct Paste tab */}
              {activeInputTab === 'paste' && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Direct Text / Script Paste
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Paste policy documents, employee handbooks, customer service transcripts, or course notes directly.
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900">
                    <strong>Tip:</strong> Paste clean headings, bullet points, or verbatim procedures. You can format with Markdown or plain text.
                  </div>
                </div>
              )}

              {/* Voice Lecture / Speech-to-Text tab (gemini-3.5-transcribe) */}
              {activeInputTab === 'voice' && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Microphone Voice Recording & Transcription
                      </h3>
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 text-2xs font-mono font-bold rounded">
                        gemini-3.5-transcribe
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Dictate your training curriculum or record an instructor lecture. Gemini will transcribe it directly into your course text.
                    </p>
                  </div>

                  <div className="p-6 border-2 border-dashed border-purple-200 rounded-xl bg-purple-50/40 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto shadow-xs">
                      <Mic className={`w-8 h-8 ${isVoiceRecording ? 'text-rose-600 animate-pulse' : 'text-purple-600'}`} />
                    </div>

                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {isVoiceRecording ? 'Recording Microphone Audio...' : isVoiceTranscribing ? 'Transcribing with gemini-3.5-transcribe...' : 'Click to Record Voice Lecture'}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        {isVoiceRecording ? 'Speak clearly into your microphone. Click Stop when finished to transcribe automatically.' : 'Speak your policy guidelines, workflow procedures, or training speech.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      {!isVoiceRecording ? (
                        <button
                          type="button"
                          onClick={handleStartVoiceRecording}
                          disabled={isVoiceTranscribing}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Mic className="w-4 h-4" />
                          <span>Start Recording</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleStopVoiceRecording}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer animate-pulse"
                        >
                          <Square className="w-4 h-4" />
                          <span>Stop & Transcribe</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Brand Theme Selector */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Visual Brand Theme & Typography
                  </label>
                  <span className="text-2xs font-mono text-slate-400">Zero-Pill Enterprise</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {BRAND_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSelectedTheme(theme)}
                      className={`text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                        selectedTheme.id === theme.id
                          ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 font-semibold'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: theme.primaryColor }} />
                        <span className="font-semibold text-2xs truncate text-slate-800">{theme.name}</span>
                      </div>
                      <div className="text-3xs text-slate-400 mt-1 flex items-center gap-1 font-mono">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accentColor }} />
                        <span>Accent: {theme.accentColor}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column: Extracted Content Verification & Gemini Trigger */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Source Content Inspection & Review
                    </h2>
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      {uploadedFileInfo
                        ? `Extracted from "${uploadedFileInfo.name}" (${rawText.split(/\s+/).filter(Boolean).length} words)`
                        : 'Review the text that will be analyzed by Gemini'}
                    </span>
                  </div>
                  <span className="text-2xs font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                    {rawText.length.toLocaleString()} chars
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    rows={18}
                    className="w-full text-xs font-mono p-4 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 leading-relaxed font-normal"
                    placeholder="Document text will appear here once uploaded or selected..."
                  />
                  {rawText.trim().length > 0 && (
                    <div className="absolute bottom-3 right-3 text-2xs font-mono bg-white/90 backdrop-blur-xs px-2 py-1 rounded border border-slate-200 text-slate-500">
                      Editable by Instructional Designer
                    </div>
                  )}
                </div>

                {/* Separation Rule Callout */}
                <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    <span>Strict Source Content Separation Guarantee</span>
                  </div>
                  <p className="text-2xs text-blue-800 leading-relaxed">
                    Gemini will extract exact verbatim quotes, terminology definitions, and sequential processes from this document. Source content is explicitly separated from AI-generated instructional elements in Step 2.
                  </p>
                </div>

                {/* Primary Action Button */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    Step 2 will generate Bloom's taxonomy objectives and process flows.
                  </span>
                  <button
                    type="button"
                    onClick={handleAnalyzeContent}
                    disabled={isAnalyzing || !rawText.trim()}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Gemini 3.8 Flash Analyzing Document...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Analyze Content with Gemini →</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ======================================================== */}
      {/* STEP 2: GEMINI CONTENT ANALYSIS & SOURCE SEPARATION */}
      {/* ======================================================== */}
      {lifecycleStep === 2 && analysis && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-blue-600">Gemini Instructional Analysis</span>
                <h2 className="text-xl font-bold text-slate-900">{analysis.mainTopic}</h2>
                <div className="text-xs text-slate-500 mt-1">Target Audience: <strong>{analysis.targetAudience}</strong></div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSourceDiff(!showSourceDiff)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  <SplitSquareVertical className="w-3.5 h-3.5 text-slate-600" />
                  <span>{showSourceDiff ? 'Hide Source Separation' : 'Show Source vs AI Separation'}</span>
                </button>
                <button
                  onClick={() => setLifecycleStep(3)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs"
                >
                  <span>Approve & Configure Structure →</span>
                </button>
              </div>
            </div>

            {/* Source Separation Rule Callout */}
            {showSourceDiff && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-2">
                <div className="font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Strict Separation of Source Content vs AI-Generated Elements</span>
                </div>
                <p>
                  Gemini does not silently alter your corporate policy. Notice below: every term includes the <strong>exact verbatim quote</strong> from the source, clearly decoupled from the AI pedagogical explanation.
                </p>
              </div>
            )}

            {/* Objectives */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                1. Target Learning Objectives (Bloom's Taxonomy)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {analysis.learningObjectives.map((obj, i) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Core Concepts with Verbatim Quotes */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                2. Core Concepts & Source Extraction
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {analysis.coreConcepts.map((c, i) => (
                  <div key={i} className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-1.5">
                    <div className="font-bold text-xs text-slate-900">{c.term}</div>
                    <p className="text-2xs text-slate-600">{c.definition}</p>
                    <div className="pt-1.5 border-t border-slate-100 text-2xs text-blue-800 bg-blue-50/60 p-1.5 rounded font-mono">
                      <strong>Source Quote:</strong> "{c.sourceQuote}"
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Processes & Warnings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Sequential Processes Detected</h4>
                {analysis.processes.map((p, i) => (
                  <div key={i} className="space-y-1 text-xs">
                    <div className="font-semibold text-slate-800">{p.title}:</div>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                      {p.steps.map((st, si) => <li key={si}>{st}</li>)}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-red-50/70 border border-red-200 rounded-lg space-y-2">
                <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Critical Policy Warnings & Compliance Rules</span>
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-xs text-red-800">
                  {analysis.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 3: COURSE STRUCTURE & OUTLINE (DESIGNER EDITABLE) */}
      {/* ======================================================== */}
      {lifecycleStep === 3 && analysis && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-blue-600">Instructional Architecture</span>
              <h2 className="text-xl font-bold text-slate-900">Configure Learning Plan & Chapters</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and modify chapters before generating screens. You can add, rename, or reorder chapters.
              </p>
            </div>

            <button
              onClick={handleBuildCourse}
              disabled={isGeneratingCourse}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isGeneratingCourse ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Interactive Screens...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Build Interactive E-Learning Module →</span>
                </>
              )}
            </button>
          </div>

          {/* Chapters Outline */}
          <div className="space-y-4">
            {customChapters.map((ch, idx) => (
              <div key={ch.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded">
                      Chapter {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={ch.title}
                      onChange={(e) => {
                        const copy = [...customChapters];
                        copy[idx].title = e.target.value;
                        setCustomChapters(copy);
                      }}
                      className="font-bold text-sm text-slate-900 bg-transparent border-b border-dashed border-slate-400 focus:outline-hidden focus:border-blue-600 px-1"
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (customChapters.length <= 1) return;
                      setCustomChapters(customChapters.filter((_, i) => i !== idx));
                    }}
                    className="text-xs text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <input
                  type="text"
                  value={ch.description}
                  onChange={(e) => {
                    const copy = [...customChapters];
                    copy[idx].description = e.target.value;
                    setCustomChapters(copy);
                  }}
                  className="w-full text-xs text-slate-600 bg-white border border-slate-200 rounded p-2"
                />
              </div>
            ))}

            <button
              onClick={() => {
                const nextNum = customChapters.length + 1;
                setCustomChapters([
                  ...customChapters,
                  { id: `ch-${Date.now()}`, title: `Chapter ${nextNum}: Advanced Scenarios`, description: 'Workplace application and assessment' }
                ]);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Chapter</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 4: INTERACTIVE 3-PANE AUTHORING STUDIO */}
      {/* ======================================================== */}
      {lifecycleStep === 4 && currentCourse && (
        <div className="space-y-4">
          {/* Studio Top Control Strip */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-slate-900">{currentCourse.title}</span>
              <span className="text-2xs font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                Status: {currentCourse.approvalStatus.toUpperCase()} ({currentCourse.approvedVersion || 'Draft v0.9'})
              </span>
              <button
                onClick={() => setShowTelemetryInsights(!showTelemetryInsights)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                  showTelemetryInsights
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
                title="View BigQuery real-time xAPI telemetry feedback and friction points"
              >
                <Activity className="w-3.5 h-3.5 text-amber-600" />
                <span>Telemetry Insights & Friction</span>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setLifecycleStep(1);
                  setActiveInputTab('upload');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer"
              >
                <FileUp className="w-3.5 h-3.5 text-blue-600" />
                <span>+ Upload Doc</span>
              </button>
              <button
                onClick={() => setLifecycleStep(5)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Quality Gate</span>
              </button>
              <button
                onClick={() => setLifecycleStep(6)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Package</span>
              </button>
            </div>
          </div>

          {/* TELEMETRY & LEARNER FRICTION DRAWER */}
          {showTelemetryInsights && (
            <div className="p-4 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-white border border-amber-200 rounded-xl space-y-3 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500 text-white rounded-lg">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                        BigQuery Real-Time xAPI Telemetry Feedback
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-200/60 text-amber-900">
                        Live Stream Connected
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Learners are experiencing high friction on Chapter 2 (Underwriting Workflow & Verification).
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowTelemetryInsights(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="p-3 bg-white border border-amber-200/80 rounded-lg text-xs space-y-1">
                  <div className="text-slate-500 font-medium">Question 2 Failure Rate</div>
                  <div className="text-lg font-bold text-rose-600">42% Failed</div>
                  <div className="text-[11px] text-slate-500">TRID 3-Day Rule & Waiting Periods</div>
                </div>

                <div className="p-3 bg-white border border-amber-200/80 rounded-lg text-xs space-y-1">
                  <div className="text-slate-500 font-medium">Chapter 2 Drop-off Index</div>
                  <div className="text-lg font-bold text-amber-600">28% Hesitation</div>
                  <div className="text-[11px] text-slate-500">Learners re-reading Section 2 twice</div>
                </div>

                <div className="p-3 bg-white border border-amber-200/80 rounded-lg text-xs flex flex-col justify-between">
                  <div>
                    <div className="text-slate-500 font-medium">AI Suggested Remediation</div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">Interactive Branching Scenario</div>
                  </div>
                  <button
                    onClick={() => handleAddTelemetryRemediation(1)}
                    className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Auto-Remediate Chapter 2</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3-PANE WORKSPACE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px]">
            {/* PANE 1: LEFT - COURSE STRUCTURE & SCREEN LIST (3 cols) */}
            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 overflow-y-auto shadow-xs space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Course Hierarchy
              </div>

              <div className="space-y-3">
                {currentCourse.chapters.map((ch, chIdx) => (
                  <div key={ch.id} className="space-y-1">
                    <div className="text-xs font-bold text-slate-800 px-2 py-1 bg-slate-50 rounded">
                      {ch.title}
                    </div>

                    <div className="space-y-1 pl-2">
                      {ch.screens.map((sc, scIdx) => {
                        const isSelected = selectedScreenCoord.chapterIdx === chIdx && selectedScreenCoord.screenIdx === scIdx;
                        return (
                          <button
                            key={sc.id}
                            onClick={() => setSelectedScreenCoord({ chapterIdx: chIdx, screenIdx: scIdx })}
                            className={`w-full text-left p-2 rounded-md text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-300'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="truncate">{sc.screenNumber}. {sc.title}</span>
                              {sc.kicker?.includes('Remediation') && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                  Remediation
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {sc.isLocked && <Lock className="w-3 h-3 text-amber-600" />}
                              {sc.isEdited && <Edit3 className="w-3 h-3 text-blue-600" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="pt-2 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-800 px-2 py-1">Final Assessment</div>
                  <div className="text-xs text-slate-500 px-2 py-1 font-mono">
                    5-Question Scenario Quiz
                  </div>
                </div>
              </div>
            </div>

            {/* PANE 2: CENTRE - INTERACTIVE COURSE CANVAS (6 cols) */}
            <div className="lg:col-span-6 bg-slate-100 border border-slate-200 rounded-xl overflow-y-auto p-6 shadow-inner flex flex-col">
              {activeScreen ? (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex-1 flex flex-col space-y-4">
                  <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                    <div>
                      <span className="text-2xs font-bold uppercase tracking-wider text-blue-600">
                        {activeScreen.kicker || activeChapter?.title}
                      </span>
                      <h2 className="text-lg font-bold text-slate-900">{activeScreen.title}</h2>
                    </div>
                    <span className="text-2xs font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded uppercase">
                      {activeScreen.interactionType.replace('_', ' ')}
                    </span>
                  </div>

                  {activeScreen.kicker?.includes('Remediation') && (
                    <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>AI Telemetry-Informed Remediation Screen</span>
                      </div>
                      <p className="text-slate-600 text-2xs leading-relaxed">
                        Generated based on BigQuery telemetry showing a 42% question failure rate on TRID 3-Day disclosure timelines. This scenario provides active deliberate practice before the final exam.
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-slate-700 leading-relaxed">{activeScreen.bodyText}</p>

                  {/* Dynamic Interactive Widget Canvas */}
                  <div className="pt-2 flex-1">
                    {activeScreen.interactionType === 'process_flow' && activeScreen.interactionData.processSteps && (
                      <div className="space-y-2">
                        {activeScreen.interactionData.processSteps.map((st) => (
                          <div key={st.stepNumber} className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex items-start gap-3 hover:border-blue-400 cursor-pointer">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {st.stepNumber}
                            </span>
                            <div>
                              <div className="font-semibold text-xs text-slate-900">{st.title}</div>
                              <div className="text-2xs text-slate-600 mt-0.5">{st.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeScreen.interactionType === 'comparison' && activeScreen.interactionData.comparisonItems && (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 border border-slate-200 rounded-lg bg-white border-t-4 border-t-slate-400">
                          <div className="font-bold text-slate-800 mb-2 uppercase text-2xs">Standard Approach</div>
                          {activeScreen.interactionData.comparisonItems.map((c, i) => (
                            <div key={i} className="mb-2 text-2xs">
                              <strong>{c.criteria}:</strong> {c.optionA}
                            </div>
                          ))}
                        </div>
                        <div className="p-3 border border-blue-200 rounded-lg bg-blue-50/50 border-t-4 border-t-blue-600">
                          <div className="font-bold text-blue-900 mb-2 uppercase text-2xs">Recommended Protocol</div>
                          {activeScreen.interactionData.comparisonItems.map((c, i) => (
                            <div key={i} className="mb-2 text-2xs text-blue-950">
                              <strong>{c.criteria}:</strong> {c.optionB}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeScreen.interactionType === 'flip_card' && activeScreen.interactionData.flipCards && (
                      <div className="grid grid-cols-2 gap-3">
                        {activeScreen.interactionData.flipCards.map((fc, i) => (
                          <div key={i} className="p-4 border border-slate-200 rounded-lg bg-slate-50 text-center space-y-2 hover:bg-blue-50 transition-colors cursor-pointer">
                            <div className="font-bold text-xs text-slate-900">{fc.front}</div>
                            <div className="text-2xs text-slate-600 pt-2 border-t border-slate-200">{fc.back}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeScreen.interactionType === 'scenario' && activeScreen.interactionData.scenarioBranch && (
                      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-lg space-y-3">
                        <div className="font-bold text-xs text-amber-900">Workplace Scenario Decision:</div>
                        <p className="text-xs text-amber-800">{activeScreen.interactionData.scenarioBranch.context}</p>
                        <div className="space-y-1.5">
                          {activeScreen.interactionData.scenarioBranch.choices.map((ch) => (
                            <button
                              key={ch.id}
                              onClick={() => alert(`Consequence: ${ch.consequence}`)}
                              className="w-full text-left p-2.5 bg-white border border-slate-300 rounded text-xs hover:border-blue-500 cursor-pointer"
                            >
                              {ch.choiceText}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-400">
                    <span>Source Excerpt: "{activeScreen.sourceExcerpt.slice(0, 60)}..."</span>
                    <span>AI Rationale: {activeScreen.aiInstructionalNote}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center my-auto text-slate-400 text-xs">Select a screen on the left to preview and edit.</div>
              )}
            </div>

            {/* PANE 3: RIGHT - AI & DESIGN PROPERTIES (3 cols) */}
            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 overflow-y-auto shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  AI Collaboration
                </div>
                {activeScreen && (
                  <button
                    onClick={() => handleCollaborate('lock')}
                    className="text-xs font-semibold flex items-center gap-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {activeScreen.isLocked ? (
                      <>
                        <Lock className="w-3 h-3 text-amber-600" />
                        <span className="text-amber-700">Locked</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3" />
                        <span>Unlocked</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <span className="text-2xs font-bold text-slate-500 uppercase">Instructional Refinements</span>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    onClick={() => handleCollaborate('simplify')}
                    disabled={isCollaborating || activeScreen?.isLocked}
                    className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-xs font-medium text-slate-700 cursor-pointer disabled:opacity-50"
                  >
                    Simplify (Grade 8 Comprehension)
                  </button>
                  <button
                    onClick={() => handleCollaborate('interactive')}
                    disabled={isCollaborating || activeScreen?.isLocked}
                    className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-xs font-medium text-slate-700 cursor-pointer disabled:opacity-50"
                  >
                    Make More Interactive (Flip Cards)
                  </button>
                  <button
                    onClick={() => handleCollaborate('convert_scenario')}
                    disabled={isCollaborating || activeScreen?.isLocked}
                    className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-xs font-medium text-slate-700 cursor-pointer disabled:opacity-50"
                  >
                    Convert to Decision Scenario
                  </button>
                  <button
                    onClick={() => handleCollaborate('regenerate')}
                    disabled={isCollaborating || activeScreen?.isLocked}
                    className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-xs font-medium text-slate-700 cursor-pointer disabled:opacity-50"
                  >
                    Regenerate Screen Prose
                  </button>
                  <button
                    onClick={() => handleAddTelemetryRemediation(selectedScreenCoord.chapterIdx)}
                    disabled={isCollaborating}
                    className="w-full text-left px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-200 rounded-md text-xs font-semibold text-amber-900 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <span>Remediate Dropoff (BigQuery xAPI)</span>
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                  </button>
                </div>
              </div>

              {/* Manual Properties Editor */}
              {activeScreen && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <span className="text-2xs font-bold text-slate-500 uppercase">Manual Properties</span>
                  <div>
                    <label className="text-2xs font-bold text-slate-600 block mb-1">Screen Title</label>
                    <input
                      type="text"
                      value={activeScreen.title}
                      onChange={(e) => {
                        const copy = [...currentCourse.chapters];
                        copy[selectedScreenCoord.chapterIdx].screens[selectedScreenCoord.screenIdx].title = e.target.value;
                        copy[selectedScreenCoord.chapterIdx].screens[selectedScreenCoord.screenIdx].isEdited = true;
                        onCourseUpdated({ ...currentCourse, chapters: copy });
                      }}
                      className="w-full text-xs p-2 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-2xs font-bold text-slate-600 block mb-1">Body Text</label>
                    <textarea
                      value={activeScreen.bodyText}
                      onChange={(e) => {
                        const copy = [...currentCourse.chapters];
                        copy[selectedScreenCoord.chapterIdx].screens[selectedScreenCoord.screenIdx].bodyText = e.target.value;
                        copy[selectedScreenCoord.chapterIdx].screens[selectedScreenCoord.screenIdx].isEdited = true;
                        onCourseUpdated({ ...currentCourse, chapters: copy });
                      }}
                      rows={5}
                      className="w-full text-xs p-2 border border-slate-300 rounded font-sans"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 5: REVIEW & QUALITY APPROVAL GATE */}
      {/* ======================================================== */}
      {lifecycleStep === 5 && currentCourse && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Instructional Quality Approval Gate</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Before exporting production delivery packages, the Instructional Designer approves and signs off on the course release version.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Course Identifier:</span>
              <strong className="text-slate-800 font-mono">{currentCourse.id}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Total Interactive Screens:</span>
              <strong className="text-slate-800 font-mono">
                {currentCourse.chapters.reduce((acc, ch) => acc + ch.screens.length, 0)} Screens + 5 Questions
              </strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Current Approval Status:</span>
              <span className={`font-bold uppercase ${currentCourse.approvalStatus === 'approved' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {currentCourse.approvalStatus}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">xAPI Telemetry & Remediation Check:</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified (TRID friction addressed via active scenario)</span>
              </span>
            </div>
            {currentCourse.approvedVersion && (
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Approved Version Lock:</span>
                <strong className="text-emerald-700 font-mono">{currentCourse.approvedVersion} — Sealed by {currentCourse.approvedBy}</strong>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              onClick={() => setLifecycleStep(4)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md"
            >
              ← Back to Studio Editor
            </button>

            {currentCourse.approvalStatus !== 'approved' ? (
              <button
                onClick={handleApproveCourse}
                className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition-colors cursor-pointer"
              >
                APPROVE COURSE (Lock v1.0)
              </button>
            ) : (
              <button
                onClick={() => setLifecycleStep(6)}
                className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors cursor-pointer"
              >
                Proceed to Package & Distribute →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 6: AUTOMATIC PACKAGING & MULTI-FORMAT DISTRIBUTION */}
      {/* ======================================================== */}
      {lifecycleStep === 6 && currentCourse && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-blue-600">Export & Delivery</span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">Publish to Any Compatible LMS / LRS</h2>
              <p className="text-xs text-slate-500 mt-1">
                Distribute directly to internal learners or export standard compliance packages.
              </p>
            </div>

            {/* OPTION A: PUBLISH DIRECTLY TO PLATFORM LMS */}
            <div className="p-6 bg-gradient-to-r from-emerald-50 via-white to-blue-50 border-2 border-emerald-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Option A · Direct LMS Distribution
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    Publish Directly to Platform LMS
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Make this course immediately available to assigned learners across your organization.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {hasPublishedToLms ? (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-emerald-800 bg-emerald-100 rounded-lg border border-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Published to Platform LMS!</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        if (onPublishToLms) onPublishToLms(currentCourse);
                        setHasPublishedToLms(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Publish to Platform LMS</span>
                    </button>
                  )}
                  {onViewInLearnerPortal && (
                    <button
                      onClick={() => onViewInLearnerPortal(currentCourse)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-slate-500" />
                      <span>Preview in Learner View</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Option B · Portable Standard Packages
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Download for External LMS & LRS
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Download ready-to-import packages for Moodle, Canvas, Cornerstone, Workday, or any SCORM/cmi5/xAPI LMS.
              </p>
            </div>

            {/* Export Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* SCORM 1.2 */}
              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/60 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded">
                      SCORM 1.2
                    </span>
                    <span className="text-2xs text-slate-400 font-mono">imsmanifest.xml</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Course_SCORM12.zip</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Standard SCORM 1.2 package for Moodle, Canvas, Blackboard, or Cornerstone OnDemand.
                  </p>
                </div>
                <button
                  onClick={() => handleDownload('scorm12')}
                  disabled={isPackaging !== null}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isPackaging === 'scorm12' ? 'Zipping...' : 'Download SCORM 1.2 (.zip)'}</span>
                </button>
              </div>

              {/* cmi5 */}
              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/60 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-bold rounded">
                      cmi5 Standard
                    </span>
                    <span className="text-2xs text-slate-400 font-mono">cmi5.xml</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Course_cmi5.zip</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Assignable Unit (AU) package designed specifically for modern LMS launch and xAPI tracking.
                  </p>
                </div>
                <button
                  onClick={() => handleDownload('cmi5')}
                  disabled={isPackaging !== null}
                  className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isPackaging === 'cmi5' ? 'Zipping...' : 'Download cmi5 (.zip)'}</span>
                </button>
              </div>

              {/* xAPI */}
              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/60 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded">
                      xAPI Bundle
                    </span>
                    <span className="text-2xs text-slate-400 font-mono">tincan.xml</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">xAPI_Launch_Bundle.zip</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Direct LRS configuration bundle with configurable statement emission and credentials.
                  </p>
                </div>
                <button
                  onClick={() => handleDownload('xapi')}
                  disabled={isPackaging !== null}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isPackaging === 'xapi' ? 'Zipping...' : 'Download xAPI (.zip)'}</span>
                </button>
              </div>
            </div>

            {/* In-Browser Test Player Sandbox */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    In-Browser SCORM & cmi5 Runtime Sandbox
                  </h3>
                </div>
                <span className="text-xs text-slate-400">Playable preview of the exact exported HTML</span>
              </div>

              <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-100 p-2 shadow-inner">
                <iframe
                  srcDoc={generateCourseHtml(currentCourse)}
                  title="Export Sandbox Player"
                  className="w-full h-[580px] bg-white rounded border border-slate-300"
                  sandbox="allow-scripts allow-forms allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
