import { useState, useEffect } from "react";
import { useCheckIn, useCheckOut, useStartBreak, useEndBreak, useGetTodayAttendance } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { LogIn, LogOut, Coffee, MapPin, AlertCircle, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: todayRecord, isLoading } = useGetTodayAttendance();
  const [time, setTime] = useState(new Date());
  
  const [locationError, setLocationError] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const checkInMut = useCheckIn({ mutation: { onSuccess: () => invalidate() } });
  const checkOutMut = useCheckOut({ mutation: { onSuccess: () => invalidate() } });
  const startBreakMut = useStartBreak({ mutation: { onSuccess: () => invalidate() } });
  const endBreakMut = useEndBreak({ mutation: { onSuccess: () => invalidate() } });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => setLocationError("يرجى تفعيل الموقع الجغرافي لتتمكن من تسجيل الحضور")
      );
    } else {
      setLocationError("المتصفح لا يدعم تحديد الموقع");
    }
  }, []);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
  };

  const handleAction = async (action: 'checkin' | 'checkout' | 'startbreak' | 'endbreak') => {
    if (!coords && (action === 'checkin' || action === 'checkout')) {
      alert("لم يتم تحديد الموقع الجغرافي");
      return;
    }

    try {
      if (action === 'checkin') await checkInMut.mutateAsync({ data: { latitude: coords?.lat, longitude: coords?.lng } });
      if (action === 'checkout') await checkOutMut.mutateAsync({ data: { latitude: coords?.lat, longitude: coords?.lng } });
      if (action === 'startbreak') await startBreakMut.mutateAsync();
      if (action === 'endbreak') await endBreakMut.mutateAsync();
    } catch (e: any) {
      alert(e.message || "حدث خطأ");
    }
  };

  const isCheckedIn = !!todayRecord?.checkInTime;
  const isCheckedOut = !!todayRecord?.checkOutTime;
  const isOnBreak = !!todayRecord?.breakStartTime && !todayRecord?.breakEndTime;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4 py-8">
        <h2 className="text-5xl font-bold text-foreground" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {format(time, 'HH:mm:ss')}
        </h2>
        <p className="text-xl text-muted-foreground font-medium">
          {format(time, 'EEEE، d MMMM yyyy', { locale: arSA })}
        </p>
      </div>

      {locationError && (
        <div className="flex items-center p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20">
          <AlertCircle className="w-5 h-5 me-3" />
          <p className="font-semibold">{locationError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-3xl p-8 shadow-xl shadow-black/5 border border-border text-center flex flex-col items-center justify-center">
          <div className="mb-6 flex gap-4">
            <button
              disabled={isCheckedIn || !!locationError || checkInMut.isPending}
              onClick={() => handleAction('checkin')}
              className={`flex flex-col items-center justify-center w-32 h-32 rounded-2xl shadow-lg transition-all duration-300 ${
                isCheckedIn 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60' 
                  : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:-translate-y-1 hover:shadow-emerald-500/25 active:translate-y-0'
              }`}
            >
              {isCheckedIn ? <CheckCircle2 className="w-10 h-10 mb-2" /> : <LogIn className="w-10 h-10 mb-2" />}
              <span className="font-bold text-lg">حضور</span>
            </button>

            <button
              disabled={!isCheckedIn || isCheckedOut || !!locationError || checkOutMut.isPending}
              onClick={() => handleAction('checkout')}
              className={`flex flex-col items-center justify-center w-32 h-32 rounded-2xl shadow-lg transition-all duration-300 ${
                !isCheckedIn || isCheckedOut 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60' 
                  : 'bg-rose-500 text-white hover:bg-rose-600 hover:-translate-y-1 hover:shadow-rose-500/25 active:translate-y-0'
              }`}
            >
              {isCheckedOut ? <CheckCircle2 className="w-10 h-10 mb-2" /> : <LogOut className="w-10 h-10 mb-2" />}
              <span className="font-bold text-lg">انصراف</span>
            </button>
          </div>

          <div className="flex gap-4 w-full justify-center">
            {!isOnBreak ? (
              <button
                disabled={!isCheckedIn || isCheckedOut || startBreakMut.isPending}
                onClick={() => handleAction('startbreak')}
                className="flex items-center px-6 py-3 rounded-xl bg-amber-100 text-amber-700 font-bold hover:bg-amber-200 transition-colors disabled:opacity-50"
              >
                <Coffee className="w-5 h-5 me-2" />
                بدء استراحة
              </button>
            ) : (
              <button
                disabled={endBreakMut.isPending}
                onClick={() => handleAction('endbreak')}
                className="flex items-center px-6 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/25"
              >
                <Coffee className="w-5 h-5 me-2" />
                إنهاء استراحة
              </button>
            )}
          </div>
        </div>

        <div className="bg-card rounded-3xl p-6 shadow-xl shadow-black/5 border border-border overflow-hidden flex flex-col">
          <h3 className="text-lg font-bold text-foreground flex items-center mb-4">
            <MapPin className="w-5 h-5 me-2 text-primary" />
            موقعي الحالي
          </h3>
          <div className="flex-1 rounded-2xl overflow-hidden bg-gray-100 relative min-h-[250px]">
            {coords ? (
              <iframe 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                scrolling="no" 
                marginHeight={0} 
                marginWidth={0} 
                src={`https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=16&output=embed`}
                className="absolute inset-0"
              ></iframe>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-medium">
                جاري تحديد الموقع...
              </div>
            )}
          </div>
        </div>
      </div>

      {todayRecord && (
        <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10 flex flex-wrap gap-8 justify-center">
          <div className="text-center">
            <p className="text-sm text-primary/60 font-medium">وقت الحضور</p>
            <p className="text-xl font-bold text-primary">{todayRecord.checkInTime ? format(new Date(todayRecord.checkInTime), 'HH:mm') : '--:--'}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-primary/60 font-medium">وقت الانصراف</p>
            <p className="text-xl font-bold text-primary">{todayRecord.checkOutTime ? format(new Date(todayRecord.checkOutTime), 'HH:mm') : '--:--'}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-primary/60 font-medium">ساعات العمل</p>
            <p className="text-xl font-bold text-primary">{todayRecord.workingHours ? todayRecord.workingHours.toFixed(2) : '0.00'}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-primary/60 font-medium">الحالة</p>
            <p className="text-xl font-bold text-primary capitalize">{todayRecord.status}</p>
          </div>
        </div>
      )}
    </div>
  );
}
