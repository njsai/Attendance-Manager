import { useState, useEffect, useCallback, useRef } from "react";
import { getCachedStale, setCached, invalidatePrefix } from "@/lib/pageCache";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search,
  Printer, Download, X, Check, AlertCircle,
  Loader2, Zap, Eye, Trash2, Edit, History, CheckCircle, XCircle,
  Banknote, ArrowDownRight, RefreshCw
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useTheme } from "@/lib/theme";

const BASE = import.meta.env.BASE_URL;
const api = (path: string) => `${BASE}api/payroll${path}`;

const MONTHS = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"
];
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  unpaid:  { label: "غير مدفوع",  color: "#f87171",  bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.25)" },
  paid:    { label: "مدفوع",      color: "#10b981",  bg: "rgba(16,185,129,0.1)",   border: "rgba(16,185,129,0.25)" },
  partial: { label: "جزئي",       color: "#f59e0b",  bg: "rgba(245,158,11,0.1)",   border: "rgba(245,158,11,0.25)" },
};

type PayrollRecord = {
  id: number; employeeId: number; employeeName: string; jobTitle?: string; departmentName?: string;
  month: number; year: number; basicSalary: number; incentives: number; overtimePay: number;
  deductions: number; advances: number; lateDeduction: number; absenceDeduction: number;
  netSalary: number; currency: string; status: string; paidAt?: string;
  workDays: number; absentDays: number; lateMinutes: number; overtimeMinutes: number;
  leaveDays: number; notes?: string; createdAt: string; updatedAt?: string;
};
type Stats = {
  totalNet: number; totalPaid: number; totalDeductions: number; totalOvertime: number;
  totalAdvances: number; unpaidCount: number; paidCount: number; total: number;
};
type Employee = { id: number; fullName: string; salary?: number; };
type LogEntry = { id: number; fieldName: string; oldValue?: string; newValue?: string; changedAt: string; changedByName?: string; };

