import { useState } from "react";
import { useGetEmployees, useCreateEmployee, useToggleEmployeeStatus, EmployeeRole } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Edit, Trash2, Power, Search, Loader2, X } from "lucide-react";
import { format } from "date-fns";

export default function Employees() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { data: employees, isLoading } = useGetEmployees({ search: search || undefined });
  const toggleMut = useToggleEmployeeStatus({ mutation: { onSuccess: () => invalidate() } });
  
  const [isAddOpen, setIsAddOpen] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/employees"] });

  const handleToggle = async (id: number) => {
    await toggleMut.mutateAsync({ id });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">إدارة الموظفين</h2>
          <p className="text-sm text-muted-foreground">إضافة، تعديل، وحذف الموظفين وصلاحياتهم.</p>
        </div>
        <button 
          onClick={() => setIsAddOpen(true)}
          className="flex items-center px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5 me-2" />
          إضافة موظف
        </button>
      </div>

      <div className="bg-card rounded-2xl shadow-lg shadow-black/5 border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text"
              placeholder="ابحث بالاسم أو البريد..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-4 pr-10 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-muted/50 text-muted-foreground text-sm font-semibold border-b border-border">
              <tr>
                <th className="px-6 py-4">الاسم</th>
                <th className="px-6 py-4">اسم المستخدم</th>
                <th className="px-6 py-4">الدور</th>
                <th className="px-6 py-4">القسم</th>
                <th className="px-6 py-4">الحالة</th>
                <th className="px-6 py-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : employees?.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">لا يوجد موظفين</td></tr>
              ) : (
                employees?.map(emp => (
                  <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{emp.fullName}</div>
                      <div className="text-sm text-muted-foreground">{emp.jobTitle || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">{emp.username}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 capitalize">
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{emp.departmentName || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center w-max ${emp.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        <span className={`w-2 h-2 rounded-full me-2 ${emp.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                        {emp.isActive ? 'نشط' : 'موقوف'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleToggle(emp.id)}
                          className="p-2 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors"
                          title={emp.isActive ? "إيقاف" : "تفعيل"}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddOpen && <AddEmployeeDialog onClose={() => setIsAddOpen(false)} onAdded={invalidate} />}
    </div>
  );
}

function AddEmployeeDialog({ onClose, onAdded }: { onClose: () => void, onAdded: () => void }) {
  const createMut = useCreateEmployee();
  const [formData, setFormData] = useState({
    fullName: "", username: "", password: "", role: EmployeeRole.employee as any,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMut.mutateAsync({ data: formData });
      onAdded();
      onClose();
    } catch (err: any) {
      alert("خطأ في الإضافة");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h3 className="text-xl font-bold">إضافة موظف جديد</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">الاسم الكامل</label>
            <input required type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full p-3 rounded-xl border focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">اسم المستخدم</label>
            <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full p-3 rounded-xl border focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">كلمة المرور</label>
            <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3 rounded-xl border focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الدور</label>
            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-3 rounded-xl border focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white">
              <option value="employee">موظف</option>
              <option value="manager">مدير</option>
              <option value="admin">إدارة عليا</option>
            </select>
          </div>
          <div className="pt-4 flex gap-3">
            <button type="submit" disabled={createMut.isPending} className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90">
              {createMut.isPending ? "جاري الإضافة..." : "حفظ الموظف"}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-muted text-muted-foreground py-3 rounded-xl font-bold hover:bg-muted/80">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}
