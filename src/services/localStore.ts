import { Department, Employee, KPI, Evaluation, DepartmentCode } from '../types';
import { INITIAL_DEPARTMENTS, INITIAL_EMPLOYEES, INITIAL_KPIS } from '../db/seedData';

const STORAGE_KEY = 'employee_kpi_performance_db';
const SYSTEM_NAME = 'Employee KPI Performance and Management System';
const SCHEMA_VERSION = '1.0.0';

export interface DatabaseExportSchema {
  systemName: string;
  schemaVersion: string;
  exportedAt: string;
  departments: Department[];
  employees: Employee[];
  kpis: KPI[];
  evaluations: Evaluation[];
}

interface DatabaseSchema {
  departments: Department[];
  employees: Employee[];
  kpis: KPI[];
  evaluations: Evaluation[];
}

class LocalStore {
  private db: DatabaseSchema = {
    departments: [],
    employees: [],
    kpis: [],
    evaluations: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.departments) && Array.isArray(parsed.employees)) {
          this.db = {
            departments: parsed.departments,
            employees: parsed.employees,
            kpis: parsed.kpis || [],
            evaluations: parsed.evaluations || [],
          };
          console.log(`Database '${SYSTEM_NAME}' loaded from localStorage.`);
          return;
        }
      }
    } catch (e) {
      console.error('Error reading localStorage, re-initializing seed data.', e);
    }

    this.seedDefaults();
  }

  public seedDefaults() {
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

    // Pre-populate realistic sample evaluations for current and previous month
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
    };

    this.persist();
    console.log(`Database '${SYSTEM_NAME}' seeded successfully.`);
  }

  private persist() {
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

    if (departments.length === 0 && employees.length === 0) {
      throw new Error('Import file does not contain valid departments or employees schema');
    }

    this.db = { departments, employees, kpis, evaluations };
    this.persist();

    return {
      success: true,
      message: `Database '${SYSTEM_NAME}' successfully restored from backup!`,
      recordCounts: {
        departments: departments.length,
        employees: employees.length,
        kpis: kpis.length,
        evaluations: evaluations.length,
      },
    };
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
    this.persist();
    return newEmp;
  }

  public updateEmployee(id: string, updates: Partial<Pick<Employee, 'name' | 'departmentId' | 'isActive'>>): Employee | undefined {
    const emp = this.db.employees.find((e) => e.id === id);
    if (!emp) return undefined;

    if (updates.name !== undefined) emp.name = updates.name.trim();
    if (updates.departmentId !== undefined) emp.departmentId = updates.departmentId;
    if (updates.isActive !== undefined) emp.isActive = updates.isActive;

    this.persist();
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
      this.persist();
      return existing;
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
      this.persist();
      return newEval;
    }
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
    return results;
  }
}

export const localStore = new LocalStore();
