import { useState } from "react";
import { useGetDailyReport } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Printer, FileSpreadsheet, Loader2 } from "lucide-react";

export default function AdminReports() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { data: report, isLoading } = useGetDailyReport({ date });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-foreground">التقارير اليومية</h2>
          <p className="text-sm text-muted-foreground">استخراج وطباعة تقارير الحضور اليومية.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 rounded-xl border border-border bg-background outline-none"
          />
          <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:-translate-y-0.5 transition-transform shadow-lg shadow-primary/20">
            <Printer className="w-5 h-5 me-2" />
            طباعة PDF
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : report ? (
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8 print:shadow-none print:border-none print:p-0">
          <div className="text-center border-b pb-6 mb-6">
            <h1 className="text-3xl font-bold text-primary mb-2">تقرير الحضور والانصراف اليومي</h1>
            <p className="text-lg text-muted-foreground">التاريخ: {date}</p>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
              <p className="text-sm text-emerald-600 font-bold mb-1">حاضر</p>
              <p className="text-2xl font-black text-emerald-700">{report.summary.present}</p>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center">
              <p className="text-sm text-rose-600 font-bold mb-1">غائب</p>
              <p className="text-2xl font-black text-rose-700">{report.summary.absent}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
              <p className="text-sm text-amber-600 font-bold mb-1">متأخر</p>
              <p className="text-2xl font-black text-amber-700">{report.summary.late}</p>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
              <p className="text-sm text-purple-600 font-bold mb-1">إجازة</p>
              <p className="text-2xl font-black text-purple-700">{report.summary.onLeave}</p>
            </div>
          </div>

          <table className="w-full text-right border-collapse border border-border">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-3">اسم الموظف</th>
                <th className="border border-border p-3">وقت الحضور</th>
                <th className="border border-border p-3">وقت الانصراف</th>
                <th className="border border-border p-3">التأخير (دقيقة)</th>
                <th className="border border-border p-3">ساعات العمل</th>
              </tr>
            </thead>
            <tbody>
              {report.records.map((rec) => (
                <tr key={rec.id}>
                  <td className="border border-border p-3 font-bold">{rec.employeeName}</td>
                  <td className="border border-border p-3">{rec.checkInTime ? format(new Date(rec.checkInTime), 'HH:mm') : '-'}</td>
                  <td className="border border-border p-3">{rec.checkOutTime ? format(new Date(rec.checkOutTime), 'HH:mm') : '-'}</td>
                  <td className="border border-border p-3 text-rose-600 font-bold">{rec.lateMinutes || '-'}</td>
                  <td className="border border-border p-3">{rec.workingHours?.toFixed(2) || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
