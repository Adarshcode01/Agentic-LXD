import React, { useState } from 'react';
import { Bot, Send, User, RotateCcw, AlertTriangle, CheckCircle2, TrendingUp, Sparkles, MessageSquare } from 'lucide-react';
import { RolePlayMessage, XAPIStatement } from '../types/lms';

interface RolePlayTutorViewProps {
  onXapiEmitted: (statement: XAPIStatement) => void;
  onNavigateToTelemetry: () => void;
}

const DEFAULT_SCENARIO = {
  id: 'billing-dispute-deescalation',
  personaName: 'Marcus Vance',
  personaTitle: 'Director of Enterprise Infrastructure, Vance Corp',
  situation: 'Received an unexpected $12,450 cloud compute charge after an internal team mistakenly ran a distributed machine learning training loop over the weekend. Threatening to terminate contract and dispute invoice with legal counsel.',
  rubric: 'Empathy & Validation (25%), Emotional Composure (25%), Problem Solving & Workarounds (25%), Professional Framing (25%).',
  quickPrompts: [
    {
      label: 'Optimal Validation + Hold',
      text: 'I completely understand how shocking a $12,450 unexpected charge is. Let me immediately place a 7-day administrative hold on this invoice so your service remains active while we audit the compute telemetry together.'
    },
    {
      label: 'Diagnostic Focus',
      text: 'Let us examine the audit logs right now to trace which service account triggered these compute instances and verify whether our anomaly alert thresholds failed.'
    },
    {
      label: 'Defensive Failure (Fails Rubric)',
      text: 'You need to calm down. Our terms of service clearly state that all compute usage is non-refundable and you should have checked your dashboard alerts.'
    }
  ]
};

