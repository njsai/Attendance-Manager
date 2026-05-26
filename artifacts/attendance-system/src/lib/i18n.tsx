import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./auth";

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
    myLoans: "سلفي",
    loans: "السلف والقروض",
    myProfile: "ملفي الشخصي",
    logout: "تسجيل الخروج",
    payroll: "الرواتب",
    calendar: "التقويم",
    myCalendar: "تقويمي",
    performance: "تقييم الأداء",
    myPerformance: "أدائي",
    knowledgeCenter: "مركز المعرفة",
    holidays: "العطل الرسمية",

    // Holidays page
    publicHolidays: "العطل الرسمية",
    addHoliday: "إضافة عطلة",
    editHoliday: "تعديل العطلة",
    holidayName: "اسم العطلة",
    holidayDate: "تاريخ العطلة",
    holidayRecurring: "تتكرر كل سنة",
    holidayNotes: "ملاحظات",
    holidayBlockedMsg: "اليوم عطلة رسمية — لا يُسمح بتسجيل الحضور",
    noHolidays: "لا توجد عطل رسمية مضافة",
    holidayDeleteConfirm: "هل تريد حذف هذه العطلة؟",

    // Weekly holidays
    weeklyHolidays: "العطل الأسبوعية",
    weeklyHolidaysDesc: "حدد أيام الراحة الأسبوعية لشركتك",
    weeklyOffBlocked: "اليوم عطلة أسبوعية — لا يُسمح بتسجيل الحضور",
    saveWeeklyDays: "حفظ أيام الراحة",
    sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء",
    wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة", saturday: "السبت",

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

    // Dashboard cards
    todayAttendance: "سجل الحضور اليوم",
    todayAttendanceBoard: "سجل الحضور اليوم",
    presentToday: "حاضر اليوم",
    absentToday: "غائب اليوم",
    lateToday: "متأخر اليوم",
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

    // Board table headers
    employeeCol: "الموظف",
    branchDeptCol: "الفرع / القسم",
    statusCol: "الحالة",
    checkInCol: "الدخول",
    checkOutCol: "الخروج",
    workDurationCol: "مدة العمل",
    delayCol: "تأخير",
    onTime: "في الوقت",
    inProgress: "جارٍ",
    showingOf: "عرض",
    ofEmployees: "من",

    // Board filters / legend
    boardAll: "الكل",
    boardPresent: "حاضر",
    boardLate: "متأخر",
    boardAbsent: "غائب",
    boardLeave: "إجازة",
    legendWorking: "جارٍ العمل",
    legendLate: "متأخر",
    legendCheckedOut: "انصرف",
    legendAbsent: "غائب",
    noResults: "لا توجد نتائج",

    // Chart
    attendanceStats: "إحصائيات الحضور",
    attendanceRateSub: "الموظفون النشطون اليوم",
    excellent: "ممتاز",
    goodRate: "متوسط",
    poor: "ضعيف",
    activeNow: "يعمل الآن",
    presentOf: "حاضر من أصل",

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
    emailLabel: "البريد الإلكتروني",
    phoneLabel: "رقم الهاتف",
    addressLabel: "العنوان",
    roleLabel: "الدور",
    roleEmployee: "موظف",
    roleManager: "مشرف",
    roleAdmin: "إدارة عليا",
    emailField: "البريد الإلكتروني",
    phoneField: "رقم الهاتف",
    salaryField: "الراتب",
    departmentField: "القسم",
    branchField: "الفرع",
    shiftField: "الوردية",
    statusField: "الحالة",
    shiftTime: "وقت الدوام",
    usernameLabel: "المستخدم",
    connectionErrorMsg: "خطأ في الاتصال",
    activeIndicator: "● نشط",
    suspendedIndicator: "○ موقوف",
    employeeCount: "موظف",
    activeCount: "نشط",

    // Manager dashboard
    welcome: "مرحباً",
    myAttendanceTab: "حضوري",
    teamTab: "الفريق",
    teamAttendanceToday: "حضور الفريق اليوم",
    noRecordsToday: "لا توجد سجلات اليوم",

    // Login
    systemName: "نظام الحضور والانصراف",
    systemTitle: "الحضور والانصراف",
    enterCredentials: "أدخل بياناتك للدخول",
    enterUsername: "أدخل اسم المستخدم",
    passwordPlaceholder: "••••••••",
    loggingIn: "جاري الدخول...",
    loginBtn: "دخول",
    forgotCredentials: "تواصل مع مدير النظام إذا نسيت بياناتك",
    superAdminLoginLink: "دخول مدير النظام العام →",
    invalidCredentials: "اسم المستخدم أو كلمة المرور أو كود الشركة غير صحيح",
    companyInactive: "تم إيقاف شركتك من قِبل مزود الخدمة، يرجى التواصل مع الدعم",
    connectionTimeout: "انتهت مهلة الاتصال بالخادم، تحقق من الشبكة وحاول مرة أخرى",
    companyCodeField: "كود الشركة",
    enterCompanyCode: "أدخل كود الشركة (اختياري)",
    companyCodePlaceholder: "مثال: ABCD-1234",
    companyNotFound: "كود الشركة غير صحيح",
    companyVerified: "✓",
    companyCodeHint: "احصل على كود الشركة من مدير النظام",

    // Company
    companyName: "اسم الشركة",
    companyLogo: "شعار الشركة",
    companyAddress: "عنوان الشركة",
    companyPhone: "هاتف الشركة",
    companyEmail: "بريد الشركة",
    companiesManagement: "إدارة الشركات",
    addCompany: "إضافة شركة",
    editCompany: "تعديل الشركة",
    deleteCompany: "حذف الشركة",
    noCompanies: "لا توجد شركات",
    companyAdminUsername: "مستخدم المدير",
    companyAdminPassword: "كلمة مرور المدير",
  },

  en: {
    // Navigation
    dashboard: "Dashboard",
    employees: "Employees",
    branches: "Branches",
    departments: "Departments",
    attendance: "Attendance",
    leaves: "Leaves",
    reports: "Reports",
    chat: "Chat",
    settings: "Settings",
    home: "Home",
    myLeaves: "My Leaves",
    myLoans: "My Loans",
    loans: "Loans",
    myProfile: "My Profile",
    logout: "Logout",
    payroll: "Payroll",
    calendar: "Calendar",
    myCalendar: "My Calendar",
    performance: "Performance",
    myPerformance: "My Performance",
    knowledgeCenter: "Knowledge Center",
    holidays: "Holidays",

    // Holidays page
    publicHolidays: "Public Holidays",
    addHoliday: "Add Holiday",
    editHoliday: "Edit Holiday",
    holidayName: "Holiday Name",
    holidayDate: "Date",
    holidayRecurring: "Repeats annually",
    holidayNotes: "Notes",
    holidayBlockedMsg: "Today is a public holiday — check-in not allowed",
    noHolidays: "No public holidays added",
    holidayDeleteConfirm: "Delete this holiday?",

    // Weekly holidays
    weeklyHolidays: "Weekly Days Off",
    weeklyHolidaysDesc: "Set your company's weekly rest days",
    weeklyOffBlocked: "Today is a weekly day off — check-in not allowed",
    saveWeeklyDays: "Save Rest Days",
    sunday: "Sun", monday: "Mon", tuesday: "Tue",
    wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat",

    // Roles
    admin: "Admin",
    manager: "Manager",
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
    notCheckedInYet: "Not Checked In Yet",

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
    faceCheckIn: "Face Check-In",
    faceCheckOut: "Face Check-Out",

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
    minutes: "min",
    hoursUnit: "hrs",
    minuteShort: "m",

    // Dashboard cards
    todayAttendance: "Today's Attendance",
    todayAttendanceBoard: "Today's Attendance Board",
    presentToday: "Present Today",
    absentToday: "Absent Today",
    lateToday: "Late Today",
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
    noEmployees: "No employees found",
    noPresentToday: "No one is present today",
    noAbsentToday: "No one is absent today",
    noLateToday: "No one is late today",
    noOnLeaveToday: "No one is on leave today",
    noPendingLeaves: "No pending leave requests",

    // Board table headers
    employeeCol: "Employee",
    branchDeptCol: "Branch / Dept",
    statusCol: "Status",
    checkInCol: "Check In",
    checkOutCol: "Check Out",
    workDurationCol: "Duration",
    delayCol: "Delay",
    onTime: "On time",
    inProgress: "Active",
    showingOf: "Showing",
    ofEmployees: "of",

    // Board filters / legend
    boardAll: "All",
    boardPresent: "Present",
    boardLate: "Late",
    boardAbsent: "Absent",
    boardLeave: "Leave",
    legendWorking: "Working",
    legendLate: "Late",
    legendCheckedOut: "Checked Out",
    legendAbsent: "Absent",
    noResults: "No results found",

    // Chart
    attendanceStats: "Attendance Stats",
    attendanceRateSub: "Active employees today",
    excellent: "Excellent",
    goodRate: "Average",
    poor: "Poor",
    activeNow: "Active Now",
    presentOf: "present out of",

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
    confirmDelete: "Are you sure you want to delete?",
    failedLoad: "Failed to load data",
    connectionError: "Connection error",
    checkInSuccess: "Checked in successfully ✓",
    checkOutSuccess: "Checked out successfully ✓",
    faceNotRecognized: "Face not recognized — try again or use manual check-in",

    // GPS
    locationMode: "Location Verification Mode",
    locationEnabled: "Enabled — Employee must be within branch radius",
    locationDisabled: "Disabled — Location not required for check-in",
    locationRequired: "You must be within the branch radius to check in",
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
    backupCreated: "Backup created",
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
    arabic: "Arabic",
    english: "English",

    // Attendance board
    checkInTime: "Check In Time",
    checkOutTime: "Check Out Time",
    workDuration: "Work Duration",
    workDurationLabel: "Work Duration",
    delay: "Delay",
    autoRefresh: "Auto-refresh every minute",
    entryTime: "Entry:",
    exitTime: "Exit Time",
    lateBy: "Late by",
    recentRecord: "Recent Records",
    entryShort: "In:",
    exitShort: "Out:",
    hoursShort: "hrs",
    notCheckedInToday: "You haven't checked in today yet",
    todayAttendanceCard: "Today's Attendance",
    faceNotRegistered: "Face not registered yet — contact your manager",

    // Leaves
    leaveType: "Leave Type",
    leaveReason: "Reason",
    leaveStatus: "Request Status",
    pending: "Under Review",
    approved: "Approved",
    rejected: "Rejected",
    annual: "Annual",
    sick: "Sick",
    emergency: "Emergency",
    unpaid: "Unpaid",
    other: "Other",
    approve: "Approve",
    reject: "Reject",
    leaveRequests: "Leave Requests",
    reviewLeaves: "Review and approve employee leave requests",
    searchByEmployee: "Search by employee name...",
    noLeaveRequests: "No leave requests found",
    approveLeave: "Approve",
    rejectLeave: "Reject",
    rejectionReason: "Rejection reason:",
    confirmApproveLeave: "Confirm approving this leave request?",
    rejectionReasonPrompt: "Rejection reason (optional):",
    failedLoadLeaves: "Failed to load leaves",
    approveSuccess: "Leave approved",
    rejectSuccess: "Leave rejected",
    failedAction: "Operation failed",
    pendingStatus: "Pending",

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
    emailLabel: "Email",
    phoneLabel: "Phone",
    addressLabel: "Address",
    roleLabel: "Role",
    roleEmployee: "Employee",
    roleManager: "Manager",
    roleAdmin: "Admin",
    emailField: "Email",
    phoneField: "Phone Number",
    salaryField: "Salary",
    departmentField: "Department",
    branchField: "Branch",
    shiftField: "Shift",
    statusField: "Status",
    shiftTime: "Shift Hours",
    usernameLabel: "Username",
    connectionErrorMsg: "Connection error",
    activeIndicator: "● Active",
    suspendedIndicator: "○ Suspended",
    employeeCount: "employees",
    activeCount: "active",

    // Manager dashboard
    welcome: "Welcome",
    myAttendanceTab: "My Attendance",
    teamTab: "Team",
    teamAttendanceToday: "Team Attendance Today",
    noRecordsToday: "No records for today",

    // Login
    systemName: "Attendance Management System",
    systemTitle: "Attendance",
    enterCredentials: "Enter your credentials to sign in",
    enterUsername: "Enter username",
    passwordPlaceholder: "••••••••",
    loggingIn: "Signing in...",
    loginBtn: "Sign In",
    forgotCredentials: "Contact your system administrator if you forgot your credentials",
    superAdminLoginLink: "Super Admin Login →",
    invalidCredentials: "Invalid username, password, or company code",
    companyCodeField: "Company Code",
    enterCompanyCode: "Enter company code (optional)",
    companyCodePlaceholder: "e.g. ABCD-1234",
    companyNotFound: "Invalid company code",
    companyVerified: "✓",
    companyCodeHint: "Get your company code from your system administrator",
    companyInactive: "Your company has been deactivated. Please contact support.",
    connectionTimeout: "Server connection timed out. Check your network and try again.",

    // Company
    companyName: "Company Name",
    companyLogo: "Company Logo",
    companyAddress: "Company Address",
    companyPhone: "Company Phone",
    companyEmail: "Company Email",
    companiesManagement: "Companies Management",
    addCompany: "Add Company",
    editCompany: "Edit Company",
    deleteCompany: "Delete Company",
    noCompanies: "No companies found",
    companyAdminUsername: "Admin Username",
    companyAdminPassword: "Admin Password",
  },
};

