import { useState, useEffect, useCallback } from "react";
import { MapPin, Clock, Search, Filter, UserCheck, AlertTriangle } from "lucide-react";

interface AttRecord {
  id: number; employeeId: number; employeeName: string; departmentName: string | null;
  date: string; checkInTime: string | null; checkOutTime: string | null;
  checkInLat: number | null; checkInLng: number | null;
  lateMinutes: number | null; workingHours: number | null; status: string;
}

function fmt12(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminAttendance() {
  const [records, setRecords] = useState<AttRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "present">("present");
  const BASE = import.meta.env.BASE_URL;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterDate) params.set("date", filterDate);
    const res = await fetch(`${BASE}api/attendance?${params}`, { credentials: "include" });
    const data = await res.json();
    setRecords(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [BASE, filterDate]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const filtered = records.filter(r => {
    const matchSearch = !search || r.employeeName?.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === "all" || (r.status === "present" || r.status === "late");
    return matchSearch && matchTab;
  });

  const presentCount = records.filter(r => r.status === "present" || r.status === "late").length;
  const lateCount = records.filter(r => r.status === "late").length;
  const totalHours = records.reduce((s, r) => s + (r.workingHours ?? 0), 0);

  const statusInfo = (s: string) => {
    if (s === "present") return { label: "حاضر", cls: "bg-green-900/30 text-green-400" };
    if (s === "late") return { label: "متأخر", cls: "bg-yellow-900/30 text-yellow-400" };
    if (s === "absent") return { label: "غائب", cls: "bg-red-900/30 text-red-400" };
    return { label: s, cls: "bg-gray-700 text-gray-400" };
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto" dir="rtl">
      <div>
        <h1 className="text-xl font-bold text-white">سجل الحضور والانصراف</h1>
        <p className="text-gray-400 text-sm">إدارة ومتابعة حضور الموظفين</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1a2234] border border-white/10 rounded-2xl p-3 text-center">
          <UserCheck size={18} className="text-green-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{presentCount}</p>
          <p className="text-xs text-gray-400">حاضر اليوم</p>
        </div>
        <div className="bg-[#1a2234] border border-white/10 rounded-2xl p-3 text-center">
          <AlertTriangle size={18} className="text-yellow-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{lateCount}</p>
          <p className="text-xs text-gray-400">متأخر</p>
        </div>
        <div className="bg-[#1a2234] border border-white/10 rounded-2xl p-3 text-center">
          <Clock size={18} className="text-blue-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{totalHours.toFixed(1)}</p>
          <p className="text-xs text-gray-400">ساعات إجمالية</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          className="bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none" />
        <div className="flex items-center gap-2 bg-gray-800 border border-white/10 rounded-xl px-3 py-2 flex-1 min-w-[140px]">
          <Search size={16} className="text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم..."
            className="bg-transparent text-white text-sm outline-none flex-1" />
        </div>
        <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
          {[{ k: "present", label: "الحاضرون" }, { k: "all", label: "الكل" }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t.k ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-[#1a2234] border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">لا توجد سجلات</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-right text-gray-400 font-medium px-4 py-3">الموظف</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">الحالة</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">الدخول</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">الخروج</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">ساعات</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">الموقع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(r => {
                  const st = statusInfo(r.status);
                  const hasLoc = r.checkInLat && r.checkInLng;
                  return (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{r.employeeName}</p>
                        <p className="text-gray-400 text-xs">{r.departmentName || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                        {(r.lateMinutes ?? 0) > 0 && <p className="text-yellow-400 text-xs mt-1">تأخير {r.lateMinutes}د</p>}
                      </td>
                      <td className="px-4 py-3 text-green-400 font-medium">{fmt12(r.checkInTime)}</td>
                      <td className="px-4 py-3 text-red-400 font-medium">{fmt12(r.checkOutTime)}</td>
                      <td className="px-4 py-3 text-blue-400">{r.workingHours ? r.workingHours.toFixed(1) + "h" : "—"}</td>
                      <td className="px-4 py-3">
                        {hasLoc ? (
                          <a href={`https://maps.google.com/?q=${r.checkInLat},${r.checkInLng}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs">
                            <MapPin size={12} />
                            <span>{r.checkInLat!.toFixed(3)}, {r.checkInLng!.toFixed(3)}</span>
                          </a>
                        ) : <span className="text-gray-500 text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
