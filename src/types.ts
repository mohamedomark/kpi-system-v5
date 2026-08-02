export type DepartmentCode = 'DEV' | 'QA' | 'PO' | 'SALES';

export interface Department {
  id: string; // e.g. 'DEV', 'QA', 'PO'
  name: string; // 'Development', 'Quality Assurance', 'Product Owners'
}

export type UserRole = 'ADMIN' | 'CTO' | 'PO' | 'OM' | 'HR' | 'ACCOUNTANT' | 'EVALUATOR' | 'EMPLOYEE';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: DepartmentCode;
  employeeId?: string; // Linked employee ID if role is EMPLOYEE
  password?: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  departmentId: DepartmentCode;
  category: string; // e.g., 'KPI Target', 'Skill Improvement', 'Project Milestone'
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  progressPct: number; // 0 - 100
  targetDate: string;
  createdAt: string;
}

export interface SelfAppraisal {
  id: string;
  employeeId: string;
  kpiId: string;
  month: number;
  year: number;
  selfW1Pct: number | null;
  selfW2Pct: number | null;
  selfW3Pct: number | null;
  selfW4Pct: number | null;
  selfNotes?: string;
  updatedAt: string;
}

export interface FeedbackRequest {
  id: string;
  userId: string;
  employeeId: string;
  evaluatorRole: string; // e.g., 'HR', 'CTO', 'PO'
  subject: string;
  message: string;
  reply?: string;
  status: 'PENDING' | 'RESOLVED';
  createdAt: string;
  repliedAt?: string;
}

export interface Employee {
  id: string;
  name: string;
  departmentId: DepartmentCode;
  isActive: boolean;
  createdAt: string;
}

export interface KPI {
  id: string;
  departmentId: DepartmentCode;
  name: string;
  evaluatorRole: string; // e.g., 'HR', 'PO', 'CTO', 'OM', 'PO/Team Lead'
  weight: number; // e.g., 15
}

export interface Evaluation {
  id: string;
  employeeId: string;
  kpiId: string;
  month: number; // 1-12
  year: number; // e.g., 2026
  w1Pct: number | null; // 0-100 or null if unrated
  w2Pct: number | null;
  w3Pct: number | null;
  w4Pct: number | null;
  notes?: string;
  updatedAt?: string;
}

// Calculated results for UI & reports
export interface KpiCalculatedScore {
  kpiId: string;
  kpiName: string;
  evaluatorRole: string;
  weight: number;
  w1Pct: number | null;
  w2Pct: number | null;
  w3Pct: number | null;
  w4Pct: number | null;
  w1Score: number;
  w2Score: number;
  w3Score: number;
  w4Score: number;
  monthlyTotalScore: number; // Average of W1..W4 scores
  notes: string;
}

export interface EmployeeMonthlyPerformance {
  employee: Employee;
  month: number;
  year: number;
  kpiScores: KpiCalculatedScore[];
  totalScore: number; // Sum of all kpi monthlyTotalScores (out of 100 max)
  completedKpisCount: number;
  totalKpisCount: number;
  performanceGrade: 'A+' | 'A' | 'B' | 'C' | 'Needs Improvement';
}
