import { useState, useEffect, useCallback } from "react";
import { FileSpreadsheet, FileText, Printer, Download, Filter, Calendar } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AttRecord {
  id: number; employeeId: number; employeeName: string; departmentName: string | null;
  date: string; checkInTime: string | null; checkOutTime: string | null;
  lateMinutes: number | null; workingHours: number | null; status: string;
}
interface Employee { id: number; fullName: string; }

function fmt12(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" });
}
function statusAr(s: string) {
  if (s === "present") return "حاضر";
  if (s === "late") return "متأخر";
  if (s === "absent") return "غائب";
  if (s === "leave") return "إجازة";
  return s;
}

export default function AdminReports() {
  const [records, setRecords] = useState<AttRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [empId, setEmpId] = useState("");
  const today = new Date();
  const firstDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => {
    fetch(`${BASE}api/employees`, { credentials: "include" }).then(r => r.json()).then(d => setEmployees(Array.isArray(d) ? d : []));
  }, [BASE]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (empId) params.set("employeeId", empId);
    const res = await fetch(`${BASE}api/attendance?${params}`, { credentials: "include" });
    const data = await res.json();
    setRecords(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [BASE, startDate, endDate, empId]);

  const presentCount = records.filter(r => r.status === "present" || r.status === "late").length;
  const absentCount = records.filter(r => r.status === "absent").length;
  const lateCount = records.filter(r => r.status === "late").length;
  const totalHours = records.reduce((s, r) => s + (r.workingHours ?? 0), 0);
  const totalLate = records.reduce((s, r) => s + (r.lateMinutes ?? 0), 0);

  const exportExcel = () => {
    const rows = records.map(r => ({
      "التاريخ": fmtDate(r.date),
      "الموظف": r.employeeName,
      "القسم": r.departmentName || "—",
      "الحالة": statusAr(r.status),
      "وقت الدخول": fmt12(r.checkInTime),
      "وقت الخروج": fmt12(r.checkOutTime),
      "ساعات العمل": r.workingHours ? r.workingHours.toFixed(2) : "—",
      "دقائق التأخير": r.lateMinutes ?? 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير الحضور");
    ws["!cols"] = [{ wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
    XLSX.writeFile(wb, `تقرير-الحضور-${startDate}-${endDate}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFont("helvetica");
    doc.setFontSize(16);
    doc.text("Attendance Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 28);
    doc.text(`Total Records: ${records.length} | Present: ${presentCount} | Absent: ${absentCount} | Late: ${lateCount}`, 14, 34);
    autoTable(doc, {
      startY: 40,
      head: [["Date", "Employee", "Department", "Status", "Check In", "Check Out", "Hours", "Late (min)"]],
      body: records.map(r => [
        r.date, r.employeeName, r.departmentName || "—", statusAr(r.status),
        fmt12(r.checkInTime), fmt12(r.checkOutTime),
        r.workingHours ? r.workingHours.toFixed(1) : "—",
        r.lateMinutes ?? 0,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
    doc.save(`attendance-report-${startDate}-${endDate}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto" dir="rtl">
      <div>
        <h1 className="text-xl font-bold text-white">التقارير</h1>
        <p className="text-gray-400 text-sm">تقارير الحضور والانصراف</p>
      </div>

      {/* Filters */}
      <div className="bg-[#1a2234] border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1"><Filter size={16} className="text-blue-400" /><span className="text-white font-semibold text-sm">تصفية التقارير</span></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">من تاريخ</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none" />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">إلى تاريخ</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none" />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">الموظف</label>
            <select value={empId} onChange={e => setEmpId(e.target.value)}
              className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none">
              <option value="">كل الموظفين</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={fetchReports} disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-sm transition-all disabled:opacity-50">
              {loading ? "جاري..." : "عرض"}
            </button>
          </div>
        </div>
      </div>

      {records.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "إجمالي السجلات", val: records.length, color: "text-white" },
              { label: "أيام الحضور", val: presentCount, color: "text-green-400" },
              { label: "أيام الغياب", val: absentCount, color: "text-red-400" },
              { label: "ساعات العمل", val: totalHours.toFixed(1), color: "text-blue-400" },
            ].map((item, i) => (
              <div key={i} className="bg-[#1a2234] border border-white/10 rounded-2xl p-3 text-center">
                <p className={`text-xl font-bold ${item.color}`}>{item.val}</p>
                <p className="text-xs text-gray-400">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Export Buttons */}
          <div className="flex gap-3 flex-wrap no-print">
            <button onClick={exportExcel}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all">
              <FileSpreadsheet size={16} />تصدير Excel
            </button>
            <button onClick={exportPDF}
              className="flex items-center gap-2 bg-red-700 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all">
              <FileText size={16} />تصدير PDF
            </button>
            <button onClick={handlePrint}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all">
              <Printer size={16} />طباعة
            </button>
          </div>

          {/* Table */}
          <div className="bg-[#1a2234] border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-right text-gray-400 font-medium px-4 py-3">التاريخ</th>
                    <th className="text-right text-gray-400 font-medium px-4 py-3">الموظف</th>
                    <th className="text-right text-gray-400 font-medium px-4 py-3">الحالة</th>
                    <th className="text-right text-gray-400 font-medium px-4 py-3">الدخول</th>
                    <th className="text-right text-gray-400 font-medium px-4 py-3">الخروج</th>
                    <th className="text-right text-gray-400 font-medium px-4 py-3">ساعات</th>
                    <th className="text-right text-gray-400 font-medium px-4 py-3">تأخير</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-white/5">
                      <td className="px-4 py-2.5 text-gray-300 text-xs">{fmtDate(r.date)}</td>
                      <td className="px-4 py-2.5 text-white font-medium">{r.employeeName}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === "present" ? "bg-green-900/30 text-green-400" : r.status === "late" ? "bg-yellow-900/30 text-yellow-400" : r.status === "absent" ? "bg-red-900/30 text-red-400" : "bg-blue-900/30 text-blue-400"}`}>
                          {statusAr(r.status)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-green-400">{fmt12(r.checkInTime)}</td>
                      <td className="px-4 py-2.5 text-red-400">{fmt12(r.checkOutTime)}</td>
                      <td className="px-4 py-2.5 text-blue-400">{r.workingHours ? r.workingHours.toFixed(1) + "h" : "—"}</td>
                      <td className="px-4 py-2.5 text-yellow-400">{r.lateMinutes ? r.lateMinutes + "د" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {records.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-400">
          <Calendar size={40} className="mx-auto mb-3 opacity-30" />
          <p>اختر الفترة الزمنية ثم اضغط عرض</p>
        </div>
      )}
    </div>
  );
}
