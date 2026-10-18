import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Play,
  Share2,
  Download,
  Users,
  CheckCircle,
  Clock,
  Search,
  MoreVertical,
  Award,
  Sparkles,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { Course, Learner } from '../types/lms';
import {
  createScorm12PackageZip,
  createCmi5PackageZip,
  createXapiBundleZip
} from '../lib/scormGenerator';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface CourseCatalogViewProps {
  courses: Course[];
  learners: Learner[];
  onCreateCourse: () => void;
  onOpenCourse: (course: Course) => void;
  onPreviewCourse: (course: Course) => void;
  onPublishCourse: (courseId: string) => void;
  onAssignCourse: (course: Course) => void;
}

export const CourseCatalogView: React.FC<CourseCatalogViewProps> = ({
  courses,
  learners,
  onCreateCourse,
  onOpenCourse,
  onPreviewCourse,
  onPublishCourse,
  onAssignCourse
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'approved' | 'draft'>('all');
  const [downloadingCourseId, setDownloadingCourseId] = useState<string | null>(null);
  const [activeExportMenuId, setActiveExportMenuId] = useState<string | null>(null);

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'published') return course.publishStatus === 'published';
    if (statusFilter === 'approved') return course.approvalStatus === 'approved';
    if (statusFilter === 'draft') return course.approvalStatus === 'draft';
    return true;
  });

  const handleDownloadScorm = async (course: Course) => {
    setDownloadingCourseId(course.id);
    try {
      const blob = await createScorm12PackageZip(course);
      downloadBlob(blob, `${course.id}_SCORM_1.2.zip`);
    } catch (err: any) {
      alert('SCORM export error: ' + err.message);
    } finally {
      setDownloadingCourseId(null);
      setActiveExportMenuId(null);
    }
  };

  const handleDownloadCmi5 = async (course: Course) => {
    setDownloadingCourseId(course.id);
    try {
      const blob = await createCmi5PackageZip(course);
      downloadBlob(blob, `${course.id}_cmi5.zip`);
    } catch (err: any) {
      alert('cmi5 export error: ' + err.message);
    } finally {
      setDownloadingCourseId(null);
      setActiveExportMenuId(null);
    }
  };

  const handleExportXapi = async (course: Course) => {
    try {
      const blob = await createXapiBundleZip(course);
      downloadBlob(blob, `${course.id}_xAPI_Bundle.zip`);
    } catch (err: any) {
      alert('xAPI export error: ' + err.message);
    } finally {
      setActiveExportMenuId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Courses Portfolio</h1>
          <p className="text-sm text-slate-500 mt-1">
            Author, version, publish to workforce, and download standards-based LMS packages.
          </p>
        </div>
        <button
          onClick={onCreateCourse}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Course</span>
        </button>
      </div>

      {/* Search and Status Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, topic, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Courses ({courses.length})
          </button>
          <button
            onClick={() => setStatusFilter('published')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'published'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Published ({courses.filter(c => c.publishStatus === 'published').length})
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Approved ({courses.filter(c => c.approvalStatus === 'approved').length})
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'draft'
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Drafts ({courses.filter(c => c.approvalStatus === 'draft').length})
          </button>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCourses.map(course => (
          <div
            key={course.id}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div>
              {/* Header Badge Row */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  course.publishStatus === 'published'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : course.approvalStatus === 'approved'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {course.publishStatus === 'published' ? 'Published' : course.approvalStatus === 'approved' ? 'Approved' : 'Draft'}
                </span>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                  {course.approvedVersion && <span>{course.approvedVersion}</span>}
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="font-bold text-base text-slate-900 line-clamp-1">{course.title}</h3>
              <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{course.description}</p>

              {/* Metrics / Details */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-lg mt-4 text-center">
                <div>
                  <div className="text-xs font-bold text-slate-900 tabular-nums">{course.chapters.length}</div>
                  <div className="text-[10px] text-slate-500">Chapters</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 tabular-nums">{course.estimatedTimeMinutes}m</div>
                  <div className="text-[10px] text-slate-500">Duration</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 tabular-nums">{course.enrollmentCount || 0}</div>
                  <div className="text-[10px] text-slate-500">Enrolled</div>
                </div>
              </div>

              {course.completionRate !== undefined && course.completionRate > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-500">Completion</span>
                    <span className="font-semibold text-emerald-600 tabular-nums">{course.completionRate}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${course.completionRate}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="pt-4 border-t border-slate-100 mt-5 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onPreviewCourse(course)}
                  className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-slate-500" />
                  <span>Preview</span>
                </button>

                <button
                  onClick={() => onOpenCourse(course)}
                  className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer"
                >
                  <span>Edit in Studio</span>
                </button>
              </div>

              {/* Publish & Export Actions */}
              <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                {course.publishStatus !== 'published' ? (
                  <button
                    onClick={() => onPublishCourse(course.id)}
                    className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Publish to LMS</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onAssignCourse(course)}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Assign to Learners</span>
                  </button>
                )}

                {/* Export Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setActiveExportMenuId(activeExportMenuId === course.id ? null : course.id)}
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-medium py-1 px-1.5 rounded hover:bg-slate-100 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {activeExportMenuId === course.id && (
                    <div className="absolute right-0 bottom-full mb-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 text-xs">
                      <button
                        onClick={() => handleDownloadScorm(course)}
                        disabled={downloadingCourseId === course.id}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700 cursor-pointer"
                      >
                        <span>SCORM 1.2 (.zip)</span>
                        <span className="text-[10px] text-slate-400 font-mono">LMS</span>
                      </button>
                      <button
                        onClick={() => handleDownloadCmi5(course)}
                        disabled={downloadingCourseId === course.id}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700 cursor-pointer"
                      >
                        <span>cmi5 (.zip)</span>
                        <span className="text-[10px] text-slate-400 font-mono">Modern</span>
                      </button>
                      <button
                        onClick={() => handleExportXapi(course)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700 border-t border-slate-100 cursor-pointer"
                      >
                        <span>xAPI Package (.json)</span>
                        <span className="text-[10px] text-slate-400 font-mono">LRS</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl p-8">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No courses match your criteria</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or create a brand new course from your training documents using AI.
          </p>
          <button
            onClick={onCreateCourse}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Course with AI</span>
          </button>
        </div>
      )}
    </div>
  );
};
