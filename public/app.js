/***********************
 * CONFIG
 ***********************/
const APP_CONFIG = window.SHIFTLY_CONFIG || {};
const SUPABASE_URL = APP_CONFIG.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = APP_CONFIG.SUPABASE_ANON_KEY || "";
const MAX_GPS_ACCURACY_M = 50;

/** Admin code lookup (change to match your DB) */
const ADMIN_TABLE = "admins";          // e.g. "admins"
const ADMIN_CODE_COL = "code";         // e.g. "code"
const ADMIN_ACTIVE_COL = "active";     // e.g. "active"

/** Sites table fields (change if needed) */
const SITES_TABLE = "sites";
const SITES_ID_COL = "site_id";
const SITES_NAME_COL = "name";
const SITES_LAT_COL = "lat";
const SITES_LON_COL = "lon";
const SITES_RADIUS_COL = "radius_m";
const SITES_ACTIVE_COL = "active";
const COMPANY_ID_COL = "company_id";

/** Multi-company access tables */
const COMPANIES_TABLE = "companies";
const COMPANY_USERS_TABLE = "company_users";
const COMPANY_USERS_USER_COL = "user_id";
const COMPANY_USERS_COMPANY_COL = "company_id";
const COMPANY_USERS_ROLE_COL = "role";
const COMPANY_USERS_ACTIVE_COL = "active";
const PLATFORM_ADMINS_TABLE = "platform_admins";
const COMPANY_LOGO_BUCKET = "company-logos";
const EMPLOYEE_FACE_BUCKET = "employee-faces";
const FACE_API_MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
const FACE_MATCH_THRESHOLD = 0.48;
const FACE_SCAN_INTERVAL_MS = 900;
const COMPANY_PAYROLL_RULES_TABLE = "company_payroll_rules";
const COMPANY_DEDUCTION_TYPES_TABLE = "company_deduction_types";
const PAYROLL_DEDUCTIONS_TABLE = "payroll_deductions";
const PAYROLL_ADJUSTMENTS_TABLE = "payroll_adjustments";
const COMPANY_PAYROLL_LEVY_PERIODS_TABLE = "company_payroll_levy_periods";
const EMPLOYEE_PAYROLL_YTD_OPENING_TABLE = "employee_payroll_ytd_opening_balances";
const EMPLOYEE_PAYROLL_PERIOD_TOTALS_TABLE = "employee_payroll_period_totals";
const BILLING_CLIENTS_TABLE = "billing_clients";
const BILLING_ITEMS_TABLE = "billing_items";
const BILLING_QUOTES_TABLE = "billing_quotes";
const BILLING_QUOTE_ITEMS_TABLE = "billing_quote_items";
const BILLING_INVOICES_TABLE = "billing_invoices";
const BILLING_INVOICE_ITEMS_TABLE = "billing_invoice_items";
const BILLING_PAYMENTS_TABLE = "billing_payments";
const BILLING_RECURRING_TABLE = "billing_recurring_invoices";
const BILLING_RECURRING_ITEMS_TABLE = "billing_recurring_invoice_items";
const BILLING_RECURRING_RUNS_TABLE = "billing_recurring_runs";
const BILLING_MANUAL_ITEM_VALUE = "__manual__";
const BILLING_MANUAL_CLIENT_VALUE = "__manual_client__";
const BILLING_PROFILE_TABLE = "billing_company_profiles";
const VAT_RATE = 0.15;
const DEFAULT_BILLING_USER_ID = "a18ac0ca-f1e8-4ca3-add9-591d87aa9b15";
const DEFAULT_BILLING_COMPANY_ID = "7721bc3a-272c-4e4d-97e9-d9d6107bf42a";
const TR_ELECTRICAL_COMPANY_ID = "f50d8e62-3006-462e-b2a9-b1cf7c500394";
const PVS_COMPANY_IDS = new Set([
  "276c7308-8944-41de-bf48-f32ddfec4933",
  "58f6d52b-fc34-4976-8330-c661008942ce"
]);
const PAYROLL_YTD_TAKEOVER_DATES = Object.freeze({
  [TR_ELECTRICAL_COMPANY_ID]: "2026-08-01",
  "276c7308-8944-41de-bf48-f32ddfec4933": "2026-08-01",
  "58f6d52b-fc34-4976-8330-c661008942ce": "2026-08-01"
});
const TR_ELECTRICAL_NBCEI_RATE_VERSION = "2026-06";
const TR_ELECTRICAL_NBCEI_RATES = Object.freeze({
  "43": Object.freeze({ label: "Elconop 3", provident: 335.21, sbf: 13.41, council: 17.88, cbl: 20.77 }),
  "44": Object.freeze({ label: "Elconop 2", provident: 294.20, sbf: 11.77, council: 15.69, cbl: 20.77 }),
  "48": Object.freeze({ label: "Elconop 1", provident: 185.43, sbf: 7.42, council: 9.89, cbl: 20.77 }),
  "49": Object.freeze({ label: "Electrical Assistant", provident: 158.43, sbf: 6.34, council: 8.45, cbl: 20.77 })
});
const TR_ELECTRICAL_NBCEI_RATE_SETS = Object.freeze({
  [TR_ELECTRICAL_NBCEI_RATE_VERSION]: TR_ELECTRICAL_NBCEI_RATES
});
const TR_ELECTRICAL_SAEWA_WEEKLY_RATE = 20.77;
const STANDARD_DEDUCTION_FIELDS = Object.freeze([
  { key: "tax", label: "Tax" },
  { key: "uif", label: "UIF" },
  { key: "tools_ppe", label: "Tools/PPE", aliases: ["Tools / PPE"] },
  { key: "fine", label: "Fine" },
  { key: "loan", label: "Loan" }
]);
const STANDARD_ADJUSTMENT_FIELDS = Object.freeze([
  { key: "paid_leave", label: "Paid Leave", mode: "normal_hours" },
  { key: "allowance", label: "Allowance", mode: "amount" },
  { key: "bonus", label: "Bonus", mode: "amount" },
  { key: "manual_normal_hours", label: "Manual Normal Hrs", mode: "normal_hours" },
  { key: "manual_ot1", label: "Manual OT1 Hrs", mode: "ot1_hours" },
  { key: "manual_ot2", label: "Manual OT2 Hrs", mode: "ot2_hours" }
]);
const FIXED_PAYSLIP_DEDUCTION_KEYS = Object.freeze(["tax", "uif", "tools_ppe", "loan"]);
const SA_PAYE_2027 = Object.freeze({
  primaryRebate: 17820,
  brackets: [
    { upTo: 245100, base: 0, rate: 0.18, over: 0 },
    { upTo: 383100, base: 44118, rate: 0.26, over: 245100 },
    { upTo: 530200, base: 79998, rate: 0.31, over: 383100 },
    { upTo: 695800, base: 125599, rate: 0.36, over: 530200 },
    { upTo: 887000, base: 185215, rate: 0.39, over: 695800 },
    { upTo: 1878600, base: 259783, rate: 0.41, over: 887000 },
    { upTo: Infinity, base: 666339, rate: 0.45, over: 1878600 }
  ]
});
const SA_UIF_MONTHLY_CEILING = 17712;
const SA_UIF_RATE = 0.01;
const SA_RETIREMENT_FUND_ANNUAL_LIMIT = 430000;

/***********************
 * CLIENT + STATE
 ***********************/
const hasSupabaseConfig = /^https:\/\/.+\.supabase\.co$/.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 40;
const sb = hasSupabaseConfig ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let currentUser = null;
let isPlatformAdmin = false;
let companies = [];
let currentCompanyId = "";
let currentCompanyName = "";
let currentCompanyRole = "";
let currentCompanyEmployeeId = "";
let jobsContextVersion = 0;
// Read-only Jobs bridge: reuse the existing session/company store, never a client.
window.ShiftlyJobsContext = Object.freeze({ get() {
  const company = currentCompany();
  return { userId: currentUser?.id || "", companyId: currentCompanyId,
    role: currentCompanyRole, employeeId: currentCompanyEmployeeId,
    company: company ? { ...company } : null,
    jobsEnabled: company?.jobs_enabled === true, version: jobsContextVersion };
} });
let employeeDashboardReturn = "clocking";
let platformCompanies = [];
let selectedPlatformCompanyId = "";
let companyAdminEmployees = [];
let companyAdminSites = [];
let companyAdminSupervisors = [];
let companyAdminEvents = [];
let payrollRows = [];
let currentBreakdownEmployeeId = "";
let currentTimesheetReport = null;
let companyPayrollRules = null;
let companyDeductionTypes = [];
let payrollDeductions = [];
let payrollDeductionsAvailable = true;
let payrollAdjustments = [];
let payrollAdjustmentsAvailable = true;
let employeeDashboardPayslipRow = null;
let currentDeductionEmployeeId = "";
let deductionsEditOpen = false;
let editingEvent = null;
let editingEmployeeId = null;
let editingSiteId = null;
let editingSupervisorId = null;
let currentSiteActionId = "";
let billingClients = [];
let billingItems = [];
let billingQuotes = [];
let billingInvoices = [];
let billingRecurringInvoices = [];
let billingRecurringRuns = [];
let billingQuoteLines = [];
let billingInvoiceLines = [];
let billingRecurringLines = [];
let billingProfile = null;
let editingBillingClientId = null;
let editingBillingItemId = null;
let showArchivedBillingItems = false;
let billingInvoiceDateFilter = null;
let editingBillingQuoteId = null;
let editingBillingRecurringId = null;
let currentBillingAction = null;
let currentBillingPaymentInvoiceId = null;
let editingBillingInvoiceId = null;
let currentIdentityEmployeeId = "";
let currentIdentityEmployee = null;
let faceCaptureStream = null;
let faceCaptureFacingMode = "user";
let faceCaptureCameraCount = 0;
let isPasswordSetupMode = false;

let mode = "IN";        // "IN" | "OUT"
let sites = [];
let selectedSiteId = "";

let scanning = false;
let qr = null;
let scannerMode = "qr";
let scannerGuideTimer = null;
let scannerModeExpanded = false;
let scannerModeCollapseTimer = null;
let scannerFailCount = 0;
let faceModelsReady = false;
let faceModelsPromise = null;
let faceRoster = [];
let faceRosterCompanyId = "";
let faceScanTimer = null;
let faceScanBusy = false;
let lastFaceMatch = "";
let lastFaceMatchTimer = null;

const queue = new Map(); // employeeId -> { id, name }
let lastScan = "";
let lastScanTimer = null;

/** Admin mode */
let isAdmin = false;
let adminCheckTimer = null;

/** Map state */
let map = null;
let marker = null;
let circle = null;
let mapReady = false;
let pickedLat = null;
let pickedLon = null;

/***********************
 * DOM
 ***********************/
const $ = (id) => document.getElementById(id);
const el = {
  authScreen: $("authScreen"),
  appShell: $("appShell"),
  platformShell: $("platformShell"),
  portfolioShell: $("portfolioShell"),
  companyAdminShell: $("companyAdminShell"),
  billingShell: $("billingShell"),
  employeeShell: $("employeeShell"),
  loginForm: $("loginForm"),
  loginEmail: $("loginEmail"),
  loginPassword: $("loginPassword"),
  btnLogin: $("btnLogin"),
  btnResetPassword: $("btnResetPassword"),
  authError: $("authError"),
  passwordSetupForm: $("passwordSetupForm"),
  newPassword: $("newPassword"),
  confirmPassword: $("confirmPassword"),
  btnSetPassword: $("btnSetPassword"),
  passwordSetupError: $("passwordSetupError"),
  btnLogout: $("btnLogout"),
  btnBackToCompanyDashboard: $("btnBackToCompanyDashboard"),
  btnBackToPortfolio: $("btnBackToPortfolio"),
  btnOpenEmployeeDashboard: $("btnOpenEmployeeDashboard"),
  btnTeamStatus: $("btnTeamStatus"),
  teamStatusModal: $("teamStatusModal"),
  btnCloseTeamStatus: $("btnCloseTeamStatus"),
  teamStatusSub: $("teamStatusSub"),
  teamStatusInCount: $("teamStatusInCount"),
  teamStatusOutCount: $("teamStatusOutCount"),
  teamStatusBody: $("teamStatusBody"),
  btnPlatformLogout: $("btnPlatformLogout"),
  btnPortfolioLogout: $("btnPortfolioLogout"),
  btnCompanyAdminLogout: $("btnCompanyAdminLogout"),
  btnCompanyAdminPortfolio: $("btnCompanyAdminPortfolio"),
  btnCompanyAdminEmployeeDashboard: $("btnCompanyAdminEmployeeDashboard"),
  btnOpenBilling: $("btnOpenBilling"),
  btnEmployeeLogout: $("btnEmployeeLogout"),
  btnBillingBack: $("btnBillingBack"),
  btnBillingClocking: $("btnBillingClocking"),
  btnBillingLogout: $("btnBillingLogout"),
  btnEmployeePortfolio: $("btnEmployeePortfolio"),
  btnEmployeeBack: $("btnEmployeeBack"),
  btnOpenClocking: $("btnOpenClocking"),
  employeeDashboardCompany: $("employeeDashboardCompany"),
  employeeDashboardUser: $("employeeDashboardUser"),
  employeeDashboardName: $("employeeDashboardName"),
  employeeDashboardMeta: $("employeeDashboardMeta"),
  employeeDashboardPay: $("employeeDashboardPay"),
  employeeDashboardIdNumber: $("employeeDashboardIdNumber"),
  employeeDashboardEmploymentDate: $("employeeDashboardEmploymentDate"),
  employeePeriodStart: $("employeePeriodStart"),
  employeePeriodEnd: $("employeePeriodEnd"),
  btnRunEmployeeDashboard: $("btnRunEmployeeDashboard"),
  btnEmployeePayslip: $("btnEmployeePayslip"),
  employeeTotalHours: $("employeeTotalHours"),
  employeeGrossPay: $("employeeGrossPay"),
  employeeNormalHours: $("employeeNormalHours"),
  employeeNormalPay: $("employeeNormalPay"),
  employeeOt1Hours: $("employeeOt1Hours"),
  employeeOt1Pay: $("employeeOt1Pay"),
  employeeOt2Hours: $("employeeOt2Hours"),
  employeeOt2Pay: $("employeeOt2Pay"),
  employeeEventsBody: $("employeeEventsBody"),
  companyAdminUserLabel: $("companyAdminUserLabel"),
  companyAdminTitle: $("companyAdminTitle"),
  companyAdminSub: $("companyAdminSub"),
  companyAdminLogoMark: $("companyAdminLogoMark"),
  btnUploadCompanyLogo: $("btnUploadCompanyLogo"),
  companyLogoInput: $("companyLogoInput"),
  btnCompanyAdminSwitch: $("btnCompanyAdminSwitch"),
  companySwitchModal: $("companySwitchModal"),
  companySwitchList: $("companySwitchList"),
  btnCloseCompanySwitch: $("btnCloseCompanySwitch"),
  companyStatUsers: $("companyStatUsers"),
  companyStatEmployees: $("companyStatEmployees"),
  companyStatSites: $("companyStatSites"),
  companyStatEvents: $("companyStatEvents"),
  companyEmployeeCount: $("companyEmployeeCount"),
  companySiteCount: $("companySiteCount"),
  companySupervisorCount: $("companySupervisorCount"),
  employeeFormBox: $("employeeFormBox"),
  siteFormBox: $("siteFormBox"),
  supervisorFormBox: $("supervisorFormBox"),
  btnToggleEmployeeForm: $("btnToggleEmployeeForm"),
  btnToggleSiteForm: $("btnToggleSiteForm"),
  btnToggleSupervisorForm: $("btnToggleSupervisorForm"),
  companyEmployeeForm: $("companyEmployeeForm"),
  companyEmployeeId: $("companyEmployeeId"),
  companyEmployeeName: $("companyEmployeeName"),
  companyEmployeeIdNumber: $("companyEmployeeIdNumber"),
  companyEmployeePayType: $("companyEmployeePayType"),
  companyEmployeeRate: $("companyEmployeeRate"),
  companyEmployeeEmploymentDate: $("companyEmployeeEmploymentDate"),
  companyEmployeePayCycle: $("companyEmployeePayCycle"),
  companyEmployeeNbceiDesignation: $("companyEmployeeNbceiDesignation"),
  companyEmployeeSbfMember: $("companyEmployeeSbfMember"),
  companyEmployeeSaewaMember: $("companyEmployeeSaewaMember"),
  companyEmployeeActive: $("companyEmployeeActive"),
  btnSaveEmployee: $("btnSaveEmployee"),
  companyEmployeeList: $("companyEmployeeList"),
  companySiteForm: $("companySiteForm"),
  companySiteId: $("companySiteId"),
  companySiteName: $("companySiteName"),
  companySiteLat: $("companySiteLat"),
  companySiteLon: $("companySiteLon"),
  companySiteRadius: $("companySiteRadius"),
  companySiteActive: $("companySiteActive"),
  btnSaveCompanySite: $("btnSaveCompanySite"),
  companySiteList: $("companySiteList"),
  siteActionModal: $("siteActionModal"),
  btnCloseSiteAction: $("btnCloseSiteAction"),
  siteActionSub: $("siteActionSub"),
  siteActionList: $("siteActionList"),
  companySupervisorForm: $("companySupervisorForm"),
  companySupervisorId: $("companySupervisorId"),
  companySupervisorCode: $("companySupervisorCode"),
  companySupervisorEmployee: $("companySupervisorEmployee"),
  companySupervisorName: $("companySupervisorName"),
  companySupervisorActive: $("companySupervisorActive"),
  btnSaveSupervisor: $("btnSaveSupervisor"),
  companySupervisorList: $("companySupervisorList"),
  billingUserLabel: $("billingUserLabel"),
  billingCompanyLogoMark: $("billingCompanyLogoMark"),
  billingCompanyTitle: $("billingCompanyTitle"),
  billingCompanySub: $("billingCompanySub"),
  billingStatClients: $("billingStatClients"),
  billingStatItems: $("billingStatItems"),
  billingStatQuotes: $("billingStatQuotes"),
  billingStatInvoices: $("billingStatInvoices"),
  billingClientCount: $("billingClientCount"),
  billingItemCount: $("billingItemCount"),
  billingClientFormBox: $("billingClientFormBox"),
  btnToggleBillingClientForm: $("btnToggleBillingClientForm"),
  billingClientForm: $("billingClientForm"),
  billingClientName: $("billingClientName"),
  billingClientContact: $("billingClientContact"),
  billingClientEmail: $("billingClientEmail"),
  billingClientPhone: $("billingClientPhone"),
  billingClientVat: $("billingClientVat"),
  billingClientAddress: $("billingClientAddress"),
  billingClientActive: $("billingClientActive"),
  btnSaveBillingClient: $("btnSaveBillingClient"),
  billingClientList: $("billingClientList"),
  billingItemFormBox: $("billingItemFormBox"),
  btnToggleBillingItemForm: $("btnToggleBillingItemForm"),
  billingItemForm: $("billingItemForm"),
  billingItemCode: $("billingItemCode"),
  billingItemName: $("billingItemName"),
  billingItemDescription: $("billingItemDescription"),
  billingItemUnit: $("billingItemUnit"),
  billingItemPrice: $("billingItemPrice"),
  billingItemVatType: $("billingItemVatType"),
  billingItemActive: $("billingItemActive"),
  btnSaveBillingItem: $("btnSaveBillingItem"),
  billingItemList: $("billingItemList"),
  btnToggleArchivedBillingItems: $("btnToggleArchivedBillingItems"),
  billingQuoteCount: $("billingQuoteCount"),
  billingQuoteFormBox: $("billingQuoteFormBox"),
  btnToggleBillingQuoteForm: $("btnToggleBillingQuoteForm"),
  billingQuoteForm: $("billingQuoteForm"),
  billingQuoteNumber: $("billingQuoteNumber"),
  billingQuoteClient: $("billingQuoteClient"),
  billingQuoteManualClientName: $("billingQuoteManualClientName"),
  billingQuoteIssueDate: $("billingQuoteIssueDate"),
  billingQuoteExpiryDate: $("billingQuoteExpiryDate"),
  billingQuoteStatus: $("billingQuoteStatus"),
  billingQuoteNotes: $("billingQuoteNotes"),
  billingQuoteItemSelect: $("billingQuoteItemSelect"),
  billingQuoteManualFields: $("billingQuoteManualFields"),
  billingQuoteManualDescription: $("billingQuoteManualDescription"),
  billingQuoteManualPrice: $("billingQuoteManualPrice"),
  billingQuoteQty: $("billingQuoteQty"),
  billingQuoteDiscount: $("billingQuoteDiscount"),
  btnAddBillingQuoteLine: $("btnAddBillingQuoteLine"),
  billingQuoteLineList: $("billingQuoteLineList"),
  billingQuoteTotalPreview: $("billingQuoteTotalPreview"),
  btnSaveBillingQuote: $("btnSaveBillingQuote"),
  billingQuoteList: $("billingQuoteList"),
  billingInvoiceFormBox: $("billingInvoiceFormBox"),
  btnToggleBillingInvoiceForm: $("btnToggleBillingInvoiceForm"),
  btnToggleBillingInvoiceDateFilter: $("btnToggleBillingInvoiceDateFilter"),
  billingInvoiceDateFilterBox: $("billingInvoiceDateFilterBox"),
  billingInvoiceDateFilterForm: $("billingInvoiceDateFilterForm"),
  btnCloseBillingInvoiceDateFilter: $("btnCloseBillingInvoiceDateFilter"),
  billingInvoiceDateMode: $("billingInvoiceDateMode"),
  btnBillingInvoiceDateModeMonth: $("btnBillingInvoiceDateModeMonth"),
  btnBillingInvoiceDateModeRange: $("btnBillingInvoiceDateModeRange"),
  billingInvoiceMonthFields: $("billingInvoiceMonthFields"),
  billingInvoiceMonth: $("billingInvoiceMonth"),
  btnBillingInvoicePreviousMonth: $("btnBillingInvoicePreviousMonth"),
  btnBillingInvoiceNextMonth: $("btnBillingInvoiceNextMonth"),
  billingInvoiceRangeFields: $("billingInvoiceRangeFields"),
  billingInvoiceDateStart: $("billingInvoiceDateStart"),
  billingInvoiceDateEnd: $("billingInvoiceDateEnd"),
  btnResetBillingInvoiceDateFilter: $("btnResetBillingInvoiceDateFilter"),
  billingInvoicePeriodSummary: $("billingInvoicePeriodSummary"),
  billingInvoicePeriodLabel: $("billingInvoicePeriodLabel"),
  btnClearBillingInvoiceDateFilter: $("btnClearBillingInvoiceDateFilter"),
  billingInvoiceForm: $("billingInvoiceForm"),
  billingManualInvoiceNumber: $("billingManualInvoiceNumber"),
  billingManualInvoiceClient: $("billingManualInvoiceClient"),
  billingManualInvoiceIssueDate: $("billingManualInvoiceIssueDate"),
  billingManualInvoiceDueDate: $("billingManualInvoiceDueDate"),
  billingManualInvoiceStatus: $("billingManualInvoiceStatus"),
  billingManualInvoiceNotes: $("billingManualInvoiceNotes"),
  billingManualInvoiceItemSelect: $("billingManualInvoiceItemSelect"),
  billingManualInvoiceManualFields: $("billingManualInvoiceManualFields"),
  billingManualInvoiceManualDescription: $("billingManualInvoiceManualDescription"),
  billingManualInvoiceManualPrice: $("billingManualInvoiceManualPrice"),
  billingManualInvoiceQty: $("billingManualInvoiceQty"),
  billingManualInvoiceDiscount: $("billingManualInvoiceDiscount"),
  btnAddBillingManualInvoiceLine: $("btnAddBillingManualInvoiceLine"),
  billingManualInvoiceLineList: $("billingManualInvoiceLineList"),
  billingManualInvoiceTotalPreview: $("billingManualInvoiceTotalPreview"),
  btnSaveBillingManualInvoice: $("btnSaveBillingManualInvoice"),
  billingInvoiceCount: $("billingInvoiceCount"),
  billingInvoiceList: $("billingInvoiceList"),
  billingRecurringCount: $("billingRecurringCount"),
  btnToggleBillingRecurringForm: $("btnToggleBillingRecurringForm"),
  billingRecurringFormBox: $("billingRecurringFormBox"),
  billingRecurringForm: $("billingRecurringForm"),
  billingRecurringName: $("billingRecurringName"),
  billingRecurringClient: $("billingRecurringClient"),
  billingRecurringIssueDay: $("billingRecurringIssueDay"),
  billingRecurringDueDays: $("billingRecurringDueDays"),
  billingRecurringStartDate: $("billingRecurringStartDate"),
  billingRecurringEndDate: $("billingRecurringEndDate"),
  billingRecurringActive: $("billingRecurringActive"),
  billingRecurringNotes: $("billingRecurringNotes"),
  billingRecurringItemSelect: $("billingRecurringItemSelect"),
  billingRecurringManualFields: $("billingRecurringManualFields"),
  billingRecurringManualDescription: $("billingRecurringManualDescription"),
  billingRecurringManualPrice: $("billingRecurringManualPrice"),
  billingRecurringQty: $("billingRecurringQty"),
  billingRecurringDiscount: $("billingRecurringDiscount"),
  btnAddBillingRecurringLine: $("btnAddBillingRecurringLine"),
  billingRecurringLineList: $("billingRecurringLineList"),
  billingRecurringTotalPreview: $("billingRecurringTotalPreview"),
  btnSaveBillingRecurring: $("btnSaveBillingRecurring"),
  billingRecurringList: $("billingRecurringList"),
  billingMetricDraft: $("billingMetricDraft"),
  billingMetricOutstanding: $("billingMetricOutstanding"),
  billingMetricPaid: $("billingMetricPaid"),
  billingMetricRevenue: $("billingMetricRevenue"),
  billingMetricOutstandingValue: $("billingMetricOutstandingValue"),
  billingMetricRecurringRevenue: $("billingMetricRecurringRevenue"),
  btnToggleBillingProfile: $("btnToggleBillingProfile"),
  billingProfileFormBox: $("billingProfileFormBox"),
  billingProfileForm: $("billingProfileForm"),
  billingProfileRegistration: $("billingProfileRegistration"),
  billingProfileVat: $("billingProfileVat"),
  billingProfileEmail: $("billingProfileEmail"),
  billingProfilePhone: $("billingProfilePhone"),
  billingProfileAddress: $("billingProfileAddress"),
  billingProfileBank: $("billingProfileBank"),
  billingProfileAccountName: $("billingProfileAccountName"),
  billingProfileAccountNumber: $("billingProfileAccountNumber"),
  billingProfileBranch: $("billingProfileBranch"),
  billingProfileAccountType: $("billingProfileAccountType"),
  billingProfileTerms: $("billingProfileTerms"),
  billingProfileNotes: $("billingProfileNotes"),
  billingActionModal: $("billingActionModal"),
  btnCloseBillingAction: $("btnCloseBillingAction"),
  billingActionTitle: $("billingActionTitle"),
  billingActionSub: $("billingActionSub"),
  billingActionList: $("billingActionList"),
  billingPaymentModal: $("billingPaymentModal"),
  btnCloseBillingPayment: $("btnCloseBillingPayment"),
  billingPaymentInvoice: $("billingPaymentInvoice"),
  billingPaymentForm: $("billingPaymentForm"),
  billingPaymentAmount: $("billingPaymentAmount"),
  billingPaymentDate: $("billingPaymentDate"),
  billingPaymentMethod: $("billingPaymentMethod"),
  billingPaymentReference: $("billingPaymentReference"),
  billingPaymentNotes: $("billingPaymentNotes"),
  billingPaymentHistory: $("billingPaymentHistory"),
  billingInvoiceEditModal: $("billingInvoiceEditModal"),
  btnCloseBillingInvoiceEdit: $("btnCloseBillingInvoiceEdit"),
  billingInvoiceEditForm: $("billingInvoiceEditForm"),
  billingInvoiceEditLabel: $("billingInvoiceEditLabel"),
  billingInvoiceIssueDate: $("billingInvoiceIssueDate"),
  billingInvoiceDueDate: $("billingInvoiceDueDate"),
  billingInvoiceStatus: $("billingInvoiceStatus"),
  billingInvoiceNotes: $("billingInvoiceNotes"),
  companyAdminEventsBody: $("companyAdminEventsBody"),
  btnExportCompanyEvents: $("btnExportCompanyEvents"),
  payrollStartDate: $("payrollStartDate"),
  payrollEndDate: $("payrollEndDate"),
  payrollLevyWeeks: $("payrollLevyWeeks"),
  btnRunPayroll: $("btnRunPayroll"),
  btnExportPayroll: $("btnExportPayroll"),
  payrollTotalHours: $("payrollTotalHours"),
  payrollTotalHoursLabel: $("payrollTotalHoursLabel"),
  payrollTotalGross: $("payrollTotalGross"),
  payrollBody: $("payrollBody"),
  payrollRulesDetails: $("payrollRulesDetails"),
  payrollRulesSummary: $("payrollRulesSummary"),
  payrollRulesForm: $("payrollRulesForm"),
  ruleOvertimeMethod: $("ruleOvertimeMethod"),
  ruleWeeklyHours: $("ruleWeeklyHours"),
  ruleFortnightlyHours: $("ruleFortnightlyHours"),
  ruleMonthlyHours: $("ruleMonthlyHours"),
  ruleOt1Multiplier: $("ruleOt1Multiplier"),
  ruleOt2Multiplier: $("ruleOt2Multiplier"),
  ruleHolidayHours: $("ruleHolidayHours"),
  rulePublicHoliday: $("rulePublicHoliday"),
  ruleLunchMinutes: $("ruleLunchMinutes"),
  ruleCalculateUif: $("ruleCalculateUif"),
  ruleCalculatePaye: $("ruleCalculatePaye"),
  workWeekTitle: $("workWeekTitle"),
  workWeekSubtitle: $("workWeekSubtitle"),
  workWeekSummary: $("workWeekSummary"),
  workWeekEditor: $("workWeekEditor"),
  btnToggleWorkWeekEditor: $("btnToggleWorkWeekEditor"),
  btnSavePayrollRules: $("btnSavePayrollRules"),
  employeeQrModal: $("employeeQrModal"),
  employeeQrName: $("employeeQrName"),
  employeeQrId: $("employeeQrId"),
  employeeQrBox: $("employeeQrBox"),
  employeeIdentityIcon: $("employeeIdentityIcon"),
  employeeIdentityQrTab: $("employeeIdentityQrTab"),
  employeeIdentityFaceTab: $("employeeIdentityFaceTab"),
  employeeQrPanel: $("employeeQrPanel"),
  employeeFacePanel: $("employeeFacePanel"),
  employeeFaceStatus: $("employeeFaceStatus"),
  btnEnrollFace: $("btnEnrollFace"),
  btnRemoveFace: $("btnRemoveFace"),
  btnCloseEmployeeQr: $("btnCloseEmployeeQr"),
  faceCaptureModal: $("faceCaptureModal"),
  faceCaptureEmployee: $("faceCaptureEmployee"),
  faceCaptureVideo: $("faceCaptureVideo"),
  faceCaptureCanvas: $("faceCaptureCanvas"),
  btnCaptureFace: $("btnCaptureFace"),
  btnSwitchFaceCamera: $("btnSwitchFaceCamera"),
  btnCloseFaceCapture: $("btnCloseFaceCapture"),
  scannerModeSwitch: $("scannerModeSwitch"),
  btnScanFace: $("btnScanFace"),
  btnScanQr: $("btnScanQr"),
  scannerGuide: $("scannerGuide"),
  scannerGuideIcon: $("scannerGuideIcon"),
  scannerGuideTitle: $("scannerGuideTitle"),
  scannerGuideSub: $("scannerGuideSub"),
  scanBox: $("scanBox"),
  eventTimeModal: $("eventTimeModal"),
  eventTimeForm: $("eventTimeForm"),
  eventTimeTitle: $("eventTimeTitle"),
  eventTimeSub: $("eventTimeSub"),
  eventTimeEmployee: $("eventTimeEmployee"),
  eventTimeSite: $("eventTimeSite"),
  eventTimeAction: $("eventTimeAction"),
  eventTimeResult: $("eventTimeResult"),
  eventTimeDate: $("eventTimeDate"),
  eventTimeTime: $("eventTimeTime"),
  eventTimeSiteSelect: $("eventTimeSiteSelect"),
  eventTimeApproveRow: $("eventTimeApproveRow"),
  eventTimeApproveBlocked: $("eventTimeApproveBlocked"),
  btnSaveEventTime: $("btnSaveEventTime"),
  btnCloseEventTime: $("btnCloseEventTime"),
  payrollBreakdownModal: $("payrollBreakdownModal"),
  payrollBreakdownEmployee: $("payrollBreakdownEmployee"),
  breakdownNormalHours: $("breakdownNormalHours"),
  breakdownNormalPay: $("breakdownNormalPay"),
  breakdownOt1Hours: $("breakdownOt1Hours"),
  breakdownOt1Pay: $("breakdownOt1Pay"),
  breakdownOt2Hours: $("breakdownOt2Hours"),
  breakdownOt2Pay: $("breakdownOt2Pay"),
  breakdownHolidayHours: $("breakdownHolidayHours"),
  breakdownTotalHours: $("breakdownTotalHours"),
  breakdownTotalPay: $("breakdownTotalPay"),
  btnClosePayrollBreakdown: $("btnClosePayrollBreakdown"),
  btnViewTimesheet: $("btnViewTimesheet"),
  timesheetModal: $("timesheetModal"),
  timesheetLogo: $("timesheetLogo"),
  timesheetCompany: $("timesheetCompany"),
  timesheetEmployee: $("timesheetEmployee"),
  timesheetPeriod: $("timesheetPeriod"),
  timesheetGenerated: $("timesheetGenerated"),
  timesheetBody: $("timesheetBody"),
  timesheetNotice: $("timesheetNotice"),
  timesheetTotal: $("timesheetTotal"),
  btnPrintTimesheet: $("btnPrintTimesheet"),
  btnDownloadTimesheet: $("btnDownloadTimesheet"),
  btnCloseTimesheet: $("btnCloseTimesheet"),
  btnCloseTimesheetIcon: $("btnCloseTimesheetIcon"),
  payrollDeductionsModal: $("payrollDeductionsModal"),
  payrollDeductionsEmployee: $("payrollDeductionsEmployee"),
  deductionGrossPay: $("deductionGrossPay"),
  adjustmentTotal: $("adjustmentTotal"),
  deductionTotal: $("deductionTotal"),
  deductionNetPay: $("deductionNetPay"),
  deductionList: $("deductionList"),
  deductionForm: $("deductionForm"),
  deductionType: $("deductionType"),
  deductionDescription: $("deductionDescription"),
  deductionAmount: $("deductionAmount"),
  btnEditDeductions: $("btnEditDeductions"),
  btnSaveDeduction: $("btnSaveDeduction"),
  payslipModal: $("payslipModal"),
  payslipModalSub: $("payslipModalSub"),
  payslipEmployeeSelect: $("payslipEmployeeSelect"),
  btnGeneratePayslip: $("btnGeneratePayslip"),
  btnClosePayslip: $("btnClosePayslip"),
  platformUserLabel: $("platformUserLabel"),
  platformCompanyCount: $("platformCompanyCount"),
  platformCompanyList: $("platformCompanyList"),
  companyFormBox: $("companyFormBox"),
  btnToggleCompanyForm: $("btnToggleCompanyForm"),
  newCompanyForm: $("newCompanyForm"),
  newCompanyName: $("newCompanyName"),
  newCompanyPlan: $("newCompanyPlan"),
  btnCreateCompany: $("btnCreateCompany"),
  companyUserForm: $("companyUserForm"),
  companyUserFormBox: $("companyUserFormBox"),
  btnToggleCompanyUserForm: $("btnToggleCompanyUserForm"),
  companyUserEmail: $("companyUserEmail"),
  companyUserFullName: $("companyUserFullName"),
  companyUserEmployeeId: $("companyUserEmployeeId"),
  companyUserRole: $("companyUserRole"),
  companyUserBillingAccess: $("companyUserBillingAccess"),
  btnAddCompanyUser: $("btnAddCompanyUser"),
  platformUsersBody: $("platformUsersBody"),
  platformDetailTitle: $("platformDetailTitle"),
  platformDetailSub: $("platformDetailSub"),
  platformDetailStatus: $("platformDetailStatus"),
  statUsers: $("statUsers"),
  statEmployees: $("statEmployees"),
  statSites: $("statSites"),
  statEvents: $("statEvents"),
  platformEventsBody: $("platformEventsBody"),
  portfolioUserLabel: $("portfolioUserLabel"),
  portfolioCompanyCount: $("portfolioCompanyCount"),
  portfolioCompanyList: $("portfolioCompanyList"),
  userLabel: $("userLabel"),
  companyLabel: $("companyLabel"),
  companySelect: $("companySelect"),

  btnIn: $("btnIn"),
  btnOut: $("btnOut"),
  btnSite: $("btnSite"),
  siteName: $("siteName"),
  pickerPanel: $("pickerPanel"),
  siteSelect: $("siteSelect"),
  supCode: $("supCode"),

  adminPanel: $("adminPanel"),
  btnAddSite: $("btnAddSite"),

  qCount: $("qCount"),
  queueList: $("queueList"),
  btnClear: $("btnClear"),
  btnSubmit: $("btnSubmit"),

  siteModal: $("siteModal"),
  btnCloseModal: $("btnCloseModal"),
  btnSaveSite: $("btnSaveSite"),
  newSiteName: $("newSiteName"),
  newSiteRadius: $("newSiteRadius"),
};

function must(elm, name) {
  if (!elm) throw new Error(`Missing element: ${name}`);
  return elm;
}
Object.entries(el).forEach(([k,v]) => must(v, k));

/***********************
 * UI HELPERS
 ***********************/
function setAuthError(message) {
  el.authError.textContent = message || "";
}

function setLoginBusy(on) {
  el.btnLogin.disabled = !!on;
  el.btnResetPassword.disabled = !!on;
  el.btnLogin.textContent = on ? "Signing in..." : "Sign in";
}

function setPasswordSetupError(message) {
  el.passwordSetupError.textContent = message || "";
}

function setPasswordSetupBusy(on) {
  el.btnSetPassword.disabled = !!on;
  el.btnSetPassword.textContent = on ? "Setting password..." : "Set Password";
}

function isInviteCallbackUrl() {
  const combined = `${window.location.search || ""}&${window.location.hash || ""}`.toLowerCase();
  return combined.includes("type=invite") || combined.includes("type=recovery");
}

function clearAuthCallbackUrl() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

function showSignedOut() {
  currentUser = null;
  isPlatformAdmin = false;
  companies = [];
  platformCompanies = [];
  companyAdminEmployees = [];
  companyAdminSites = [];
  companyAdminSupervisors = [];
  companyAdminEvents = [];
  billingClients = [];
  billingItems = [];
  billingQuotes = [];
  billingInvoices = [];
  billingRecurringInvoices = [];
  billingRecurringRuns = [];
  billingQuoteLines = [];
  billingInvoiceLines = [];
  billingRecurringLines = [];
  companyPayrollRules = null;
  editingEvent = null;
  selectedPlatformCompanyId = "";
  currentCompanyId = "";
  currentCompanyName = "";
  currentCompanyRole = "";
  currentCompanyEmployeeId = "";
  jobsContextVersion++;
  window.dispatchEvent(new Event("shiftly:company-context"));
  selectedSiteId = "";
  sites = [];
  queue.clear();
  setAdminUI(false);
  isPasswordSetupMode = false;
  el.loginForm.hidden = false;
  el.passwordSetupForm.hidden = true;
  el.authScreen.hidden = false;
  el.appShell.hidden = true;
  el.platformShell.hidden = true;
  el.portfolioShell.hidden = true;
  el.companyAdminShell.hidden = true;
  el.billingShell.hidden = true;
  el.employeeShell.hidden = true;
  stopScanning();
}

function showPasswordSetup() {
  isPasswordSetupMode = true;
  setAuthError("");
  setPasswordSetupError("");
  el.loginForm.hidden = true;
  el.passwordSetupForm.hidden = false;
  el.authScreen.hidden = false;
  el.appShell.hidden = true;
  el.platformShell.hidden = true;
  el.portfolioShell.hidden = true;
  el.companyAdminShell.hidden = true;
  el.billingShell.hidden = true;
  el.newPassword.value = "";
  el.confirmPassword.value = "";
  setTimeout(() => el.newPassword.focus(), 0);
}

function showSignedIn() {
  isPasswordSetupMode = false;
  el.authScreen.hidden = true;
  el.platformShell.hidden = true;
  el.portfolioShell.hidden = true;
  el.companyAdminShell.hidden = true;
  el.billingShell.hidden = true;
  el.employeeShell.hidden = true;
  el.appShell.hidden = false;
  el.companyLabel.textContent = currentCompanyName || "Company workspace";
  el.userLabel.textContent = currentUser?.email || "Signed in";
  el.btnBackToCompanyDashboard.hidden = !canUseCompanyDashboard();
  el.btnBackToPortfolio.hidden = companies.length <= 1;
  el.btnOpenEmployeeDashboard.hidden = !canUseEmployeeDashboard();
  updateTeamStatusButton();
}

async function showPlatformDashboard() {
  await stopScanning();
  el.authScreen.hidden = true;
  el.appShell.hidden = true;
  el.portfolioShell.hidden = true;
  el.companyAdminShell.hidden = true;
  el.billingShell.hidden = true;
  el.employeeShell.hidden = true;
  el.platformShell.hidden = false;
  el.platformUserLabel.textContent = currentUser?.email || "Platform admin";
  try {
    await loadPlatformCompanies();
  } catch (error) {
    console.error("Platform dashboard failed:", error);
    alert("Signed in, but the platform dashboard could not load: " + (error.message || error));
  }
}

async function showPortfolioDashboard() {
  await stopScanning();
  el.authScreen.hidden = true;
  el.appShell.hidden = true;
  el.platformShell.hidden = true;
  el.companyAdminShell.hidden = true;
  el.billingShell.hidden = true;
  el.employeeShell.hidden = true;
  el.portfolioShell.hidden = false;
  el.portfolioUserLabel.textContent = currentUser?.email || "Signed in";
  renderPortfolioCompanies();
  await hydratePortfolioStats();
}

async function showCompanyAdminDashboard() {
  await stopScanning();
  el.authScreen.hidden = true;
  el.appShell.hidden = true;
  el.platformShell.hidden = true;
  el.portfolioShell.hidden = true;
  el.employeeShell.hidden = true;
  el.billingShell.hidden = true;
  el.companyAdminShell.hidden = false;
  el.companyAdminUserLabel.textContent = currentUser?.email || "Company admin";
  el.btnCompanyAdminPortfolio.hidden = companies.length <= 1;
  el.btnCompanyAdminEmployeeDashboard.hidden = !canUseEmployeeDashboard();
  el.btnOpenBilling.hidden = !canUseBilling();
  setDefaultPayrollDates();
  renderCompanyAdminSwitch();
  try {
    await loadCompanyAdminDetail();
  } catch (error) {
    console.error("Company dashboard failed:", error);
    alert("Signed in, but the company dashboard could not load: " + (error.message || error));
  }
}

async function showEmployeeDashboard(returnTarget = "clocking") {
  await stopScanning();
  if (!canUseEmployeeDashboard()) {
    alert("This login is not linked to an employee record yet.");
    return;
  }
  employeeDashboardReturn = returnTarget;
  el.authScreen.hidden = true;
  el.appShell.hidden = true;
  el.platformShell.hidden = true;
  el.portfolioShell.hidden = true;
  el.companyAdminShell.hidden = true;
  el.billingShell.hidden = true;
  el.employeeShell.hidden = false;
  el.btnEmployeePortfolio.hidden = companies.length <= 1;
  el.btnEmployeeBack.hidden = returnTarget === "employee";
  el.employeeDashboardCompany.textContent = currentCompanyName || "Company workspace";
  el.employeeDashboardUser.textContent = currentUser?.email || "Signed in";
  if (!el.employeePeriodStart.value) el.employeePeriodStart.value = el.payrollStartDate?.value || localDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  if (!el.employeePeriodEnd.value) el.employeePeriodEnd.value = el.payrollEndDate?.value || localDateInputValue(new Date());
  await loadEmployeeDashboard();
}

async function loadEmployeeDashboard() {
  const company = currentCompany();
  const employeeId = String(currentCompanyEmployeeId || "").trim().toUpperCase();
  if (!company || !employeeId) return;
  employeeDashboardPayslipRow = null;

  const start = el.employeePeriodStart.value;
  const end = el.employeePeriodEnd.value;
  if (!start || !end) return alert("Choose a date range.");
  if (start > end) return alert("Start date must be before the end date.");

  el.btnRunEmployeeDashboard.disabled = true;
  el.btnRunEmployeeDashboard.textContent = "Refreshing...";
  try {
    const [
      { data: employee, error: employeeError },
      { data: events, error: eventError },
      loadedPayrollRules,
      employeeDeductions,
      employeeAdjustments,
      loadedLevyPeriod,
      loadedYtdContext
    ] = await Promise.all([
      fetchEmployeeForDashboard(company.id, employeeId),
      sb.from("clock_events")
        .select("entry_id,company_id,created_at,action,employee_id,employee_name,site_id,site_name,result,message")
        .eq(COMPANY_ID_COL, company.id)
        .eq("employee_id", employeeId)
        .gte("created_at", dateStartIso(start))
        .lte("created_at", dateEndIso(end))
        .order("created_at", { ascending: false }),
      fetchCompanyPayrollRules(company),
      fetchPayrollDeductions(company, start, end, employeeId),
      fetchPayrollAdjustments(company, start, end, employeeId),
      fetchPayrollLevyPeriod(company, start, end),
      fetchPayrollYtdContext(company, start, end, employeeId)
    ]);
    if (employeeError) throw employeeError;
    if (eventError) throw eventError;
    if (!employee) throw new Error(`Employee ${employeeId} was not found.`);

    companyPayrollRules = loadedPayrollRules;
    const adjustedRows = attachAdjustmentsToPayrollRows(
      calculatePayroll(events || [], [employee], companyPayrollRules),
      employeeAdjustments,
      companyPayrollRules
    );
    validatePayrollYtdContinuity(adjustedRows, loadedYtdContext, end);
    const payroll = attachDeductionsToPayrollRows(
      adjustedRows,
      trElectricalAutomaticLevyDeductions(adjustedRows, employeeDeductions, loadedLevyPeriod, company),
      companyPayrollRules,
      loadedYtdContext
    )[0] || {
      employee_id: employeeId,
      employee_name: employee.full_name || "",
      hours: 0,
      gross: employee.pay_type === "monthly" ? Number(employee.rate || 0) : 0,
      net: employee.pay_type === "monthly" ? Number(employee.rate || 0) : 0,
      totalDeductions: 0,
      deductions: [],
      adjustments: [],
      breakdown: {}
    };
    const b = payroll.breakdown || {};
    employeeDashboardPayslipRow = payroll;
    el.employeeDashboardName.textContent = employee.full_name || "Employee";
    el.employeeDashboardMeta.textContent = `Employee ID ${employee.employee_id || employeeId}`;
    el.employeeDashboardPay.textContent = formatEmployeePay(employee);
    el.employeeDashboardIdNumber.textContent = employee.id_number || "-";
    el.employeeDashboardEmploymentDate.textContent = formatPayslipDate(employee.employment_date);
    el.employeeTotalHours.textContent = formatHours(payroll.hours || 0);
    el.employeeGrossPay.textContent = formatMoney(payroll.gross || 0);
    el.employeeNormalHours.textContent = `${formatHours(b.normalHours || 0)} hrs`;
    el.employeeNormalPay.textContent = formatMoney(b.normalPay || 0);
    el.employeeOt1Hours.textContent = `${formatHours(b.ot1Hours || 0)} hrs`;
    el.employeeOt1Pay.textContent = formatMoney(b.ot1Pay || 0);
    el.employeeOt2Hours.textContent = `${formatHours(b.ot2Hours || 0)} hrs`;
    el.employeeOt2Pay.textContent = formatMoney(b.ot2Pay || 0);
    renderPlatformEvents(events || [], el.employeeEventsBody);
  } catch (error) {
    employeeDashboardPayslipRow = null;
    alert(`Failed to load employee dashboard: ${error.message || error}`);
  } finally {
    el.btnRunEmployeeDashboard.disabled = false;
    el.btnRunEmployeeDashboard.textContent = "Refresh";
  }
}

async function fetchEmployeeForDashboard(companyId, employeeId) {
  const withDetails = await sb.from("employees")
    .select("employee_id,full_name,id_number,employment_date,rate,pay_type,pay_cycle,nbcei_designation_code,sbf_member,saewa_member,active")
    .eq(COMPANY_ID_COL, companyId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (!withDetails.error) return withDetails;
  if (!/(id_number|employment_date|rate|pay_type|pay_cycle|nbcei_designation_code|sbf_member|saewa_member)/i.test(withDetails.error.message || "")) return withDetails;

  console.warn("Employee dashboard columns not found yet. Falling back:", withDetails.error.message);
  return sb.from("employees")
    .select("employee_id,full_name,active")
    .eq(COMPANY_ID_COL, companyId)
    .eq("employee_id", employeeId)
    .maybeSingle();
}

async function closeEmployeeDashboard() {
  if (employeeDashboardReturn === "portfolio") await showPortfolioDashboard();
  else if (employeeDashboardReturn === "company") await showCompanyAdminDashboard();
  else await bootWorkspace();
}

function populateCompanySelect() {
  el.companySelect.innerHTML = "";
  for (const c of companies) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    el.companySelect.appendChild(opt);
  }
  el.companySelect.value = currentCompanyId;
  el.companySelect.hidden = companies.length <= 1;
}

function setMode(next) {
  mode = next;
  el.btnIn.classList.toggle("active", mode === "IN");
  el.btnOut.classList.toggle("active", mode === "OUT");
  updateSubmit();
}

function showSitePicker(show) {
  el.pickerPanel.classList.toggle("show", !!show);
}
function toggleSitePicker() {
  showSitePicker(!el.pickerPanel.classList.contains("show"));
}

function updateSiteName() {
  const s = sites.find(x => String(x[SITES_ID_COL]) === String(selectedSiteId));
  el.siteName.textContent = s ? s[SITES_NAME_COL] : "—";
}

function updateSubmit() {
  const n = queue.size;
  el.qCount.textContent = String(n);
  el.btnClear.disabled = (n === 0);

  // NOTE: we still only check "not empty" here.
  // Your RPC will enforce if it's a supervisor code.
  const canSubmit = (n > 0) && !!selectedSiteId && !!el.supCode.value.trim();
  el.btnSubmit.disabled = !canSubmit;
  el.btnSubmit.textContent = `Submit ${mode === "IN" ? "Clock IN" : "Clock OUT"} (${n})`;
}

function setAdminUI(on) {
  isAdmin = !!on;
  el.adminPanel.classList.toggle("show", isAdmin);
}

/***********************
 * QUEUE RENDER
 ***********************/
function renderQueue() {
  el.queueList.innerHTML = "";

  if (queue.size === 0) {
    el.queueList.innerHTML = `
      <div style="margin-top:14px;padding:14px;border-radius:16px;border:1px solid rgba(212,175,55,0.16);background:rgba(255,255,255,0.03);">
        <b style="color:#F3F2EE;font-weight:900;display:block;margin-bottom:6px;font-size:12px;">No scans yet</b>
        <span style="color:#B7B0A3; font-size:12px;">Scan employee QR cards. They will appear here automatically.</span>
      </div>
    `;
    updateSubmit();
    return;
  }

  for (const [id, emp] of queue.entries()) {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="empInfo">
        <div class="empLine">
          <span class="empId">${escapeHtml(emp.id)}</span>
          <span class="empName">${escapeHtml(emp.name || "")}</span>
        </div>
        <div class="empMeta">
          <span class="readyChip"><span class="readyDot"></span>Ready to submit</span>
        </div>
      </div>
      <button class="removeBtn" type="button" aria-label="Remove from queue">
        <i class="ph ph-trash-simple"></i>
      </button>
    `;

    div.querySelector("button").addEventListener("click", () => {
      div.classList.add("removing");
      setTimeout(() => {
        queue.delete(id);
        renderQueue();
      }, 180);
    });

    el.queueList.appendChild(div);
  }

  updateSubmit();
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function vibrate(ms){
  try { navigator.vibrate && navigator.vibrate(ms); } catch {}
}

/***********************
 * AUTH + COMPANY ACCESS
 ***********************/
async function signIn(email, password) {
  if (!sb) {
    setAuthError("Add your test Supabase URL and anon key in public/config.js first.");
    return;
  }

  setAuthError("");
  setLoginBusy(true);

  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;

    currentUser = data.user;
    await routeCurrentUser();
  } catch (e) {
    console.error(e);
    if (!currentUser) showSignedOut();
    setAuthError(e.message || "Unable to sign in.");
  } finally {
    setLoginBusy(false);
  }
}

async function signOut() {
  await stopScanning();
  await sb.auth.signOut();
  showSignedOut();
}

async function routeCurrentUser() {
  isPlatformAdmin = await checkPlatformAdmin();
  if (isPlatformAdmin) {
    await showPlatformDashboard();
    return;
  }

  await loadCompanyAccess();
  const defaultBillingCompany = String(currentUser?.id || "") === DEFAULT_BILLING_USER_ID
    ? companies.find((company) => company.id === DEFAULT_BILLING_COMPANY_ID)
    : null;
  if (defaultBillingCompany) {
    setCurrentCompany(defaultBillingCompany);
    if (canUseBilling()) {
      await showBillingDashboard();
      return;
    }
  }
  if (companies.length > 1) {
    await showPortfolioDashboard();
    return;
  }
  if (canUseCompanyDashboard()) {
    await showCompanyAdminDashboard();
    return;
  }
  if (canUseBilling()) {
    await showBillingDashboard();
    return;
  }
  if (canUseClocking()) {
    await bootWorkspace();
    return;
  }
  if (isEmployeeOnly() && canUseEmployeeDashboard()) {
    await showEmployeeDashboard("employee");
    return;
  }

  showSignedOut();
  setAuthError("This login is not linked to a clocking role or employee dashboard yet.");
}

async function completePasswordSetup(event) {
  event.preventDefault();
  if (!sb) return;

  const password = el.newPassword.value;
  const confirmPassword = el.confirmPassword.value;
  setPasswordSetupError("");

  if (password.length < 8) return setPasswordSetupError("Password must be at least 8 characters.");
  if (password !== confirmPassword) return setPasswordSetupError("Passwords do not match.");

  setPasswordSetupBusy(true);
  try {
    const { data, error } = await sb.auth.updateUser({ password });
    if (error) throw error;

    currentUser = data.user || currentUser;
    clearAuthCallbackUrl();
    isPasswordSetupMode = false;
    await routeCurrentUser();
  } catch (e) {
    console.error(e);
    setPasswordSetupError(e.message || "Could not set password.");
  } finally {
    setPasswordSetupBusy(false);
  }
}

async function sendPasswordReset() {
  if (!sb) return;
  const email = el.loginEmail.value.trim().toLowerCase();
  if (!email) return setAuthError("Enter your email first, then tap set or reset password.");

  setAuthError("");
  el.btnResetPassword.disabled = true;
  el.btnResetPassword.textContent = "Sending...";
  try {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    if (error) throw error;
    setAuthError("Password email sent. Open the link, then set your password.");
  } catch (e) {
    console.error(e);
    setAuthError(e.message || "Could not send password email.");
  } finally {
    el.btnResetPassword.disabled = false;
    el.btnResetPassword.textContent = "Set or reset password";
  }
}

async function checkPlatformAdmin() {
  if (!currentUser) return false;

  try {
    const { data, error } = await sb.rpc("is_platform_admin", {
      p_user_id: currentUser.id
    });
    if (!error) return data === true;
  } catch (e) {
    console.warn("Platform admin RPC check failed:", e);
  }

  try {
    const { data, error } = await sb
      .from(PLATFORM_ADMINS_TABLE)
      .select("user_id")
      .eq("user_id", currentUser.id)
      .eq("active", true)
      .maybeSingle();
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

async function loadCompanyAccess() {
  // Clear only Jobs entitlement while access refreshes, including failed refreshes.
  companies.forEach(company => { company.jobs_enabled = false; });
  jobsContextVersion++;
  window.dispatchEvent(new Event("shiftly:company-context"));
  if (!currentUser) throw new Error("Sign in required.");

  let { data: memberships, error: membershipError } = await sb
    .from(COMPANY_USERS_TABLE)
    .select(`${COMPANY_USERS_COMPANY_COL},${COMPANY_USERS_ROLE_COL},${COMPANY_USERS_ACTIVE_COL},employee_id,billing_access`)
    .eq(COMPANY_USERS_USER_COL, currentUser.id)
    .eq(COMPANY_USERS_ACTIVE_COL, true);

  if (membershipError && /(employee_id|billing_access)/i.test(membershipError.message || "")) {
    const retry = await sb
      .from(COMPANY_USERS_TABLE)
      .select(`${COMPANY_USERS_COMPANY_COL},${COMPANY_USERS_ROLE_COL},${COMPANY_USERS_ACTIVE_COL}`)
      .eq(COMPANY_USERS_USER_COL, currentUser.id)
      .eq(COMPANY_USERS_ACTIVE_COL, true);
    memberships = retry.data;
    membershipError = retry.error;
  }

  if (membershipError) {
    throw new Error(`Company access is not configured yet. Run database/multi-company-setup.sql, then invite this user. (${membershipError.message})`);
  }

  const ids = [...new Set((memberships || []).map(x => x[COMPANY_USERS_COMPANY_COL]).filter(Boolean))];
  if (ids.length === 0) throw new Error("This login is not assigned to a company workspace yet.");

  let { data: companyRows, error: companyError } = await sb
    .from(COMPANIES_TABLE)
    .select("id,name,plan,status,logo_url,billing_enabled,jobs_enabled")
    .in("id", ids)
    .eq("status", "active")
    .order("name", { ascending: true });

  if (companyError && /jobs_enabled/i.test(companyError.message || "")) {
    const retry = await sb
      .from(COMPANIES_TABLE)
      .select("id,name,plan,status,logo_url,billing_enabled")
      .in("id", ids)
      .eq("status", "active")
      .order("name", { ascending: true });
    companyRows = retry.data;
    companyError = retry.error;
  }

  if (companyError && /(logo_url|billing_enabled)/i.test(companyError.message || "")) {
    const retry = await sb
      .from(COMPANIES_TABLE)
      .select("id,name,plan,status")
      .in("id", ids)
      .eq("status", "active")
      .order("name", { ascending: true });
    companyRows = retry.data;
    companyError = retry.error;
  }

  if (companyError) throw companyError;
  if (!companyRows || companyRows.length === 0) throw new Error("No active company workspace found for this login.");

  const membershipByCompany = new Map(
    (memberships || []).map(m => [String(m[COMPANY_USERS_COMPANY_COL]), m])
  );

  companies = companyRows.map(c => ({
    id: String(c.id),
    name: c.name || "Company",
    plan: c.plan || "standard",
    logo_url: c.logo_url || "",
    role: membershipByCompany.get(String(c.id))?.[COMPANY_USERS_ROLE_COL] || "supervisor",
    employee_id: membershipByCompany.get(String(c.id))?.employee_id || "",
    billing_enabled: c.billing_enabled === true,
    jobs_enabled: c.jobs_enabled === true,
    billing_access: membershipByCompany.get(String(c.id))?.billing_access === true
  }));

  if (!currentCompanyId || !companies.some(c => c.id === currentCompanyId)) {
    currentCompanyId = companies[0].id;
  }
  currentCompanyName = companies.find(c => c.id === currentCompanyId)?.name || "";
  currentCompanyRole = companies.find(c => c.id === currentCompanyId)?.role || "";
  currentCompanyEmployeeId = companies.find(c => c.id === currentCompanyId)?.employee_id || "";
  jobsContextVersion++;
  window.dispatchEvent(new Event("shiftly:company-context"));
  populateCompanySelect();
}

function canUseCompanyDashboard() {
  return ["owner", "admin"].includes(String(currentCompanyRole || "").toLowerCase());
}

function canUseBilling() {
  const company = currentCompany();
  const hasBillingRole = ["owner", "admin"].includes(String(currentCompanyRole || "").toLowerCase());
  return hasBillingRole && company?.billing_enabled === true && company?.billing_access === true;
}

function canUseClocking() {
  return ["owner", "admin", "supervisor"].includes(String(currentCompanyRole || "").toLowerCase());
}

function canUseEmployeeDashboard() {
  return !!String(currentCompanyEmployeeId || "").trim();
}

function canUseTeamStatus() {
  return String(currentCompanyRole || "").toLowerCase() === "supervisor";
}

function updateTeamStatusButton() {
  if (!el.btnTeamStatus) return;
  const show = canUseTeamStatus();
  el.btnTeamStatus.hidden = !show;
  el.btnTeamStatus.closest(".seg")?.classList.toggle("hasStatus", show);
}

function isEmployeeOnly() {
  return String(currentCompanyRole || "").toLowerCase() === "employee";
}

function setCurrentCompany(company) {
  if (!company) return false;
  currentCompanyId = company.id;
  currentCompanyName = company.name || "";
  currentCompanyRole = company.role || "";
  currentCompanyEmployeeId = company.employee_id || "";
  jobsContextVersion++;
  window.dispatchEvent(new Event("shiftly:company-context"));
  selectedSiteId = "";
  queue.clear();
  renderQueue();
  return true;
}

async function openPortfolioCompany(companyId) {
  const company = companies.find(c => c.id === companyId);
  if (!setCurrentCompany(company)) return;

  if (canUseCompanyDashboard()) {
    await showCompanyAdminDashboard();
    return;
  }
  if (isEmployeeOnly() && canUseEmployeeDashboard()) {
    await showEmployeeDashboard("portfolio");
    return;
  }
  if (canUseBilling()) {
    await showBillingDashboard();
    return;
  }
  if (canUseClocking()) {
    await bootWorkspace();
    return;
  }
  if (canUseEmployeeDashboard()) {
    await showEmployeeDashboard("portfolio");
    return;
  }
  alert("This company is not linked to a usable role yet.");
}

async function switchCompany(companyId) {
  const company = companies.find(c => c.id === companyId);
  if (!setCurrentCompany(company)) return;
  showSignedIn();
  await loadSites();
}

function adminCompanies() {
  return companies.filter(x => ["owner", "admin"].includes(String(x.role || "").toLowerCase()));
}

function currentAdminCompanyIndex() {
  const list = adminCompanies();
  const index = list.findIndex((company) => company.id === currentCompanyId);
  return index >= 0 ? index + 1 : 1;
}

function renderCompanyAdminSwitch() {
  if (!el.btnCompanyAdminSwitch) return;
  const list = adminCompanies();
  el.btnCompanyAdminSwitch.textContent = String(currentAdminCompanyIndex());
  el.btnCompanyAdminSwitch.hidden = list.length <= 1;
  renderCompanySwitchList();
}

function renderCompanySwitchList() {
  if (!el.companySwitchList) return;
  const list = adminCompanies();
  el.companySwitchList.innerHTML = "";
  if (!list.length) {
    el.companySwitchList.innerHTML = `<div class="emptyState">No company workspaces found.</div>`;
    return;
  }
  list.forEach((company, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "companySwitchOption";
    button.classList.toggle("active", company.id === currentCompanyId);
    button.innerHTML = `
      <span class="companySwitchIndex">${index + 1}</span>
      <span class="companySwitchName">
        <b>${escapeHtml(company.name || "Company")}</b>
        <span>${escapeHtml([company.plan || "", company.role || ""].filter(Boolean).join(" • "))}</span>
      </span>
      <span class="companySwitchCheck">${company.id === currentCompanyId ? '<i class="ph ph-check"></i>' : ""}</span>
    `;
    button.addEventListener("click", async () => {
      closeCompanySwitchModal();
      await switchCompanyAdmin(company.id);
    });
    el.companySwitchList.appendChild(button);
  });
}

function openCompanySwitchModal() {
  renderCompanySwitchList();
  el.companySwitchModal.classList.add("show");
  el.companySwitchModal.setAttribute("aria-hidden", "false");
}

function closeCompanySwitchModal() {
  el.companySwitchModal.classList.remove("show");
  el.companySwitchModal.setAttribute("aria-hidden", "true");
}

async function switchCompanyAdmin(companyId) {
  const company = companies.find(c => c.id === companyId);
  if (!setCurrentCompany(company)) return;
  el.btnCompanyAdminEmployeeDashboard.hidden = !canUseEmployeeDashboard();
  renderCompanyAdminSwitch();
  await loadCompanyAdminDetail();
}

async function bootWorkspace() {
  showSignedIn();
  renderQueue();
  await loadSites();
  await startScanning();
  checkAdminCodeDebounced();
}

async function hydratePortfolioStats() {
  const stats = await Promise.all(companies.map(async (company) => ({
    companyId: company.id,
    stats: await fetchPortfolioStats(company.id)
  })));

  for (const item of stats) {
    const card = el.portfolioCompanyList.querySelector(`[data-company-id="${CSS.escape(item.companyId)}"]`);
    if (!card) continue;
    for (const [key, value] of Object.entries(item.stats || {})) {
      const target = card.querySelector(`[data-stat="${key}"]`);
      if (target) target.textContent = value == null ? "-" : String(value);
    }
  }
}

async function fetchPortfolioStats(companyId) {
  const today = localDateInputValue(new Date());
  const safeCount = async (query) => {
    try {
      const { count, error } = await query;
      if (error) return null;
      return count ?? 0;
    } catch {
      return null;
    }
  };

  const [users, employees, sites, events] = await Promise.all([
    safeCount(sb.from(COMPANY_USERS_TABLE)
      .select(COMPANY_USERS_COMPANY_COL, { count: "exact", head: true })
      .eq(COMPANY_USERS_COMPANY_COL, companyId)
      .eq(COMPANY_USERS_ACTIVE_COL, true)),
    safeCount(sb.from("employees")
      .select("employee_id", { count: "exact", head: true })
      .eq(COMPANY_ID_COL, companyId)
      .eq("active", true)),
    safeCount(sb.from(SITES_TABLE)
      .select(SITES_ID_COL, { count: "exact", head: true })
      .eq(COMPANY_ID_COL, companyId)
      .eq(SITES_ACTIVE_COL, true)),
    safeCount(sb.from("clock_events")
      .select("entry_id", { count: "exact", head: true })
      .eq(COMPANY_ID_COL, companyId)
      .gte("created_at", dateStartIso(today))
      .lte("created_at", dateEndIso(today)))
  ]);

  return { users, employees, sites, events };
}

function renderPortfolioCompanies() {
  el.portfolioCompanyCount.textContent = String(companies.length);
  el.portfolioCompanyList.innerHTML = "";

  if (!companies.length) {
    el.portfolioCompanyList.innerHTML = `<div class="emptyState">No companies are linked to this login yet.</div>`;
    return;
  }

  for (const company of companies) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "portfolioCard";
    card.dataset.companyId = company.id;
    const logoHtml = company.logo_url
      ? `<img src="${escapeHtml(company.logo_url)}" alt="${escapeHtml(company.name)} logo"/>`
      : `<i class="ph ph-buildings"></i>`;
    card.innerHTML = `
      <div class="portfolioCardHead">
        <div class="portfolioCompany">
          <div class="companyLogoMark">${logoHtml}</div>
          <div>
            <div class="portfolioName">${escapeHtml(company.name)}</div>
            <div class="portfolioMeta">${escapeHtml(company.plan || "premium")} &bull; ${escapeHtml(company.id)}</div>
          </div>
        </div>
        <span class="statusPill">${escapeHtml(capitalizeWord(company.role || "user"))}</span>
      </div>
      <div class="portfolioStats">
        <div class="portfolioStat"><b data-stat="users">-</b><span>Users</span></div>
        <div class="portfolioStat"><b data-stat="employees">-</b><span>Employees</span></div>
        <div class="portfolioStat"><b data-stat="sites">-</b><span>Sites</span></div>
        <div class="portfolioStat"><b data-stat="events">-</b><span>Today</span></div>
      </div>
    `;
    card.addEventListener("click", () => openPortfolioCompany(company.id));
    el.portfolioCompanyList.appendChild(card);
  }
}

/***********************
 * PLATFORM DASHBOARD
 ***********************/
function companySlugFromName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function renderPlatformCompanies() {
  const activeCount = platformCompanies.filter(c => String(c.status || "active") === "active").length;
  el.platformCompanyCount.textContent = String(activeCount);
  el.platformCompanyList.innerHTML = "";

  if (platformCompanies.length === 0) {
    el.platformCompanyList.innerHTML = `<div class="mutedText">No companies yet.</div>`;
    return;
  }

  for (const company of platformCompanies) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "companyCard";
    btn.classList.toggle("active", company.id === selectedPlatformCompanyId);
    btn.innerHTML = `
      <b>${escapeHtml(company.name)}</b>
      <span>${escapeHtml(company.slug || "no-slug")} &bull; ${escapeHtml(company.plan || "premium")} &bull; ${escapeHtml(company.status || "active")}</span>
    `;
    btn.addEventListener("click", () => selectPlatformCompany(company.id));
    el.platformCompanyList.appendChild(btn);
  }
}

function setPlatformStats({ users = 0, employees = 0, sites = 0, events = 0 } = {}) {
  el.statUsers.textContent = String(users);
  el.statEmployees.textContent = String(employees);
  el.statSites.textContent = String(sites);
  el.statEvents.textContent = String(events);
}

function renderCompanyLogo(target, company) {
  const url = String(company?.logo_url || "").trim();
  if (url) {
    target.innerHTML = `<img src="${escapeHtml(url)}" alt="${escapeHtml(company?.name || "Company")} logo"/>`;
  } else {
    target.innerHTML = `<i class="ph ph-buildings"></i>`;
  }
}

function renderPlatformEvents(events, body = el.platformEventsBody, options = {}) {
  body.innerHTML = "";

  if (!events || events.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="mutedText">No clock events yet.</td></tr>`;
    return;
  }

  for (const event of events) {
    const tr = document.createElement("tr");
    const whenDate = event.created_at ? new Date(event.created_at).toLocaleDateString() : "-";
    const whenTime = event.created_at ? new Date(event.created_at).toLocaleTimeString() : "";
    const result = String(event.result || "").toUpperCase();
    const automaticClockOut = String(event.message || "").startsWith("AUTO CLOCK-OUT FLAG:");
    const resultLabel = automaticClockOut ? "AUTO OUT" : result;
    const resultClass = automaticClockOut ? "resultAuto" : result === "OK" ? "resultOk" : "resultBlocked";
    const canEditTime = !!options.editTime && event.entry_id;
    const timeCell = canEditTime
      ? `<button class="timeEditBtn" type="button" data-event-id="${escapeHtml(event.entry_id)}">${escapeHtml(whenDate)}<span class="mutedText">${escapeHtml(whenTime)}</span></button>`
      : `${escapeHtml(whenDate)}<br/><span class="mutedText">${escapeHtml(whenTime)}</span>`;
    tr.innerHTML = `
      <td>${timeCell}</td>
      <td>
        <button class="detailToggle" type="button">${escapeHtml(event.employee_id || "")}</button>
        <div class="cellDetail">${escapeHtml(event.employee_name || "")}</div>
      </td>
      <td>${escapeHtml(event.action || "")}</td>
      <td>
        <button class="detailToggle" type="button">${escapeHtml(event.site_id || "")}</button>
        <div class="cellDetail">${escapeHtml(event.site_name || "")}</div>
      </td>
      <td>
        <button class="detailToggle ${resultClass}" type="button">${escapeHtml(resultLabel || "")}</button>
        <div class="cellDetail">${escapeHtml(event.message || "")}</div>
      </td>
    `;
    tr.querySelectorAll(".detailToggle").forEach((button) => {
      button.addEventListener("click", () => {
        const detail = button.nextElementSibling;
        if (detail) detail.classList.toggle("show");
      });
    });
    const timeButton = tr.querySelector(".timeEditBtn");
    if (timeButton) {
      timeButton.addEventListener("click", () => openEventTimeEditor(timeButton.getAttribute("data-event-id")));
    }
    body.appendChild(tr);
  }
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCompanyClockEvents() {
  const company = currentCompany();
  if (!company) return alert("Select a company first.");
  if (!companyAdminEvents.length) return alert("No clock events to export.");

  const headers = [
    "company_name",
    "company_id",
    "entry_id",
    "created_at",
    "action",
    "employee_id",
    "employee_name",
    "site_id",
    "site_name",
    "result",
    "message"
  ];
  const rows = companyAdminEvents.map((event) => [
    company.name || "",
    company.id || "",
    event.entry_id || "",
    event.created_at || "",
    event.action || "",
    event.employee_id || "",
    event.employee_name || "",
    event.site_id || "",
    event.site_name || "",
    event.result || "",
    event.message || ""
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const slug = String(company.slug || company.name || "company").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "company";
  link.href = url;
  link.download = `${slug}-clock-events.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function localDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setDefaultPayrollDates() {
  if (!el.payrollStartDate || !el.payrollEndDate) return;
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  if (!el.payrollStartDate.value) el.payrollStartDate.value = localDateInputValue(firstDay);
  if (!el.payrollEndDate.value) el.payrollEndDate.value = localDateInputValue(today);
}

function dateStartIso(value) {
  return new Date(`${value}T00:00:00`).toISOString();
}

function dateEndIso(value) {
  return new Date(`${value}T23:59:59.999`).toISOString();
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "R0.00";
  return `R${n.toFixed(2)}`;
}

function formatHours(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

function formatDays(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

function dailyDayCount(row) {
  return Number(row?.breakdown?.normalDays || 0);
}

function payrollQuantityLabel(row, includeUnit = false) {
  if (String(row?.pay_type || "").toLowerCase() === "daily") {
    const days = dailyDayCount(row);
    const label = formatDays(days);
    if (!includeUnit) return label;
    return `${label} ${Math.abs(days - 1) < 0.0001 ? "day" : "days"}`;
  }
  return `${formatHours(row?.hours || 0)}${includeUnit ? " hrs" : ""}`;
}

function payrollCsvFileName(company) {
  const slug = String(company?.slug || company?.name || "company").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "company";
  const start = el.payrollStartDate?.value || "start";
  const end = el.payrollEndDate?.value || "end";
  return `${slug}-payroll-${start}-to-${end}.csv`;
}

const WORK_WEEK_DAYS = Object.freeze([
  { key: "mon", short: "Mon", dayIndex: 1 },
  { key: "tue", short: "Tue", dayIndex: 2 },
  { key: "wed", short: "Wed", dayIndex: 3 },
  { key: "thu", short: "Thu", dayIndex: 4 },
  { key: "fri", short: "Fri", dayIndex: 5 },
  { key: "sat", short: "Sat", dayIndex: 6 },
  { key: "sun", short: "Sun", dayIndex: 0 }
]);

const DEFAULT_WORK_WEEK = Object.freeze({
  mon: { normal_hours: 8, rule: "threshold" },
  tue: { normal_hours: 8, rule: "threshold" },
  wed: { normal_hours: 8, rule: "threshold" },
  thu: { normal_hours: 8, rule: "threshold" },
  fri: { normal_hours: 8, rule: "threshold" },
  sat: { normal_hours: 0, rule: "threshold" },
  sun: { normal_hours: 0, rule: "ot2" }
});

const DEFAULT_PAYROLL_RULES = Object.freeze({
  payroll_profile: "standard",
  overtime_method: "cycle_only",
  weekly_normal_hours: 45,
  fortnightly_normal_hours: 90,
  monthly_normal_hours: 195,
  ot1_multiplier: 1.5,
  ot2_multiplier: 2,
  saturday_rule: "threshold",
  sunday_rule: "ot2",
  public_holiday_rule: "ot2_with_topup",
  public_holiday_standard_hours: 8,
  calculate_uif: false,
  calculate_paye: false,
  work_week_enabled: false,
  work_week: DEFAULT_WORK_WEEK,
  daily_overtime_enabled: false,
  daily_normal_hours: 8,
  lunch_deduction_enabled: false,
  lunch_deduction_minutes: 0
});

function normaliseTimeValue(value, fallback = null) {
  if (typeof value !== "string") return fallback;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return fallback;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function timeValueToMinutes(value) {
  const time = normaliseTimeValue(value);
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function dateAtPayrollMinutes(date, minutes) {
  const next = new Date(date);
  next.setHours(0, minutes, 0, 0);
  return next;
}

function payrollEventTime(event, rules) {
  const raw = String(event?.created_at || "");
  return new Date(raw);
}

function mixocronWallEventTime(event) {
  const raw = String(event?.created_at || "");
  const localWallTime = raw.replace(/([+-]\d{2}:\d{2}|Z)$/i, "");
  const parsed = new Date(localWallTime);
  return Number.isFinite(parsed.getTime()) ? parsed : new Date(raw);
}

function chooseMixocronDayTimes(row, rules, paidStartMinutes, normalEndMinutes, fridayNormalEndMinutes) {
  const rawIns = row.ins.map((event) => mixocronWallEventTime(event)).filter((time) => Number.isFinite(time.getTime()));
  const rawOuts = row.outs.map((event) => mixocronWallEventTime(event)).filter((time) => Number.isFinite(time.getTime()));
  const localIns = row.ins.map((event) => payrollEventTime(event)).filter((time) => Number.isFinite(time.getTime()));
  const localOuts = row.outs.map((event) => payrollEventTime(event)).filter((time) => Number.isFinite(time.getTime()));
  const first = (items) => items.sort((a, b) => a - b)[0] || null;
  const last = (items) => items.sort((a, b) => b - a)[0] || null;
  const rawFirst = first(rawIns);
  const localFirst = first(localIns);
  const minutesOfDay = (time) => time ? time.getHours() * 60 + time.getMinutes() : 0;
  const rawStartsLikeUtc = rawFirst && minutesOfDay(rawFirst) < 6 * 60 + 30;
  const score = (time) => {
    if (!time) return Number.POSITIVE_INFINITY;
    const target = dateAtPayrollMinutes(time, paidStartMinutes);
    return Math.abs(time - target);
  };
  const useLocal = rawStartsLikeUtc || score(localFirst) < score(rawFirst);
  const firstIn = useLocal ? localFirst : rawFirst;
  const rawLast = last(rawOuts);
  const localLast = last(localOuts);
  let lastOut = useLocal ? localLast : rawLast;

  if (firstIn && rawLast && localLast) {
    const dayRule = workWeekForDate(firstIn, rules).rule;
    const isFriday = firstIn.getDay() === 5;
    const endMinutes = isFriday ? fridayNormalEndMinutes : normalEndMinutes;
    const normalEnd = endMinutes === null ? null : dateAtPayrollMinutes(rawLast, endMinutes);
    const localNormalEnd = endMinutes === null ? null : dateAtPayrollMinutes(localLast, endMinutes);
    if (dayRule === "threshold" && normalEnd && localNormalEnd) {
      const rawLastMinutes = minutesOfDay(rawLast);
      lastOut = rawStartsLikeUtc && rawLastMinutes < 15 * 60 ? localLast : rawLast;
    }
  }

  return {
    firstIn,
    lastOut
  };
}

function normaliseWorkWeek(input = DEFAULT_WORK_WEEK) {
  const source = input && typeof input === "object" ? input : DEFAULT_WORK_WEEK;
  const allowed = ["threshold", "normal", "ot1", "ot2"];
  return WORK_WEEK_DAYS.reduce((acc, day) => {
    const row = source[day.key] || {};
    const hours = Number(row.normal_hours);
    const rule = allowed.includes(row.rule) ? row.rule : DEFAULT_WORK_WEEK[day.key].rule;
    acc[day.key] = {
      normal_hours: Number.isFinite(hours) && hours >= 0 ? hours : DEFAULT_WORK_WEEK[day.key].normal_hours,
      rule
    };
    return acc;
  }, {});
}

function workWeekForDate(date, rules) {
  const day = WORK_WEEK_DAYS.find((item) => item.dayIndex === date.getDay());
  return day ? rules.work_week[day.key] : { normal_hours: rules.daily_normal_hours, rule: "threshold" };
}

function normalisePayrollRules(rules = {}) {
  const merged = { ...DEFAULT_PAYROLL_RULES, ...(rules || {}) };
  const numberField = (key) => {
    const value = Number(merged[key]);
    return Number.isFinite(value) && value >= 0 ? value : DEFAULT_PAYROLL_RULES[key];
  };
  const ruleField = (key, allowed) => allowed.includes(merged[key]) ? merged[key] : DEFAULT_PAYROLL_RULES[key];
  const overtimeMethod = ["cycle_only", "daily_cycle", "day_rules"].includes(merged.overtime_method)
    ? merged.overtime_method
    : DEFAULT_PAYROLL_RULES.overtime_method;
  const payrollProfile = ["standard", "mixocron"].includes(merged.payroll_profile)
    ? merged.payroll_profile
    : DEFAULT_PAYROLL_RULES.payroll_profile;
  return {
    payroll_profile: payrollProfile,
    overtime_method: overtimeMethod,
    weekly_normal_hours: numberField("weekly_normal_hours"),
    fortnightly_normal_hours: numberField("fortnightly_normal_hours"),
    monthly_normal_hours: numberField("monthly_normal_hours"),
    ot1_multiplier: Math.max(1, numberField("ot1_multiplier")),
    ot2_multiplier: Math.max(1, numberField("ot2_multiplier")),
    saturday_rule: ruleField("saturday_rule", ["threshold", "normal", "ot1", "ot2"]),
    sunday_rule: ruleField("sunday_rule", ["ot2", "ot1", "threshold", "normal"]),
    public_holiday_rule: ruleField("public_holiday_rule", ["ot2_with_topup", "ot2", "threshold", "normal"]),
    public_holiday_standard_hours: numberField("public_holiday_standard_hours"),
    calculate_uif: merged.calculate_uif === true || merged.calculate_uif === "true",
    calculate_paye: merged.calculate_paye === true || merged.calculate_paye === "true",
    work_week_enabled: overtimeMethod !== "cycle_only" && (merged.work_week_enabled === true || merged.work_week_enabled === "true"),
    work_week: normaliseWorkWeek(merged.work_week),
    daily_overtime_enabled: overtimeMethod === "daily_cycle" && (merged.daily_overtime_enabled === true || merged.daily_overtime_enabled === "true"),
    daily_normal_hours: numberField("daily_normal_hours"),
    lunch_deduction_enabled: merged.lunch_deduction_enabled === true || merged.lunch_deduction_enabled === "true",
    lunch_deduction_minutes: Math.max(0, Math.round(numberField("lunch_deduction_minutes"))),
    paid_start_time: normaliseTimeValue(merged.paid_start_time, "07:30"),
    normal_end_time: normaliseTimeValue(merged.normal_end_time, "16:30"),
    overtime_trigger_time: normaliseTimeValue(merged.overtime_trigger_time, "16:50"),
    friday_normal_end_time: normaliseTimeValue(merged.friday_normal_end_time, "13:30"),
    friday_overtime_trigger_time: normaliseTimeValue(merged.friday_overtime_trigger_time, "13:50")
  };
}

function activePayrollRules() {
  return normalisePayrollRules(companyPayrollRules || DEFAULT_PAYROLL_RULES);
}

function payrollRuleNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function ruleLabel(value) {
  const labels = {
    cycle_only: "Cycle Only",
    daily_cycle: "Daily + Cycle",
    day_rules: "Day Rules",
    threshold: "Threshold",
    normal: "Normal",
    ot1: "OT1",
    ot2: "OT2",
    ot2_with_topup: "OT2 + top-up"
  };
  return labels[value] || value;
}

function renderWorkWeekTemplate(workWeek) {
  if (!el.workWeekSummary || !el.workWeekEditor) return;
  const block = el.btnToggleWorkWeekEditor?.closest(".workWeekBlock");
  if (block) block.classList.toggle("isEditing", !el.workWeekEditor.hidden);
  const week = normaliseWorkWeek(workWeek);
  el.workWeekSummary.innerHTML = WORK_WEEK_DAYS.map((day) => {
    const row = week[day.key];
    const label = row.rule === "threshold" ? `${formatHours(row.normal_hours)}h` : ruleLabel(row.rule);
    return `<span class="workWeekChip" data-day="${escapeHtml(day.key)}" data-rule="${escapeHtml(row.rule)}">${escapeHtml(day.short)} ${escapeHtml(label)}</span>`;
  }).join("");

  el.workWeekEditor.innerHTML = WORK_WEEK_DAYS.map((day) => {
    const row = week[day.key];
    return `
      <div class="workWeekRow" data-work-week-day="${escapeHtml(day.key)}">
        <div class="workWeekDay">${escapeHtml(day.short)}</div>
        <input class="platformInput" data-work-week-hours="${escapeHtml(day.key)}" inputmode="decimal" value="${escapeHtml(row.normal_hours)}" aria-label="${escapeHtml(day.short)} normal hours"/>
        <select class="platformSelect" data-work-week-rule="${escapeHtml(day.key)}" aria-label="${escapeHtml(day.short)} payroll rule">
          <option value="threshold"${row.rule === "threshold" ? " selected" : ""}>Threshold</option>
          <option value="normal"${row.rule === "normal" ? " selected" : ""}>Normal</option>
          <option value="ot1"${row.rule === "ot1" ? " selected" : ""}>OT1</option>
          <option value="ot2"${row.rule === "ot2" ? " selected" : ""}>OT2</option>
        </select>
      </div>
    `;
  }).join("");
}

function applyPayrollMethodUI(method) {
  if (!el.payrollRulesForm) return;
  const selected = ["cycle_only", "daily_cycle", "day_rules"].includes(method) ? method : DEFAULT_PAYROLL_RULES.overtime_method;
  el.payrollRulesForm.dataset.method = selected;
  if (el.ruleOvertimeMethod) el.ruleOvertimeMethod.value = selected;
  el.payrollRulesForm.querySelectorAll("[data-payroll-method]").forEach((button) => {
    const isActive = button.dataset.payrollMethod === selected;
    button.classList.toggle("isActive", isActive);
    button.setAttribute("aria-checked", isActive ? "true" : "false");
  });
  if (el.workWeekTitle && el.workWeekSubtitle) {
    const labels = {
      cycle_only: {
        title: "Weekend / Holiday Rules",
        subtitle: "Set the special day rules that still apply after the cycle cap."
      },
      daily_cycle: {
        title: "Work Week Template",
        subtitle: "Set each day's normal hours before daily overtime starts."
      },
      day_rules: {
        title: "Day Rule Template",
        subtitle: "Daily hours and overtime by day"
      }
    };
    el.workWeekTitle.textContent = labels[selected].title;
    el.workWeekSubtitle.textContent = labels[selected].subtitle;
  }
}

function readWorkWeekTemplate() {
  const week = {};
  for (const day of WORK_WEEK_DAYS) {
    const hoursEl = el.workWeekEditor.querySelector(`[data-work-week-hours="${day.key}"]`);
    const ruleEl = el.workWeekEditor.querySelector(`[data-work-week-rule="${day.key}"]`);
    week[day.key] = {
      normal_hours: payrollRuleNumber(hoursEl?.value, DEFAULT_WORK_WEEK[day.key].normal_hours),
      rule: ruleEl?.value || DEFAULT_WORK_WEEK[day.key].rule
    };
  }
  return normaliseWorkWeek(week);
}

function renderPayrollRulesForm(rules) {
  if (!el.payrollRulesForm) return;
  const r = normalisePayrollRules(rules);
  el.ruleOvertimeMethod.value = r.overtime_method;
  applyPayrollMethodUI(r.overtime_method);
  el.ruleWeeklyHours.value = r.weekly_normal_hours;
  el.ruleFortnightlyHours.value = r.fortnightly_normal_hours;
  el.ruleMonthlyHours.value = r.monthly_normal_hours;
  el.ruleOt1Multiplier.value = r.ot1_multiplier;
  el.ruleOt2Multiplier.value = r.ot2_multiplier;
  el.ruleHolidayHours.value = r.public_holiday_standard_hours;
  el.rulePublicHoliday.value = r.public_holiday_rule;
  el.ruleLunchMinutes.value = r.lunch_deduction_minutes;
  if (el.ruleCalculateUif) el.ruleCalculateUif.checked = !!r.calculate_uif;
  if (el.ruleCalculatePaye) el.ruleCalculatePaye.checked = !!r.calculate_paye;
  renderWorkWeekTemplate(r.work_week);
  if (el.payrollRulesSummary) {
    el.payrollRulesSummary.textContent = ruleLabel(r.overtime_method);
  }
}

function setPayrollMethod(method) {
  applyPayrollMethodUI(method);
  const current = normalisePayrollRules({
    ...(companyPayrollRules || {}),
    overtime_method: el.ruleOvertimeMethod?.value || method
  });
  if (el.payrollRulesSummary) {
    el.payrollRulesSummary.textContent = ruleLabel(current.overtime_method);
  }
}

const SA_PUBLIC_HOLIDAYS_2026 = new Map([
  ["2026-01-01", "New Year's Day"],
  ["2026-03-21", "Human Rights Day"],
  ["2026-04-03", "Good Friday"],
  ["2026-04-06", "Family Day"],
  ["2026-04-27", "Freedom Day"],
  ["2026-05-01", "Workers' Day"],
  ["2026-06-16", "Youth Day"],
  ["2026-08-09", "National Women's Day"],
  ["2026-08-10", "National Women's Day observed"],
  ["2026-09-24", "Heritage Day"],
  ["2026-12-16", "Day of Reconciliation"],
  ["2026-12-25", "Christmas Day"],
  ["2026-12-26", "Day of Goodwill"]
]);

function dateKey(date) {
  return localDateInputValue(date);
}

function isPublicHoliday(date) {
  return SA_PUBLIC_HOLIDAYS_2026.has(dateKey(date));
}

function shouldApplyPublicHolidayTopup(date) {
  const companyId = String(currentCompany()?.id || "");
  return !(PVS_COMPANY_IDS.has(companyId) && date.getDay() === 0);
}

function datesInRange(startValue, endValue) {
  const dates = [];
  if (!startValue || !endValue) return dates;
  const cursor = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function normalThresholdHours(payCycle, rules = activePayrollRules()) {
  if (payCycle === "weekly") return rules.weekly_normal_hours;
  if (payCycle === "monthly") return rules.monthly_normal_hours;
  return rules.fortnightly_normal_hours;
}

function splitShiftByDay(start, end) {
  const parts = [];
  let cursor = new Date(start);
  while (cursor < end) {
    const nextMidnight = new Date(cursor);
    nextMidnight.setHours(24, 0, 0, 0);
    const partEnd = nextMidnight < end ? nextMidnight : end;
    const hours = (partEnd - cursor) / 36e5;
    if (hours > 0) {
      parts.push({
        date: new Date(cursor),
        hours
      });
    }
    cursor = partEnd;
  }
  return parts;
}

function splitSegmentByDay(start, end, forcedRule = "") {
  return splitShiftByDay(start, end).map((part) => ({ ...part, forcedRule }));
}

function buildShiftPartsForPayroll(inTime, outTime, rules) {
  if (rules.payroll_profile !== "mixocron") return splitShiftByDay(inTime, outTime);
  const paidStartMinutes = timeValueToMinutes(rules.paid_start_time);
  if (paidStartMinutes === null) return splitShiftByDay(inTime, outTime);

  const paidStart = dateAtPayrollMinutes(inTime, paidStartMinutes);
  const paidIn = inTime < paidStart ? paidStart : inTime;
  if (outTime <= paidIn) return [];

  const dayRule = workWeekForDate(inTime, rules).rule;
  if (dayRule !== "threshold" || isPublicHoliday(inTime)) return splitShiftByDay(paidIn, outTime);

  const isFriday = inTime.getDay() === 5;
  const normalEndMinutes = timeValueToMinutes(isFriday ? rules.friday_normal_end_time : rules.normal_end_time);
  const overtimeTriggerMinutes = timeValueToMinutes(isFriday ? rules.friday_overtime_trigger_time : rules.overtime_trigger_time);
  if (normalEndMinutes === null || overtimeTriggerMinutes === null) {
    return splitShiftByDay(paidIn, outTime);
  }

  const normalEnd = dateAtPayrollMinutes(inTime, normalEndMinutes);
  const overtimeTrigger = dateAtPayrollMinutes(inTime, overtimeTriggerMinutes);

  const parts = [];
  const normalEndForShift = outTime >= overtimeTrigger ? normalEnd : (outTime < normalEnd ? outTime : normalEnd);
  if (paidIn < normalEndForShift) {
    parts.push(...splitSegmentByDay(paidIn, normalEndForShift, "normal"));
  }
  if (outTime >= overtimeTrigger) {
    const otStart = paidIn > normalEnd ? paidIn : normalEnd;
    if (otStart < outTime) parts.push(...splitSegmentByDay(otStart, outTime, "ot1"));
  }

  return parts;
}

function buildMixocronDailyParts(employeeEvents, rules) {
  const days = new Map();
  let invalidSequence = 0;
  let missingClockOut = 0;
  const paidStartMinutes = timeValueToMinutes(rules.paid_start_time);
  const normalEndMinutes = timeValueToMinutes(rules.normal_end_time);
  const overtimeTriggerMinutes = timeValueToMinutes(rules.overtime_trigger_time);
  const fridayNormalEndMinutes = timeValueToMinutes(rules.friday_normal_end_time);
  const fridayOvertimeTriggerMinutes = timeValueToMinutes(rules.friday_overtime_trigger_time);
  const standardLunchMinutes = rules.lunch_deduction_minutes > 0 ? rules.lunch_deduction_minutes : 30;

  for (const event of employeeEvents) {
    const action = String(event.action || "").toUpperCase();
    const time = mixocronWallEventTime(event);
    if (!Number.isFinite(time.getTime())) {
      invalidSequence += 1;
      continue;
    }
    const key = dateKey(time);
    const row = days.get(key) || { date: new Date(time), ins: [], outs: [] };
    if (action === "IN") row.ins.push(event);
    if (action === "OUT") row.outs.push(event);
    days.set(key, row);
  }

  const parts = [];
  for (const row of days.values()) {
    const { firstIn, lastOut } = chooseMixocronDayTimes(row, rules, paidStartMinutes, normalEndMinutes, fridayNormalEndMinutes);
    if (!firstIn && !lastOut) continue;
    if (firstIn && !lastOut) {
      missingClockOut += 1;
      continue;
    }
    if (!firstIn || lastOut <= firstIn) {
      invalidSequence += 1;
      continue;
    }

    const dayRule = workWeekForDate(firstIn, rules).rule;
    const isFriday = firstIn.getDay() === 5;
    const normalEnd = dateAtPayrollMinutes(firstIn, isFriday ? fridayNormalEndMinutes : normalEndMinutes);
    const overtimeTrigger = dateAtPayrollMinutes(firstIn, isFriday ? fridayOvertimeTriggerMinutes : overtimeTriggerMinutes);
    const paidStart = dateAtPayrollMinutes(firstIn, paidStartMinutes);
    const paidIn = firstIn < paidStart ? paidStart : firstIn;
    if (lastOut <= paidIn) continue;

    if (isPublicHoliday(firstIn) || dayRule !== "threshold") {
      const forcedRule = dayRule === "threshold" ? "" : dayRule;
      parts.push(...splitSegmentByDay(paidIn, lastOut, forcedRule));
      continue;
    }

    const normalEndForDay = lastOut >= overtimeTrigger ? normalEnd : (lastOut < normalEnd ? lastOut : normalEnd);
    const lunchHours = isFriday ? 0 : Math.max(0, standardLunchMinutes / 60);
    const normalHours = Math.max(0, (normalEndForDay - paidIn) / 36e5 - lunchHours);
    if (normalHours > 0) {
      parts.push({ date: new Date(paidIn), hours: normalHours, forcedRule: "normal" });
    }

    if (lastOut >= overtimeTrigger && normalEnd < lastOut) {
      parts.push(...splitSegmentByDay(normalEnd, lastOut, "ot1"));
    }
  }

  return { parts, missingClockOut, invalidSequence };
}

function addHoursByRule(rule, hours, breakdown, allocators) {
  if (!hours || hours <= 0) return;
  if (rule === "ot2") {
    breakdown.ot2Hours += hours;
    return;
  }
  if (rule === "ot1") {
    breakdown.ot1Hours += hours;
    return;
  }
  if (rule === "normal") {
    breakdown.normalHours += hours;
    return;
  }
  allocators.threshold(hours);
}

function dailyStandardHours(rules) {
  const candidates = [
    rules.daily_normal_hours,
    rules.public_holiday_standard_hours,
    DEFAULT_PAYROLL_RULES.daily_normal_hours,
    8
  ].map(Number).filter((value) => Number.isFinite(value) && value > 0);
  return candidates[0] || 8;
}

function dailyHourlyRate(dayRate, rules) {
  const rate = Number(dayRate || 0);
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return rate / dailyStandardHours(rules);
}

function monthlyHourlyRate(monthlySalary, rules) {
  const salary = Number(monthlySalary || 0);
  const hours = Number(rules?.monthly_normal_hours || DEFAULT_PAYROLL_RULES.monthly_normal_hours || 195);
  if (!Number.isFinite(salary) || salary <= 0 || !Number.isFinite(hours) || hours <= 0) return 0;
  return salary / hours;
}

function payrollHourlyRateForPayType(payType, rate, rules) {
  const type = String(payType || "hourly").toLowerCase();
  if (type === "daily") return dailyHourlyRate(rate, rules);
  if (type === "monthly") return monthlyHourlyRate(rate, rules);
  return moneyNumber(rate);
}

function allocateDailyThresholdOnly(hours, date, rules, breakdown, dailyAllocated, normalPaidDates = null) {
  const key = dateKey(date);
  const usedToday = dailyAllocated.get(key) || 0;
  const dayLimit = workWeekForDate(date, rules).normal_hours;
  const normal = Math.min(hours, Math.max(0, dayLimit - usedToday));
  const ot1 = Math.max(0, hours - normal);
  breakdown.normalHours += normal;
  breakdown.ot1Hours += ot1;
  if (normal > 0 && normalPaidDates) normalPaidDates.add(key);
  dailyAllocated.set(key, usedToday + normal);
}

function buildTrElectricalPayrollBreakdown(employee, employeeEvents, rulesInput) {
  const rules = normalisePayrollRules(rulesInput);
  const payType = String(employee.pay_type || "hourly").toLowerCase();
  const isDaily = payType === "daily";
  const isMonthly = payType === "monthly";
  const rate = Number(employee.rate || 0);
  const safeRate = Number.isFinite(rate) ? rate : 0;
  const effectiveHourlyRate = payrollHourlyRateForPayType(payType, safeRate, rules);
  const days = new Map();
  let invalidSequence = 0;

  for (const event of employeeEvents) {
    const action = String(event.action || "").toUpperCase();
    const time = payrollEventTime(event, rules);
    if (!Number.isFinite(time.getTime()) || !["IN", "OUT"].includes(action)) {
      invalidSequence += 1;
      continue;
    }
    const key = dateKey(time);
    const row = days.get(key) || { date: new Date(time), events: [] };
    row.events.push({ action, time });
    days.set(key, row);
  }

  let normalDays = 0;
  let ot1Hours = 0;
  let missingClockOut = 0;

  for (const row of days.values()) {
    row.events.sort((a, b) => a.time - b.time);
    const clockIns = row.events.filter((event) => event.action === "IN");
    if (!clockIns.length) {
      invalidSequence += row.events.filter((event) => event.action === "OUT").length;
      continue;
    }

    normalDays += 1;
    const finalEvent = row.events[row.events.length - 1];
    if (finalEvent.action !== "OUT") {
      missingClockOut += 1;
      continue;
    }

    const overtimeStart = dateAtPayrollMinutes(row.date, 17 * 60);
    if (finalEvent.time > overtimeStart) {
      const completedQuarterHours = Math.floor((finalEvent.time - overtimeStart) / (15 * 60 * 1000));
      ot1Hours += Math.max(0, completedQuarterHours) / 4;
    }
  }

  const normalHours = normalDays * 8;
  const normalPay = isDaily
    ? normalDays * safeRate
    : isMonthly
      ? safeRate
      : normalHours * safeRate;
  const ot1Pay = ot1Hours * effectiveHourlyRate * rules.ot1_multiplier;
  const gross = normalPay + ot1Pay;

  return {
    normalHours,
    ot1Hours,
    ot2Hours: 0,
    holidayTopupHours: 0,
    normalDays,
    dailyHourlyRate: effectiveHourlyRate,
    normalPay,
    ot1Pay,
    ot2Pay: 0,
    gross,
    totalHours: normalHours + ot1Hours,
    sundayHours: 0,
    publicHolidayWorkedHours: 0,
    missingClockOut,
    invalidSequence,
    exceptionCount: missingClockOut + invalidSequence
  };
}

function buildPayrollBreakdown(employee, employeeEvents, rulesInput = activePayrollRules()) {
  if (isTrElectricalCompany()) {
    return buildTrElectricalPayrollBreakdown(employee, employeeEvents, rulesInput);
  }
  const rules = normalisePayrollRules(rulesInput);
  const payType = String(employee.pay_type || "hourly").toLowerCase();
  const isDaily = payType === "daily";
  const isMonthly = payType === "monthly";
  const payCycle = String(employee.pay_cycle || "fortnightly").toLowerCase();
  const rate = Number(employee.rate || 0);
  const safeRate = Number.isFinite(rate) ? rate : 0;
  const effectiveHourlyRate = payrollHourlyRateForPayType(payType, safeRate, rules);
  const breakdown = {
    normalHours: 0,
    ot1Hours: 0,
    ot2Hours: 0,
    holidayTopupHours: 0,
    normalDays: 0,
    dailyHourlyRate: effectiveHourlyRate,
    normalPay: 0,
    ot1Pay: 0,
    ot2Pay: 0,
    gross: isMonthly ? safeRate : 0,
    totalHours: 0,
    sundayHours: 0,
    publicHolidayWorkedHours: 0
  };

  let pendingIn = null;
  let invalidSequence = 0;
  const regularParts = [];
  const publicHolidayWorked = new Map();
  const dailyAllocated = new Map();
  const normalPaidDates = new Set();
  const threshold = normalThresholdHours(payCycle, rules);

  const allocateThreshold = (hours, date = null) => {
    let normalRoom = Math.max(0, threshold - breakdown.normalHours);
    if (date && (rules.daily_overtime_enabled || rules.work_week_enabled)) {
      const key = dateKey(date);
      const usedToday = dailyAllocated.get(key) || 0;
      const dayLimit = rules.work_week_enabled ? workWeekForDate(date, rules).normal_hours : rules.daily_normal_hours;
      normalRoom = Math.min(normalRoom, Math.max(0, dayLimit - usedToday));
    }
    const normal = Math.min(hours, normalRoom);
    const ot1 = Math.max(0, hours - normal);
    breakdown.normalHours += normal;
    breakdown.ot1Hours += ot1;
    if (date) {
      const key = dateKey(date);
      if (normal > 0) normalPaidDates.add(key);
      dailyAllocated.set(key, (dailyAllocated.get(key) || 0) + normal);
    }
  };

  const mixocronDaily = rules.payroll_profile === "mixocron"
    ? buildMixocronDailyParts(employeeEvents, rules)
    : null;
  const eventsToProcess = mixocronDaily ? [] : employeeEvents;
  if (mixocronDaily) {
    invalidSequence += mixocronDaily.invalidSequence;
    for (const part of mixocronDaily.parts) {
      const key = dateKey(part.date);
      const day = part.date.getDay();
      const partHours = Math.max(0, part.hours);
      if (partHours <= 0) continue;
      breakdown.totalHours += partHours;
      if (part.forcedRule) {
        if (part.forcedRule === "normal") normalPaidDates.add(key);
        addHoursByRule(part.forcedRule, partHours, breakdown, { threshold: (hours) => allocateThreshold(hours, part.date) });
      } else if (isPublicHoliday(part.date)) {
        const holidayRule = rules.public_holiday_rule === "ot2_with_topup" ? "ot2" : rules.public_holiday_rule;
        addHoursByRule(holidayRule, partHours, breakdown, { threshold: (hours) => allocateThreshold(hours, part.date) });
        breakdown.publicHolidayWorkedHours += partHours;
        publicHolidayWorked.set(key, (publicHolidayWorked.get(key) || 0) + partHours);
      } else if (day === 0) {
        addHoursByRule(rules.sunday_rule, partHours, breakdown, { threshold: (hours) => allocateThreshold(hours, part.date) });
        breakdown.sundayHours += partHours;
      } else if (day === 6) {
        if (rules.saturday_rule === "threshold") regularParts.push({ ...part, hours: partHours });
        else addHoursByRule(rules.saturday_rule, partHours, breakdown, { threshold: (hours) => allocateThreshold(hours, part.date) });
      } else {
        regularParts.push({ ...part, hours: partHours });
      }
    }
  }

  for (const event of eventsToProcess) {
    const action = String(event.action || "").toUpperCase();
    const eventTime = payrollEventTime(event, rules);
    if (!Number.isFinite(eventTime.getTime())) {
      invalidSequence += 1;
      continue;
    }

    if (action === "IN") {
      if (pendingIn) invalidSequence += 1;
      pendingIn = event;
      continue;
    }

    if (action === "OUT") {
      if (!pendingIn) {
        invalidSequence += 1;
        continue;
      }
      const inTime = payrollEventTime(pendingIn, rules);
      if (eventTime <= inTime) {
        invalidSequence += 1;
        pendingIn = null;
        continue;
      }

      const shiftParts = buildShiftPartsForPayroll(inTime, eventTime, rules);
      let lunchDeductionHours = rules.payroll_profile === "mixocron"
        ? 0
        : (rules.lunch_deduction_enabled ? Math.max(0, rules.lunch_deduction_minutes / 60) : 0);
      for (const part of shiftParts) {
        const key = dateKey(part.date);
        const day = part.date.getDay();
        let partHours = part.hours;
        if (lunchDeductionHours > 0) {
          const deducted = Math.min(partHours, lunchDeductionHours);
          partHours = Math.max(0, partHours - deducted);
          lunchDeductionHours -= deducted;
        }
        if (partHours <= 0) continue;
        breakdown.totalHours += partHours;
        if (part.forcedRule) {
          if (part.forcedRule === "normal") normalPaidDates.add(key);
          addHoursByRule(part.forcedRule, partHours, breakdown, { threshold: (hours) => allocateThreshold(hours, part.date) });
        } else if (isPublicHoliday(part.date)) {
          const holidayRule = rules.public_holiday_rule === "ot2_with_topup" ? "ot2" : rules.public_holiday_rule;
          addHoursByRule(holidayRule, partHours, breakdown, { threshold: (hours) => allocateThreshold(hours, part.date) });
          breakdown.publicHolidayWorkedHours += partHours;
          publicHolidayWorked.set(key, (publicHolidayWorked.get(key) || 0) + partHours);
        } else if (rules.overtime_method === "cycle_only") {
          const dayRule = workWeekForDate(part.date, rules).rule;
          if (dayRule === "ot1" || dayRule === "ot2") {
            addHoursByRule(dayRule, partHours, breakdown, { threshold: (hours) => regularParts.push({ ...part, hours }) });
            if (day === 0 && dayRule === "ot2") breakdown.sundayHours += partHours;
          } else {
            regularParts.push({ ...part, hours: partHours });
          }
        } else if (rules.overtime_method === "day_rules") {
          const dayRule = workWeekForDate(part.date, rules).rule;
          if (dayRule === "normal") normalPaidDates.add(key);
          addHoursByRule(dayRule, partHours, breakdown, { threshold: (hours) => allocateDailyThresholdOnly(hours, part.date, rules, breakdown, dailyAllocated, normalPaidDates) });
          if (day === 0 && dayRule === "ot2") breakdown.sundayHours += partHours;
        } else if (rules.work_week_enabled || rules.overtime_method === "daily_cycle") {
          const dayRule = workWeekForDate(part.date, rules).rule;
          addHoursByRule(dayRule, partHours, breakdown, { threshold: (hours) => allocateThreshold(hours, part.date) });
          if (day === 0 && dayRule === "ot2") breakdown.sundayHours += partHours;
        } else if (day === 0) {
          addHoursByRule(rules.sunday_rule, partHours, breakdown, { threshold: (hours) => allocateThreshold(hours, part.date) });
          breakdown.sundayHours += partHours;
        } else if (day === 6) {
          if (rules.saturday_rule === "threshold") regularParts.push({ ...part, hours: partHours });
          else addHoursByRule(rules.saturday_rule, partHours, breakdown, { threshold: (hours) => allocateThreshold(hours, part.date) });
        } else {
          regularParts.push({ ...part, hours: partHours });
        }
      }
      pendingIn = null;
    }
  }

  const missingClockOut = (pendingIn ? 1 : 0) + (mixocronDaily?.missingClockOut || 0);

  if (!isMonthly && rules.public_holiday_rule === "ot2_with_topup") {
    for (const holiday of datesInRange(el.payrollStartDate.value, el.payrollEndDate.value)) {
      if (!isPublicHoliday(holiday)) continue;
      if (!shouldApplyPublicHolidayTopup(holiday)) continue;
      const worked = publicHolidayWorked.get(dateKey(holiday)) || 0;
      const topup = Math.max(0, rules.public_holiday_standard_hours - worked);
      breakdown.holidayTopupHours += topup;
      breakdown.normalHours += topup;
      breakdown.totalHours += topup;
      if (topup > 0) normalPaidDates.add(dateKey(holiday));
    }
  }

  for (const part of regularParts) {
    allocateThreshold(part.hours, part.date);
  }

  breakdown.normalDays = isDaily ? normalPaidDates.size : 0;
  breakdown.normalPay = isDaily
    ? breakdown.normalDays * safeRate
    : isMonthly
      ? safeRate
      : breakdown.normalHours * safeRate;
  breakdown.ot1Pay = breakdown.ot1Hours * effectiveHourlyRate * rules.ot1_multiplier;
  breakdown.ot2Pay = breakdown.ot2Hours * effectiveHourlyRate * rules.ot2_multiplier;
  breakdown.gross = isMonthly
    ? safeRate + breakdown.ot1Pay + breakdown.ot2Pay
    : breakdown.normalPay + breakdown.ot1Pay + breakdown.ot2Pay;

  return {
    ...breakdown,
    missingClockOut,
    invalidSequence,
    exceptionCount: missingClockOut + invalidSequence
  };
}

function calculatePayroll(events, employees, rulesInput = activePayrollRules()) {
  const rules = normalisePayrollRules(rulesInput);
  const employeeMap = new Map((employees || []).map((employee) => [String(employee.employee_id), employee]));
  const eventGroups = new Map();

  for (const event of events || []) {
    const employeeId = String(event.employee_id || "");
    if (!employeeId) continue;
    if (!eventGroups.has(employeeId)) eventGroups.set(employeeId, []);
    eventGroups.get(employeeId).push(event);
  }

  const employeeIds = new Set([
    ...(employees || []).map((employee) => String(employee.employee_id || "")),
    ...eventGroups.keys()
  ]);

  const rows = [];
  for (const employeeId of employeeIds) {
    if (!employeeId) continue;
    const employee = employeeMap.get(employeeId) || {};
    if (employee.active === false) continue;

    const employeeEvents = (eventGroups.get(employeeId) || [])
      .filter((event) => String(event.result || "").toUpperCase() === "OK")
      .filter((event) => ["IN", "OUT"].includes(String(event.action || "").toUpperCase()))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const rate = Number(employee.rate || 0);
    const safeRate = Number.isFinite(rate) ? rate : 0;
    const payType = String(employee.pay_type || "hourly").toLowerCase();
    const payCycle = String(employee.pay_cycle || "fortnightly").toLowerCase();
    const breakdown = buildPayrollBreakdown(
      { ...employee, rate: safeRate, pay_type: payType, pay_cycle: payCycle },
      employeeEvents,
      rules
    );
    rows.push({
      employee_id: employeeId,
      employee_name: employee.full_name || employeeEvents[0]?.employee_name || "",
      id_number: employee.id_number || "",
      employment_date: employee.employment_date || "",
      pay_type: payType,
      pay_cycle: payCycle,
      nbcei_designation_code: normaliseNbceiDesignationCode(employee.nbcei_designation_code),
      sbf_member: employee.sbf_member === true,
      saewa_member: employee.saewa_member === true,
      rate: safeRate,
      hours: breakdown.totalHours,
      gross: breakdown.gross,
      breakdown,
      missingClockOut: breakdown.missingClockOut,
      invalidSequence: breakdown.invalidSequence,
      exceptionCount: breakdown.exceptionCount
    });
  }

  return rows.sort((a, b) => String(a.employee_id).localeCompare(String(b.employee_id), undefined, { numeric: true }));
}

function renderPayrollRows(rows) {
  if (!el.payrollBody) return;
  payrollRows = rows || [];
  const totalHours = payrollRows.reduce((sum, row) => sum + row.hours, 0);
  const allDailyRows = payrollRows.length > 0 && payrollRows.every((row) => String(row.pay_type || "").toLowerCase() === "daily");
  const totalDays = payrollRows.reduce((sum, row) => sum + dailyDayCount(row), 0);
  const totalGross = payrollRows.reduce((sum, row) => sum + row.gross, 0);

  el.payrollTotalHours.textContent = allDailyRows ? formatDays(totalDays) : formatHours(totalHours);
  if (el.payrollTotalHoursLabel) {
    el.payrollTotalHoursLabel.textContent = allDailyRows ? "Total Days" : "Total Hours";
  }
  el.payrollTotalGross.textContent = formatMoney(totalGross);
  el.payrollBody.innerHTML = "";

  if (payrollRows.length === 0) {
    el.payrollBody.innerHTML = `<tr><td colspan="4" class="mutedText">No employees found for this company.</td></tr>`;
    return;
  }

  for (const row of payrollRows) {
    const rateLabel = row.pay_type === "monthly"
      ? `${formatMoney(row.rate)}/mo`
      : row.pay_type === "daily"
        ? `${formatMoney(row.rate)}/day`
        : `${formatMoney(row.rate)}/hr`;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <b>${escapeHtml(row.employee_id)}</b><br/>
        <span class="mutedText">${escapeHtml(row.employee_name || "")}</span>
      </td>
      <td><button class="payrollHoursBtn" type="button" data-payroll-employee="${escapeHtml(row.employee_id)}">${escapeHtml(payrollQuantityLabel(row))}</button></td>
      <td>${escapeHtml(rateLabel)}</td>
      <td><button class="payrollMoneyBtn" type="button" data-deductions-employee="${escapeHtml(row.employee_id)}">${escapeHtml(formatMoney(row.gross))}</button></td>
    `;
    el.payrollBody.appendChild(tr);
  }

  el.payrollBody.querySelectorAll("[data-payroll-employee]").forEach((button) => {
    button.addEventListener("click", () => openPayrollBreakdown(button.getAttribute("data-payroll-employee")));
  });
  el.payrollBody.querySelectorAll("[data-deductions-employee]").forEach((button) => {
    button.addEventListener("click", () => openPayrollDeductions(button.getAttribute("data-deductions-employee")));
  });
}

function openPayrollBreakdown(employeeId) {
  const row = payrollRows.find((item) => String(item.employee_id) === String(employeeId));
  if (!row) return;
  currentBreakdownEmployeeId = String(employeeId);
  const b = row.breakdown || {};
  const isDaily = String(row.pay_type || "").toLowerCase() === "daily";
  el.payrollBreakdownEmployee.textContent = `${row.employee_id} - ${row.employee_name || "Employee"}`;
  el.breakdownNormalHours.textContent = isDaily ? payrollQuantityLabel(row, true) : `${formatHours(b.normalHours)} hrs`;
  el.breakdownNormalPay.textContent = formatMoney(b.normalPay);
  el.breakdownOt1Hours.textContent = `${formatHours(b.ot1Hours)} hrs`;
  el.breakdownOt1Pay.textContent = formatMoney(b.ot1Pay);
  el.breakdownOt2Hours.textContent = `${formatHours(b.ot2Hours)} hrs`;
  el.breakdownOt2Pay.textContent = formatMoney(b.ot2Pay);
  el.breakdownHolidayHours.textContent = `${formatHours(b.holidayTopupHours)} hrs`;
  el.breakdownTotalHours.textContent = isDaily ? payrollQuantityLabel(row, true) : `${formatHours(b.totalHours)} hrs`;
  el.breakdownTotalPay.textContent = formatMoney(b.gross);
  el.payrollBreakdownModal.classList.add("show");
  el.payrollBreakdownModal.setAttribute("aria-hidden", "false");
}

function closePayrollBreakdown() {
  el.payrollBreakdownModal.classList.remove("show");
  el.payrollBreakdownModal.setAttribute("aria-hidden", "true");
}

function timesheetDateLabel(date) {
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function timesheetTimeLabel(date) {
  return new Intl.DateTimeFormat("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function durationClock(totalMinutes) {
  const minutes = Math.max(0, Math.round(Number(totalMinutes) || 0));
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

function durationWords(totalMinutes) {
  const minutes = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts = [];
  if (hours) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (rest) parts.push(`${rest} ${rest === 1 ? "minute" : "minutes"}`);
  return parts.join(" ") || "0 minutes";
}

function buildTimesheetRows(events, start, end, rulesInput) {
  const rules = normalisePayrollRules(rulesInput);
  const grouped = new Map();
  for (const event of events) {
    const time = rules.payroll_profile === "mixocron" ? mixocronWallEventTime(event) : payrollEventTime(event, rules);
    if (!Number.isFinite(time.getTime())) continue;
    const key = dateKey(time);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push({ ...event, _time: time });
  }

  return datesInRange(start, end).map((date) => {
    const dayEvents = (grouped.get(dateKey(date)) || []).sort((a, b) => a._time - b._time);
    if (!dayEvents.length) return { date, firstIn: null, lastOut: null, breakMinutes: null, workedMinutes: 0, incomplete: false };
    let pendingIn = null;
    let firstIn = null;
    let lastOut = null;
    let workedMs = 0;
    let incomplete = false;
    let automaticClockOut = false;
    for (const event of dayEvents) {
      const action = String(event.action || "").toUpperCase();
      if (action === "IN") {
        if (pendingIn) incomplete = true;
        pendingIn = event._time;
        if (!firstIn) firstIn = event._time;
      } else if (action === "OUT") {
        if (!pendingIn || event._time <= pendingIn) {
          incomplete = true;
          continue;
        }
        workedMs += event._time - pendingIn;
        lastOut = event._time;
        automaticClockOut = String(event.message || "").startsWith("AUTO CLOCK-OUT FLAG:");
        pendingIn = null;
      }
    }
    if (pendingIn) incomplete = true;
    if (incomplete) return { date, firstIn, lastOut, breakMinutes: null, workedMinutes: 0, incomplete: true };

    let workedMinutes = Math.max(0, Math.round(workedMs / 60000));
    let appliedDeduction = 0;
    if (rules.payroll_profile === "mixocron") {
      const daily = buildMixocronDailyParts(dayEvents, rules);
      workedMinutes = Math.max(0, Math.round(daily.parts.reduce((sum, part) => sum + part.hours, 0) * 60));
      incomplete = daily.missingClockOut > 0 || daily.invalidSequence > 0;
    } else if (rules.lunch_deduction_enabled && workedMinutes > 0) {
      appliedDeduction = Math.min(workedMinutes, Math.max(0, rules.lunch_deduction_minutes));
      workedMinutes -= appliedDeduction;
    }
    if (incomplete) workedMinutes = 0;
    const spanMinutes = firstIn && lastOut ? Math.max(0, Math.round((lastOut - firstIn) / 60000)) : 0;
    const sessionGap = Math.max(0, spanMinutes - Math.round(workedMs / 60000));
    return { date, firstIn, lastOut, breakMinutes: sessionGap + appliedDeduction, workedMinutes, incomplete, automaticClockOut };
  });
}

function renderTimesheetReport(report) {
  const company = report.company;
  el.timesheetCompany.textContent = company.name || "Company";
  el.timesheetEmployee.textContent = `${report.employee.employee_name || "Employee"} (${report.employee.employee_id})`;
  el.timesheetPeriod.textContent = `${timesheetDateLabel(new Date(`${report.start}T00:00:00`))} - ${timesheetDateLabel(new Date(`${report.end}T00:00:00`))}`;
  el.timesheetGenerated.textContent = timesheetDateLabel(new Date());
  if (company.logo_url) {
    el.timesheetLogo.src = company.logo_url;
    el.timesheetLogo.hidden = false;
  } else {
    el.timesheetLogo.hidden = true;
  }
  el.timesheetBody.innerHTML = report.rows.map((row) => `
    <tr${row.incomplete ? ` title="Clock record requires correction"` : row.automaticClockOut ? ` title="Automatic clock-out requires review"` : ""}>
      <td>${escapeHtml(new Intl.DateTimeFormat("en-ZA", { weekday: "long" }).format(row.date))}</td>
      <td>${escapeHtml(timesheetDateLabel(row.date))}</td>
      <td>${row.firstIn ? escapeHtml(timesheetTimeLabel(row.firstIn)) : "&mdash;"}</td>
      <td class="${row.incomplete ? "timesheetIncomplete" : row.automaticClockOut ? "timesheetAuto" : ""}">${row.incomplete ? `<i class="ph ph-warning"></i> Incomplete` : row.lastOut ? `${row.automaticClockOut ? `<i class="ph ph-warning"></i> AUTO ` : ""}${escapeHtml(timesheetTimeLabel(row.lastOut))}` : "&mdash;"}</td>
      <td>${row.breakMinutes === null ? "&mdash;" : escapeHtml(durationClock(row.breakMinutes))}</td>
      <td class="${row.incomplete ? "timesheetIncomplete" : ""}">${row.incomplete ? "Incomplete" : escapeHtml(durationClock(row.workedMinutes))}</td>
    </tr>`).join("");
  el.timesheetTotal.textContent = `Total hours: ${durationWords(report.totalMinutes)}`;
  const hasRecords = report.rows.some((row) => row.firstIn || row.lastOut);
  el.timesheetNotice.textContent = hasRecords ? "" : "No approved clock records were found for this employee during the selected period.";
}

async function openEmployeeTimesheet() {
  const company = currentCompany();
  const employee = payrollRows.find((row) => String(row.employee_id) === currentBreakdownEmployeeId);
  const start = el.payrollStartDate.value;
  const end = el.payrollEndDate.value;
  if (!company || !employee || !start || !end) return alert("Run payroll and select an employee first.");
  el.timesheetBody.innerHTML = `<tr><td colspan="6">Preparing timesheet...</td></tr>`;
  el.timesheetModal.classList.add("show");
  el.timesheetModal.setAttribute("aria-hidden", "false");
  try {
    const { data, error } = await sb.from("clock_events")
      .select("entry_id,created_at,action,employee_id,employee_name,result,message")
      .eq(COMPANY_ID_COL, company.id)
      .eq("employee_id", employee.employee_id)
      .eq("result", "OK")
      .gte("created_at", dateStartIso(start))
      .lte("created_at", dateEndIso(end))
      .order("created_at", { ascending: true });
    if (error) throw error;
    const rows = buildTimesheetRows(data || [], start, end, activePayrollRules());
    currentTimesheetReport = { company, employee, start, end, rows, totalMinutes: rows.reduce((sum, row) => sum + (row.incomplete ? 0 : row.workedMinutes), 0) };
    renderTimesheetReport(currentTimesheetReport);
  } catch (error) {
    console.error("Timesheet failed:", error);
    currentTimesheetReport = null;
    el.timesheetBody.innerHTML = `<tr><td colspan="6" class="timesheetIncomplete">Unable to prepare this timesheet. Close and try again.</td></tr>`;
  }
}

function closeEmployeeTimesheet() {
  el.timesheetModal.classList.remove("show");
  el.timesheetModal.setAttribute("aria-hidden", "true");
}

function buildTimesheetDocument(report, autoPrint = false) {
  const rows = report.rows.map((row) => `<tr><td>${escapeHtml(new Intl.DateTimeFormat("en-ZA", { weekday: "long" }).format(row.date))}</td><td>${escapeHtml(timesheetDateLabel(row.date))}</td><td>${row.firstIn ? escapeHtml(timesheetTimeLabel(row.firstIn)) : "&mdash;"}</td><td>${row.incomplete ? "Incomplete" : row.lastOut ? escapeHtml(timesheetTimeLabel(row.lastOut)) : "&mdash;"}</td><td>${row.breakMinutes === null ? "&mdash;" : escapeHtml(durationClock(row.breakMinutes))}</td><td>${row.incomplete ? "Incomplete" : escapeHtml(durationClock(row.workedMinutes))}</td></tr>`).join("");
  const logo = report.company.logo_url ? `<img src="${escapeHtml(report.company.logo_url)}" alt="Company logo">` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>Employee Timesheet</title><style>@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{margin:0;background:#ddd;color:#171717;font:12px Arial,sans-serif}.tools{position:fixed;right:12px;top:10px}.tools button{padding:10px 14px;font-weight:800;background:#fff;border:1px solid #111;border-radius:5px}.page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:16mm}.head{display:flex;gap:14px;align-items:center;border-bottom:2px solid #171717;padding-bottom:12px}.head img{width:58px;height:58px;object-fit:contain}.head h1{margin:2px 0;color:#a87908}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0}.meta div{border:1px solid #ddd;padding:9px}.meta span{display:block;color:#666;font-size:9px;text-transform:uppercase}table{width:100%;border-collapse:collapse}thead{display:table-header-group}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}th{background:#f3f1ec;text-transform:uppercase;font-size:9px}th:nth-child(n+3),td:nth-child(n+3){text-align:right}tr{break-inside:avoid}.total{text-align:right;margin-top:14px;font-weight:800}.footer{margin-top:24px;color:#666;font-size:9px;display:flex;justify-content:space-between}@media print{body{background:#fff}.tools{display:none}.page{width:auto;min-height:0;padding:0}}</style></head><body><div class="tools"><button onclick="window.print()">Print / Save PDF</button></div><main class="page"><header class="head">${logo}<div><b>${escapeHtml(report.company.name || "Company")}</b><h1>Employee Timesheet</h1></div></header><section class="meta"><div><span>Employee</span><b>${escapeHtml(report.employee.employee_name || "Employee")}</b><br>${escapeHtml(report.employee.employee_id)}</div><div><span>Period</span><b>${escapeHtml(timesheetDateLabel(new Date(`${report.start}T00:00:00`)))} - ${escapeHtml(timesheetDateLabel(new Date(`${report.end}T00:00:00`)))}</b><br>Generated ${escapeHtml(timesheetDateLabel(new Date()))}</div></section><table><thead><tr><th>Day</th><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Break</th><th>Hours Worked</th></tr></thead><tbody>${rows}</tbody></table><div class="total">Total hours: ${escapeHtml(durationWords(report.totalMinutes))}</div><footer class="footer"><span>Generated by Shiftly</span><span>Employee Timesheet</span></footer></main>${autoPrint ? `<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),250))<\/script>` : ""}</body></html>`;
}

function openTimesheetPrint(autoPrint = false) {
  if (!currentTimesheetReport) return alert("Prepare the timesheet first.");
  const win = window.open("", "_blank");
  if (!win) return alert("Allow popups for this site so Shiftly can open the timesheet.");
  win.document.open();
  win.document.write(buildTimesheetDocument(currentTimesheetReport, autoPrint));
  win.document.close();
}

function selectedDeductionRow() {
  return payrollRows.find((item) => String(item.employee_id) === String(currentDeductionEmployeeId));
}

function deductionTypeForField(field) {
  const labels = [field.label, ...(field.aliases || [])].map((label) => label.toLowerCase());
  return companyDeductionTypes.find((type) => labels.includes(String(type.name || "").toLowerCase()));
}

function deductionAmountForField(deductions, field) {
  const labels = [field.label, ...(field.aliases || [])].map((label) => label.toLowerCase());
  return (deductions || [])
    .filter((item) => item.active && labels.includes(String(item.description || "").toLowerCase()))
    .reduce((sum, item) => sum + moneyNumber(item.amount), 0);
}

function visibleCustomDeductionTypes() {
  return companyDeductionTypes.filter((type) => type.active && type.editor_visible && !STANDARD_DEDUCTION_FIELDS.some((field) => (
    [field.label, ...(field.aliases || [])].some((label) => label.toLowerCase() === String(type.name || "").toLowerCase())
  )));
}

function isTrElectricalCompany(company = currentCompany()) {
  return String(company?.id || "") === TR_ELECTRICAL_COMPANY_ID;
}

function normaliseNbceiDesignationCode(value) {
  const code = String(value || "").trim().toLowerCase();
  if (code === "none") return "none";
  return TR_ELECTRICAL_NBCEI_RATES[code] ? code : "";
}

function nbceiDesignationLabel(value) {
  const code = normaliseNbceiDesignationCode(value);
  if (code === "none") return "Not subject to NBCEI levies";
  return code ? `${code} - ${TR_ELECTRICAL_NBCEI_RATES[code].label}` : "NBCEI designation required";
}

function renderTrElectricalPayrollControls() {
  const enabled = isTrElectricalCompany();
  if (el.payrollLevyWeeks) {
    el.payrollLevyWeeks.hidden = !enabled;
    el.payrollLevyWeeks.closest(".payrollFilters")?.classList.toggle("withLevy", enabled);
    if (!enabled) el.payrollLevyWeeks.value = "";
  }
  if (el.companyEmployeeNbceiDesignation) {
    el.companyEmployeeNbceiDesignation.hidden = !enabled;
    if (!enabled) el.companyEmployeeNbceiDesignation.value = "";
  }
  if (el.companyEmployeeSbfMember) {
    el.companyEmployeeSbfMember.hidden = !enabled;
    if (!enabled) el.companyEmployeeSbfMember.value = "";
  }
  if (el.companyEmployeeSaewaMember) {
    el.companyEmployeeSaewaMember.hidden = !enabled;
    if (!enabled) el.companyEmployeeSaewaMember.value = "";
  }
}

function missingTrElectricalLevyDesignations(employees = companyAdminEmployees) {
  if (!isTrElectricalCompany()) return [];
  return (employees || []).filter((employee) => (
    employee.active !== false && !normaliseNbceiDesignationCode(employee.nbcei_designation_code)
  ));
}

function trElectricalAutomaticLevyDeductions(rows, savedDeductions, levyPeriod, company = currentCompany()) {
  if (!isTrElectricalCompany(company) || !levyPeriod) return savedDeductions || [];
  const weeks = Number(levyPeriod.levy_weeks);
  const rateSet = TR_ELECTRICAL_NBCEI_RATE_SETS[String(levyPeriod.rate_version || "")];
  if (![4, 5].includes(weeks) || !rateSet) return savedDeductions || [];

  const deductions = [...(savedDeductions || [])];
  const levyFields = [
    { name: "SBF", rateKey: "sbf", membershipKey: "sbf_member" },
    { name: "SAEWA", rateKey: "saewa", weeklyRate: TR_ELECTRICAL_SAEWA_WEEKLY_RATE, membershipKey: "saewa_member" },
    { name: "Council Levy", rateKey: "council" },
    { name: "CBL", rateKey: "cbl" },
    { name: "Provident", rateKey: "provident" }
  ];

  for (const row of rows || []) {
    const designationCode = normaliseNbceiDesignationCode(
      levyPeriod.employee_designations?.[String(row.employee_id || "")]
      ?? row.nbcei_designation_code
    );
    if (!designationCode || designationCode === "none") continue;
    const rates = rateSet[designationCode];
    if (!rates) continue;

    for (const field of levyFields) {
      const periodMembership = levyPeriod.employee_levy_memberships?.[String(row.employee_id || "")];
      const isMember = periodMembership?.[field.membershipKey] ?? row[field.membershipKey];
      if (field.membershipKey && isMember !== true) continue;
      const alreadySaved = deductions.some((deduction) => (
        deduction.active !== false
        && String(deduction.employee_id || "") === String(row.employee_id || "")
        && String(deduction.description || "").trim().toLowerCase() === field.name.toLowerCase()
      ));
      if (alreadySaved) continue;
      const type = companyDeductionTypes.find((item) => (
        item.active && String(item.name || "").trim().toLowerCase() === field.name.toLowerCase()
      ));
      deductions.push({
        id: `auto-${row.employee_id}-${field.rateKey}-${levyPeriod.period_start}-${levyPeriod.period_end}`,
        company_id: company.id,
        employee_id: row.employee_id,
        employee_name: row.employee_name || "",
        deduction_type_id: type?.id || "",
        description: field.name,
        amount: Math.round(moneyNumber(field.weeklyRate ?? rates[field.rateKey]) * weeks * 100) / 100,
        period_start: levyPeriod.period_start || "",
        period_end: levyPeriod.period_end || "",
        active: true,
        automatic_levy: true
      });
    }
  }
  return deductions;
}

function visibleStandardDeductionFields() {
  const companyId = String(currentCompany()?.id || currentCompanyId || "");
  return STANDARD_DEDUCTION_FIELDS.filter((field) => (
    companyId !== TR_ELECTRICAL_COMPANY_ID || field.key !== "tools_ppe"
  ));
}

function deductionAmountForType(deductions, type) {
  return (deductions || [])
    .filter((item) => item.active && (
      String(item.deduction_type_id || "") === String(type.id || "")
      || String(item.description || "").toLowerCase() === String(type.name || "").toLowerCase()
    ))
    .reduce((sum, item) => sum + moneyNumber(item.amount), 0);
}

function isStandardDeduction(deduction) {
  return STANDARD_DEDUCTION_FIELDS.some((field) => (
    deductionAmountForField([deduction], field) > 0 || [field.label, ...(field.aliases || [])].some((label) => (
      label.toLowerCase() === String(deduction.description || "").toLowerCase()
    ))
  ));
}

function adjustmentAmountForField(adjustments, field) {
  const labels = [field.label, ...(field.aliases || [])].map((label) => label.toLowerCase());
  return (adjustments || [])
    .filter((item) => item.active && (
      String(item.adjustment_type || "") === field.key
      || labels.includes(String(item.description || "").toLowerCase())
    ))
    .reduce((sum, item) => sum + (field.mode === "amount" ? moneyNumber(item.amount) : moneyNumber(item.hours)), 0);
}

function adjustmentPayForField(adjustments, field) {
  return (adjustments || [])
    .filter((item) => item.active && String(item.adjustment_type || "") === field.key)
    .reduce((sum, item) => sum + moneyNumber(item.amount), 0);
}

function isStandardAdjustment(adjustment) {
  return STANDARD_ADJUSTMENT_FIELDS.some((field) => (
    String(adjustment.adjustment_type || "") === field.key
    || field.label.toLowerCase() === String(adjustment.description || "").toLowerCase()
  ));
}

function renderDeductionEditor(row) {
  const deductions = row.deductions || [];
  const adjustments = row.adjustments || [];
  el.deductionList.innerHTML = `
    <div class="deductionGroup">
      <div class="deductionGroupTitle">Adjustments</div>
      <div class="deductionGroupGrid">
        ${STANDARD_ADJUSTMENT_FIELDS.map((field) => {
          const value = adjustmentAmountForField(adjustments, field);
          const suffix = field.mode === "amount" ? "0.00" : "0.00 hrs";
          return `
            <label class="deductionEditRow">
              <b>${escapeHtml(field.label)}</b>
              <input class="platformInput" data-adjustment-field="${escapeHtml(field.key)}" inputmode="decimal" value="${value ? escapeHtml(String(value)) : ""}" placeholder="${escapeHtml(suffix)}">
            </label>
          `;
        }).join("")}
      </div>
    </div>
    <div class="deductionGroup">
      <div class="deductionGroupTitle">Deductions</div>
      <div class="deductionGroupGrid">
        ${visibleStandardDeductionFields().map((field) => {
    const amount = deductionAmountForField(deductions, field);
    const isAuto = (field.key === "tax" && activePayrollRules().calculate_paye) || (field.key === "uif" && activePayrollRules().calculate_uif);
    return `
      <label class="deductionEditRow">
        <b>${escapeHtml(field.label)}${isAuto ? " (Auto)" : ""}</b>
        <input class="platformInput" data-deduction-field="${escapeHtml(field.key)}" ${isAuto ? "data-statutory-auto=\"true\" disabled" : ""} inputmode="decimal" value="${amount ? escapeHtml(String(amount.toFixed ? amount.toFixed(2) : amount)) : ""}" placeholder="0.00">
      </label>
    `;
  }).join("")}
        ${visibleCustomDeductionTypes().map((type) => {
          const amount = deductionAmountForType(deductions, type);
          const isAuto = deductions.some((deduction) => (
            deduction.active
            && deduction.automatic_levy
            && (
              String(deduction.deduction_type_id || "") === String(type.id || "")
              || String(deduction.description || "").toLowerCase() === String(type.name || "").toLowerCase()
            )
          ));
          return `
            <label class="deductionEditRow">
              <b>${escapeHtml(type.name)}${isAuto ? " (Auto)" : ""}</b>
              <input class="platformInput" data-custom-deduction-id="${escapeHtml(type.id)}" data-custom-deduction-name="${escapeHtml(type.name)}" inputmode="decimal" value="${amount ? escapeHtml(amount.toFixed(2)) : ""}" placeholder="0.00">
            </label>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function setDeductionEditorOpen(open) {
  deductionsEditOpen = open;
  el.deductionList.hidden = !open;
  el.deductionForm.hidden = !open;
  el.btnEditDeductions.innerHTML = open
    ? `<i class="ph ph-x"></i>`
    : `<i class="ph ph-pencil-simple"></i>`;
  el.btnEditDeductions.title = open ? "Close deductions editor" : "Edit deductions";
  el.btnEditDeductions.setAttribute("aria-label", open ? "Close deductions editor" : "Edit deductions");
}

function openPayrollDeductions(employeeId) {
  const row = payrollRows.find((item) => String(item.employee_id) === String(employeeId));
  if (!row) return;
  currentDeductionEmployeeId = String(employeeId || "");
  const totalDeductions = moneyNumber(row.totalDeductions);
  const totalAdjustments = moneyNumber(row.totalAdjustments);
  const gross = moneyNumber(row.gross);
  const net = Math.max(0, gross - totalDeductions);
  const { start, end } = payrollPeriodRange();

  el.payrollDeductionsEmployee.textContent = `${row.employee_id} - ${row.employee_name || "Employee"} • ${formatPayslipDate(start)} to ${formatPayslipDate(end)}`;
  el.deductionGrossPay.textContent = formatMoney(gross);
  if (el.adjustmentTotal) el.adjustmentTotal.textContent = formatMoney(totalAdjustments);
  el.deductionTotal.textContent = formatMoney(totalDeductions);
  el.deductionNetPay.textContent = formatMoney(net);
  el.deductionDescription.value = "";
  el.deductionAmount.value = "";

  if (!payrollDeductionsAvailable || !payrollAdjustmentsAvailable) {
    const missing = [
      !payrollDeductionsAvailable ? "database/payroll-deductions.sql" : "",
      !payrollAdjustmentsAvailable ? "database/payroll-adjustments.sql" : ""
    ].filter(Boolean).join(" and ");
    el.deductionList.innerHTML = `<div class="mutedText">Payroll tables are not installed yet. Run <b>${escapeHtml(missing)}</b>, then refresh payroll.</div>`;
    el.deductionList.hidden = false;
    el.deductionForm.hidden = true;
    el.btnEditDeductions.disabled = true;
  } else {
    el.btnEditDeductions.disabled = false;
    renderDeductionEditor(row);
    setDeductionEditorOpen(false);
  }

  el.payrollDeductionsModal.classList.add("show");
  el.payrollDeductionsModal.setAttribute("aria-hidden", "false");
}

function closePayrollDeductions() {
  currentDeductionEmployeeId = "";
  setDeductionEditorOpen(false);
  el.payrollDeductionsModal.classList.remove("show");
  el.payrollDeductionsModal.setAttribute("aria-hidden", "true");
}

function openDeductionEditor() {
  const row = selectedDeductionRow();
  if (!row || !payrollDeductionsAvailable) return;
  renderDeductionEditor(row);
  setDeductionEditorOpen(true);
}

function toggleDeductionEditor() {
  if (deductionsEditOpen) {
    setDeductionEditorOpen(false);
    return;
  }
  openDeductionEditor();
}

async function savePayrollDeductions() {
  const company = currentCompany();
  const row = selectedDeductionRow();
  const { start, end } = payrollPeriodRange();
  if (!company || !row) return alert("Run payroll and choose an employee first.");
  if (!start || !end) return alert("Choose a payroll date range first.");
  const deductionEntries = Array.from(el.deductionList.querySelectorAll("[data-deduction-field]"))
    .filter((input) => input.getAttribute("data-statutory-auto") !== "true")
    .map((input) => {
      const field = STANDARD_DEDUCTION_FIELDS.find((item) => item.key === input.getAttribute("data-deduction-field"));
      const amount = moneyNumber(input.value);
      const type = field ? deductionTypeForField(field) : null;
      return field && amount > 0 ? {
        company_id: company.id,
        company_name: company.name,
        employee_id: row.employee_id,
        employee_name: row.employee_name || "",
        deduction_type_id: type?.id || null,
        description: field.label,
        amount,
        period_start: start,
        period_end: end,
        created_by: currentUser?.id || null,
        active: true
      } : null;
    })
    .filter(Boolean);
  const visibleStandardKeys = new Set(visibleStandardDeductionFields().map((field) => field.key));
  const hiddenStandardDeductionEntries = STANDARD_DEDUCTION_FIELDS
    .filter((field) => !visibleStandardKeys.has(field.key))
    .map((field) => {
      const amount = deductionAmountForField(row.deductions || [], field);
      const type = deductionTypeForField(field);
      return amount > 0 ? {
        company_id: company.id,
        company_name: company.name,
        employee_id: row.employee_id,
        employee_name: row.employee_name || "",
        deduction_type_id: type?.id || null,
        description: field.label,
        amount,
        period_start: start,
        period_end: end,
        created_by: currentUser?.id || null,
        active: true
      } : null;
    })
    .filter(Boolean);
  deductionEntries.push(...hiddenStandardDeductionEntries);
  const customDeductionEntries = Array.from(el.deductionList.querySelectorAll("[data-custom-deduction-id]"))
    .map((input) => {
      const amount = moneyNumber(input.value);
      const typeId = input.getAttribute("data-custom-deduction-id") || "";
      const typeName = input.getAttribute("data-custom-deduction-name") || "";
      const type = visibleCustomDeductionTypes().find((item) => String(item.id) === String(typeId));
      return type && amount > 0 ? {
        company_id: company.id,
        company_name: company.name,
        employee_id: row.employee_id,
        employee_name: row.employee_name || "",
        deduction_type_id: type.id,
        description: typeName || type.name,
        amount,
        period_start: start,
        period_end: end,
        created_by: currentUser?.id || null,
        active: true
      } : null;
    })
    .filter(Boolean);
  deductionEntries.push(...customDeductionEntries);
  const rules = activePayrollRules();
  const adjustmentEntries = Array.from(el.deductionList.querySelectorAll("[data-adjustment-field]"))
    .map((input) => {
      const field = STANDARD_ADJUSTMENT_FIELDS.find((item) => item.key === input.getAttribute("data-adjustment-field"));
      const value = moneyNumber(input.value);
      if (!field || value <= 0) return null;
      const rate = payrollHourlyRateForPayType(row.pay_type, row.rate, rules);
      const multiplier = field.mode === "ot1_hours"
        ? rules.ot1_multiplier
        : field.mode === "ot2_hours"
          ? rules.ot2_multiplier
          : 1;
      const hours = field.mode === "amount" ? 0 : value;
      const amount = field.mode === "amount" ? value : hours * rate * multiplier;
      return {
        company_id: company.id,
        company_name: company.name,
        employee_id: row.employee_id,
        employee_name: row.employee_name || "",
        adjustment_type: field.key,
        description: field.label,
        hours,
        amount,
        period_start: start,
        period_end: end,
        created_by: currentUser?.id || null,
        active: true
      };
    })
    .filter(Boolean);

  el.btnSaveDeduction.disabled = true;
  el.btnSaveDeduction.textContent = "Saving...";
  try {
    const { error: clearError } = await sb
      .from(PAYROLL_DEDUCTIONS_TABLE)
      .update({ active: false })
      .eq("company_id", company.id)
      .eq("employee_id", row.employee_id)
      .eq("period_start", start)
      .eq("period_end", end);
    if (clearError) throw clearError;

    const { error: clearAdjustmentError } = await sb
      .from(PAYROLL_ADJUSTMENTS_TABLE)
      .update({ active: false })
      .eq("company_id", company.id)
      .eq("employee_id", row.employee_id)
      .eq("period_start", start)
      .eq("period_end", end);
    if (clearAdjustmentError) throw clearAdjustmentError;

    if (deductionEntries.length) {
      const { error: insertError } = await sb.from(PAYROLL_DEDUCTIONS_TABLE).insert(deductionEntries);
      if (insertError) throw insertError;
    }
    if (adjustmentEntries.length) {
      const { error: adjustmentInsertError } = await sb.from(PAYROLL_ADJUSTMENTS_TABLE).insert(adjustmentEntries);
      if (adjustmentInsertError) throw adjustmentInsertError;
    }
    await runPayrollReport(true);
    openPayrollDeductions(row.employee_id);
  } catch (error) {
    alert(`Failed to save payroll changes: ${error.message || error}`);
  } finally {
    el.btnSaveDeduction.disabled = false;
    el.btnSaveDeduction.textContent = "Save Payroll Changes";
  }
}

function openPayslipModal() {
  if (!payrollRows.length) return alert("Run payroll before generating a payslip.");
  const company = currentCompany();
  el.payslipEmployeeSelect.innerHTML = [
    `<option value="__all__">All employees (${payrollRows.length} payslips)</option>`,
    ...payrollRows.map((row) => (
    `<option value="${escapeHtml(row.employee_id)}">${escapeHtml(row.employee_id)} - ${escapeHtml(row.employee_name || "Employee")} (${escapeHtml(formatMoney(row.gross))})</option>`
    ))
  ].join("");
  if (el.payslipModalSub) {
    el.payslipModalSub.textContent = usesPayrollYtd(company, el.payrollEndDate?.value)
      ? "Generating saves this period's totals so PAYE carries forward correctly."
      : "Choose an employee from the current payroll run.";
  }
  el.btnGeneratePayslip.textContent = usesPayrollYtd(company, el.payrollEndDate?.value)
    ? "Finalise & Generate Payslip"
    : "Generate Payslip";
  el.payslipModal.classList.add("show");
  el.payslipModal.setAttribute("aria-hidden", "false");
}

function closePayslipModal() {
  el.payslipModal.classList.remove("show");
  el.payslipModal.setAttribute("aria-hidden", "true");
}

function formatPayslipDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return value;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd}`;
}

function payslipAmount(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && Math.abs(number) > 0.004 ? number.toFixed(2) : "-";
}

function moneyNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function payrollPeriodRange() {
  return {
    start: el.payrollStartDate?.value || "",
    end: el.payrollEndDate?.value || ""
  };
}

function normaliseDeduction(row = {}) {
  return {
    id: row.id || row.deduction_id || "",
    company_id: row.company_id || "",
    employee_id: row.employee_id || "",
    employee_name: row.employee_name || "",
    deduction_type_id: row.deduction_type_id || "",
    description: row.description || "",
    amount: moneyNumber(row.amount),
    period_start: row.period_start || "",
    period_end: row.period_end || "",
    active: row.active !== false,
    automatic_levy: row.automatic_levy === true
  };
}

function normaliseDeductionType(row = {}) {
  return {
    id: row.id || row.deduction_type_id || "",
    name: row.name || "",
    default_amount: moneyNumber(row.default_amount),
    active: row.active !== false,
    sort_order: Number(row.sort_order || 100),
    editor_visible: row.editor_visible === true
  };
}

function periodCountForPayCycle(payCycle) {
  const cycle = String(payCycle || "fortnightly").toLowerCase();
  if (cycle === "weekly") return 52;
  if (cycle === "monthly") return 12;
  return 26;
}

function calculateAnnualTax2027(annualIncome) {
  const taxable = Math.max(0, moneyNumber(annualIncome));
  const bracket = SA_PAYE_2027.brackets.find((item) => taxable <= item.upTo) || SA_PAYE_2027.brackets[SA_PAYE_2027.brackets.length - 1];
  const taxBeforeRebate = bracket.base + Math.max(0, taxable - bracket.over) * bracket.rate;
  return Math.max(0, taxBeforeRebate - SA_PAYE_2027.primaryRebate);
}

function calculateCumulativePaye(gross, providentContribution, periodCount, ytdContext) {
  const completedPeriods = Number(ytdContext?.completedPeriods || 0)
    + Number(ytdContext?.finalizedPeriods || 0);
  const periodsElapsed = Math.min(periodCount, Math.max(1, completedPeriods + 1));
  const previousGross = Math.max(0, moneyNumber(ytdContext?.previousGross));
  const previousRetirement = Math.max(0, moneyNumber(ytdContext?.previousRetirement));
  const previousPaye = Math.max(0, moneyNumber(ytdContext?.previousPaye));
  const cumulativeGross = previousGross + Math.max(0, moneyNumber(gross));
  const cumulativeRetirement = previousRetirement + Math.max(0, moneyNumber(providentContribution));
  const qualifyingRetirement = Math.min(
    cumulativeRetirement,
    cumulativeGross * 0.275,
    SA_RETIREMENT_FUND_ANNUAL_LIMIT * periodsElapsed / periodCount
  );
  const cumulativePayeRemuneration = Math.max(0, cumulativeGross - qualifyingRetirement);
  const annualEquivalent = cumulativePayeRemuneration * periodCount / periodsElapsed;
  const cumulativePayeLiability = calculateAnnualTax2027(annualEquivalent) * periodsElapsed / periodCount;
  const amount = Math.round(Math.max(0, cumulativePayeLiability - previousPaye) * 100) / 100;

  return {
    amount,
    tax_year_start: ytdContext?.taxYearStart || "",
    periods_elapsed: periodsElapsed,
    gross_remuneration: Math.round(cumulativeGross * 100) / 100,
    retirement_fund_contributions: Math.round(cumulativeRetirement * 100) / 100,
    paye_deducted: Math.round((previousPaye + amount) * 100) / 100
  };
}

function statutoryDeductionRows(row, rulesInput = activePayrollRules(), existingDeductions = [], ytdContext = null) {
  const rules = normalisePayrollRules(rulesInput);
  const gross = moneyNumber(row.gross);
  if (gross <= 0 && !ytdContext?.enabled) return [];
  const periodCount = periodCountForPayCycle(row.pay_cycle);
  const deductions = [];

  if (rules.calculate_uif && gross > 0) {
    const periodCeiling = SA_UIF_MONTHLY_CEILING * 12 / periodCount;
    const amount = Math.min(gross, periodCeiling) * SA_UIF_RATE;
    if (amount > 0) {
      deductions.push({
        employee_id: row.employee_id,
        employee_name: row.employee_name || "",
        description: "UIF",
        amount,
        active: true,
        statutory: true
      });
    }
  }

  if (rules.calculate_paye) {
    const providentContribution = isTrElectricalCompany()
      ? Math.max(0, deductionAmountForField(existingDeductions, { label: "Provident" }))
      : 0;
    const ytdPaye = ytdContext?.enabled
      ? calculateCumulativePaye(gross, providentContribution, periodCount, ytdContext)
      : null;
    const amount = ytdPaye
      ? ytdPaye.amount
      : (() => {
          const qualifyingProvident = Math.min(
            providentContribution,
            gross * 0.275,
            SA_RETIREMENT_FUND_ANNUAL_LIMIT / periodCount
          );
          const payeRemuneration = Math.max(0, gross - qualifyingProvident);
          const annualTax = calculateAnnualTax2027(payeRemuneration * periodCount);
          return annualTax / periodCount;
        })();
    if (amount > 0 || ytdPaye) {
      deductions.push({
        employee_id: row.employee_id,
        employee_name: row.employee_name || "",
        description: "Tax",
        amount,
        active: true,
        statutory: true,
        ytd: ytdPaye
      });
    }
  }

  return deductions;
}

function normaliseAdjustment(row = {}) {
  return {
    id: row.id || row.adjustment_id || "",
    company_id: row.company_id || "",
    employee_id: row.employee_id || "",
    employee_name: row.employee_name || "",
    adjustment_type: row.adjustment_type || "",
    description: row.description || "",
    hours: moneyNumber(row.hours),
    amount: moneyNumber(row.amount),
    period_start: row.period_start || "",
    period_end: row.period_end || "",
    active: row.active !== false
  };
}

function attachDeductionsToPayrollRows(rows, deductions, rulesInput = activePayrollRules(), ytdContext = null) {
  const rules = normalisePayrollRules(rulesInput);
  const autoKeys = new Set([
    rules.calculate_paye ? "tax" : "",
    rules.calculate_uif ? "uif" : ""
  ].filter(Boolean));
  const byEmployee = new Map();
  for (const deduction of (deductions || []).map(normaliseDeduction).filter((item) => item.active)) {
    const standardField = STANDARD_DEDUCTION_FIELDS.find((field) => deductionAmountForField([deduction], field) > 0);
    if (standardField && autoKeys.has(standardField.key)) continue;
    const key = String(deduction.employee_id || "");
    if (!byEmployee.has(key)) byEmployee.set(key, []);
    byEmployee.get(key).push(deduction);
  }
  return (rows || []).map((row) => {
    const existingDeductions = byEmployee.get(String(row.employee_id || "")) || [];
    const employeeYtdContext = payrollEmployeeYtdContext(ytdContext, row.employee_id);
    const rowDeductions = [
      ...existingDeductions,
      ...statutoryDeductionRows(row, rules, existingDeductions, employeeYtdContext)
    ];
    const totalDeductions = rowDeductions.reduce((sum, item) => sum + moneyNumber(item.amount), 0);
    const gross = moneyNumber(row.gross);
    const taxYtd = rowDeductions.find((item) => item.ytd)?.ytd || null;
    return {
      ...row,
      deductions: rowDeductions,
      totalDeductions,
      net: Math.max(0, gross - totalDeductions),
      ytd: taxYtd
    };
  });
}

function attachAdjustmentsToPayrollRows(rows, adjustments, rulesInput = activePayrollRules()) {
  const rules = normalisePayrollRules(rulesInput);
  const byEmployee = new Map();
  for (const adjustment of (adjustments || []).map(normaliseAdjustment).filter((item) => item.active && isStandardAdjustment(item))) {
    const key = String(adjustment.employee_id || "");
    if (!byEmployee.has(key)) byEmployee.set(key, []);
    byEmployee.get(key).push(adjustment);
  }

  return (rows || []).map((row) => {
    const rowAdjustments = byEmployee.get(String(row.employee_id || "")) || [];
    const breakdown = { ...(row.breakdown || {}) };
    const rate = payrollHourlyRateForPayType(row.pay_type, row.rate, rules);
    let totalAdjustments = 0;
    let totalAdjustmentHours = 0;

    for (const adjustment of rowAdjustments) {
      const type = String(adjustment.adjustment_type || "");
      const hours = moneyNumber(adjustment.hours);
      const amount = moneyNumber(adjustment.amount);
      totalAdjustments += amount;
      if (!["allowance", "bonus"].includes(type)) totalAdjustmentHours += hours;

      if (type === "paid_leave") {
        breakdown.paidLeaveHours = moneyNumber(breakdown.paidLeaveHours) + hours;
        breakdown.paidLeavePay = moneyNumber(breakdown.paidLeavePay) + amount;
        breakdown.normalHours = moneyNumber(breakdown.normalHours) + hours;
        breakdown.normalPay = moneyNumber(breakdown.normalPay) + amount;
      } else if (type === "manual_normal_hours") {
        breakdown.manualNormalHours = moneyNumber(breakdown.manualNormalHours) + hours;
        breakdown.manualNormalPay = moneyNumber(breakdown.manualNormalPay) + amount;
        breakdown.normalHours = moneyNumber(breakdown.normalHours) + hours;
        breakdown.normalPay = moneyNumber(breakdown.normalPay) + amount;
      } else if (type === "manual_ot1") {
        const safeAmount = amount || hours * rate * rules.ot1_multiplier;
        breakdown.manualOt1Hours = moneyNumber(breakdown.manualOt1Hours) + hours;
        breakdown.manualOt1Pay = moneyNumber(breakdown.manualOt1Pay) + safeAmount;
        breakdown.ot1Hours = moneyNumber(breakdown.ot1Hours) + hours;
        breakdown.ot1Pay = moneyNumber(breakdown.ot1Pay) + safeAmount;
      } else if (type === "manual_ot2") {
        const safeAmount = amount || hours * rate * rules.ot2_multiplier;
        breakdown.manualOt2Hours = moneyNumber(breakdown.manualOt2Hours) + hours;
        breakdown.manualOt2Pay = moneyNumber(breakdown.manualOt2Pay) + safeAmount;
        breakdown.ot2Hours = moneyNumber(breakdown.ot2Hours) + hours;
        breakdown.ot2Pay = moneyNumber(breakdown.ot2Pay) + safeAmount;
      } else if (type === "bonus") {
        breakdown.bonusPay = moneyNumber(breakdown.bonusPay) + amount;
      } else if (type === "allowance") {
        breakdown.allowancePay = moneyNumber(breakdown.allowancePay) + amount;
      }
    }

    const hours = moneyNumber(row.hours) + totalAdjustmentHours;
    const gross = moneyNumber(row.gross) + totalAdjustments;
    breakdown.totalHours = moneyNumber(breakdown.totalHours) + totalAdjustmentHours;
    breakdown.gross = moneyNumber(breakdown.gross) + totalAdjustments;

    return {
      ...row,
      adjustments: rowAdjustments,
      totalAdjustments,
      hours,
      gross,
      breakdown
    };
  });
}

async function fetchCompanyDeductionTypes(company) {
  if (!company) return [];
  const { data, error } = await sb
    .from(COMPANY_DEDUCTION_TYPES_TABLE)
    .select("id,name,default_amount,active,sort_order,editor_visible")
    .eq(COMPANY_ID_COL, company.id)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    payrollDeductionsAvailable = false;
    console.warn("Deduction types not available yet:", error.message);
    return [];
  }

  payrollDeductionsAvailable = true;
  return (data || []).map(normaliseDeductionType);
}

async function fetchPayrollLevyPeriod(company, start, end) {
  if (!isTrElectricalCompany(company) || !start || !end) return null;
  const { data, error } = await sb
    .from(COMPANY_PAYROLL_LEVY_PERIODS_TABLE)
    .select("id,company_id,period_start,period_end,levy_scheme,levy_weeks,rate_version,employee_designations,employee_levy_memberships")
    .eq(COMPANY_ID_COL, company.id)
    .eq("period_start", start)
    .eq("period_end", end)
    .eq("levy_scheme", "nbcei")
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function savePayrollLevyPeriod(company, start, end, weeks) {
  const levyWeeks = Number(weeks);
  if (!isTrElectricalCompany(company) || ![4, 5].includes(levyWeeks)) return null;
  const payload = {
    company_id: company.id,
    period_start: start,
    period_end: end,
    levy_scheme: "nbcei",
    levy_weeks: levyWeeks,
    rate_version: TR_ELECTRICAL_NBCEI_RATE_VERSION,
    employee_designations: Object.fromEntries(
      companyAdminEmployees
        .filter((employee) => employee.active !== false)
        .map((employee) => [
          String(employee.employee_id || ""),
          normaliseNbceiDesignationCode(employee.nbcei_designation_code)
        ])
        .filter(([employeeId, designation]) => employeeId && designation)
    ),
    employee_levy_memberships: Object.fromEntries(
      companyAdminEmployees
        .filter((employee) => employee.active !== false)
        .map((employee) => [
          String(employee.employee_id || ""),
          {
            sbf_member: employee.sbf_member === true,
            saewa_member: employee.saewa_member === true
          }
        ])
        .filter(([employeeId]) => employeeId)
    ),
    created_by: currentUser?.id || null,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await sb
    .from(COMPANY_PAYROLL_LEVY_PERIODS_TABLE)
    .upsert(payload, { onConflict: "company_id,period_start,period_end,levy_scheme" })
    .select("id,company_id,period_start,period_end,levy_scheme,levy_weeks,rate_version,employee_designations,employee_levy_memberships")
    .single();
  if (error) throw error;
  return data;
}

function payrollTaxYearStart(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || month < 1 || month > 12) return "";
  return `${month >= 3 ? year : year - 1}-03-01`;
}

function payrollYtdTakeoverDate(company = currentCompany()) {
  return PAYROLL_YTD_TAKEOVER_DATES[String(company?.id || "")] || "";
}

function usesPayrollYtd(company, periodEnd) {
  const takeoverDate = payrollYtdTakeoverDate(company);
  return Boolean(takeoverDate && String(periodEnd || "") >= takeoverDate);
}

async function fetchPayrollYtdContext(company, periodStart, periodEnd, employeeId = "") {
  const takeoverDate = payrollYtdTakeoverDate(company);
  const enabled = usesPayrollYtd(company, periodEnd);
  const taxYearStart = payrollTaxYearStart(periodEnd);
  if (!enabled || !taxYearStart) {
    return { enabled: false, taxYearStart, takeoverDate, byEmployee: new Map() };
  }

  let openingQuery = sb
    .from(EMPLOYEE_PAYROLL_YTD_OPENING_TABLE)
    .select("employee_id,tax_year_start,as_of_date,completed_periods,gross_remuneration,retirement_fund_contributions,paye_deducted")
    .eq(COMPANY_ID_COL, company.id)
    .eq("tax_year_start", taxYearStart);
  let periodQuery = sb
    .from(EMPLOYEE_PAYROLL_PERIOD_TOTALS_TABLE)
    .select("employee_id,period_start,period_end,period_number,gross_remuneration,retirement_fund_contributions,paye_deducted")
    .eq(COMPANY_ID_COL, company.id)
    .eq("tax_year_start", taxYearStart)
    .lt("period_start", periodStart);
  if (employeeId) {
    openingQuery = openingQuery.eq("employee_id", employeeId);
    periodQuery = periodQuery.eq("employee_id", employeeId);
  }

  const [
    { data: openingRows, error: openingError },
    { data: periodRows, error: periodError }
  ] = await Promise.all([openingQuery, periodQuery]);
  if (openingError) throw openingError;
  if (periodError) throw periodError;

  const byEmployee = new Map();
  for (const opening of openingRows || []) {
    if (String(opening.as_of_date || "") >= String(periodEnd || "")) continue;
    byEmployee.set(String(opening.employee_id || ""), {
      enabled: true,
      hasOpening: true,
      taxYearStart,
      asOfDate: opening.as_of_date || "",
      completedPeriods: Number(opening.completed_periods || 0),
      previousGross: moneyNumber(opening.gross_remuneration),
      previousRetirement: moneyNumber(opening.retirement_fund_contributions),
      previousPaye: moneyNumber(opening.paye_deducted),
      finalizedPeriods: 0
    });
  }

  for (const period of periodRows || []) {
    const key = String(period.employee_id || "");
    const context = byEmployee.get(key) || {
      enabled: true,
      hasOpening: false,
      taxYearStart,
      asOfDate: "",
      completedPeriods: 0,
      previousGross: 0,
      previousRetirement: 0,
      previousPaye: 0,
      finalizedPeriods: 0
    };
    if (context.asOfDate && String(period.period_end || "") <= context.asOfDate) continue;
    context.previousGross += moneyNumber(period.gross_remuneration);
    context.previousRetirement += moneyNumber(period.retirement_fund_contributions);
    context.previousPaye += moneyNumber(period.paye_deducted);
    context.finalizedPeriods += 1;
    byEmployee.set(key, context);
  }

  return {
    enabled: true,
    taxYearStart,
    takeoverDate,
    companyName: company.name || "Company",
    byEmployee
  };
}

function payrollEmployeeYtdContext(ytdContext, employeeId) {
  if (!ytdContext?.enabled) return null;
  return ytdContext.byEmployee.get(String(employeeId || "")) || {
    enabled: true,
    hasOpening: false,
    taxYearStart: ytdContext.taxYearStart,
    asOfDate: "",
    completedPeriods: 0,
    previousGross: 0,
    previousRetirement: 0,
    previousPaye: 0,
    finalizedPeriods: 0
  };
}

function expectedMonthlyPeriodsBefore(periodStart, taxYearStart) {
  const period = new Date(`${periodStart}T00:00:00`);
  const taxStart = new Date(`${taxYearStart}T00:00:00`);
  if (!Number.isFinite(period.getTime()) || !Number.isFinite(taxStart.getTime())) return 0;
  return Math.max(0, (period.getFullYear() - taxStart.getFullYear()) * 12 + period.getMonth() - taxStart.getMonth());
}

function validatePayrollYtdContinuity(rows, ytdContext, periodEnd) {
  if (!ytdContext?.enabled) return;
  const problems = [];
  const isTakeoverTaxYear = ytdContext.taxYearStart === "2026-03-01";
  for (const row of rows || []) {
    if (moneyNumber(row.rate) <= 0 && moneyNumber(row.gross) <= 0) continue;
    const context = payrollEmployeeYtdContext(ytdContext, row.employee_id);
    const employedBeforeTakeover = !row.employment_date
      || String(row.employment_date) < ytdContext.takeoverDate;
    if (isTakeoverTaxYear && employedBeforeTakeover && !context.hasOpening) {
      problems.push(`${row.employee_id} - ${row.employee_name || "Employee"}: July YTD opening balance missing`);
      continue;
    }
    if (String(row.pay_cycle || "").toLowerCase() !== "monthly" || !context.hasOpening) continue;
    const expectedCompleted = expectedMonthlyPeriodsBefore(periodEnd, ytdContext.taxYearStart);
    const actualCompleted = context.completedPeriods + context.finalizedPeriods;
    if (actualCompleted !== expectedCompleted) {
      problems.push(
        `${row.employee_id} - ${row.employee_name || "Employee"}: `
        + `expected ${expectedCompleted} completed period${expectedCompleted === 1 ? "" : "s"}, found ${actualCompleted}`
      );
    }
  }
  if (problems.length) {
    throw new Error(
      `${ytdContext.companyName || "Company"} YTD history is incomplete:\n\n${problems.slice(0, 8).join("\n")}`
      + `${problems.length > 8 ? `\n+ ${problems.length - 8} more` : ""}`
      + "\n\nFinalize the missing earlier payroll period before continuing."
    );
  }
}

async function fetchPayrollDeductions(company, start, end, employeeId = "") {
  if (!company || !start || !end) return [];
  let query = sb
    .from(PAYROLL_DEDUCTIONS_TABLE)
    .select("id,company_id,employee_id,employee_name,deduction_type_id,description,amount,period_start,period_end,active")
    .eq(COMPANY_ID_COL, company.id)
    .eq("period_start", start)
    .eq("period_end", end)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (employeeId) query = query.eq("employee_id", employeeId);

  const { data, error } = await query;
  if (error) {
    payrollDeductionsAvailable = false;
    console.warn("Payroll deductions not available yet:", error.message);
    return [];
  }

  payrollDeductionsAvailable = true;
  return (data || []).map(normaliseDeduction);
}

async function fetchPayrollAdjustments(company, start, end, employeeId = "") {
  if (!company || !start || !end) return [];
  let query = sb
    .from(PAYROLL_ADJUSTMENTS_TABLE)
    .select("id,company_id,employee_id,employee_name,adjustment_type,description,hours,amount,period_start,period_end,active")
    .eq(COMPANY_ID_COL, company.id)
    .eq("period_start", start)
    .eq("period_end", end)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (employeeId) query = query.eq("employee_id", employeeId);

  const { data, error } = await query;
  if (error) {
    payrollAdjustmentsAvailable = false;
    console.warn("Payroll adjustments not available yet:", error.message);
    return [];
  }

  payrollAdjustmentsAvailable = true;
  return (data || []).map(normaliseAdjustment);
}

function payslipHours(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && Math.abs(number) > 0.004 ? formatHours(number) : "0.00";
}

function payslipEarningLine(description, rate, hours, amount, quantityLabel = null) {
  return `<tr>
    <td>${escapeHtml(description || "")}</td>
    <td>${escapeHtml(quantityLabel || payslipHours(hours))}</td>
    <td>R ${payslipAmount(rate)}</td>
    <td>R ${payslipAmount(amount)}</td>
  </tr>`;
}

function payslipOptionalEarningLine(description, rate, hours, amount, quantityLabel = null) {
  return Math.abs(Number(hours || 0)) > 0.004 || Math.abs(Number(amount || 0)) > 0.004
    ? payslipEarningLine(description, rate, hours, amount, quantityLabel)
    : "";
}

function payslipDeductionLine(description, amount = 0) {
  return `<tr>
    <td>${escapeHtml(description || "")}</td>
    <td>R ${payslipAmount(amount)}</td>
  </tr>`;
}

async function savePayrollPeriodTotals(company, rows, start, end) {
  if (
    !usesPayrollYtd(company, end)
    || !rows?.length
  ) {
    return;
  }

  const records = rows.map((row) => {
    if (!row.ytd?.tax_year_start || !row.ytd?.periods_elapsed) {
      throw new Error(`YTD calculation is missing for ${row.employee_id} - ${row.employee_name || "Employee"}.`);
    }
    return {
      company_id: company.id,
      employee_id: row.employee_id,
      tax_year_start: row.ytd.tax_year_start,
      period_start: start,
      period_end: end,
      period_number: row.ytd.periods_elapsed,
      gross_remuneration: Math.round(Math.max(0, moneyNumber(row.gross)) * 100) / 100,
      retirement_fund_contributions: Math.round(Math.max(
        0,
        deductionAmountForField(row.deductions || [], { label: "Provident" })
      ) * 100) / 100,
      paye_deducted: Math.round(Math.max(
        0,
        deductionAmountForField(row.deductions || [], { label: "Tax" })
      ) * 100) / 100,
      finalized_by: currentUser?.id || null,
      finalized_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });

  const { error } = await sb
    .from(EMPLOYEE_PAYROLL_PERIOD_TOTALS_TABLE)
    .upsert(records, { onConflict: "company_id,employee_id,period_start,period_end" });
  if (error) throw error;
}

async function generateSelectedPayslip() {
  const employeeId = el.payslipEmployeeSelect.value;
  const company = currentCompany();
  const rows = employeeId === "__all__"
    ? payrollRows
    : payrollRows.filter((item) => String(item.employee_id) === String(employeeId));
  if (!company || !rows.length) return alert("Choose an employee first.");

  const win = window.open("", "_blank");
  if (!win) return alert("Allow popups for this site so Shiftly can open the payslip.");
  el.btnGeneratePayslip.disabled = true;
  const originalLabel = el.btnGeneratePayslip.textContent;
  el.btnGeneratePayslip.textContent = "Preparing...";
  try {
    await savePayrollPeriodTotals(
      company,
      rows,
      el.payrollStartDate.value,
      el.payrollEndDate.value
    );
    win.document.open();
    win.document.write(buildPayslipDocument(company, rows, {
      start: el.payrollStartDate.value,
      end: el.payrollEndDate.value
    }));
    win.document.close();
    closePayslipModal();
  } catch (error) {
    win.close();
    alert(`Failed to finalise payroll: ${error.message || error}`);
  } finally {
    el.btnGeneratePayslip.disabled = false;
    el.btnGeneratePayslip.textContent = originalLabel;
  }
}

function buildPayslipPage(company, row, period) {
  const b = row.breakdown || {};
  const rules = activePayrollRules();
  const rate = Number(row.rate || 0);
  const isMonthly = row.pay_type === "monthly";
  const isDaily = row.pay_type === "daily";
  const hourlyRate = payrollHourlyRateForPayType(row.pay_type, rate, rules);
  const publicHolidayWorkedHours = Number(b.publicHolidayWorkedHours || 0);
  const paidLeaveHours = Number(b.paidLeaveHours || 0);
  const paidLeavePay = Number(b.paidLeavePay || 0);
  const manualNormalHours = Number(b.manualNormalHours || 0);
  const manualNormalPay = Number(b.manualNormalPay || 0);
  const manualOt1Hours = Number(b.manualOt1Hours || 0);
  const manualOt1Pay = Number(b.manualOt1Pay || 0);
  const manualOt2Hours = Number(b.manualOt2Hours || 0);
  const manualOt2Pay = Number(b.manualOt2Pay || 0);
  const allowancePay = Number(b.allowancePay || 0);
  const bonusPay = Number(b.bonusPay || 0);
  const normalHours = isMonthly ? 0 : Math.max(0, Number(b.normalHours || 0) - paidLeaveHours - manualNormalHours);
  const normalPay = isMonthly ? rate : Math.max(0, Number(b.normalPay || 0) - paidLeavePay - manualNormalPay);
  const dailyWageDays = isDaily ? dailyDayCount(row) : 0;
  const dailyWageLabel = isDaily ? `${formatDays(dailyWageDays)} ${Math.abs(dailyWageDays - 1) < 0.0001 ? "day" : "days"}` : null;
  const ot1Hours = Math.max(0, Number(b.ot1Hours || 0) - manualOt1Hours);
  const ot1Pay = Math.max(0, ot1Hours * hourlyRate * rules.ot1_multiplier);
  const ot2Hours = Math.max(0, Number(b.ot2Hours || 0) - publicHolidayWorkedHours - manualOt2Hours);
  const ot2Pay = Math.max(0, ot2Hours * hourlyRate * rules.ot2_multiplier);
  const holidayHours = publicHolidayWorkedHours;
  const holidayPay = publicHolidayWorkedHours * hourlyRate * rules.ot2_multiplier;
  const totalEarnings = Number(row.gross || 0);
  const deductions = (row.deductions || []).map(normaliseDeduction).filter((item) => item.active);
  const totalDeductions = deductions.reduce((sum, item) => sum + moneyNumber(item.amount), 0);
  const fixedDeductionFields = STANDARD_DEDUCTION_FIELDS.filter((field) => FIXED_PAYSLIP_DEDUCTION_KEYS.includes(field.key));
  const optionalDeductionFields = STANDARD_DEDUCTION_FIELDS.filter((field) => !FIXED_PAYSLIP_DEDUCTION_KEYS.includes(field.key));
  const customDeductionTotals = Array.from(deductions
    .filter((deduction) => !isStandardDeduction(deduction))
    .reduce((totals, deduction) => {
      const label = String(deduction.description || "Other");
      totals.set(label, moneyNumber(totals.get(label)) + moneyNumber(deduction.amount));
      return totals;
    }, new Map())
    .entries());
  const netPay = Math.max(0, totalEarnings - totalDeductions);
  const logo = String(company.logo_url || "").trim();
  const logoHtml = logo
    ? `<img class="logoImg" src="${escapeHtml(logo)}" alt="${escapeHtml(company.name || "Company")} logo">`
    : `<div class="logoFallback">${escapeHtml(company.name || "Company")}</div>`;

  return `<div class="page">
      <section class="hero">
        <div class="logoBox">${logoHtml}</div>
        <div class="companyBlock">
          <div class="companyName">${escapeHtml(String(company.name || "Company"))}</div>
          <h1 class="docTitle">Payslip</h1>
          <div class="periodText">${escapeHtml(period)}</div>
        </div>
        <div class="payBadge">
          <span>Employee ID</span>
          <b>${escapeHtml(row.employee_id || "")}</b>
        </div>
      </section>

      <section class="infoCard">
        <div class="infoGrid">
          <div class="infoItem"><span>Employee</span><b>${escapeHtml(row.employee_name || "Employee")}</b></div>
          <div class="infoItem right"><span>ID Number</span><b>${escapeHtml(row.id_number || "-")}</b></div>
          <div class="infoItem"><span>Pay Type</span><b>${escapeHtml(formatPayType(row.pay_type))} - ${escapeHtml(formatPayCycle(row.pay_cycle))}</b></div>
          <div class="infoItem right"><span>Employment Date</span><b>${escapeHtml(formatPayslipDate(row.employment_date))}</b></div>
          ${row.ytd ? `
            <div class="infoItem"><span>YTD Gross</span><b>R ${payslipAmount(row.ytd.gross_remuneration)}</b></div>
            <div class="infoItem right"><span>YTD Provident</span><b>R ${payslipAmount(row.ytd.retirement_fund_contributions)}</b></div>
            <div class="infoItem"><span>YTD PAYE</span><b>R ${payslipAmount(row.ytd.paye_deducted)}</b></div>
            <div class="infoItem right"><span>Tax Period</span><b>${escapeHtml(String(row.ytd.periods_elapsed))} of ${escapeHtml(String(periodCountForPayCycle(row.pay_cycle)))}</b></div>
          ` : ""}
        </div>
      </section>

      <section class="moneyGrid">
        <div class="box">
          <div class="boxTitle">Earnings</div>
          <table class="earnings">
            <thead><tr><th>Description</th><th>Hours</th><th>Rate</th><th>Amount</th></tr></thead>
            <tbody>
              ${payslipEarningLine(isMonthly ? "Monthly Salary" : isDaily ? "Daily Wage" : "Normal Hours", rate, normalHours, normalPay, dailyWageLabel)}
              ${payslipEarningLine(`OT1 ${rules.ot1_multiplier}x`, hourlyRate * rules.ot1_multiplier, ot1Hours, ot1Pay)}
              ${payslipEarningLine(`OT2 ${rules.ot2_multiplier}x`, hourlyRate * rules.ot2_multiplier, ot2Hours, ot2Pay)}
              ${payslipEarningLine("Public Holiday", hourlyRate * rules.ot2_multiplier, holidayHours, holidayPay)}
              ${payslipOptionalEarningLine("Paid Leave", isDaily ? hourlyRate : rate, paidLeaveHours, paidLeavePay)}
              ${payslipOptionalEarningLine("Manual Normal Hrs", isDaily ? hourlyRate : rate, manualNormalHours, manualNormalPay)}
              ${payslipOptionalEarningLine(`Manual OT1 ${rules.ot1_multiplier}x`, hourlyRate * rules.ot1_multiplier, manualOt1Hours, manualOt1Pay)}
              ${payslipOptionalEarningLine(`Manual OT2 ${rules.ot2_multiplier}x`, hourlyRate * rules.ot2_multiplier, manualOt2Hours, manualOt2Pay)}
              ${payslipOptionalEarningLine("Allowance", 0, 0, allowancePay)}
              ${payslipOptionalEarningLine("Bonus", 0, 0, bonusPay)}
            </tbody>
          </table>
        </div>
        <div class="box">
          <div class="boxTitle">Deductions</div>
          <table class="deductions">
            <thead><tr><th>Description</th><th>Amount</th></tr></thead>
            <tbody>
              ${fixedDeductionFields.map((field) => (
                (() => {
                  const amount = deductionAmountForField(deductions, field);
                  const hideEmptyTrDeduction = isTrElectricalCompany(company)
                    && ["tools_ppe", "loan"].includes(field.key)
                    && amount <= 0;
                  return hideEmptyTrDeduction ? "" : payslipDeductionLine(field.label, amount);
                })()
              )).join("")}
              ${optionalDeductionFields.map((field) => {
                const amount = deductionAmountForField(deductions, field);
                return amount > 0 ? payslipDeductionLine(field.label, amount) : "";
              }).join("")}
              ${customDeductionTotals.map(([label, amount]) => (
                amount > 0 ? payslipDeductionLine(label, amount) : ""
              )).join("")}
            </tbody>
          </table>
        </div>
      </section>

      <section class="summary">
        <div class="summaryRow"><span>Total Earnings</span><b>R ${payslipAmount(totalEarnings)}</b></div>
        <div class="summaryRow"><span>Total Deductions</span><b>R ${totalDeductions > 0 ? payslipAmount(totalDeductions) : "-"}</b></div>
        <div class="summaryRow"><span>Net Pay</span><b>R ${payslipAmount(netPay)}</b></div>
      </section>
    </div>`;
}

function buildPayslipDocument(company, rowsOrRow, options = {}) {
  const rows = Array.isArray(rowsOrRow) ? rowsOrRow : [rowsOrRow];
  const title = rows.length > 1 ? "Payslips" : `Payslip ${rows[0]?.employee_id || ""}`;
  const period = `${formatPayslipDate(options.start || el.payrollStartDate?.value)} to ${formatPayslipDate(options.end || el.payrollEndDate?.value)}`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size:A4; margin:12mm; }
    *{box-sizing:border-box}
    :root{--ink:#151515;--muted:#6a645b;--line:#d8d0c2;--soft:#f7f4ee;--gold:#b88913}
    html{background:#d8d8d8}
    body{margin:0;background:#d8d8d8;color:var(--ink);font-family:Arial,Helvetica,sans-serif;font-size:11px}
    .preview{min-height:100vh;padding:58px 10px 28px;overflow:auto;display:grid;gap:18px}
    .page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:16mm;box-shadow:0 16px 50px rgba(0,0,0,.20);break-after:page}
    .page:last-child{break-after:auto}
    .tools{position:fixed;right:12px;top:10px;display:flex;gap:8px;z-index:10}
    .tools button{border:1px solid #1a1a1a;background:#fff;color:#111;border-radius:4px;padding:9px 12px;font-weight:700;cursor:pointer}
    .hero{display:grid;grid-template-columns:38mm 1fr 42mm;gap:12mm;align-items:center;border-bottom:2px solid var(--ink);padding-bottom:9mm;margin-bottom:8mm}
    .logoBox{width:35mm;height:26mm;display:flex;align-items:center;justify-content:center;overflow:hidden}
    .logoImg{max-width:100%;max-height:100%;object-fit:contain}
    .logoFallback{font-weight:900;text-align:center;border:1px solid var(--line);padding:8px;border-radius:5px}
    .companyBlock{text-align:left}
    .companyName{font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px}
    .docTitle{font-size:30px;font-weight:900;line-height:1;color:var(--gold);letter-spacing:.02em;margin:0}
    .periodText{margin-top:7px;color:var(--muted);font-size:12px;font-weight:700}
    .payBadge{border:1px solid var(--line);border-radius:10px;padding:9px 10px;background:var(--soft);text-align:right}
    .payBadge span{display:block;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.12em;font-weight:900}
    .payBadge b{display:block;font-size:16px;margin-top:3px}
    .infoCard{border:1px solid var(--line);border-radius:10px;background:#fff;padding:10px 12px;margin-bottom:10mm}
    .infoGrid{display:grid;grid-template-columns:1fr 1fr;gap:11px 22mm}
    .infoItem span{display:block;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.10em;font-weight:900;margin-bottom:3px}
    .infoItem b{font-size:12px}
    .infoItem.right{text-align:right}
    .moneyGrid{display:grid;grid-template-columns:1.25fr .9fr;gap:8mm;align-items:start}
    .box{border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#fff}
    .boxTitle{background:var(--soft);border-bottom:1px solid var(--line);padding:8px 10px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.10em}
    table{width:100%;border-collapse:collapse;table-layout:fixed}
    th,td{padding:7px 10px;border-bottom:1px solid #eee8dd;vertical-align:top}
    th{color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.08em;text-align:left}
    td{font-size:11px}
    tr:last-child td{border-bottom:0}
    .earnings th:nth-child(1),.earnings td:nth-child(1){width:31%}
    .earnings th:nth-child(2),.earnings td:nth-child(2){width:21%;text-align:right}
    .earnings th:nth-child(3),.earnings td:nth-child(3){width:22%;text-align:right}
    .earnings th:nth-child(4),.earnings td:nth-child(4){width:26%;text-align:right;font-weight:800;padding-right:13px}
    .deductions th:nth-child(2),.deductions td:nth-child(2){text-align:right;font-weight:800}
    .summary{margin-top:9mm;border-radius:12px;border:2px solid var(--ink);overflow:hidden}
    .summaryRow{display:grid;grid-template-columns:1fr 42mm;border-bottom:1px solid var(--line)}
    .summaryRow:last-child{border-bottom:0;background:var(--ink);color:#fff}
    .summaryRow span,.summaryRow b{padding:8px 11px}
    .summaryRow span{font-weight:900;text-transform:uppercase;letter-spacing:.08em;font-size:10px}
    .summaryRow b{text-align:right;font-size:13px}
    @media screen and (max-width:820px){
      .preview{padding:54px 0 24px}
      .page{
        transform:scale(.58);
        transform-origin:top left;
        margin-left:calc((100vw - 121.8mm) / 2);
        margin-right:0;
        margin-bottom:-124mm;
      }
      .tools{left:10px;right:10px;justify-content:flex-end}
      .tools button{padding:8px 10px}
    }
    @media screen and (max-width:420px){
      .page{
        transform:scale(.49);
        margin-left:calc((100vw - 102.9mm) / 2);
        margin-bottom:-151mm;
      }
    }
    @media print{
      html,body{background:#fff}
      .preview{display:block;padding:0;min-height:0}
      .page{margin:0;box-shadow:none;width:auto;min-height:0;padding:0;break-after:page}
      .page:last-child{break-after:auto}
      .tools{display:none}
    }
  </style>
</head>
<body>
  <div class="tools">
    <button onclick="window.print()">Print / Save PDF</button>
    <button onclick="window.close()">Close</button>
  </div>
  <div class="preview">
    ${rows.map((row) => buildPayslipPage(company, row, period)).join("")}
  </div>
</body>
</html>`;
}

function generateEmployeeDashboardPayslip() {
  const company = currentCompany();
  const row = employeeDashboardPayslipRow;
  if (!company || !row) return alert("Refresh your dashboard before generating a payslip.");

  const win = window.open("", "_blank");
  if (!win) return alert("Allow popups for this site so Shiftly can open the payslip.");
  win.document.open();
  win.document.write(buildPayslipDocument(company, row, {
    start: el.employeePeriodStart.value,
    end: el.employeePeriodEnd.value
  }));
  win.document.close();
}

async function runPayrollReport(silent = false) {
  const company = currentCompany();
  if (!company) {
    if (!silent) alert("Select a company first.");
    return;
  }
  setDefaultPayrollDates();
  const start = el.payrollStartDate.value;
  const end = el.payrollEndDate.value;
  if (!start || !end) {
    if (!silent) alert("Choose a payroll date range.");
    return;
  }
  if (start > end) {
    if (!silent) alert("Start date must be before the end date.");
    return;
  }
  let requestedLevyWeeks = null;
  if (isTrElectricalCompany(company) && !silent) {
    requestedLevyWeeks = Number(el.payrollLevyWeeks?.value || 0);
    if (![4, 5].includes(requestedLevyWeeks)) {
      alert("Choose whether this is a 4-week or 5-week NBCEI levy period.");
      return;
    }
    const missingDesignations = missingTrElectricalLevyDesignations();
    if (missingDesignations.length) {
      const names = missingDesignations
        .slice(0, 6)
        .map((employee) => `${employee.employee_id} - ${employee.full_name || "Employee"}`)
        .join("\n");
      const remaining = missingDesignations.length > 6 ? `\n+ ${missingDesignations.length - 6} more` : "";
      alert(`Set an NBCEI designation for these employees before running levies:\n\n${names}${remaining}`);
      return;
    }
  }

  el.btnRunPayroll.disabled = true;
  el.btnRunPayroll.textContent = "Running...";
  try {
    const [
      { data, error },
      loadedDeductionTypes,
      loadedDeductions,
      loadedAdjustments,
      loadedLevyPeriod,
      loadedYtdContext
    ] = await Promise.all([
      sb.from("clock_events")
        .select("entry_id,created_at,action,employee_id,employee_name,result,message")
        .eq(COMPANY_ID_COL, company.id)
        .gte("created_at", dateStartIso(start))
        .lte("created_at", dateEndIso(end))
        .order("created_at", { ascending: true }),
      fetchCompanyDeductionTypes(company),
      fetchPayrollDeductions(company, start, end),
      fetchPayrollAdjustments(company, start, end),
      isTrElectricalCompany(company)
        ? (requestedLevyWeeks
          ? savePayrollLevyPeriod(company, start, end, requestedLevyWeeks)
          : fetchPayrollLevyPeriod(company, start, end))
        : Promise.resolve(null),
      fetchPayrollYtdContext(company, start, end)
    ]);
    if (error) throw error;
    companyDeductionTypes = loadedDeductionTypes;
    payrollDeductions = loadedDeductions;
    payrollAdjustments = loadedAdjustments;
    if (el.payrollLevyWeeks && isTrElectricalCompany(company)) {
      el.payrollLevyWeeks.value = loadedLevyPeriod?.levy_weeks ? String(loadedLevyPeriod.levy_weeks) : "";
    }
    const adjustedRows = attachAdjustmentsToPayrollRows(
      calculatePayroll(data || [], companyAdminEmployees, activePayrollRules()),
      payrollAdjustments,
      activePayrollRules()
    );
    validatePayrollYtdContinuity(adjustedRows, loadedYtdContext, end);
    const deductionsWithLevies = trElectricalAutomaticLevyDeductions(
      adjustedRows,
      payrollDeductions,
      loadedLevyPeriod,
      company
    );
    renderPayrollRows(attachDeductionsToPayrollRows(
      adjustedRows,
      deductionsWithLevies,
      activePayrollRules(),
      loadedYtdContext
    ));
  } catch (error) {
    if (silent) console.warn("Payroll failed:", error.message || error);
    else alert(`Failed to run payroll: ${error.message || error}`);
  } finally {
    el.btnRunPayroll.disabled = false;
    el.btnRunPayroll.textContent = "Run Payroll";
  }
}

function exportPayrollCsv() {
  const company = currentCompany();
  if (!company) return alert("Select a company first.");
  if (!payrollRows.length) return alert("Run payroll before exporting.");

  const headers = [
    "company_name",
    "company_id",
    "period_start",
    "period_end",
    "employee_id",
    "employee_name",
    "pay_type",
    "pay_cycle",
    "hours",
    "normal_hours",
    "ot1_hours",
    "ot2_hours",
    "public_holiday_topup_hours",
    "rate_or_salary",
    "normal_pay",
    "ot1_pay",
    "ot2_pay",
    "adjustments",
    "gross_pay",
    "deductions",
    "net_pay",
    "ytd_gross",
    "ytd_provident",
    "ytd_paye",
    "missing_clock_out",
    "sequence_warnings"
  ];
  const rows = payrollRows.map((row) => [
    company.name || "",
    company.id || "",
    el.payrollStartDate.value || "",
    el.payrollEndDate.value || "",
    row.employee_id || "",
    row.employee_name || "",
    row.pay_type || "",
    row.pay_cycle || "",
    formatHours(row.hours),
    formatHours(row.breakdown?.normalHours || 0),
    formatHours(row.breakdown?.ot1Hours || 0),
    formatHours(row.breakdown?.ot2Hours || 0),
    formatHours(row.breakdown?.holidayTopupHours || 0),
    row.rate.toFixed(2),
    (row.breakdown?.normalPay || 0).toFixed(2),
    (row.breakdown?.ot1Pay || 0).toFixed(2),
    (row.breakdown?.ot2Pay || 0).toFixed(2),
    moneyNumber(row.totalAdjustments).toFixed(2),
    row.gross.toFixed(2),
    moneyNumber(row.totalDeductions).toFixed(2),
    moneyNumber(row.net ?? row.gross).toFixed(2),
    row.ytd ? moneyNumber(row.ytd.gross_remuneration).toFixed(2) : "",
    row.ytd ? moneyNumber(row.ytd.retirement_fund_contributions).toFixed(2) : "",
    row.ytd ? moneyNumber(row.ytd.paye_deducted).toFixed(2) : "",
    row.missingClockOut,
    row.invalidSequence
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = payrollCsvFileName(company);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderPlatformUsers(users) {
  el.platformUsersBody.innerHTML = "";

  if (!users || users.length === 0) {
    el.platformUsersBody.innerHTML = `<tr><td colspan="3" class="mutedText">No users linked yet.</td></tr>`;
    return;
  }

  for (const user of users) {
    const tr = document.createElement("tr");
    const nameParts = splitDisplayName(user.full_name || "User");
    tr.innerHTML = `
      <td>${escapeHtml(nameParts.first)}<br/><span class="mutedText">${escapeHtml(nameParts.rest)}</span></td>
      <td>${escapeHtml(user.email || "")}</td>
      <td>${escapeHtml(capitalizeWord(user.role || ""))}${user.billing_access ? `<br/><span class="mutedText">Billing access</span>` : ""}${user.employee_id ? `<br/><span class="mutedText">${escapeHtml(user.employee_id)}</span>` : ""}</td>
    `;
    el.platformUsersBody.appendChild(tr);
  }
}

function capitalizeWord(value) {
  const clean = String(value || "").trim();
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

function splitDisplayName(name) {
  const clean = String(name || "").trim();
  if (!clean) return { first: "User", rest: "" };
  const parts = clean.split(/\s+/);
  return {
    first: parts.shift() || clean,
    rest: parts.join(" ")
  };
}

function companyEmployeePrefix(company = currentCompany()) {
  const letters = String(company?.name || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  return (letters.slice(0, 3) || "EMP").padEnd(3, "X");
}

function nextEmployeeId() {
  const prefix = companyEmployeePrefix();
  const employeeIdPattern = new RegExp(`^${prefix}(\\d+)$`);
  const highest = companyAdminEmployees.reduce((max, employee) => {
    const match = String(employee.employee_id || "").trim().toUpperCase().match(employeeIdPattern);
    if (!match) return max;
    return Math.max(max, Number(match[1]) || 0);
  }, 0);
  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
}

function nextSiteId() {
  const highest = companyAdminSites.reduce((max, site) => {
    const match = String(site.site_id || "").trim().toUpperCase().match(/^S(\d+)$/);
    if (!match) return max;
    return Math.max(max, Number(match[1]) || 0);
  }, 0);
  return `S${String(highest + 1).padStart(2, "0")}`;
}

function nextSupervisorId() {
  const highest = companyAdminSupervisors.reduce((max, supervisor) => {
    const match = String(supervisor.supervisor_id || "").trim().toUpperCase().match(/^SUP(\d+)$/);
    if (!match) return max;
    return Math.max(max, Number(match[1]) || 0);
  }, 0);
  return `SUP${String(highest + 1).padStart(2, "0")}`;
}

function populateSupervisorEmployeeSelect(selectedName = "") {
  const selectedClean = String(selectedName || "").trim();
  const employees = companyAdminEmployees.filter((employee) => String(employee.full_name || "").trim());
  const matchedEmployee = employees.find((employee) =>
    String(employee.full_name || "").trim().toLowerCase() === selectedClean.toLowerCase()
  );

  el.companySupervisorEmployee.innerHTML = `
    <option value="">Select employee</option>
    ${employees.map((employee) => `
      <option value="${escapeHtml(employee.employee_id || "")}">
        ${escapeHtml(employee.employee_id || "")} - ${escapeHtml(employee.full_name || "")}
      </option>
    `).join("")}
    <option value="__manual">Manual name</option>
  `;

  if (matchedEmployee) {
    el.companySupervisorEmployee.value = matchedEmployee.employee_id || "";
    el.companySupervisorName.value = matchedEmployee.full_name || "";
  } else if (selectedClean) {
    el.companySupervisorEmployee.value = "__manual";
    el.companySupervisorName.value = selectedClean;
  } else {
    el.companySupervisorEmployee.value = "";
    el.companySupervisorName.value = "";
  }
  syncSupervisorNameField();
}

function syncSupervisorNameField() {
  const selected = el.companySupervisorEmployee.value;
  const isManual = selected === "__manual";
  el.companySupervisorName.hidden = !isManual;

  if (!isManual) {
    const employee = companyAdminEmployees.find((row) => String(row.employee_id || "") === String(selected));
    el.companySupervisorName.value = employee?.full_name || "";
  }
}

function showCompanyUserForm(show) {
  const on = !!show;
  el.companyUserFormBox.hidden = !on;
  el.btnToggleCompanyUserForm.classList.toggle("active", on);
  el.btnToggleCompanyUserForm.innerHTML = on ? `<i class="ph ph-x"></i>` : `<i class="ph ph-plus"></i>`;
  el.btnToggleCompanyUserForm.setAttribute("aria-label", on ? "Close add company user" : "Add company user");
  el.btnToggleCompanyUserForm.title = on ? "Close" : "Add company user";
}

function showCompanyForm(show) {
  const on = !!show;
  el.companyFormBox.hidden = !on;
  el.btnToggleCompanyForm.classList.toggle("active", on);
  el.btnToggleCompanyForm.innerHTML = on ? `<i class="ph ph-x"></i>` : `<i class="ph ph-plus"></i>`;
  el.btnToggleCompanyForm.setAttribute("aria-label", on ? "Close add company" : "Add company");
  el.btnToggleCompanyForm.title = on ? "Close" : "Add company";
}

function setToggleButton(button, on, openLabel, closeLabel) {
  const openIcon = button.dataset.openIcon || "ph-plus";
  const closeIcon = button.dataset.closeIcon || "ph-x";
  button.classList.toggle("active", !!on);
  button.innerHTML = on ? `<i class="ph ${closeIcon}"></i>` : `<i class="ph ${openIcon}"></i>`;
  button.setAttribute("aria-label", on ? closeLabel : openLabel);
  button.title = on ? "Close" : openLabel.replace(/^Add /, "Add ");
}

function updateEmployeeRatePlaceholder() {
  const payType = String(el.companyEmployeePayType.value || "hourly").toLowerCase();
  el.companyEmployeeRate.placeholder = payType === "monthly"
    ? "Monthly salary"
    : payType === "daily"
      ? "Daily rate"
      : "Hourly rate";
  if (payType === "monthly" && el.companyEmployeePayCycle.value !== "monthly") {
    el.companyEmployeePayCycle.value = "monthly";
  }
}

function showEmployeeForm(show) {
  const on = !!show;
  renderTrElectricalPayrollControls();
  el.employeeFormBox.hidden = !on;
  setToggleButton(el.btnToggleEmployeeForm, on, "Add employee", "Close add employee");
  if (!on) {
    editingEmployeeId = null;
    el.companyEmployeeId.value = "";
    el.companyEmployeeId.readOnly = false;
    el.companyEmployeeName.value = "";
    el.companyEmployeeIdNumber.value = "";
    el.companyEmployeePayType.value = "hourly";
    el.companyEmployeeRate.value = "";
    el.companyEmployeeRate.placeholder = "Rate";
    el.companyEmployeeEmploymentDate.value = localDateInputValue(new Date());
    el.companyEmployeePayCycle.value = "fortnightly";
    el.companyEmployeeNbceiDesignation.value = "";
    el.companyEmployeeSbfMember.value = "";
    el.companyEmployeeSaewaMember.value = "";
    el.companyEmployeeActive.value = "true";
    el.btnSaveEmployee.textContent = "Save Employee";
  }
}

function showSiteForm(show) {
  const on = !!show;
  el.siteFormBox.hidden = !on;
  setToggleButton(el.btnToggleSiteForm, on, "Add site", "Close add site");
  if (!on) {
    editingSiteId = null;
    el.companySiteId.value = "";
    el.companySiteId.readOnly = false;
    el.companySiteName.value = "";
    el.companySiteLat.value = "";
    el.companySiteLon.value = "";
    el.companySiteRadius.value = "200";
    el.companySiteActive.value = "true";
    el.btnSaveCompanySite.textContent = "Save Site";
  }
}

function showSupervisorForm(show) {
  const on = !!show;
  el.supervisorFormBox.hidden = !on;
  setToggleButton(el.btnToggleSupervisorForm, on, "Add supervisor", "Close add supervisor");
  if (!on) {
    editingSupervisorId = null;
    el.companySupervisorId.value = "";
    el.companySupervisorId.readOnly = false;
    el.companySupervisorCode.value = "";
    el.companySupervisorEmployee.value = "";
    el.companySupervisorName.value = "";
    el.companySupervisorName.hidden = true;
    el.companySupervisorActive.value = "true";
    el.btnSaveSupervisor.textContent = "Save Supervisor";
  }
}

async function countRows(table, companyId) {
  const { count, error } = await sb
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(COMPANY_ID_COL, companyId);
  if (error) {
    console.warn(`Count failed for ${table}:`, error.message);
    return 0;
  }
  return count || 0;
}

async function loadPlatformCompanies() {
  if (!isPlatformAdmin) return;

  let { data, error } = await sb
    .from(COMPANIES_TABLE)
    .select("id,name,slug,plan,status,created_at,logo_url")
    .order("created_at", { ascending: false });

  if (error && /logo_url/i.test(error.message || "")) {
    const retry = await sb
      .from(COMPANIES_TABLE)
      .select("id,name,slug,plan,status,created_at")
      .order("created_at", { ascending: false });
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error(error);
    alert("Failed to load platform companies: " + (error.message || "Unknown error"));
    return;
  }

  platformCompanies = data || [];
  if (!selectedPlatformCompanyId && platformCompanies.length > 0) {
    selectedPlatformCompanyId = platformCompanies[0].id;
  }
  if (selectedPlatformCompanyId && !platformCompanies.some(c => c.id === selectedPlatformCompanyId)) {
    selectedPlatformCompanyId = platformCompanies[0]?.id || "";
  }

  renderPlatformCompanies();
  if (selectedPlatformCompanyId) await loadPlatformCompanyDetail(selectedPlatformCompanyId);
  else {
    el.platformDetailTitle.textContent = "Select a company";
    el.platformDetailSub.textContent = "Company totals and recent activity will appear here.";
    el.platformDetailStatus.textContent = "-";
    setPlatformStats();
    renderPlatformEvents([]);
    renderPlatformUsers([]);
  }
}

async function selectPlatformCompany(companyId) {
  selectedPlatformCompanyId = companyId;
  renderPlatformCompanies();
  await loadPlatformCompanyDetail(companyId);
}

async function loadPlatformCompanyDetail(companyId) {
  const company = platformCompanies.find(c => c.id === companyId);
  if (!company) return;

  el.platformDetailTitle.textContent = company.name || "Company";
  el.platformDetailSub.textContent = company.id;
  el.platformDetailStatus.textContent = company.status || "active";

  const [users, employees, sitesCount, events] = await Promise.all([
    countRows(COMPANY_USERS_TABLE, companyId),
    countRows("employees", companyId),
    countRows(SITES_TABLE, companyId),
    countRows("clock_events", companyId)
  ]);
  setPlatformStats({ users, employees, sites: sitesCount, events });

  let { data: companyUsers, error: usersError } = await sb
    .from(COMPANY_USERS_TABLE)
    .select("user_id,email,full_name,role,employee_id,billing_access,active")
    .eq(COMPANY_ID_COL, companyId)
    .eq("active", true)
    .order("full_name", { ascending: true });

  if (usersError && /(employee_id|billing_access)/i.test(usersError.message || "")) {
    const retry = await sb
      .from(COMPANY_USERS_TABLE)
      .select("user_id,email,full_name,role,active")
      .eq(COMPANY_ID_COL, companyId)
      .eq("active", true)
      .order("full_name", { ascending: true });
    companyUsers = retry.data;
    usersError = retry.error;
  }

  if (usersError) {
    console.warn("Company users failed:", usersError.message);
    renderPlatformUsers([]);
  } else {
    renderPlatformUsers(companyUsers || []);
  }

  const { data, error } = await sb
    .from("clock_events")
    .select("entry_id,company_id,created_at,action,employee_id,employee_name,site_id,site_name,result,message")
    .eq(COMPANY_ID_COL, companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Recent events failed:", error.message);
    renderPlatformEvents([]);
    return;
  }
  renderPlatformEvents(data || []);
}

async function addCompanyUser() {
  const company = platformCompanies.find(c => c.id === selectedPlatformCompanyId);
  if (!company) return alert("Select a company first.");

  const email = el.companyUserEmail.value.trim().toLowerCase();
  const fullName = el.companyUserFullName.value.trim();
  const employeeId = el.companyUserEmployeeId.value.trim().toUpperCase();
  const role = el.companyUserRole.value || "owner";
  const billingAccess = !!el.companyUserBillingAccess?.checked && ["owner", "admin"].includes(role);

  if (!email) return alert("Enter the user's email.");
  if (!fullName) return alert("Enter the user's full name.");

  el.btnAddCompanyUser.disabled = true;
  el.btnAddCompanyUser.textContent = "Inviting...";

  try {
    const { data: sessionData, error: sessionError } = await sb.auth.getSession();
    if (sessionError) throw sessionError;
    const token = sessionData?.session?.access_token;
    if (!token) return alert("Sign in again before inviting a user.");

    const functionUrl = `${SUPABASE_URL}/functions/v1/invite-company-user`;
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        company_id: company.id,
        email,
        full_name: fullName,
        role,
        billing_access: billingAccess,
        employee_id: employeeId || null
      })
    });

    const data = await response.json().catch(() => ({}));
    if (data?.error) {
      console.error(data.error);
      return alert("Failed to invite user: " + data.error);
    }
    if (!response.ok) {
      return alert("Failed to invite user: " + (data?.error || `HTTP ${response.status}`));
    }

    el.companyUserEmail.value = "";
    el.companyUserFullName.value = "";
    el.companyUserEmployeeId.value = "";
    el.companyUserRole.value = "owner";
    if (el.companyUserBillingAccess) el.companyUserBillingAccess.checked = false;
    showCompanyUserForm(false);
    await loadPlatformCompanyDetail(company.id);
    alert("Invite sent and user linked to company.");
  } finally {
    el.btnAddCompanyUser.disabled = false;
    el.btnAddCompanyUser.textContent = "Invite User To Company";
  }
}

async function createPlatformCompany() {
  const name = el.newCompanyName.value.trim();
  const slug = companySlugFromName(name);
  const plan = el.newCompanyPlan.value || "premium";

  if (!name) return alert("Enter a company name.");
  if (!slug) return alert("Enter a company slug.");

  el.btnCreateCompany.disabled = true;
  el.btnCreateCompany.textContent = "Creating...";

  try {
    const { data, error } = await sb
      .from(COMPANIES_TABLE)
      .insert({ name, slug, plan, status: "active" })
      .select("id,name,slug,plan,status,created_at")
      .single();

    if (error) {
      console.error(error);
      return alert("Failed to create company: " + (error.message || "Unknown error"));
    }

    el.newCompanyName.value = "";
    showCompanyForm(false);
    selectedPlatformCompanyId = data.id;
    await loadPlatformCompanies();
  } finally {
    el.btnCreateCompany.disabled = false;
    el.btnCreateCompany.textContent = "Create Company";
  }
}

/***********************
 * COMPANY ADMIN DASHBOARD
 ***********************/
function currentCompany() {
  return companies.find(c => c.id === currentCompanyId) || null;
}

function closeTeamStatus() {
  if (!el.teamStatusModal) return;
  el.teamStatusModal.classList.remove("show");
  el.teamStatusModal.setAttribute("aria-hidden", "true");
}

async function openTeamStatus() {
  if (!canUseTeamStatus()) return;
  const company = currentCompany();
  if (!company) return;
  el.teamStatusSub.textContent = company.name || "Current clock status for this company.";
  el.teamStatusInCount.textContent = "0";
  el.teamStatusOutCount.textContent = "0";
  el.teamStatusBody.innerHTML = `<tr><td colspan="4" class="mutedText">Loading team status...</td></tr>`;
  el.teamStatusModal.classList.add("show");
  el.teamStatusModal.setAttribute("aria-hidden", "false");
  await loadTeamStatus(company);
}

function formatTeamStatusTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

async function loadTeamStatus(company) {
  try {
    const [
      { data: employees, error: employeeError },
      { data: events, error: eventError }
    ] = await Promise.all([
      fetchCompanyEmployees(company.id),
      sb.from("clock_events")
        .select("entry_id,created_at,action,employee_id,employee_name,result")
        .eq(COMPANY_ID_COL, company.id)
        .order("created_at", { ascending: false })
        .limit(2000)
    ]);
    if (employeeError) throw employeeError;
    if (eventError) throw eventError;

    const latestByEmployee = new Map();
    for (const event of events || []) {
      const employeeId = String(event.employee_id || "").trim();
      if (!employeeId || latestByEmployee.has(employeeId)) continue;
      if (String(event.result || "OK").toUpperCase() !== "OK") continue;
      latestByEmployee.set(employeeId, event);
    }

    const activeEmployees = (employees || [])
      .filter((employee) => employee.active !== false)
      .sort((a, b) => String(a.employee_id || "").localeCompare(String(b.employee_id || ""), undefined, { numeric: true }));

    let inCount = 0;
    let outCount = 0;
    const rows = activeEmployees.map((employee) => {
      const employeeId = String(employee.employee_id || "");
      const latest = latestByEmployee.get(employeeId);
      const isIn = String(latest?.action || "").toUpperCase() === "IN";
      if (isIn) inCount += 1;
      else outCount += 1;
      return `
        <tr>
          <td><span class="teamStatusDot ${isIn ? "in" : ""}" aria-label="${isIn ? "Clocked in" : "Clocked out"}"></span></td>
          <td><b>${escapeHtml(employeeId || "-")}</b></td>
          <td><span class="teamStatusName">${escapeHtml(employee.full_name || latest?.employee_name || "Employee")}</span></td>
          <td>${escapeHtml(formatTeamStatusTime(latest?.created_at))}</td>
        </tr>
      `;
    });

    el.teamStatusInCount.textContent = String(inCount);
    el.teamStatusOutCount.textContent = String(outCount);
    el.teamStatusBody.innerHTML = rows.length
      ? rows.join("")
      : `<tr><td colspan="4" class="mutedText">No active employees found.</td></tr>`;
  } catch (error) {
    console.error("Team status failed:", error);
    el.teamStatusBody.innerHTML = `<tr><td colspan="4" class="mutedText">Unable to load team status.</td></tr>`;
  }
}

async function fetchCompanyPayrollRules(company) {
  if (!company) return normalisePayrollRules();
  const legacySelect = "overtime_method,weekly_normal_hours,fortnightly_normal_hours,monthly_normal_hours,ot1_multiplier,ot2_multiplier,saturday_rule,sunday_rule,public_holiday_rule,public_holiday_standard_hours,work_week_enabled,work_week,daily_overtime_enabled,daily_normal_hours,lunch_deduction_enabled,lunch_deduction_minutes";
  const baseSelect = `${legacySelect},calculate_uif,calculate_paye`;
  const profileSelect = `${baseSelect},payroll_profile,paid_start_time,normal_end_time,overtime_trigger_time,friday_normal_end_time,friday_overtime_trigger_time`;
  const { data, error } = await sb
    .from(COMPANY_PAYROLL_RULES_TABLE)
    .select(profileSelect)
    .eq(COMPANY_ID_COL, company.id)
    .maybeSingle();

  if (error) {
    const { data: fallbackData, error: fallbackError } = await sb
      .from(COMPANY_PAYROLL_RULES_TABLE)
      .select(legacySelect)
      .eq(COMPANY_ID_COL, company.id)
      .maybeSingle();

    if (!fallbackError) return normalisePayrollRules(fallbackData || {});

    console.warn("Payroll rules not available yet, using defaults:", error.message);
    return normalisePayrollRules();
  }

  return normalisePayrollRules(data || {});
}

async function saveCompanyPayrollRules() {
  const company = currentCompany();
  if (!company) return alert("Select a company first.");

  const previousRules = normalisePayrollRules(companyPayrollRules || {});
  const workWeek = readWorkWeekTemplate();
  const rules = normalisePayrollRules({
    overtime_method: el.ruleOvertimeMethod.value,
    weekly_normal_hours: payrollRuleNumber(el.ruleWeeklyHours.value, DEFAULT_PAYROLL_RULES.weekly_normal_hours),
    fortnightly_normal_hours: payrollRuleNumber(el.ruleFortnightlyHours.value, DEFAULT_PAYROLL_RULES.fortnightly_normal_hours),
    monthly_normal_hours: payrollRuleNumber(el.ruleMonthlyHours.value, DEFAULT_PAYROLL_RULES.monthly_normal_hours),
    ot1_multiplier: payrollRuleNumber(el.ruleOt1Multiplier.value, DEFAULT_PAYROLL_RULES.ot1_multiplier),
    ot2_multiplier: payrollRuleNumber(el.ruleOt2Multiplier.value, DEFAULT_PAYROLL_RULES.ot2_multiplier),
    work_week_enabled: el.ruleOvertimeMethod.value !== "cycle_only",
    work_week: workWeek,
    saturday_rule: workWeek.sat.rule,
    sunday_rule: workWeek.sun.rule,
    public_holiday_rule: el.rulePublicHoliday.value,
    public_holiday_standard_hours: payrollRuleNumber(el.ruleHolidayHours.value, DEFAULT_PAYROLL_RULES.public_holiday_standard_hours),
    calculate_uif: !!el.ruleCalculateUif?.checked,
    calculate_paye: !!el.ruleCalculatePaye?.checked,
    daily_overtime_enabled: el.ruleOvertimeMethod.value === "daily_cycle",
    daily_normal_hours: workWeek.mon.normal_hours,
    lunch_deduction_enabled: Number(el.ruleLunchMinutes.value || 0) > 0,
    lunch_deduction_minutes: payrollRuleNumber(el.ruleLunchMinutes.value, DEFAULT_PAYROLL_RULES.lunch_deduction_minutes)
  });
  const hiddenProfile = {
    payroll_profile: previousRules.payroll_profile,
    paid_start_time: previousRules.paid_start_time,
    normal_end_time: previousRules.normal_end_time,
    overtime_trigger_time: previousRules.overtime_trigger_time,
    friday_normal_end_time: previousRules.friday_normal_end_time,
    friday_overtime_trigger_time: previousRules.friday_overtime_trigger_time
  };

  el.btnSavePayrollRules.disabled = true;
  el.btnSavePayrollRules.textContent = "Saving...";
  try {
    const visibleRules = { ...rules };
    delete visibleRules.payroll_profile;
    delete visibleRules.paid_start_time;
    delete visibleRules.normal_end_time;
    delete visibleRules.overtime_trigger_time;
    delete visibleRules.friday_normal_end_time;
    delete visibleRules.friday_overtime_trigger_time;
    const payload = {
      company_id: company.id,
      company_name: company.name,
      ...visibleRules,
      active: true
    };
    if (hiddenProfile.payroll_profile !== "standard") {
      Object.assign(payload, hiddenProfile);
    }

    const { error } = await sb
      .from(COMPANY_PAYROLL_RULES_TABLE)
      .upsert(payload, { onConflict: "company_id" });

    if (error) return alert("Failed to save payroll rules: " + error.message);
    companyPayrollRules = normalisePayrollRules({ ...rules, ...hiddenProfile });
    renderPayrollRulesForm(companyPayrollRules);
    await runPayrollReport(true);
    if (el.payrollRulesDetails) el.payrollRulesDetails.open = false;
  } finally {
    el.btnSavePayrollRules.disabled = false;
    el.btnSavePayrollRules.textContent = "Save Payroll Rules";
  }
}

async function uploadCompanyLogo() {
  const company = currentCompany();
  if (!company) return alert("Select a company first.");
  const file = el.companyLogoInput.files?.[0];
  el.companyLogoInput.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) return alert("Please choose an image file.");
  if (file.size > 2 * 1024 * 1024) return alert("Logo must be smaller than 2MB.");

  const extension = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `${company.id}/logo-${Date.now()}.${extension}`;
  el.btnUploadCompanyLogo.disabled = true;
  el.btnUploadCompanyLogo.innerHTML = `<i class="ph ph-spinner-gap"></i>`;
  try {
    const { error: uploadError } = await sb.storage
      .from(COMPANY_LOGO_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;

    const { data: publicData } = sb.storage
      .from(COMPANY_LOGO_BUCKET)
      .getPublicUrl(path);
    const logoUrl = publicData?.publicUrl || "";
    if (!logoUrl) throw new Error("Logo uploaded, but Supabase did not return a public URL.");

    const { error: updateError } = await sb
      .from(COMPANIES_TABLE)
      .update({ logo_url: logoUrl })
      .eq("id", company.id);
    if (updateError) throw updateError;

    company.logo_url = logoUrl;
    const platformCompany = platformCompanies.find((item) => item.id === company.id);
    if (platformCompany) platformCompany.logo_url = logoUrl;
    renderCompanyLogo(el.companyAdminLogoMark, company);
  } catch (error) {
    alert(`Failed to upload logo: ${error.message || error}`);
  } finally {
    el.btnUploadCompanyLogo.disabled = false;
    el.btnUploadCompanyLogo.innerHTML = `<i class="ph ph-plus"></i>`;
  }
}

function renderCompactList(target, rows, emptyText, renderRow) {
  target.innerHTML = "";
  if (!rows || rows.length === 0) {
    target.innerHTML = `<div class="emptyState">${escapeHtml(emptyText)}</div>`;
    return;
  }
  for (const row of rows) {
    const item = document.createElement("div");
    item.className = "compactItem";
    item.innerHTML = renderRow(row);
    target.appendChild(item);
  }
}

function editButton(type, id) {
  return `
    <button class="itemEditBtn" type="button" data-edit-type="${escapeHtml(type)}" data-edit-id="${escapeHtml(id)}" title="Edit" aria-label="Edit">
      <i class="ph ph-pencil-simple"></i>
    </button>
  `;
}

function activeButton(type, id, active) {
  const isActive = active !== false;
  return `
    <button class="itemEditBtn ${isActive ? "inactive" : "activeToggle"}" type="button" data-active-type="${escapeHtml(type)}" data-active-id="${escapeHtml(id)}" data-next-active="${isActive ? "false" : "true"}" title="${isActive ? "Deactivate" : "Activate"}" aria-label="${isActive ? "Deactivate" : "Activate"}">
      <i class="ph ${isActive ? "ph-pause-circle" : "ph-play-circle"}"></i>
    </button>
  `;
}

function siteMenuButton(id) {
  return `
    <button class="itemEditBtn" type="button" data-site-menu="${escapeHtml(id)}" title="Site actions" aria-label="Site actions">
      <i class="ph ph-dots-three"></i>
    </button>
  `;
}

function itemActions(...buttons) {
  return `<div class="itemActions">${buttons.join("")}</div>`;
}

function formatCoordinate(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(4);
}

function formatRate(value) {
  if (value === null || value === undefined || value === "") return "Rate not set";
  const n = Number(value);
  if (!Number.isFinite(n)) return "Rate not set";
  const amount = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return `Rate R${amount}/hr`;
}

function formatPayType(value) {
  return capitalizeWord(value || "hourly");
}

function formatPayCycle(value) {
  return capitalizeWord(value || "fortnightly");
}

function formatEmployeePay(employee) {
  const payType = String(employee?.pay_type || "hourly").toLowerCase();
  const value = employee?.rate;
  if (value === null || value === undefined || value === "") {
    return payType === "monthly" ? "Salary not set" : "Rate not set";
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return payType === "monthly" ? "Salary not set" : "Rate not set";
  const amount = Number.isInteger(n) ? String(n) : n.toFixed(2);
  if (payType === "monthly") return `Salary R${amount}/month`;
  if (payType === "daily") return `Rate R${amount}/day`;
  return `Rate R${amount}/hr`;
}

async function fetchCompanyEmployees(companyId) {
  const withRate = await sb.from("employees")
    .select("employee_id,full_name,id_number,employment_date,rate,pay_type,pay_cycle,nbcei_designation_code,sbf_member,saewa_member,active,face_photo_path,face_photo_url,face_enrolled_at,face_descriptor")
    .eq(COMPANY_ID_COL, companyId)
    .order("employee_id", { ascending: true });

  if (!withRate.error) return withRate;
  if (!/(rate|pay_type|pay_cycle|nbcei_designation_code|sbf_member|saewa_member|id_number|employment_date|face_photo_path|face_photo_url|face_enrolled_at|face_descriptor)/i.test(withRate.error.message || "")) return withRate;

  console.warn("Employee extra columns not found yet. Falling back:", withRate.error.message);
  return sb.from("employees")
    .select("employee_id,full_name,active")
    .eq(COMPANY_ID_COL, companyId)
    .order("employee_id", { ascending: true });
}

function formatBillingMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "R0.00";
  return `R${n.toFixed(2)}`;
}

function formatBillingVatType(value) {
  const key = String(value || "standard").toLowerCase();
  const labels = {
    standard: "Standard VAT",
    zero: "Zero rated",
    exempt: "Exempt"
  };
  return labels[key] || capitalizeWord(key);
}

function formatBillingStatus(value) {
  return String(value || "draft")
    .split("_")
    .map(capitalizeWord)
    .join(" ");
}

function nextBillingItemCode() {
  let max = 0;
  billingItems.forEach((item) => {
    const match = String(item.item_code || "").match(/^ITM(\d+)$/i);
    if (match) max = Math.max(max, Number(match[1]));
  });
  return `ITM${String(max + 1).padStart(3, "0")}`;
}

function nextBillingQuoteNumber() {
  let max = 0;
  billingQuotes.forEach((quote) => {
    const match = String(quote.quote_number || "").match(/^Q-(\d+)$/i);
    if (match) max = Math.max(max, Number(match[1]));
  });
  return `Q-${String(max + 1).padStart(5, "0")}`;
}

function nextBillingInvoiceNumber() {
  let max = 0;
  billingInvoices.forEach((invoice) => {
    const match = String(invoice.invoice_number || "").match(/^INV-(\d+)$/i);
    if (match) max = Math.max(max, Number(match[1]));
  });
  return `INV-${String(max + 1).padStart(5, "0")}`;
}

function billingInvoiceDisplayStatus(invoice) {
  const stored = String(invoice?.status || "draft");
  if (["paid", "cancelled"].includes(stored)) return stored;
  const balance = Number(invoice?.balance_due ?? invoice?.total ?? 0);
  if (balance <= 0 && Number(invoice?.total || 0) > 0) return "paid";
  if (Number(invoice?.paid_total || 0) > 0) return "partially_paid";
  if (invoice?.due_date && invoice.due_date < localDateInputValue(new Date())) return "overdue";
  return stored;
}

function billingInvoiceStatusClass(invoice) {
  const status = billingInvoiceDisplayStatus(invoice);
  if (status === "overdue") return "billingStatusOverdue";
  if (status === "sent") return "billingStatusSent";
  if (status === "paid") return "billingStatusPaid";
  if (status === "cancelled") return "billingStatusExpired";
  return "";
}

function billingQuoteStatusClass(quote) {
  const status = String(quote?.status || "draft");
  if (status === "draft") return "billingStatusDraft";
  if (status === "sent") return "billingStatusSent";
  if (status === "accepted") return "billingStatusAccepted";
  if (status === "declined") return "billingStatusDeclined";
  if (status === "expired") return "billingStatusExpired";
  return "";
}

function billingActionButton(action, label, icon, style = "") {
  return `<button class="billingActionBtn ${escapeHtml(style)}" type="button" data-billing-action="${escapeHtml(action)}"><i class="ph ${escapeHtml(icon)}"></i> ${escapeHtml(label)}</button>`;
}

function calculateBillingQuoteTotals(lines = billingQuoteLines) {
  return lines.reduce((totals, line) => {
    const quantity = Number(line.quantity || 0);
    const unitPrice = Number(line.unit_price || 0);
    const discountPercent = Number(line.discount_percent || 0);
    const gross = quantity * unitPrice;
    const discount = gross * Math.max(0, discountPercent) / 100;
    const subtotal = Math.max(0, gross - discount);
    const vat = line.vat_type === "standard" ? subtotal * VAT_RATE : 0;
    totals.subtotal += subtotal;
    totals.discount_total += discount;
    totals.vat_total += vat;
    totals.total += subtotal + vat;
    return totals;
  }, { subtotal: 0, discount_total: 0, vat_total: 0, total: 0 });
}

function populateBillingQuoteSelects() {
  if (!el.billingQuoteClient || !el.billingQuoteItemSelect) return;
  const activeClients = billingClients.filter((client) => client.active !== false);
  el.billingQuoteClient.innerHTML = `<option value="">Select client</option><option value="${BILLING_MANUAL_CLIENT_VALUE}">Manual Client</option>` + activeClients
    .map((client) => `<option value="${escapeHtml(client.id)}">${escapeHtml(client.name || "Client")}</option>`)
    .join("");

  const activeItems = billingItems.filter((item) => item.active !== false);
  el.billingQuoteItemSelect.innerHTML = `<option value="">Select item</option><option value="${BILLING_MANUAL_ITEM_VALUE}">Manual Item</option>` + activeItems
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.item_code || "")} - ${escapeHtml(item.name || "Item")}</option>`)
    .join("");
  updateBillingManualLineFields("quote");
  updateBillingManualClientField();
}

function updateBillingManualClientField() {
  const manual = el.billingQuoteClient.value === BILLING_MANUAL_CLIENT_VALUE;
  el.billingQuoteManualClientName.hidden = !manual;
  if (!manual) el.billingQuoteManualClientName.value = "";
}

function populateBillingInvoiceSelects() {
  if (!el.billingManualInvoiceClient || !el.billingManualInvoiceItemSelect) return;
  const activeClients = billingClients.filter((client) => client.active !== false);
  el.billingManualInvoiceClient.innerHTML = `<option value="">Select client</option>` + activeClients
    .map((client) => `<option value="${escapeHtml(client.id)}">${escapeHtml(client.name || "Client")}</option>`)
    .join("");

  const activeItems = billingItems.filter((item) => item.active !== false);
  el.billingManualInvoiceItemSelect.innerHTML = `<option value="">Select item</option><option value="${BILLING_MANUAL_ITEM_VALUE}">Manual Item</option>` + activeItems
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.item_code || "")} - ${escapeHtml(item.name || "Item")}</option>`)
    .join("");

  el.billingRecurringClient.innerHTML = `<option value="">Select client</option>` + activeClients
    .map((client) => `<option value="${escapeHtml(client.id)}">${escapeHtml(client.name || "Client")}</option>`)
    .join("");
  el.billingRecurringItemSelect.innerHTML = `<option value="">Select item</option><option value="${BILLING_MANUAL_ITEM_VALUE}">Manual Item</option>` + activeItems
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.item_code || "")} - ${escapeHtml(item.name || "Item")}</option>`)
    .join("");
  updateBillingManualLineFields("invoice");
  updateBillingRecurringManualFields();
}

function updateBillingManualLineFields(type) {
  const isQuote = type === "quote";
  const select = isQuote ? el.billingQuoteItemSelect : el.billingManualInvoiceItemSelect;
  const fields = isQuote ? el.billingQuoteManualFields : el.billingManualInvoiceManualFields;
  const description = isQuote ? el.billingQuoteManualDescription : el.billingManualInvoiceManualDescription;
  const price = isQuote ? el.billingQuoteManualPrice : el.billingManualInvoiceManualPrice;
  if (!select || !fields) return;
  const manual = select.value === BILLING_MANUAL_ITEM_VALUE;
  fields.hidden = !manual;
  if (!manual) {
    if (description) description.value = "";
    if (price) price.value = "";
  }
}

function updateBillingRecurringManualFields() {
  const manual = el.billingRecurringItemSelect.value === BILLING_MANUAL_ITEM_VALUE;
  el.billingRecurringManualFields.hidden = !manual;
  if (!manual) {
    el.billingRecurringManualDescription.value = "";
    el.billingRecurringManualPrice.value = "";
  }
}

function buildManualBillingLine(type) {
  const isQuote = type === "quote";
  const description = (isQuote ? el.billingQuoteManualDescription : el.billingManualInvoiceManualDescription)?.value.trim() || "";
  const price = Number((isQuote ? el.billingQuoteManualPrice : el.billingManualInvoiceManualPrice)?.value || 0);
  const quantity = Number((isQuote ? el.billingQuoteQty : el.billingManualInvoiceQty).value || 0);
  const discountPercent = Number((isQuote ? el.billingQuoteDiscount : el.billingManualInvoiceDiscount).value || 0);
  if (!description) return { error: "Enter a manual item description." };
  if (!Number.isFinite(price) || price < 0) return { error: "Enter a valid manual item rate." };
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: "Enter a valid quantity." };
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) return { error: "Discount must be between 0 and 100." };
  return {
    line: {
      item_id: null,
      item_code: "Manual",
      description,
      quantity,
      unit: "item",
      unit_price: price,
      discount_percent: discountPercent,
      vat_type: "standard"
    }
  };
}

function renderBillingQuoteLines() {
  if (!el.billingQuoteLineList) return;
  if (billingQuoteLines.length === 0) {
    el.billingQuoteLineList.innerHTML = `<div class="emptyState">No line items yet.</div>`;
  } else {
    el.billingQuoteLineList.innerHTML = billingQuoteLines.map((line, index) => {
      const totals = calculateBillingQuoteTotals([line]);
      return `
        <div class="quoteLine">
          <div>
            <b>${escapeHtml(line.description || "Line item")}</b>
            <span>${escapeHtml(line.item_code || "Custom")} - ${Number(line.quantity || 0).toFixed(2)} ${escapeHtml(line.unit || "item")} x ${escapeHtml(formatBillingMoney(line.unit_price))}</span>
          </div>
          <div class="quoteLineRight">
            <strong>${escapeHtml(formatBillingMoney(totals.total))}</strong>
            <button class="itemEditBtn inactive" type="button" data-remove-quote-line="${index}" title="Remove line" aria-label="Remove line">
              <i class="ph ph-x"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  const totals = calculateBillingQuoteTotals();
  el.billingQuoteTotalPreview.textContent = `Subtotal ${formatBillingMoney(totals.subtotal)} - VAT ${formatBillingMoney(totals.vat_total)} - Total ${formatBillingMoney(totals.total)}`;
}

function renderBillingInvoiceLines() {
  if (!el.billingManualInvoiceLineList) return;
  if (billingInvoiceLines.length === 0) {
    el.billingManualInvoiceLineList.innerHTML = `<div class="emptyState">No line items yet.</div>`;
  } else {
    el.billingManualInvoiceLineList.innerHTML = billingInvoiceLines.map((line, index) => {
      const totals = calculateBillingQuoteTotals([line]);
      return `
        <div class="quoteLine">
          <div>
            <b>${escapeHtml(line.description || "Line item")}</b>
            <span>${escapeHtml(line.item_code || "Custom")} - ${Number(line.quantity || 0).toFixed(2)} ${escapeHtml(line.unit || "item")} x ${escapeHtml(formatBillingMoney(line.unit_price))}</span>
          </div>
          <div class="quoteLineRight">
            <strong>${escapeHtml(formatBillingMoney(totals.total))}</strong>
            <button class="itemEditBtn inactive" type="button" data-remove-invoice-line="${index}" title="Remove line" aria-label="Remove line">
              <i class="ph ph-x"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  const totals = calculateBillingQuoteTotals(billingInvoiceLines);
  el.billingManualInvoiceTotalPreview.textContent = `Subtotal ${formatBillingMoney(totals.subtotal)} - VAT ${formatBillingMoney(totals.vat_total)} - Total ${formatBillingMoney(totals.total)}`;
}

function renderBillingRecurringLines() {
  if (billingRecurringLines.length === 0) {
    el.billingRecurringLineList.innerHTML = `<div class="emptyState">No recurring line items yet.</div>`;
  } else {
    el.billingRecurringLineList.innerHTML = billingRecurringLines.map((line, index) => {
      const totals = calculateBillingQuoteTotals([line]);
      return `
        <div class="quoteLine">
          <div>
            <b>${escapeHtml(line.description || "Line item")}</b>
            <span>${escapeHtml(line.item_code || "Custom")} - ${Number(line.quantity || 0).toFixed(2)} ${escapeHtml(line.unit || "item")} x ${escapeHtml(formatBillingMoney(line.unit_price))}</span>
          </div>
          <div class="quoteLineRight">
            <strong>${escapeHtml(formatBillingMoney(totals.total))}</strong>
            <button class="itemEditBtn inactive" type="button" data-remove-recurring-line="${index}" title="Remove line" aria-label="Remove line">
              <i class="ph ph-x"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  const totals = calculateBillingQuoteTotals(billingRecurringLines);
  el.billingRecurringTotalPreview.textContent = `Subtotal ${formatBillingMoney(totals.subtotal)} - VAT ${formatBillingMoney(totals.vat_total)} - Monthly Total ${formatBillingMoney(totals.total)}`;
}

function calculateNextRecurringRun(startDate, issueDay, fromDate = localDateInputValue(new Date())) {
  const start = String(startDate || "").split("-").map(Number);
  const from = String(fromDate || "").split("-").map(Number);
  if (start.length !== 3 || from.length !== 3 || start.some((value) => !Number.isFinite(value)) || from.some((value) => !Number.isFinite(value))) return "";

  const startValue = new Date(start[0], start[1] - 1, start[2]);
  const fromValue = new Date(from[0], from[1] - 1, from[2]);
  const base = startValue > fromValue ? startValue : fromValue;
  const day = Math.max(1, Math.min(31, Number(issueDay || 1)));
  const runForMonth = (year, month) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, lastDay));
  };
  let run = runForMonth(base.getFullYear(), base.getMonth());
  if (run < base) run = runForMonth(base.getFullYear(), base.getMonth() + 1);
  return localDateInputValue(run);
}

function resetBillingQuoteForm() {
  editingBillingQuoteId = null;
  billingQuoteLines = [];
  el.billingQuoteForm.reset();
  el.billingQuoteNumber.value = nextBillingQuoteNumber();
  el.billingQuoteIssueDate.value = localDateInputValue(new Date());
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 14);
  el.billingQuoteExpiryDate.value = localDateInputValue(expiry);
  el.billingQuoteStatus.value = "draft";
  el.billingQuoteNotes.value = "";
  el.billingQuoteQty.value = "1";
  el.billingQuoteDiscount.value = "0";
  el.billingQuoteManualDescription.value = "";
  el.billingQuoteManualPrice.value = "";
  el.billingQuoteManualClientName.value = "";
  el.btnSaveBillingQuote.textContent = "Save Quote";
  populateBillingQuoteSelects();
  renderBillingQuoteLines();
}

function resetBillingInvoiceForm() {
  billingInvoiceLines = [];
  el.billingInvoiceForm.reset();
  el.billingManualInvoiceNumber.value = nextBillingInvoiceNumber();
  el.billingManualInvoiceIssueDate.value = localDateInputValue(new Date());
  const due = new Date();
  due.setDate(due.getDate() + Number(billingProfile?.payment_terms_days ?? 30));
  el.billingManualInvoiceDueDate.value = localDateInputValue(due);
  el.billingManualInvoiceStatus.value = "draft";
  el.billingManualInvoiceNotes.value = "";
  el.billingManualInvoiceQty.value = "1";
  el.billingManualInvoiceDiscount.value = "0";
  el.billingManualInvoiceManualDescription.value = "";
  el.billingManualInvoiceManualPrice.value = "";
  populateBillingInvoiceSelects();
  renderBillingInvoiceLines();
}

function resetBillingRecurringForm() {
  editingBillingRecurringId = null;
  billingRecurringLines = [];
  el.billingRecurringForm.reset();
  el.billingRecurringIssueDay.value = "1";
  el.billingRecurringDueDays.value = String(billingProfile?.payment_terms_days ?? 30);
  el.billingRecurringStartDate.value = localDateInputValue(new Date());
  el.billingRecurringEndDate.value = "";
  el.billingRecurringActive.value = "true";
  el.billingRecurringNotes.value = billingProfile?.default_notes || "";
  el.billingRecurringQty.value = "1";
  el.billingRecurringDiscount.value = "0";
  el.btnSaveBillingRecurring.textContent = "Save Recurring Invoice";
  populateBillingInvoiceSelects();
  renderBillingRecurringLines();
}

function showBillingClientForm(show) {
  el.billingClientFormBox.hidden = !show;
  setToggleButton(el.btnToggleBillingClientForm, show, "Show add client form", "Hide add client form");
  if (!show) {
    editingBillingClientId = null;
    el.billingClientForm.reset();
    el.billingClientActive.value = "true";
    el.btnSaveBillingClient.textContent = "Save Client";
  }
}

function showBillingQuoteForm(show) {
  el.billingQuoteFormBox.hidden = !show;
  setToggleButton(el.btnToggleBillingQuoteForm, show, "Show add quote form", "Hide add quote form");
  if (!show) resetBillingQuoteForm();
}

function showBillingInvoiceForm(show) {
  el.billingInvoiceFormBox.hidden = !show;
  setToggleButton(el.btnToggleBillingInvoiceForm, show, "Show add invoice form", "Hide add invoice form");
  if (!show) resetBillingInvoiceForm();
}

function showBillingRecurringForm(show) {
  el.billingRecurringFormBox.hidden = !show;
  setToggleButton(el.btnToggleBillingRecurringForm, show, "Show add recurring invoice form", "Hide add recurring invoice form");
  if (!show) resetBillingRecurringForm();
}

function showBillingItemForm(show) {
  el.billingItemFormBox.hidden = !show;
  setToggleButton(el.btnToggleBillingItemForm, show, "Show add item form", "Hide add item form");
  if (!show) {
    editingBillingItemId = null;
    el.billingItemForm.reset();
    el.billingItemCode.value = nextBillingItemCode();
    el.billingItemUnit.value = "item";
    el.billingItemVatType.value = "standard";
    el.billingItemActive.value = "true";
    el.btnSaveBillingItem.textContent = "Save Item";
  }
}

async function showBillingDashboard() {
  await stopScanning();
  if (!canUseBilling()) {
    alert("Billing is not enabled for this account.");
    return;
  }

  el.authScreen.hidden = true;
  el.appShell.hidden = true;
  el.platformShell.hidden = true;
  el.portfolioShell.hidden = true;
  el.companyAdminShell.hidden = true;
  el.employeeShell.hidden = true;
  el.billingShell.hidden = false;
  el.billingUserLabel.textContent = currentUser?.email || "Billing";
  el.btnBillingBack.hidden = !canUseCompanyDashboard() && companies.length <= 1;
  el.btnBillingClocking.hidden = !canUseClocking();

  const company = currentCompany();
  if (company) {
    el.billingCompanyTitle.textContent = company.name || "Company";
    el.billingCompanySub.textContent = company.id || "Billing workspace.";
    renderCompanyLogo(el.billingCompanyLogoMark, company);
  }

  try {
    await loadBillingData();
  } catch (error) {
    console.error("Billing dashboard failed:", error);
    alert("Billing could not load: " + (error.message || error));
  }
}

async function closeBillingDashboard() {
  if (canUseCompanyDashboard()) {
    await showCompanyAdminDashboard();
    return;
  }
  if (companies.length > 1) {
    await showPortfolioDashboard();
    return;
  }
  await routeCurrentUser();
}

async function loadBillingData() {
  const company = currentCompany();
  if (!company) return;

  const [clientsResult, itemsResult] = await Promise.all([
    sb.from(BILLING_CLIENTS_TABLE)
      .select("id,company_id,company_name,name,contact_person,email,phone,address,vat_number,active,created_at")
      .eq(COMPANY_ID_COL, company.id)
      .order("name", { ascending: true }),
    sb.from(BILLING_ITEMS_TABLE)
      .select("id,company_id,company_name,item_code,name,description,unit,price,vat_type,active,created_at")
      .eq(COMPANY_ID_COL, company.id)
      .order("item_code", { ascending: true })
  ]);

  if (clientsResult.error || itemsResult.error) {
    const error = clientsResult.error || itemsResult.error;
    if (/billing_clients|billing_items|does not exist|schema cache/i.test(error.message || "")) {
      billingClients = [];
      billingItems = [];
      renderBillingData("Run database/billing-foundation.sql in Supabase, then refresh Billing.");
      return;
    }
    throw error;
  }

  billingClients = clientsResult.data || [];
  billingItems = itemsResult.data || [];

  const [quotesResult, invoicesResult, profileResult, recurringResult, recurringRunsResult] = await Promise.all([
    sb.from(BILLING_QUOTES_TABLE)
      .select("id,company_id,company_name,quote_number,client_id,client_name,client_contact,client_email,client_phone,client_address,client_vat_number,status,issue_date,expiry_date,subtotal,discount_total,vat_total,total,notes,created_at,billing_quote_items(*)")
      .eq(COMPANY_ID_COL, company.id)
      .order("created_at", { ascending: false }),
    sb.from(BILLING_INVOICES_TABLE)
      .select("id,company_id,company_name,invoice_number,quote_id,client_id,client_name,client_contact,client_email,client_phone,client_address,client_vat_number,status,issue_date,due_date,subtotal,discount_total,vat_total,total,paid_total,balance_due,notes,recurring_invoice_id,recurring_period,created_at,billing_invoice_items(*),billing_payments(*)")
      .eq(COMPANY_ID_COL, company.id)
      .order("created_at", { ascending: false }),
    sb.from(BILLING_PROFILE_TABLE).select("*").eq(COMPANY_ID_COL, company.id).maybeSingle(),
    sb.from(BILLING_RECURRING_TABLE)
      .select("id,company_id,company_name,template_name,client_id,client_name,issue_day,due_days,start_date,end_date,next_run_date,notes,active,last_generated_at,created_at,billing_recurring_invoice_items(*)")
      .eq(COMPANY_ID_COL, company.id)
      .order("created_at", { ascending: false }),
    sb.from(BILLING_RECURRING_RUNS_TABLE)
      .select("id,recurring_invoice_id,scheduled_for,status,invoice_id,message,created_at")
      .eq(COMPANY_ID_COL, company.id)
      .order("created_at", { ascending: false })
      .limit(50)
  ]);

  if (quotesResult.error || invoicesResult.error || profileResult.error || recurringResult.error || recurringRunsResult.error) {
    const error = quotesResult.error || invoicesResult.error || profileResult.error || recurringResult.error || recurringRunsResult.error;
    if (/billing_quotes|billing_quote_items|billing_invoices|billing_company_profiles|does not exist|schema cache/i.test(error.message || "")) {
      billingQuotes = [];
      billingInvoices = [];
      billingRecurringInvoices = [];
      billingRecurringRuns = [];
      renderBillingData("Run database/billing-documents.sql in Supabase to enable quotes and invoices.");
      return;
    }
    throw error;
  }

  billingQuotes = quotesResult.data || [];
  billingInvoices = invoicesResult.data || [];
  billingProfile = profileResult.data || null;
  billingRecurringInvoices = recurringResult.data || [];
  billingRecurringRuns = recurringRunsResult.data || [];
  await syncAutomaticBillingStatuses();
  renderBillingData();
}

async function syncAutomaticBillingStatuses() {
  const today = localDateInputValue(new Date());
  const expiredQuotes = billingQuotes.filter((quote) => quote.status === "sent" && quote.expiry_date && quote.expiry_date < today);
  await Promise.all(expiredQuotes.map(async (quote) => {
    const { error } = await sb.from(BILLING_QUOTES_TABLE).update({ status: "expired", updated_at: new Date().toISOString() })
      .eq(COMPANY_ID_COL, quote.company_id).eq("id", quote.id);
    if (!error) quote.status = "expired";
  }));
  const updates = billingInvoices.filter((invoice) => {
    const derived = billingInvoiceDisplayStatus(invoice);
    return derived !== invoice.status && (derived === "overdue" || derived === "paid" || derived === "partially_paid");
  });
  await Promise.all(updates.map(async (invoice) => {
    const status = billingInvoiceDisplayStatus(invoice);
    const { error } = await sb.from(BILLING_INVOICES_TABLE).update({ status, updated_at: new Date().toISOString() })
      .eq(COMPANY_ID_COL, invoice.company_id).eq("id", invoice.id);
    if (!error) invoice.status = status;
  }));
}

function billingPeriodDateLabel(value) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function billingInvoiceMonthRange(monthValue) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(monthValue || ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const lastDay = new Date(year, month, 0).getDate();
  return {
    mode: "month",
    start: `${match[1]}-${match[2]}-01`,
    end: `${match[1]}-${match[2]}-${String(lastDay).padStart(2, "0")}`,
    label: new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })
  };
}

function billingInvoiceMatchesDateFilter(invoice, filter = billingInvoiceDateFilter) {
  if (!filter) return true;
  const issueDate = String(invoice?.issue_date || "").slice(0, 10);
  return Boolean(issueDate && issueDate >= filter.start && issueDate <= filter.end);
}

function billingPaymentMatchesPeriod(payment, filter) {
  const paymentDate = String(payment?.payment_date || "").slice(0, 10);
  return Boolean(paymentDate && paymentDate >= filter.start && paymentDate <= filter.end);
}

function setBillingInvoiceDateFilterOpen(show) {
  el.billingInvoiceDateFilterBox.hidden = !show;
  el.btnToggleBillingInvoiceDateFilter.setAttribute("aria-pressed", String(show));
  el.btnToggleBillingInvoiceDateFilter.classList.toggle("active", show || Boolean(billingInvoiceDateFilter));
}

function syncBillingInvoiceDateFilterFields() {
  const customRange = el.billingInvoiceDateMode.value === "range";
  el.billingInvoiceMonthFields.hidden = customRange;
  el.billingInvoiceRangeFields.hidden = !customRange;
  el.btnBillingInvoiceDateModeMonth.classList.toggle("active", !customRange);
  el.btnBillingInvoiceDateModeRange.classList.toggle("active", customRange);
  el.btnBillingInvoiceDateModeMonth.setAttribute("aria-pressed", String(!customRange));
  el.btnBillingInvoiceDateModeRange.setAttribute("aria-pressed", String(customRange));
}

function setBillingInvoiceDateMode(mode) {
  el.billingInvoiceDateMode.value = mode === "range" ? "range" : "month";
  syncBillingInvoiceDateFilterFields();
}

function shiftBillingInvoiceFilterMonth(offset) {
  const current = billingInvoiceMonthRange(el.billingInvoiceMonth.value)
    || billingInvoiceMonthRange(localDateInputValue(new Date()).slice(0, 7));
  const date = new Date(`${current.start}T00:00:00`);
  date.setMonth(date.getMonth() + offset);
  el.billingInvoiceMonth.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function clearBillingInvoiceDateFilter(closeEditor = true) {
  billingInvoiceDateFilter = null;
  if (closeEditor) setBillingInvoiceDateFilterOpen(false);
  renderBillingData();
}

function renderBillingData(emptyMessage = "") {
  const activeBillingItems = billingItems.filter((item) => item.active !== false);
  const archivedBillingItems = billingItems.filter((item) => item.active === false);
  const visibleBillingItems = showArchivedBillingItems ? archivedBillingItems : activeBillingItems;
  el.billingStatClients.textContent = String(billingClients.length);
  el.billingStatItems.textContent = String(activeBillingItems.length);
  el.billingStatQuotes.textContent = String(billingQuotes.length);
  el.billingStatInvoices.textContent = String(billingInvoices.length);
  el.billingClientCount.textContent = String(billingClients.length);
  el.billingItemCount.textContent = String(visibleBillingItems.length);
  el.btnToggleArchivedBillingItems.classList.toggle("active", showArchivedBillingItems);
  el.btnToggleArchivedBillingItems.setAttribute("aria-pressed", String(showArchivedBillingItems));
  el.btnToggleArchivedBillingItems.title = showArchivedBillingItems ? "View active items" : "View archived items";
  el.btnToggleArchivedBillingItems.setAttribute("aria-label", el.btnToggleArchivedBillingItems.title);
  el.billingQuoteCount.textContent = String(billingQuotes.length);
  const visibleBillingInvoices = billingInvoices.filter((invoice) => billingInvoiceMatchesDateFilter(invoice));
  el.billingInvoiceCount.textContent = String(visibleBillingInvoices.length);
  el.billingInvoicePeriodSummary.hidden = !billingInvoiceDateFilter;
  el.billingInvoicePeriodLabel.textContent = billingInvoiceDateFilter
    ? `Showing invoices for ${billingInvoiceDateFilter.label}`
    : "";
  el.btnToggleBillingInvoiceDateFilter.classList.toggle(
    "active",
    !el.billingInvoiceDateFilterBox.hidden || Boolean(billingInvoiceDateFilter)
  );
  el.btnToggleBillingInvoiceDateFilter.setAttribute(
    "aria-pressed",
    String(!el.billingInvoiceDateFilterBox.hidden || Boolean(billingInvoiceDateFilter))
  );
  el.btnToggleBillingInvoiceDateFilter.title = billingInvoiceDateFilter
    ? `Invoice period: ${billingInvoiceDateFilter.label}`
    : "Filter invoices by date";
  el.btnToggleBillingInvoiceDateFilter.setAttribute("aria-label", el.btnToggleBillingInvoiceDateFilter.title);
  el.billingRecurringCount.textContent = String(billingRecurringInvoices.length);
  const invoiceSummary = visibleBillingInvoices.reduce((summary, invoice) => {
    const status = billingInvoiceDisplayStatus(invoice);
    if (status === "draft") summary.draft += 1;
    if (["sent", "partially_paid", "overdue"].includes(status)) summary.outstanding += 1;
    if (status === "paid") summary.paid += 1;
    if (!['paid','cancelled'].includes(status)) summary.outstandingValue += Number(invoice.balance_due ?? invoice.total ?? 0);
    return summary;
  }, { draft:0, outstanding:0, paid:0, revenue:0, outstandingValue:0 });
  const currentMonthFilter = billingInvoiceMonthRange(localDateInputValue(new Date()).slice(0, 7));
  const revenuePeriod = billingInvoiceDateFilter || currentMonthFilter;
  invoiceSummary.revenue = billingInvoices.reduce((sum, invoice) => (
    sum + (invoice.billing_payments || [])
      .filter((payment) => billingPaymentMatchesPeriod(payment, revenuePeriod))
      .reduce((paymentSum, payment) => paymentSum + Number(payment.amount || 0), 0)
  ), 0);
  const today = localDateInputValue(new Date());
  const recurringRevenue = billingInvoiceDateFilter
    ? visibleBillingInvoices
      .filter((invoice) => invoice.recurring_period && billingInvoiceDisplayStatus(invoice) !== "cancelled")
      .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0)
    : billingRecurringInvoices
      .filter((recurring) =>
        recurring.active !== false
        && (!recurring.end_date || recurring.end_date >= today)
      )
      .reduce((sum, recurring) => {
        const totals = calculateBillingQuoteTotals(recurring.billing_recurring_invoice_items || []);
        return sum + Number(totals.total || 0);
      }, 0);
  el.billingMetricDraft.textContent = String(invoiceSummary.draft);
  el.billingMetricOutstanding.textContent = String(invoiceSummary.outstanding);
  el.billingMetricPaid.textContent = String(invoiceSummary.paid);
  el.billingMetricRevenue.textContent = formatBillingMoney(invoiceSummary.revenue);
  el.billingMetricOutstandingValue.textContent = formatBillingMoney(invoiceSummary.outstandingValue);
  el.billingMetricRecurringRevenue.textContent = formatBillingMoney(recurringRevenue);
  populateBillingProfileForm();
  populateBillingQuoteSelects();
  populateBillingInvoiceSelects();

  if (emptyMessage) {
    el.billingQuoteList.innerHTML = `<div class="emptyState">${escapeHtml(emptyMessage)}</div>`;
    el.billingInvoiceList.innerHTML = `<div class="emptyState">Invoices will appear here once the billing document tables are installed.</div>`;
    el.billingRecurringList.innerHTML = `<div class="emptyState">Recurring invoices will appear here once recurring billing is installed.</div>`;
  } else {
    renderCompactList(el.billingQuoteList, billingQuotes, "No quotes yet.", (quote) => `
      <div class="compactItemTop">
        <div>
          <b>${escapeHtml(quote.quote_number || "")} - ${escapeHtml(quote.client_name || "No client")}</b>
          <span>${escapeHtml(formatBillingStatus(quote.status))} - ${escapeHtml(quote.issue_date || "")}${quote.expiry_date ? ` to ${escapeHtml(quote.expiry_date)}` : ""}</span>
          <span>${escapeHtml(formatBillingMoney(quote.total))}</span>
        </div>
        <div class="billingDocActions">
          <span class="statusPill ${billingQuoteStatusClass(quote)}">${escapeHtml(formatBillingStatus(quote.status))}</span>
          <button class="miniIconBtn" type="button" data-billing-menu="quote" data-billing-id="${escapeHtml(quote.id || "")}" title="Quote actions" aria-label="Quote actions"><i class="ph ph-dots-three"></i></button>
        </div>
      </div>
    `);

    renderCompactList(el.billingInvoiceList, visibleBillingInvoices, billingInvoiceDateFilter ? `No invoices for ${billingInvoiceDateFilter.label}.` : "No invoices yet.", (invoice) => `
      <div class="compactItemTop">
        <div>
          <b>${escapeHtml(invoice.invoice_number || "Invoice")} - ${escapeHtml(invoice.client_name || "No client")}</b>
          <span>${escapeHtml(formatBillingStatus(billingInvoiceDisplayStatus(invoice)))}${invoice.recurring_period ? " - Recurring" : ""}${invoice.due_date ? ` - Due ${escapeHtml(invoice.due_date)}` : ""}</span>
          <span>Paid ${escapeHtml(formatBillingMoney(invoice.paid_total))} - Balance ${escapeHtml(formatBillingMoney(invoice.balance_due))}</span>
        </div>
        <div class="billingDocActions">
          <span class="statusPill ${billingInvoiceStatusClass(invoice)}">${escapeHtml(formatBillingStatus(billingInvoiceDisplayStatus(invoice)))}</span>
          <button class="miniIconBtn" type="button" data-billing-menu="invoice" data-billing-id="${escapeHtml(invoice.id || "")}" title="Invoice actions" aria-label="Invoice actions"><i class="ph ph-dots-three"></i></button>
        </div>
      </div>
    `);

    renderCompactList(el.billingRecurringList, billingRecurringInvoices, "No recurring invoices yet.", (recurring) => {
      const totals = calculateBillingQuoteTotals(recurring.billing_recurring_invoice_items || []);
      const latestRun = billingRecurringRuns.find((run) => String(run.recurring_invoice_id) === String(recurring.id));
      const runText = latestRun
        ? `${formatBillingStatus(latestRun.status)}${latestRun.message ? ` - ${latestRun.message}` : ""}`
        : "No invoices generated yet";
      return `
        <div class="compactItemTop">
          <div>
            <b>${escapeHtml(recurring.template_name || "Recurring Invoice")} - ${escapeHtml(recurring.client_name || "No client")}</b>
            <span>${recurring.active === false ? "Paused" : `Next draft ${escapeHtml(recurring.next_run_date || "-")}`} - Invoice day ${escapeHtml(recurring.issue_day || 1)}</span>
            <span>${escapeHtml(formatBillingMoney(totals.total))} monthly - Due after ${escapeHtml(recurring.due_days ?? 0)} days</span>
            <span>Last run: ${escapeHtml(runText)}</span>
          </div>
          <div class="billingDocActions">
            <span class="statusPill ${recurring.active === false ? "billingStatusExpired" : "billingStatusAccepted"}">${recurring.active === false ? "Paused" : "Active"}</span>
            <button class="miniIconBtn" type="button" data-billing-menu="recurring" data-billing-id="${escapeHtml(recurring.id || "")}" title="Recurring invoice actions" aria-label="Recurring invoice actions"><i class="ph ph-dots-three"></i></button>
          </div>
        </div>
      `;
    });
  }

  renderCompactList(el.billingClientList, billingClients, "No clients yet.", (client) => `
    <div class="compactItemTop">
      <div>
        <b>${escapeHtml(client.name || "")}</b>
        <span>${escapeHtml(client.contact_person || "No contact person")}</span>
        <span>${escapeHtml(client.email || client.phone || "No contact details")}</span>
        <span>${escapeHtml(client.active ? "Active" : "Inactive")}</span>
      </div>
      <div class="billingDocActions">
        <span class="statusPill">${client.active ? "Active" : "Inactive"}</span>
        <button class="miniIconBtn" type="button" data-billing-menu="client" data-billing-id="${escapeHtml(client.id || "")}" title="Client actions" aria-label="Client actions"><i class="ph ph-dots-three"></i></button>
      </div>
    </div>
  `);

  renderCompactList(el.billingItemList, visibleBillingItems, showArchivedBillingItems ? "No archived items." : "No active items yet.", (item) => `
    <div class="compactItemTop">
      <div>
        <b>${escapeHtml(item.item_code || "")} - ${escapeHtml(item.name || "")}</b>
        <span>${escapeHtml(item.description || "No description")}</span>
        <span>${escapeHtml(formatBillingMoney(item.price))} / ${escapeHtml(item.unit || "item")} • ${escapeHtml(formatBillingVatType(item.vat_type))}</span>
        <span>${escapeHtml(item.active !== false ? "Active" : "Archived")}</span>
      </div>
      <div class="billingDocActions">
        <span class="statusPill ${item.active === false ? "billingStatusExpired" : "billingStatusPaid"}">${item.active !== false ? "Active" : "Archived"}</span>
        <button class="miniIconBtn" type="button" data-billing-menu="item" data-billing-id="${escapeHtml(item.id || "")}" title="Item actions" aria-label="Item actions"><i class="ph ph-dots-three"></i></button>
      </div>
    </div>
  `);

  bindCompactEditButtons(el.billingClientList);
  bindCompactEditButtons(el.billingItemList);
  bindCompactEditButtons(el.billingQuoteList);
  bindBillingDocumentMenus();
  renderBillingQuoteLines();
  renderBillingInvoiceLines();
  renderBillingRecurringLines();
}

function beginEditBillingClient(id) {
  const client = billingClients.find(x => String(x.id) === String(id));
  if (!client) return;
  editingBillingClientId = client.id || "";
  el.billingClientName.value = client.name || "";
  el.billingClientContact.value = client.contact_person || "";
  el.billingClientEmail.value = client.email || "";
  el.billingClientPhone.value = client.phone || "";
  el.billingClientVat.value = client.vat_number || "";
  el.billingClientAddress.value = client.address || "";
  el.billingClientActive.value = client.active === false ? "false" : "true";
  el.btnSaveBillingClient.textContent = "Update Client";
  showBillingClientForm(true);
  el.billingClientName.focus();
}

function beginEditBillingItem(id) {
  const item = billingItems.find(x => String(x.id) === String(id));
  if (!item) return;
  editingBillingItemId = item.id || "";
  el.billingItemCode.value = item.item_code || "";
  el.billingItemName.value = item.name || "";
  el.billingItemDescription.value = item.description || "";
  el.billingItemUnit.value = item.unit || "item";
  el.billingItemPrice.value = item.price ?? "";
  el.billingItemVatType.value = item.vat_type || "standard";
  el.billingItemActive.value = item.active === false ? "false" : "true";
  el.btnSaveBillingItem.textContent = "Update Item";
  showBillingItemForm(true);
  el.billingItemName.focus();
}

function beginEditBillingRecurring(id) {
  const recurring = billingRecurringInvoices.find((row) => String(row.id) === String(id));
  if (!recurring) return;
  editingBillingRecurringId = recurring.id;
  populateBillingInvoiceSelects();
  el.billingRecurringName.value = recurring.template_name || "";
  el.billingRecurringClient.value = recurring.client_id || "";
  el.billingRecurringIssueDay.value = String(recurring.issue_day || 1);
  el.billingRecurringDueDays.value = String(recurring.due_days ?? 30);
  el.billingRecurringStartDate.value = recurring.start_date || localDateInputValue(new Date());
  el.billingRecurringEndDate.value = recurring.end_date || "";
  el.billingRecurringActive.value = recurring.active === false ? "false" : "true";
  el.billingRecurringNotes.value = recurring.notes || "";
  billingRecurringLines = (recurring.billing_recurring_invoice_items || [])
    .slice()
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((line) => ({
      item_id: line.item_id || null,
      item_code: line.item_code || "",
      description: line.description || "",
      quantity: Number(line.quantity || 0),
      unit: line.unit || "item",
      unit_price: Number(line.unit_price || 0),
      discount_percent: Number(line.discount_percent || 0),
      vat_type: line.vat_type || "standard"
    }));
  el.btnSaveBillingRecurring.textContent = "Update Recurring Invoice";
  showBillingRecurringForm(true);
  renderBillingRecurringLines();
  el.billingRecurringName.focus();
}

function beginEditBillingQuote(id) {
  const quote = billingQuotes.find(x => String(x.id) === String(id));
  if (!quote) return;
  editingBillingQuoteId = quote.id || "";
  populateBillingQuoteSelects();
  el.billingQuoteNumber.value = quote.quote_number || "";
  const isManualClient = !quote.client_id && Boolean(String(quote.client_name || "").trim());
  el.billingQuoteClient.value = isManualClient ? BILLING_MANUAL_CLIENT_VALUE : (quote.client_id || "");
  el.billingQuoteManualClientName.value = isManualClient ? (quote.client_name || "") : "";
  updateBillingManualClientField();
  el.billingQuoteIssueDate.value = quote.issue_date || localDateInputValue(new Date());
  el.billingQuoteExpiryDate.value = quote.expiry_date || "";
  el.billingQuoteStatus.value = quote.status || "draft";
  el.billingQuoteNotes.value = quote.notes || "";
  billingQuoteLines = (quote.billing_quote_items || [])
    .slice()
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((line) => ({
      item_id: line.item_id || null,
      item_code: line.item_code || "",
      description: line.description || "",
      quantity: Number(line.quantity || 0),
      unit: line.unit || "item",
      unit_price: Number(line.unit_price || 0),
      discount_percent: Number(line.discount_percent || 0),
      vat_type: line.vat_type || "standard"
    }));
  el.btnSaveBillingQuote.textContent = "Update Quote";
  showBillingQuoteForm(true);
  renderBillingQuoteLines();
  el.billingQuoteClient.focus();
}

function addBillingQuoteLine() {
  if (el.billingQuoteItemSelect.value === BILLING_MANUAL_ITEM_VALUE) {
    const manual = buildManualBillingLine("quote");
    if (manual.error) return alert(manual.error);
    billingQuoteLines.push(manual.line);
    el.billingQuoteItemSelect.value = "";
    el.billingQuoteManualDescription.value = "";
    el.billingQuoteManualPrice.value = "";
    el.billingQuoteQty.value = "1";
    el.billingQuoteDiscount.value = "0";
    updateBillingManualLineFields("quote");
    renderBillingQuoteLines();
    return;
  }

  const item = billingItems.find((row) => String(row.id) === String(el.billingQuoteItemSelect.value));
  if (!item) return alert("Select an item first.");
  const quantity = Number(el.billingQuoteQty.value || 0);
  const discountPercent = Number(el.billingQuoteDiscount.value || 0);
  if (!Number.isFinite(quantity) || quantity <= 0) return alert("Enter a valid quantity.");
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) return alert("Discount must be between 0 and 100.");

  billingQuoteLines.push({
    item_id: item.id,
    item_code: item.item_code || "",
    description: item.description || item.name || "",
    quantity,
    unit: item.unit || "item",
    unit_price: Number(item.price || 0),
    discount_percent: discountPercent,
    vat_type: item.vat_type || "standard"
  });
  el.billingQuoteItemSelect.value = "";
  el.billingQuoteQty.value = "1";
  el.billingQuoteDiscount.value = "0";
  updateBillingManualLineFields("quote");
  renderBillingQuoteLines();
}

function addBillingRecurringLine() {
  const quantity = Number(el.billingRecurringQty.value || 0);
  const discountPercent = Number(el.billingRecurringDiscount.value || 0);
  if (!Number.isFinite(quantity) || quantity <= 0) return alert("Enter a valid quantity.");
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) return alert("Discount must be between 0 and 100.");

  if (el.billingRecurringItemSelect.value === BILLING_MANUAL_ITEM_VALUE) {
    const description = el.billingRecurringManualDescription.value.trim();
    const price = Number(el.billingRecurringManualPrice.value || 0);
    if (!description) return alert("Enter a manual item description.");
    if (!Number.isFinite(price) || price < 0) return alert("Enter a valid manual item rate.");
    billingRecurringLines.push({
      item_id: null,
      item_code: "Manual",
      description,
      quantity,
      unit: "item",
      unit_price: price,
      discount_percent: discountPercent,
      vat_type: "standard"
    });
  } else {
    const item = billingItems.find((row) => String(row.id) === String(el.billingRecurringItemSelect.value));
    if (!item) return alert("Select an item first.");
    billingRecurringLines.push({
      item_id: item.id,
      item_code: item.item_code || "",
      description: item.description || item.name || "",
      quantity,
      unit: item.unit || "item",
      unit_price: Number(item.price || 0),
      discount_percent: discountPercent,
      vat_type: item.vat_type || "standard"
    });
  }

  el.billingRecurringItemSelect.value = "";
  el.billingRecurringManualDescription.value = "";
  el.billingRecurringManualPrice.value = "";
  el.billingRecurringQty.value = "1";
  el.billingRecurringDiscount.value = "0";
  updateBillingRecurringManualFields();
  renderBillingRecurringLines();
}

function addBillingInvoiceLine() {
  if (el.billingManualInvoiceItemSelect.value === BILLING_MANUAL_ITEM_VALUE) {
    const manual = buildManualBillingLine("invoice");
    if (manual.error) return alert(manual.error);
    billingInvoiceLines.push(manual.line);
    el.billingManualInvoiceItemSelect.value = "";
    el.billingManualInvoiceManualDescription.value = "";
    el.billingManualInvoiceManualPrice.value = "";
    el.billingManualInvoiceQty.value = "1";
    el.billingManualInvoiceDiscount.value = "0";
    updateBillingManualLineFields("invoice");
    renderBillingInvoiceLines();
    return;
  }

  const item = billingItems.find((row) => String(row.id) === String(el.billingManualInvoiceItemSelect.value));
  if (!item) return alert("Select an item first.");
  const quantity = Number(el.billingManualInvoiceQty.value || 0);
  const discountPercent = Number(el.billingManualInvoiceDiscount.value || 0);
  if (!Number.isFinite(quantity) || quantity <= 0) return alert("Enter a valid quantity.");
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) return alert("Discount must be between 0 and 100.");

  billingInvoiceLines.push({
    item_id: item.id,
    item_code: item.item_code || "",
    description: item.description || item.name || "",
    quantity,
    unit: item.unit || "item",
    unit_price: Number(item.price || 0),
    discount_percent: discountPercent,
    vat_type: item.vat_type || "standard"
  });
  el.billingManualInvoiceItemSelect.value = "";
  el.billingManualInvoiceQty.value = "1";
  el.billingManualInvoiceDiscount.value = "0";
  updateBillingManualLineFields("invoice");
  renderBillingInvoiceLines();
}

async function saveBillingClient() {
  const company = currentCompany();
  if (!company) return alert("Select a company first.");
  const name = el.billingClientName.value.trim();
  if (!name) return alert("Client name is required.");

  const payload = {
    company_id: company.id,
    company_name: company.name || "",
    name,
    contact_person: el.billingClientContact.value.trim() || null,
    email: el.billingClientEmail.value.trim().toLowerCase() || null,
    phone: el.billingClientPhone.value.trim() || null,
    vat_number: el.billingClientVat.value.trim() || null,
    address: el.billingClientAddress.value.trim() || null,
    active: el.billingClientActive.value === "true",
    updated_at: new Date().toISOString()
  };

  const query = editingBillingClientId
    ? sb.from(BILLING_CLIENTS_TABLE).update(payload).eq(COMPANY_ID_COL, company.id).eq("id", editingBillingClientId)
    : sb.from(BILLING_CLIENTS_TABLE).insert(payload);
  const { error } = await query;
  if (error) return alert("Failed to save client: " + error.message);
  showBillingClientForm(false);
  await loadBillingData();
}

async function saveBillingItem() {
  const company = currentCompany();
  if (!company) return alert("Select a company first.");
  const itemCode = el.billingItemCode.value.trim().toUpperCase();
  const name = el.billingItemName.value.trim();
  if (!itemCode || !name) return alert("Item code and item name are required.");

  const price = Number(el.billingItemPrice.value || 0);
  if (!Number.isFinite(price) || price < 0) return alert("Enter a valid item rate.");

  const payload = {
    company_id: company.id,
    company_name: company.name || "",
    item_code: itemCode,
    name,
    description: el.billingItemDescription.value.trim() || null,
    unit: el.billingItemUnit.value.trim() || "item",
    price,
    vat_type: el.billingItemVatType.value || "standard",
    active: el.billingItemActive.value === "true",
    updated_at: new Date().toISOString()
  };

  const query = editingBillingItemId
    ? sb.from(BILLING_ITEMS_TABLE).update(payload).eq(COMPANY_ID_COL, company.id).eq("id", editingBillingItemId)
    : sb.from(BILLING_ITEMS_TABLE).insert(payload);
  const { error } = await query;
  if (error) return alert("Failed to save item: " + error.message);
  showBillingItemForm(false);
  await loadBillingData();
}

async function saveBillingQuote() {
  const company = currentCompany();
  if (!company) return alert("Select a company first.");
  if (billingQuoteLines.length === 0) return alert("Add at least one line item.");

  const quoteNumber = el.billingQuoteNumber.value.trim().toUpperCase();
  if (!quoteNumber) return alert("Quote number is required.");

  const isManualClient = el.billingQuoteClient.value === BILLING_MANUAL_CLIENT_VALUE;
  const client = billingClients.find((row) => String(row.id) === String(el.billingQuoteClient.value));
  const manualClientName = el.billingQuoteManualClientName.value.trim();
  if (isManualClient && !manualClientName) return alert("Enter the company name for this quote.");
  if (!isManualClient && !client) return alert("Select a client first.");

  const totals = calculateBillingQuoteTotals();
  const quotePayload = {
    company_id: company.id,
    company_name: company.name || "",
    quote_number: quoteNumber,
    client_id: isManualClient ? null : client.id,
    client_name: isManualClient ? manualClientName : (client.name || ""),
    client_contact: isManualClient ? null : (client.contact_person || null),
    client_email: isManualClient ? null : (client.email || null),
    client_phone: isManualClient ? null : (client.phone || null),
    client_address: isManualClient ? null : (client.address || null),
    client_vat_number: isManualClient ? null : (client.vat_number || null),
    status: el.billingQuoteStatus.value || "draft",
    issue_date: el.billingQuoteIssueDate.value || localDateInputValue(new Date()),
    expiry_date: el.billingQuoteExpiryDate.value || null,
    subtotal: Number(totals.subtotal.toFixed(2)),
    discount_total: Number(totals.discount_total.toFixed(2)),
    vat_total: Number(totals.vat_total.toFixed(2)),
    total: Number(totals.total.toFixed(2)),
    notes: el.billingQuoteNotes.value.trim() || null,
    updated_at: new Date().toISOString()
  };

  let quoteId = editingBillingQuoteId;
  if (quoteId) {
    const { error } = await sb
      .from(BILLING_QUOTES_TABLE)
      .update(quotePayload)
      .eq(COMPANY_ID_COL, company.id)
      .eq("id", quoteId);
    if (error) return alert("Failed to update quote: " + error.message);

    const { error: deleteError } = await sb
      .from(BILLING_QUOTE_ITEMS_TABLE)
      .delete()
      .eq(COMPANY_ID_COL, company.id)
      .eq("quote_id", quoteId);
    if (deleteError) return alert("Failed to refresh quote lines: " + deleteError.message);
  } else {
    const { data, error } = await sb
      .from(BILLING_QUOTES_TABLE)
      .insert(quotePayload)
      .select("id")
      .single();
    if (error) return alert("Failed to create quote: " + error.message);
    quoteId = data?.id;
  }

  const linePayload = billingQuoteLines.map((line, index) => {
    const lineTotals = calculateBillingQuoteTotals([line]);
    return {
      quote_id: quoteId,
      company_id: company.id,
      company_name: company.name || "",
      item_id: line.item_id || null,
      item_code: line.item_code || null,
      description: line.description || "Line item",
      quantity: Number(Number(line.quantity || 0).toFixed(2)),
      unit: line.unit || "item",
      unit_price: Number(Number(line.unit_price || 0).toFixed(2)),
      discount_percent: Number(Number(line.discount_percent || 0).toFixed(2)),
      vat_type: line.vat_type || "standard",
      line_subtotal: Number(lineTotals.subtotal.toFixed(2)),
      line_vat: Number(lineTotals.vat_total.toFixed(2)),
      line_total: Number(lineTotals.total.toFixed(2)),
      sort_order: index + 1
    };
  });

  const { error: lineError } = await sb.from(BILLING_QUOTE_ITEMS_TABLE).insert(linePayload);
  if (lineError) return alert("Failed to save quote lines: " + lineError.message);

  showBillingQuoteForm(false);
  await loadBillingData();
}

async function saveBillingManualInvoice() {
  const company = currentCompany();
  if (!company) return alert("Select a company first.");
  if (billingInvoiceLines.length === 0) return alert("Add at least one line item.");

  const invoiceNumber = el.billingManualInvoiceNumber.value.trim().toUpperCase();
  if (!invoiceNumber) return alert("Invoice number is required.");

  const client = billingClients.find((row) => String(row.id) === String(el.billingManualInvoiceClient.value));
  if (!client) return alert("Select a client first.");

  const totals = calculateBillingQuoteTotals(billingInvoiceLines);
  const invoiceTotal = Number(totals.total.toFixed(2));
  const invoicePayload = {
    company_id: company.id,
    company_name: company.name || "",
    invoice_number: invoiceNumber,
    quote_id: null,
    client_id: client.id,
    client_name: client.name || "",
    client_contact: client.contact_person || null,
    client_email: client.email || null,
    client_phone: client.phone || null,
    client_address: client.address || null,
    client_vat_number: client.vat_number || null,
    status: el.billingManualInvoiceStatus.value || "draft",
    issue_date: el.billingManualInvoiceIssueDate.value || localDateInputValue(new Date()),
    due_date: el.billingManualInvoiceDueDate.value || null,
    subtotal: Number(totals.subtotal.toFixed(2)),
    discount_total: Number(totals.discount_total.toFixed(2)),
    vat_total: Number(totals.vat_total.toFixed(2)),
    total: invoiceTotal,
    paid_total: 0,
    balance_due: invoiceTotal,
    notes: el.billingManualInvoiceNotes.value.trim() || null,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await sb
    .from(BILLING_INVOICES_TABLE)
    .insert(invoicePayload)
    .select("id")
    .single();
  if (error) return alert("Failed to create invoice: " + error.message);

  const invoiceId = data?.id;
  const linePayload = billingInvoiceLines.map((line, index) => {
    const lineTotals = calculateBillingQuoteTotals([line]);
    return {
      invoice_id: invoiceId,
      company_id: company.id,
      company_name: company.name || "",
      item_id: line.item_id || null,
      item_code: line.item_code || null,
      description: line.description || "Line item",
      quantity: Number(Number(line.quantity || 0).toFixed(2)),
      unit: line.unit || "item",
      unit_price: Number(Number(line.unit_price || 0).toFixed(2)),
      discount_percent: Number(Number(line.discount_percent || 0).toFixed(2)),
      vat_type: line.vat_type || "standard",
      line_subtotal: Number(lineTotals.subtotal.toFixed(2)),
      line_vat: Number(lineTotals.vat_total.toFixed(2)),
      line_total: Number(lineTotals.total.toFixed(2)),
      sort_order: index + 1
    };
  });

  const { error: lineError } = await sb.from(BILLING_INVOICE_ITEMS_TABLE).insert(linePayload);
  if (lineError) {
    await sb.from(BILLING_INVOICES_TABLE).delete().eq(COMPANY_ID_COL, company.id).eq("id", invoiceId);
    return alert("Failed to save invoice lines: " + lineError.message);
  }

  showBillingInvoiceForm(false);
  await loadBillingData();
}

async function saveBillingRecurringInvoice() {
  const company = currentCompany();
  if (!company) return alert("Select a company first.");
  if (billingRecurringLines.length === 0) return alert("Add at least one recurring line item.");

  const templateName = el.billingRecurringName.value.trim();
  const clientId = el.billingRecurringClient.value;
  const issueDay = Number(el.billingRecurringIssueDay.value || 1);
  const dueDays = Number(el.billingRecurringDueDays.value || 0);
  const startDate = el.billingRecurringStartDate.value;
  const endDate = el.billingRecurringEndDate.value || null;
  const active = el.billingRecurringActive.value === "true";
  const client = billingClients.find((row) => String(row.id) === String(clientId) && row.active !== false);

  if (!templateName) return alert("Template name is required.");
  if (!client) return alert("Select an active client.");
  if (!Number.isInteger(issueDay) || issueDay < 1 || issueDay > 31) return alert("Invoice day must be between 1 and 31.");
  if (!Number.isInteger(dueDays) || dueDays < 0 || dueDays > 365) return alert("Payment terms must be between 0 and 365 days.");
  if (!startDate) return alert("Choose a start date.");
  if (endDate && endDate < startDate) return alert("End date cannot be before the start date.");

  const existing = billingRecurringInvoices.find((row) => String(row.id) === String(editingBillingRecurringId || ""));
  const scheduleUnchanged = existing
    && Number(existing.issue_day || 1) === issueDay
    && String(existing.start_date || "") === startDate
    && !(existing.active === false && active);
  const nextRunDate = scheduleUnchanged
    ? existing.next_run_date
    : calculateNextRecurringRun(startDate, issueDay);
  if (!nextRunDate) return alert("The next invoice date could not be calculated.");

  const items = billingRecurringLines.map((line, index) => ({
    item_id: line.item_id || null,
    item_code: line.item_code || null,
    description: line.description || "Line item",
    quantity: Number(Number(line.quantity || 0).toFixed(2)),
    unit: line.unit || "item",
    unit_price: Number(Number(line.unit_price || 0).toFixed(2)),
    discount_percent: Number(Number(line.discount_percent || 0).toFixed(2)),
    vat_type: line.vat_type || "standard",
    sort_order: index + 1
  }));

  el.btnSaveBillingRecurring.disabled = true;
  try {
    const { error } = await sb.rpc("save_billing_recurring_invoice", {
      p_id: editingBillingRecurringId || null,
      p_company_id: company.id,
      p_template_name: templateName,
      p_client_id: client.id,
      p_issue_day: issueDay,
      p_due_days: dueDays,
      p_start_date: startDate,
      p_end_date: endDate,
      p_next_run_date: nextRunDate,
      p_notes: el.billingRecurringNotes.value.trim() || null,
      p_active: active,
      p_items: items
    });
    if (error) return alert("Failed to save recurring invoice: " + error.message);
    showBillingRecurringForm(false);
    await loadBillingData();
  } finally {
    el.btnSaveBillingRecurring.disabled = false;
  }
}

function populateBillingProfileForm() {
  if (!el.billingProfileForm) return;
  const profile = billingProfile || {};
  el.billingProfileRegistration.value = profile.registration_number || "";
  el.billingProfileVat.value = profile.vat_number || "";
  el.billingProfileEmail.value = profile.email || "";
  el.billingProfilePhone.value = profile.phone || "";
  el.billingProfileAddress.value = profile.address || "";
  el.billingProfileBank.value = profile.bank_name || "";
  el.billingProfileAccountName.value = profile.account_name || "";
  el.billingProfileAccountNumber.value = profile.account_number || "";
  el.billingProfileBranch.value = profile.branch_code || "";
  el.billingProfileAccountType.value = profile.account_type || "";
  el.billingProfileTerms.value = String(profile.payment_terms_days ?? 30);
  el.billingProfileNotes.value = profile.default_notes || "";
}

async function saveBillingProfile() {
  const company = currentCompany();
  if (!company) return alert("Select a company first.");
  const paymentTerms = Number(el.billingProfileTerms.value || 0);
  if (!Number.isInteger(paymentTerms) || paymentTerms < 0 || paymentTerms > 365) return alert("Payment terms must be between 0 and 365 days.");
  const payload = {
    company_id: company.id,
    company_name: company.name || "",
    registration_number: el.billingProfileRegistration.value.trim() || null,
    vat_number: el.billingProfileVat.value.trim() || null,
    email: el.billingProfileEmail.value.trim().toLowerCase() || null,
    phone: el.billingProfilePhone.value.trim() || null,
    address: el.billingProfileAddress.value.trim() || null,
    bank_name: el.billingProfileBank.value.trim() || null,
    account_name: el.billingProfileAccountName.value.trim() || null,
    account_number: el.billingProfileAccountNumber.value.trim() || null,
    branch_code: el.billingProfileBranch.value.trim() || null,
    account_type: el.billingProfileAccountType.value.trim() || null,
    payment_terms_days: paymentTerms,
    default_notes: el.billingProfileNotes.value.trim() || null,
    updated_at: new Date().toISOString()
  };
  const { error } = await sb.from(BILLING_PROFILE_TABLE).upsert(payload, { onConflict: "company_id" });
  if (error) return alert("Failed to save document settings: " + error.message);
  billingProfile = payload;
  el.billingProfileFormBox.hidden = true;
  setToggleButton(el.btnToggleBillingProfile, false, "Edit document settings", "Close document settings");
}

function closeBillingActionModal() {
  el.billingActionModal.classList.remove("show");
  el.billingActionModal.setAttribute("aria-hidden", "true");
  currentBillingAction = null;
}

function openBillingActionModal(type, id) {
  const record = type === "client"
    ? billingClients.find((row) => String(row.id) === String(id))
    : type === "item"
      ? billingItems.find((row) => String(row.id) === String(id))
      : type === "quote"
    ? billingQuotes.find((row) => String(row.id) === String(id))
    : type === "recurring"
      ? billingRecurringInvoices.find((row) => String(row.id) === String(id))
      : billingInvoices.find((row) => String(row.id) === String(id));
  if (!record) return;
  currentBillingAction = { type, id };
  if (type === "client" || type === "item") {
    const isClient = type === "client";
    el.billingActionTitle.textContent = isClient ? "Client Actions" : "Item Actions";
    el.billingActionSub.textContent = isClient
      ? record.name || "Client"
      : `${record.item_code || "Item"} - ${record.name || "Item"}`;
    el.billingActionList.innerHTML = [
      billingActionButton("edit", "Edit", "ph-pencil-simple"),
      record.active === false
        ? billingActionButton("activate", isClient ? "Activate" : "Restore Item", isClient ? "ph-play-circle" : "ph-arrow-counter-clockwise")
        : billingActionButton("deactivate", isClient ? "Deactivate" : "Archive Item", isClient ? "ph-pause-circle" : "ph-archive"),
      billingActionButton("delete", isClient ? "Delete Client" : "Delete Item", "ph-trash", "danger")
    ].join("");
  } else {
    const number = type === "quote" ? record.quote_number : type === "recurring" ? record.template_name : record.invoice_number;
    el.billingActionTitle.textContent = type === "quote" ? "Quote Actions" : type === "recurring" ? "Recurring Invoice Actions" : "Invoice Actions";
    el.billingActionSub.textContent = `${number || "Document"} - ${record.client_name || "Client"}`;
    if (type === "quote") {
    el.billingActionList.innerHTML = [
      billingActionButton("edit", "Edit", "ph-pencil-simple"),
      billingActionButton("duplicate", "Duplicate", "ph-copy"),
      billingActionButton("pdf", "Download PDF", "ph-file-pdf"),
      billingActionButton("print", "Print / Preview", "ph-printer"),
      record.status !== "sent" ? billingActionButton("mark_sent", "Mark Sent", "ph-paper-plane-tilt") : "",
      record.status !== "accepted" ? billingActionButton("mark_accepted", "Mark Accepted", "ph-check-circle") : "",
      record.status !== "declined" ? billingActionButton("mark_declined", "Mark Declined", "ph-x-circle") : "",
      record.status === "accepted" && !billingInvoices.some((invoice) => String(invoice.quote_id) === String(record.id))
        ? billingActionButton("convert", "Convert to Invoice", "ph-receipt", "primary") : "",
      billingActionButton("delete", "Delete", "ph-trash", "danger")
    ].join("");
    } else if (type === "recurring") {
    el.billingActionList.innerHTML = [
      billingActionButton("edit", "Edit Template", "ph-pencil-simple"),
      billingActionButton("generate", "Generate Draft Now", "ph-receipt", "primary"),
      record.active === false
        ? billingActionButton("resume", "Resume", "ph-play-circle")
        : billingActionButton("pause", "Pause", "ph-pause-circle"),
      billingActionButton("delete", "Delete Template", "ph-trash", "danger")
    ].join("");
    } else {
    const status = billingInvoiceDisplayStatus(record);
    el.billingActionList.innerHTML = [
      billingActionButton("edit", "Edit Invoice", "ph-pencil-simple"),
      billingActionButton("pdf", "Download PDF", "ph-file-pdf"),
      billingActionButton("print", "Print / Preview", "ph-printer"),
      status === "draft" ? billingActionButton("mark_sent", "Mark Sent", "ph-paper-plane-tilt") : "",
      !["paid", "cancelled"].includes(status) ? billingActionButton("payment", "Record Payment", "ph-money") : "",
      status !== "cancelled" ? billingActionButton("cancel", "Cancel Invoice", "ph-prohibit", "danger") : "",
      billingActionButton("delete", "Delete Invoice", "ph-trash", "danger")
    ].join("");
    }
  }
  el.billingActionModal.classList.add("show");
  el.billingActionModal.setAttribute("aria-hidden", "false");
}

function bindBillingDocumentMenus() {
  [el.billingQuoteList, el.billingInvoiceList, el.billingRecurringList, el.billingClientList, el.billingItemList].forEach((target) => {
    target.querySelectorAll("[data-billing-menu]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        openBillingActionModal(button.dataset.billingMenu, button.dataset.billingId);
      });
    });
  });
}

async function setBillingQuoteStatus(id, status) {
  const company = currentCompany();
  const { error } = await sb.from(BILLING_QUOTES_TABLE).update({ status, updated_at: new Date().toISOString() })
    .eq(COMPANY_ID_COL, company.id).eq("id", id);
  if (error) return alert("Failed to update quote: " + error.message);
  closeBillingActionModal();
  await loadBillingData();
}

async function duplicateBillingQuote(id) {
  const company = currentCompany();
  const quote = billingQuotes.find((row) => String(row.id) === String(id));
  if (!quote) return;
  const payload = {
    company_id: company.id, company_name: company.name || "", quote_number: nextBillingQuoteNumber(),
    client_id: quote.client_id, client_name: quote.client_name, client_contact: quote.client_contact,
    client_email: quote.client_email, client_phone: quote.client_phone, client_address: quote.client_address,
    client_vat_number: quote.client_vat_number, status: "draft",
    issue_date: localDateInputValue(new Date()), expiry_date: quote.expiry_date,
    subtotal: quote.subtotal, discount_total: quote.discount_total, vat_total: quote.vat_total,
    total: quote.total, notes: quote.notes || null, updated_at: new Date().toISOString()
  };
  const { data, error } = await sb.from(BILLING_QUOTES_TABLE).insert(payload).select("id").single();
  if (error) return alert("Failed to duplicate quote: " + error.message);
  const lines = (quote.billing_quote_items || []).map((line, index) => ({
    quote_id: data.id, company_id: company.id, company_name: company.name || "", item_id: line.item_id,
    item_code: line.item_code, description: line.description, quantity: line.quantity, unit: line.unit,
    unit_price: line.unit_price, discount_percent: line.discount_percent, vat_type: line.vat_type,
    line_subtotal: line.line_subtotal, line_vat: line.line_vat, line_total: line.line_total, sort_order: index + 1
  }));
  if (lines.length) {
    const { error: lineError } = await sb.from(BILLING_QUOTE_ITEMS_TABLE).insert(lines);
    if (lineError) return alert("Quote duplicated, but its lines could not be copied: " + lineError.message);
  }
  closeBillingActionModal();
  await loadBillingData();
}

async function deleteBillingQuote(id) {
  const company = currentCompany();
  if (!confirm("Delete this quote? This cannot be undone.")) return;
  const { error } = await sb.from(BILLING_QUOTES_TABLE).delete().eq(COMPANY_ID_COL, company.id).eq("id", id);
  if (error) return alert("Failed to delete quote: " + error.message);
  closeBillingActionModal();
  await loadBillingData();
}

async function convertBillingQuoteToInvoice(id) {
  const quote = billingQuotes.find((row) => String(row.id) === String(id));
  if (!quote || quote.status !== "accepted") return alert("Only accepted quotes can be converted.");
  const issueDate = localDateInputValue(new Date());
  const due = new Date();
  due.setDate(due.getDate() + Number(billingProfile?.payment_terms_days ?? 30));
  const { error } = await sb.rpc("convert_billing_quote_to_invoice", {
    p_quote_id: quote.id,
    p_invoice_number: nextBillingInvoiceNumber(),
    p_issue_date: issueDate,
    p_due_date: localDateInputValue(due)
  });
  if (error) return alert("Failed to convert quote: " + error.message);
  closeBillingActionModal();
  await loadBillingData();
}

function openBillingInvoiceEdit(id) {
  const invoice = billingInvoices.find((row) => String(row.id) === String(id));
  if (!invoice) return;
  editingBillingInvoiceId = invoice.id;
  el.billingInvoiceEditLabel.textContent = `${invoice.invoice_number} - ${invoice.client_name}`;
  el.billingInvoiceIssueDate.value = invoice.issue_date || localDateInputValue(new Date());
  el.billingInvoiceDueDate.value = invoice.due_date || "";
  const editableStatus = ["draft", "sent", "cancelled"].includes(invoice.status) ? invoice.status : "sent";
  el.billingInvoiceStatus.value = editableStatus;
  el.billingInvoiceNotes.value = invoice.notes || "";
  closeBillingActionModal();
  el.billingInvoiceEditModal.classList.add("show");
  el.billingInvoiceEditModal.setAttribute("aria-hidden", "false");
}

function closeBillingInvoiceEdit() {
  el.billingInvoiceEditModal.classList.remove("show");
  el.billingInvoiceEditModal.setAttribute("aria-hidden", "true");
  editingBillingInvoiceId = null;
}

async function saveBillingInvoiceEdit() {
  const company = currentCompany();
  const invoice = billingInvoices.find((row) => String(row.id) === String(editingBillingInvoiceId));
  if (!company || !invoice) return;
  const requestedStatus = el.billingInvoiceStatus.value;
  const status = Number(invoice.paid_total || 0) > 0 && requestedStatus !== "cancelled" ? billingInvoiceDisplayStatus(invoice) : requestedStatus;
  const { error } = await sb.from(BILLING_INVOICES_TABLE).update({
    issue_date: el.billingInvoiceIssueDate.value,
    due_date: el.billingInvoiceDueDate.value || null,
    status,
    notes: el.billingInvoiceNotes.value.trim() || null,
    updated_at: new Date().toISOString()
  }).eq(COMPANY_ID_COL, company.id).eq("id", invoice.id);
  if (error) return alert("Failed to update invoice: " + error.message);
  closeBillingInvoiceEdit();
  await loadBillingData();
}

async function updateBillingInvoiceStatus(id, status) {
  const company = currentCompany();
  if (status === "cancelled" && !confirm("Cancel this invoice?")) return;
  const { error } = await sb.from(BILLING_INVOICES_TABLE).update({ status, updated_at: new Date().toISOString() })
    .eq(COMPANY_ID_COL, company.id).eq("id", id);
  if (error) return alert("Failed to update invoice: " + error.message);
  closeBillingActionModal();
  await loadBillingData();
}

async function deleteBillingInvoice(id) {
  const company = currentCompany();
  const invoice = billingInvoices.find((row) => String(row.id) === String(id));
  if (!company || !invoice) return;
  const invoiceLabel = invoice.invoice_number || "this invoice";
  if (!confirm(`Delete ${invoiceLabel}? This will remove its line items and payments, and cannot be undone.`)) return;

  const { error: paymentError } = await sb
    .from(BILLING_PAYMENTS_TABLE)
    .delete()
    .eq(COMPANY_ID_COL, company.id)
    .eq("invoice_id", invoice.id);
  if (paymentError) return alert("Failed to delete invoice payments: " + paymentError.message);

  const { error: itemError } = await sb
    .from(BILLING_INVOICE_ITEMS_TABLE)
    .delete()
    .eq(COMPANY_ID_COL, company.id)
    .eq("invoice_id", invoice.id);
  if (itemError) return alert("Failed to delete invoice line items: " + itemError.message);

  const { error } = await sb
    .from(BILLING_INVOICES_TABLE)
    .delete()
    .eq(COMPANY_ID_COL, company.id)
    .eq("id", invoice.id);
  if (error) return alert("Failed to delete invoice: " + error.message);
  closeBillingActionModal();
  await loadBillingData();
}

function openBillingPaymentModal(id) {
  const invoice = billingInvoices.find((row) => String(row.id) === String(id));
  if (!invoice) return;
  currentBillingPaymentInvoiceId = invoice.id;
  el.billingPaymentInvoice.textContent = `${invoice.invoice_number} - Total ${formatBillingMoney(invoice.total)} - Paid ${formatBillingMoney(invoice.paid_total)} - Remaining ${formatBillingMoney(invoice.balance_due)}`;
  el.billingPaymentForm.reset();
  el.billingPaymentDate.value = localDateInputValue(new Date());
  el.billingPaymentAmount.value = Number(invoice.balance_due || 0).toFixed(2);
  el.billingPaymentHistory.innerHTML = (invoice.billing_payments || []).length
    ? (invoice.billing_payments || []).slice().sort((a,b) => String(b.payment_date).localeCompare(String(a.payment_date))).map((payment) => `<div class="billingPaymentRow"><span>${escapeHtml(payment.payment_date)} - ${escapeHtml(formatBillingStatus(payment.method || "payment"))}${payment.reference ? ` (${escapeHtml(payment.reference)})` : ""}</span><b>${escapeHtml(formatBillingMoney(payment.amount))}</b></div>`).join("")
    : `<div class="emptyState">No payments recorded yet.</div>`;
  closeBillingActionModal();
  el.billingPaymentModal.classList.add("show");
  el.billingPaymentModal.setAttribute("aria-hidden", "false");
}

function closeBillingPaymentModal() {
  el.billingPaymentModal.classList.remove("show");
  el.billingPaymentModal.setAttribute("aria-hidden", "true");
  currentBillingPaymentInvoiceId = null;
}

async function saveBillingPayment() {
  const company = currentCompany();
  const invoice = billingInvoices.find((row) => String(row.id) === String(currentBillingPaymentInvoiceId));
  if (!company || !invoice) return;
  const amount = Number(el.billingPaymentAmount.value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return alert("Enter a valid payment amount.");
  if (amount > Number(invoice.balance_due || 0) + 0.01 && !confirm("This payment is more than the outstanding balance. Record it anyway?")) return;
  const { error } = await sb.from(BILLING_PAYMENTS_TABLE).insert({
    company_id: company.id, company_name: company.name || "", invoice_id: invoice.id,
    payment_date: el.billingPaymentDate.value || localDateInputValue(new Date()), amount,
    method: el.billingPaymentMethod.value || null, reference: el.billingPaymentReference.value.trim() || null,
    notes: el.billingPaymentNotes.value.trim() || null, created_by: currentUser?.id || null
  });
  if (error) return alert("Failed to record payment: " + error.message);
  closeBillingPaymentModal();
  await loadBillingData();
}

function billingPdfRows(document) {
  const rows = document.billing_quote_items || document.billing_invoice_items || [];
  return rows.slice().sort((a,b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)).map((line) => `
    <tr><td><b>${escapeHtml(line.item_code || "")}</b><br>${escapeHtml(line.description || "")}</td><td>${Number(line.quantity || 0).toFixed(2)}</td><td>${escapeHtml(line.unit || "item")}</td><td>${formatBillingMoney(line.unit_price)}</td><td>${Number(line.discount_percent || 0).toFixed(2)}%</td><td>${formatBillingMoney(line.line_total)}</td></tr>`).join("");
}

function formatBillingDocumentMoney(value) {
  const amount = Number(value || 0);
  return `R${(Number.isFinite(amount) ? amount : 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).replace(/,/g, " ")}`;
}

function formatBillingDocumentDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "-";
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(match[2]) - 1];
  return `${match[3]} ${month || ""} ${match[1]}`.trim();
}

function billingDocumentPdfTitle(document, { client, number, type = "invoice" }) {
  const clean = (value) => String(value || "")
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  const clientName = clean(document.client_name) || clean(client?.name) || "Client";
  // Both invoice and quote dates are stored as issue_date; never use today's date.
  const date = String(document.issue_date || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const parsedDate = date ? new Date(`${date[1]}-${date[2]}-${date[3]}T00:00:00Z`) : null;
  const validDate = parsedDate && Number.isFinite(parsedDate.getTime())
    && parsedDate.toISOString().slice(0, 10) === date[0].slice(0, 10);
  const monthYear = validDate ? `${months[Number(date[2]) - 1]} ${date[1]}` : "";
  const documentNumber = clean(number) || (type === "quote" ? "Quote" : "Invoice");
  // Shared filename stem: the direct downloader (or browser print) adds .pdf.
  return `${[clientName, monthYear].filter(Boolean).join(" ")} - ${documentNumber}`;
}

function billingInvoicePdfRows(document) {
  const rows = document.billing_invoice_items || document.billing_quote_items || [];
  return rows
    .slice()
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((line) => {
      const vatPercent = String(line.vat_type || "").toLowerCase() === "standard" ? 15 : 0;
      const description = [
        line.item_code ? `<span class="itemCode">${escapeHtml(line.item_code)}</span>` : "",
        `<span>${escapeHtml(line.description || "")}</span>`
      ].filter(Boolean).join("");
      return `<tr>
        <td class="descriptionCell">${description}</td>
        <td>${Number(line.quantity || 0).toFixed(2)}</td>
        <td>${formatBillingDocumentMoney(line.unit_price)}</td>
        <td>${Number(line.discount_percent || 0).toFixed(2)}%</td>
        <td>${vatPercent.toFixed(2)}%</td>
        <td>${formatBillingDocumentMoney(line.line_subtotal)}</td>
        <td>${formatBillingDocumentMoney(line.line_total)}</td>
      </tr>`;
    })
    .join("");
}

function buildBillingInvoiceDocument(document, context) {
  const { company, client, profile, logo, number, type = "invoice" } = context;
  const isQuote = type === "quote";
  const sourceQuote = billingQuotes.find((row) => String(row.id) === String(document.quote_id || ""));
  const reference = isQuote ? (number || "-") : (sourceQuote?.quote_number || number || "-");
  const documentTitle = isQuote ? "QUOTE" : "TAX INVOICE";
  const endDateLabel = isQuote ? "Expiry Date" : "Due Date";
  const endDate = isQuote ? document.expiry_date : document.due_date;
  const website = profile.website || profile.website_url || company.website || company.website_url || "";
  const companyAddress = escapeHtml(profile.address || "").replace(/\n/g, "<br>");
  const clientAddress = escapeHtml(document.client_address || client.address || "").replace(/\n/g, "<br>");
  const notes = escapeHtml(document.notes || profile.default_notes || "Thank you for your business.").replace(/\n/g, "<br>");
  const accountHolder = profile.account_name || "";
  const bankingRows = [
    ["Bank", profile.bank_name],
    ["Account Holder", accountHolder],
    ["Account Type", profile.account_type],
    ["Account Number", profile.account_number],
    ["Branch Code", profile.branch_code],
    ["Reference", number]
  ].filter(([, value]) => value);
  const companyContact = [profile.phone, profile.email, website].filter(Boolean).map(escapeHtml).join("<br>");
  const clientContact = [document.client_contact || client.contact_person, document.client_email || client.email].filter(Boolean).map(escapeHtml).join("<br>");

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(billingDocumentPdfTitle(document, context))}</title><style>
@page{size:A4;margin:12mm 12mm 18mm}*{box-sizing:border-box}body{margin:0;background:#d9d9d9;color:#181818;font:11px Arial,sans-serif}.tools{position:fixed;right:12px;top:10px;z-index:3}.tools button{padding:10px 14px;font-weight:800;background:#fff;border:1px solid #111;border-radius:5px;cursor:pointer}.invoicePage{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:14mm 15mm 18mm;display:flex;flex-direction:column}.invoiceHeader{display:grid;grid-template-columns:42mm 1fr;gap:12mm;align-items:start;border-bottom:2px solid #181818;padding-bottom:8mm}.invoiceLogo{height:29mm;display:flex;align-items:center;justify-content:flex-start}.invoiceLogo img{max-width:38mm;max-height:27mm;object-fit:contain}.logoFallback{font-weight:900;font-size:16px}.invoiceHeading{text-align:right}.invoiceHeading h1{margin:0 0 5mm;font-size:27px;letter-spacing:.05em;color:#b88913}.metaGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3mm 5mm}.metaItem{min-width:0}.label{display:block;margin-bottom:2px;font-size:8px;line-height:1.2;text-transform:uppercase;letter-spacing:.12em;color:#716b62;font-weight:900}.metaItem strong{display:block;overflow-wrap:anywhere}.partyGrid{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin:8mm 0 5mm}.partyCard{min-height:37mm;border:1px solid #d8d0c2;border-radius:8px;padding:4mm;line-height:1.55}.partyCard h2{margin:1mm 0 2mm;font-size:14px}.partyContent{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.partyContent>div:last-child{text-align:right}.dateStrip{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-bottom:7mm;padding:0 1mm}.dateStrip>div:last-child{text-align:right}.invoiceItems{width:100%;border-collapse:collapse;table-layout:fixed}.invoiceItems col.description{width:31%}.invoiceItems col.qty{width:9%}.invoiceItems col.price{width:14%}.invoiceItems col.percent{width:9%}.invoiceItems col.money{width:14%}.invoiceItems thead{display:table-header-group}.invoiceItems th{padding:8px 6px;background:#f7f4ee;border-top:1px solid #d8d0c2;border-bottom:1px solid #d8d0c2;color:#625c53;font-size:8px;text-transform:uppercase;letter-spacing:.06em;text-align:right;white-space:normal}.invoiceItems th:first-child{text-align:left;border-radius:7px 0 0 0}.invoiceItems th:last-child{border-radius:0 7px 0 0}.invoiceItems td{padding:8px 6px;border-bottom:1px solid #e7e1d7;text-align:right;vertical-align:top;break-inside:avoid;page-break-inside:avoid}.invoiceItems td:first-child{text-align:left}.descriptionCell{overflow-wrap:anywhere}.itemCode{display:block;margin-bottom:2px;font-size:8px;font-weight:900;color:#716b62}.invoiceBottom{margin-top:auto;padding-top:7mm;break-inside:avoid;page-break-inside:avoid}.settlementGrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.88fr);gap:8mm;align-items:start;break-inside:avoid;page-break-inside:avoid}.quoteSettlement .totalsBlock{grid-column:2}.bankingBlock{padding-top:0}.bankingBlock h2,.notesBlock h2{margin:0 0 3mm;font-size:12px;text-transform:uppercase;letter-spacing:.08em}.bankingRows{display:grid;grid-template-columns:34mm minmax(0,1fr);gap:1.6mm 4mm;line-height:1.35}.bankingRows b{color:#625c53}.bankingRows span{min-width:0;overflow-wrap:anywhere}.totalsBlock{border:1px solid #d8d0c2;border-radius:8px;overflow:hidden}.totalRow{display:flex;justify-content:space-between;gap:8px;padding:7px 10px;border-bottom:1px solid #e7e1d7}.totalRow span:first-child{color:#625c53}.totalRow.grand{font-weight:900;border-top:1px solid #b88913}.totalRow.balance,.totalRow.quoteTotal{background:#181818;color:#fff;border:0;font-size:13px;font-weight:900}.totalRow.balance span:first-child,.totalRow.quoteTotal span:first-child{color:#fff}.notesBlock{margin-top:7mm;padding-top:3mm;border-top:1px solid #d8d0c2;line-height:1.55;white-space:normal;overflow-wrap:anywhere;break-inside:avoid;page-break-inside:avoid}.documentFooter{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:6mm;margin-top:7mm;padding-top:3mm;border-top:1px solid #d8d0c2;color:#716b62;font-size:8px;break-inside:avoid;page-break-inside:avoid}.footerCompany{text-align:left}.footerEmail{text-align:center}.footerPage{text-align:right}
    @media screen and (max-width:820px){.invoicePage{transform:scale(.58);transform-origin:top left;margin-left:calc((100vw - 121.8mm)/2);margin-bottom:-124mm}.tools{left:10px;right:10px;text-align:right}}
@media print{body{background:#fff}.tools{display:none}.invoicePage{width:100%;min-height:267mm;padding:0;margin:0;transform:none;transform-origin:initial}.invoiceItems thead{display:table-header-group}.invoiceItems tr{break-inside:avoid;page-break-inside:avoid}.invoiceBottom,.settlementGrid,.notesBlock,.documentFooter{break-inside:avoid;page-break-inside:avoid}}
  </style></head><body><div class="tools"><button onclick="window.print()">Print / Save PDF</button></div><main class="invoicePage">
    <header class="invoiceHeader"><div class="invoiceLogo">${logo}</div><div class="invoiceHeading"><h1>${documentTitle}</h1><div class="metaGrid">
      <div class="metaItem"><span class="label">Number</span><strong>${escapeHtml(number || "-")}</strong></div><div class="metaItem"><span class="label">Reference</span><strong>${escapeHtml(reference)}</strong></div><div class="metaItem"><span class="label">Date</span><strong>${formatBillingDocumentDate(document.issue_date)}</strong></div>
      <div class="metaItem"><span class="label">${endDateLabel}</span><strong>${formatBillingDocumentDate(endDate)}</strong></div><div class="metaItem"><span class="label">Discount</span><strong>${formatBillingDocumentMoney(document.discount_total)}</strong></div><div class="metaItem"><span class="label">Page</span><strong>1</strong></div>
    </div></div></header>
    <section class="partyGrid"><article class="partyCard"><span class="label">From</span><h2>${escapeHtml(company.name || "Company")}</h2><div class="partyContent"><div>${profile.registration_number ? `Registration ${escapeHtml(profile.registration_number)}<br>` : ""}${profile.vat_number ? `VAT ${escapeHtml(profile.vat_number)}<br>` : ""}${companyAddress}</div><div>${companyContact}</div></div></article><article class="partyCard"><span class="label">Bill To</span><h2>${escapeHtml(document.client_name || client.name || "Client")}</h2><div class="partyContent"><div>${clientContact}</div><div>${clientAddress}${(document.client_vat_number || client.vat_number) ? `<br>VAT ${escapeHtml(document.client_vat_number || client.vat_number)}` : ""}</div></div></article></section>
    <section class="dateStrip"><div><span class="label">Issue Date</span><strong>${formatBillingDocumentDate(document.issue_date)}</strong></div><div><span class="label">${endDateLabel}</span><strong>${formatBillingDocumentDate(endDate)}</strong></div></section>
    <table class="invoiceItems"><colgroup><col class="description"><col class="qty"><col class="price"><col class="percent"><col class="percent"><col class="money"><col class="money"></colgroup><thead><tr><th>Description</th><th>Quantity</th><th>Excl. Price</th><th>Disc %</th><th>VAT %</th><th>Excl. Total</th><th>Incl. Total</th></tr></thead><tbody>${billingInvoicePdfRows(document)}</tbody></table>
    <div class="invoiceBottom"><section class="settlementGrid${isQuote ? " quoteSettlement" : ""}">${isQuote ? "" : `<div class="bankingBlock"><h2>Banking Details</h2><div class="bankingRows">${bankingRows.length ? bankingRows.map(([label, value]) => `<b>${escapeHtml(label)}</b><span>${escapeHtml(value)}</span>`).join("") : "<span>Not supplied</span>"}</div></div>`}<div class="totalsBlock">
      <div class="totalRow"><span>Total Discount</span><b>${formatBillingDocumentMoney(document.discount_total)}</b></div><div class="totalRow"><span>Total Exclusive</span><b>${formatBillingDocumentMoney(document.subtotal)}</b></div><div class="totalRow"><span>Total VAT</span><b>${formatBillingDocumentMoney(document.vat_total)}</b></div><div class="totalRow grand${isQuote ? " quoteTotal" : ""}"><span>Grand Total</span><b>${formatBillingDocumentMoney(document.total)}</b></div>${isQuote ? "" : `<div class="totalRow"><span>Paid</span><b>${formatBillingDocumentMoney(document.paid_total)}</b></div><div class="totalRow balance"><span>Balance Due</span><b>${formatBillingDocumentMoney(document.balance_due)}</b></div>`}
    </div></section>
    <section class="notesBlock"><h2>Notes</h2><div>${notes}</div></section>
    <footer class="documentFooter"><div class="footerCompany"><b>${escapeHtml(company.name || "Company")}</b></div><div class="footerEmail">${profile.email ? escapeHtml(profile.email) : ""}</div><div class="footerPage">Page 1 of 1</div></footer></div>
  </main></body></html>`;
}

function buildBillingDocument(type, document) {
  const company = currentCompany() || {};
  const client = billingClients.find((row) => String(row.id) === String(document.client_id)) || {};
  const profile = billingProfile || {};
  const isInvoice = type === "invoice";
  const number = isInvoice ? document.invoice_number : document.quote_number;
  const logo = company.logo_url ? `<img src="${escapeHtml(company.logo_url)}" alt="Company logo">` : `<div class="logoFallback">${escapeHtml(company.name || "Shiftly")}</div>`;
  return buildBillingInvoiceDocument(document, { company, client, profile, logo, number, type: isInvoice ? "invoice" : "quote" });
}

function openBillingPdf(type, id) {
  const document = type === "quote" ? billingQuotes.find((row) => String(row.id) === String(id)) : billingInvoices.find((row) => String(row.id) === String(id));
  if (!document) return;
  const win = window.open("", "_blank");
  if (!win) return alert("Allow popups for this site so Shiftly can open the PDF preview.");
  win.document.open(); win.document.write(buildBillingDocument(type, document)); win.document.close();
  closeBillingActionModal();
}

let billingPdfEnginePromise = null;
let billingPdfDownloadBusy = false;

function loadBillingPdfEngine() {
  if (window.ShiftlyBillingPdf) return Promise.resolve(window.ShiftlyBillingPdf);
  if (billingPdfEnginePromise) return billingPdfEnginePromise;
  billingPdfEnginePromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      billingPdfEnginePromise = null;
      reject(new Error("PDF tools could not be loaded. Check your connection and retry, or use Print / Preview."));
    };
    const timer = setTimeout(fail, 30000);
    script.src = "./vendor/billing-pdf.js?v=1";
    script.async = true;
    script.onerror = fail;
    script.onload = () => {
      if (!window.ShiftlyBillingPdf) return fail();
      clearTimeout(timer);
      resolve(window.ShiftlyBillingPdf);
    };
    document.head.appendChild(script);
  });
  return billingPdfEnginePromise;
}

async function downloadBillingPdf(type, id) {
  if (billingPdfDownloadBusy) return;
  const record = (type === "quote" ? billingQuotes : billingInvoices)
    .find((row) => String(row.id) === String(id));
  if (!record) return;
  // Snapshot the selected company/document before asynchronous loading.
  const html = buildBillingDocument(type, record);
  const button = el.billingActionList.querySelector('[data-billing-action="pdf"]');
  const originalLabel = button?.innerHTML;
  billingPdfDownloadBusy = true;
  if (button) { button.disabled = true; button.textContent = "Preparing PDF..."; }
  try {
    const engine = await loadBillingPdfEngine();
    await engine.download(html);
    if (currentBillingAction?.type === type && String(currentBillingAction?.id) === String(id)) {
      closeBillingActionModal();
    }
  } catch (error) {
    alert(`Failed to download PDF: ${error.message || error}`);
  } finally {
    billingPdfDownloadBusy = false;
    if (button) { button.disabled = false; button.innerHTML = originalLabel; }
  }
}

async function setBillingRecurringActive(id, active) {
  const company = currentCompany();
  const recurring = billingRecurringInvoices.find((row) => String(row.id) === String(id));
  if (!company || !recurring) return;
  const action = active ? "resume" : "pause";
  if (!confirm(`Are you sure you want to ${action} this recurring invoice?`)) return;

  const payload = { active, updated_at: new Date().toISOString() };
  if (active) {
    payload.next_run_date = calculateNextRecurringRun(recurring.start_date, recurring.issue_day);
  }
  const { error } = await sb.from(BILLING_RECURRING_TABLE)
    .update(payload)
    .eq(COMPANY_ID_COL, company.id)
    .eq("id", id);
  if (error) return alert(`Failed to ${action} recurring invoice: ${error.message}`);
  closeBillingActionModal();
  await loadBillingData();
}

async function generateBillingRecurringDraftNow(id) {
  const recurring = billingRecurringInvoices.find((row) => String(row.id) === String(id));
  if (!recurring) return;
  if (!confirm(`Create this month's draft invoice for ${recurring.client_name || "this client"} now?`)) return;
  const { error } = await sb.rpc("generate_billing_recurring_draft_now", {
    p_recurring_invoice_id: id
  });
  if (error) return alert("Failed to generate draft: " + error.message);
  closeBillingActionModal();
  await loadBillingData();
  alert("The draft invoice is ready in the Invoices section.");
}

async function deleteBillingRecurringTemplate(id) {
  const company = currentCompany();
  const recurring = billingRecurringInvoices.find((row) => String(row.id) === String(id));
  if (!company || !recurring) return;
  if (!confirm(`Delete the recurring template "${recurring.template_name}"? Existing quotes and invoices will remain untouched.`)) return;
  const { error } = await sb.from(BILLING_RECURRING_TABLE)
    .delete()
    .eq(COMPANY_ID_COL, company.id)
    .eq("id", id);
  if (error) return alert("Failed to delete recurring template: " + error.message);
  closeBillingActionModal();
  await loadBillingData();
}

async function billingRecordReferenceCounts(type, id, companyId) {
  const references = type === "client"
    ? [
        [BILLING_QUOTES_TABLE, "client_id", "quotes"],
        [BILLING_INVOICES_TABLE, "client_id", "invoices"],
        [BILLING_RECURRING_TABLE, "client_id", "recurring invoices"]
      ]
    : [
        [BILLING_QUOTE_ITEMS_TABLE, "item_id", "quotes"],
        [BILLING_INVOICE_ITEMS_TABLE, "item_id", "invoices"],
        [BILLING_RECURRING_ITEMS_TABLE, "item_id", "recurring invoices"]
      ];
  const results = await Promise.all(references.map(async ([table, column, label]) => {
    const { count, error } = await sb.from(table)
      .select("id", { count: "exact", head: true })
      .eq(COMPANY_ID_COL, companyId)
      .eq(column, id);
    if (error) throw error;
    return { label, count: Number(count || 0) };
  }));
  return results.filter((row) => row.count > 0);
}

async function deleteBillingMasterRecord(type, id) {
  const company = currentCompany();
  const isClient = type === "client";
  const records = isClient ? billingClients : billingItems;
  const record = records.find((row) => String(row.id) === String(id));
  if (!company || !record) return;
  const label = isClient ? "client" : "item";

  let references;
  try {
    references = await billingRecordReferenceCounts(type, id, company.id);
  } catch (error) {
    return alert(`The ${label} could not be checked safely: ${error.message || error}`);
  }
  if (references.length) {
    const summary = references.map((row) => `${row.count} ${row.label}`).join(", ");
    return alert(`This ${label} is linked to ${summary} and cannot be permanently deleted. ${isClient ? "Deactivate the client" : "Archive the item"} instead to preserve billing history.`);
  }

  const recordName = isClient ? record.name : `${record.item_code || ""} - ${record.name || ""}`.replace(/^\s*-\s*/, "");
  if (!confirm(`Permanently delete ${recordName || `this ${label}`}? This cannot be undone.`)) return;
  const { error } = await sb.from(isClient ? BILLING_CLIENTS_TABLE : BILLING_ITEMS_TABLE)
    .delete()
    .eq(COMPANY_ID_COL, company.id)
    .eq("id", id);
  if (error) {
    const linkedMessage = error.code === "23503" ? ` This ${label} is linked to billing history; ${isClient ? "deactivate it" : "archive it"} instead.` : "";
    return alert(`Failed to delete ${label}: ${error.message || error}${linkedMessage}`);
  }
  await loadBillingData();
}

async function handleBillingAction(action) {
  if (!currentBillingAction) return;
  const { type, id } = currentBillingAction;
  if (action === "pdf") return downloadBillingPdf(type, id);
  if (action === "print") return openBillingPdf(type, id);
  if (type === "client" || type === "item") {
    const isClient = type === "client";
    if (action === "edit") {
      closeBillingActionModal();
      return isClient ? beginEditBillingClient(id) : beginEditBillingItem(id);
    }
    if (action === "activate" || action === "deactivate") {
      closeBillingActionModal();
      return toggleCompanyRecordActive(isClient ? "billingClient" : "billingItem", id, action === "activate");
    }
    if (action === "delete") {
      closeBillingActionModal();
      return deleteBillingMasterRecord(type, id);
    }
    return;
  }
  if (type === "recurring") {
    if (action === "edit") { closeBillingActionModal(); return beginEditBillingRecurring(id); }
    if (action === "generate") return generateBillingRecurringDraftNow(id);
    if (action === "pause") return setBillingRecurringActive(id, false);
    if (action === "resume") return setBillingRecurringActive(id, true);
    if (action === "delete") return deleteBillingRecurringTemplate(id);
    return;
  }
  if (type === "quote") {
    if (action === "edit") { closeBillingActionModal(); return beginEditBillingQuote(id); }
    if (action === "duplicate") return duplicateBillingQuote(id);
    if (action === "mark_sent") return setBillingQuoteStatus(id, "sent");
    if (action === "mark_accepted") return setBillingQuoteStatus(id, "accepted");
    if (action === "mark_declined") return setBillingQuoteStatus(id, "declined");
    if (action === "convert") return convertBillingQuoteToInvoice(id);
    if (action === "delete") return deleteBillingQuote(id);
  } else {
    if (action === "edit") return openBillingInvoiceEdit(id);
    if (action === "mark_sent") return updateBillingInvoiceStatus(id, "sent");
    if (action === "payment") return openBillingPaymentModal(id);
    if (action === "cancel") return updateBillingInvoiceStatus(id, "cancelled");
    if (action === "delete") return deleteBillingInvoice(id);
  }
}

function bindCompactEditButtons(target) {
  target.querySelectorAll("[data-edit-type]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const type = button.getAttribute("data-edit-type");
      const id = button.getAttribute("data-edit-id");
      if (type === "employee") beginEditEmployee(id);
      if (type === "site") beginEditSite(id);
      if (type === "supervisor") beginEditSupervisor(id);
      if (type === "billingClient") beginEditBillingClient(id);
      if (type === "billingItem") beginEditBillingItem(id);
      if (type === "billingQuote") beginEditBillingQuote(id);
    });
  });
  target.querySelectorAll("[data-active-type]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const type = button.getAttribute("data-active-type");
      const id = button.getAttribute("data-active-id");
      const active = button.getAttribute("data-next-active") === "true";
      toggleCompanyRecordActive(type, id, active);
    });
  });
}

function getEmployeeClockStatus(employeeId) {
  const id = String(employeeId || "");
  const latestEvent = (companyAdminEvents || []).find((event) => {
    if (String(event.employee_id || "") !== id) return false;
    const result = String(event.result || "OK").toUpperCase();
    return result === "OK";
  });
  return String(latestEvent?.action || "").toUpperCase() === "IN" ? "in" : "out";
}

async function toggleCompanyRecordActive(type, id, active) {
  const company = currentCompany();
  if (!company) return alert("Select a company first.");

  const config = {
    employee: { table: "employees", idColumn: "employee_id", label: "employee" },
    site: { table: SITES_TABLE, idColumn: "site_id", label: "site" },
    supervisor: { table: "supervisors", idColumn: "supervisor_id", label: "supervisor" },
    billingClient: { table: BILLING_CLIENTS_TABLE, idColumn: "id", label: "client" },
    billingItem: { table: BILLING_ITEMS_TABLE, idColumn: "id", label: "item" }
  }[type];
  if (!config || !id) return;

  const isBillingItem = type === "billingItem";
  const action = isBillingItem ? (active ? "restore" : "archive") : (active ? "activate" : "deactivate");
  if (!confirm(`Are you sure you want to ${action} this ${config.label}?`)) return;

  const { error } = await sb
    .from(config.table)
    .update({ active })
    .eq(COMPANY_ID_COL, company.id)
    .eq(config.idColumn, id);

  if (error) return alert(`Failed to ${action} ${config.label}: ${error.message}`);
  if (type === "billingClient" || type === "billingItem") {
    await loadBillingData();
  } else {
    await loadCompanyAdminDetail();
  }
}

function closeSiteActionModal() {
  currentSiteActionId = "";
  el.siteActionModal.classList.remove("show");
  el.siteActionModal.setAttribute("aria-hidden", "true");
}

function openSiteActionModal(siteId) {
  const site = companyAdminSites.find((row) => String(row.site_id) === String(siteId));
  if (!site) return;
  currentSiteActionId = String(site.site_id || "");
  el.siteActionSub.textContent = `${site.site_id || "Site"} - ${site.name || ""}`;
  const isActive = site.active !== false;
  el.siteActionList.innerHTML = [
    `<button class="billingActionBtn" type="button" data-site-action="toggle"><i class="ph ${isActive ? "ph-pause-circle" : "ph-play-circle"}"></i> ${isActive ? "Deactivate Site" : "Activate Site"}</button>`,
    `<button class="billingActionBtn danger" type="button" data-site-action="delete"><i class="ph ph-trash"></i> Delete Site</button>`
  ].join("");
  el.siteActionModal.classList.add("show");
  el.siteActionModal.setAttribute("aria-hidden", "false");
}

function bindSiteActionMenus() {
  el.companySiteList.querySelectorAll("[data-site-menu]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openSiteActionModal(button.getAttribute("data-site-menu"));
    });
  });
}

async function deleteCompanySite(siteId) {
  const company = currentCompany();
  const site = companyAdminSites.find((row) => String(row.site_id) === String(siteId));
  if (!company || !site) return;

  const { count, error: historyError } = await sb
    .from("clock_events")
    .select("site_id", { count: "exact", head: true })
    .eq(COMPANY_ID_COL, company.id)
    .eq("site_id", site.site_id);

  if (historyError) {
    return alert(`The site could not be checked safely: ${historyError.message || historyError}`);
  }
  if (Number(count || 0) > 0) {
    return alert("This site has clocking history and cannot be permanently deleted. Deactivate it instead to preserve payroll records.");
  }
  if (!confirm(`Permanently delete ${site.site_id} - ${site.name}? This cannot be undone.`)) return;

  const { error } = await sb
    .from(SITES_TABLE)
    .delete()
    .eq(COMPANY_ID_COL, company.id)
    .eq("site_id", site.site_id);

  if (error) {
    const linkedRecordMessage = error.code === "23503"
      ? " This site is linked to existing records; deactivate it instead to preserve them."
      : "";
    return alert(`Failed to delete site: ${error.message || error}${linkedRecordMessage}`);
  }
  await loadCompanyAdminDetail();
}

async function handleSiteAction(action) {
  const siteId = currentSiteActionId;
  const site = companyAdminSites.find((row) => String(row.site_id) === String(siteId));
  if (!site) return closeSiteActionModal();
  closeSiteActionModal();
  if (action === "toggle") {
    await toggleCompanyRecordActive("site", siteId, site.active === false);
  } else if (action === "delete") {
    await deleteCompanySite(siteId);
  }
}

function bindEmployeeQrCards() {
  const cards = Array.from(el.companyEmployeeList.querySelectorAll(".compactItem"));
  cards.forEach((card, index) => {
    const employee = companyAdminEmployees[index];
    if (!employee) return;
    const status = getEmployeeClockStatus(employee.employee_id);
    card.classList.add("employeeCompactItem", status === "in" ? "clockedIn" : "clockedOut");
    card.insertAdjacentHTML(
      "afterbegin",
      `<span class="employeeStatusDot" aria-label="${status === "in" ? "Clocked in" : "Clocked out"}" title="${status === "in" ? "Clocked in" : "Clocked out"}"></span>`
    );
    card.classList.add("clickable");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Show QR for ${employee.full_name || employee.employee_id}`);
    const open = () => openEmployeeQr(employee.employee_id);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

async function loadCompanyAdminDetail() {
  const company = currentCompany();
  if (!company) return;

  el.companyAdminTitle.textContent = company.name || "Company";
  el.companyAdminSub.textContent = company.id;
  renderCompanyLogo(el.companyAdminLogoMark, company);
  renderTrElectricalPayrollControls();

  const [users, employeesCount, sitesCount, eventsCount] = await Promise.all([
    countRows(COMPANY_USERS_TABLE, company.id),
    countRows("employees", company.id),
    countRows(SITES_TABLE, company.id),
    countRows("clock_events", company.id)
  ]);
  el.companyStatUsers.textContent = String(users);
  el.companyStatEmployees.textContent = String(employeesCount);
  el.companyStatSites.textContent = String(sitesCount);
  el.companyStatEvents.textContent = String(eventsCount);
  el.companyEmployeeCount.textContent = String(employeesCount);
  el.companySiteCount.textContent = String(sitesCount);
  el.companySupervisorCount.textContent = "...";

  const [
    { data: employeeRows, error: employeeError },
    { data: siteRows, error: siteError },
    { data: supervisorRows, error: supervisorError },
    { data: eventRows, error: eventError },
    loadedPayrollRules
  ] = await Promise.all([
    fetchCompanyEmployees(company.id),
    sb.from(SITES_TABLE)
      .select("site_id,name,lat,lon,radius_m,active")
      .eq(COMPANY_ID_COL, company.id)
      .order("site_id", { ascending: true }),
    sb.from("supervisors")
      .select("supervisor_id,code,full_name,active")
      .eq(COMPANY_ID_COL, company.id)
      .order("supervisor_id", { ascending: true }),
    sb.from("clock_events")
      .select("entry_id,company_id,created_at,action,employee_id,employee_name,site_id,site_name,result,message")
      .eq(COMPANY_ID_COL, company.id)
      .order("created_at", { ascending: false }),
    fetchCompanyPayrollRules(company)
  ]);

  if (employeeError) console.warn("Company employees failed:", employeeError.message);
  if (siteError) console.warn("Company sites failed:", siteError.message);
  if (supervisorError) console.warn("Company supervisors failed:", supervisorError.message);
  if (eventError) console.warn("Company clock events failed:", eventError.message);

  const employees = employeeError ? [] : (employeeRows || []);
  const siteList = siteError ? [] : (siteRows || []);
  const supervisors = supervisorError ? [] : (supervisorRows || []);
  companyAdminEmployees = employees;
  companyAdminSites = siteList;
  companyAdminSupervisors = supervisors;
  companyAdminEvents = eventError ? [] : (eventRows || []);
  companyPayrollRules = loadedPayrollRules;
  renderPayrollRulesForm(companyPayrollRules);
  el.companyEmployeeCount.textContent = String(employees.length);
  el.companySiteCount.textContent = String(siteList.length);
  el.companySupervisorCount.textContent = String(supervisors.length);

  renderCompactList(el.companyEmployeeList, employees, "No employees yet.", (employee) => `
    <div class="compactItemTop">
      <div>
        <b>${escapeHtml(employee.employee_id || "")}</b>
        <span>${escapeHtml(employee.full_name || "")}</span>
        <span>${escapeHtml(formatEmployeePay(employee))}</span>
        <span>${escapeHtml(formatPayType(employee.pay_type))} - ${escapeHtml(formatPayCycle(employee.pay_cycle))}</span>
        ${isTrElectricalCompany(company) ? `<span>${escapeHtml(nbceiDesignationLabel(employee.nbcei_designation_code))}</span>` : ""}
        ${isTrElectricalCompany(company) ? `<span>SBF ${employee.sbf_member === true ? "Yes" : "No"} - SAEWA ${employee.saewa_member === true ? "Yes" : "No"}</span>` : ""}
        <span>${escapeHtml(employee.active ? "Active" : "Inactive")}</span>
      </div>
      ${itemActions(
        editButton("employee", employee.employee_id || ""),
        activeButton("employee", employee.employee_id || "", employee.active)
      )}
    </div>
  `);
  bindEmployeeQrCards();
  renderCompactList(el.companySiteList, siteList, "No sites yet.", (site) => `
    <div class="compactItemTop">
      <div>
        <b>${escapeHtml(site.site_id || "")} - ${escapeHtml(site.name || "")}</b>
        <span>${escapeHtml(formatCoordinate(site.lat))}, ${escapeHtml(formatCoordinate(site.lon))}</span>
        <span>Radius ${escapeHtml(site.radius_m || "")}m</span>
        <span>${escapeHtml(site.active ? "Active" : "Inactive")}</span>
      </div>
      ${itemActions(
        editButton("site", site.site_id || ""),
        siteMenuButton(site.site_id || "")
      )}
    </div>
  `);
  renderCompactList(el.companySupervisorList, supervisors, "No supervisors yet.", (supervisor) => `
    <div class="compactItemTop">
      <div>
        <b>${escapeHtml(supervisor.supervisor_id || "")} - ${escapeHtml(supervisor.full_name || "")}</b>
        <span>Code ${escapeHtml(supervisor.code || "")}</span>
        <span>${escapeHtml(supervisor.active ? "Active" : "Inactive")}</span>
      </div>
      ${itemActions(
        editButton("supervisor", supervisor.supervisor_id || ""),
        activeButton("supervisor", supervisor.supervisor_id || "", supervisor.active)
      )}
    </div>
  `);
  bindCompactEditButtons(el.companyEmployeeList);
  bindCompactEditButtons(el.companySiteList);
  bindSiteActionMenus();
  bindCompactEditButtons(el.companySupervisorList);
  renderPlatformEvents(companyAdminEvents, el.companyAdminEventsBody, { editTime: true });
  await runPayrollReport(true);
}

function beginEditEmployee(employeeId) {
  const employee = companyAdminEmployees.find(x => String(x.employee_id) === String(employeeId));
  if (!employee) return;
  editingEmployeeId = employee.employee_id || "";
  el.companyEmployeeId.value = employee.employee_id || "";
  el.companyEmployeeId.readOnly = true;
  el.companyEmployeeName.value = employee.full_name || "";
  el.companyEmployeeIdNumber.value = employee.id_number || "";
  el.companyEmployeePayType.value = employee.pay_type || "hourly";
  el.companyEmployeeRate.value = employee.rate ?? "";
  updateEmployeeRatePlaceholder();
  el.companyEmployeeEmploymentDate.value = employee.employment_date || localDateInputValue(new Date());
  el.companyEmployeePayCycle.value = employee.pay_cycle || "fortnightly";
  el.companyEmployeeNbceiDesignation.value = normaliseNbceiDesignationCode(employee.nbcei_designation_code);
  el.companyEmployeeSbfMember.value = employee.sbf_member === true ? "true" : "false";
  el.companyEmployeeSaewaMember.value = employee.saewa_member === true ? "true" : "false";
  el.companyEmployeeActive.value = employee.active === false ? "false" : "true";
  el.btnSaveEmployee.textContent = "Update Employee";
  showEmployeeForm(true);
  el.companyEmployeeName.focus();
}

function beginEditSite(siteId) {
  const site = companyAdminSites.find(x => String(x.site_id) === String(siteId));
  if (!site) return;
  editingSiteId = site.site_id || "";
  el.companySiteId.value = site.site_id || "";
  el.companySiteId.readOnly = true;
  el.companySiteName.value = site.name || "";
  el.companySiteLat.value = site.lat ?? "";
  el.companySiteLon.value = site.lon ?? "";
  el.companySiteRadius.value = site.radius_m || "200";
  el.companySiteActive.value = site.active === false ? "false" : "true";
  el.btnSaveCompanySite.textContent = "Update Site";
  showSiteForm(true);
  el.companySiteName.focus();
}

function beginEditSupervisor(supervisorId) {
  const supervisor = companyAdminSupervisors.find(x => String(x.supervisor_id) === String(supervisorId));
  if (!supervisor) return;
  editingSupervisorId = supervisor.supervisor_id || "";
  el.companySupervisorId.value = supervisor.supervisor_id || "";
  el.companySupervisorId.readOnly = true;
  el.companySupervisorCode.value = supervisor.code || "";
  populateSupervisorEmployeeSelect(supervisor.full_name || "");
  el.companySupervisorActive.value = supervisor.active === false ? "false" : "true";
  el.btnSaveSupervisor.textContent = "Update Supervisor";
  showSupervisorForm(true);
  if (el.companySupervisorName.hidden) el.companySupervisorCode.focus();
  else el.companySupervisorName.focus();
}

function openEmployeeQr(employeeId) {
  const employee = companyAdminEmployees.find(x => String(x.employee_id) === String(employeeId));
  if (!employee) return;

  const qrValue = String(employee.employee_id || "").trim().toUpperCase();
  if (!qrValue) return;

  currentIdentityEmployeeId = qrValue;
  currentIdentityEmployee = employee;
  el.employeeQrName.textContent = employee.full_name || "Employee";
  el.employeeQrId.textContent = qrValue;
  setEmployeeIdentityTab("qr");
  renderEmployeeFaceStatus(employee);
  el.employeeQrBox.innerHTML = "";

  if (!window.QRCode) {
    el.employeeQrBox.innerHTML = `<div style="color:#111;font-weight:900;">${escapeHtml(qrValue)}</div>`;
    alert("QR generator did not load. Refresh and try again.");
  } else {
    new window.QRCode(el.employeeQrBox, {
      text: qrValue,
      width: 220,
      height: 220,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.H
    });
  }

  el.employeeQrModal.classList.add("show");
  el.employeeQrModal.setAttribute("aria-hidden", "false");
}

function setEmployeeIdentityTab(tab) {
  const isFace = tab === "face";
  el.employeeIdentityQrTab.classList.toggle("active", !isFace);
  el.employeeIdentityFaceTab.classList.toggle("active", isFace);
  el.employeeIdentityQrTab.setAttribute("aria-selected", String(!isFace));
  el.employeeIdentityFaceTab.setAttribute("aria-selected", String(isFace));
  el.employeeQrPanel.hidden = isFace;
  el.employeeFacePanel.hidden = !isFace;
  el.employeeIdentityIcon.className = `ph ${isFace ? "ph-fingerprint" : "ph-qr-code"}`;
}

function renderEmployeeFaceStatus(employee) {
  const enrolled = !!employee?.face_enrolled_at || !!employee?.face_photo_path || !!employee?.face_photo_url;
  const enrolledDate = employee?.face_enrolled_at ? formatPayslipDate(employee.face_enrolled_at) : "";
  el.employeeFaceStatus.textContent = enrolled ? `Face enrolled${enrolledDate ? " • " + enrolledDate : ""}` : "No face enrolled";
  el.btnRemoveFace.disabled = !enrolled;
  el.btnRemoveFace.classList.toggle("disabled", !enrolled);
  el.btnEnrollFace.innerHTML = `<i class="ph ph-camera"></i><span>${enrolled ? "Re-enroll Face" : "Enroll Face"}</span>`;
  el.btnRemoveFace.innerHTML = `<i class="ph ph-trash"></i><span>Remove</span>`;
}

function setFaceEnrollmentBusy(isBusy, label = "Enroll Face") {
  el.btnEnrollFace.disabled = isBusy;
  el.btnRemoveFace.disabled = isBusy || !(currentIdentityEmployee?.face_enrolled_at || currentIdentityEmployee?.face_photo_path || currentIdentityEmployee?.face_photo_url);
  el.btnEnrollFace.innerHTML = isBusy
    ? `<i class="ph ph-spinner-gap"></i><span>${escapeHtml(label)}</span>`
    : `<i class="ph ph-camera"></i><span>${escapeHtml(label)}</span>`;
}

function updateCurrentIdentityEmployee(patch) {
  if (!currentIdentityEmployee) return;
  Object.assign(currentIdentityEmployee, patch);
  const row = companyAdminEmployees.find((employee) =>
    String(employee.employee_id) === String(currentIdentityEmployee.employee_id)
  );
  if (row) Object.assign(row, patch);
  renderEmployeeFaceStatus(currentIdentityEmployee);
}

function stopFaceCaptureStream() {
  if (!faceCaptureStream) return;
  faceCaptureStream.getTracks().forEach((track) => track.stop());
  faceCaptureStream = null;
  if (el.faceCaptureVideo) el.faceCaptureVideo.srcObject = null;
}

function renderFaceCameraSwitch() {
  const isFront = faceCaptureFacingMode === "user";
  el.faceCaptureVideo.dataset.facingMode = faceCaptureFacingMode;
  el.btnSwitchFaceCamera.hidden = faceCaptureCameraCount === 1;
  el.btnSwitchFaceCamera.setAttribute("aria-label", `Switch to ${isFront ? "back" : "front"} camera`);
  el.btnSwitchFaceCamera.title = `Switch to ${isFront ? "back" : "front"} camera`;
  el.btnSwitchFaceCamera.innerHTML = `<i class="ph ph-camera-rotate"></i>`;
}

async function updateFaceCameraCount() {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    faceCaptureCameraCount = devices.filter((device) => device.kind === "videoinput").length;
  } catch {
    faceCaptureCameraCount = 0;
  }
  renderFaceCameraSwitch();
}

async function startFaceCaptureCamera(facingMode) {
  stopFaceCaptureStream();
  faceCaptureStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: facingMode }, width: { ideal: 960 }, height: { ideal: 960 } },
    audio: false
  });
  const activeFacingMode = faceCaptureStream.getVideoTracks()[0]?.getSettings?.().facingMode;
  faceCaptureFacingMode = ["user", "environment"].includes(activeFacingMode) ? activeFacingMode : facingMode;
  el.faceCaptureVideo.srcObject = faceCaptureStream;
  renderFaceCameraSwitch();
  await el.faceCaptureVideo.play();
  await updateFaceCameraCount();
}

async function switchFaceCaptureCamera() {
  if (!faceCaptureStream || el.btnSwitchFaceCamera.disabled) return;
  const previousFacingMode = faceCaptureFacingMode;
  const nextFacingMode = previousFacingMode === "user" ? "environment" : "user";
  el.btnSwitchFaceCamera.disabled = true;
  el.btnCaptureFace.disabled = true;
  el.btnSwitchFaceCamera.innerHTML = `<i class="ph ph-spinner-gap"></i>`;
  try {
    await startFaceCaptureCamera(nextFacingMode);
  } catch (error) {
    try {
      await startFaceCaptureCamera(previousFacingMode);
    } catch {
      closeFaceCapture();
    }
    alert(`Could not switch camera: ${error.message || error}`);
  } finally {
    el.btnSwitchFaceCamera.disabled = false;
    el.btnCaptureFace.disabled = !faceCaptureStream;
    renderFaceCameraSwitch();
  }
}

async function openFaceCapture() {
  const company = currentCompany();
  if (!company) return alert("Select a company first.");
  if (!currentIdentityEmployee) return alert("Choose an employee first.");
  if (!navigator.mediaDevices?.getUserMedia) {
    return alert("This browser does not support camera capture.");
  }

  el.faceCaptureEmployee.textContent = `${currentIdentityEmployee.employee_id || ""} - ${currentIdentityEmployee.full_name || "Employee"}`;
  el.faceCaptureModal.classList.add("show");
  el.faceCaptureModal.setAttribute("aria-hidden", "false");
  el.btnCaptureFace.disabled = true;
  el.btnCaptureFace.innerHTML = `<i class="ph ph-spinner-gap"></i><span>Starting Camera...</span>`;

  try {
    faceCaptureFacingMode = "user";
    faceCaptureCameraCount = 0;
    el.btnSwitchFaceCamera.hidden = false;
    await startFaceCaptureCamera(faceCaptureFacingMode);
    el.btnCaptureFace.disabled = false;
    el.btnCaptureFace.innerHTML = `<i class="ph ph-camera"></i><span>Capture Reference Photo</span>`;
  } catch (error) {
    closeFaceCapture();
    alert(`Could not open the camera: ${error.message || error}`);
  }
}

function closeFaceCapture() {
  stopFaceCaptureStream();
  faceCaptureFacingMode = "user";
  faceCaptureCameraCount = 0;
  renderFaceCameraSwitch();
  el.faceCaptureModal.classList.remove("show");
  el.faceCaptureModal.setAttribute("aria-hidden", "true");
  el.btnCaptureFace.disabled = false;
  el.btnCaptureFace.innerHTML = `<i class="ph ph-camera"></i><span>Capture Reference Photo</span>`;
}

function captureFaceBlob() {
  const video = el.faceCaptureVideo;
  const canvas = el.faceCaptureCanvas;
  const width = video.videoWidth || 720;
  const height = video.videoHeight || 720;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not capture face photo."));
    }, "image/jpeg", 0.86);
  });
}

async function ensureFaceModels() {
  if (faceModelsReady) return true;
  if (!window.faceapi) throw new Error("Face engine did not load. Check connection and refresh.");
  if (!faceModelsPromise) {
    faceModelsPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(FACE_API_MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(FACE_API_MODEL_URL)
    ]).then(() => {
      faceModelsReady = true;
      return true;
    });
  }
  return faceModelsPromise;
}

function faceDetectorOptions() {
  return new faceapi.TinyFaceDetectorOptions({
    inputSize: 224,
    scoreThreshold: 0.45
  });
}

async function detectFaceDescriptor(source) {
  await ensureFaceModels();
  const result = await faceapi
    .detectSingleFace(source, faceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  return result?.descriptor ? Array.from(result.descriptor) : null;
}

async function enrollEmployeeFace() {
  const company = currentCompany();
  if (!company) return alert("Select a company first.");
  if (!currentIdentityEmployee) return alert("Choose an employee first.");

  el.btnCaptureFace.disabled = true;
  el.btnSwitchFaceCamera.disabled = true;
  el.btnCaptureFace.innerHTML = `<i class="ph ph-spinner-gap"></i><span>Saving...</span>`;
  setFaceEnrollmentBusy(true, "Saving Face");

  const employeeId = String(currentIdentityEmployee.employee_id || "").trim();
  const path = `${company.id}/${employeeId}.jpg`;
  try {
    const blob = await captureFaceBlob();
    const descriptor = await detectFaceDescriptor(el.faceCaptureVideo);
    if (!descriptor) {
      throw new Error("No clear face detected. Center the face in the circle and try again.");
    }

    const { error: uploadError } = await sb.storage
      .from(EMPLOYEE_FACE_BUCKET)
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (uploadError) throw uploadError;

    const enrolledAt = new Date().toISOString();
    const { error: updateError } = await sb
      .from("employees")
      .update({
        face_photo_path: path,
        face_photo_url: null,
        face_enrolled_at: enrolledAt,
        face_descriptor: descriptor
      })
      .eq(COMPANY_ID_COL, company.id)
      .eq("employee_id", employeeId);
    if (updateError) throw updateError;

    updateCurrentIdentityEmployee({
      face_photo_path: path,
      face_photo_url: null,
      face_enrolled_at: enrolledAt,
      face_descriptor: descriptor
    });
    resetFaceRoster();
    closeFaceCapture();
  } catch (error) {
    alert(`Failed to enroll face: ${error.message || error}\n\nIf this mentions a missing column, bucket, or face_descriptor, run database/employee-face-enrollment.sql in Supabase first.`);
  } finally {
    setFaceEnrollmentBusy(false, currentIdentityEmployee?.face_enrolled_at ? "Re-enroll Face" : "Enroll Face");
    el.btnCaptureFace.disabled = false;
    el.btnSwitchFaceCamera.disabled = false;
    el.btnCaptureFace.innerHTML = `<i class="ph ph-camera"></i><span>Capture Reference Photo</span>`;
  }
}

async function removeEmployeeFace() {
  const company = currentCompany();
  if (!company || !currentIdentityEmployee) return;
  const employeeId = String(currentIdentityEmployee.employee_id || "").trim();
  const path = currentIdentityEmployee.face_photo_path || `${company.id}/${employeeId}.jpg`;
  if (!confirm(`Remove face enrollment for ${employeeId}?`)) return;

  setFaceEnrollmentBusy(true, "Removing");
  try {
    if (path) {
      const { error: removeError } = await sb.storage
        .from(EMPLOYEE_FACE_BUCKET)
        .remove([path]);
      if (removeError && !/not found/i.test(removeError.message || "")) console.warn("Face photo removal failed:", removeError.message);
    }

    const { error: updateError } = await sb
      .from("employees")
      .update({
        face_photo_path: null,
        face_photo_url: null,
        face_enrolled_at: null,
        face_descriptor: null
      })
      .eq(COMPANY_ID_COL, company.id)
      .eq("employee_id", employeeId);
    if (updateError) throw updateError;

    updateCurrentIdentityEmployee({
      face_photo_path: null,
      face_photo_url: null,
      face_enrolled_at: null,
      face_descriptor: null
    });
    resetFaceRoster();
  } catch (error) {
    alert(`Failed to remove face enrollment: ${error.message || error}`);
  } finally {
    setFaceEnrollmentBusy(false, currentIdentityEmployee?.face_enrolled_at ? "Re-enroll Face" : "Enroll Face");
  }
}

function closeEmployeeQr() {
  closeFaceCapture();
  el.employeeQrModal.classList.remove("show");
  el.employeeQrModal.setAttribute("aria-hidden", "true");
  el.employeeQrBox.innerHTML = "";
  currentIdentityEmployeeId = "";
  currentIdentityEmployee = null;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function toTimeInputValue(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function openEventTimeEditor(entryId) {
  const event = companyAdminEvents.find(x => String(x.entry_id) === String(entryId));
  if (!event || !event.created_at) return;

  editingEvent = event;
  const date = new Date(event.created_at);
  el.eventTimeEmployee.textContent = `${event.employee_id || ""} ${event.employee_name ? "- " + event.employee_name : ""}`.trim();
  el.eventTimeSite.textContent = `${event.site_id || ""} ${event.site_name ? "- " + event.site_name : ""}`.trim();
  el.eventTimeAction.textContent = event.action || "-";
  el.eventTimeResult.textContent = event.result || "-";
  el.eventTimeDate.value = toDateInputValue(date);
  el.eventTimeTime.value = toTimeInputValue(date);
  const trCorrection = isTrElectricalCompany();
  const blocked = String(event.result || "").toUpperCase() === "BLOCKED";
  el.eventTimeTitle.textContent = trCorrection ? "Correct Clock Entry" : "Edit Clock Time";
  el.eventTimeSub.textContent = trCorrection
    ? "Correct the time or site. Blocked entries require explicit approval before payroll can use them."
    : "Adjust the recorded date and time for this entry.";
  el.eventTimeSiteSelect.hidden = !trCorrection;
  el.eventTimeApproveRow.hidden = !trCorrection || !blocked;
  el.eventTimeApproveBlocked.checked = false;
  if (trCorrection) {
    el.eventTimeSiteSelect.innerHTML = companyAdminSites.map((site) => `
      <option value="${escapeHtml(site.site_id || "")}">${escapeHtml(site.site_id || "")} - ${escapeHtml(site.name || "")}${site.active === false ? " (Inactive)" : ""}</option>
    `).join("");
    el.eventTimeSiteSelect.value = String(event.site_id || "");
  } else {
    el.eventTimeSiteSelect.innerHTML = "";
  }
  el.btnSaveEventTime.textContent = trCorrection ? "Update Entry" : "Update Time";
  el.eventTimeModal.classList.add("show");
  el.eventTimeModal.setAttribute("aria-hidden", "false");
}

function closeEventTimeEditor() {
  editingEvent = null;
  el.eventTimeModal.classList.remove("show");
  el.eventTimeModal.setAttribute("aria-hidden", "true");
}

async function saveEventTime(event) {
  event.preventDefault();
  if (!editingEvent) return;
  const company = currentCompany();
  if (!company) return alert("Select a company first.");

  const dateValue = el.eventTimeDate.value;
  const timeValue = el.eventTimeTime.value || "00:00:00";
  if (!dateValue) return alert("Choose a date.");

  const nextDate = new Date(`${dateValue}T${timeValue}`);
  if (!Number.isFinite(nextDate.getTime())) return alert("Choose a valid date and time.");

  const trCorrection = isTrElectricalCompany(company);
  const selectedSiteId = trCorrection ? String(el.eventTimeSiteSelect.value || "") : String(editingEvent.site_id || "");
  const approveBlocked = trCorrection && el.eventTimeApproveBlocked.checked;
  if (trCorrection && !selectedSiteId) return alert("Choose the correct site.");
  if (trCorrection && String(editingEvent.result || "").toUpperCase() === "BLOCKED" && !approveBlocked) {
    return alert("Tick the approval box to approve this blocked entry, or cancel without changing it.");
  }

  el.btnSaveEventTime.disabled = true;
  el.btnSaveEventTime.textContent = "Updating...";
  try {
    const { error } = trCorrection
      ? await sb.rpc("correct_tr_electrical_clock_event", {
          p_entry_id: editingEvent.entry_id,
          p_created_at: nextDate.toISOString(),
          p_site_id: selectedSiteId,
          p_approve_blocked: approveBlocked
        })
      : await sb
          .from("clock_events")
          .update({ created_at: nextDate.toISOString() })
          .eq(COMPANY_ID_COL, company.id)
          .eq("entry_id", editingEvent.entry_id);

    if (error) return alert(`Failed to update ${trCorrection ? "entry" : "time"}: ${error.message}`);
    closeEventTimeEditor();
    await loadCompanyAdminDetail();
  } finally {
    el.btnSaveEventTime.disabled = false;
    el.btnSaveEventTime.textContent = trCorrection ? "Update Entry" : "Update Time";
  }
}

async function saveCompanyEmployee() {
  const company = currentCompany();
  if (!company) return alert("Select a company first.");

  const employeeId = el.companyEmployeeId.value.trim().toUpperCase();
  const fullName = el.companyEmployeeName.value.trim();
  const idNumber = el.companyEmployeeIdNumber.value.trim();
  const payType = el.companyEmployeePayType.value || "hourly";
  const payCycle = el.companyEmployeePayCycle.value || "fortnightly";
  const nbceiDesignationCode = isTrElectricalCompany(company)
    ? normaliseNbceiDesignationCode(el.companyEmployeeNbceiDesignation.value)
    : "";
  const sbfMemberValue = isTrElectricalCompany(company) ? el.companyEmployeeSbfMember.value : "false";
  const saewaMemberValue = isTrElectricalCompany(company) ? el.companyEmployeeSaewaMember.value : "false";
  const rateValue = el.companyEmployeeRate.value.trim();
  const employmentDate = el.companyEmployeeEmploymentDate.value || localDateInputValue(new Date());
  const active = el.companyEmployeeActive.value !== "false";
  if (!employeeId) return alert("Enter an employee ID.");
  if (!fullName) return alert("Enter the employee full name.");
  if (!["hourly", "daily", "monthly"].includes(payType)) return alert("Choose a valid pay type.");
  if (!["weekly", "fortnightly", "monthly"].includes(payCycle)) return alert("Choose a valid pay cycle.");
  if (isTrElectricalCompany(company) && !nbceiDesignationCode) {
    return alert("Choose the employee's NBCEI designation or select Not subject to NBCEI levies.");
  }
  if (isTrElectricalCompany(company) && nbceiDesignationCode !== "none" && !["true", "false"].includes(sbfMemberValue)) {
    return alert("Choose whether the employee is an SBF member.");
  }
  if (isTrElectricalCompany(company) && nbceiDesignationCode !== "none" && !["true", "false"].includes(saewaMemberValue)) {
    return alert("Choose whether the employee is a SAEWA member.");
  }
  const rate = rateValue === "" ? null : Number(rateValue);
  if (rateValue !== "" && (!Number.isFinite(rate) || rate < 0)) return alert("Enter a valid employee rate or salary.");

  el.btnSaveEmployee.disabled = true;
  el.btnSaveEmployee.textContent = "Saving...";
  try {
    const isEditing = !!editingEmployeeId;
    const duplicate = companyAdminEmployees.some((employee) =>
      String(employee.employee_id || "").toUpperCase() === employeeId
    );
    if (!isEditing && duplicate) {
      alert(`Employee ID ${employeeId} already exists. Use the pencil icon to edit that employee.`);
      return;
    }

    const payload = {
      company_id: company.id,
      company_name: company.name,
      employee_id: employeeId,
      full_name: fullName,
      id_number: idNumber || null,
      employment_date: employmentDate || null,
      pay_type: payType,
      pay_cycle: payCycle,
      nbcei_designation_code: nbceiDesignationCode || null,
      ...(isTrElectricalCompany(company) ? {
        sbf_member: nbceiDesignationCode !== "none" && sbfMemberValue === "true",
        saewa_member: nbceiDesignationCode !== "none" && saewaMemberValue === "true"
      } : {}),
      rate,
      active
    };
    const query = isEditing
      ? sb.from("employees").update(payload).eq(COMPANY_ID_COL, company.id).eq("employee_id", editingEmployeeId)
      : sb.from("employees").insert(payload);
    const { error } = await query;
    if (error) return alert("Failed to save employee: " + error.message);
    el.companyEmployeeId.value = "";
    el.companyEmployeeName.value = "";
    el.companyEmployeeIdNumber.value = "";
    el.companyEmployeePayType.value = "hourly";
    el.companyEmployeeRate.value = "";
    updateEmployeeRatePlaceholder();
    el.companyEmployeeEmploymentDate.value = localDateInputValue(new Date());
    el.companyEmployeePayCycle.value = "fortnightly";
    el.companyEmployeeNbceiDesignation.value = "";
    el.companyEmployeeSbfMember.value = "";
    el.companyEmployeeSaewaMember.value = "";
    showEmployeeForm(false);
    await loadCompanyAdminDetail();
  } finally {
    el.btnSaveEmployee.disabled = false;
    el.btnSaveEmployee.textContent = editingEmployeeId ? "Update Employee" : "Save Employee";
  }
}

async function saveCompanySite() {
  const company = currentCompany();
  if (!company) return alert("Select a company first.");

  const siteId = el.companySiteId.value.trim().toUpperCase();
  const name = el.companySiteName.value.trim();
  const lat = Number(el.companySiteLat.value);
  const lon = Number(el.companySiteLon.value);
  const radius = clampInt(el.companySiteRadius.value, 20, 25000);
  const active = el.companySiteActive.value !== "false";
  if (!siteId) return alert("Enter a site ID.");
  if (!name) return alert("Enter the site name.");
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return alert("Enter a valid latitude and longitude.");
  if (!radius) return alert("Enter a valid radius between 20 and 25000 metres.");

  el.btnSaveCompanySite.disabled = true;
  el.btnSaveCompanySite.textContent = "Saving...";
  try {
    const isEditing = !!editingSiteId;
    const duplicate = companyAdminSites.some((site) =>
      String(site.site_id || "").toUpperCase() === siteId
    );
    if (!isEditing && duplicate) {
      alert(`Site ID ${siteId} already exists. Use the pencil icon to edit that site.`);
      return;
    }

    const payload = {
      company_id: company.id,
      company_name: company.name,
      site_id: siteId,
      name,
      lat,
      lon,
      radius_m: radius,
      active
    };
    const query = isEditing
      ? sb.from(SITES_TABLE).update(payload).eq(COMPANY_ID_COL, company.id).eq("site_id", editingSiteId)
      : sb.from(SITES_TABLE).insert(payload);
    const { error } = await query;
    if (error) return alert("Failed to save site: " + error.message);
    el.companySiteId.value = "";
    el.companySiteName.value = "";
    el.companySiteLat.value = "";
    el.companySiteLon.value = "";
    el.companySiteRadius.value = "200";
    showSiteForm(false);
    await loadCompanyAdminDetail();
  } finally {
    el.btnSaveCompanySite.disabled = false;
    el.btnSaveCompanySite.textContent = editingSiteId ? "Update Site" : "Save Site";
  }
}

async function saveCompanySupervisor() {
  const company = currentCompany();
  if (!company) return alert("Select a company first.");

  const supervisorId = el.companySupervisorId.value.trim().toUpperCase();
  const code = el.companySupervisorCode.value.trim().toUpperCase();
  const fullName = el.companySupervisorName.value.trim();
  const active = el.companySupervisorActive.value !== "false";
  if (!supervisorId) return alert("Enter a supervisor ID.");
  if (!code) return alert("Enter the supervisor clocking code.");
  if (!el.companySupervisorEmployee.value) return alert("Select an employee or choose manual name.");
  if (!fullName) return alert("Enter the supervisor full name.");

  el.btnSaveSupervisor.disabled = true;
  el.btnSaveSupervisor.textContent = "Saving...";
  try {
    const isEditing = !!editingSupervisorId;
    const duplicate = companyAdminSupervisors.some((supervisor) =>
      String(supervisor.supervisor_id || "").toUpperCase() === supervisorId
    );
    if (!isEditing && duplicate) {
      alert(`Supervisor ID ${supervisorId} already exists. Use the pencil icon to edit that supervisor.`);
      return;
    }

    const payload = {
      company_id: company.id,
      company_name: company.name,
      supervisor_id: supervisorId,
      code,
      full_name: fullName,
      active
    };
    const query = isEditing
      ? sb.from("supervisors").update(payload).eq(COMPANY_ID_COL, company.id).eq("supervisor_id", editingSupervisorId)
      : sb.from("supervisors").insert(payload);
    const { error } = await query;
    if (error) return alert("Failed to save supervisor: " + error.message);
    el.companySupervisorId.value = "";
    el.companySupervisorCode.value = "";
    el.companySupervisorEmployee.value = "";
    el.companySupervisorName.value = "";
    showSupervisorForm(false);
    await loadCompanyAdminDetail();
  } finally {
    el.btnSaveSupervisor.disabled = false;
    el.btnSaveSupervisor.textContent = editingSupervisorId ? "Update Supervisor" : "Save Supervisor";
  }
}

/***********************
 * DATA: LOAD SITES
 ***********************/
async function loadSites() {
  el.siteSelect.innerHTML = `<option value="">Loading…</option>`;

  if (!currentCompanyId) {
    el.siteSelect.innerHTML = `<option value="">No company selected</option>`;
    updateSiteName();
    updateSubmit();
    return;
  }

  const { data, error } = await sb
    .from(SITES_TABLE)
    .select(`${SITES_ID_COL},${SITES_NAME_COL},${SITES_LAT_COL},${SITES_LON_COL},${SITES_RADIUS_COL},${SITES_ACTIVE_COL}`)
    .eq(COMPANY_ID_COL, currentCompanyId)
    .eq(SITES_ACTIVE_COL, true)
    .order(SITES_NAME_COL, { ascending: true });

  if (error) {
    console.error(error);
    el.siteSelect.innerHTML = `<option value="">Failed to load sites</option>`;
    alert("Failed to load sites: " + (error.message || ""));
    return;
  }

  sites = data || [];
  el.siteSelect.innerHTML = `<option value="">-- Select a site --</option>`;
  for (const s of sites) {
    const opt = document.createElement("option");
    opt.value = String(s[SITES_ID_COL]);
    opt.textContent = s[SITES_NAME_COL];
    el.siteSelect.appendChild(opt);
  }

  if (!selectedSiteId && sites.length > 0) {
    selectedSiteId = String(sites[0][SITES_ID_COL]);
    el.siteSelect.value = selectedSiteId;
  }

  updateSiteName();
  updateSubmit();
}

/***********************
 * ADMIN CODE CHECK (debounced)
 ***********************/
async function checkAdminCodeDebounced() {
  if (adminCheckTimer) clearTimeout(adminCheckTimer);

  adminCheckTimer = setTimeout(async () => {
    const code = el.supCode.value.trim().toUpperCase();
    if (!code) return setAdminUI(false);

    try {
      const { data, error } = await sb
        .from(ADMIN_TABLE)
        .select(`${ADMIN_CODE_COL},${ADMIN_ACTIVE_COL}`)
        .eq(ADMIN_CODE_COL, code)
        .eq(COMPANY_ID_COL, currentCompanyId)
        .eq(ADMIN_ACTIVE_COL, true)
        .maybeSingle();

      if (error) {
        console.warn("Admin check error:", error.message);
        return setAdminUI(false);
      }
      setAdminUI(!!data);
    } catch (e) {
      console.warn("Admin check failed:", e);
      setAdminUI(false);
    }
  }, 350);
}

/***********************
 * SCANNER
 ***********************/
function enabledScannerModes() {
  const company = currentCompany();
  const hasExplicitQr = Object.prototype.hasOwnProperty.call(company || {}, "scan_qr_enabled");
  const hasExplicitFace = Object.prototype.hasOwnProperty.call(company || {}, "scan_face_enabled");
  const qrEnabled = hasExplicitQr ? company.scan_qr_enabled !== false : true;
  const faceEnabled = hasExplicitFace ? company.scan_face_enabled !== false : true;
  return {
    qr: qrEnabled,
    face: faceEnabled
  };
}

function updateScannerModeUI() {
  const enabled = enabledScannerModes();
  const available = Object.entries(enabled).filter(([, isEnabled]) => isEnabled).map(([key]) => key);

  if (!available.includes(scannerMode)) scannerMode = available[0] || "qr";
  if (available.length <= 1) scannerModeExpanded = false;

  if (el.scannerModeSwitch) {
    el.scannerModeSwitch.hidden = available.length <= 1;
    el.scannerModeSwitch.dataset.mode = scannerMode;
    el.scannerModeSwitch.classList.toggle("expanded", scannerModeExpanded);
  }

  el.btnScanFace?.classList.toggle("active", scannerMode === "face");
  el.btnScanQr?.classList.toggle("active", scannerMode === "qr");
  el.btnScanFace?.setAttribute("aria-selected", String(scannerMode === "face"));
  el.btnScanQr?.setAttribute("aria-selected", String(scannerMode === "qr"));
  el.btnScanFace && (el.btnScanFace.disabled = !enabled.face);
  el.btnScanQr && (el.btnScanQr.disabled = !enabled.qr);
  el.scanBox?.classList.toggle("faceMode", scannerMode === "face");
}

function expandScannerModeSwitch() {
  scannerModeExpanded = true;
  updateScannerModeUI();
  scheduleScannerModeCollapse(2200);
}

function scheduleScannerModeCollapse(delay = 900) {
  if (scannerModeCollapseTimer) clearTimeout(scannerModeCollapseTimer);
  scannerModeCollapseTimer = setTimeout(collapseScannerModeSwitch, delay);
}

function collapseScannerModeSwitch() {
  scannerModeExpanded = false;
  updateScannerModeUI();
}

function handleScannerModeButton(nextMode) {
  if (!scannerModeExpanded) {
    expandScannerModeSwitch();
    return;
  }
  setScannerMode(nextMode);
  scheduleScannerModeCollapse(650);
}

function scannerGuideCopy() {
  if (scannerMode === "face") {
    return {
      icon: "ph ph-user-focus",
      title: "Look at camera",
      sub: "Auto-add to queue"
    };
  }
  return {
    icon: "ph ph-qr-code",
    title: "Hold QR inside frame",
    sub: "Auto-add to queue"
  };
}

function showScannerGuide() {
  if (!el.scannerGuide) return;
  const copy = scannerGuideCopy();
  el.scannerGuideIcon.className = copy.icon;
  el.scannerGuideTitle.textContent = copy.title;
  el.scannerGuideSub.textContent = copy.sub;
  el.scannerGuide.classList.remove("hidden");
  el.scannerGuide.setAttribute("aria-hidden", "false");

  if (scannerGuideTimer) clearTimeout(scannerGuideTimer);
  scannerGuideTimer = setTimeout(() => {
    el.scannerGuide.classList.add("hidden");
    el.scannerGuide.setAttribute("aria-hidden", "true");
  }, 2000);
}

async function prepareFaceScanning() {
  if (!scanning || scannerMode !== "face") return;
  try {
    await ensureFaceModels();
    await loadFaceRoster();
    scheduleFaceScanningLoop(250);
  } catch (error) {
    console.warn("Face mode unavailable:", error.message || error);
    showScannerGuide();
  }
}

function setScannerMode(nextMode, showGuide = true) {
  const enabled = enabledScannerModes();
  if (!enabled[nextMode]) return;
  if (scannerMode === nextMode && showGuide) {
    showScannerGuide();
    expandScannerModeSwitch();
    return;
  }
  scannerMode = nextMode;
  scannerFailCount = 0;
  expandScannerModeSwitch();
  updateScannerModeUI();
  if (scannerMode === "face") prepareFaceScanning();
  else stopFaceScanningLoop();
  if (showGuide) showScannerGuide();
}

function ensureScanner(){
  if (!qr) qr = new Html5Qrcode("reader");
}

function resetFaceRoster() {
  faceRoster = [];
  faceRosterCompanyId = "";
}

function stopFaceScanningLoop() {
  if (faceScanTimer) clearTimeout(faceScanTimer);
  faceScanTimer = null;
  faceScanBusy = false;
}

async function loadFaceRoster(force = false) {
  if (!currentCompanyId) return [];
  if (!force && faceRosterCompanyId === currentCompanyId && faceRoster.length) return faceRoster;

  const { data, error } = await sb
    .from("employees")
    .select("employee_id,full_name,active,face_descriptor")
    .eq(COMPANY_ID_COL, currentCompanyId)
    .not("face_descriptor", "is", null);

  if (error) {
    console.warn("Face roster unavailable:", error.message);
    faceRoster = [];
    faceRosterCompanyId = currentCompanyId;
    return faceRoster;
  }

  faceRoster = (data || [])
    .filter((employee) => employee.active !== false && Array.isArray(employee.face_descriptor) && employee.face_descriptor.length)
    .map((employee) => ({
      id: String(employee.employee_id || "").trim().toUpperCase(),
      name: employee.full_name || "Employee",
      descriptor: new Float32Array(employee.face_descriptor.map(Number))
    }))
    .filter((employee) => employee.id && employee.descriptor.length);
  faceRosterCompanyId = currentCompanyId;
  return faceRoster;
}

function faceDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function bestFaceMatch(descriptor, roster) {
  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const input = descriptor instanceof Float32Array ? descriptor : new Float32Array(descriptor || []);
  for (const employee of roster) {
    const distance = faceDistance(input, employee.descriptor);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = employee;
    }
  }
  return best && bestDistance <= FACE_MATCH_THRESHOLD ? { employee: best, distance: bestDistance } : null;
}

function addEmployeeToQueue(employee) {
  const code = String(employee?.id || employee?.employee_id || "").trim().toUpperCase();
  if (!code || queue.has(code)) return false;
  queue.set(code, { id: code, name: employee?.name || employee?.full_name || "Employee" });
  renderQueue();
  vibrate(35);
  return true;
}

async function processFaceFrame() {
  if (!scanning || scannerMode !== "face" || faceScanBusy) return;
  const video = document.querySelector("#reader video");
  if (!video || video.readyState < 2) return;

  faceScanBusy = true;
  try {
    const roster = await loadFaceRoster();
    if (!roster.length) {
      scannerFailCount += 1;
      if (scannerFailCount >= 3) {
        scannerFailCount = 0;
        showScannerGuide();
      }
      return;
    }

    const descriptor = await detectFaceDescriptor(video);
    if (!descriptor) {
      scannerFailCount += 1;
      if (scannerFailCount >= 3) {
        scannerFailCount = 0;
        showScannerGuide();
      }
      return;
    }

    const match = bestFaceMatch(descriptor, roster);
    if (!match) {
      scannerFailCount += 1;
      if (scannerFailCount >= 3) {
        scannerFailCount = 0;
        showScannerGuide();
      }
      return;
    }

    const code = match.employee.id;
    if (lastFaceMatch === code) return;
    lastFaceMatch = code;
    if (lastFaceMatchTimer) clearTimeout(lastFaceMatchTimer);
    lastFaceMatchTimer = setTimeout(() => { lastFaceMatch = ""; }, 1800);

    scannerFailCount = 0;
    addEmployeeToQueue(match.employee);
  } catch (error) {
    console.warn("Face scan failed:", error.message || error);
    scannerFailCount += 1;
    if (scannerFailCount >= 3) {
      scannerFailCount = 0;
      showScannerGuide();
    }
  } finally {
    faceScanBusy = false;
  }
}

function scheduleFaceScanningLoop(delay = FACE_SCAN_INTERVAL_MS) {
  if (faceScanTimer) clearTimeout(faceScanTimer);
  if (!scanning || scannerMode !== "face") return;
  faceScanTimer = setTimeout(async () => {
    await processFaceFrame();
    scheduleFaceScanningLoop(FACE_SCAN_INTERVAL_MS);
  }, delay);
}

async function onScanSuccess(txt) {
  if (scannerMode !== "qr") return;
  const code = String(txt || "").trim().toUpperCase();
  if (!code) return;

  if (lastScan === code) return;
  lastScan = code;
  if (lastScanTimer) clearTimeout(lastScanTimer);
  lastScanTimer = setTimeout(() => { lastScan = ""; }, 800);

  if (queue.has(code)) return;

  // Fetch employee
  const { data, error } = await sb
    .from("employees")
    .select("employee_id, full_name")
    .eq(COMPANY_ID_COL, currentCompanyId)
    .eq("employee_id", code)
    .single();

  if (error || !data) {
    scannerFailCount += 1;
    if (scannerFailCount >= 3) {
      scannerFailCount = 0;
      showScannerGuide();
    }
    alert("Employee not found");
    return;
  }

  scannerFailCount = 0;
  addEmployeeToQueue(data);
}

async function startScanning(){
  if (scanning) return;
  if (!currentUser || !currentCompanyId) return;
  updateScannerModeUI();
  showScannerGuide();
  scanning = true;
  ensureScanner();

  const config = { fps: 12 };

  try {
    if (scannerMode === "face") {
      await ensureFaceModels();
      await loadFaceRoster();
    }
    await qr.start({ facingMode: { exact: "environment" } }, config, onScanSuccess);
    if (scannerMode === "face") scheduleFaceScanningLoop(300);
    return;
  } catch {}
  try {
    if (scannerMode === "face") {
      await ensureFaceModels();
      await loadFaceRoster();
    }
    await qr.start({ facingMode: "environment" }, config, onScanSuccess);
    if (scannerMode === "face") scheduleFaceScanningLoop(300);
    return;
  } catch (e) {
    console.error("Camera failed:", e);
    scanning = false;
    alert("Camera permission needed. Allow camera for this site, then refresh.");
  }
}

async function stopScanning(){
  stopFaceScanningLoop();
  if (!qr || !scanning) return;
  try {
    await qr.stop();
  } catch (e) {
    console.warn("Scanner stop failed:", e);
  } finally {
    scanning = false;
  }
}

/***********************
 * GPS
 ***********************/
function getLocation(){
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
      res, rej,
      { enableHighAccuracy:true, timeout:15000, maximumAge:0 }
    );
  });
}

/***********************
 * SUBMIT (RPC)
 ***********************/
async function submitBatch(){
  const sup = el.supCode.value.trim();
  if (!currentUser || !currentCompanyId) return alert("Sign in to a company workspace first.");
  if (!selectedSiteId) return alert("Select a site first.");
  if (!sup) return alert("Enter supervisor code.");
  if (queue.size === 0) return;

  el.btnSubmit.disabled = true;
  el.btnSubmit.textContent = "Submitting…";

  let pos;
  try {
    pos = await getLocation();
  } catch {
    updateSubmit();
    return alert("Location blocked. Enable GPS and allow location permission.");
  }

  const accuracyM = Math.round(pos.coords.accuracy || 9999);
  if (accuracyM > MAX_GPS_ACCURACY_M) {
    updateSubmit();
    return alert(`GPS accuracy too low. Try again.\nAccuracy: ${accuracyM}m`);
  }

  const employeeIds = Array.from(queue.keys());
  const payload = {
    p_company_id: currentCompanyId,
    p_action: mode,
    p_supervisor_code: sup,
    p_site_id: selectedSiteId,
    p_lat: pos.coords.latitude,
    p_lon: pos.coords.longitude,
    p_accuracy_m: accuracyM,
    p_employee_ids: employeeIds
  };

  const { data, error } = await sb.rpc("clock_batch", payload);
  if (error) {
    console.error(error);
    updateSubmit();
    return alert("Submit failed: " + (error.message || "Unknown error"));
  }

  const results = (data && data.results) ? data.results : [];
  let success = 0, skipped = 0, errors = 0;
  for (const r of results) {
    if (r.ok === true) success++;
    else {
      const msg = String(r.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("not clocked")) skipped++;
      else errors++;
    }
  }

  alert(`Done\n\nSuccess: ${success}\nSkipped: ${skipped}\nErrors: ${errors}`);
  queue.clear();
  renderQueue();
}

/***********************
 * ADMIN: MODAL + MAP
 ***********************/
function openSiteModal() {
  if (!isAdmin) return;

  el.siteModal.classList.add("show");
  el.siteModal.setAttribute("aria-hidden", "false");

  // Defaults
  if (!el.newSiteRadius.value) el.newSiteRadius.value = "80";

  // Try set map position to current location; fallback to Johannesburg-ish
  const fallback = { lat: -26.2041, lon: 28.0473 };

  if (!navigator.geolocation) {
    initMapIfNeeded(fallback.lat, fallback.lon);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => initMapIfNeeded(pos.coords.latitude, pos.coords.longitude),
    () => initMapIfNeeded(fallback.lat, fallback.lon),
    { enableHighAccuracy:true, timeout:8000, maximumAge:0 }
  );
}

function closeSiteModal() {
  el.siteModal.classList.remove("show");
  el.siteModal.setAttribute("aria-hidden", "true");
}

function initMapIfNeeded(lat, lon) {
  pickedLat = lat;
  pickedLon = lon;

  const radius = clampInt(el.newSiteRadius.value, 10, 2000) || 80;
  el.newSiteRadius.value = String(radius);

  if (!map) {
    map = L.map("map", { zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap"
    }).addTo(map);

    marker = L.marker([lat, lon], { draggable: true }).addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLatLng();
      pickedLat = p.lat;
      pickedLon = p.lng;
      updateCircle(radius);
    });

    map.on("click", (e) => {
      pickedLat = e.latlng.lat;
      pickedLon = e.latlng.lng;
      marker.setLatLng([pickedLat, pickedLon]);
      updateCircle(radius);
    });

    circle = L.circle([lat, lon], {
      radius,
      color: "#D4AF37",
      weight: 1,
      fillColor: "#D4AF37",
      fillOpacity: 0.08
    }).addTo(map);

    mapReady = true;

    // radius live updates
    el.newSiteRadius.addEventListener("input", () => {
      const r = clampInt(el.newSiteRadius.value, 10, 2000) || 80;
      updateCircle(r);
    });
  }

  // Ensure map sizes correctly when modal opens
  setTimeout(() => {
    map.invalidateSize();
    map.setView([lat, lon], 17);
    marker.setLatLng([lat, lon]);
    updateCircle(radius);
  }, 50);
}

function updateCircle(radius) {
  if (!circle) return;
  circle.setLatLng([pickedLat, pickedLon]);
  circle.setRadius(radius);
}

function clampInt(v, min, max) {
  const n = parseInt(String(v || "").replace(/[^\d]/g, ""), 10);
  if (!isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

async function saveNewSite() {
  if (!isAdmin) return;

  const name = el.newSiteName.value.trim();
  const radius = clampInt(el.newSiteRadius.value, 10, 2000);

  if (!name) return alert("Enter a site name.");
  if (!radius) return alert("Enter a valid radius (10–2000m).");
  if (!isFinite(pickedLat) || !isFinite(pickedLon)) return alert("Pick a location on the map.");

  el.btnSaveSite.disabled = true;
  el.btnSaveSite.textContent = "Saving…";

  try {
    // Insert
    const insertPayload = {
      [COMPANY_ID_COL]: currentCompanyId,
      [SITES_NAME_COL]: name,
      [SITES_LAT_COL]: pickedLat,
      [SITES_LON_COL]: pickedLon,
      [SITES_RADIUS_COL]: radius,
      [SITES_ACTIVE_COL]: true
    };

    const { data, error } = await sb
      .from(SITES_TABLE)
      .insert(insertPayload)
      .select(`${SITES_ID_COL},${SITES_NAME_COL}`)
      .single();

    if (error) {
      console.error(error);
      alert("Failed to save site: " + (error.message || "Unknown error"));
      return;
    }

    // Reload sites + select new site
    await loadSites();
    if (data && data[SITES_ID_COL]) {
      selectedSiteId = String(data[SITES_ID_COL]);
      el.siteSelect.value = selectedSiteId;
      updateSiteName();
      updateSubmit();
    }

    el.newSiteName.value = "";
    closeSiteModal();
  } finally {
    el.btnSaveSite.disabled = false;
    el.btnSaveSite.textContent = "Save site";
  }
}

/***********************
 * EVENTS
 ***********************/
el.loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = el.loginEmail.value.trim();
  const password = el.loginPassword.value;
  if (!email || !password) return setAuthError("Enter your email and password.");
  signIn(email, password);
});
el.passwordSetupForm.addEventListener("submit", completePasswordSetup);
el.btnResetPassword.addEventListener("click", sendPasswordReset);

el.btnLogout.addEventListener("click", signOut);
el.btnPlatformLogout.addEventListener("click", signOut);
el.btnPortfolioLogout.addEventListener("click", signOut);
el.btnCompanyAdminLogout.addEventListener("click", signOut);
el.btnBillingLogout.addEventListener("click", signOut);
el.btnEmployeeLogout.addEventListener("click", signOut);
el.btnExportCompanyEvents.addEventListener("click", exportCompanyClockEvents);
el.btnRunPayroll.addEventListener("click", () => runPayrollReport(false));
el.payrollStartDate.addEventListener("change", () => {
  if (isTrElectricalCompany() && el.payrollLevyWeeks) el.payrollLevyWeeks.value = "";
});
el.payrollEndDate.addEventListener("change", () => {
  if (isTrElectricalCompany() && el.payrollLevyWeeks) el.payrollLevyWeeks.value = "";
});
el.btnExportPayroll.addEventListener("click", openPayslipModal);
el.payrollRulesForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveCompanyPayrollRules();
});
el.payrollRulesForm.addEventListener("click", (event) => {
  const methodButton = event.target.closest("[data-payroll-method]");
  if (methodButton) {
    setPayrollMethod(methodButton.dataset.payrollMethod);
  }
});
el.ruleOvertimeMethod.addEventListener("change", () => setPayrollMethod(el.ruleOvertimeMethod.value));
el.btnToggleWorkWeekEditor.addEventListener("click", () => {
  const isOpen = el.workWeekEditor.hidden;
  el.workWeekEditor.hidden = !isOpen;
  const block = el.btnToggleWorkWeekEditor.closest(".workWeekBlock");
  if (block) block.classList.toggle("isEditing", isOpen);
  el.btnToggleWorkWeekEditor.title = isOpen ? "Close work week editor" : "Edit work week";
  el.btnToggleWorkWeekEditor.setAttribute("aria-label", isOpen ? "Close work week editor" : "Edit work week");
});
el.btnGeneratePayslip.addEventListener("click", generateSelectedPayslip);
el.btnClosePayslip.addEventListener("click", closePayslipModal);
el.btnOpenClocking.addEventListener("click", async () => {
  await bootWorkspace();
});
el.btnOpenBilling.addEventListener("click", showBillingDashboard);
el.btnBillingBack.addEventListener("click", closeBillingDashboard);
el.btnBillingClocking.addEventListener("click", async () => {
  await bootWorkspace();
});
el.btnBackToPortfolio.addEventListener("click", async () => {
  await showPortfolioDashboard();
});
el.btnOpenEmployeeDashboard.addEventListener("click", async () => {
  await showEmployeeDashboard("clocking");
});
el.btnCompanyAdminPortfolio.addEventListener("click", async () => {
  await showPortfolioDashboard();
});
el.btnCompanyAdminEmployeeDashboard.addEventListener("click", async () => {
  await showEmployeeDashboard("company");
});
el.btnUploadCompanyLogo.addEventListener("click", () => {
  el.companyLogoInput.click();
});
el.companyLogoInput.addEventListener("change", uploadCompanyLogo);
el.btnEmployeePortfolio.addEventListener("click", async () => {
  await showPortfolioDashboard();
});
el.btnEmployeeBack.addEventListener("click", closeEmployeeDashboard);
el.btnRunEmployeeDashboard.addEventListener("click", loadEmployeeDashboard);
el.btnEmployeePayslip.addEventListener("click", generateEmployeeDashboardPayslip);
el.btnBackToCompanyDashboard.addEventListener("click", async () => {
  await showCompanyAdminDashboard();
});
el.btnCompanyAdminSwitch.addEventListener("click", openCompanySwitchModal);
el.btnCloseCompanySwitch.addEventListener("click", closeCompanySwitchModal);
el.companySwitchModal.addEventListener("click", (event) => {
  if (event.target === el.companySwitchModal) closeCompanySwitchModal();
});
el.companyEmployeePayType.addEventListener("change", updateEmployeeRatePlaceholder);
el.btnToggleEmployeeForm.addEventListener("click", () => {
  const opening = el.employeeFormBox.hidden;
  if (opening) {
    editingEmployeeId = null;
    el.companyEmployeeId.value = nextEmployeeId();
    el.companyEmployeeId.readOnly = false;
    el.companyEmployeeName.value = "";
    el.companyEmployeeIdNumber.value = "";
    el.companyEmployeePayType.value = "hourly";
    el.companyEmployeeRate.value = "";
    updateEmployeeRatePlaceholder();
    el.companyEmployeeEmploymentDate.value = localDateInputValue(new Date());
    el.companyEmployeePayCycle.value = "fortnightly";
    el.companyEmployeeNbceiDesignation.value = "";
    el.companyEmployeeSbfMember.value = "";
    el.companyEmployeeSaewaMember.value = "";
    el.companyEmployeeActive.value = "true";
    el.btnSaveEmployee.textContent = "Save Employee";
  }
  showEmployeeForm(opening);
});
el.btnToggleSiteForm.addEventListener("click", () => {
  const opening = el.siteFormBox.hidden;
  if (opening) {
    editingSiteId = null;
    el.companySiteId.value = nextSiteId();
    el.companySiteId.readOnly = false;
    el.companySiteName.value = "";
    el.companySiteLat.value = "";
    el.companySiteLon.value = "";
    el.companySiteRadius.value = "200";
    el.companySiteActive.value = "true";
    el.btnSaveCompanySite.textContent = "Save Site";
  }
  showSiteForm(opening);
});
el.btnToggleSupervisorForm.addEventListener("click", () => {
  const opening = el.supervisorFormBox.hidden;
  if (opening) {
    editingSupervisorId = null;
    el.companySupervisorId.value = nextSupervisorId();
    el.companySupervisorId.readOnly = false;
    el.companySupervisorCode.value = "";
    populateSupervisorEmployeeSelect();
    el.companySupervisorActive.value = "true";
    el.btnSaveSupervisor.textContent = "Save Supervisor";
  }
  showSupervisorForm(opening);
});
el.companySupervisorEmployee.addEventListener("change", () => {
  syncSupervisorNameField();
  if (!el.companySupervisorName.hidden) {
    el.companySupervisorName.focus();
  }
});
el.companyEmployeeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveCompanyEmployee();
});
el.companySiteForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveCompanySite();
});
el.companySupervisorForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveCompanySupervisor();
});
el.btnToggleBillingClientForm.addEventListener("click", () => {
  const opening = el.billingClientFormBox.hidden;
  if (opening) {
    editingBillingClientId = null;
    el.billingClientForm.reset();
    el.billingClientActive.value = "true";
    el.btnSaveBillingClient.textContent = "Save Client";
  }
  showBillingClientForm(opening);
});
el.btnToggleBillingItemForm.addEventListener("click", () => {
  const opening = el.billingItemFormBox.hidden;
  if (opening) {
    editingBillingItemId = null;
    el.billingItemForm.reset();
    el.billingItemCode.value = nextBillingItemCode();
    el.billingItemUnit.value = "item";
    el.billingItemVatType.value = "standard";
    el.billingItemActive.value = "true";
    el.btnSaveBillingItem.textContent = "Save Item";
  }
  showBillingItemForm(opening);
});
el.btnToggleArchivedBillingItems.addEventListener("click", () => {
  showArchivedBillingItems = !showArchivedBillingItems;
  renderBillingData();
});
el.btnToggleBillingInvoiceDateFilter.addEventListener("click", () => {
  const opening = el.billingInvoiceDateFilterBox.hidden;
  if (opening) {
    const currentMonth = localDateInputValue(new Date()).slice(0, 7);
    el.billingInvoiceDateMode.value = billingInvoiceDateFilter?.mode || "month";
    el.billingInvoiceMonth.value = billingInvoiceDateFilter?.mode === "month"
      ? billingInvoiceDateFilter.start.slice(0, 7)
      : currentMonth;
    el.billingInvoiceDateStart.value = billingInvoiceDateFilter?.start || `${currentMonth}-01`;
    el.billingInvoiceDateEnd.value = billingInvoiceDateFilter?.end || localDateInputValue(new Date());
    syncBillingInvoiceDateFilterFields();
  }
  setBillingInvoiceDateFilterOpen(opening);
});
el.btnCloseBillingInvoiceDateFilter.addEventListener("click", () => setBillingInvoiceDateFilterOpen(false));
el.btnBillingInvoiceDateModeMonth.addEventListener("click", () => setBillingInvoiceDateMode("month"));
el.btnBillingInvoiceDateModeRange.addEventListener("click", () => setBillingInvoiceDateMode("range"));
el.btnBillingInvoicePreviousMonth.addEventListener("click", () => shiftBillingInvoiceFilterMonth(-1));
el.btnBillingInvoiceNextMonth.addEventListener("click", () => shiftBillingInvoiceFilterMonth(1));
el.billingInvoiceDateFilterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (el.billingInvoiceDateMode.value === "month") {
    const monthFilter = billingInvoiceMonthRange(el.billingInvoiceMonth.value);
    if (!monthFilter) return alert("Select an invoice month.");
    billingInvoiceDateFilter = monthFilter;
  } else {
    const start = el.billingInvoiceDateStart.value;
    const end = el.billingInvoiceDateEnd.value;
    if (!start || !end) return alert("Select both a start and end date.");
    if (start > end) return alert("The start date must be before the end date.");
    billingInvoiceDateFilter = {
      mode: "range",
      start,
      end,
      label: `${billingPeriodDateLabel(start)} to ${billingPeriodDateLabel(end)}`
    };
  }
  setBillingInvoiceDateFilterOpen(false);
  renderBillingData();
});
el.btnResetBillingInvoiceDateFilter.addEventListener("click", () => clearBillingInvoiceDateFilter());
el.btnClearBillingInvoiceDateFilter.addEventListener("click", () => clearBillingInvoiceDateFilter());
document.addEventListener("click", (event) => {
  if (
    !el.billingInvoiceDateFilterBox.hidden
    && !el.billingInvoiceDateFilterBox.contains(event.target)
    && !el.btnToggleBillingInvoiceDateFilter.contains(event.target)
  ) setBillingInvoiceDateFilterOpen(false);
});
el.btnToggleBillingQuoteForm.addEventListener("click", () => {
  const opening = el.billingQuoteFormBox.hidden;
  if (opening) resetBillingQuoteForm();
  showBillingQuoteForm(opening);
});
el.btnToggleBillingInvoiceForm.addEventListener("click", () => {
  const opening = el.billingInvoiceFormBox.hidden;
  if (opening) resetBillingInvoiceForm();
  showBillingInvoiceForm(opening);
});
el.btnToggleBillingRecurringForm.addEventListener("click", () => {
  const opening = el.billingRecurringFormBox.hidden;
  if (opening) resetBillingRecurringForm();
  showBillingRecurringForm(opening);
});
el.billingClientForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveBillingClient();
});
el.billingItemForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveBillingItem();
});
el.btnAddBillingQuoteLine.addEventListener("click", addBillingQuoteLine);
el.btnAddBillingManualInvoiceLine.addEventListener("click", addBillingInvoiceLine);
el.btnAddBillingRecurringLine.addEventListener("click", addBillingRecurringLine);
el.billingQuoteItemSelect.addEventListener("change", () => updateBillingManualLineFields("quote"));
el.billingQuoteClient.addEventListener("change", updateBillingManualClientField);
el.billingManualInvoiceItemSelect.addEventListener("change", () => updateBillingManualLineFields("invoice"));
el.billingRecurringItemSelect.addEventListener("change", updateBillingRecurringManualFields);
el.billingQuoteLineList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-quote-line]");
  if (!button) return;
  const index = Number(button.getAttribute("data-remove-quote-line"));
  if (Number.isInteger(index)) {
    billingQuoteLines.splice(index, 1);
    renderBillingQuoteLines();
  }
});
el.billingManualInvoiceLineList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-invoice-line]");
  if (!button) return;
  const index = Number(button.getAttribute("data-remove-invoice-line"));
  if (Number.isInteger(index)) {
    billingInvoiceLines.splice(index, 1);
    renderBillingInvoiceLines();
  }
});
el.billingRecurringLineList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-recurring-line]");
  if (!button) return;
  const index = Number(button.getAttribute("data-remove-recurring-line"));
  if (Number.isInteger(index)) {
    billingRecurringLines.splice(index, 1);
    renderBillingRecurringLines();
  }
});
el.billingQuoteForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveBillingQuote();
});
el.billingInvoiceForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveBillingManualInvoice();
});
el.billingRecurringForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveBillingRecurringInvoice();
});
el.btnToggleBillingProfile.addEventListener("click", () => {
  const opening = el.billingProfileFormBox.hidden;
  el.billingProfileFormBox.hidden = !opening;
  setToggleButton(el.btnToggleBillingProfile, opening, "Edit document settings", "Close document settings");
  if (opening) populateBillingProfileForm();
});
el.billingProfileForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveBillingProfile();
});
el.btnCloseBillingAction.addEventListener("click", closeBillingActionModal);
el.billingActionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-billing-action]");
  if (button) handleBillingAction(button.dataset.billingAction);
});
el.btnCloseBillingPayment.addEventListener("click", closeBillingPaymentModal);
el.billingPaymentForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveBillingPayment();
});
el.btnCloseBillingInvoiceEdit.addEventListener("click", closeBillingInvoiceEdit);
el.billingInvoiceEditForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveBillingInvoiceEdit();
});
el.billingActionModal.addEventListener("click", (e) => { if (e.target === el.billingActionModal) closeBillingActionModal(); });
el.billingPaymentModal.addEventListener("click", (e) => { if (e.target === el.billingPaymentModal) closeBillingPaymentModal(); });
el.billingInvoiceEditModal.addEventListener("click", (e) => { if (e.target === el.billingInvoiceEditModal) closeBillingInvoiceEdit(); });
el.btnCloseSiteAction.addEventListener("click", closeSiteActionModal);
el.siteActionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-site-action]");
  if (button) handleSiteAction(button.getAttribute("data-site-action"));
});
el.siteActionModal.addEventListener("click", (event) => {
  if (event.target === el.siteActionModal) closeSiteActionModal();
});
el.newCompanyForm.addEventListener("submit", (e) => {
  e.preventDefault();
  createPlatformCompany();
});
el.btnToggleCompanyForm.addEventListener("click", () => {
  showCompanyForm(el.companyFormBox.hidden);
});
el.companyUserForm.addEventListener("submit", (e) => {
  e.preventDefault();
  addCompanyUser();
});
el.btnToggleCompanyUserForm.addEventListener("click", () => {
  showCompanyUserForm(el.companyUserFormBox.hidden);
});
el.companySelect.addEventListener("change", () => switchCompany(el.companySelect.value));

el.btnIn.addEventListener("click", () => setMode("IN"));
el.btnOut.addEventListener("click", () => setMode("OUT"));
el.btnTeamStatus.addEventListener("click", openTeamStatus);
el.btnCloseTeamStatus.addEventListener("click", closeTeamStatus);
el.teamStatusModal.addEventListener("click", (e) => {
  if (e.target === el.teamStatusModal) closeTeamStatus();
});

el.btnSite.addEventListener("click", () => toggleSitePicker());
el.siteSelect.addEventListener("change", () => {
  selectedSiteId = el.siteSelect.value;
  updateSiteName();
  updateSubmit();
  showSitePicker(false);
});

el.supCode.addEventListener("input", () => {
  el.supCode.value = el.supCode.value.toUpperCase().slice(0, 6);
  updateSubmit();
  checkAdminCodeDebounced();
});

el.btnClear.addEventListener("click", () => {
  queue.clear();
  renderQueue();
});

el.btnSubmit.addEventListener("click", submitBatch);

// Admin modal
el.btnAddSite.addEventListener("click", openSiteModal);
el.btnCloseModal.addEventListener("click", closeSiteModal);
el.siteModal.addEventListener("click", (e) => {
  if (e.target === el.siteModal) closeSiteModal();
});
el.btnSaveSite.addEventListener("click", saveNewSite);
el.employeeIdentityQrTab.addEventListener("click", () => setEmployeeIdentityTab("qr"));
el.employeeIdentityFaceTab.addEventListener("click", () => setEmployeeIdentityTab("face"));
el.btnEnrollFace.addEventListener("click", openFaceCapture);
el.btnRemoveFace.addEventListener("click", removeEmployeeFace);
el.btnCloseEmployeeQr.addEventListener("click", closeEmployeeQr);
el.employeeQrModal.addEventListener("click", (e) => {
  if (e.target === el.employeeQrModal) closeEmployeeQr();
});
el.btnCaptureFace.addEventListener("click", enrollEmployeeFace);
el.btnSwitchFaceCamera.addEventListener("click", switchFaceCaptureCamera);
el.btnCloseFaceCapture.addEventListener("click", closeFaceCapture);
el.faceCaptureModal.addEventListener("click", (e) => {
  if (e.target === el.faceCaptureModal) closeFaceCapture();
});
el.btnScanFace?.addEventListener("click", () => handleScannerModeButton("face"));
el.btnScanQr?.addEventListener("click", () => handleScannerModeButton("qr"));
el.eventTimeForm.addEventListener("submit", saveEventTime);
el.btnCloseEventTime.addEventListener("click", closeEventTimeEditor);
el.eventTimeModal.addEventListener("click", (e) => {
  if (e.target === el.eventTimeModal) closeEventTimeEditor();
});
el.btnClosePayrollBreakdown.addEventListener("click", closePayrollBreakdown);
el.btnViewTimesheet.addEventListener("click", openEmployeeTimesheet);
el.btnCloseTimesheet.addEventListener("click", closeEmployeeTimesheet);
el.btnCloseTimesheetIcon.addEventListener("click", closeEmployeeTimesheet);
el.btnPrintTimesheet.addEventListener("click", () => openTimesheetPrint(false));
el.btnDownloadTimesheet.addEventListener("click", () => openTimesheetPrint(true));
el.payrollBreakdownModal.addEventListener("click", (e) => {
  if (e.target === el.payrollBreakdownModal) closePayrollBreakdown();
});
el.timesheetModal.addEventListener("click", (e) => {
  if (e.target === el.timesheetModal) closeEmployeeTimesheet();
});
el.payrollDeductionsModal.addEventListener("click", (e) => {
  if (e.target === el.payrollDeductionsModal) closePayrollDeductions();
});
el.btnEditDeductions.addEventListener("click", toggleDeductionEditor);
el.deductionForm.addEventListener("submit", (e) => {
  e.preventDefault();
  savePayrollDeductions();
});
el.payslipModal.addEventListener("click", (e) => {
  if (e.target === el.payslipModal) closePayslipModal();
});

/***********************
 * INIT
 ***********************/
(async function init(){
  const cameFromInvite = isInviteCallbackUrl();
  showSignedOut();

  if (!sb) {
    setAuthError("Test Supabase is not connected yet. Paste the new project URL and anon key into public/config.js.");
    return;
  }

  const { data } = await sb.auth.getSession();
  if (!data.session?.user) {
    if (cameFromInvite) setAuthError("Invite link could not be opened. Please request a fresh invite.");
    return;
  }

  try {
    currentUser = data.session.user;
    if (cameFromInvite) {
      showPasswordSetup();
      return;
    }
    await routeCurrentUser();
  } catch (e) {
    console.error(e);
    showSignedOut();
    setAuthError(e.message || "Unable to load your workspace.");
  }
})();
