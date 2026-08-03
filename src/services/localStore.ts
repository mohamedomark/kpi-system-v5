import { Department, Employee, KPI, Evaluation, DepartmentCode, User, Goal, SelfAppraisal, FeedbackRequest } from '../types';
import { INITIAL_DEPARTMENTS, INITIAL_EMPLOYEES, INITIAL_KPIS, INITIAL_USERS, INITIAL_GOALS } from '../db/seedData';
import {
  COLLECTIONS,
  saveDocument,
  deleteDocument,
  batchSaveDocuments,
  fetchAllCollection,
  subscribeToCollection
} from './firestoreSync';

const STORAGE_KEY = 'employee_kpi_performance_db';
const AUTH_KEY = 'employee_kpi_current_user';
const SYSTEM_NAME = 'Employee KPI Performance and Management System';
const SCHEMA_VERSION = '1.1.0';

export interface DatabaseExportSchema {
  systemName: string;
  schemaVersion: string;
  exportedAt: string;
  departments: Department[];
  employees: Employee[];
  kpis: KPI[];
  evaluations: Evaluation[];
  users: User[];
  goals: Goal[];
  selfAppraisals: SelfAppraisal[];
  feedbackRequests: FeedbackRequest[];
}

interface DatabaseSchema {
  departments: Department[];
  employees: Employee[];
  kpis: KPI[];
  evaluations: Evaluation[];
  users: User[];
  goals: Goal[];
  selfAppraisals: SelfAppraisal[];
  feedbackRequests: FeedbackRequest[];
}

function deduplicateById<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of arr) {
    if (item && item.id) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        result.push(item);
      }
    }
  }
  return result;
}

class LocalStore {
  private db: DatabaseSchema = {
    departments: [],
    employees: [],
    kpis: [],
    evaluations: [],
    users: [],
    goals: [],
    selfAppraisals: [],
    feedbackRequests: [],
  };

  private isCloudSynced = false;
  private isListeningToCloud = false;
  private listeners: Array<() => void> = [];

