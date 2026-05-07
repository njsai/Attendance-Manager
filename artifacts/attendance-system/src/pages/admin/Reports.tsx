import { useState, useEffect, useCallback } from "react";
import { FileSpreadsheet, FileText, Printer, Filter, Calendar, FileDown } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

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
  const { theme } = useTheme();
  const { lang } = useI18n();
  const isDark = theme === "dark";

  const [records, setRecords] = useState<AttRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [empId, setEmpId] = useState("");
  const today = new Date();
  const firstDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);
  const BASE = import.meta.env.BASE_URL;

  const textPrimary = isDark ? "#fff" : "#0f172a";
  const textSecondary = isDark ? "rgba(255,255,255,0.4)" : "#64748b";
  const textMuted = isDark ? "rgba(255,255,255,0.25)" : "#94a3b8";
  const cardBg = isDark ? "rgba(255,255,255,0.02)" : "#fff";
  const cardBorder = isDark ? "rgba(0,245,255,0.08)" : "#e2e8f0";
  const inputBg = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc";
  const inputBorder = isDark ? "rgba(0,245,255,0.1)" : "#e2e8f0";
  const tableBorder = isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9";
  const theadBorder = isDark ? "rgba(0,245,255,0.07)" : "#e2e8f0";
  const theadColor = isDark ? "rgba(0,245,255,0.5)" : "#0891b2";
  const rowHoverBg = isDark ? "rgba(0,245,255,0.03)" : "rgba(0,180,200,0.04)";

  const cardStyle = {
    background: cardBg,
    border: `1px solid ${cardBorder}`,
    borderRadius: 16,
    padding: 16,
    boxShadow: isDark ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
  };
  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 10,
    background: inputBg, border: `1px solid ${inputBorder}`,
    color: textPrimary, fontSize: 13, outline: "none",
    boxSizing: "border-box" as const,
    colorScheme: isDark ? "dark" : "light",
  };

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

  const exportExcel = () => {
    const rows = records.map(r => ({
      "Date":        fmtDate(r.date),
      "Employee":    r.employeeName,
      "Department":  r.departmentName || "-",
      "Status":      statusAr(r.status),
      "Check In":    fmt12(r.checkInTime),
      "Check Out":   fmt12(r.checkOutTime),
      "Hours":       r.workingHours ? r.workingHours.toFixed(2) : "-",
      "Late (min)":  r.lateMinutes ?? 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const wbBin = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbBin], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${startDate}-${endDate}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFont("helvetica");
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 95);
    doc.text("Attendance Report", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Period: ${startDate}  to  ${endDate}`, 14, 26);
    doc.text(`Records: ${records.length}  |  Present: ${presentCount}  |  Absent: ${absentCount}  |  Late: ${lateCount}  |  Hours: ${totalHours.toFixed(1)}`, 14, 32);
    doc.setDrawColor(200, 210, 220);
    doc.line(14, 35, 283, 35);
    autoTable(doc, {
      startY: 39,
      head: [["Date", "Employee", "Department", "Status", "Check In", "Check Out", "Hours", "Late (min)"]],
      body: records.map(r => [
        r.date, r.employeeName, r.departmentName || "—", statusAr(r.status),
        fmt12(r.checkInTime), fmt12(r.checkOutTime),
        r.workingHours ? r.workingHours.toFixed(1) : "—",
        r.lateMinutes ?? 0,
      ]),
      styles: { fontSize: 8, font: "helvetica", cellPadding: 3, textColor: [30, 30, 30] },
      headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: [246, 249, 252] },
      tableLineColor: [220, 228, 236],
      tableLineWidth: 0.1,
    });
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text(`Page ${i} of ${pageCount}  |  Generated: ${new Date().toLocaleDateString()}`, 14, doc.internal.pageSize.height - 8);
    }
    doc.save(`attendance-report-${startDate}-${endDate}.pdf`);
  };

  const exportCSV = () => {
    const header = ["التاريخ", "الموظف", "القسم", "الحالة", "وقت الدخول", "وقت الخروج", "ساعات العمل", "دقائق التأخير"];
    const rows = records.map(r => [
      r.date, r.employeeName, r.departmentName || "", statusAr(r.status),
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
    a.href = url; a.download = `تقرير-الحضور-${startDate}-${endDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const bodyRows = records.map(r => {
      const sc = r.status === "present" ? "#10b981" : r.status === "late" ? "#f59e0b" : r.status === "absent" ? "#ef4444" : "#3b82f6";
      return `<tr>
        <td>${fmtDate(r.date)}</td><td>${r.employeeName}</td><td>${r.departmentName ?? "—"}</td>
        <td><span style="color:${sc};font-weight:600">${statusAr(r.status)}</span></td>
        <td>${fmt12(r.checkInTime)}</td><td>${fmt12(r.checkOutTime)}</td>
        <td>${r.workingHours ? r.workingHours.toFixed(1) + " h" : "—"}</td>
        <td>${r.lateMinutes ? r.lateMinutes + " min" : "—"}</td>
      </tr>`;
    }).join("");
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head>
      <meta charset="utf-8"><title>Attendance Report</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;padding:24px;color:#111;background:#fff;direction:rtl}
        .header{margin-bottom:20px}
        h1{font-size:20px;font-weight:800;color:#1e3a5f;margin-bottom:4px}
        .meta{color:#555;font-size:12px;margin-bottom:16px}
        .stats{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
        .stat{background:#f0f4f8;border-radius:8px;padding:10px 16px;text-align:center;min-width:100px}
        .stat-val{font-size:22px;font-weight:800;color:#1e3a5f}
        .stat-lbl{font-size:10px;color:#666;margin-top:2px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        thead tr{background:#1e3a5f}
        th{color:#fff;padding:9px 11px;text-align:right;font-weight:600;font-size:11px}
        td{padding:8px 11px;border-bottom:1px solid #e5e7eb;vertical-align:middle}
        tr:nth-child(even) td{background:#f8fafc}
        .footer{text-align:center;margin-top:24px;color:#999;font-size:10px;border-top:1px solid #e5e7eb;padding-top:12px}
        @media print{.no-print{display:none}@page{margin:12mm}body{padding:0}}
      </style></head><body>
      <div class="header">
        <h1>Attendance Report</h1>
        <div class="meta">Period: ${startDate} &mdash; ${endDate}</div>
      </div>
      <div class="stats">
        <div class="stat"><div class="stat-val">${records.length}</div><div class="stat-lbl">Total Records</div></div>
        <div class="stat"><div class="stat-val" style="color:#10b981">${presentCount}</div><div class="stat-lbl">Present Days</div></div>
        <div class="stat"><div class="stat-val" style="color:#ef4444">${absentCount}</div><div class="stat-lbl">Absent Days</div></div>
        <div class="stat"><div class="stat-val" style="color:#f59e0b">${lateCount}</div><div class="stat-lbl">Late Days</div></div>
        <div class="stat"><div class="stat-val">${totalHours.toFixed(1)}</div><div class="stat-lbl">Total Hours</div></div>
      </div>
      <table>
        <thead><tr>
          <th>Date</th><th>Employee</th><th>Department</th><th>Status</th>
          <th>Check In</th><th>Check Out</th><th>Hours</th><th>Late</th>
        </tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
      <div class="footer">Attendance Management System &mdash; Generated: ${new Date().toLocaleDateString()}</div>
      <script>window.onload=()=>{window.print()}</script>
    </body></html>`);
    w.document.close();
  };

  const locale = lang === "ar" ? "ar-IQ" : "en-US";

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14, maxWidth: 960, margin: "0 auto" }} dir="rtl">
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: textPrimary, margin: 0 }}>التقارير</h1>
        <p style={{ fontSize: 12, color: textSecondary, marginTop: 4 }}>تقارير الحضور والانصراف</p>
      </div>

      {/* Filters */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Filter size={15} style={{ color: "#00f5ff" }} />
          <span style={{ color: textPrimary, fontWeight: 700, fontSize: 13 }}>تصفية التقارير</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label style={{ color: textSecondary, fontSize: 11, display: "block", marginBottom: 5 }}>من تاريخ</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ color: textSecondary, fontSize: 11, display: "block", marginBottom: 5 }}>إلى تاريخ</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ color: textSecondary, fontSize: 11, display: "block", marginBottom: 5 }}>الموظف</label>
            <select value={empId} onChange={e => setEmpId(e.target.value)} style={inputStyle}>
              <option value="" style={{ background: isDark ? "#050d1f" : "#fff" }}>كل الموظفين</option>
              {employees.map(e => <option key={e.id} value={e.id} style={{ background: isDark ? "#050d1f" : "#fff" }}>{e.fullName}</option>)}
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
              { label: "إجمالي السجلات", val: records.length, color: textPrimary, glow: isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0" },
              { label: "أيام الحضور", val: presentCount, color: "#10b981", glow: "rgba(16,185,129,0.12)" },
              { label: "أيام الغياب", val: absentCount, color: "#f87171", glow: "rgba(248,113,113,0.12)" },
              { label: "ساعات العمل", val: totalHours.toFixed(1), color: "#00f5ff", glow: "rgba(0,245,255,0.12)" },
            ].map((item, i) => (
              <div key={i} style={{ background: cardBg, border: `1px solid ${isDark ? item.glow : "#e2e8f0"}`, borderRadius: 14, padding: "12px 8px", textAlign: "center", boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.05)" }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: item.color, margin: 0 }}>{item.val}</p>
                <p style={{ fontSize: 10, color: textSecondary, marginTop: 3 }}>{item.label}</p>
              </div>
            ))}
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2 flex-wrap no-print">
            {[
              { label: "Excel", icon: FileSpreadsheet, action: exportExcel, color: "#10b981", glow: "rgba(16,185,129,0.2)" },
              { label: "CSV", icon: FileDown, action: exportCSV, color: "#06b6d4", glow: "rgba(6,182,212,0.2)" },
              { label: "PDF", icon: FileText, action: exportPDF, color: "#f87171", glow: "rgba(248,113,113,0.2)" },
              { label: "طباعة", icon: Printer, action: handlePrint, color: isDark ? "rgba(255,255,255,0.5)" : "#475569", glow: isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0" },
            ].map(({ label, icon: Icon, action, color, glow }) => (
              <button key={label} onClick={action}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: `1px solid ${glow}`, background: isDark ? glow : "#f8fafc", color, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
                <Icon size={14} /> تصدير {label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, overflow: "hidden", boxShadow: isDark ? "none" : "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theadBorder}` }}>
                    {["التاريخ", "الموظف", "الحالة", "الدخول", "الخروج", "ساعات", "تأخير"].map(h => (
                      <th key={h} style={{ textAlign: "right", color: theadColor, fontWeight: 600, padding: "11px 14px", fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => {
                    const sColor = r.status === "present" ? "#10b981" : r.status === "late" ? "#f59e0b" : r.status === "absent" ? "#f87171" : "#3b82f6";
                    const sBg = r.status === "present" ? "rgba(16,185,129,0.1)" : r.status === "late" ? "rgba(245,158,11,0.1)" : r.status === "absent" ? "rgba(248,113,113,0.1)" : "rgba(59,130,246,0.1)";
                    return (
                      <tr key={r.id}
                        style={{ borderBottom: i < records.length - 1 ? `1px solid ${tableBorder}` : "none", transition: "background 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = rowHoverBg)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "10px 14px", color: textSecondary, fontSize: 12 }}>{fmtDate(r.date)}</td>
                        <td style={{ padding: "10px 14px", color: textPrimary, fontWeight: 600 }}>{r.employeeName}</td>
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
        <div style={{ textAlign: "center", padding: "60px 0", color: textMuted }}>
          <Calendar size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 13 }}>اختر الفترة الزمنية ثم اضغط عرض</p>
        </div>
      )}
    </div>
  );
}
