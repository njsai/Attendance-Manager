import { useState, useEffect, useCallback } from "react";
import { FileSpreadsheet, FileText, Printer, Filter, Calendar, FileDown } from "lucide-react";
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

  const exportCSV = () => {
    const header = ["التاريخ", "الموظف", "القسم", "الحالة", "وقت الدخول", "وقت الخروج", "ساعات العمل", "دقائق التأخير"];
    const rows = records.map(r => [
      r.date,
      r.employeeName,
      r.departmentName || "",
      statusAr(r.status),
      r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString("ar-IQ") : "",
      r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString("ar-IQ") : "",
      r.workingHours != null ? r.workingHours.toFixed(2) : "",
      r.lateMinutes != null ? String(r.lateMinutes) : "0",
    ]);
    const csvContent = "\uFEFF" + [header, ...rows].map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `تقرير-الحضور-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const cardStyle = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,245,255,0.08)", borderRadius: 16, padding: 16 };
  const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,245,255,0.1)", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" as const, colorScheme: "dark" };

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14, maxWidth: 960, margin: "0 auto" }} dir="rtl">
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>التقارير</h1>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>تقارير الحضور والانصراف</p>
      </div>

      {/* Filters */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Filter size={15} style={{ color: "#00f5ff" }} />
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>تصفية التقارير</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, display: "block", marginBottom: 5 }}>من تاريخ</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, display: "block", marginBottom: 5 }}>إلى تاريخ</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, display: "block", marginBottom: 5 }}>الموظف</label>
            <select value={empId} onChange={e => setEmpId(e.target.value)} style={inputStyle}>
              <option value="" style={{ background: "#050d1f" }}>كل الموظفين</option>
              {employees.map(e => <option key={e.id} value={e.id} style={{ background: "#050d1f" }}>{e.fullName}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button onClick={fetchReports} disabled={loading}
              style={{ width: "100%", padding: "9px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, rgba(0,245,255,0.8), rgba(59,130,246,0.8))", color: "#020817", fontWeight: 700, fontSize: 13, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif" }}>
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
              { label: "إجمالي السجلات", val: records.length, color: "#fff", glow: "rgba(255,255,255,0.06)" },
              { label: "أيام الحضور", val: presentCount, color: "#10b981", glow: "rgba(16,185,129,0.12)" },
              { label: "أيام الغياب", val: absentCount, color: "#f87171", glow: "rgba(248,113,113,0.12)" },
              { label: "ساعات العمل", val: totalHours.toFixed(1), color: "#00f5ff", glow: "rgba(0,245,255,0.12)" },
            ].map((item, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${item.glow}`, borderRadius: 14, padding: "12px 8px", textAlign: "center" }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: item.color, margin: 0 }}>{item.val}</p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{item.label}</p>
              </div>
            ))}
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2 flex-wrap no-print">
            {[
              { label: "Excel", icon: FileSpreadsheet, action: exportExcel, color: "#10b981", glow: "rgba(16,185,129,0.2)" },
              { label: "CSV", icon: FileDown, action: exportCSV, color: "#06b6d4", glow: "rgba(6,182,212,0.2)" },
              { label: "PDF", icon: FileText, action: exportPDF, color: "#f87171", glow: "rgba(248,113,113,0.2)" },
              { label: "طباعة", icon: Printer, action: handlePrint, color: "rgba(255,255,255,0.5)", glow: "rgba(255,255,255,0.08)" },
            ].map(({ label, icon: Icon, action, color, glow }) => (
              <button key={label} onClick={action}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: `1px solid ${glow}`, background: glow, color, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
                <Icon size={14} /> تصدير {label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,245,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(0,245,255,0.07)" }}>
                    {["التاريخ", "الموظف", "الحالة", "الدخول", "الخروج", "ساعات", "تأخير"].map(h => (
                      <th key={h} style={{ textAlign: "right", color: "rgba(0,245,255,0.5)", fontWeight: 600, padding: "11px 14px", fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => {
                    const sColor = r.status === "present" ? "#10b981" : r.status === "late" ? "#f59e0b" : r.status === "absent" ? "#f87171" : "#3b82f6";
                    const sBg = r.status === "present" ? "rgba(16,185,129,0.1)" : r.status === "late" ? "rgba(245,158,11,0.1)" : r.status === "absent" ? "rgba(248,113,113,0.1)" : "rgba(59,130,246,0.1)";
                    return (
                      <tr key={r.id} style={{ borderBottom: i < records.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", transition: "background 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,245,255,0.03)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "10px 14px", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{fmtDate(r.date)}</td>
                        <td style={{ padding: "10px 14px", color: "#fff", fontWeight: 600 }}>{r.employeeName}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600, color: sColor, background: sBg }}>{statusAr(r.status)}</span>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#10b981", fontSize: 12 }}>{fmt12(r.checkInTime)}</td>
                        <td style={{ padding: "10px 14px", color: "#f87171", fontSize: 12 }}>{fmt12(r.checkOutTime)}</td>
                        <td style={{ padding: "10px 14px", color: "#00f5ff", fontSize: 12 }}>{r.workingHours ? r.workingHours.toFixed(1) + "h" : "—"}</td>
                        <td style={{ padding: "10px 14px", color: "#f59e0b", fontSize: 12 }}>{r.lateMinutes ? r.lateMinutes + "د" : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {records.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.25)" }}>
          <Calendar size={40} style={{ margin: "0 auto 12px", opacity: 0.2 }} />
          <p style={{ fontSize: 13 }}>اختر الفترة الزمنية ثم اضغط عرض</p>
        </div>
      )}
    </div>
  );
}