  constructor() {
    this.initLocal();
    this.initCloudListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.error('Error in localStore listener:', e);
      }
    });
  }

  public initCloudListeners() {
    if (this.isListeningToCloud) return;
    this.isListeningToCloud = true;

    subscribeToCollection<Department>(COLLECTIONS.departments, (cloudDepts) => {
      if (cloudDepts.length > 0) {
        this.db.departments = deduplicateById(cloudDepts);
        this.persistLocal();
        this.notifyListeners();
      }
    });

    subscribeToCollection<Employee>(COLLECTIONS.employees, (cloudEmps) => {
      if (cloudEmps.length > 0) {
        this.db.employees = deduplicateById(cloudEmps);
        this.persistLocal();
        this.notifyListeners();
      }
    });

    subscribeToCollection<KPI>(COLLECTIONS.kpis, (cloudKpis) => {
      if (cloudKpis.length > 0) {
        this.db.kpis = deduplicateById(cloudKpis);
        this.persistLocal();
        this.notifyListeners();
      }
    });

    subscribeToCollection<Evaluation>(COLLECTIONS.evaluations, (cloudEvals) => {
      if (cloudEvals.length > 0) {
        this.db.evaluations = deduplicateById(cloudEvals);
        this.persistLocal();
        this.notifyListeners();
      }
    });

    subscribeToCollection<User>(COLLECTIONS.users, (cloudUsers) => {
      if (cloudUsers.length > 0) {
        const userMap = new Map<string, User>();
        this.db.users.forEach((u) => userMap.set(u.id, u));
        cloudUsers.forEach((u) => userMap.set(u.id, u));

        INITIAL_USERS.forEach((u) => {
          if (!userMap.has(u.id) && !Array.from(userMap.values()).some((x) => x.username.toLowerCase() === u.username.toLowerCase())) {
            userMap.set(u.id, u);
          }
        });

        this.db.users = Array.from(userMap.values());
        this.persistLocal();
        this.notifyListeners();
      }
    });

    subscribeToCollection<Goal>(COLLECTIONS.goals, (cloudGoals) => {
      if (cloudGoals.length > 0) {
        this.db.goals = deduplicateById(cloudGoals);
        this.persistLocal();
        this.notifyListeners();
      }
    });

    subscribeToCollection<SelfAppraisal>(COLLECTIONS.selfAppraisals, (cloudSelf) => {
      if (cloudSelf.length > 0) {
        this.db.selfAppraisals = deduplicateById(cloudSelf);
        this.persistLocal();
        this.notifyListeners();
      }
    });

    subscribeToCollection<FeedbackRequest>(COLLECTIONS.feedbackRequests, (cloudFeedback) => {
      if (cloudFeedback.length > 0) {
        this.db.feedbackRequests = deduplicateById(cloudFeedback);
        this.persistLocal();
        this.notifyListeners();
      }
    });
  }

  private initLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.departments) && Array.isArray(parsed.employees)) {
          this.db = {
            departments: deduplicateById(parsed.departments),
            employees: deduplicateById(parsed.employees),
            kpis: deduplicateById(parsed.kpis || []),
            evaluations: deduplicateById(parsed.evaluations || []),
            users: deduplicateById(parsed.users || INITIAL_USERS),
            goals: deduplicateById(parsed.goals || INITIAL_GOALS),
            selfAppraisals: deduplicateById(parsed.selfAppraisals || []),
            feedbackRequests: deduplicateById(parsed.feedbackRequests || []),
          };

          // Ensure missing departments exist
          INITIAL_DEPARTMENTS.forEach((d) => {
            if (!this.db.departments.some((x) => x.id === d.id)) {
              this.db.departments.push(d);
            }
          });

          // Ensure missing default users (including super admin) exist
          INITIAL_USERS.forEach((u) => {
            if (!this.db.users.some((x) => x.id === u.id || x.username.toLowerCase() === u.username.toLowerCase())) {
              this.db.users.push(u);
            }
          });

          this.persistLocal();
          return;
        }
      }
    } catch (e) {
      console.error('Error reading localStorage, re-initializing seed data.', e);
    }

    this.seedDefaultsLocal();
  }

  // Two-way Firestore database sync
  public async syncWithCloud(): Promise<void> {
    try {
      const [
        cloudDepts,
        cloudEmps,
        cloudKpis,
        cloudEvals,
        cloudUsers,
        cloudGoals,
        cloudSelf,
        cloudFeedback
      ] = await Promise.all([
        fetchAllCollection<Department>(COLLECTIONS.departments),
        fetchAllCollection<Employee>(COLLECTIONS.employees),
        fetchAllCollection<KPI>(COLLECTIONS.kpis),
        fetchAllCollection<Evaluation>(COLLECTIONS.evaluations),
        fetchAllCollection<User>(COLLECTIONS.users),
        fetchAllCollection<Goal>(COLLECTIONS.goals),
        fetchAllCollection<SelfAppraisal>(COLLECTIONS.selfAppraisals),
        fetchAllCollection<FeedbackRequest>(COLLECTIONS.feedbackRequests),
      ]);

      // If Firestore database is empty, seed Firestore with current database
      if (cloudDepts.length === 0 && cloudEmps.length === 0 && cloudUsers.length === 0) {
        console.log('Firebase Firestore is empty. Seeding initial data to Firestore...');
        await this.seedDefaultsToCloud();
      } else {
        // Hydrate local database with Firestore records
        if (cloudDepts.length > 0) this.db.departments = deduplicateById([...cloudDepts, ...this.db.departments]);
        if (cloudEmps.length > 0) this.db.employees = deduplicateById([...cloudEmps, ...this.db.employees]);
        if (cloudKpis.length > 0) this.db.kpis = deduplicateById([...cloudKpis, ...this.db.kpis]);
        if (cloudEvals.length > 0) this.db.evaluations = deduplicateById([...cloudEvals, ...this.db.evaluations]);
        
        // Merge local and cloud users so any user created on any device is retained and synced
        const userMap = new Map<string, User>();
        this.db.users.forEach((u) => userMap.set(u.id, u));
        cloudUsers.forEach((u) => userMap.set(u.id, u));

        INITIAL_USERS.forEach((u) => {
          if (!userMap.has(u.id) && !Array.from(userMap.values()).some((x) => x.username.toLowerCase() === u.username.toLowerCase())) {
            userMap.set(u.id, u);
          }
        });

        this.db.users = Array.from(userMap.values());

        if (cloudGoals.length > 0) this.db.goals = deduplicateById([...cloudGoals, ...this.db.goals]);
        if (cloudSelf.length > 0) this.db.selfAppraisals = deduplicateById([...cloudSelf, ...this.db.selfAppraisals]);
        if (cloudFeedback.length > 0) this.db.feedbackRequests = deduplicateById([...cloudFeedback, ...this.db.feedbackRequests]);

        this.persistLocal();
        await this.seedDefaultsToCloud();
      }
      this.isCloudSynced = true;
      console.log('Successfully synchronized with Firebase Firestore standalone database.');
    } catch (err) {
      console.error('Failed to sync with Firebase Firestore:', err);
    }
  }

  private async seedDefaultsToCloud() {
    await Promise.all([
      batchSaveDocuments(COLLECTIONS.departments, this.db.departments),
      batchSaveDocuments(COLLECTIONS.employees, this.db.employees),
      batchSaveDocuments(COLLECTIONS.kpis, this.db.kpis),
      batchSaveDocuments(COLLECTIONS.evaluations, this.db.evaluations),
      batchSaveDocuments(COLLECTIONS.users, this.db.users),
      batchSaveDocuments(COLLECTIONS.goals, this.db.goals),
      batchSaveDocuments(COLLECTIONS.selfAppraisals, this.db.selfAppraisals),
      batchSaveDocuments(COLLECTIONS.feedbackRequests, this.db.feedbackRequests),
    ]);
  }

  private seedDefaultsLocal() {
    const departments: Department[] = INITIAL_DEPARTMENTS;

    const employees: Employee[] = INITIAL_EMPLOYEES.map((emp, idx) => ({
      ...emp,
      id: `emp_${emp.departmentId.toLowerCase()}_${idx + 1}`,
      createdAt: new Date().toISOString(),
    }));

    const kpis: KPI[] = INITIAL_KPIS.map((kpi, idx) => ({
      ...kpi,
      id: `kpi_${kpi.departmentId.toLowerCase()}_${idx + 1}`,
    }));

    const users: User[] = INITIAL_USERS;
    const goals: Goal[] = INITIAL_GOALS;
    const selfAppraisals: SelfAppraisal[] = [];
    const feedbackRequests: FeedbackRequest[] = [];

    const evaluations: Evaluation[] = [];
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const sampleMonths = [
      { month: currentMonth, year: currentYear },
      { month: prevMonth, year: prevYear },
    ];

    sampleMonths.forEach(({ month, year }) => {
      employees.forEach((emp) => {
        const empKpis = kpis.filter((k) => k.departmentId === emp.departmentId);
        empKpis.forEach((kpi) => {
          const basePct = Math.floor(Math.random() * 25) + 75;
          evaluations.push({
            id: `eval_${emp.id}_${kpi.id}_${year}_${month}`,
            employeeId: emp.id,
            kpiId: kpi.id,
            month,
            year,
            w1Pct: basePct,
            w2Pct: Math.min(100, basePct + Math.floor(Math.random() * 10) - 5),
            w3Pct: Math.min(100, basePct + Math.floor(Math.random() * 10) - 5),
            w4Pct: Math.min(100, basePct + Math.floor(Math.random() * 10) - 5),
            notes: basePct < 80 ? 'Follow up needed on weekly delivery' : 'Solid performance',
            updatedAt: new Date().toISOString(),
          });
        });
      });
    });

    this.db = {
      departments,
      employees,
      kpis,
      evaluations,
      users,
      goals,
      selfAppraisals,
      feedbackRequests,
    };

    this.persistLocal();
  }

  public seedDefaults() {
    this.seedDefaultsLocal();
    this.seedDefaultsToCloud();
  }

  private persistLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  // --- Export / Import ---

  public exportFullDatabase(): DatabaseExportSchema {
    return {
      systemName: SYSTEM_NAME,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      departments: this.db.departments,
      employees: this.db.employees,
      kpis: this.db.kpis,
      evaluations: this.db.evaluations,
      users: this.db.users,
      goals: this.db.goals,
      selfAppraisals: this.db.selfAppraisals,
      feedbackRequests: this.db.feedbackRequests,
    };
  }

  public importFullDatabase(importedData: any): { success: boolean; message: string; recordCounts?: Record<string, number> } {
    if (!importedData || typeof importedData !== 'object') {
      throw new Error('Invalid JSON format for database import');
    }

    const departments = Array.isArray(importedData.departments) ? importedData.departments : [];
    const employees = Array.isArray(importedData.employees) ? importedData.employees : [];
    const kpis = Array.isArray(importedData.kpis) ? importedData.kpis : [];
    const evaluations = Array.isArray(importedData.evaluations) ? importedData.evaluations : [];
    const users = Array.isArray(importedData.users) ? importedData.users : INITIAL_USERS;
    const goals = Array.isArray(importedData.goals) ? importedData.goals : INITIAL_GOALS;
    const selfAppraisals = Array.isArray(importedData.selfAppraisals) ? importedData.selfAppraisals : [];
    const feedbackRequests = Array.isArray(importedData.feedbackRequests) ? importedData.feedbackRequests : [];

    if (departments.length === 0 && employees.length === 0) {
      throw new Error('Import file does not contain valid departments or employees schema');
    }

    this.db = { departments, employees, kpis, evaluations, users, goals, selfAppraisals, feedbackRequests };
    this.persistLocal();
    this.seedDefaultsToCloud();

    return {
      success: true,
      message: `Database '${SYSTEM_NAME}' successfully restored from backup!`,
      recordCounts: {
        departments: departments.length,
        employees: employees.length,
        kpis: kpis.length,
        evaluations: evaluations.length,
        users: users.length,
        goals: goals.length,
      },
    };
  }

  // --- Auth & User Management APIs ---

  public getCurrentSessionUser(): User | null {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        const u = JSON.parse(raw);
        const match = this.db.users.find((x) => x.id === u.id);
        if (match) return match;
      }
    } catch (e) {
      console.error('Error reading auth session user:', e);
    }
    return null;
  }

  public async loginUser(username: string, password?: string): Promise<User> {
    await this.syncWithCloud();
    const trimmed = username.trim().toLowerCase();
    const user = this.db.users.find((u) => u.username.toLowerCase() === trimmed);
    if (!user) {
      throw new Error(`User username "${username}" not found.`);
    }
    if (password && user.password && user.password !== password) {
      throw new Error('Invalid password. Please try again.');
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return user;
  }

  public logoutUser(): void {
    localStorage.removeItem(AUTH_KEY);
  }

  public getUsers(includeSuper = false): User[] {
    if (includeSuper) return this.db.users;
    // Hide super admin account from user management UI
    return this.db.users.filter((u) => u.username.toLowerCase() !== 'super' && u.role !== 'SUPER_ADMIN');
  }

  public async saveUser(userData: Partial<User> & { username: string; name: string; role: User['role'] }): Promise<User> {
    let existing = userData.id ? this.db.users.find((u) => u.id === userData.id) : null;
    let savedUser: User;

    if (existing) {
      if (userData.name) existing.name = userData.name.trim();
      if (userData.username) existing.username = userData.username.trim();
      if (userData.email) existing.email = userData.email.trim();
      if (userData.role) existing.role = userData.role;
      if (userData.departmentId !== undefined) existing.departmentId = userData.departmentId;
      if (userData.employeeId !== undefined) existing.employeeId = userData.employeeId;
      if (userData.password) existing.password = userData.password;
      this.persistLocal();
      this.notifyListeners();
      savedUser = existing;
    } else {
      const newUser: User = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        username: userData.username.trim(),
        name: userData.name.trim(),
        email: userData.email || `${userData.username.trim()}@company.com`,
        role: userData.role,
        ...(userData.departmentId ? { departmentId: userData.departmentId } : {}),
        ...(userData.employeeId ? { employeeId: userData.employeeId } : {}),
        password: userData.password || '123',
        createdAt: new Date().toISOString(),
      };
      this.db.users.push(newUser);
      this.db.users = deduplicateById(this.db.users);
      this.persistLocal();
      this.notifyListeners();
      savedUser = newUser;
    }

    await saveDocument(COLLECTIONS.users, savedUser);
    return savedUser;
  }

  public async deleteUser(idOrUsername: string): Promise<void> {
    const target = this.db.users.find(
      (u) => u.id === idOrUsername || u.username.toLowerCase() === idOrUsername.toLowerCase()
    );
    if (target) {
      await deleteDocument(COLLECTIONS.users, target.id);
    }

    this.db.users = this.db.users.filter(
      (u) => u.id !== idOrUsername && u.username.toLowerCase() !== idOrUsername.toLowerCase()
    );
    this.persistLocal();
    this.notifyListeners();
  }

  // --- Goals APIs ---

  public getGoals(userId?: string, departmentId?: DepartmentCode): Goal[] {
    return this.db.goals.filter((g) => {
      if (userId && g.userId !== userId) return false;
      if (departmentId && g.departmentId !== departmentId) return false;
      return true;
    });
  }

  public saveGoal(goalData: Partial<Goal> & { userId: string; title: string; departmentId: DepartmentCode }): Goal {
    let savedGoal: Goal;

    let existing = goalData.id ? this.db.goals.find((g) => g.id === goalData.id) : null;
    if (existing) {
      if (goalData.title) existing.title = goalData.title.trim();
      if (goalData.description !== undefined) existing.description = goalData.description;
      if (goalData.category) existing.category = goalData.category;
      if (goalData.status) existing.status = goalData.status;
      if (goalData.progressPct !== undefined) existing.progressPct = goalData.progressPct;
      if (goalData.targetDate) existing.targetDate = goalData.targetDate;
      this.persistLocal();
      this.notifyListeners();
      savedGoal = existing;
    } else {
      const newGoal: Goal = {
        id: `goal_${Date.now()}`,
        userId: goalData.userId,
        title: goalData.title.trim(),
        description: goalData.description || '',
        departmentId: goalData.departmentId,
        category: goalData.category || 'General Goal',
        status: goalData.status || 'IN_PROGRESS',
        progressPct: goalData.progressPct ?? 0,
        targetDate: goalData.targetDate || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };
      this.db.goals.push(newGoal);
      this.persistLocal();
      this.notifyListeners();
      savedGoal = newGoal;
    }

    saveDocument(COLLECTIONS.goals, savedGoal);
    return savedGoal;
  }

  public deleteGoal(id: string): void {
    deleteDocument(COLLECTIONS.goals, id);
    this.db.goals = this.db.goals.filter((g) => g.id !== id);
    this.persistLocal();
    this.notifyListeners();
  }

  // --- Self Appraisals APIs ---

  public getSelfAppraisals(employeeId: string, month: number, year: number): SelfAppraisal[] {
    return this.db.selfAppraisals.filter(
      (sa) => sa.employeeId === employeeId && sa.month === month && sa.year === year
    );
  }

  public saveSelfAppraisal(data: {
    employeeId: string;
    kpiId: string;
    month: number;
    year: number;
    selfW1Pct?: number | null;
    selfW2Pct?: number | null;
    selfW3Pct?: number | null;
    selfW4Pct?: number | null;
    selfNotes?: string;
  }): SelfAppraisal {
    let savedSA: SelfAppraisal;

    let existing = this.db.selfAppraisals.find(
      (sa) =>
        sa.employeeId === data.employeeId &&
        sa.kpiId === data.kpiId &&
        sa.month === data.month &&
        sa.year === data.year
    );

    if (existing) {
      if (data.selfW1Pct !== undefined) existing.selfW1Pct = data.selfW1Pct;
      if (data.selfW2Pct !== undefined) existing.selfW2Pct = data.selfW2Pct;
      if (data.selfW3Pct !== undefined) existing.selfW3Pct = data.selfW3Pct;
      if (data.selfW4Pct !== undefined) existing.selfW4Pct = data.selfW4Pct;
      if (data.selfNotes !== undefined) existing.selfNotes = data.selfNotes;
      existing.updatedAt = new Date().toISOString();
      this.persistLocal();
      this.notifyListeners();
      savedSA = existing;
    } else {
      const newSA: SelfAppraisal = {
        id: `sa_${data.employeeId}_${data.kpiId}_${data.year}_${data.month}`,
        employeeId: data.employeeId,
        kpiId: data.kpiId,
        month: data.month,
        year: data.year,
        selfW1Pct: data.selfW1Pct ?? null,
        selfW2Pct: data.selfW2Pct ?? null,
        selfW3Pct: data.selfW3Pct ?? null,
        selfW4Pct: data.selfW4Pct ?? null,
        selfNotes: data.selfNotes || '',
        updatedAt: new Date().toISOString(),
      };
      this.db.selfAppraisals.push(newSA);
      this.persistLocal();
      this.notifyListeners();
      savedSA = newSA;
    }

    saveDocument(COLLECTIONS.selfAppraisals, savedSA);
    return savedSA;
  }

  // --- Feedback Requests APIs ---

  public getFeedbackRequests(userId?: string): FeedbackRequest[] {
    if (userId) {
      return this.db.feedbackRequests.filter((f) => f.userId === userId);
    }
    return this.db.feedbackRequests;
  }

  public sendFeedbackRequest(data: {
    userId: string;
    employeeId: string;
    evaluatorRole: string;
    subject: string;
    message: string;
  }): FeedbackRequest {
    const newReq: FeedbackRequest = {
      id: `fb_${Date.now()}`,
      userId: data.userId,
      employeeId: data.employeeId,
      evaluatorRole: data.evaluatorRole,
      subject: data.subject.trim(),
      message: data.message.trim(),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    this.db.feedbackRequests.push(newReq);
    this.persistLocal();
    this.notifyListeners();

    saveDocument(COLLECTIONS.feedbackRequests, newReq);
    return newReq;
  }

  public replyFeedbackRequest(id: string, replyMessage: string): FeedbackRequest | undefined {
    const req = this.db.feedbackRequests.find((f) => f.id === id);
    if (req) {
      req.reply = replyMessage.trim();
      req.status = 'RESOLVED';
      req.repliedAt = new Date().toISOString();
      this.persistLocal();
      this.notifyListeners();

      saveDocument(COLLECTIONS.feedbackRequests, req);
      return req;
    }
    return undefined;
  }

  // --- Department APIs ---
  public getDepartments(): Department[] {
    return this.db.departments;
  }

  // --- KPI APIs ---
  public getKpis(departmentId?: DepartmentCode): KPI[] {
    if (departmentId) {
      return this.db.kpis.filter((k) => k.departmentId === departmentId);
    }
    return this.db.kpis;
  }

  // --- Employee APIs ---
  public getEmployees(departmentId?: DepartmentCode, includeInactive = false): Employee[] {
    return this.db.employees.filter((e) => {
      if (departmentId && e.departmentId !== departmentId) return false;
      if (!includeInactive && !e.isActive) return false;
      return true;
    });
  }

  public addEmployee(name: string, departmentId: DepartmentCode): Employee {
    const newEmp: Employee = {
      id: `emp_${departmentId.toLowerCase()}_${Date.now()}`,
      name: name.trim(),
      departmentId,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.db.employees.push(newEmp);
    this.persistLocal();
    this.notifyListeners();

    saveDocument(COLLECTIONS.employees, newEmp);
    return newEmp;
  }

  public updateEmployee(id: string, updates: Partial<Pick<Employee, 'name' | 'departmentId' | 'isActive'>>): Employee | undefined {
    const emp = this.db.employees.find((e) => e.id === id);
    if (!emp) return undefined;

    if (updates.name !== undefined) emp.name = updates.name.trim();
    if (updates.departmentId !== undefined) emp.departmentId = updates.departmentId;
    if (updates.isActive !== undefined) emp.isActive = updates.isActive;

    this.persistLocal();
    this.notifyListeners();
    saveDocument(COLLECTIONS.employees, emp);
    return emp;
  }

  public deactivateEmployee(id: string): Employee | undefined {
    return this.updateEmployee(id, { isActive: false });
  }

  public reactivateEmployee(id: string): Employee | undefined {
    return this.updateEmployee(id, { isActive: true });
  }

  // --- Evaluation APIs ---
  public getEvaluations(params: {
    month: number;
    year: number;
    departmentId?: DepartmentCode;
    employeeId?: string;
  }): Evaluation[] {
    const { month, year, departmentId, employeeId } = params;

    let employeeIdsToMatch = new Set<string>();
    if (employeeId) {
      employeeIdsToMatch.add(employeeId);
    } else if (departmentId) {
      this.getEmployees(departmentId, true).forEach((e) => employeeIdsToMatch.add(e.id));
    }

    return this.db.evaluations.filter((ev) => {
      if (ev.month !== month || ev.year !== year) return false;
      if (employeeIdsToMatch.size > 0 && !employeeIdsToMatch.has(ev.employeeId)) return false;
      return true;
    });
  }

  public saveEvaluation(data: {
    employeeId: string;
    kpiId: string;
    month: number;
    year: number;
    w1Pct?: number | null;
    w2Pct?: number | null;
    w3Pct?: number | null;
    w4Pct?: number | null;
    notes?: string;
  }): Evaluation {
    const { employeeId, kpiId, month, year, w1Pct, w2Pct, w3Pct, w4Pct, notes } = data;
    let savedEval: Evaluation;

    let existing = this.db.evaluations.find(
      (ev) =>
        ev.employeeId === employeeId &&
        ev.kpiId === kpiId &&
        ev.month === month &&
        ev.year === year
    );

    if (existing) {
      if (w1Pct !== undefined) existing.w1Pct = w1Pct;
      if (w2Pct !== undefined) existing.w2Pct = w2Pct;
      if (w3Pct !== undefined) existing.w3Pct = w3Pct;
      if (w4Pct !== undefined) existing.w4Pct = w4Pct;
      if (notes !== undefined) existing.notes = notes;
      existing.updatedAt = new Date().toISOString();
      this.persistLocal();
      this.notifyListeners();
      savedEval = existing;
    } else {
      const newEval: Evaluation = {
        id: `eval_${employeeId}_${kpiId}_${year}_${month}`,
        employeeId,
        kpiId,
        month,
        year,
        w1Pct: w1Pct ?? null,
        w2Pct: w2Pct ?? null,
        w3Pct: w3Pct ?? null,
        w4Pct: w4Pct ?? null,
        notes: notes ?? '',
        updatedAt: new Date().toISOString(),
      };
      this.db.evaluations.push(newEval);
      this.persistLocal();
      this.notifyListeners();
      savedEval = newEval;
    }

    saveDocument(COLLECTIONS.evaluations, savedEval);
    return savedEval;
  }

  public saveBatchEvaluations(
    evaluations: Array<{
      employeeId: string;
      kpiId: string;
      month: number;
      year: number;
      w1Pct?: number | null;
      w2Pct?: number | null;
      w3Pct?: number | null;
      w4Pct?: number | null;
      notes?: string;
    }>
  ): Evaluation[] {
    const results: Evaluation[] = [];
    evaluations.forEach((item) => {
      results.push(this.saveEvaluation(item));
    });
    batchSaveDocuments(COLLECTIONS.evaluations, results);
    this.notifyListeners();
    return results;
  }
}

export const localStore = new LocalStore();
