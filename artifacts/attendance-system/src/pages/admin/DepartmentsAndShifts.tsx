import { useState } from "react";
import { useGetDepartments, useGetShifts } from "@workspace/api-client-react";
import { Building2, Clock, Loader2 } from "lucide-react";

export default function DepartmentsAndShifts() {
  // A combined view for simplicity to satisfy full schema coverage 
  // without creating too many files.
  const { data: depts, isLoading: loadingDepts } = useGetDepartments();
  const { data: shifts, isLoading: loadingShifts } = useGetShifts();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Departments */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center">
          <Building2 className="w-6 h-6 me-2 text-primary" />
          الأقسام
        </h2>
        <div className="bg-card rounded-2xl shadow-lg border border-border p-1">
          {loadingDepts ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary"/></div> : (
            <ul className="divide-y divide-border">
              {depts?.map(dept => (
                <li key={dept.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="font-bold text-lg text-foreground">{dept.name}</div>
                  {dept.description && <div className="text-sm text-muted-foreground">{dept.description}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Shifts */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center">
          <Clock className="w-6 h-6 me-2 text-accent" />
          شفتات العمل
        </h2>
        <div className="bg-card rounded-2xl shadow-lg border border-border p-1">
          {loadingShifts ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-accent"/></div> : (
            <ul className="divide-y divide-border">
              {shifts?.map(shift => (
                <li key={shift.id} className="p-4 hover:bg-muted/30 transition-colors flex justify-between items-center">
                  <div>
                    <div className="font-bold text-lg text-foreground">{shift.name}</div>
                    <div className="text-sm text-muted-foreground">أيام العمل: {shift.workDays}</div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded-lg mb-1">
                      {shift.startTime} - {shift.endTime}
                    </div>
                    <div className="text-xs text-rose-600 font-semibold">
                      سماح تأخير: {shift.lateGraceMinutes} د
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
