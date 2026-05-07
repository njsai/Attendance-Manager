import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, Users, TrendingDown, Clock, Plus, Search, Filter,
  ChevronDown, ChevronUp, Printer, Download, X, Check, AlertCircle,
  Loader2, Zap, Eye, Trash2, Edit, History, CheckCircle, XCircle,
  BarChart3, Banknote, ArrowUpRight, ArrowDownRight, RefreshCw
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BASE = import.meta.env.BASE_URL;
const api = (path: string) => `${BASE}api/payroll${path}`;

const MONTHS = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"
];
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  unpaid:  { label: "غير مدفوع",  color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
  paid:    { label: "مدفوع",      color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  partial: { label: "جزئي",       color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
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

// ─── Slip Component ───────────────────────────────────────────────────────────
function PayrollSlip({ record, onClose }: { record: PayrollRecord; onClose: () => void }) {
  const slipRef = useRef<HTMLDivElement>(null);

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
        .badge{display:inline-block;padding:3px 10px;border-radius:4px;font-size:12px}
        .paid{background:#d1fae5;color:#065f46}
        .unpaid{background:#fee2e2;color:#991b1b}
        .partial{background:#fef3c7;color:#92400e}
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
      <div class="row"><span>حالة الراتب:</span><span class="badge ${record.status}">${STATUS_MAP[record.status]?.label}</span></div>
      ${record.paidAt ? `<div class="row"><span>تاريخ الصرف:</span><span>${new Date(record.paidAt).toLocaleDateString("ar-IQ")}</span></div>` : ""}
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h2 className="text-white font-bold text-lg">كشف الراتب</h2>
            <p className="text-slate-400 text-sm">{record.employeeName} — {MONTHS[record.month - 1]} {record.year}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-all">
              <Printer className="w-3.5 h-3.5" /> طباعة
            </button>
            <button onClick={handlePDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-all">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto" ref={slipRef}>
          {/* Info */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ["المسمى الوظيفي", record.jobTitle ?? "-"],
              ["القسم", record.departmentName ?? "-"],
              ["أيام الحضور", `${record.workDays} يوم`],
              ["أيام الغياب", `${record.absentDays} يوم`],
              ["تأخير", `${record.lateMinutes} دقيقة`],
              ["أوفر تايم", `${record.overtimeMinutes} دقيقة`],
            ].map(([k, v]) => (
              <div key={k} className="bg-white/5 rounded-xl p-3">
                <p className="text-slate-400 text-xs mb-0.5">{k}</p>
                <p className="text-white text-sm font-semibold">{v}</p>
              </div>
            ))}
          </div>
          {/* Earnings */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
            <h3 className="text-emerald-400 text-xs font-bold uppercase mb-3">المستحقات</h3>
            <div className="space-y-2">
              {[
                ["الراتب الأساسي", record.basicSalary],
                ["الحوافز والمكافآت", record.incentives],
                ["أجر الأوفر تايم", record.overtimePay],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between text-sm">
                  <span className="text-slate-300">{k as string}</span>
                  <span className="text-emerald-400 font-medium">+{fmt(v as number, record.currency)}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Deductions */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <h3 className="text-red-400 text-xs font-bold uppercase mb-3">الخصومات</h3>
            <div className="space-y-2">
              {[
                ["خصومات أخرى", record.deductions],
                ["سلف", record.advances],
                ["خصم التأخير", record.lateDeduction],
                ["خصم الغياب", record.absenceDeduction],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between text-sm">
                  <span className="text-slate-300">{k as string}</span>
                  <span className={(v as number) > 0 ? "text-red-400 font-medium" : "text-slate-500"}>
                    {(v as number) > 0 ? `-${fmt(v as number, record.currency)}` : "٠"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Net */}
          <div className="bg-indigo-600/20 border border-indigo-500/40 rounded-xl p-4 flex items-center justify-between">
            <span className="text-white font-bold text-lg">صافي الراتب</span>
            <span className="text-indigo-300 font-black text-xl">{fmt(record.netSalary, record.currency)}</span>
          </div>
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">حالة الصرف:</span>
            <span className={`text-xs px-3 py-1 rounded-full font-bold border ${STATUS_MAP[record.status]?.bg} ${STATUS_MAP[record.status]?.color}`}>
              {STATUS_MAP[record.status]?.label}
            </span>
          </div>
          {record.paidAt && (
            <p className="text-slate-400 text-xs text-center">تاريخ الصرف: {new Date(record.paidAt).toLocaleDateString("ar-IQ", { year: "numeric", month: "long", day: "numeric" })}</p>
          )}
          {record.notes && (
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-slate-400 text-xs mb-1">ملاحظات</p>
              <p className="text-slate-300 text-sm">{record.notes}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ record, onClose, onSave }: { record: PayrollRecord; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    basicSalary: record.basicSalary,
    incentives: record.incentives,
    overtimePay: record.overtimePay,
    deductions: record.deductions,
    advances: record.advances,
    lateDeduction: record.lateDeduction,
    absenceDeduction: record.absenceDeduction,
    notes: record.notes ?? "",
    currency: record.currency,
  });
  const [saving, setSaving] = useState(false);
  const net = form.basicSalary + form.incentives + form.overtimePay - form.deductions - form.advances - form.lateDeduction - form.absenceDeduction;

  const save = async () => {
    setSaving(true);
    try {
      await fetch(api(`/${record.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      onSave();
      onClose();
    } finally { setSaving(false); }
  };

  const field = (label: string, key: keyof typeof form, type = "number") => (
    <div>
      <label className="text-slate-400 text-xs mb-1 block">{label}</label>
      <input
        type={type}
        value={form[key] as any}
        onChange={e => setForm(f => ({ ...f, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }))}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h2 className="text-white font-bold text-lg">تعديل الراتب</h2>
            <p className="text-slate-400 text-sm">{record.employeeName} — {MONTHS[record.month - 1]} {record.year}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {field("الراتب الأساسي", "basicSalary")}
            {field("الحوافز والمكافآت", "incentives")}
            {field("أجر الأوفر تايم", "overtimePay")}
            {field("خصومات أخرى", "deductions")}
            {field("السلف", "advances")}
            {field("خصم التأخير", "lateDeduction")}
            {field("خصم الغياب", "absenceDeduction")}
            <div>
              <label className="text-slate-400 text-xs mb-1 block">العملة</label>
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500">
                <option value="IQD">دينار عراقي (IQD)</option>
                <option value="USD">دولار أمريكي (USD)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">ملاحظات</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 resize-none" />
          </div>
          <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-xl p-3 flex justify-between items-center">
            <span className="text-slate-300 text-sm font-semibold">صافي الراتب المحسوب</span>
            <span className={`text-lg font-black ${net < 0 ? "text-red-400" : "text-indigo-300"}`}>{fmt(net, form.currency)}</span>
          </div>
        </div>
        <div className="p-4 border-t border-white/10 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors">إلغاء</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            حفظ التعديلات
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Add Modal ────────────────────────────────────────────────────────────────
function AddModal({ employees, onClose, onSave, month, year }: {
  employees: Employee[]; onClose: () => void; onSave: () => void; month: number; year: number;
}) {
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

  // Auto-fill basic salary from employee
  useEffect(() => {
    if (form.employeeId) {
      const emp = employees.find(e => e.id === parseInt(form.employeeId));
      if (emp?.salary) setForm(f => ({ ...f, basicSalary: String(emp.salary!) }));
    }
  }, [form.employeeId, employees]);

  const save = async () => {
    if (!form.employeeId) { setError("اختر الموظف"); return; }
    setSaving(true); setError("");
    try {
      const r = await fetch(api("/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, employeeId: parseInt(form.employeeId) }),
      });
      if (!r.ok) { const d = await r.json(); setError(d.message); return; }
      onSave(); onClose();
    } finally { setSaving(false); }
  };

  const field = (label: string, key: keyof typeof form) => (
    <div>
      <label className="text-slate-400 text-xs mb-1 block">{label}</label>
      <input type="number" min="0" value={form[key] as string}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-bold text-lg">إضافة راتب جديد</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
          {error && <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3">
              <label className="text-slate-400 text-xs mb-1 block">الموظف</label>
              <select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500">
                <option value="">— اختر الموظف —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">الشهر</label>
              <select value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500">
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">السنة</label>
              <select value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500">
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">العملة</label>
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500">
                <option value="IQD">IQD دينار عراقي</option>
                <option value="USD">USD دولار</option>
              </select>
            </div>
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
            <label className="text-slate-400 text-xs mb-1 block">ملاحظات</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 resize-none" />
          </div>
          <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-xl p-3 flex justify-between items-center">
            <span className="text-slate-300 text-sm font-semibold">صافي الراتب المحسوب</span>
            <span className={`text-lg font-black ${net < 0 ? "text-red-400" : "text-indigo-300"}`}>{fmt(net, form.currency)}</span>
          </div>
        </div>
        <div className="p-4 border-t border-white/10 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors">إلغاء</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            إضافة الراتب
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Generate Modal ───────────────────────────────────────────────────────────
function GenerateModal({ onClose, onSave, month, year }: { onClose: () => void; onSave: () => void; month: number; year: number }) {
  const [selMonth, setSelMonth] = useState(month);
  const [selYear, setSelYear] = useState(year);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; message: string } | null>(null);

  const generate = async () => {
    setLoading(true);
    try {
      const r = await fetch(api("/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ month: selMonth, year: selYear }),
      });
      const d = await r.json();
      setResult(d);
      if (r.ok) onSave();
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h2 className="text-white font-bold text-lg">توليد رواتب جماعية</h2>
            <p className="text-slate-400 text-sm">يتم إنشاء رواتب جميع الموظفين النشطين تلقائياً</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">الشهر</label>
              <select value={selMonth} onChange={e => setSelMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500">
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">السنة</label>
              <select value={selYear} onChange={e => setSelYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500">
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-300 text-xs">سيتم حساب التأخير والغياب والأوفر تايم تلقائياً من سجلات الحضور. الرواتب الموجودة مسبقاً لن تُحدَّث.</p>
          </div>
          {result && (
            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${result.created > 0 ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border border-amber-500/20 text-amber-400"}`}>
              <CheckCircle className="w-4 h-4 shrink-0" />
              {result.message}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-white/10 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors">إغلاق</button>
          <button onClick={generate} disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            توليد الرواتب
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Logs Modal ───────────────────────────────────────────────────────────────
function LogsModal({ payrollId, employeeName, onClose }: { payrollId: number; employeeName: string; onClose: () => void }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(api(`/${payrollId}/logs`), { credentials: "include" })
      .then(r => r.json()).then(d => setLogs(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, [payrollId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h2 className="text-white font-bold text-lg">سجل التعديلات</h2>
            <p className="text-slate-400 text-sm">{employeeName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
          ) : logs.length === 0 ? (
            <p className="text-center text-slate-400 py-8">لا توجد تعديلات مسجّلة</p>
          ) : (
            <div className="space-y-2">
              {logs.map(l => (
                <div key={l.id} className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium">{fmtField(l.fieldName)}</span>
                    <span className="text-slate-500 text-xs">{new Date(l.changedAt).toLocaleString("ar-IQ")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-red-400 line-through">{l.oldValue || "—"}</span>
                    <span className="text-slate-500">→</span>
                    <span className="text-emerald-400">{l.newValue || "—"}</span>
                  </div>
                  {l.changedByName && <p className="text-slate-500 text-xs mt-1">بواسطة: {l.changedByName}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Payroll() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [empFilter, setEmpFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showSlip, setShowSlip] = useState<PayrollRecord | null>(null);
  const [showEdit, setShowEdit] = useState<PayrollRecord | null>(null);
  const [showLogs, setShowLogs] = useState<PayrollRecord | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: String(month), year: String(year) });
      if (empFilter) params.set("employeeId", empFilter);
      if (statusFilter) params.set("status", statusFilter);
      const [recs, st] = await Promise.all([
        fetch(`${api("?")}${params}`, { credentials: "include" }).then(r => r.json()),
        fetch(`${api("/stats?")}${params}`, { credentials: "include" }).then(r => r.json()),
      ]);
      setRecords(Array.isArray(recs) ? recs : []);
      setStats(st);
    } finally { setLoading(false); }
  }, [month, year, empFilter, statusFilter]);

  useEffect(() => {
    fetch(`${BASE}api/employees`, { credentials: "include" })
      .then(r => r.json()).then(d => setEmployees(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handlePay = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "paid" ? "unpaid" : "paid";
    setPayingId(id);
    try {
      await fetch(api(`/${id}/pay`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl border backdrop-blur-md ${toast.ok ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" : "bg-red-500/20 border-red-500/30 text-red-300"}`}>
            {toast.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">الرواتب</h1>
          <p className="text-slate-400 text-sm mt-0.5">إدارة وصرف رواتب الموظفين — {MONTHS[month - 1]} {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGenerate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/30">
            <Zap className="w-4 h-4" /> توليد جماعي
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/30">
            <Plus className="w-4 h-4" /> إضافة راتب
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "إجمالي الرواتب", value: fmt(stats.totalNet, currency), icon: Banknote, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
            { label: "مجموع المدفوع", value: fmt(stats.totalPaid, currency), icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { label: "إجمالي الخصومات", value: fmt(stats.totalDeductions + stats.totalAdvances, currency), icon: ArrowDownRight, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
            { label: "رواتب غير مدفوعة", value: `${stats.unpaidCount} راتب`, icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-400 text-xs">{s.label}</p>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex-1 min-w-40">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث باسم الموظف..."
              className="bg-transparent text-white text-sm outline-none w-full placeholder-slate-500" />
          </div>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={empFilter} onChange={e => setEmpFilter(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 max-w-44">
            <option value="">جميع الموظفين</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500">
            <option value="">كل الحالات</option>
            <option value="unpaid">غير مدفوع</option>
            <option value="paid">مدفوع</option>
            <option value="partial">جزئي</option>
          </select>
          <button onClick={fetchAll} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors" title="تحديث">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Banknote className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400">لا توجد سجلات رواتب لهذه الفترة</p>
            <button onClick={() => setShowGenerate(true)}
              className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1 mx-auto transition-colors">
              <Zap className="w-3.5 h-3.5" /> توليد رواتب جماعية
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {["الموظف", "القسم", "الراتب الأساسي", "الحوافز", "الأوفر تايم", "الخصومات", "صافي الراتب", "الحضور", "الحالة", "إجراءات"].map(h => (
                    <th key={h} className="text-right text-slate-400 text-xs font-semibold px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((r, idx) => {
                    const st = STATUS_MAP[r.status] ?? STATUS_MAP.unpaid;
                    return (
                      <motion.tr key={r.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-white font-semibold">{r.employeeName}</p>
                          {r.jobTitle && <p className="text-slate-500 text-xs">{r.jobTitle}</p>}
                        </td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{r.departmentName ?? "—"}</td>
                        <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{fmt(r.basicSalary, r.currency)}</td>
                        <td className="px-4 py-3 text-emerald-400 whitespace-nowrap">{r.incentives > 0 ? `+${fmt(r.incentives, r.currency)}` : "—"}</td>
                        <td className="px-4 py-3 text-blue-400 whitespace-nowrap">{r.overtimePay > 0 ? `+${fmt(r.overtimePay, r.currency)}` : "—"}</td>
                        <td className="px-4 py-3 text-red-400 whitespace-nowrap">
                          {(r.deductions + r.advances + r.lateDeduction + r.absenceDeduction) > 0
                            ? `-${fmt(r.deductions + r.advances + r.lateDeduction + r.absenceDeduction, r.currency)}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-white font-black text-base">{fmt(r.netSalary, r.currency)}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                          <span title="حضور">✓{r.workDays}</span>
                          {r.absentDays > 0 && <span className="text-red-400 mr-1" title="غياب"> ✗{r.absentDays}</span>}
                          {r.lateMinutes > 0 && <span className="text-amber-400 mr-1" title="تأخير"> ⏱{r.lateMinutes}د</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-bold border ${st.bg} ${st.color}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setShowSlip(r)} title="كشف الراتب"
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setShowEdit(r)} title="تعديل"
                              className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handlePay(r.id, r.status)} disabled={payingId === r.id} title={r.status === "paid" ? "إلغاء الدفع" : "تسجيل كمدفوع"}
                              className={`p-1.5 rounded-lg transition-colors ${r.status === "paid" ? "text-amber-400 hover:bg-amber-500/10" : "text-emerald-400 hover:bg-emerald-500/10"}`}>
                              {payingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => setShowLogs(r)} title="سجل التعديلات"
                              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/10 rounded-lg transition-colors">
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(r.id)} disabled={deletingId === r.id} title="حذف"
                              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                              {deletingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
              <tfoot>
                <tr className="border-t border-white/20 bg-white/5">
                  <td colSpan={6} className="px-4 py-3 text-slate-300 font-bold text-sm">المجموع ({filtered.length} موظف)</td>
                  <td className="px-4 py-3 text-white font-black">{fmt(filtered.reduce((s, r) => s + r.netSalary, 0), currency)}</td>
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
