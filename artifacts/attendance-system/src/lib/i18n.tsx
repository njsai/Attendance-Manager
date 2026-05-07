import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Lang = "ar" | "en";

const translations = {
  ar: {
    // Navigation
    dashboard: "لوحة التحكم",
    employees: "الموظفين",
    branches: "الفروع",
    departments: "الأقسام والشفتات",
    attendance: "سجل الحضور",
    leaves: "الإجازات",
    reports: "التقارير",
    chat: "الدردشة",
    settings: "الإعدادات",
    home: "الرئيسية",
    myLeaves: "إجازاتي",
    logout: "تسجيل الخروج",

    // Roles
    admin: "مدير النظام",
    manager: "مشرف",
    employee: "موظف",
    superAdmin: "مدير النظام الرئيسي",

    // Attendance Status
    present: "حاضر",
    absent: "غائب",
    late: "متأخر",
    onLeave: "في إجازة",
    checkedOut: "انصرف",
    notCheckedIn: "لم يسجل",

    // Actions
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    edit: "تعديل",
    add: "إضافة",
    search: "بحث",
    filter: "تصفية",
    export: "تصدير",
    refresh: "تحديث",
    close: "إغلاق",
    confirm: "تأكيد",
    loading: "جاري التحميل...",
    saving: "جاري الحفظ...",

    // Attendance actions
    checkIn: "تسجيل الحضور",
    checkOut: "تسجيل الانصراف",
    breakStart: "بدء الاستراحة",
    breakEnd: "إنهاء الاستراحة",
    faceCheckIn: "حضور بالوجه",
    faceCheckOut: "انصراف بالوجه",

    // Common labels
    name: "الاسم",
    date: "التاريخ",
    time: "الوقت",
    status: "الحالة",
    notes: "ملاحظات",
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    address: "العنوان",
    city: "المدينة",
    department: "القسم",
    branch: "الفرع",
    shift: "الشفت",
    salary: "الراتب",
    role: "الصلاحية",

    // Dashboard
    todayAttendance: "سجل الحضور اليوم",
    presentToday: "حاضر اليوم",
    absentToday: "غائب",
    lateToday: "متأخر",
    onLeaveToday: "في إجازة",
    attendanceRate: "نسبة الحضور",
    pendingLeaves: "إجازات معلقة",
    totalEmployees: "إجمالي الموظفين",
    workingNow: "يعمل الآن",
    live: "مباشر",

    // Stats
    presentDays: "أيام الحضور",
    absentDays: "أيام الغياب",
    lateDays: "أيام التأخير",
    workingHours: "ساعات العمل",
    lateMinutes: "دقائق التأخير",
    overtimeMinutes: "دقائق الأوفر تايم",

    // Filters
    all: "الكل",
    active: "نشط",
    inactive: "غير نشط",

    // Messages
    success: "تمت العملية بنجاح",
    error: "حدث خطأ",
    noData: "لا توجد بيانات",
    noResults: "لا توجد نتائج",
    confirmDelete: "هل أنت متأكد من الحذف؟",

    // GPS
    locationMode: "وضع التحقق من الموقع",
    locationEnabled: "مفعّل — الموظف يجب أن يكون داخل نطاق فرعه",
    locationDisabled: "معطّل — لا يُطلب الموقع عند التسجيل",
    locationRequired: "يجب أن تكون داخل نطاق الفرع لتسجيل الحضور",
    gpsError: "لم نتمكن من تحديد موقعك. تحقق من أذونات الموقع.",
    outsideRadius: "أنت خارج النطاق المسموح به للفرع",

    // Backup
    backups: "النسخ الاحتياطية",
    createBackup: "إنشاء نسخة احتياطية",
    backupDate: "تاريخ النسخة",
    backupSize: "الحجم",
    backupCompany: "الشركة",
    restore: "استعادة",
    download: "تنزيل",
    backupCreated: "تم إنشاء النسخة الاحتياطية",
    backupDeleted: "تم حذف النسخة",

    // Reports
    exportExcel: "تصدير Excel",
    exportPDF: "تصدير PDF",
    exportCSV: "تصدير CSV",
    startDate: "من تاريخ",
    endDate: "إلى تاريخ",
    generateReport: "إنشاء التقرير",

    // Theme / Language
    darkMode: "وضع داكن",
    lightMode: "وضع فاتح",
    language: "اللغة",
    arabic: "عربي",
    english: "English",

    // Attendance board
    checkInTime: "وقت الحضور",
    checkOutTime: "وقت الانصراف",
    workDuration: "مدة العمل",
    delay: "تأخير",
    autoRefresh: "تحديث تلقائي كل دقيقة",

    // Leaves
    leaveType: "نوع الإجازة",
    leaveReason: "السبب",
    leaveStatus: "حالة الطلب",
    pending: "قيد المراجعة",
    approved: "مقبولة",
    rejected: "مرفوضة",
    annual: "سنوية",
    sick: "مرضية",
    emergency: "طارئة",
    unpaid: "بدون راتب",
    approve: "قبول",
    reject: "رفض",

    // Company
    company: "الشركة",
    companies: "الشركات",
    totalCompanies: "إجمالي الشركات",
    activeCompanies: "شركات نشطة",
    inactiveCompanies: "شركات موقوفة",
    createCompany: "إنشاء شركة",
    editCompany: "تعديل الشركة",
    deleteCompany: "حذف الشركة",

    // System
    systemTitle: "نظام الحضور",
    version: "الإصدار",
    copyright: "جميع الحقوق محفوظة",
  },
  en: {
    // Navigation
    dashboard: "Dashboard",
    employees: "Employees",
    branches: "Branches",
    departments: "Departments & Shifts",
    attendance: "Attendance Log",
    leaves: "Leave Requests",
    reports: "Reports",
    chat: "Chat",
    settings: "Settings",
    home: "Home",
    myLeaves: "My Leaves",
    logout: "Logout",

    // Roles
    admin: "System Admin",
    manager: "Supervisor",
    employee: "Employee",
    superAdmin: "Super Admin",

    // Attendance Status
    present: "Present",
    absent: "Absent",
    late: "Late",
    onLeave: "On Leave",
    checkedOut: "Checked Out",
    notCheckedIn: "Not Checked In",

    // Actions
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    search: "Search",
    filter: "Filter",
    export: "Export",
    refresh: "Refresh",
    close: "Close",
    confirm: "Confirm",
    loading: "Loading...",
    saving: "Saving...",

    // Attendance actions
    checkIn: "Check In",
    checkOut: "Check Out",
    breakStart: "Start Break",
    breakEnd: "End Break",
    faceCheckIn: "Face Check In",
    faceCheckOut: "Face Check Out",

    // Common labels
    name: "Name",
    date: "Date",
    time: "Time",
    status: "Status",
    notes: "Notes",
    phone: "Phone",
    email: "Email",
    address: "Address",
    city: "City",
    department: "Department",
    branch: "Branch",
    shift: "Shift",
    salary: "Salary",
    role: "Role",

    // Dashboard
    todayAttendance: "Today's Attendance",
    presentToday: "Present Today",
    absentToday: "Absent",
    lateToday: "Late",
    onLeaveToday: "On Leave",
    attendanceRate: "Attendance Rate",
    pendingLeaves: "Pending Leaves",
    totalEmployees: "Total Employees",
    workingNow: "Working Now",
    live: "Live",

    // Stats
    presentDays: "Present Days",
    absentDays: "Absent Days",
    lateDays: "Late Days",
    workingHours: "Working Hours",
    lateMinutes: "Late Minutes",
    overtimeMinutes: "Overtime Minutes",

    // Filters
    all: "All",
    active: "Active",
    inactive: "Inactive",

    // Messages
    success: "Operation successful",
    error: "An error occurred",
    noData: "No data available",
    noResults: "No results found",
    confirmDelete: "Are you sure you want to delete?",

    // GPS
    locationMode: "Attendance Location Mode",
    locationEnabled: "Enabled — Employee must be within their branch radius",
    locationDisabled: "Disabled — No location required for check-in",
    locationRequired: "You must be within your branch radius to check in",
    gpsError: "Could not determine your location. Check location permissions.",
    outsideRadius: "You are outside the allowed branch radius",

    // Backup
    backups: "Backups",
    createBackup: "Create Backup",
    backupDate: "Backup Date",
    backupSize: "Size",
    backupCompany: "Company",
    restore: "Restore",
    download: "Download",
    backupCreated: "Backup created successfully",
    backupDeleted: "Backup deleted",

    // Reports
    exportExcel: "Export Excel",
    exportPDF: "Export PDF",
    exportCSV: "Export CSV",
    startDate: "From Date",
    endDate: "To Date",
    generateReport: "Generate Report",

    // Theme / Language
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    language: "Language",
    arabic: "عربي",
    english: "English",

    // Attendance board
    checkInTime: "Check-in Time",
    checkOutTime: "Check-out Time",
    workDuration: "Work Duration",
    delay: "Delay",
    autoRefresh: "Auto-refresh every minute",

    // Leaves
    leaveType: "Leave Type",
    leaveReason: "Reason",
    leaveStatus: "Request Status",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    annual: "Annual",
    sick: "Sick",
    emergency: "Emergency",
    unpaid: "Unpaid",
    approve: "Approve",
    reject: "Reject",

    // Company
    company: "Company",
    companies: "Companies",
    totalCompanies: "Total Companies",
    activeCompanies: "Active Companies",
    inactiveCompanies: "Suspended Companies",
    createCompany: "Create Company",
    editCompany: "Edit Company",
    deleteCompany: "Delete Company",

    // System
    systemTitle: "Attendance System",
    version: "Version",
    copyright: "All rights reserved",
  },
} as const;

export type TranslationKey = keyof typeof translations.ar;

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
  dir: "rtl" | "ltr";
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("lang") as Lang) ?? "ar";
  });

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("lang", newLang);
    document.documentElement.setAttribute("lang", newLang);
    document.documentElement.setAttribute("dir", newLang === "ar" ? "rtl" : "ltr");
  };

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  }, [lang]);

  const t = (key: TranslationKey): string => {
    return translations[lang][key] as string;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir: lang === "ar" ? "rtl" : "ltr" }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
