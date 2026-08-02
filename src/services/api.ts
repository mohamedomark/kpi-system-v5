import { Department, Employee, KPI, Evaluation, DepartmentCode } from '../types';
import { localStore } from './localStore';

export const api = {
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
