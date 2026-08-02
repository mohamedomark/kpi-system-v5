import React, { useState, useEffect } from 'react';
import { User, Employee, KPI, Evaluation, Goal, SelfAppraisal, FeedbackRequest, DepartmentCode } from '../types';
import { api } from '../services/api';
import { calculateEmployeePerformance } from '../utils/kpiCalculator';
import {
  User as UserIcon,
  ShieldCheck,
  Target,
  Award,
  Calendar,
  MessageSquare,
  Plus,
  CheckCircle2,
  Clock,
  Send,
  Users,
  Edit3,
  Trash2,
  Sparkles,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  UserCheck,
} from 'lucide-react';

interface UserPortalProps {
  currentUser: User;
  employees: Employee[];
  kpis: KPI[];
  evaluations: Evaluation[];
  selectedMonth: number;
  selectedYear: number;
  selectedDept: DepartmentCode;
  onRefreshData?: () => void;
}

export const UserPortal: React.FC<UserPortalProps> = ({
  currentUser,
  employees,
  kpis,
  evaluations,
  selectedMonth,
  selectedYear,
  selectedDept,
  onRefreshData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'appraisal' | 'goals' | 'feedback' | 'user_management'>('appraisal');

  // Goals State
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalCategory, setGoalCategory] = useState('KPI Target');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [goalProgress, setGoalProgress] = useState(0);

  // Self Appraisals State
  const [selfAppraisals, setSelfAppraisals] = useState<SelfAppraisal[]>([]);
  const [savingSelfAppraisal, setSavingSelfAppraisal] = useState<string | null>(null);

  // Feedback Requests State
  const [feedbackRequests, setFeedbackRequests] = useState<FeedbackRequest[]>([]);
  const [fbEvaluator, setFbEvaluator] = useState('PO');
  const [fbSubject, setFbSubject] = useState('');
  const [fbMessage, setFbMessage] = useState('');
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});

  // User Management State (for Admins / Evaluators)
  const [usersList, setUsersList] = useState<User[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<User['role']>('EMPLOYEE');
  const [newDept, setNewDept] = useState<DepartmentCode>('DEV');
  const [newEmpId, setNewEmpId] = useState<string>('');
  const [newPassword, setNewPassword] = useState('123');

  // Interactive Action States (Delete Modals & Alerts)
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Find linked employee record if logged in as an employee
  const linkedEmployee = employees.find(
    (e) => e.id === currentUser.employeeId || e.name.toLowerCase() === currentUser.name.toLowerCase()
  );

  const empDept = linkedEmployee?.departmentId || currentUser.departmentId || selectedDept;
  const deptKpis = kpis.filter((k) => k.departmentId === empDept);

  // Calculate personal performance if linked
  let personalPerformance = null;
  if (linkedEmployee) {
    const empEvals = evaluations.filter(
      (ev) => ev.employeeId === linkedEmployee.id && ev.month === selectedMonth && ev.year === selectedYear
    );
    const evalsMap = new Map<string, Evaluation>();
    empEvals.forEach((ev) => evalsMap.set(ev.kpiId, ev));

    personalPerformance = calculateEmployeePerformance(
      linkedEmployee,
      deptKpis,
      evalsMap,
      selectedMonth,
      selectedYear
    );
  }

  // Load user data
  useEffect(() => {
    loadGoals();
    loadFeedback();
    if (currentUser.role !== 'EMPLOYEE') {
      loadUsers();
    }
  }, [currentUser]);

  useEffect(() => {
    if (linkedEmployee) {
      loadSelfAppraisals();
    }
  }, [linkedEmployee, selectedMonth, selectedYear]);

  const loadGoals = async () => {
    try {
      const g = await api.getGoals(currentUser.role === 'EMPLOYEE' ? currentUser.id : undefined, empDept);
      setGoals(g);
    } catch (e) {
      console.error('Failed to load goals', e);
    }
  };

  const loadSelfAppraisals = async () => {
    if (!linkedEmployee) return;
    try {
      const sa = await api.getSelfAppraisals(linkedEmployee.id, selectedMonth, selectedYear);
      setSelfAppraisals(sa);
    } catch (e) {
      console.error('Failed to load self appraisals', e);
    }
  };

  const loadFeedback = async () => {
    try {
      const fb = await api.getFeedbackRequests(currentUser.role === 'EMPLOYEE' ? currentUser.id : undefined);
      setFeedbackRequests(fb);
    } catch (e) {
      console.error('Failed to load feedback requests', e);
    }
  };

  const loadUsers = async () => {
    try {
      const u = await api.getUsers();
      const uniqueUsers = u.filter((usr, idx, self) => self.findIndex((x) => x.id === usr.id) === idx);
      setUsersList(uniqueUsers);
    } catch (e) {
      console.error('Failed to load users list', e);
    }
  };

  // Save Self Appraisal Entry
  const handleSaveSelfEntry = async (kpiId: string, field: 'w1' | 'w2' | 'w3' | 'w4' | 'notes', value: any) => {
    if (!linkedEmployee) return;
    setSavingSelfAppraisal(kpiId);

    const existing = selfAppraisals.find((sa) => sa.kpiId === kpiId) || {
      employeeId: linkedEmployee.id,
      kpiId,
      month: selectedMonth,
      year: selectedYear,
      selfW1Pct: null,
      selfW2Pct: null,
      selfW3Pct: null,
      selfW4Pct: null,
      selfNotes: '',
    };

    let updated = { ...existing };
    if (field === 'w1') updated.selfW1Pct = value === '' ? null : Number(value);
    if (field === 'w2') updated.selfW2Pct = value === '' ? null : Number(value);
    if (field === 'w3') updated.selfW3Pct = value === '' ? null : Number(value);
    if (field === 'w4') updated.selfW4Pct = value === '' ? null : Number(value);
    if (field === 'notes') updated.selfNotes = String(value);

    try {
      const saved = await api.saveSelfAppraisal(updated);
      setSelfAppraisals((prev) => {
        const idx = prev.findIndex((sa) => sa.kpiId === kpiId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
    } catch (e) {
      console.error('Error saving self appraisal', e);
    } finally {
      setTimeout(() => setSavingSelfAppraisal(null), 300);
    }
  };

  // Add New Goal
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    try {
      const created = await api.saveGoal({
        userId: currentUser.id,
        title: goalTitle,
        description: goalDesc,
        category: goalCategory,
        departmentId: empDept,
        status: goalProgress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
        progressPct: goalProgress,
        targetDate: goalTargetDate || new Date().toISOString().split('T')[0],
      });
      setGoals((prev) => [...prev, created]);
      setShowAddGoalModal(false);
      setGoalTitle('');
      setGoalDesc('');
      setGoalProgress(0);
    } catch (err: any) {
      alert(`Failed to add goal: ${err.message}`);
    }
  };

  // Update Goal Progress
  const handleUpdateGoalStatus = async (goal: Goal, newProgress: number) => {
    try {
      const updated = await api.saveGoal({
        ...goal,
        progressPct: newProgress,
        status: newProgress === 100 ? 'COMPLETED' : newProgress > 0 ? 'IN_PROGRESS' : 'TODO',
      });
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
    } catch (err: any) {
      alert(`Failed to update goal: ${err.message}`);
    }
  };

  // Delete Goal
  const handleDeleteGoal = async (id: string) => {
    setDeletingGoalId(id);
  };

  // Submit Feedback Request
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbSubject.trim() || !fbMessage.trim()) return;

    try {
      const sent = await api.sendFeedbackRequest({
        userId: currentUser.id,
        employeeId: linkedEmployee?.id || '',
        evaluatorRole: fbEvaluator,
        subject: fbSubject,
        message: fbMessage,
      });
      setFeedbackRequests((prev) => [sent, ...prev]);
      setFbSubject('');
      setFbMessage('');
      setBannerMessage({ type: 'success', text: 'Feedback request sent to evaluator successfully!' });
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: `Failed to send feedback: ${err.message}` });
    }
  };

  // Reply Feedback (Evaluator / Admin)
  const handleReplyFeedback = async (reqId: string) => {
    const text = replyTextMap[reqId];
    if (!text || !text.trim()) return;

    try {
      const updated = await api.replyFeedbackRequest(reqId, text);
      setFeedbackRequests((prev) => prev.map((f) => (f.id === reqId ? updated : f)));
      setReplyTextMap((prev) => ({ ...prev, [reqId]: '' }));
      setBannerMessage({ type: 'success', text: 'Reply submitted successfully.' });
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: `Failed to reply: ${err.message}` });
    }
  };

  // Create User Account (Admin / Evaluator)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newName.trim()) return;

    try {
      const created = await api.saveUser({
        username: newUsername,
        name: newName,
        email: newEmail || `${newUsername.trim()}@company.com`,
        role: newRole,
        departmentId: newDept,
        employeeId: newEmpId || undefined,
        password: newPassword || '123',
      });
      setUsersList((prev) => [...prev, created]);
      setShowAddUserModal(false);
      setNewUsername('');
      setNewName('');
      setNewEmail('');
      setNewPassword('123');
      setBannerMessage({ type: 'success', text: `User account @${created.username} (${created.name}) created successfully!` });
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: `Failed to create user: ${err.message}` });
    }
  };

  return (
    <div className="space-y-6">
      {bannerMessage && (
        <div className={`p-4 rounded-2xl flex items-center justify-between border text-xs font-bold transition-all shadow-sm ${
          bannerMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-2.5">
            {bannerMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
          <button
            onClick={() => setBannerMessage(null)}
            className="text-slate-400 hover:text-slate-700 font-extrabold px-2 py-0.5 text-base cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}
      
      {/* Logged in User Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-emerald-950/40 shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {currentUser.name}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${
                  currentUser.role === 'ADMIN'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : currentUser.role === 'EVALUATOR'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {currentUser.role}
                </span>
                {currentUser.departmentId && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300">
                    {currentUser.departmentId} Dept
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>@{currentUser.username}</span> &bull; <span>{currentUser.email}</span>
              </p>
            </div>
          </div>

          {/* Quick Score Metrics Badge if linked to Employee */}
          {personalPerformance && (
            <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 shrink-0">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Current Month Score ({selectedMonth}/{selectedYear})
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  {personalPerformance.totalScore.toFixed(2)} <span className="text-xs text-slate-400">/ 100</span>
                </div>
              </div>

              <div className={`px-3 py-1.5 rounded-xl text-center font-bold text-xs border ${
                personalPerformance.performanceGrade === 'A+'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : personalPerformance.performanceGrade === 'A'
                  ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                <div className="text-[9px] uppercase tracking-widest text-slate-400">Grade</div>
                <div className="text-base font-black">{personalPerformance.performanceGrade}</div>
              </div>
            </div>
          )}

        </div>

        {/* Sub Navigation Bar inside User Hub */}
        <div className="flex items-center space-x-2 border-t border-slate-700/60 mt-6 pt-4 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab('appraisal')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activeSubTab === 'appraisal'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Edit3 className="h-4 w-4" />
            Self-Appraisal & Reflection
          </button>

          <button
            onClick={() => setActiveSubTab('goals')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activeSubTab === 'goals'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Target className="h-4 w-4" />
            Personal Goals & Milestones ({goals.length})
          </button>

          <button
            onClick={() => setActiveSubTab('feedback')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activeSubTab === 'feedback'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            1-on-1 Feedback & Reviews ({feedbackRequests.length})
          </button>

          {currentUser.role !== 'EMPLOYEE' && (
            <button
              onClick={() => setActiveSubTab('user_management')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                activeSubTab === 'user_management'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Users className="h-4 w-4" />
              User Access & Roles
            </button>
          )}
        </div>
      </div>

      {/* SUB-TAB 1: Self Appraisal & Reflection */}
      {activeSubTab === 'appraisal' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  Monthly Self-Appraisal ({selectedMonth}/{selectedYear})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Input your weekly self-evaluations and reflection notes for side-by-side comparison with evaluator scores.
                </p>
              </div>

              {linkedEmployee ? (
                <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                  Linked Profile: {linkedEmployee.name} ({linkedEmployee.departmentId})
                </span>
              ) : (
                <span className="text-xs font-medium px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
                  User not linked to a specific employee profile.
                </span>
              )}
            </div>

            {!linkedEmployee ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
                <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="font-bold text-slate-700">No Employee Profile Linked</p>
                <p className="mt-1">
                  You are logged in as <span className="font-semibold text-slate-900">{currentUser.name}</span>. An Admin can link your user account to an employee record in the User Management tab.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-slate-100 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">KPI Name</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Weight</th>
                      <th className="p-3 text-center">Week 1 (Self / Mgr)</th>
                      <th className="p-3 text-center">Week 2 (Self / Mgr)</th>
                      <th className="p-3 text-center">Week 3 (Self / Mgr)</th>
                      <th className="p-3 text-center">Week 4 (Self / Mgr)</th>
                      <th className="p-3">Self-Reflection Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {deptKpis.map((kpi) => {
                      const sa = selfAppraisals.find((s) => s.kpiId === kpi.id);
                      const evalMatch = evaluations.find(
                        (ev) => ev.employeeId === linkedEmployee.id && ev.kpiId === kpi.id
                      );

                      return (
                        <tr key={kpi.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-bold text-slate-900">
                            {kpi.name}
                          </td>
                          <td className="p-3 text-slate-500">{kpi.evaluatorRole}</td>
                          <td className="p-3 font-semibold text-emerald-700">{kpi.weight}%</td>

                          {/* Week 1 */}
                          <td className="p-2 text-center border-l border-slate-100">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="Self"
                                value={sa?.selfW1Pct ?? ''}
                                onChange={(e) => handleSaveSelfEntry(kpi.id, 'w1', e.target.value)}
                                className="w-12 text-center bg-emerald-50/50 border border-emerald-200 rounded py-1 text-xs font-bold text-emerald-900 focus:outline-none focus:border-emerald-500"
                              />
                              <span className="text-slate-400 font-bold">/</span>
                              <span className="w-10 text-center font-bold text-slate-700 bg-slate-100 rounded py-1">
                                {evalMatch?.w1Pct ?? '-'}
                              </span>
                            </div>
                          </td>

                          {/* Week 2 */}
                          <td className="p-2 text-center border-l border-slate-100">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="Self"
                                value={sa?.selfW2Pct ?? ''}
                                onChange={(e) => handleSaveSelfEntry(kpi.id, 'w2', e.target.value)}
                                className="w-12 text-center bg-emerald-50/50 border border-emerald-200 rounded py-1 text-xs font-bold text-emerald-900 focus:outline-none focus:border-emerald-500"
                              />
                              <span className="text-slate-400 font-bold">/</span>
                              <span className="w-10 text-center font-bold text-slate-700 bg-slate-100 rounded py-1">
                                {evalMatch?.w2Pct ?? '-'}
                              </span>
                            </div>
                          </td>

                          {/* Week 3 */}
                          <td className="p-2 text-center border-l border-slate-100">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="Self"
                                value={sa?.selfW3Pct ?? ''}
                                onChange={(e) => handleSaveSelfEntry(kpi.id, 'w3', e.target.value)}
                                className="w-12 text-center bg-emerald-50/50 border border-emerald-200 rounded py-1 text-xs font-bold text-emerald-900 focus:outline-none focus:border-emerald-500"
                              />
                              <span className="text-slate-400 font-bold">/</span>
                              <span className="w-10 text-center font-bold text-slate-700 bg-slate-100 rounded py-1">
                                {evalMatch?.w3Pct ?? '-'}
                              </span>
                            </div>
                          </td>

                          {/* Week 4 */}
                          <td className="p-2 text-center border-l border-slate-100">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="Self"
                                value={sa?.selfW4Pct ?? ''}
                                onChange={(e) => handleSaveSelfEntry(kpi.id, 'w4', e.target.value)}
                                className="w-12 text-center bg-emerald-50/50 border border-emerald-200 rounded py-1 text-xs font-bold text-emerald-900 focus:outline-none focus:border-emerald-500"
                              />
                              <span className="text-slate-400 font-bold">/</span>
                              <span className="w-10 text-center font-bold text-slate-700 bg-slate-100 rounded py-1">
                                {evalMatch?.w4Pct ?? '-'}
                              </span>
                            </div>
                          </td>

                          {/* Reflection Notes */}
                          <td className="p-2 border-l border-slate-100">
                            <input
                              type="text"
                              placeholder="Write self reflection..."
                              value={sa?.selfNotes ?? ''}
                              onChange={(e) => handleSaveSelfEntry(kpi.id, 'notes', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Personal Goals & Objectives */}
      {activeSubTab === 'goals' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Target className="h-5 w-5 text-emerald-600" />
                  Personal Goals & Milestones
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set target milestones, track your KPI progress, and update achievements.
                </p>
              </div>

              <button
                onClick={() => setShowAddGoalModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus className="h-4 w-4" /> Add Personal Goal
              </button>
            </div>

            {/* Goals Grid */}
            {goals.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 text-xs">
                <Target className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700">No goals set yet</p>
                <p className="text-slate-400 mt-1">Click "Add Personal Goal" above to define performance targets.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map((g) => (
                  <div
                    key={g.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-200 hover:shadow-md transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {g.category}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1.5">{g.title}</h4>
                      </div>

                      <button
                        onClick={() => handleDeleteGoal(g.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Delete Goal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {g.description && (
                      <p className="text-xs text-slate-600 leading-relaxed">{g.description}</p>
                    )}

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-500">Progress</span>
                        <span className="text-emerald-600">{g.progressPct}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${g.progressPct}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/80">
                      <span className="text-slate-400 text-[11px]">
                        Target: <span className="font-semibold text-slate-700">{g.targetDate}</span>
                      </span>

                      <div className="flex gap-1">
                        {[25, 50, 75, 100].map((pct) => (
                          <button
                            key={pct}
                            onClick={() => handleUpdateGoalStatus(g, pct)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                              g.progressPct === pct
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: 1-on-1 Feedback & Review Requests */}
      {activeSubTab === 'feedback' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Submit New Feedback Request */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              Request 1-on-1 Review / Feedback
            </h3>
            <p className="text-xs text-slate-500">
              Submit questions or feedback regarding your KPI scores to evaluators (HR, CTO, PO, OM).
            </p>

            <form onSubmit={handleSubmitFeedback} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Recipient Role
                </label>
                <select
                  value={fbEvaluator}
                  onChange={(e) => setFbEvaluator(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="PO">Product Owner (PO)</option>
                  <option value="CTO">Chief Technology Officer (CTO)</option>
                  <option value="HR">Human Resources (HR)</option>
                  <option value="OM">Operations Manager (OM)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="e.g. Week 2 Delivery Score Clarification"
                  value={fbSubject}
                  onChange={(e) => setFbSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Message / Details
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe your review request or questions..."
                  value={fbMessage}
                  onChange={(e) => setFbMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Send className="h-4 w-4" /> Send Request
              </button>
            </form>
          </div>

          {/* Right Column: Feedback Log */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-600" />
              Feedback History ({feedbackRequests.length})
            </h3>

            {feedbackRequests.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
                <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700">No review requests yet</p>
                <p className="text-slate-400 mt-1">Submitted messages and replies will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {feedbackRequests.map((f) => (
                  <div
                    key={f.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{f.subject}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                          To: {f.evaluatorRole}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        f.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {f.status}
                      </span>
                    </div>

                    <p className="text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                      {f.message}
                    </p>

                    {f.reply ? (
                      <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200 space-y-1">
                        <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-[11px]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Manager Reply ({f.repliedAt?.split('T')[0]}):
                        </div>
                        <p className="text-emerald-950 font-medium">{f.reply}</p>
                      </div>
                    ) : (currentUser.role === 'ADMIN' || currentUser.role === 'EVALUATOR') ? (
                      <div className="pt-2 border-t border-slate-200 space-y-2">
                        <textarea
                          placeholder="Write reply to employee..."
                          value={replyTextMap[f.id] || ''}
                          onChange={(e) => setReplyTextMap({ ...replyTextMap, [f.id]: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                        ></textarea>
                        <button
                          onClick={() => handleReplyFeedback(f.id)}
                          className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500"
                        >
                          Send Manager Reply
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] italic text-slate-400">Awaiting manager review...</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* SUB-TAB 4: User Access Control & Management */}
      {activeSubTab === 'user_management' && currentUser.role !== 'EMPLOYEE' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                User Accounts & Access Control ({usersList.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage registered user accounts, assign roles (CTO, PO, OM, HR, Accountant, Admin, Evaluator, Employee), and link to employee profiles.
              </p>
            </div>

            {currentUser.role !== 'ACCOUNTANT' && (
              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus className="h-4 w-4" /> Create User Account
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-slate-100 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">User Name</th>
                  <th className="p-3">Username</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Linked Employee Profile</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {usersList.map((u, idx) => {
                  const empMatch = employees.find((e) => e.id === u.employeeId);

                  return (
                    <tr key={`${u.id}_${idx}`} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div>{u.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{u.email}</div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-600">@{u.username}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                          u.role === 'ADMIN'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : u.role === 'EVALUATOR'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{u.departmentId || 'All'}</td>
                      <td className="p-3">
                        {empMatch ? (
                          <span className="text-emerald-700 font-semibold">{empMatch.name}</span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {currentUser.role !== 'ACCOUNTANT' && (
                          <button
                            onClick={() => {
                              if (currentUser.id === u.id || currentUser.username.toLowerCase() === u.username.toLowerCase()) {
                                setBannerMessage({ type: 'error', text: 'You cannot delete your own active user account.' });
                                return;
                              }
                              setDeletingUser(u);
                            }}
                            className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 hover:text-rose-800 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Add Goal */}
      {showAddGoalModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-600" />
              Create Personal Performance Goal
            </h3>

            <form onSubmit={handleCreateGoal} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete Odoo Advanced Workflow Training"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={goalCategory}
                  onChange={(e) => setGoalCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="KPI Target">KPI Target</option>
                  <option value="Skill Improvement">Skill Improvement</option>
                  <option value="Project Milestone">Project Milestone</option>
                  <option value="Process Automation">Process Automation</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Details</label>
                <textarea
                  rows={3}
                  placeholder="Describe key actions to reach this target..."
                  value={goalDesc}
                  onChange={(e) => setGoalDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={goalTargetDate}
                    onChange={(e) => setGoalTargetDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Initial Progress %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={goalProgress}
                    onChange={(e) => setGoalProgress(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddGoalModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-sm"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add User (Admin) */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Create System User Account
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Connor"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. sarah.connor"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">User Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="CTO">CTO (Chief Technology Officer)</option>
                    <option value="PO">PO (Product Owner)</option>
                    <option value="OM">OM (Operations Manager)</option>
                    <option value="HR">HR (Human Resources)</option>
                    <option value="ACCOUNTANT">ACCOUNTANT (Reviewer - Read Only)</option>
                    <option value="ADMIN">ADMIN (System Administrator)</option>
                    <option value="EVALUATOR">EVALUATOR</option>
                    <option value="EMPLOYEE">EMPLOYEE</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="DEV">DEV</option>
                    <option value="QA">QA</option>
                    <option value="PO">PO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Link to Employee Profile</label>
                <select
                  value={newEmpId}
                  onChange={(e) => setNewEmpId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- None / Standalone Account --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.departmentId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Default password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-sm"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete User Account Confirmation */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Delete User Account</h3>
                <p className="text-xs text-slate-500">This account will be permanently removed.</p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-slate-800 space-y-1.5">
              <p>Are you sure you want to delete user account <strong>@{deletingUser.username}</strong> ({deletingUser.name})?</p>
              <div className="text-[11px] text-slate-500 flex items-center gap-3 pt-1 border-t border-rose-200/60 font-mono">
                <span>Role: {deletingUser.role}</span>
                <span>Email: {deletingUser.email}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = deletingUser;
                  setDeletingUser(null);
                  try {
                    await api.deleteUser(target.id);
                    await api.deleteUser(target.username);
                    setUsersList((prev) => prev.filter((x) => x.id !== target.id && x.username !== target.username));
                    await loadUsers();
                    setBannerMessage({ type: 'success', text: `User account @${target.username} deleted successfully!` });
                  } catch (err: any) {
                    console.error('Failed to delete user:', err);
                    setBannerMessage({ type: 'error', text: `Failed to delete user: ${err.message}` });
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
              >
                Yes, Delete User Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Performance Goal Confirmation */}
      {deletingGoalId && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Delete Goal</h3>
                <p className="text-xs text-slate-500">Are you sure you want to delete this performance goal?</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingGoalId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const gid = deletingGoalId;
                  setDeletingGoalId(null);
                  try {
                    await api.deleteGoal(gid);
                    setGoals((prev) => prev.filter((g) => g.id !== gid));
                    setBannerMessage({ type: 'success', text: 'Goal deleted successfully.' });
                  } catch (err: any) {
                    setBannerMessage({ type: 'error', text: `Failed to delete goal: ${err.message}` });
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
              >
                Delete Goal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