function fmt(n: number, currency = "IQD") {
  return n.toLocaleString("ar-IQ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " " + (currency === "USD" ? "$" : "د.ع");
}
function fmtField(k: string) {
  const m: Record<string,string> = {
    basicSalary:"الراتب الأساسي", incentives:"الحوافز", overtimePay:"الأوفر تايم",
    deductions:"الخصومات", advances:"السلف", lateDeduction:"خصم التأخير",
    absenceDeduction:"خصم الغياب", netSalary:"الصافي", status:"الحالة", notes:"الملاحظات", currency:"العملة"
  };
  return m[k] ?? k;
}

// ─── Slip Component ────────────────────────────────────────────────────────────
function PayrollSlip({ record, onClose }: { record: PayrollRecord; onClose: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const slipRef = useRef<HTMLDivElement>(null);

  const modalBg   = isDark ? "rgba(5,13,31,0.97)" : "#fff";
  const modalBd   = isDark ? "rgba(0,245,255,0.12)" : "#e2e8f0";
  const divider   = isDark ? "rgba(0,245,255,0.07)" : "#f1f5f9";
  const titleColor= isDark ? "#fff" : "#0f172a";
  const subColor  = isDark ? "rgba(255,255,255,0.35)" : "#94a3b8";
  const closeBtnC = isDark ? "rgba(255,255,255,0.35)" : "#94a3b8";
  const rowDivider= isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9";
  const statLabelC= isDark ? "rgba(255,255,255,0.3)" : "#94a3b8";
  const statValueC= isDark ? "#fff" : "#0f172a";
  const statCellBg= isDark ? "rgba(255,255,255,0.03)" : "#f8fafc";
  const rowLabelC = isDark ? "rgba(255,255,255,0.55)" : "#475569";
  const netLabelC = isDark ? "#fff" : "#0f172a";
  const cyanColor = isDark ? "#00f5ff" : "#0891b2";
  const paidAtC   = isDark ? "rgba(255,255,255,0.3)" : "#94a3b8";
  const notesBg   = isDark ? "rgba(255,255,255,0.03)" : "#f8fafc";
  const notesLblC = isDark ? "rgba(255,255,255,0.3)" : "#94a3b8";
  const notesValC = isDark ? "rgba(255,255,255,0.6)" : "#475569";

  const rowSt = () => ({
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "6px 0", fontSize: 13, borderBottom: `1px solid ${rowDivider}`
  });

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head>
      <meta charset="utf-8"><title>كشف راتب</title>
      <style>
        body{font-family:sans-serif;padding:30px;color:#111;direction:rtl}
        h1{font-size:22px;margin:0 0 4px}
        .sub{color:#666;font-size:13px;margin-bottom:24px}
        table{width:100%;border-collapse:collapse;margin:16px 0}
        td,th{padding:10px 12px;border:1px solid #ddd;font-size:13px}
        th{background:#f5f5f5;font-weight:600;text-align:right}
        .total{background:#1a1a2e;color:#fff;font-weight:bold}
        .row{display:flex;justify-content:space-between;margin:6px 0;font-size:13px}
        .footer{text-align:center;margin-top:30px;color:#999;font-size:12px;border-top:1px solid #eee;padding-top:16px}
        @media print{button{display:none}}
      </style></head><body>
      <h1>كشف الراتب الشهري</h1>
      <div class="sub">${MONTHS[record.month - 1]} ${record.year}</div>
      <table>
        <tr><th>الموظف</th><td>${record.employeeName}</td><th>المسمى الوظيفي</th><td>${record.jobTitle ?? "-"}</td></tr>
        <tr><th>القسم</th><td>${record.departmentName ?? "-"}</td><th>العملة</th><td>${record.currency}</td></tr>
        <tr><th>أيام الحضور</th><td>${record.workDays} يوم</td><th>أيام الغياب</th><td>${record.absentDays} يوم</td></tr>
        <tr><th>تأخير (دقيقة)</th><td>${record.lateMinutes}</td><th>أوفر تايم (دقيقة)</th><td>${record.overtimeMinutes}</td></tr>
      </table>
      <table>
        <tr><th colspan="2" style="background:#e8f5e9">المستحقات</th></tr>
        <tr><td>الراتب الأساسي</td><td>${fmt(record.basicSalary, record.currency)}</td></tr>
        <tr><td>الحوافز والمكافآت</td><td>${fmt(record.incentives, record.currency)}</td></tr>
        <tr><td>أجر الأوفر تايم</td><td>${fmt(record.overtimePay, record.currency)}</td></tr>
        <tr><th colspan="2" style="background:#fce4ec">الخصومات</th></tr>
        <tr><td>خصومات أخرى</td><td>${fmt(record.deductions, record.currency)}</td></tr>
        <tr><td>سلف</td><td>${fmt(record.advances, record.currency)}</td></tr>
        <tr><td>خصم التأخير</td><td>${fmt(record.lateDeduction, record.currency)}</td></tr>
        <tr><td>خصم الغياب</td><td>${fmt(record.absenceDeduction, record.currency)}</td></tr>
        <tr class="total"><td>صافي الراتب</td><td>${fmt(record.netSalary, record.currency)}</td></tr>
      </table>
      ${record.notes ? `<div class="row"><span>ملاحظات:</span><span>${record.notes}</span></div>` : ""}
      <div class="footer">تم إنشاؤه بواسطة نظام إدارة الحضور والانصراف &mdash; ${new Date().toLocaleDateString("ar-IQ")}</div>
      <script>window.onload=()=>{window.print();window.close()}</script>
    </body></html>`);
    w.document.close();
  };

  const handlePDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.setFont("helvetica");
    doc.setFontSize(18);
    doc.text(`Payroll Slip - ${MONTHS[record.month - 1]} ${record.year}`, 105, 20, { align: "center" });
    doc.setFontSize(11);
    doc.text(`Employee: ${record.employeeName}`, 20, 35);
    doc.text(`Status: ${STATUS_MAP[record.status]?.label}`, 20, 42);
    autoTable(doc, {
      startY: 50,
      head: [["Item", "Amount"]],
      body: [
        ["Basic Salary", fmt(record.basicSalary, record.currency)],
        ["Incentives", fmt(record.incentives, record.currency)],
        ["Overtime Pay", fmt(record.overtimePay, record.currency)],
        ["Deductions", `-${fmt(record.deductions, record.currency)}`],
        ["Advances", `-${fmt(record.advances, record.currency)}`],
        ["Late Deduction", `-${fmt(record.lateDeduction, record.currency)}`],
        ["Absence Deduction", `-${fmt(record.absenceDeduction, record.currency)}`],
        ["NET SALARY", fmt(record.netSalary, record.currency)],
      ],
      styles: { font: "helvetica", fontSize: 10 },
      headStyles: { fillColor: [30, 40, 80] },
      bodyStyles: { halign: "right" },
    });
    doc.save(`payslip_${record.employeeId}_${record.year}_${record.month}.pdf`);
  };

  const st = STATUS_MAP[record.status];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl">
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ background: modalBg, border: `1px solid ${modalBd}`, borderRadius: 20, width: "100%", maxWidth: 500, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${divider}` }}>
          <div>
            <h2 style={{ color: titleColor, fontWeight: 700, fontSize: 15, margin: 0 }}>كشف الراتب</h2>
            <p style={{ color: subColor, fontSize: 12, marginTop: 2 }}>{record.employeeName} — {MONTHS[record.month - 1]} {record.year}</p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={handlePrint} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 9, border: "none", background: "rgba(168,85,247,0.15)", color: "#a855f7", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
              <Printer size={12} /> طباعة
            </button>
            <button onClick={handlePDF} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 9, border: "none", background: "rgba(16,185,129,0.12)", color: "#10b981", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
              <Download size={12} /> PDF
            </button>
            <button onClick={onClose} style={{ padding: 6, borderRadius: 8, background: "none", border: "none", color: closeBtnC, cursor: "pointer" }}><X size={16} /></button>
          </div>
        </div>
        <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }} ref={slipRef}>
          <div className="grid grid-cols-2 gap-2">
            {[["المسمى الوظيفي", record.jobTitle ?? "-"], ["القسم", record.departmentName ?? "-"],
              ["أيام الحضور", `${record.workDays} يوم`], ["أيام الغياب", `${record.absentDays} يوم`],
              ["تأخير", `${record.lateMinutes} دقيقة`], ["أوفر تايم", `${record.overtimeMinutes} دقيقة`],
            ].map(([k, v]) => (
              <div key={k} style={{ background: statCellBg, borderRadius: 10, padding: "8px 12px" }}>
                <p style={{ color: statLabelC, fontSize: 10, margin: 0 }}>{k}</p>
                <p style={{ color: statValueC, fontSize: 13, fontWeight: 600, marginTop: 2 }}>{v}</p>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 12, padding: "12px 14px" }}>
            <p style={{ color: "#10b981", fontSize: 10, fontWeight: 700, marginBottom: 8 }}>المستحقات</p>
            {[["الراتب الأساسي", record.basicSalary], ["الحوافز والمكافآت", record.incentives], ["أجر الأوفر تايم", record.overtimePay]].map(([k, v]) => (
              <div key={k as string} style={rowSt()}>
                <span style={{ color: rowLabelC }}>{k as string}</span>
                <span style={{ color: "#10b981", fontWeight: 600 }}>+{fmt(v as number, record.currency)}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 12, padding: "12px 14px" }}>
            <p style={{ color: "#f87171", fontSize: 10, fontWeight: 700, marginBottom: 8 }}>الخصومات</p>
            {[["خصومات أخرى", record.deductions], ["سلف", record.advances], ["خصم التأخير", record.lateDeduction], ["خصم الغياب", record.absenceDeduction]].map(([k, v]) => (
              <div key={k as string} style={rowSt()}>
                <span style={{ color: rowLabelC }}>{k as string}</span>
                <span style={{ color: (v as number) > 0 ? "#f87171" : isDark ? "rgba(255,255,255,0.2)" : "#cbd5e1", fontWeight: 600 }}>{(v as number) > 0 ? `-${fmt(v as number, record.currency)}` : "٠"}</span>
              </div>
            ))}
          </div>
          <div style={{ background: isDark ? "rgba(0,245,255,0.05)" : "rgba(8,145,178,0.05)", border: `1px solid ${isDark ? "rgba(0,245,255,0.15)" : "rgba(8,145,178,0.2)"}`, borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: netLabelC, fontWeight: 700, fontSize: 15 }}>صافي الراتب</span>
            <span style={{ color: cyanColor, fontWeight: 900, fontSize: 18 }}>{fmt(record.netSalary, record.currency)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#94a3b8", fontSize: 12 }}>حالة الصرف:</span>
            {st && <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 20, color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>{st.label}</span>}
          </div>
          {record.paidAt && <p style={{ color: paidAtC, fontSize: 11, textAlign: "center" }}>تاريخ الصرف: {new Date(record.paidAt).toLocaleDateString("ar-IQ", { year: "numeric", month: "long", day: "numeric" })}</p>}
          {record.notes && (
            <div style={{ background: notesBg, borderRadius: 10, padding: "10px 12px" }}>
              <p style={{ color: notesLblC, fontSize: 10, marginBottom: 4 }}>ملاحظات</p>
              <p style={{ color: notesValC, fontSize: 13 }}>{record.notes}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ record, onClose, onSave }: { record: PayrollRecord; onClose: () => void; onSave: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [form, setForm] = useState({
    basicSalary: record.basicSalary, incentives: record.incentives, overtimePay: record.overtimePay,
    deductions: record.deductions, advances: record.advances, lateDeduction: record.lateDeduction,
    absenceDeduction: record.absenceDeduction, notes: record.notes ?? "", currency: record.currency,
  });
  const [saving, setSaving] = useState(false);
  const net = form.basicSalary + form.incentives + form.overtimePay - form.deductions - form.advances - form.lateDeduction - form.absenceDeduction;

  const modalBg   = isDark ? "rgba(5,13,31,0.97)" : "#fff";
  const modalBd   = isDark ? "rgba(0,245,255,0.12)" : "#e2e8f0";
  const divider   = isDark ? "rgba(0,245,255,0.07)" : "#f1f5f9";
  const titleColor= isDark ? "#fff" : "#0f172a";
  const subColor  = isDark ? "rgba(255,255,255,0.35)" : "#94a3b8";
  const closeBtnC = isDark ? "rgba(255,255,255,0.35)" : "#94a3b8";
  const labelColor= isDark ? "rgba(255,255,255,0.35)" : "#64748b";
  const inputBg   = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc";
  const inputBd   = isDark ? "rgba(0,245,255,0.1)" : "#cbd5e1";
  const inputColor= isDark ? "#fff" : "#0f172a";
  const cancelColor= isDark ? "rgba(255,255,255,0.4)" : "#475569";
  const netBg     = isDark ? "rgba(0,245,255,0.05)" : "rgba(8,145,178,0.05)";
  const netBd     = isDark ? "rgba(0,245,255,0.12)" : "rgba(8,145,178,0.2)";
  const netLblC   = isDark ? "rgba(255,255,255,0.7)" : "#475569";
  const cyanColor = isDark ? "#00f5ff" : "#0891b2";

  const nInp: React.CSSProperties = {
    width: "100%", padding: "8px 11px", borderRadius: 9,
    background: inputBg, border: `1px solid ${inputBd}`,
    color: inputColor, fontSize: 12, outline: "none",
    boxSizing: "border-box", colorScheme: isDark ? "dark" : "light",
  };
  const nLbl: React.CSSProperties = { display: "block", fontSize: 10, color: labelColor, marginBottom: 4 };

  const field = (label: string, key: keyof typeof form, type = "number") => (
    <div>
      <label style={nLbl}>{label}</label>
      <input type={type} value={form[key] as any}
        onChange={e => setForm(f => ({ ...f, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }))}
        style={nInp} />
    </div>
  );

  const save = async () => {
    setSaving(true);
    try {
      await fetch(api(`/${record.id}`), {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify(form),
      });
      onSave(); onClose();
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl">
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ background: modalBg, border: `1px solid ${modalBd}`, borderRadius: 20, width: "100%", maxWidth: 500, maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${divider}` }}>
          <div>
            <h2 style={{ color: titleColor, fontWeight: 700, fontSize: 15, margin: 0 }}>تعديل الراتب</h2>
            <p style={{ color: subColor, fontSize: 12, marginTop: 2 }}>{record.employeeName} — {MONTHS[record.month - 1]} {record.year}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: closeBtnC, cursor: "pointer" }}><X size={16} /></button>
        </div>
        <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10, maxHeight: "65vh", overflowY: "auto" }}>
          <div className="grid grid-cols-2 gap-3">
            {field("الراتب الأساسي", "basicSalary")}
            {field("الحوافز والمكافآت", "incentives")}
            {field("أجر الأوفر تايم", "overtimePay")}
            {field("خصومات أخرى", "deductions")}
            {field("السلف", "advances")}
            {field("خصم التأخير", "lateDeduction")}
            {field("خصم الغياب", "absenceDeduction")}
            <div>
              <label style={nLbl}>العملة</label>
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                style={{ ...nInp, colorScheme: isDark ? "dark" : "light" }}>
                <option value="IQD">دينار عراقي (IQD)</option>
                <option value="USD">دولار أمريكي (USD)</option>
              </select>
            </div>
          </div>
          <div>
            <label style={nLbl}>ملاحظات</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...nInp, resize: "none" }} />
          </div>
          <div style={{ background: netBg, border: `1px solid ${netBd}`, borderRadius: 11, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: netLblC, fontSize: 13, fontWeight: 600 }}>صافي الراتب المحسوب</span>
            <span style={{ color: net < 0 ? "#f87171" : cyanColor, fontWeight: 900, fontSize: 16 }}>{fmt(net, form.currency)}</span>
          </div>
        </div>
        <div style={{ padding: "12px 18px", borderTop: `1px solid ${divider}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${inputBd}`, background: inputBg, color: cancelColor, fontSize: 12, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>إلغاء</button>
          <button onClick={save} disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, rgba(0,180,200,0.85), rgba(59,130,246,0.85))", color: "#fff", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif" }}>
            {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={13} />}
            حفظ التعديلات
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Add Modal ─────────────────────────────────────────────────────────────────
function AddModal({ employees, onClose, onSave, month, year }: {
  employees: Employee[]; onClose: () => void; onSave: () => void; month: number; year: number;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [form, setForm] = useState({
    employeeId: "", month: String(month), year: String(year),
    basicSalary: "0", incentives: "0", overtimePay: "0",
    deductions: "0", advances: "0", lateDeduction: "0", absenceDeduction: "0",
    currency: "IQD", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const net = parseFloat(form.basicSalary||"0") + parseFloat(form.incentives||"0") + parseFloat(form.overtimePay||"0")
    - parseFloat(form.deductions||"0") - parseFloat(form.advances||"0")
    - parseFloat(form.lateDeduction||"0") - parseFloat(form.absenceDeduction||"0");

  const modalBg   = isDark ? "rgba(5,13,31,0.97)" : "#fff";
  const modalBd   = isDark ? "rgba(0,245,255,0.12)" : "#e2e8f0";
  const divider   = isDark ? "rgba(0,245,255,0.07)" : "#f1f5f9";
  const titleColor= isDark ? "#fff" : "#0f172a";
  const closeBtnC = isDark ? "rgba(255,255,255,0.35)" : "#94a3b8";
  const labelColor= isDark ? "rgba(255,255,255,0.35)" : "#64748b";
  const inputBg   = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc";
  const inputBd   = isDark ? "rgba(0,245,255,0.1)" : "#cbd5e1";
  const inputColor= isDark ? "#fff" : "#0f172a";
  const cancelColor= isDark ? "rgba(255,255,255,0.4)" : "#475569";
  const netBg     = isDark ? "rgba(0,245,255,0.05)" : "rgba(8,145,178,0.05)";
  const netBd     = isDark ? "rgba(0,245,255,0.12)" : "rgba(8,145,178,0.2)";
  const netLblC   = isDark ? "rgba(255,255,255,0.7)" : "#475569";
  const cyanColor = isDark ? "#00f5ff" : "#0891b2";
  const lbl: React.CSSProperties = { display: "block", fontSize: 10, color: labelColor, marginBottom: 4 };
  const sel: React.CSSProperties = { width: "100%", padding: "8px 11px", borderRadius: 9, background: inputBg, border: `1px solid ${inputBd}`, color: inputColor, fontSize: 12, outline: "none", colorScheme: isDark ? "dark" : "light" };

  useEffect(() => {
    if (form.employeeId) {
      const emp = employees.find(e => e.id === parseInt(form.employeeId));
      if (emp?.salary) setForm(f => ({ ...f, basicSalary: String(emp.salary!) }));
    }
  }, [form.employeeId, employees]);

  const field = (label: string, key: keyof typeof form) => (
    <div>
      <label style={lbl}>{label}</label>
      <input type="number" min="0" value={form[key] as string}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        style={sel} />
    </div>
  );

  const save = async () => {
    if (!form.employeeId) { setError("اختر الموظف"); return; }
    setSaving(true); setError("");
    try {
      const r = await fetch(api("/"), {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          employeeId: parseInt(form.employeeId), month: parseInt(form.month), year: parseInt(form.year),
          basicSalary: parseFloat(form.basicSalary) || 0, incentives: parseFloat(form.incentives) || 0,
          overtimePay: parseFloat(form.overtimePay) || 0, deductions: parseFloat(form.deductions) || 0,
          advances: parseFloat(form.advances) || 0, lateDeduction: parseFloat(form.lateDeduction) || 0,
          absenceDeduction: parseFloat(form.absenceDeduction) || 0, currency: form.currency, notes: form.notes,
        }),
      });
      if (!r.ok) { const d = await r.json(); setError(d.message); return; }
      onSave(); onClose();
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl">
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ background: modalBg, border: `1px solid ${modalBd}`, borderRadius: 20, width: "100%", maxWidth: 520 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${divider}` }}>
          <h2 style={{ color: titleColor, fontWeight: 700, fontSize: 15, margin: 0 }}>إضافة راتب جديد</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: closeBtnC, cursor: "pointer" }}><X size={16} /></button>
        </div>
        <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10, maxHeight: "65vh", overflowY: "auto" }}>
          {error && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, color: "#f87171", fontSize: 12 }}><AlertCircle size={13} />{error}</div>}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "الموظف", key: "employeeId", span: 3, opts: [{ v: "", l: "— اختر الموظف —" }, ...employees.map(e => ({ v: String(e.id), l: e.fullName }))] },
              { label: "الشهر", key: "month", span: 1, opts: MONTHS.map((m, i) => ({ v: String(i + 1), l: m })) },
              { label: "السنة", key: "year", span: 1, opts: YEARS.map(y => ({ v: String(y), l: String(y) })) },
              { label: "العملة", key: "currency", span: 1, opts: [{ v: "IQD", l: "IQD دينار عراقي" }, { v: "USD", l: "USD دولار" }] },
            ].map(f => (
              <div key={f.key} style={{ gridColumn: `span ${f.span}` }}>
                <label style={lbl}>{f.label}</label>
                <select value={form[f.key as keyof typeof form]} onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))} style={sel}>
                  {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("الراتب الأساسي", "basicSalary")}
            {field("الحوافز والمكافآت", "incentives")}
            {field("أجر الأوفر تايم", "overtimePay")}
            {field("خصومات أخرى", "deductions")}
            {field("السلف", "advances")}
            {field("خصم التأخير", "lateDeduction")}
            {field("خصم الغياب", "absenceDeduction")}
          </div>
          <div>
            <label style={lbl}>ملاحظات</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              style={{ ...sel, resize: "none", boxSizing: "border-box", colorScheme: isDark ? "dark" : "light" }} />
          </div>
          <div style={{ background: netBg, border: `1px solid ${netBd}`, borderRadius: 11, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: netLblC, fontSize: 13, fontWeight: 600 }}>صافي الراتب المحسوب</span>
            <span style={{ color: net < 0 ? "#f87171" : cyanColor, fontWeight: 900, fontSize: 16 }}>{fmt(net, form.currency)}</span>
          </div>
        </div>
        <div style={{ padding: "12px 18px", borderTop: `1px solid ${divider}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${inputBd}`, background: inputBg, color: cancelColor, fontSize: 12, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>إلغاء</button>
          <button onClick={save} disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, rgba(16,185,129,0.8), rgba(5,150,105,0.7))", color: "#fff", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif" }}>
            {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={13} />}
            إضافة الراتب
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Generate Modal ────────────────────────────────────────────────────────────
function GenerateModal({ onClose, onSave, month, year }: { onClose: () => void; onSave: () => void; month: number; year: number }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [selMonth, setSelMonth] = useState(month);
  const [selYear, setSelYear] = useState(year);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; message: string } | null>(null);

  const modalBg   = isDark ? "rgba(5,13,31,0.97)" : "#fff";
  const modalBd   = isDark ? "rgba(0,245,255,0.12)" : "#e2e8f0";
  const divider   = isDark ? "rgba(0,245,255,0.07)" : "#f1f5f9";
  const titleColor= isDark ? "#fff" : "#0f172a";
  const subColor  = isDark ? "rgba(255,255,255,0.35)" : "#94a3b8";
  const closeBtnC = isDark ? "rgba(255,255,255,0.35)" : "#94a3b8";
  const labelColor= isDark ? "rgba(255,255,255,0.35)" : "#64748b";
  const inputBg   = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc";
  const inputBd   = isDark ? "rgba(0,245,255,0.1)" : "#cbd5e1";
  const inputColor= isDark ? "#fff" : "#0f172a";
  const cancelColor= isDark ? "rgba(255,255,255,0.4)" : "#475569";
  const gSel: React.CSSProperties = { padding: "8px 11px", borderRadius: 9, background: inputBg, border: `1px solid ${inputBd}`, color: inputColor, fontSize: 12, outline: "none", colorScheme: isDark ? "dark" : "light" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 10, color: labelColor, marginBottom: 4 };

  const generate = async () => {
    setLoading(true);
    try {
      const r = await fetch(api("/generate"), {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ month: selMonth, year: selYear }),
      });
      const d = await r.json();
      setResult(d);
      if (r.ok) onSave();
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl">
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ background: modalBg, border: `1px solid ${modalBd}`, borderRadius: 20, width: "100%", maxWidth: 440 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${divider}` }}>
          <div>
            <h2 style={{ color: titleColor, fontWeight: 700, fontSize: 15, margin: 0 }}>توليد رواتب جماعية</h2>
            <p style={{ color: subColor, fontSize: 12, marginTop: 2 }}>يتم إنشاء رواتب جميع الموظفين النشطين تلقائياً</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: closeBtnC, cursor: "pointer" }}><X size={16} /></button>
        </div>
        <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={lbl}>الشهر</label>
              <select value={selMonth} onChange={e => setSelMonth(parseInt(e.target.value))} style={{ ...gSel, width: "100%" }}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>السنة</label>
              <select value={selYear} onChange={e => setSelYear(parseInt(e.target.value))} style={{ ...gSel, width: "100%" }}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 11, padding: "10px 12px", display: "flex", gap: 8 }}>
            <AlertCircle size={14} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: "#f59e0b", fontSize: 11, margin: 0 }}>سيتم حساب التأخير والغياب والأوفر تايم تلقائياً من سجلات الحضور. الرواتب الموجودة مسبقاً لن تُحدَّث.</p>
          </div>
          {result && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 11, background: result.created > 0 ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)", border: `1px solid ${result.created > 0 ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`, color: result.created > 0 ? "#10b981" : "#f59e0b", fontSize: 13 }}>
              <CheckCircle size={14} />
              {result.message}
            </div>
          )}
        </div>
        <div style={{ padding: "12px 18px", borderTop: `1px solid ${divider}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${inputBd}`, background: inputBg, color: cancelColor, fontSize: 12, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>إغلاق</button>
          <button onClick={generate} disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, rgba(16,185,129,0.8), rgba(5,150,105,0.7))", color: "#fff", fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif" }}>
            {loading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={13} />}
            توليد الرواتب
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Logs Modal ────────────────────────────────────────────────────────────────
function LogsModal({ payrollId, employeeName, onClose }: { payrollId: number; employeeName: string; onClose: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const modalBg   = isDark ? "rgba(5,13,31,0.97)" : "#fff";
  const modalBd   = isDark ? "rgba(0,245,255,0.12)" : "#e2e8f0";
  const divider   = isDark ? "rgba(0,245,255,0.07)" : "#f1f5f9";
  const titleColor= isDark ? "#fff" : "#0f172a";
  const subColor  = isDark ? "rgba(255,255,255,0.35)" : "#94a3b8";
  const closeBtnC = isDark ? "rgba(255,255,255,0.35)" : "#94a3b8";
  const logBg     = isDark ? "rgba(255,255,255,0.03)" : "#f8fafc";
  const logTitleC = isDark ? "#fff" : "#0f172a";
  const logDateC  = isDark ? "rgba(255,255,255,0.25)" : "#94a3b8";
  const logByC    = isDark ? "rgba(255,255,255,0.25)" : "#94a3b8";
  const emptyC    = isDark ? "rgba(255,255,255,0.3)" : "#94a3b8";
  const cyanColor = isDark ? "#00f5ff" : "#0891b2";

  useEffect(() => {
    fetch(api(`/${payrollId}/logs`), { credentials: "include" })
      .then(r => r.json()).then(d => setLogs(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, [payrollId]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl">
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ background: modalBg, border: `1px solid ${modalBd}`, borderRadius: 20, width: "100%", maxWidth: 500 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${divider}` }}>
          <div>
            <h2 style={{ color: titleColor, fontWeight: 700, fontSize: 15, margin: 0 }}>سجل التعديلات</h2>
            <p style={{ color: subColor, fontSize: 12, marginTop: 2 }}>{employeeName}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: closeBtnC, cursor: "pointer" }}><X size={16} /></button>
        </div>
        <div style={{ padding: "14px 18px", maxHeight: "60vh", overflowY: "auto" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}><Loader2 size={28} style={{ color: cyanColor, animation: "spin 1s linear infinite" }} /></div>
          ) : logs.length === 0 ? (
            <p style={{ textAlign: "center", color: emptyC, padding: "32px 0", fontSize: 14 }}>لا توجد تعديلات مسجّلة</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {logs.map(l => (
                <div key={l.id} style={{ background: logBg, borderRadius: 11, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: logTitleC, fontSize: 13, fontWeight: 600 }}>{fmtField(l.fieldName)}</span>
                    <span style={{ color: logDateC, fontSize: 10 }}>{new Date(l.changedAt).toLocaleString("ar-IQ")}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <span style={{ color: "#f87171", textDecoration: "line-through" }}>{l.oldValue || "—"}</span>
                    <span style={{ color: isDark ? "rgba(255,255,255,0.2)" : "#cbd5e1" }}>←</span>
                    <span style={{ color: "#10b981" }}>{l.newValue || "—"}</span>
                  </div>
                  {l.changedByName && <p style={{ color: logByC, fontSize: 10, marginTop: 4 }}>بواسطة: {l.changedByName}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Payroll() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [empFilter, setEmpFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const _pck = `payroll-${now.getMonth() + 1}-${now.getFullYear()}`;
  const _pc = getCachedStale<{ records: PayrollRecord[]; stats: Stats | null; employees: Employee[] }>(_pck);
  const [records, setRecords] = useState<PayrollRecord[]>(_pc?.records ?? []);
  const [stats, setStats] = useState<Stats | null>(_pc?.stats ?? null);
  const [employees, setEmployees] = useState<Employee[]>(_pc?.employees ?? []);
  const [loading, setLoading] = useState(!_pc);
  const [showAdd, setShowAdd] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showSlip, setShowSlip] = useState<PayrollRecord | null>(null);
  const [showEdit, setShowEdit] = useState<PayrollRecord | null>(null);
  const [showLogs, setShowLogs] = useState<PayrollRecord | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Theme vars ──────────────────────────────────────────────────────────────
  const textPrimary   = isDark ? "#fff" : "#0f172a";
  const textSecondary = isDark ? "rgba(255,255,255,0.55)" : "#475569";
  const textMuted     = isDark ? "rgba(255,255,255,0.3)" : "#94a3b8";
  const cardBg        = isDark ? "rgba(255,255,255,0.02)" : "#fff";
  const cardBorder    = isDark ? "rgba(0,245,255,0.07)" : "#e2e8f0";
  const inputBg       = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc";
  const inputBd       = isDark ? "rgba(0,245,255,0.1)" : "#cbd5e1";
  const inputColor    = isDark ? "#fff" : "#0f172a";
  const thColor       = isDark ? "rgba(0,245,255,0.45)" : "#0891b2";
  const cyanColor     = isDark ? "#00f5ff" : "#0891b2";
  const hoverBg       = isDark ? "rgba(0,245,255,0.02)" : "rgba(8,145,178,0.02)";
  const tableFootBg   = isDark ? "rgba(0,245,255,0.03)" : "#f8fafc";
  const tableFootBd   = isDark ? "rgba(0,245,255,0.1)" : "#e2e8f0";
  const filtersBg     = isDark ? "rgba(255,255,255,0.02)" : "#f8fafc";
  const filtersBd     = isDark ? "rgba(0,245,255,0.07)" : "#e2e8f0";

  const selSt: React.CSSProperties = {
    padding: "8px 12px", borderRadius: 10,
    background: inputBg, border: `1px solid ${inputBd}`,
    color: inputColor, fontSize: 12, outline: "none",
    colorScheme: isDark ? "dark" : "light",
  };

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    const cacheKey = `payroll-${month}-${year}-${empFilter}-${statusFilter}`;
    const hasCached = !!getCachedStale(cacheKey);
    if (!hasCached) setLoading(true);
    try {
      const params = new URLSearchParams({ month: String(month), year: String(year) });
      if (empFilter) params.set("employeeId", empFilter);
      if (statusFilter) params.set("status", statusFilter);
      const [recs, st, emps] = await Promise.all([
        fetch(`${api("?")}${params}`, { credentials: "include" }).then(r => r.json()),
        fetch(`${api("/stats?")}${params}`, { credentials: "include" }).then(r => r.json()),
        fetch(`${BASE}api/employees`, { credentials: "include" }).then(r => r.json()),
      ]);
      const r = Array.isArray(recs) ? recs : [];
      const e = Array.isArray(emps) ? emps : [];
      setRecords(r);
      setStats(st);
      setEmployees(e);
      setCached(cacheKey, { records: r, stats: st, employees: e });
      setCached(`payroll-${month}-${year}`, { records: r, stats: st, employees: e });
    } finally { setLoading(false); }
  }, [month, year, empFilter, statusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handlePay = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "paid" ? "unpaid" : "paid";
    setPayingId(id);
    try {
      await fetch(api(`/${id}/pay`), {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      showToast(newStatus === "paid" ? "تم تغيير الحالة إلى مدفوع ✓" : "تم تغيير الحالة إلى غير مدفوع");
      fetchAll();
    } finally { setPayingId(null); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف سجل الراتب؟")) return;
    setDeletingId(id);
    try {
      await fetch(api(`/${id}`), { method: "DELETE", credentials: "include" });
      showToast("تم حذف السجل");
      fetchAll();
    } finally { setDeletingId(null); }
  };

  const filtered = records.filter(r =>
    !search || r.employeeName.toLowerCase().includes(search.toLowerCase())
  );
  const currency = records[0]?.currency ?? "IQD";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} dir="rtl">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 60, display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 14, fontSize: 13, fontWeight: 600, backdropFilter: "blur(12px)", background: toast.ok ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", border: `1px solid ${toast.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`, color: toast.ok ? "#10b981" : "#f87171" }}>
            {toast.ok ? <CheckCircle size={15} /> : <XCircle size={15} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: textPrimary, margin: 0 }}>الرواتب</h1>
          <p style={{ fontSize: 12, color: textMuted, marginTop: 4 }}>إدارة وصرف رواتب الموظفين — {MONTHS[month - 1]} {year}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowGenerate(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, rgba(16,185,129,0.8), rgba(5,150,105,0.7))", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
            <Zap size={14} /> توليد جماعي
          </button>
          <button onClick={() => setShowAdd(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, rgba(168,85,247,0.8), rgba(99,102,241,0.7))", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
            <Plus size={14} /> إضافة راتب
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "إجمالي الرواتب",     value: fmt(stats.totalNet, currency),   icon: Banknote,      color: "#a855f7", border: isDark ? "rgba(168,85,247,0.2)" : "rgba(168,85,247,0.3)", bg: isDark ? "rgba(168,85,247,0.08)" : "rgba(168,85,247,0.06)" },
            { label: "مجموع المدفوع",       value: fmt(stats.totalPaid, currency),  icon: CheckCircle,   color: "#10b981", border: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.3)",  bg: isDark ? "rgba(16,185,129,0.08)"  : "rgba(16,185,129,0.06)"  },
            { label: "إجمالي الخصومات",     value: fmt(stats.totalDeductions + stats.totalAdvances, currency), icon: ArrowDownRight, color: "#f87171", border: isDark ? "rgba(248,113,113,0.2)" : "rgba(248,113,113,0.3)", bg: isDark ? "rgba(248,113,113,0.08)" : "rgba(248,113,113,0.06)" },
            { label: "رواتب غير مدفوعة",   value: `${stats.unpaidCount} راتب`,    icon: AlertCircle,   color: "#f59e0b", border: isDark ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.3)",  bg: isDark ? "rgba(245,158,11,0.08)"  : "rgba(245,158,11,0.06)"  },
          ].map(s => (
            <div key={s.label} style={{ borderRadius: 14, border: `1px solid ${s.border}`, background: s.bg, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>{s.label}</p>
                <s.icon size={14} style={{ color: s.color }} />
              </div>
              <p style={{ fontSize: 18, fontWeight: 900, color: s.color, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ background: filtersBg, border: `1px solid ${filtersBd}`, borderRadius: 14, padding: "12px 14px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, ...selSt, flex: 1, minWidth: 160 }}>
            <Search size={13} style={{ color: isDark ? "rgba(0,245,255,0.4)" : "#94a3b8", flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث باسم الموظف..."
              style={{ background: "transparent", color: inputColor, fontSize: 12, outline: "none", border: "none", flex: 1 }} />
          </div>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={selSt}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={selSt}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={empFilter} onChange={e => setEmpFilter(e.target.value)} style={{ ...selSt, maxWidth: 176 }}>
            <option value="">جميع الموظفين</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selSt}>
            <option value="">كل الحالات</option>
            <option value="unpaid">غير مدفوع</option>
            <option value="paid">مدفوع</option>
            <option value="partial">جزئي</option>
          </select>
          <button onClick={fetchAll} title="تحديث"
            style={{ padding: 8, borderRadius: 9, background: inputBg, border: `1px solid ${inputBd}`, color: textMuted, cursor: "pointer" }}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <Loader2 size={28} style={{ color: "#a855f7", animation: "spin 1s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Banknote size={40} style={{ margin: "0 auto 10px", color: textMuted, opacity: 0.4 }} />
            <p style={{ fontSize: 13, color: textMuted, marginBottom: 12 }}>لا توجد سجلات رواتب لهذه الفترة</p>
            <button onClick={() => setShowGenerate(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#a855f7", background: "none", border: "none", cursor: "pointer" }}>
              <Zap size={12} /> توليد رواتب جماعية
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${cardBorder}`, background: isDark ? "transparent" : "#f8fafc" }}>
                  {["الموظف", "القسم", "الراتب الأساسي", "الحوافز", "الأوفر تايم", "الخصومات", "صافي الراتب", "الحضور", "الحالة", "إجراءات"].map(h => (
                    <th key={h} style={{ textAlign: "right", padding: "10px 12px", color: thColor, fontWeight: 600, fontSize: 10, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((r, idx) => {
                    const st = STATUS_MAP[r.status] ?? STATUS_MAP.unpaid;
                    return (
                      <motion.tr key={r.id}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.025 }}
                        style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.03)" : "#f1f5f9"}` }}
                        onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "10px 12px" }}>
                          <p style={{ color: textPrimary, fontWeight: 600, fontSize: 13, margin: 0 }}>{r.employeeName}</p>
                          {r.jobTitle && <p style={{ color: textMuted, fontSize: 10, marginTop: 2 }}>{r.jobTitle}</p>}
                        </td>
                        <td style={{ padding: "10px 12px", color: textSecondary, whiteSpace: "nowrap" }}>{r.departmentName ?? "—"}</td>
                        <td style={{ padding: "10px 12px", color: textPrimary, fontWeight: 600, whiteSpace: "nowrap" }}>{fmt(r.basicSalary, r.currency)}</td>
                        <td style={{ padding: "10px 12px", color: "#10b981", whiteSpace: "nowrap" }}>{r.incentives > 0 ? `+${fmt(r.incentives, r.currency)}` : "—"}</td>
                        <td style={{ padding: "10px 12px", color: cyanColor, whiteSpace: "nowrap" }}>{r.overtimePay > 0 ? `+${fmt(r.overtimePay, r.currency)}` : "—"}</td>
                        <td style={{ padding: "10px 12px", color: "#f87171", whiteSpace: "nowrap" }}>
                          {(r.deductions + r.advances + r.lateDeduction + r.absenceDeduction) > 0
                            ? `-${fmt(r.deductions + r.advances + r.lateDeduction + r.absenceDeduction, r.currency)}` : "—"}
                        </td>
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                          <span style={{ color: textPrimary, fontWeight: 900, fontSize: 14 }}>{fmt(r.netSalary, r.currency)}</span>
                        </td>
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                          <span style={{ color: "#10b981" }}>✓{r.workDays}</span>
                          {r.absentDays > 0 && <span style={{ color: "#f87171", marginRight: 5 }}>✗{r.absentDays}</span>}
                          {r.lateMinutes > 0 && <span style={{ color: "#f59e0b", marginRight: 5 }}>⏱{r.lateMinutes}د</span>}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700, color: st.color, background: st.bg, border: `1px solid ${st.border || "transparent"}` }}>{st.label}</span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", gap: 3 }}>
                            {[
                              { fn: () => setShowSlip(r), icon: Eye, title: "كشف الراتب", color: textSecondary },
                              { fn: () => setShowEdit(r), icon: Edit, title: "تعديل", color: cyanColor },
                              { fn: () => handlePay(r.id, r.status), icon: payingId === r.id ? Loader2 : Check, title: r.status === "paid" ? "إلغاء الدفع" : "تسجيل كمدفوع", color: r.status === "paid" ? "#f59e0b" : "#10b981" },
                              { fn: () => setShowLogs(r), icon: History, title: "سجل التعديلات", color: textMuted },
                            ].map(({ fn, icon: Ic, title, color }, i) => (
                              <button key={i} onClick={fn} title={title}
                                style={{ padding: 5, borderRadius: 7, background: inputBg, border: "none", color, cursor: "pointer" }}>
                                <Ic size={12} className={payingId === r.id && i === 2 ? "animate-spin" : ""} />
                              </button>
                            ))}
                            <button onClick={() => handleDelete(r.id)} disabled={deletingId === r.id} title="حذف"
                              style={{ padding: 5, borderRadius: 7, background: "rgba(248,113,113,0.07)", border: "none", color: "#f87171", cursor: "pointer" }}>
                              {deletingId === r.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `1px solid ${tableFootBd}`, background: tableFootBg }}>
                  <td colSpan={6} style={{ padding: "10px 12px", color: textSecondary, fontWeight: 700, fontSize: 12 }}>المجموع ({filtered.length} موظف)</td>
                  <td style={{ padding: "10px 12px", color: textPrimary, fontWeight: 900, fontSize: 14 }}>{fmt(filtered.reduce((s, r) => s + r.netSalary, 0), currency)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showSlip && <PayrollSlip record={showSlip} onClose={() => setShowSlip(null)} />}
        {showEdit && <EditModal record={showEdit} onClose={() => setShowEdit(null)} onSave={() => { fetchAll(); showToast("تم حفظ التعديلات ✓"); }} />}
        {showAdd && <AddModal employees={employees} month={month} year={year} onClose={() => setShowAdd(false)} onSave={() => { fetchAll(); showToast("تم إضافة الراتب ✓"); }} />}
        {showGenerate && <GenerateModal month={month} year={year} onClose={() => setShowGenerate(false)} onSave={fetchAll} />}
        {showLogs && <LogsModal payrollId={showLogs.id} employeeName={showLogs.employeeName} onClose={() => setShowLogs(null)} />}
      </AnimatePresence>
    </div>
  );
}
