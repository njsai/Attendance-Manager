import { useState } from "react";
import { useGetAttendanceRecords } from "@workspace/api-client-react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { Loader2, Search, Filter } from "lucide-react";

export default function AdminAttendance() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { data: records, isLoading } = useGetAttendanceRecords({ date });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      present: "bg-emerald-100 text-emerald-800",
      absent: "bg-rose-100 text-rose-800",
      late: "bg-amber-100 text-amber-800",
      on_leave: "bg-purple-100 text-purple-800",
      holiday: "bg-blue-100 text-blue-800"
    };
    const labels: Record<string, string> = {
      present: "حاضر", absent: "غائب", late: "متأخر", on_leave: "إجازة", holiday: "عطلة"
    };
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles[status] || 'bg-gray-100'}`}>{labels[status] || status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">سجل الحضور الشامل</h2>
          <p className="text-sm text-muted-foreground">عرض وتعديل سجلات حضور وانصراف جميع الموظفين.</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-lg shadow-black/5 border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-muted/50 text-muted-foreground text-sm font-semibold border-b border-border">
              <tr>
                <th className="px-6 py-4">الموظف</th>
                <th className="px-6 py-4">القسم</th>
                <th className="px-6 py-4">الحضور</th>
                <th className="px-6 py-4">الانصراف</th>
                <th className="px-6 py-4">ساعات العمل</th>
                <th className="px-6 py-4">التأخير</th>
                <th className="px-6 py-4">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : records?.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">لا توجد سجلات لهذا اليوم</td></tr>
              ) : (
                records?.map(rec => (
                  <tr key={rec.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-foreground">{rec.employeeName}</td>
                    <td className="px-6 py-4 text-sm">{rec.departmentName || '-'}</td>
                    <td className="px-6 py-4 font-medium text-emerald-600">
                      {rec.checkInTime ? format(new Date(rec.checkInTime), 'HH:mm') : '--:--'}
                    </td>
                    <td className="px-6 py-4 font-medium text-rose-600">
                      {rec.checkOutTime ? format(new Date(rec.checkOutTime), 'HH:mm') : '--:--'}
                    </td>
                    <td className="px-6 py-4 font-bold">{rec.workingHours ? rec.workingHours.toFixed(2) : '-'}</td>
                    <td className="px-6 py-4 text-sm text-amber-600 font-bold">{rec.lateMinutes ? `${rec.lateMinutes} دقيقة` : '-'}</td>
                    <td className="px-6 py-4">{getStatusBadge(rec.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
