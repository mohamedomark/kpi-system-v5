import { Department, Employee, KPI, Evaluation, DepartmentCode, User, Goal, SelfAppraisal, FeedbackRequest } from '../types';
import { localStore } from './localStore';

export const api = {
  // --- Auth & Users ---
  getCurrentUser: (): Promise<User | null> =>
    Promise.resolve(localStore.getCurrentSessionUser()),

  login: (username: string, password?: string): Promise<User> => {
    try {
      return Promise.resolve(localStore.loginUser(username, password));
    } catch (err: any) {
      return Promise.reject(err);
    }
  },

  logout: (): Promise<void> => {
    localStore.logoutUser();
    return Promise.resolve();
  },

  getUsers: (): Promise<User[]> =>
    Promise.resolve(localStore.getUsers()),

  saveUser: (userData: Partial<User> & { username: string; name: string; role: User['role'] }): Promise<User> =>
    Promise.resolve(localStore.saveUser(userData)),

  deleteUser: (id: string): Promise<void> => {
    localStore.deleteUser(id);
    return Promise.resolve();
  },

  // --- Goals ---
  getGoals: (userId?: string, departmentId?: DepartmentCode): Promise<Goal[]> =>
    Promise.resolve(localStore.getGoals(userId, departmentId)),

  saveGoal: (goalData: Partial<Goal> & { userId: string; title: string; departmentId: DepartmentCode }): Promise<Goal> =>
    Promise.resolve(localStore.saveGoal(goalData)),

  deleteGoal: (id: string): Promise<void> => {
    localStore.deleteGoal(id);
    return Promise.resolve();
  },

  // --- Self Appraisals ---
  getSelfAppraisals: (employeeId: string, month: number, year: number): Promise<SelfAppraisal[]> =>
    Promise.resolve(localStore.getSelfAppraisals(employeeId, month, year)),

  saveSelfAppraisal: (data: {
    employeeId: string;
    kpiId: string;
    month: number;
    year: number;
    selfW1Pct?: number | null;
    selfW2Pct?: number | null;
    selfW3Pct?: number | null;
    selfW4Pct?: number | null;
    selfNotes?: string;
  }): Promise<SelfAppraisal> =>
    Promise.resolve(localStore.saveSelfAppraisal(data)),

  // --- Feedback Requests ---
  getFeedbackRequests: (userId?: string): Promise<FeedbackRequest[]> =>
    Promise.resolve(localStore.getFeedbackRequests(userId)),

  sendFeedbackRequest: (data: {
    userId: string;
    employeeId: string;
    evaluatorRole: string;
    subject: string;
    message: string;
  }): Promise<FeedbackRequest> =>
    Promise.resolve(localStore.sendFeedbackRequest(data)),

  replyFeedbackRequest: (id: string, replyMessage: string): Promise<FeedbackRequest> => {
    const res = localStore.replyFeedbackRequest(id, replyMessage);
    if (!res) return Promise.reject(new Error('Feedback request not found'));
    return Promise.resolve(res);
  },

  // --- Departments ---
  getDepartments: (): Promise<Department[]> =>
    Promise.resolve(localStore.getDepartments()),

  getKpis: (departmentId?: DepartmentCode): Promise<KPI[]> =>
    Promise.resolve(localStore.getKpis(departmentId)),

  getEmployees: (departmentId?: DepartmentCode, includeInactive = false): Promise<Employee[]> =>
    Promise.resolve(localStore.getEmployees(departmentId, includeInactive)),

  addEmployee: (name: string, departmentId: DepartmentCode): Promise<Employee> =>
    Promise.resolve(localStore.addEmployee(name, departmentId)),

  updateEmployee: (id: string, updates: { name?: string; departmentId?: DepartmentCode; isActive?: boolean }): Promise<Employee> => {
    const updated = localStore.updateEmployee(id, updates);
    if (!updated) return Promise.reject(new Error('Employee not found'));
    return Promise.resolve(updated);
  },

  deactivateEmployee: (id: string): Promise<Employee> => {
    const deactivated = localStore.deactivateEmployee(id);
    if (!deactivated) return Promise.reject(new Error('Employee not found'));
    return Promise.resolve(deactivated);
  },

  reactivateEmployee: (id: string): Promise<Employee> => {
    const reactivated = localStore.reactivateEmployee(id);
    if (!reactivated) return Promise.reject(new Error('Employee not found'));
    return Promise.resolve(reactivated);
  },

  getEvaluations: (month: number, year: number, departmentId?: DepartmentCode, employeeId?: string): Promise<Evaluation[]> =>
    Promise.resolve(localStore.getEvaluations({ month, year, departmentId, employeeId })),

  saveEvaluation: (data: Partial<Evaluation> & { employeeId: string; kpiId: string; month: number; year: number }): Promise<Evaluation> =>
    Promise.resolve(localStore.saveEvaluation(data)),

  saveBatchEvaluations: (data: Array<Partial<Evaluation> & { employeeId: string; kpiId: string; month: number; year: number }>): Promise<Evaluation[]> =>
    Promise.resolve(localStore.saveBatchEvaluations(data)),

  resetDatabase: (): Promise<{ message: string }> => {
    localStore.seedDefaults();
    return Promise.resolve({ message: 'Database reset and seeded with initial employees and KPIs.' });
  },

  exportDatabaseDump: (): Promise<any> =>
    Promise.resolve(localStore.exportFullDatabase()),

  importDatabaseDump: (jsonData: any): Promise<{ success: boolean; message: string; recordCounts?: Record<string, number> }> => {
    try {
      const result = localStore.importFullDatabase(jsonData);
      return Promise.resolve(result);
    } catch (err: any) {
      return Promise.reject(err);
    }
  },
};
