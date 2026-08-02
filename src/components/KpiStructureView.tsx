import React, { useState } from 'react';
import { DepartmentCode, KPI, Department } from '../types';
import { Target, CheckCircle2, ShieldCheck, Filter, Award, PieChart, Calculator, Info } from 'lucide-react';

interface KpiStructureViewProps {
  kpis: KPI[];
  selectedDept: DepartmentCode;
  onSelectDept: (dept: DepartmentCode) => void;
  departments?: Department[];
}

export const KpiStructureView: React.FC<KpiStructureViewProps> = ({
  kpis,
  selectedDept,
  onSelectDept,
  departments = [],
}) => {
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  const deptList: DepartmentCode[] = departments.length > 0 
    ? (departments.map((d) => d.id) as DepartmentCode[])
    : ['DEV', 'QA', 'PO', 'SALES'];

  const deptKpis = kpis.filter((k) => k.departmentId === selectedDept);
  const totalWeight = deptKpis.reduce((sum, k) => sum + k.weight, 0);

  const allRoles = Array.from(new Set(kpis.map((k) => k.evaluatorRole)));

  // Group total weight by evaluator role for this department
  const evaluatorBreakdown: Record<string, number> = {};
  deptKpis.forEach((k) => {
    evaluatorBreakdown[k.evaluatorRole] = (evaluatorBreakdown[k.evaluatorRole] || 0) + k.weight;
  });

  const filteredKpis = kpis.filter((k) => {
    if (k.departmentId !== selectedDept) return false;
    if (roleFilter !== 'ALL' && k.evaluatorRole !== roleFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Department Tabs & Total Weight Validation Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Target className="h-6 w-6 text-emerald-600" /> KPI Weights & Evaluator Roles
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Structural weight matrix for {selectedDept}. Total weight across all KPIs must equal 100%.
          </p>
        </div>

        {/* Total Weight Verification Badge */}
        <div
          className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${
            totalWeight === 100
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200/80'
              : 'bg-rose-50 text-rose-900 border-rose-200/80'
          }`}
        >
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Department Total Weight
            </div>
            <div className="text-2xl font-black">{totalWeight} / 100</div>
          </div>
        </div>
      </div>

      {/* Evaluator Role Breakdown Overview Cards */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <PieChart className="h-4 w-4 text-emerald-600" /> Evaluator Weight Distribution ({selectedDept})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(evaluatorBreakdown).map(([role, weight]) => (
            <div key={role} className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl">
              <div className="text-[11px] font-bold text-slate-500 uppercase">{role} Evaluator</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{weight}%</div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${weight}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Evaluator Filter and Dept Switcher Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Dept switch buttons */}
        <div className="flex items-center gap-2">
          {deptList.map((dept) => {
            const sum = kpis
              .filter((k) => k.departmentId === dept)
              .reduce((acc, k) => acc + k.weight, 0);
            const isSelected = dept === selectedDept;

            return (
              <button
                key={dept}
                onClick={() => onSelectDept(dept)}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl border transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Department {dept}</span>
                <span className="text-[10px] opacity-75">({sum} pts)</span>
              </button>
            );
          })}
        </div>

        {/* Filter by Evaluator Role */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs text-slate-500 font-bold">Evaluator Filter:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300/80 rounded-xl px-3 py-1.5 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="ALL">All Evaluator Roles</option>
            {allRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI List Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 text-xs font-extrabold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">KPI Title</th>
                <th className="py-3.5 px-3">Department</th>
                <th className="py-3.5 px-4">Assigned Evaluator Role</th>
                <th className="py-3.5 px-4 text-center">Weight</th>
                <th className="py-3.5 px-4 text-right">Percentage Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs text-slate-800">
              {filteredKpis.map((kpi, index) => (
                <tr key={kpi.id} className="hover:bg-slate-50/90 transition-colors">
                  <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                    {index + 1}
                  </td>

                  <td className="py-3.5 px-4 font-extrabold text-slate-900 text-sm">{kpi.name}</td>

                  <td className="py-3.5 px-3">
                    <span className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-slate-900 text-white shadow-2xs">
                      {kpi.departmentId}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-extrabold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      {kpi.evaluatorRole}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-center font-black text-sm text-slate-900">
                    {kpi.weight}
                  </td>

                  <td className="py-3.5 px-4 text-right font-medium text-slate-500">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${(kpi.weight / 100) * 100}%` }}
                        ></div>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-700">{kpi.weight}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDept === 'SALES' && (
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-5 rounded-2xl shadow-md border border-emerald-700/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-300 font-extrabold text-sm uppercase tracking-wider">
              <Calculator className="h-5 w-5 text-emerald-400" />
              <span>Sales KPI Calculation Formula & Rules (Evaluator: Team Leader / TL)</span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-xs font-black">
              Total Weight: 100%
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
              <div className="text-slate-400 font-bold uppercase text-[10px]">Monthly Benchmark & Evaluator</div>
              <div className="text-lg font-black text-emerald-400 mt-1">15 Offline Base (TL Assessed)</div>
              <p className="text-slate-300 mt-1 text-[11px]">Assessed by Team Leader (TL) based on total monthly client meetings held.</p>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
              <div className="text-slate-400 font-bold uppercase text-[10px]">Online Conversion Rate</div>
              <div className="text-lg font-black text-teal-300 mt-1">3 Online = 1 Offline</div>
              <p className="text-slate-300 mt-1 text-[11px]">Every 3 online meetings count as 1 offline meeting completed towards target.</p>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
              <div className="text-slate-400 font-bold uppercase text-[10px]">Over-Achievement Supported</div>
              <div className="text-lg font-black text-amber-300 mt-1">e.g. 18 Meetings = 120%</div>
              <p className="text-slate-300 mt-1 text-[11px]">Exceeding 15 required meetings yields over-achievement scores (&gt;100%).</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
