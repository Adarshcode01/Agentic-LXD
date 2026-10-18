import React, { useState } from 'react';
import {
  Sparkles,
  BarChart3,
  Award,
  AlertTriangle,
  Users,
  CheckCircle2,
  TrendingDown,
  ArrowRight,
  BookOpen,
  RefreshCw,
  Zap,
  HelpCircle,
  Calendar
} from 'lucide-react';
import { Course, Learner } from '../types/lms';
import { BigQueryEngagementTrends, TelemetryTimeFrame } from './BigQueryEngagementTrends';

interface AnalyticsViewProps {
  courses: Course[];
  learners: Learner[];
  onImproveCourseWithAi: (courseId: string) => void;
  onRefreshTelemetry: () => void;
  onNavigateToStudio?: (courseId: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  courses,
  learners,
  onImproveCourseWithAi,
  onRefreshTelemetry,
  onNavigateToStudio
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TelemetryTimeFrame>('today');
  const [isImproving, setIsImproving] = useState(false);
  const [remediationCreated, setRemediationCreated] = useState(false);

  const activeCourse = courses.find(c => c.id === selectedCourseId) || courses[0];

  const handleTriggerImprove = () => {
    setIsImproving(true);
    setTimeout(() => {
      setIsImproving(false);
      setRemediationCreated(true);
      onImproveCourseWithAi(activeCourse.id);
    }, 1200);
  };

  return (
    <div className="space-y-8">
      {/* Header with Course Selector & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Learning Analytics & AI Insights</h1>
          <p className="text-sm text-slate-500 mt-1">
            Focus on learner outcomes, identify knowledge gaps, and trigger AI course improvements.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Course Selector Dropdown */}
          <select
            value={selectedCourseId}
            onChange={(e) => {
              setSelectedCourseId(e.target.value);
              setRemediationCreated(false);
            }}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none cursor-pointer"
          >
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>

          {/* Date Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedTimeFrame}
              onChange={(e) => setSelectedTimeFrame(e.target.value as TelemetryTimeFrame)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="last_hour">Last 1 Hour</option>
              <option value="today">Today (24h)</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="all_time">All Time</option>
            </select>
          </div>

          <button
            onClick={onRefreshTelemetry}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Decision-First Course Performance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Course Completion</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
            {activeCourse?.completionRate || 74}%
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            31 of 42 learners completed
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Average Score</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
            {activeCourse?.averageScore || 86}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Passing threshold: 75%
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Learners In Progress</div>
          <div className="text-3xl font-extrabold text-blue-600 mt-1 tabular-nums">
            8
          </div>
          <div className="text-[11px] text-blue-700 font-medium mt-1">
            Average resume at Chapter 2
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Topics Needing Attention</div>
          <div className="text-3xl font-extrabold text-amber-600 mt-1 tabular-nums">
            2
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">
            TRID 3-Day Rule & DTI
          </div>
        </div>
      </div>

      {/* AI Learning Intelligence Banner (Actionable Insights) */}
      <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white border border-blue-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Gemini AI Pedagogical Insight</span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500">Course: {activeCourse.title}</span>
            </div>

            <h3 className="text-base font-bold text-slate-900">
              38% of learners encounter friction in Chapter 2, Section 2 (Unpapered Cash Gifts).
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
              The assessment question regarding <strong>TRID 3-day CD waiting periods</strong> exhibits a 42% incorrect response rate. Learners frequently confuse calendar days with federal business days.
            </p>

            <div className="p-3.5 bg-white border border-blue-100 rounded-lg text-xs space-y-1">
              <div className="font-semibold text-slate-800">Suggested Action:</div>
              <p className="text-slate-600">
                Add an interactive 2-minute scenario with real calendar comparison cards in Chapter 2 prior to the final assessment.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={handleTriggerImprove}
                disabled={isImproving || remediationCreated}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isImproving ? 'Generating Improvement...' : remediationCreated ? 'Improvement Generated!' : 'Improve with AI'}</span>
              </button>

              {remediationCreated && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Interactive Scenario added to Chapter 2 in Studio!</span>
                  </span>
                  {onNavigateToStudio && (
                    <button
                      onClick={() => onNavigateToStudio(activeCourse.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <span>Open in Studio to Review & Publish →</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time BigQuery xAPI Telemetry & Engagement Trends (Recharts) */}
      <BigQueryEngagementTrends
        courseTitle={activeCourse?.title}
        timeFrame={selectedTimeFrame}
        onTimeFrameChange={setSelectedTimeFrame}
        onRefresh={onRefreshTelemetry}
      />

      {/* Grid: Assessment Difficulty Breakdown & Drop-off Points */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Difficult Questions */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Question Difficulty Analysis</h3>
            <p className="text-xs text-slate-500 mt-0.5">Quiz questions sorted by incorrect response frequency</p>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-rose-900">Closing Disclosure 3-Day Rule</span>
                <span className="font-mono text-rose-700 font-bold">42% Failed</span>
              </div>
              <p className="text-xs text-slate-600">
                "How many business days prior to closing must the borrower receive the final Closing Disclosure?"
              </p>
              <div className="text-[11px] text-slate-500">
                Most common incorrect choice: <em>1 business day (28%)</em>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-900">Debt-to-Income (DTI) QM Limit</span>
                <span className="font-mono text-amber-700 font-bold">31% Failed</span>
              </div>
              <p className="text-xs text-slate-600">
                "What is the maximum back-end Debt-to-Income ratio benchmark under standard QM guidelines?"
              </p>
              <div className="text-[11px] text-slate-500">
                Most common incorrect choice: <em>36% (22%)</em>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">PMI Cancellation Threshold</span>
                <span className="font-mono text-emerald-600 font-bold">12% Failed (88% Passed)</span>
              </div>
              <p className="text-xs text-slate-600">
                "At what Loan-to-Value threshold is Private Mortgage Insurance mandated?"
              </p>
            </div>
          </div>
        </div>

        {/* Drop-off & Progression Pipeline */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Learner Progression Funnel</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tracking drop-off rates across course milestones</p>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Course Launch & Chapter 1 (Loan Types)</span>
                <span className="font-mono text-slate-900">42 learners (100%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Chapter 2 (Pipeline & Verification)</span>
                <span className="font-mono text-slate-900">35 learners (83%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '83%' }} />
              </div>
              <span className="text-[10px] text-amber-600 font-medium block mt-1">
                Drop-off point: 7 learners paused at Unpapered Cash Deposit scenario
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Final Assessment Attempted</span>
                <span className="font-mono text-slate-900">33 learners (78%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '78%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Certified & Passed (Score &ge; 75%)</span>
                <span className="font-mono text-slate-900">31 learners (74%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '74%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
