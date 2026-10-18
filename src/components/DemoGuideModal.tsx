import React from 'react';
import { X, Play, Video, CheckCircle2, Clock, FileText, Bot, Database, RefreshCw } from 'lucide-react';

interface DemoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToTab: (tab: 'authoring' | 'roleplay' | 'telemetry' | 'remediation') => void;
}

export const DemoGuideModal: React.FC<DemoGuideModalProps> = ({
  isOpen,
  onClose,
  onJumpToTab
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">3-Minute Video Presentation Script & Checklist</h2>
              <p className="text-xs text-slate-500">
                Official guide for presenting the end-to-end Always-Free Google Cloud LMS flow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-900 leading-relaxed">
            <strong>Hackathon Objective:</strong> Demonstrate the end-to-end loop:
            uploading/pasting a policy, generating the cmi5/SCORM .zip package, taking the AI role-play simulation with structured scoring, watching xAPI statements stream into BigQuery, and running automated predictive remediation.
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-700">0:00 - 0:45</span>
                  <h3 className="text-sm font-semibold text-slate-900">1. Policy to SCORM/cmi5 Generator</h3>
                </div>
                <button
                  onClick={() => { onClose(); onJumpToTab('authoring'); }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  Jump to Authoring Studio →
                </button>
              </div>
              <p className="text-xs text-slate-600 mb-2">
                <strong>What to say:</strong> "We start with a raw company policy document. Gemini 3.8 Flash parses the text to extract formal learning objectives, instructional sections, and a 5-question scenario quiz in strict JSON. We bundle this into a standard SCORM 1.2 and cmi5 package with imsmanifest.xml and cmi5.xml, ready for any LMS."
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Show one-click synthesis, test quiz in the Live Player, and click 'Download Package (.zip)'.</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-700">0:45 - 1:45</span>
                  <h3 className="text-sm font-semibold text-slate-900">2. AI Role-Play Tutor with Structured Outputs</h3>
                </div>
                <button
                  onClick={() => { onClose(); onJumpToTab('roleplay'); }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  Jump to Role-Play →
                </button>
              </div>
              <p className="text-xs text-slate-600 mb-2">
                <strong>What to say:</strong> "Next, trainees practice high-stakes de-escalation with our AI Tutor. Powered by Gemini 3.8 Flash with system instructions, the persona plays an agitated client. We force responseSchema structured output to evaluate empathy, clarity, and policy enforcement in real-time."
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Type 1-2 responses (or click quick prompts). Show how when is_conversation_over becomes true, an xAPI statement auto-fires to BigQuery!</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-700">1:45 - 2:30</span>
                  <h3 className="text-sm font-semibold text-slate-900">3. BigQuery Streaming JSON Telemetry</h3>
                </div>
                <button
                  onClick={() => { onClose(); onJumpToTab('telemetry'); }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  Jump to BigQuery →
                </button>
              </div>
              <p className="text-xs text-slate-600 mb-2">
                <strong>What to say:</strong> "Notice our telemetry pipeline. Instead of rigid relational tables, we dump unstructured xAPI JSON directly into a single BigQuery column: statement JSON. We can query deep actor-verb-object properties using JSON_VALUE without worrying about schema drift."
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Inspect a raw statement JSON and click 'Run Query' to filter scores below 60%.</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-700">2:30 - 3:00</span>
                  <h3 className="text-sm font-semibold text-slate-900">4. Automated Predictive Remediation Loop</h3>
                </div>
                <button
                  onClick={() => { onClose(); onJumpToTab('remediation'); }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  Jump to Remediation →
                </button>
              </div>
              <p className="text-xs text-slate-600 mb-2">
                <strong>What to say:</strong> "Finally, our Cloud Scheduler daily cron triggers a remediation endpoint. It finds trainees who scored below 60%, extracts their friction points, prompts Gemini to create targeted 2-minute micro-modules, and pushes them to Firestore as Recommended Reviews on the trainee dashboard."
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Click 'Trigger Daily Cloud Scheduler Cron', open a Recommended Review, and answer the self-check question!</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Got It, Let's Start Demo
          </button>
        </div>
      </div>
    </div>
  );
};
