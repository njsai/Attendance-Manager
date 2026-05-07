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
    payroll: "الرواتب",

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
    working: "جارٍ العمل",
    checkedOutStatus: "انصرف",
    notCheckedInYet: "لم يسجل بعد",

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
    loadingData: "جاري تحميل البيانات...",

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
    days: "أيام",
    minutes: "دقيقة",
    hoursUnit: "ساعة",
    minuteShort: "د",

    // Dashboard
    todayAttendance: "سجل الحضور اليوم",
    todayAttendanceBoard: "سجل الحضور اليوم",
    presentToday: "حاضر اليوم",
    absentToday: "غائب",
    lateToday: "متأخر",
    onLeaveToday: "في إجازة",
    attendanceRate: "نسبة الحضور",
    pendingLeaves: "إجازات معلقة",
    totalEmployees: "إجمالي الموظفين",
    workingNow: "يعمل الآن",
    live: "مباشر",
    lastUpdated: "آخر تحديث",
    details: "التفاصيل",
    autoRefreshMinute: "تحديث تلقائي كل دقيقة",
    systemOnline: "النظام يعمل",
    noEmployees: "لا يوجد موظفون",
    noPresentToday: "لا يوجد حاضرون اليوم",
    noAbsentToday: "لا يوجد غائبون اليوم",
    noLateToday: "لا يوجد متأخرون اليوم",
    noOnLeaveToday: "لا يوجد في إجازة اليوم",
    noPendingLeaves: "لا توجد إجازات معلقة",

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
    failedLoad: "فشل تحميل البيانات",
    connectionError: "خطأ في الاتصال",
    checkInSuccess: "تم تسجيل الحضور بنجاح ✓",
    checkOutSuccess: "تم تسجيل الانصراف بنجاح ✓",
    faceNotRecognized: "لم يتم التعرف على الوجه — حاول مجدداً أو استخدم الدخول اليدوي",

    // GPS
    locationMode: "وضع التحقق من الموقع",
    locationEnabled: "مفعّل — الموظف يجب أن يكون داخل نطاق فرعه",
    locationDisabled: "معطّل — لا يُطلب الموقع عند التسجيل",
    locationRequired: "يجب أن تكون داخل نطاق الفرع لتسجيل الحضور",
    gpsError: "لم نتمكن من تحديد موقعك. تحقق من أذونات الموقع.",
    outsideRadius: "أنت خارج النطاق المسموح به للفرع",
    locationLabel: "الموقع:",

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
    workDurationLabel: "مدة الدوام",
    delay: "تأخير",
    autoRefresh: "تحديث تلقائي كل دقيقة",
    entryTime: "وقت الدخول:",
    exitTime: "وقت الخروج",
    lateBy: "تأخير",
    recentRecord: "السجل الأخير",
    entryShort: "دخول:",
    exitShort: "خروج:",
    hoursShort: "ساعات",
    notCheckedInToday: "لم تسجل حضورك اليوم بعد",
    todayAttendanceCard: "حضور اليوم",
    faceNotRegistered: "لم يتم تسجيل بصمة وجهك بعد — تواصل مع المدير لتسجيلها",

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
    other: "أخرى",
    approve: "قبول",
    reject: "رفض",
    leaveRequests: "طلبات الإجازة",
    reviewLeaves: "مراجعة واعتماد إجازات الموظفين",
    searchByEmployee: "بحث باسم الموظف...",
    noLeaveRequests: "لا توجد طلبات إجازة",
    approveLeave: "قبول",
    rejectLeave: "رفض",
    rejectionReason: "سبب الرفض:",
    confirmApproveLeave: "تأكيد قبول طلب الإجازة؟",
    rejectionReasonPrompt: "سبب الرفض (اختياري):",
    failedLoadLeaves: "فشل تحميل الإجازات",
    approveSuccess: "تم قبول الإجازة",
    rejectSuccess: "تم رفض الإجازة",
    failedAction: "فشل تنفيذ العملية",
    pendingStatus: "قيد الانتظار",

    // Employee management
    addEmployee: "إضافة موظف",
    editEmployee: "تعديل موظف",
    addNewEmployee: "إضافة موظف جديد",
    manageEmployees: "إدارة الموظفين",
    activeStatus: "نشط",
    suspendedStatus: "موقوف",
    enrollFace: "تسجيل بصمة",
    faceEnrolled: "بصمة مسجلة ✓",
    allBranches: "كل الفروع",
    allStatuses: "كل الحالات",
    noBranch: "-- بدون فرع --",
    noDepartment: "-- بدون قسم --",
    noShift: "-- بدون وردية --",
    fullName: "الاسم الكامل",
    usernameField: "اسم المستخدم",
    passwordField: "كلمة المرور",
    newPassword: "كلمة مرور جديدة",
    jobTitle: "المسمى الوظيفي",
    suspendEmployee: "إيقاف",
    activateEmployee: "تفعيل",
    deleteEmployee: "حذف",
    confirmDeleteEmployee: "هل تريد حذف هذا الموظف؟",
    failedSave: "فشل",
    noEmployeesFound: "لا يوجد موظفون",

    // Manager dashboard
    welcome: "مرحباً",
    myAttendanceTab: "حضوري",
    teamTab: "الفريق",
    teamAttendanceToday: "حضور الفريق اليوم",
    noRecordsToday: "لا توجد سجلات اليوم",

    // Login
    systemName: "نظام الحضور والانصراف",
    enterCredentials: "أدخل بياناتك للدخول",
    enterUsername: "أدخل اسم المستخدم",
    passwordPlaceholder: "••••••••",
    loggingIn: "جاري الدخول...",
    loginBtn: "دخول",
    forgotCredentials: "تواصل مع مدير النظام إذا نسيت بياناتك",
    superAdminLoginLink: "دخول مدير النظام العام →",
    invalidCredentials: "اسم المستخدم أو الرمز غير صحيح",
    companyInactive: "تم إيقاف شركتك من قِبل مزود الخدمة، يرجى التواصل مع الدعم",
    connectionTimeout: "انتهت مهلة الاتصال بالخادم، تحقق من الشبكة وحاول مرة أخرى",

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
    payroll: "Payroll",

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
    working: "Working",
    checkedOutStatus: "Checked Out",
    notCheckedInYet: "Not Checked In",

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
    loadingData: "Loading data...",

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
    days: "days",
    minutes: "minutes",
    hoursUnit: "hrs",
    minuteShort: "m",

    // Dashboard
    todayAttendance: "Today's Attendance",
    todayAttendanceBoard: "Today's Attendance Board",
    presentToday: "Present Today",
    absentToday: "Absent",
    lateToday: "Late",
    onLeaveToday: "On Leave",
    attendanceRate: "Attendance Rate",
    pendingLeaves: "Pending Leaves",
    totalEmployees: "Total Employees",
    workingNow: "Working Now",
    live: "Live",
    lastUpdated: "Last updated",
    details: "Details",
    autoRefreshMinute: "Auto-refresh every minute",
    systemOnline: "System Online",
    noEmployees: "No employees",
    noPresentToday: "No present employees today",
    noAbsentToday: "No absent employees today",
    noLateToday: "No late employees today",
    noOnLeaveToday: "No one on leave today",
    noPendingLeaves: "No pending leaves",

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
    failedLoad: "Failed to load data",
    connectionError: "Connection error",
    checkInSuccess: "Attendance recorded successfully ✓",
    checkOutSuccess: "Departure recorded successfully ✓",
    faceNotRecognized: "Face not recognized — try again or use manual check-in",

    // GPS
    locationMode: "Attendance Location Mode",
    locationEnabled: "Enabled — Employee must be within their branch radius",
    locationDisabled: "Disabled — No location required for check-in",
    locationRequired: "You must be within your branch radius to check in",
    gpsError: "Could not determine your location. Check location permissions.",
    outsideRadius: "You are outside the allowed branch radius",
    locationLabel: "Location:",

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
    workDurationLabel: "Work Duration",
    delay: "Delay",
    autoRefresh: "Auto-refresh every minute",
    entryTime: "Entry time:",
    exitTime: "Exit time",
    lateBy: "Late by",
    recentRecord: "Recent Records",
    entryShort: "In:",
    exitShort: "Out:",
    hoursShort: "Hours",
    notCheckedInToday: "You haven't checked in today yet",
    todayAttendanceCard: "Today's Attendance",
    faceNotRegistered: "Your face is not registered yet — contact your manager",

    // Leaves
    leaveType: "Leave Type",
    leaveReason: "Reason",
    leaveStatus: "Request Status",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    annual: "Annual",
    sick: "Sick Leave",
    emergency: "Emergency",
    unpaid: "Unpaid",
    other: "Other",
    approve: "Approve",
    reject: "Reject",
    leaveRequests: "Leave Requests",
    reviewLeaves: "Review and approve employee leave requests",
    searchByEmployee: "Search by employee name...",
    noLeaveRequests: "No leave requests",
    approveLeave: "Approve",
    rejectLeave: "Reject",
    rejectionReason: "Rejection Reason:",
    confirmApproveLeave: "Confirm approving this leave request?",
    rejectionReasonPrompt: "Rejection reason (optional):",
    failedLoadLeaves: "Failed to load leaves",
    approveSuccess: "Leave approved successfully",
    rejectSuccess: "Leave rejected",
    failedAction: "Operation failed",
    pendingStatus: "Pending Review",

    // Employee management
    addEmployee: "Add Employee",
    editEmployee: "Edit Employee",
    addNewEmployee: "Add New Employee",
    manageEmployees: "Manage Employees",
    activeStatus: "Active",
    suspendedStatus: "Suspended",
    enrollFace: "Enroll Face",
    faceEnrolled: "Face Enrolled ✓",
    allBranches: "All Branches",
    allStatuses: "All Statuses",
    noBranch: "-- No Branch --",
    noDepartment: "-- No Department --",
    noShift: "-- No Shift --",
    fullName: "Full Name",
    usernameField: "Username",
    passwordField: "Password",
    newPassword: "New Password",
    jobTitle: "Job Title",
    suspendEmployee: "Suspend",
    activateEmployee: "Activate",
    deleteEmployee: "Delete",
    confirmDeleteEmployee: "Are you sure you want to delete this employee?",
    failedSave: "Failed to save",
    noEmployeesFound: "No employees found",

    // Manager dashboard
    welcome: "Welcome",
    myAttendanceTab: "My Attendance",
    teamTab: "Team",
    teamAttendanceToday: "Team Attendance Today",
    noRecordsToday: "No records today",

    // Login
    systemName: "Attendance Management System",
    enterCredentials: "Enter your credentials to sign in",
    enterUsername: "Enter your username",
    passwordPlaceholder: "••••••••",
    loggingIn: "Signing in...",
    loginBtn: "Sign In",
    forgotCredentials: "Contact your system admin if you forgot your credentials",
    superAdminLoginLink: "Super Admin Login →",
    invalidCredentials: "Invalid username or password",
    companyInactive: "Your company has been suspended. Please contact support.",
    connectionTimeout: "Connection timeout. Check your network and try again.",

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
  locale: string;
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
    <I18nContext.Provider value={{
      lang,
      setLang,
      t,
      dir: lang === "ar" ? "rtl" : "ltr",
      locale: lang === "ar" ? "ar-IQ" : "en-US",
    }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
