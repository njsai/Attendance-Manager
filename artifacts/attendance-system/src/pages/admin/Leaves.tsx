import { useGetLeaveRequests, useApproveLeave, useRejectLeave } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

export default function AdminLeaves() {
  const queryClient = useQueryClient();
  const { data: leaves, isLoading } = useGetLeaveRequests({ status: "pending" as any });
  
  const approveMut = useApproveLeave({ mutation: { onSuccess: () => invalidate() } });
  const rejectMut = useRejectLeave({ mutation: { onSuccess: () => invalidate() } });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/leaves"] });

  const handleApprove = async (id: number) => {
    if(confirm("تأكيد قبول الإجازة؟")) await approveMut.mutateAsync({ id });
  };

  const handleReject = async (id: number) => {
    const reason = prompt("سبب الرفض:");
    if(reason !== null) await rejectMut.mutateAsync({ id, data: { reason } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">طلبات الإجازة المعلقة</h2>
        <p className="text-sm text-muted-foreground">قم بمراجعة واعتماد إجازات الموظفين.</p>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : leaves?.length === 0 ? (
          <div className="text-center p-12 bg-card rounded-2xl border border-border text-muted-foreground">لا توجد طلبات معلقة</div>
        ) : (
          leaves?.map(leave => (
            <div key={leave.id} className="bg-card rounded-2xl p-6 shadow-md border border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold">{leave.employeeName}</h3>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">{leave.leaveType}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  المدة: <span className="font-bold text-foreground">{leave.totalDays} أيام</span>
                  {' '}من <span className="font-bold text-foreground">{format(new Date(leave.startDate), 'yyyy-MM-dd')}</span>
                  {' '}إلى <span className="font-bold text-foreground">{format(new Date(leave.endDate), 'yyyy-MM-dd')}</span>
                </p>
                {leave.reason && <p className="text-sm text-muted-foreground mt-2 bg-muted p-3 rounded-lg border">السبب: {leave.reason}</p>}
              </div>
              
              <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                <button 
                  onClick={() => handleApprove(leave.id)}
                  disabled={approveMut.isPending}
                  className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
                >
                  <Check className="w-5 h-5 me-2" />
                  قبول
                </button>
                <button 
                  onClick={() => handleReject(leave.id)}
                  disabled={rejectMut.isPending}
                  className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 bg-rose-100 text-rose-700 rounded-xl font-bold hover:bg-rose-200 transition-colors"
                >
                  <X className="w-5 h-5 me-2" />
                  رفض
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
