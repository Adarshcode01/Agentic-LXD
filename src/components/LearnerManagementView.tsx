import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  BookOpen,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  UserCheck,
  Calendar,
  Send
} from 'lucide-react';
import { Learner, Course, LearnerCourseProgress } from '../types/lms';

interface LearnerManagementViewProps {
  learners: Learner[];
  courses: Course[];
  onAssignCourseToLearners: (courseId: string, learnerIds: string[], dueDate?: string) => void;
}

export const LearnerManagementView: React.FC<LearnerManagementViewProps> = ({
  learners,
  courses,
  onAssignCourseToLearners
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedLearner360, setSelectedLearner360] = useState<Learner | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Assign modal state
  const [targetCourseId, setTargetCourseId] = useState<string>(courses[0]?.id || '');
  const [assignmentScope, setAssignmentScope] = useState<'individual' | 'department'>('department');
  const [selectedDeptForAssign, setSelectedDeptForAssign] = useState<string>('Retail Lending');
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>('2026-10-15');

  // Departments list
  const departments = Array.from(new Set(learners.map(l => l.department)));

  const filteredLearners = learners.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.role.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedDepartment !== 'all' && l.department !== selectedDepartment) {
      return false;
    }
    return true;
  });

  const handleOpenAssign = (learnerId?: string) => {
    if (learnerId) {
      setAssignmentScope('individual');
      setSelectedLearnerIds([learnerId]);
    } else {
      setAssignmentScope('department');
      setSelectedLearnerIds([]);
    }
    setIsAssignModalOpen(true);
  };

  const handleExecuteAssign = () => {
    let ids: string[] = [];
    if (assignmentScope === 'individual') {
      ids = selectedLearnerIds;
    } else {
      ids = learners.filter(l => l.department === selectedDeptForAssign).map(l => l.id);
    }

    if (ids.length === 0) {
      alert('Please select at least one learner or department.');
      return;
    }

    onAssignCourseToLearners(targetCourseId, ids, dueDate);
    setIsAssignModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Workforce Learners & Teams</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor individual progress, inspect Learner 360 profiles, and assign training modules.
          </p>
        </div>
        <button
          onClick={() => handleOpenAssign()}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Assign Course to Team</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search learner by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Department:</span>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none"
          >
            <option value="all">All Departments ({learners.length})</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept} ({learners.filter(l => l.department === dept).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Learners Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-5">Learner</th>
                <th className="py-3 px-4">Department / Role</th>
                <th className="py-3 px-4 text-center">Assigned</th>
                <th className="py-3 px-4 text-center">Completed</th>
                <th className="py-3 px-4 text-center">Avg Score</th>
                <th className="py-3 px-4">Weak Areas</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLearners.map(learner => (
                <tr key={learner.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {learner.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{learner.name}</div>
                        <div className="text-[11px] text-slate-400">{learner.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800">{learner.department}</div>
                    <div className="text-[11px] text-slate-500">{learner.role}</div>
                  </td>

                  <td className="py-3.5 px-4 text-center font-mono tabular-nums">
                    {learner.assignedCourses.length}
                  </td>

                  <td className="py-3.5 px-4 text-center font-mono tabular-nums text-emerald-600 font-semibold">
                    {learner.completedCoursesCount}
                  </td>

                  <td className="py-3.5 px-4 text-center font-mono tabular-nums">
                    {learner.avgScore > 0 ? (
                      <span className="font-bold text-slate-900">{learner.avgScore}%</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    {learner.weakAreas.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {learner.weakAreas.map((area, idx) => (
                          <span key={idx} className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                            {area}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">None flagged</span>
                    )}
                  </td>

                  <td className="py-3.5 px-5 text-right space-x-2">
                    <button
                      onClick={() => setSelectedLearner360(learner)}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                    >
                      Learner 360
                    </button>
                    <button
                      onClick={() => handleOpenAssign(learner.id)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    >
                      Assign
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Learner 360 Modal / Drawer */}
      {selectedLearner360 && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold text-lg flex items-center justify-center">
                  {selectedLearner360.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedLearner360.name}</h2>
                  <p className="text-xs text-slate-500">
                    {selectedLearner360.role} · {selectedLearner360.department} · {selectedLearner360.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLearner360(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stat Tiles */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
              <div>
                <div className="text-xs text-slate-500">Courses Completed</div>
                <div className="text-base font-bold text-slate-900 tabular-nums">{selectedLearner360.completedCoursesCount}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Average Score</div>
                <div className="text-base font-bold text-emerald-600 tabular-nums">{selectedLearner360.avgScore}%</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Knowledge Gaps</div>
                <div className="text-base font-bold text-amber-600 tabular-nums">{selectedLearner360.weakAreas.length}</div>
              </div>
            </div>

            {/* Assigned Modules Progression */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Course History & Progress</h3>
              <div className="space-y-2">
                {selectedLearner360.assignedCourses.map((ac, idx) => (
                  <div key={idx} className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-slate-900 truncate">{ac.courseTitle}</div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                        <span>{ac.progressPercent}% progress</span>
                        <span>·</span>
                        <span>{ac.timeSpentMinutes}m spent</span>
                        {ac.score !== undefined && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-emerald-600">Score: {ac.score}%</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      ac.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : ac.status === 'in_progress'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {ac.status === 'completed' ? 'Completed' : ac.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weak Areas & AI Remediation Suggestion */}
            {selectedLearner360.weakAreas.length > 0 && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>AI Recommended Micro-Remediation</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Learner struggled with: <strong>{selectedLearner360.weakAreas.join(', ')}</strong>. Recommend assigning a 2-minute scenario refresh on TRID regulations.
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLearner360(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Course Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Assign Course to Workforce</h2>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Select Course */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Course Module</label>
                <select
                  value={targetCourseId}
                  onChange={(e) => setTargetCourseId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                >
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title} ({course.publishStatus === 'published' ? 'Published' : 'Draft'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignment Scope */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Audience Scope</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignmentScope('department')}
                    className={`py-2 px-3 rounded-lg border font-medium cursor-pointer text-center ${
                      assignmentScope === 'department'
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Entire Department / Team
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentScope('individual')}
                    className={`py-2 px-3 rounded-lg border font-medium cursor-pointer text-center ${
                      assignmentScope === 'individual'
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Individual Learner
                  </button>
                </div>
              </div>

              {/* Select Department or Individual */}
              {assignmentScope === 'department' ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Department</label>
                  <select
                    value={selectedDeptForAssign}
                    onChange={(e) => setSelectedDeptForAssign(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                  >
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Learner</label>
                  <select
                    value={selectedLearnerIds[0] || ''}
                    onChange={(e) => setSelectedLearnerIds([e.target.value])}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                  >
                    {learners.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.role})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Due Date */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Completion Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAssign}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
