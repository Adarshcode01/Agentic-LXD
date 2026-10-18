import React, { useState } from 'react';
import { Sparkles, Download, Play, Eye, FileText, CheckCircle, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { Course } from '../types/lms';
import { createScormPackageZip, generateCourseHtml } from '../lib/scormGenerator';

interface CourseGeneratorViewProps {
  currentCourse: Course | null;
  onCourseGenerated: (course: Course) => void;
  onXapiEmitted: (statement: any) => void;
}

const PRESET_POLICIES = [
  {
    id: 'customer-escalation',
    name: 'Customer De-Escalation & Recovery Standard',
    desc: '4-stage service recovery protocol, empathy calibration, and financial compensation limits.',
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
    id: 'security-phishing',
    name: 'Corporate Cybersecurity & Phishing Response',
    desc: 'Immediate containment protocols, token revoking, and credential isolation procedures.',
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
  },
  {
    id: 'hipaa-privacy',
    name: 'Healthcare Patient Privacy & HIPAA Safeguards',
    desc: 'Minimum Necessary Rule, ePHI access logging, and encrypted transmission guidelines.',
    text: `HEALTHCARE TELEMETRY & PATIENT PRIVACY STANDARD (HIPAA-601)
1. THE MINIMUM NECESSARY STANDARD
Staff may only view or transmit the minimum Electronic Protected Health Information (ePHI) necessary to accomplish the intended clinical or administrative task.

2. COMMUNICATION SECURITY
- All clinical notes containing ePHI transmitted externally must use TLS 1.3 encryption.
- Sending unencrypted patient identifiers via standard SMS or unsecured chat channels is a critical Tier-3 violation subject to regulatory fines.

3. AUDIT TRAILS & ACCESS LOGS
Every query to patient telemetry records is permanently logged into the compliance data lake for auditability.`
  }
];

export const CourseGeneratorView: React.FC<CourseGeneratorViewProps> = ({
  currentCourse,
  onCourseGenerated,
  onXapiEmitted
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('customer-escalation');
  const [sourceText, setSourceText] = useState<string>(PRESET_POLICIES[0].text);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'sections' | 'quiz' | 'player'>('overview');
  const [downloadingZip, setDownloadingZip] = useState<boolean>(false);
  const [playerLogs, setPlayerLogs] = useState<string[]>([
    'SCORM Runtime: Ready for launch. Listening on window.postMessage...'
  ]);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const p = PRESET_POLICIES.find(item => item.id === presetId);
    if (p) setSourceText(p.text);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const activePolicy = PRESET_POLICIES.find(p => p.id === selectedPreset);
      const res = await fetch('/api/generate-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceText,
          titleHint: activePolicy?.name || 'Enterprise Compliance Standard',
          type: 'policy'
        })
      });

      if (!res.ok) throw new Error('Course generation failed');
      const data = await res.json();
      onCourseGenerated(data.course);
      setActiveTab('overview');
      setPlayerLogs(prev => [
        `[${new Date().toLocaleTimeString()}] Generated new SCORM/cmi5 course package: "${data.course.title}"`,
        ...prev
      ]);
    } catch (err: any) {
      alert('Generation error: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!currentCourse) return;
    setDownloadingZip(true);
    try {
      const zipBlob = await createScormPackageZip(currentCourse);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentCourse.id}-scorm-cmi5-package.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Zip creation error: ' + err.message);
    } finally {
      setDownloadingZip(false);
    }
  };

  // Listen to messages from the in-browser SCORM player
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;

      if (event.data.type === 'SCORM_EVENT') {
        setPlayerLogs(prev => [
          `[${new Date().toLocaleTimeString()}] SCORM Event: ${event.data.event} ${event.data.tabId || ''}`,
          ...prev.slice(0, 19)
        ]);
      } else if (event.data.type === 'SCORM_QUIZ_COMPLETED') {
        setPlayerLogs(prev => [
          `[${new Date().toLocaleTimeString()}] SCORM Quiz Submitted: Score ${event.data.score}% · ${event.data.passed ? 'PASSED' : 'FAILED'} · xAPI statement dispatched to BigQuery Lake`,
          ...prev.slice(0, 19)
        ]);
        if (event.data.xapi) {
          onXapiEmitted(event.data.xapi);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onXapiEmitted]);

  return (
    <div className="space-y-8">
      {/* Hero / Studio Intro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dynamic SCORM / cmi5 Course Studio
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Synthesize raw policies and transcripts into verified SCORM 1.2 and cmi5 packages using Gemini 3.8 Flash, complete with interactive scenario quizzes and an in-browser runtime player.
          </p>
        </div>

        {currentCourse && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('player')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-blue-600" />
              <span>Launch In-Browser Player</span>
            </button>
            <button
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs cursor-pointer disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingZip ? 'Packaging Zip...' : 'Download SCORM/cmi5 (.zip)'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input Source & Policy Presets (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                1. Select Policy or Paste Transcript
              </h2>
              <span className="text-xs text-slate-500">Gemini 3.8 Flash</span>
            </div>

            {/* Presets List */}
            <div className="space-y-2">
              {PRESET_POLICIES.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedPreset === p.id
                      ? 'bg-blue-50/70 border-blue-500/80 shadow-xs'
                      : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{p.desc}</div>
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Raw Policy Document / Audio Transcript Content
              </label>
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                rows={9}
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all leading-relaxed"
                placeholder="Paste corporate SOP, training transcript, or policy..."
              />
            </div>

            {/* Packaging Target */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800">Target Standard: Dual cmi5 + SCORM 1.2</div>
              <div>Bundles <code className="text-blue-700 font-mono">imsmanifest.xml</code> + <code className="text-blue-700 font-mono">cmi5.xml</code> with xAPI telemetry hooks.</div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !sourceText.trim()}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing SCORM Structure with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Synthesize SCORM & cmi5 Course Package</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Generated Course Viewer / Sandbox (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {currentCourse ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              {/* Tabs */}
              <div className="border-b border-slate-200 px-6 pt-3 flex items-center gap-6 text-xs font-medium text-slate-600">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'overview'
                      ? 'border-blue-600 text-blue-600 font-semibold'
                      : 'border-transparent hover:text-slate-900'
                  }`}
                >
                  Course Overview
                </button>
                <button
                  onClick={() => setActiveTab('sections')}
                  className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'sections'
                      ? 'border-blue-600 text-blue-600 font-semibold'
                      : 'border-transparent hover:text-slate-900'
                  }`}
                >
                  Modules ({currentCourse.sections.length})
                </button>
                <button
                  onClick={() => setActiveTab('quiz')}
                  className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'quiz'
                      ? 'border-blue-600 text-blue-600 font-semibold'
                      : 'border-transparent hover:text-slate-900'
                  }`}
                >
                  5-Question Quiz
                </button>
                <button
                  onClick={() => setActiveTab('player')}
                  className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'player'
                      ? 'border-blue-600 text-blue-600 font-semibold'
                      : 'border-transparent hover:text-slate-900'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 text-blue-600" />
                  <span>Live SCORM Player Sandbox</span>
                </button>
              </div>

              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{currentCourse.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{currentCourse.description}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-3">
                      <span>⏱ Duration: {currentCourse.estimatedTimeMinutes} mins</span>
                      <span>·</span>
                      <span>Compliant: SCORM 1.2 & cmi5</span>
                      <span>·</span>
                      <span>Passing Score: 70%</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Extracted Learning Objectives
                    </div>
                    <ul className="space-y-1.5">
                      {currentCourse.learningObjectives.map((obj, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500">
                      Standardized package ready for LMS deployment or testing.
                    </span>
                    <button
                      onClick={() => setActiveTab('player')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Test in In-Browser Player →</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Sections */}
              {activeTab === 'sections' && (
                <div className="p-6 space-y-6">
                  {currentCourse.sections.map((sec, idx) => (
                    <div key={sec.id} className="border border-slate-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900">
                          Section {idx + 1}: {sec.title}
                        </h4>
                        <span className="text-xs font-mono text-slate-400">ID: {sec.id}</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{sec.content}</p>
                      
                      <div className="bg-slate-50 p-3 rounded-md text-xs space-y-1">
                        <div className="font-semibold text-slate-800">Actionable Takeaways:</div>
                        <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                          {sec.takeaways.map((t, i) => <li key={i}>{t}</li>)}
                        </ul>
                      </div>

                      <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-md text-xs text-amber-900">
                        <strong>Scenario Application:</strong> {sec.scenarioSnippet}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 3: Quiz */}
              {activeTab === 'quiz' && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">5-Question Knowledge Assessment</h3>
                    <span className="text-xs text-slate-500">Passing criteria: 70% (4 of 5 correct)</span>
                  </div>

                  <div className="space-y-4">
                    {currentCourse.quiz.map((q, qIdx) => (
                      <div key={q.id} className="border border-slate-200 rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">Question {qIdx + 1}</span>
                          <span className="text-xs text-slate-500 font-mono">Competency: {q.competency}</span>
                        </div>
                        <div className="text-xs font-medium text-slate-800">{q.question}</div>
                        
                        <div className="space-y-1 pt-1">
                          {q.options.map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              className={`text-xs p-2 rounded-md border flex items-center justify-between ${
                                optIdx === q.correctAnswerIndex
                                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 font-semibold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span>{opt}</span>
                              {optIdx === q.correctAnswerIndex && (
                                <span className="text-emerald-700 text-xs">✓ Correct</span>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-200/60 mt-2">
                          <strong>Pedagogical Rationale:</strong> {q.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: In-Browser Player Sandbox */}
              {activeTab === 'player' && (
                <div className="space-y-4">
                  <div className="px-6 pt-4 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Live SCORM 1.2 & cmi5 Sandbox Player Active</span>
                    </div>
                    <span>Interact with the course and quiz below to emit real xAPI events</span>
                  </div>

                  <div className="border-t border-b border-slate-200 bg-slate-100 p-2">
                    <iframe
                      srcDoc={generateCourseHtml(currentCourse)}
                      title="SCORM Course Sandbox Player"
                      className="w-full h-[580px] bg-white rounded border border-slate-300 shadow-inner"
                      sandbox="allow-scripts allow-forms allow-same-origin"
                    />
                  </div>

                  {/* Telemetry Debug Log */}
                  <div className="px-6 pb-6 space-y-2">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span>SCORM & xAPI Bridge Console</span>
                      <button
                        onClick={() => setPlayerLogs(['Console cleared'])}
                        className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-xs max-h-36 overflow-y-auto space-y-1">
                      {playerLogs.map((log, i) => (
                        <div key={i} className="leading-tight opacity-90">{log}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Course Synthesized Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Select one of the enterprise policy templates on the left or paste your own document, then click "Synthesize SCORM & cmi5 Course Package" to generate a complete course with 5 questions and manifest files.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
