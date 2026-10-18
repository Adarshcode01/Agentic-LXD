import React, { useState } from 'react';
import { RefreshCw, Play, CheckCircle2, Clock, Sparkles, BookOpen, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';
import { RemediationModule } from '../types/lms';

interface PredictiveRemediationViewProps {
  remediationModules: RemediationModule[];
  onRefresh: () => void;
  onModuleCompleted: () => void;
}

export const PredictiveRemediationView: React.FC<PredictiveRemediationViewProps> = ({
  remediationModules,
  onRefresh,
  onModuleCompleted
}) => {
  const [isTriggeringCron, setIsTriggeringCron] = useState<boolean>(false);
  const [cronFeedback, setCronFeedback] = useState<string | null>(null);
  const [activeReviewModule, setActiveReviewModule] = useState<RemediationModule | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState<boolean>(false);
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState<boolean>(false);

  const handleTriggerSchedulerCron = async () => {
    setIsTriggeringCron(true);
    setCronFeedback(null);
    try {
      const res = await fetch('/api/remediation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setCronFeedback(
        `Cloud Scheduler simulated at ${new Date(data.triggeredAt).toLocaleTimeString()}: Analyzed ${data.failingStatementsAnalyzed || 0} failing statements, created ${data.newRemedialModulesCreated || 0} targeted micro-modules in Firestore.`
      );
      onRefresh();
    } catch (err: any) {
      alert('Remediation error: ' + err.message);
    } finally {
      setIsTriggeringCron(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (selectedAnswer === null || !activeReviewModule) return;
    setAnswerSubmitted(true);

    if (selectedAnswer === activeReviewModule.remedialContent.selfCheckQuestion.correctAnswerIndex) {
      setIsSubmittingCompletion(true);
      try {
        await fetch('/api/remediation/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moduleId: activeReviewModule.id })
        });
        onModuleCompleted();
      } catch (e) {
        console.error(e);
      } finally {
        setIsSubmittingCompletion(false);
      }
    }
  };

  const pendingModules = remediationModules.filter(m => m.status === 'pending_review');
  const completedModules = remediationModules.filter(m => m.status === 'completed');

  return (
    <div className="space-y-8">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Automated Predictive Remediation Engine
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Google Cloud Scheduler daily cron queries BigQuery telemetry for scores below 60%. Gemini dynamically generates targeted 2-minute micro-modules saved to Firestore and flagged as "Recommended Review" for trainees.
          </p>
        </div>

        <button
          onClick={handleTriggerSchedulerCron}
          disabled={isTriggeringCron}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs cursor-pointer disabled:opacity-60 self-start"
        >
          {isTriggeringCron ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Simulating Cloud Scheduler Cron...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>Trigger Cloud Scheduler Cron</span>
            </>
          )}
        </button>
      </div>

      {/* Cron Feedback Banner */}
      {cronFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Automated Remediation Loop Executed</span>
            <p>{cronFeedback}</p>
          </div>
        </div>
      )}

      {/* Trainee Recommended Review Dashboard */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Trainee Recommended Reviews ({pendingModules.length} Pending)
            </h2>
          </div>
          <span className="text-xs text-slate-500">Stored in Firestore State Collection</span>
        </div>

        {pendingModules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingModules.map((mod) => (
              <div
                key={mod.id}
                className="bg-white border border-amber-200/90 rounded-xl p-5 shadow-xs space-y-3 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none" />

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 font-medium text-amber-800">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>Action Required · Score {mod.originalScore}%</span>
                  </div>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{mod.remedialContent.readDuration} Read</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {mod.remedialContent.title}
                  </h3>
                  <div className="text-xs text-slate-500 mt-1">
                    Trainee: <strong className="text-slate-700">{mod.traineeName}</strong> ({mod.traineeEmail})
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {mod.remedialContent.coreConcept}
                </p>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <span className="text-2xs text-slate-400 font-mono">
                    Failed: {mod.failingCompetency}
                  </span>
                  <button
                    onClick={() => {
                      setActiveReviewModule(mod);
                      setSelectedAnswer(null);
                      setAnswerSubmitted(false);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    <span>Launch 2-Min Review</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">No Outstanding Remedial Reviews</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All trainees currently pass proficiency thresholds (&ge;60%). If a trainee fails a SCORM quiz or roleplay simulation, Cloud Scheduler will generate a tailored micro-module here.
            </p>
          </div>
        )}
      </div>

      {/* Completed History */}
      {completedModules.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Completed Remediation Records ({completedModules.length})
          </h3>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {completedModules.map(m => (
              <div key={m.id} className="p-4 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-900">{m.remedialContent.title}</div>
                  <div className="text-slate-500">
                    {m.traineeName} · Remediated {m.failingCompetency} (Original: {m.originalScore}%)
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold font-mono">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Resolved (100% Recovery)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive 2-Minute Review Modal */}
      {activeReviewModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Targeted Micro-Module: {activeReviewModule.remedialContent.readDuration}
                </h3>
              </div>
              <button
                onClick={() => setActiveReviewModule(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {activeReviewModule.remedialContent.title}
                </h2>
                <div className="text-xs text-slate-500 mt-1">
                  Addressing friction in: <strong className="text-slate-700">{activeReviewModule.failingCompetency}</strong>
                </div>
              </div>

              {/* Core Concept */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  The Critical Correction
                </span>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  {activeReviewModule.remedialContent.coreConcept}
                </p>
              </div>

              {/* Concrete Example */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Actionable Phrasing & Behavior
                </span>
                <div className="text-xs text-blue-900 bg-blue-50/70 p-3.5 rounded-lg border border-blue-200 leading-relaxed">
                  {activeReviewModule.remedialContent.concreteCorrection}
                </div>
              </div>

              {/* Key Takeaway */}
              <div className="p-3 bg-amber-50/80 border-l-4 border-amber-500 text-xs text-amber-900 rounded-r-lg">
                <strong>Rule of Thumb:</strong> {activeReviewModule.remedialContent.keyTakeaway}
              </div>

              {/* Interactive Self-Check */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50/50">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Knowledge Verification Check</span>
                  <span className="text-slate-500">1 Question</span>
                </div>
                <p className="text-xs font-medium text-slate-800">
                  {activeReviewModule.remedialContent.selfCheckQuestion.question}
                </p>

                <div className="space-y-1.5 pt-1">
                  {activeReviewModule.remedialContent.selfCheckQuestion.options.map((opt, i) => (
                    <label
                      key={i}
                      className={`flex items-center gap-2 p-2.5 rounded-md border text-xs cursor-pointer transition-colors ${
                        selectedAnswer === i
                          ? 'bg-blue-50 border-blue-400 text-blue-900 font-medium'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="self_check"
                        checked={selectedAnswer === i}
                        onChange={() => setSelectedAnswer(i)}
                        disabled={answerSubmitted}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>

                {answerSubmitted && (
                  <div
                    className={`p-3 rounded-lg text-xs leading-relaxed ${
                      selectedAnswer === activeReviewModule.remedialContent.selfCheckQuestion.correctAnswerIndex
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                        : 'bg-red-50 text-red-900 border border-red-200'
                    }`}
                  >
                    <strong>
                      {selectedAnswer === activeReviewModule.remedialContent.selfCheckQuestion.correctAnswerIndex
                        ? 'Correct! '
                        : 'Incorrect. '}
                    </strong>
                    {activeReviewModule.remedialContent.selfCheckQuestion.explanation}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Completing will resolve the recommendation in Firestore.
              </span>

              {!answerSubmitted ? (
                <button
                  onClick={handleAnswerSubmit}
                  disabled={selectedAnswer === null}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Verify Answer
                </button>
              ) : selectedAnswer === activeReviewModule.remedialContent.selfCheckQuestion.correctAnswerIndex ? (
                <button
                  onClick={() => setActiveReviewModule(null)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer"
                >
                  Complete & Return
                </button>
              ) : (
                <button
                  onClick={() => {
                    setAnswerSubmitted(false);
                    setSelectedAnswer(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