export const RolePlayTutorView: React.FC<RolePlayTutorViewProps> = ({
  onXapiEmitted,
  onNavigateToTelemetry
}) => {
  const [messages, setMessages] = useState<RolePlayMessage[]>([
    {
      id: 'msg-0',
      role: 'assistant',
      content: "I need to speak to someone with actual authority right now! I am looking at a $12,450 invoice for compute we never authorized. If this isn't wiped clean by noon, I am having our legal team freeze our vendor agreements and filing a chargeback.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputVal, setInputVal] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [latestEvaluation, setLatestEvaluation] = useState<{
    score: number;
    rating: string;
    tip: string;
    rubric: { empathy: number; clarity: number; problemSolving: number; professionalTone: number };
  } | null>(null);
  const [emittedStatementId, setEmittedStatementId] = useState<string | null>(null);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputVal;
    if (!text.trim() || isProcessing || isGameOver) return;

    const userMsg: RolePlayMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputVal('');
    setIsProcessing(true);

    try {
      const res = await fetch('/api/tutor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map(m => ({ role: m.role, content: m.content })),
          scenario: {
            personaName: DEFAULT_SCENARIO.personaName,
            role: DEFAULT_SCENARIO.personaTitle,
            issue: DEFAULT_SCENARIO.situation,
            rubric: DEFAULT_SCENARIO.rubric
          },
          traineeName: 'Jordan Lee (Frontline Specialist)'
        })
      });

      if (!res.ok) throw new Error('Role-play tutor response failed');
      const data = await res.json();

      const assistantMsg: RolePlayMessage = {
        id: `msg-resp-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        score: data.final_score,
        deEscalationRating: data.de_escalation_rating,
        coachingTip: data.coaching_tip,
        rubricBreakdown: data.rubric_breakdown
      };

      setMessages([...newHistory, assistantMsg]);
      setLatestEvaluation({
        score: data.final_score,
        rating: data.de_escalation_rating,
        tip: data.coaching_tip,
        rubric: data.rubric_breakdown
      });

      if (data.is_conversation_over) {
        setIsGameOver(true);
        // Automatically fire xAPI statement to BigQuery Lake
        const passed = data.final_score >= 70;
        const xapiStmt: XAPIStatement = {
          id: `stmt-sim-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: {
            mbox: 'mailto:jordan.lee@example.corp',
            name: 'Jordan Lee'
          },
          verb: {
            id: passed ? 'http://adlnet.gov/expapi/verbs/passed' : 'http://adlnet.gov/expapi/verbs/failed',
            display: { 'en-US': passed ? 'passed' : 'failed' }
          },
          object: {
            id: `https://lms-ai-builder.cloud/simulations/${DEFAULT_SCENARIO.id}`,
            definition: {
              name: { 'en-US': `Role-Play: ${DEFAULT_SCENARIO.personaName} Billing Dispute` },
              type: 'http://adlnet.gov/expapi/activities/simulation',
              description: { 'en-US': 'Real-time AI de-escalation evaluation with structured outputs' }
            }
          },
          result: {
            score: { scaled: data.final_score / 100, raw: data.final_score, min: 0, max: 100 },
            success: passed,
            completion: true,
            response: data.coaching_tip
          },
          context: {
            platform: 'Google Always-Free LMS',
            scenarioId: DEFAULT_SCENARIO.id,
            competencies: [
              data.rubric_breakdown.empathy < 15 ? 'Empathy & Validation' : '',
              data.rubric_breakdown.problemSolving < 15 ? 'Problem Solving' : ''
            ].filter(Boolean)
          }
        };

        // Ingest to BigQuery API
        const ingestRes = await fetch('/api/ingest-xapi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(xapiStmt)
        });
        const ingestData = await ingestRes.json();
        setEmittedStatementId(ingestData.statementId);
        onXapiEmitted(xapiStmt);
      }
    } catch (err: any) {
      alert('Tutor connection error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: 'msg-0',
        role: 'assistant',
        content: "I need to speak to someone with actual authority right now! I am looking at a $12,450 invoice for compute we never authorized. If this isn't wiped clean by noon, I am having our legal team freeze our vendor agreements and filing a chargeback.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setIsGameOver(false);
    setLatestEvaluation(null);
    setEmittedStatementId(null);
  };

  return (
    <div className="space-y-8">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            AI Role-Play Tutor with Structured Outputs
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Real-time interactive simulation powered by Gemini 3.8 Flash. Gemini adopts the persona of an agitated enterprise client and uses <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono text-xs">responseSchema</code> to continuously grade de-escalation performance and emit xAPI telemetry.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer self-start"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Simulation</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Simulation Booth (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs h-[540px] sm:h-[640px]">
          {/* Persona Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm">
                MV
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900">{DEFAULT_SCENARIO.personaName}</div>
                <div className="text-xs text-slate-500">{DEFAULT_SCENARIO.personaTitle}</div>
              </div>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span>Emotional State: Highly Agitated</span>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/40">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    MV
                  </div>
                )}

                <div className={`max-w-[82%] space-y-1.5`}>
                  <div
                    className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-white border border-slate-200 text-slate-800 shadow-2xs rounded-bl-xs'
                    }`}
                  >
                    {m.content}
                  </div>

                  <div className="flex items-center justify-between px-1 text-xs text-slate-400">
                    <span>{m.timestamp}</span>
                    {m.score !== undefined && (
                      <span className="font-mono font-medium">
                        Score: {m.score}% ({m.deEscalationRating})
                      </span>
                    )}
                  </div>
                </div>

                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    JL
                  </div>
                )}
              </div>
            ))}

            {isProcessing && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-lg border border-slate-200 w-fit">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Gemini 3.8 Flash evaluating empathy & formulating in-character reply...</span>
              </div>
            )}
          </div>

          {/* Completion Banner */}
          {isGameOver && (
            <div className="p-4 bg-slate-900 text-white border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold">Simulation Completed · Assessment Logged</span>
                </div>
                {emittedStatementId && (
                  <button
                    onClick={onNavigateToTelemetry}
                    className="text-xs text-blue-300 hover:text-blue-100 underline cursor-pointer"
                  >
                    View in BigQuery Lake →
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Final de-escalation score: <strong className="text-white font-mono">{latestEvaluation?.score}%</strong>. An IEEE 9274.1.1 xAPI statement has been ingested into BigQuery.
              </p>
            </div>
          )}

          {/* Input & Quick Prompts */}
          <div className="p-3 border-t border-slate-200 bg-white space-y-2">
            {!isGameOver && (
              <div className="space-y-1.5">
                <div className="text-[11px] text-slate-500 font-semibold">Suggested Trainee Responses:</div>
                <div className="flex overflow-x-auto no-scrollbar sm:flex-wrap gap-1.5 pb-1">
                  {DEFAULT_SCENARIO.quickPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(p.text)}
                      disabled={isProcessing}
                      className="text-xs text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap sm:whitespace-normal shrink-0 sm:shrink min-h-[38px] active:bg-slate-200"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 pt-1"
            >
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={isGameOver ? 'Simulation concluded. Click Reset to practice again.' : 'Type your de-escalation response to Marcus...'}
                disabled={isProcessing || isGameOver}
                className="flex-1 text-xs sm:text-sm p-2.5 sm:p-3 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-slate-100 min-h-[44px]"
              />
              <button
                type="submit"
                disabled={isProcessing || isGameOver || !inputVal.trim()}
                className="min-h-[44px] min-w-[44px] px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center active:scale-95 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Real-time Structured Scoring Rubric (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Rubric Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Structured AI Evaluation Rubric
              </h2>
              <span className="text-xs font-mono text-slate-500">Gemini responseSchema</span>
            </div>

            {latestEvaluation ? (
              <div className="space-y-4">
                {/* Score Gauge */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Current Evaluated Score</div>
                    <div className="text-2xl font-bold font-mono text-slate-900">
                      {latestEvaluation.score} / 100
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Rating</div>
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        latestEvaluation.score >= 75
                          ? 'text-emerald-700'
                          : latestEvaluation.score >= 60
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }`}
                    >
                      {latestEvaluation.rating}
                    </span>
                  </div>
                </div>

                {/* Sub-criterion Breakdowns */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">Empathy & Distress Validation</span>
                      <span className="font-mono text-slate-600">{latestEvaluation.rubric.empathy} / 25</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${(latestEvaluation.rubric.empathy / 25) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">Communication Clarity</span>
                      <span className="font-mono text-slate-600">{latestEvaluation.rubric.clarity} / 25</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${(latestEvaluation.rubric.clarity / 25) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">Collaborative Problem Solving</span>
                      <span className="font-mono text-slate-600">{latestEvaluation.rubric.problemSolving} / 25</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${(latestEvaluation.rubric.problemSolving / 25) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">Professional Tone & Composure</span>
                      <span className="font-mono text-slate-600">{latestEvaluation.rubric.professionalTone} / 25</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${(latestEvaluation.rubric.professionalTone / 25) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Pedagogical Tip */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Real-time Pedagogical Coaching</span>
                  </div>
                  <p>{latestEvaluation.tip}</p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p>Send a response in the chat to see real-time rubric scoring generated via Gemini's structured output schema.</p>
              </div>
            )}
          </div>

          {/* xAPI BigQuery Integration Callout */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2 text-xs text-slate-600">
            <div className="font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Automated BigQuery Pipeline Ingestion</span>
            </div>
            <p>
              When <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-800">is_conversation_over</code> resolves to true, Cloud Run instantly dispatches an IEEE 9274.1.1 xAPI statement (<code className="font-mono text-slate-800">actor: Jordan Lee, verb: passed/failed, object: billing-dispute</code>) straight into the BigQuery telemetry table.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
