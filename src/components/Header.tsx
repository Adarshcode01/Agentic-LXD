import React from 'react';
import {
  Sparkles,
  BookOpen,
  LayoutDashboard,
  Users,
  BarChart3,
  PlusCircle,
  GraduationCap,
  Briefcase,
  LogIn,
  LogOut,
  CheckCircle,
  Database
} from 'lucide-react';
import type { User } from 'firebase/auth';

export type UserRole = 'designer' | 'learner';
export type DesignerTab = 'dashboard' | 'courses' | 'create' | 'learners' | 'analytics' | 'ai_studio';

interface HeaderProps {
  currentRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  activeDesignerTab: DesignerTab;
  onSelectDesignerTab: (tab: DesignerTab) => void;
  currentUser?: User | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onChangeRole,
  activeDesignerTab,
  onSelectDesignerTab,
  currentUser,
  onSignIn,
  onSignOut
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectDesignerTab('dashboard')}
            className="text-left font-bold text-lg tracking-tight text-slate-900 hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-2"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
              AI
            </div>
            <span>E-Learning Studio</span>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        {currentRole === 'designer' ? (
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <button
              onClick={() => onSelectDesignerTab('dashboard')}
              className={`py-1 transition-colors cursor-pointer ${
                activeDesignerTab === 'dashboard'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'hover:text-slate-900'
              }`}
            >
              Dashboard
            </button>

            <button
              onClick={() => onSelectDesignerTab('courses')}
              className={`py-1 transition-colors cursor-pointer ${
                activeDesignerTab === 'courses'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'hover:text-slate-900'
              }`}
            >
              Courses
            </button>

            <button
              onClick={() => onSelectDesignerTab('create')}
              className={`py-1 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeDesignerTab === 'create'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3 h-3 text-blue-500" />
              <span>Create with AI</span>
            </button>

            <button
              onClick={() => onSelectDesignerTab('learners')}
              className={`py-1 transition-colors cursor-pointer ${
                activeDesignerTab === 'learners'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'hover:text-slate-900'
              }`}
            >
              Learners
            </button>

            <button
              onClick={() => onSelectDesignerTab('analytics')}
              className={`py-1 transition-colors cursor-pointer ${
                activeDesignerTab === 'analytics'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'hover:text-slate-900'
              }`}
            >
              Analytics
            </button>

            <button
              onClick={() => onSelectDesignerTab('ai_studio')}
              className={`py-1 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeDesignerTab === 'ai_studio'
                  ? 'text-purple-600 border-b-2 border-purple-600 font-bold'
                  : 'hover:text-slate-900 text-purple-700'
              }`}
            >
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>AI Studio & Media</span>
            </button>
          </nav>
        ) : (
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-800">Learner Learning Portal</span>
            <span>·</span>
            <span>Assigned Courses & Interactive Player</span>
          </div>
        )}

        {/* Zone 3: Role Switcher & Auth */}
        <div className="flex items-center gap-3">
          {/* Role Switcher Segmented Control */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => onChangeRole('designer')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                currentRole === 'designer'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Designer / Admin</span>
              <span className="sm:hidden">Designer</span>
            </button>

            <button
              onClick={() => onChangeRole('learner')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                currentRole === 'learner'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Learner Portal</span>
              <span className="sm:hidden">Learner</span>
            </button>
          </div>

          {/* Quick Create Button (for designer) */}
          {currentRole === 'designer' && (
            <button
              onClick={() => onSelectDesignerTab('create')}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Course</span>
            </button>
          )}

          {/* User Authentication Status */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-xs text-slate-700">
                <Database className="w-3 h-3 text-emerald-600" />
                <span className="hidden md:inline font-mono text-[11px] text-slate-600">
                  {currentUser.displayName || (currentUser.isAnonymous ? 'Guest' : currentUser.email?.split('@')[0])}
                </span>
                <span title="Cloud Connected" className="flex items-center">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                </span>
              </div>
              <button
                onClick={onSignOut}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
