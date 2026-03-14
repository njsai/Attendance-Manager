import { useState } from "react";
import { useGetLeaveRequests, useCreateLeaveRequest } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, X } from "lucide-react";
import { format } from "date-fns";

export default function MyLeaves() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: leaves, isLoading } = useGetLeaveRequests({ employeeId: user?.id });
  const [isAddOpen, setIsAddOpen] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: "bg-emerald-100 text-emerald-800",
      rejected: "bg-rose-100 text-rose-800",
      pending: "bg-amber-100 text-amber-800",
    };
    const labels: Record<string, string> = {
      approved: "مقبول", rejected: "مرفوض", pending: "قيد الانتظار"
    };
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles[status]}`}>{labels[status]}</span>;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">سجل إجازاتي</h2>
          <p className="text-sm text-muted-foreground">تابع طلبات إجازاتك وحالتها.</p>
        </div>
        <button 
          onClick={() => setIsAddOpen(true)}
          className="flex items-center px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5 me-2" />
          طلب إجازة جديدة
        </button>
      </div>

      <div className="bg-card rounded-2xl shadow-lg shadow-black/5 border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-muted/50 text-muted-foreground text-sm font-semibold border-b border-border">
              <tr>
                <th className="px-6 py-4">النوع</th>
                <th className="px-6 py-4">من تاريخ</th>
                <th className="px-6 py-4">إلى تاريخ</th>
                <th className="px-6 py-4">الأيام</th>
                <th className="px-6 py-4">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : leaves?.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">لا يوجد طلبات سابقة</td></tr>
              ) : (
                leaves?.map(leave => (
                  <tr key={leave.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-bold">{leave.leaveType}</td>
                    <td className="px-6 py-4">{format(new Date(leave.startDate), 'yyyy-MM-dd')}</td>
                    <td className="px-6 py-4">{format(new Date(leave.endDate), 'yyyy-MM-dd')}</td>
                    <td className="px-6 py-4 font-bold">{leave.totalDays}</td>
                    <td className="px-6 py-4">{getStatusBadge(leave.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddOpen && <AddLeaveDialog onClose={() => setIsAddOpen(false)} onAdded={invalidate} />}
    </div>
  );
}

function AddLeaveDialog({ onClose, onAdded }: { onClose: () => void, onAdded: () => void }) {
  const createMut = useCreateLeaveRequest();
  const [formData, setFormData] = useState({
    leaveType: "annual" as any, startDate: "", endDate: "", reason: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMut.mutateAsync({ data: formData });
      onAdded();
      onClose();
    } catch (err: any) {
      alert("خطأ في تقديم الطلب");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h3 className="text-xl font-bold">طلب إجازة جديدة</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">نوع الإجازة</label>
            <select required value={formData.leaveType} onChange={e => setFormData({...formData, leaveType: e.target.value})} className="w-full p-3 rounded-xl border focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white">
              <option value="annual">سنوية</option>
              <option value="sick">مرضية</option>
              <option value="emergency">اضطرارية</option>
              <option value="unpaid">بدون راتب</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">من تاريخ</label>
              <input required type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full p-3 rounded-xl border focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">إلى تاريخ</label>
              <input required type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full p-3 rounded-xl border focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">السبب (اختياري)</label>
            <textarea value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full p-3 rounded-xl border focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none h-24" />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="submit" disabled={createMut.isPending} className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20">
              {createMut.isPending ? "جاري الإرسال..." : "تقديم الطلب"}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-muted text-muted-foreground py-3 rounded-xl font-bold hover:bg-muted/80">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}