type TranslationKey = keyof typeof translations.ar;

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
  dir: "rtl" | "ltr";
  locale: string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const BASE = import.meta.env.BASE_URL;

async function saveLangToDB(lang: Lang) {
  try {
    await fetch(`${BASE}api/preferences`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang }),
    });
  } catch {}
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user, updateUserPrefs } = useAuth();

  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem("lang") as Lang) || "ar"; } catch { return "ar"; }
  });

  // Sync from DB when user loads / changes
  useEffect(() => {
    if (!user) return;
    const dbLang = user.preferredLang;
    if (dbLang === "ar" || dbLang === "en") {
      if (dbLang !== lang) {
        setLangState(dbLang);
        try { localStorage.setItem("lang", dbLang); } catch {}
        document.documentElement.setAttribute("lang", dbLang);
        document.documentElement.setAttribute("dir", dbLang === "ar" ? "rtl" : "ltr");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.preferredLang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("lang", l); } catch {}
    document.documentElement.setAttribute("lang", l);
    document.documentElement.setAttribute("dir", l === "ar" ? "rtl" : "ltr");
    if (user) {
      saveLangToDB(l);
      updateUserPrefs({ lang: l });
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  }, [lang]);

  const t = (key: TranslationKey): string => {
    return (translations[lang] as Record<string, string>)[key]
      ?? (translations.ar as Record<string, string>)[key]
      ?? key;
  };

  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";
  const locale = lang === "ar" ? "ar-IQ" : "en-US";

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir, locale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
