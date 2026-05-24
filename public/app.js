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
let employeeDashboardReturn = "clocking";
let platformCompanies = [];
let selectedPlatformCompanyId = "";
let companyAdminEmployees = [];
let companyAdminSites = [];
let companyAdminSupervisors = [];
let companyAdminEvents = [];
let payrollRows = [];
let employeeDashboardPayslipRow = null;
let editingEvent = null;
let editingEmployeeId = null;
let editingSiteId = null;
let editingSupervisorId = null;
let isPasswordSetupMode = false;

let mode = "IN";        // "IN" | "OUT"
let sites = [];
let selectedSiteId = "";

let scanning = false;
let qr = null;

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
  companyAdminShell: $("companyAdminShell"),
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
  btnOpenEmployeeDashboard: $("btnOpenEmployeeDashboard"),
  btnPlatformLogout: $("btnPlatformLogout"),
  btnCompanyAdminLogout: $("btnCompanyAdminLogout"),
  btnCompanyAdminEmployeeDashboard: $("btnCompanyAdminEmployeeDashboard"),
  btnEmployeeLogout: $("btnEmployeeLogout"),
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
  companyAdminSelect: $("companyAdminSelect"),
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
  companySupervisorForm: $("companySupervisorForm"),
  companySupervisorId: $("companySupervisorId"),
  companySupervisorCode: $("companySupervisorCode"),
  companySupervisorEmployee: $("companySupervisorEmployee"),
  companySupervisorName: $("companySupervisorName"),
  companySupervisorActive: $("companySupervisorActive"),
  btnSaveSupervisor: $("btnSaveSupervisor"),
  companySupervisorList: $("companySupervisorList"),
  companyAdminEventsBody: $("companyAdminEventsBody"),
  btnExportCompanyEvents: $("btnExportCompanyEvents"),
  payrollStartDate: $("payrollStartDate"),
  payrollEndDate: $("payrollEndDate"),
  btnRunPayroll: $("btnRunPayroll"),
  btnExportPayroll: $("btnExportPayroll"),
  payrollTotalHours: $("payrollTotalHours"),
  payrollTotalGross: $("payrollTotalGross"),
  payrollBody: $("payrollBody"),
  employeeQrModal: $("employeeQrModal"),
  employeeQrName: $("employeeQrName"),
  employeeQrId: $("employeeQrId"),
  employeeQrBox: $("employeeQrBox"),
  btnCloseEmployeeQr: $("btnCloseEmployeeQr"),
  eventTimeModal: $("eventTimeModal"),
  eventTimeForm: $("eventTimeForm"),
  eventTimeEmployee: $("eventTimeEmployee"),
  eventTimeSite: $("eventTimeSite"),
  eventTimeAction: $("eventTimeAction"),
  eventTimeDate: $("eventTimeDate"),
  eventTimeTime: $("eventTimeTime"),
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
  payslipModal: $("payslipModal"),
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
  editingEvent = null;
  selectedPlatformCompanyId = "";
  currentCompanyId = "";
  currentCompanyName = "";
  currentCompanyRole = "";
  currentCompanyEmployeeId = "";
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
  el.companyAdminShell.hidden = true;
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
  el.companyAdminShell.hidden = true;
  el.newPassword.value = "";
  el.confirmPassword.value = "";
  setTimeout(() => el.newPassword.focus(), 0);
}

function showSignedIn() {
  isPasswordSetupMode = false;
  el.authScreen.hidden = true;
  el.platformShell.hidden = true;
  el.companyAdminShell.hidden = true;
  el.employeeShell.hidden = true;
  el.appShell.hidden = false;
  el.companyLabel.textContent = currentCompanyName || "Company workspace";
  el.userLabel.textContent = currentUser?.email || "Signed in";
  el.btnBackToCompanyDashboard.hidden = !canUseCompanyDashboard();
  el.btnOpenEmployeeDashboard.hidden = !canUseEmployeeDashboard();
}

async function showPlatformDashboard() {
  await stopScanning();
  el.authScreen.hidden = true;
  el.appShell.hidden = true;
  el.companyAdminShell.hidden = true;
  el.employeeShell.hidden = true;
  el.platformShell.hidden = false;
  el.platformUserLabel.textContent = currentUser?.email || "Platform admin";
  await loadPlatformCompanies();
}

async function showCompanyAdminDashboard() {
  await stopScanning();
  el.authScreen.hidden = true;
  el.appShell.hidden = true;
  el.platformShell.hidden = true;
  el.employeeShell.hidden = true;
  el.companyAdminShell.hidden = false;
  el.companyAdminUserLabel.textContent = currentUser?.email || "Company admin";
  el.btnCompanyAdminEmployeeDashboard.hidden = !canUseEmployeeDashboard();
  setDefaultPayrollDates();
  populateCompanyAdminSelect();
  await loadCompanyAdminDetail();
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
  el.companyAdminShell.hidden = true;
  el.employeeShell.hidden = false;
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
      { data: events, error: eventError }
    ] = await Promise.all([
      fetchEmployeeForDashboard(company.id, employeeId),
      sb.from("clock_events")
        .select("entry_id,company_id,created_at,action,employee_id,employee_name,site_id,site_name,result,message")
        .eq(COMPANY_ID_COL, company.id)
        .eq("employee_id", employeeId)
        .gte("created_at", dateStartIso(start))
        .lte("created_at", dateEndIso(end))
        .order("created_at", { ascending: false })
    ]);
    if (employeeError) throw employeeError;
    if (eventError) throw eventError;
    if (!employee) throw new Error(`Employee ${employeeId} was not found.`);

    const payroll = calculatePayroll(events || [], [employee])[0] || {
      employee_id: employeeId,
      employee_name: employee.full_name || "",
      hours: 0,
      gross: Number(employee.rate || 0),
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
    .select("employee_id,full_name,id_number,employment_date,rate,pay_type,pay_cycle,active")
    .eq(COMPANY_ID_COL, companyId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (!withDetails.error) return withDetails;
  if (!/(id_number|employment_date|rate|pay_type|pay_cycle)/i.test(withDetails.error.message || "")) return withDetails;

  console.warn("Employee dashboard columns not found yet. Falling back:", withDetails.error.message);
  return sb.from("employees")
    .select("employee_id,full_name,active")
    .eq(COMPANY_ID_COL, companyId)
    .eq("employee_id", employeeId)
    .maybeSingle();
}

async function closeEmployeeDashboard() {
  if (employeeDashboardReturn === "company") await showCompanyAdminDashboard();
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
    showSignedOut();
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
  if (canUseCompanyDashboard()) {
    await showCompanyAdminDashboard();
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
  if (!currentUser) throw new Error("Sign in required.");

  let { data: memberships, error: membershipError } = await sb
    .from(COMPANY_USERS_TABLE)
    .select(`${COMPANY_USERS_COMPANY_COL},${COMPANY_USERS_ROLE_COL},${COMPANY_USERS_ACTIVE_COL},employee_id`)
    .eq(COMPANY_USERS_USER_COL, currentUser.id)
    .eq(COMPANY_USERS_ACTIVE_COL, true);

  if (membershipError && /employee_id/i.test(membershipError.message || "")) {
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
    .select("id,name,plan,status,logo_url")
    .in("id", ids)
    .eq("status", "active")
    .order("name", { ascending: true });

  if (companyError && /logo_url/i.test(companyError.message || "")) {
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
    employee_id: membershipByCompany.get(String(c.id))?.employee_id || ""
  }));

  if (!currentCompanyId || !companies.some(c => c.id === currentCompanyId)) {
    currentCompanyId = companies[0].id;
  }
  currentCompanyName = companies.find(c => c.id === currentCompanyId)?.name || "";
  currentCompanyRole = companies.find(c => c.id === currentCompanyId)?.role || "";
  currentCompanyEmployeeId = companies.find(c => c.id === currentCompanyId)?.employee_id || "";
  populateCompanySelect();
}

function canUseCompanyDashboard() {
  return ["owner", "admin"].includes(String(currentCompanyRole || "").toLowerCase());
}

function canUseClocking() {
  return ["owner", "admin", "supervisor"].includes(String(currentCompanyRole || "").toLowerCase());
}

function canUseEmployeeDashboard() {
  return !!String(currentCompanyEmployeeId || "").trim();
}

function isEmployeeOnly() {
  return String(currentCompanyRole || "").toLowerCase() === "employee";
}

async function switchCompany(companyId) {
  if (!companies.some(c => c.id === companyId)) return;
  currentCompanyId = companyId;
  currentCompanyName = companies.find(c => c.id === currentCompanyId)?.name || "";
  currentCompanyRole = companies.find(c => c.id === currentCompanyId)?.role || "";
  currentCompanyEmployeeId = companies.find(c => c.id === currentCompanyId)?.employee_id || "";
  selectedSiteId = "";
  queue.clear();
  renderQueue();
  showSignedIn();
  await loadSites();
}

function populateCompanyAdminSelect() {
  el.companyAdminSelect.innerHTML = "";
  for (const c of companies.filter(x => ["owner", "admin"].includes(String(x.role || "").toLowerCase()))) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    el.companyAdminSelect.appendChild(opt);
  }
  el.companyAdminSelect.value = currentCompanyId;
  el.companyAdminSelect.hidden = el.companyAdminSelect.options.length <= 1;
}

async function switchCompanyAdmin(companyId) {
  const company = companies.find(c => c.id === companyId);
  if (!company) return;
  currentCompanyId = company.id;
  currentCompanyName = company.name || "";
  currentCompanyRole = company.role || "";
  currentCompanyEmployeeId = company.employee_id || "";
  selectedSiteId = "";
  queue.clear();
  el.btnCompanyAdminEmployeeDashboard.hidden = !canUseEmployeeDashboard();
  populateCompanyAdminSelect();
  await loadCompanyAdminDetail();
}

async function bootWorkspace() {
  showSignedIn();
  renderQueue();
  await loadSites();
  await startScanning();
  checkAdminCodeDebounced();
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
    const resultClass = result === "OK" ? "resultOk" : "resultBlocked";
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
        <button class="detailToggle ${resultClass}" type="button">${escapeHtml(result || "")}</button>
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

function payrollCsvFileName(company) {
  const slug = String(company?.slug || company?.name || "company").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "company";
  const start = el.payrollStartDate?.value || "start";
  const end = el.payrollEndDate?.value || "end";
  return `${slug}-payroll-${start}-to-${end}.csv`;
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

function normalThresholdHours(payCycle) {
  if (payCycle === "weekly") return 45;
  if (payCycle === "monthly") return 195;
  return 90;
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

function buildPayrollBreakdown(employee, employeeEvents) {
  const payType = String(employee.pay_type || "hourly").toLowerCase();
  const payCycle = String(employee.pay_cycle || "fortnightly").toLowerCase();
  const rate = Number(employee.rate || 0);
  const safeRate = Number.isFinite(rate) ? rate : 0;
  const breakdown = {
    normalHours: 0,
    ot1Hours: 0,
    ot2Hours: 0,
    holidayTopupHours: 0,
    normalPay: 0,
    ot1Pay: 0,
    ot2Pay: 0,
    gross: payType === "monthly" ? safeRate : 0,
    totalHours: 0,
    sundayHours: 0,
    publicHolidayWorkedHours: 0
  };

  let pendingIn = null;
  let invalidSequence = 0;
  const regularParts = [];
  const publicHolidayWorked = new Map();

  for (const event of employeeEvents) {
    const action = String(event.action || "").toUpperCase();
    const eventTime = new Date(event.created_at);
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
      const inTime = new Date(pendingIn.created_at);
      if (eventTime <= inTime) {
        invalidSequence += 1;
        pendingIn = null;
        continue;
      }

      for (const part of splitShiftByDay(inTime, eventTime)) {
        const key = dateKey(part.date);
        const day = part.date.getDay();
        breakdown.totalHours += part.hours;
        if (isPublicHoliday(part.date)) {
          breakdown.ot2Hours += part.hours;
          breakdown.publicHolidayWorkedHours += part.hours;
          publicHolidayWorked.set(key, (publicHolidayWorked.get(key) || 0) + part.hours);
        } else if (day === 0) {
          breakdown.ot2Hours += part.hours;
          breakdown.sundayHours += part.hours;
        } else {
          regularParts.push(part);
        }
      }
      pendingIn = null;
    }
  }

  const missingClockOut = pendingIn ? 1 : 0;

  if (payType !== "monthly") {
    for (const holiday of datesInRange(el.payrollStartDate.value, el.payrollEndDate.value)) {
      if (!isPublicHoliday(holiday)) continue;
      const worked = publicHolidayWorked.get(dateKey(holiday)) || 0;
      const topup = Math.max(0, 8 - worked);
      breakdown.holidayTopupHours += topup;
      breakdown.normalHours += topup;
      breakdown.totalHours += topup;
    }

    const threshold = normalThresholdHours(payCycle);
    for (const part of regularParts) {
      const normalRoom = Math.max(0, threshold - breakdown.normalHours);
      const normal = Math.min(part.hours, normalRoom);
      const ot1 = Math.max(0, part.hours - normal);
      breakdown.normalHours += normal;
      breakdown.ot1Hours += ot1;
    }

    breakdown.normalPay = breakdown.normalHours * safeRate;
    breakdown.ot1Pay = breakdown.ot1Hours * safeRate * 1.5;
    breakdown.ot2Pay = breakdown.ot2Hours * safeRate * 2;
    breakdown.gross = breakdown.normalPay + breakdown.ot1Pay + breakdown.ot2Pay;
  }

  return {
    ...breakdown,
    missingClockOut,
    invalidSequence,
    exceptionCount: missingClockOut + invalidSequence
  };
}

function calculatePayroll(events, employees) {
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
      employeeEvents
    );
    rows.push({
      employee_id: employeeId,
      employee_name: employee.full_name || employeeEvents[0]?.employee_name || "",
      id_number: employee.id_number || "",
      employment_date: employee.employment_date || "",
      pay_type: payType,
      pay_cycle: payCycle,
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
  const totalGross = payrollRows.reduce((sum, row) => sum + row.gross, 0);

  el.payrollTotalHours.textContent = formatHours(totalHours);
  el.payrollTotalGross.textContent = formatMoney(totalGross);
  el.payrollBody.innerHTML = "";

  if (payrollRows.length === 0) {
    el.payrollBody.innerHTML = `<tr><td colspan="4" class="mutedText">No employees found for this company.</td></tr>`;
    return;
  }

  for (const row of payrollRows) {
    const rateLabel = row.pay_type === "monthly" ? `${formatMoney(row.rate)}/mo` : `${formatMoney(row.rate)}/hr`;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <b>${escapeHtml(row.employee_id)}</b><br/>
        <span class="mutedText">${escapeHtml(row.employee_name || "")}</span>
      </td>
      <td><button class="payrollHoursBtn" type="button" data-payroll-employee="${escapeHtml(row.employee_id)}">${escapeHtml(formatHours(row.hours))}</button></td>
      <td>${escapeHtml(rateLabel)}</td>
      <td>${escapeHtml(formatMoney(row.gross))}</td>
    `;
    el.payrollBody.appendChild(tr);
  }

  el.payrollBody.querySelectorAll("[data-payroll-employee]").forEach((button) => {
    button.addEventListener("click", () => openPayrollBreakdown(button.getAttribute("data-payroll-employee")));
  });
}

function openPayrollBreakdown(employeeId) {
  const row = payrollRows.find((item) => String(item.employee_id) === String(employeeId));
  if (!row) return;
  const b = row.breakdown || {};
  el.payrollBreakdownEmployee.textContent = `${row.employee_id} - ${row.employee_name || "Employee"}`;
  el.breakdownNormalHours.textContent = `${formatHours(b.normalHours)} hrs`;
  el.breakdownNormalPay.textContent = formatMoney(b.normalPay);
  el.breakdownOt1Hours.textContent = `${formatHours(b.ot1Hours)} hrs`;
  el.breakdownOt1Pay.textContent = formatMoney(b.ot1Pay);
  el.breakdownOt2Hours.textContent = `${formatHours(b.ot2Hours)} hrs`;
  el.breakdownOt2Pay.textContent = formatMoney(b.ot2Pay);
  el.breakdownHolidayHours.textContent = `${formatHours(b.holidayTopupHours)} hrs`;
  el.breakdownTotalHours.textContent = `${formatHours(b.totalHours)} hrs`;
  el.breakdownTotalPay.textContent = formatMoney(b.gross);
  el.payrollBreakdownModal.classList.add("show");
  el.payrollBreakdownModal.setAttribute("aria-hidden", "false");
}

function closePayrollBreakdown() {
  el.payrollBreakdownModal.classList.remove("show");
  el.payrollBreakdownModal.setAttribute("aria-hidden", "true");
}

function openPayslipModal() {
  if (!payrollRows.length) return alert("Run payroll before generating a payslip.");
  el.payslipEmployeeSelect.innerHTML = [
    `<option value="__all__">All employees (${payrollRows.length} payslips)</option>`,
    ...payrollRows.map((row) => (
    `<option value="${escapeHtml(row.employee_id)}">${escapeHtml(row.employee_id)} - ${escapeHtml(row.employee_name || "Employee")} (${escapeHtml(formatMoney(row.gross))})</option>`
    ))
  ].join("");
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

function payslipHours(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && Math.abs(number) > 0.004 ? formatHours(number) : "0.00";
}

function payslipEarningLine(description, rate, hours, amount) {
  return `<tr>
    <td>${escapeHtml(description || "")}</td>
    <td>${payslipHours(hours)}</td>
    <td>R ${payslipAmount(rate)}</td>
    <td>R ${payslipAmount(amount)}</td>
  </tr>`;
}

function payslipDeductionLine(description, amount = 0) {
  return `<tr>
    <td>${escapeHtml(description || "")}</td>
    <td>R ${payslipAmount(amount)}</td>
  </tr>`;
}

function generateSelectedPayslip() {
  const employeeId = el.payslipEmployeeSelect.value;
  const company = currentCompany();
  const rows = employeeId === "__all__"
    ? payrollRows
    : payrollRows.filter((item) => String(item.employee_id) === String(employeeId));
  if (!company || !rows.length) return alert("Choose an employee first.");

  const win = window.open("", "_blank");
  if (!win) return alert("Allow popups for this site so Shiftly can open the payslip.");
  win.document.open();
  win.document.write(buildPayslipDocument(company, rows, {
    start: el.payrollStartDate.value,
    end: el.payrollEndDate.value
  }));
  win.document.close();
  closePayslipModal();
}

function buildPayslipPage(company, row, period) {
  const b = row.breakdown || {};
  const rate = Number(row.rate || 0);
  const isMonthly = row.pay_type === "monthly";
  const publicHolidayWorkedHours = Number(b.publicHolidayWorkedHours || 0);
  const normalHours = isMonthly ? 0 : Number(b.normalHours || 0);
  const normalPay = isMonthly ? Number(row.gross || 0) : Number(b.normalPay || 0);
  const ot1Hours = Number(b.ot1Hours || 0);
  const ot1Pay = ot1Hours * rate * 1.5;
  const sundayHours = Number(b.sundayHours || 0);
  const sundayPay = sundayHours * rate * 2;
  const holidayHours = publicHolidayWorkedHours;
  const holidayPay = publicHolidayWorkedHours * rate * 2;
  const totalEarnings = Number(row.gross || 0);
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
        </div>
      </section>

      <section class="moneyGrid">
        <div class="box">
          <div class="boxTitle">Earnings</div>
          <table class="earnings">
            <thead><tr><th>Description</th><th>Hours</th><th>Rate</th><th>Amount</th></tr></thead>
            <tbody>
              ${payslipEarningLine(isMonthly ? "Monthly Salary" : "Normal Hours", rate, normalHours, normalPay)}
              ${payslipEarningLine("OT1 1.5x", rate * 1.5, ot1Hours, ot1Pay)}
              ${payslipEarningLine("OT2 2x", rate * 2, sundayHours, sundayPay)}
              ${payslipEarningLine("Public Holiday", rate * 2, holidayHours, holidayPay)}
            </tbody>
          </table>
        </div>
        <div class="box">
          <div class="boxTitle">Deductions</div>
          <table class="deductions">
            <thead><tr><th>Description</th><th>Amount</th></tr></thead>
            <tbody>
              ${payslipDeductionLine("Tax")}
              ${payslipDeductionLine("UIF")}
              ${payslipDeductionLine("Leave")}
              ${payslipDeductionLine("Tools / PPE")}
              ${payslipDeductionLine("Fine")}
              ${payslipDeductionLine("Loan")}
            </tbody>
          </table>
        </div>
      </section>

      <section class="summary">
        <div class="summaryRow"><span>Total Earnings</span><b>R ${payslipAmount(totalEarnings)}</b></div>
        <div class="summaryRow"><span>Total Deductions</span><b>R -</b></div>
        <div class="summaryRow"><span>Net Pay</span><b>R ${payslipAmount(totalEarnings)}</b></div>
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

  el.btnRunPayroll.disabled = true;
  el.btnRunPayroll.textContent = "Running...";
  try {
    const { data, error } = await sb.from("clock_events")
      .select("entry_id,created_at,action,employee_id,employee_name,result,message")
      .eq(COMPANY_ID_COL, company.id)
      .gte("created_at", dateStartIso(start))
      .lte("created_at", dateEndIso(end))
      .order("created_at", { ascending: true });
    if (error) throw error;
    renderPayrollRows(calculatePayroll(data || [], companyAdminEmployees));
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
    "gross_pay",
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
    row.gross.toFixed(2),
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
      <td>${escapeHtml(capitalizeWord(user.role || ""))}${user.employee_id ? `<br/><span class="mutedText">${escapeHtml(user.employee_id)}</span>` : ""}</td>
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

function nextEmployeeId() {
  const highest = companyAdminEmployees.reduce((max, employee) => {
    const match = String(employee.employee_id || "").trim().toUpperCase().match(/^E(\d+)$/);
    if (!match) return max;
    return Math.max(max, Number(match[1]) || 0);
  }, 0);
  return `E${String(highest + 1).padStart(3, "0")}`;
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
  button.classList.toggle("active", !!on);
  button.innerHTML = on ? `<i class="ph ph-x"></i>` : `<i class="ph ph-plus"></i>`;
  button.setAttribute("aria-label", on ? closeLabel : openLabel);
  button.title = on ? "Close" : openLabel.replace(/^Add /, "Add ");
}

function updateEmployeeRatePlaceholder() {
  const payType = String(el.companyEmployeePayType.value || "hourly").toLowerCase();
  el.companyEmployeeRate.placeholder = payType === "monthly" ? "Monthly salary" : "Hourly rate";
  if (payType === "monthly" && el.companyEmployeePayCycle.value !== "monthly") {
    el.companyEmployeePayCycle.value = "monthly";
  }
}

function showEmployeeForm(show) {
  const on = !!show;
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
    .select("user_id,email,full_name,role,employee_id,active")
    .eq(COMPANY_ID_COL, companyId)
    .eq("active", true)
    .order("full_name", { ascending: true });

  if (usersError && /employee_id/i.test(usersError.message || "")) {
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
  return payType === "monthly" ? `Salary R${amount}/month` : `Rate R${amount}/hr`;
}

async function fetchCompanyEmployees(companyId) {
  const withRate = await sb.from("employees")
    .select("employee_id,full_name,id_number,employment_date,rate,pay_type,pay_cycle,active")
    .eq(COMPANY_ID_COL, companyId)
    .order("employee_id", { ascending: true });

  if (!withRate.error) return withRate;
  if (!/(rate|pay_type|pay_cycle|id_number|employment_date)/i.test(withRate.error.message || "")) return withRate;

  console.warn("Employee extra columns not found yet. Falling back:", withRate.error.message);
  return sb.from("employees")
    .select("employee_id,full_name,active")
    .eq(COMPANY_ID_COL, companyId)
    .order("employee_id", { ascending: true });
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

async function toggleCompanyRecordActive(type, id, active) {
  const company = currentCompany();
  if (!company) return alert("Select a company first.");

  const config = {
    employee: { table: "employees", idColumn: "employee_id", label: "employee" },
    site: { table: SITES_TABLE, idColumn: "site_id", label: "site" },
    supervisor: { table: "supervisors", idColumn: "supervisor_id", label: "supervisor" }
  }[type];
  if (!config || !id) return;

  const action = active ? "activate" : "deactivate";
  if (!confirm(`Are you sure you want to ${action} this ${config.label}?`)) return;

  const { error } = await sb
    .from(config.table)
    .update({ active })
    .eq(COMPANY_ID_COL, company.id)
    .eq(config.idColumn, id);

  if (error) return alert(`Failed to ${action} ${config.label}: ${error.message}`);
  await loadCompanyAdminDetail();
}

function bindEmployeeQrCards() {
  const cards = Array.from(el.companyEmployeeList.querySelectorAll(".compactItem"));
  cards.forEach((card, index) => {
    const employee = companyAdminEmployees[index];
    if (!employee) return;
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
    { data: eventRows, error: eventError }
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
      .order("created_at", { ascending: false })
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
        activeButton("site", site.site_id || "", site.active)
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

  el.employeeQrName.textContent = employee.full_name || "Employee";
  el.employeeQrId.textContent = qrValue;
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

function closeEmployeeQr() {
  el.employeeQrModal.classList.remove("show");
  el.employeeQrModal.setAttribute("aria-hidden", "true");
  el.employeeQrBox.innerHTML = "";
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
  el.eventTimeDate.value = toDateInputValue(date);
  el.eventTimeTime.value = toTimeInputValue(date);
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

  el.btnSaveEventTime.disabled = true;
  el.btnSaveEventTime.textContent = "Updating...";
  try {
    const { error } = await sb
      .from("clock_events")
      .update({ created_at: nextDate.toISOString() })
      .eq(COMPANY_ID_COL, company.id)
      .eq("entry_id", editingEvent.entry_id);

    if (error) return alert("Failed to update time: " + error.message);
    closeEventTimeEditor();
    await loadCompanyAdminDetail();
  } finally {
    el.btnSaveEventTime.disabled = false;
    el.btnSaveEventTime.textContent = "Update Time";
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
  const rateValue = el.companyEmployeeRate.value.trim();
  const employmentDate = el.companyEmployeeEmploymentDate.value || localDateInputValue(new Date());
  const active = el.companyEmployeeActive.value !== "false";
  if (!employeeId) return alert("Enter an employee ID.");
  if (!fullName) return alert("Enter the employee full name.");
  if (!["hourly", "monthly"].includes(payType)) return alert("Choose a valid pay type.");
  if (!["weekly", "fortnightly", "monthly"].includes(payCycle)) return alert("Choose a valid pay cycle.");
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
function ensureScanner(){
  if (!qr) qr = new Html5Qrcode("reader");
}

async function onScanSuccess(txt) {
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
    alert("Employee not found");
    return;
  }

  queue.set(code, { id: data.employee_id, name: data.full_name });
  renderQueue();
  vibrate(35);
}

async function startScanning(){
  if (scanning) return;
  if (!currentUser || !currentCompanyId) return;
  scanning = true;
  ensureScanner();

  const config = { fps: 12 };

  try {
    await qr.start({ facingMode: { exact: "environment" } }, config, onScanSuccess);
    return;
  } catch {}
  try {
    await qr.start({ facingMode: "environment" }, config, onScanSuccess);
    return;
  } catch (e) {
    console.error("Camera failed:", e);
    scanning = false;
    alert("Camera permission needed. Allow camera for this site, then refresh.");
  }
}

async function stopScanning(){
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
el.btnCompanyAdminLogout.addEventListener("click", signOut);
el.btnEmployeeLogout.addEventListener("click", signOut);
el.btnExportCompanyEvents.addEventListener("click", exportCompanyClockEvents);
el.btnRunPayroll.addEventListener("click", () => runPayrollReport(false));
el.btnExportPayroll.addEventListener("click", openPayslipModal);
el.btnGeneratePayslip.addEventListener("click", generateSelectedPayslip);
el.btnClosePayslip.addEventListener("click", closePayslipModal);
el.btnOpenClocking.addEventListener("click", async () => {
  await bootWorkspace();
});
el.btnOpenEmployeeDashboard.addEventListener("click", async () => {
  await showEmployeeDashboard("clocking");
});
el.btnCompanyAdminEmployeeDashboard.addEventListener("click", async () => {
  await showEmployeeDashboard("company");
});
el.btnUploadCompanyLogo.addEventListener("click", () => {
  el.companyLogoInput.click();
});
el.companyLogoInput.addEventListener("change", uploadCompanyLogo);
el.btnEmployeeBack.addEventListener("click", closeEmployeeDashboard);
el.btnRunEmployeeDashboard.addEventListener("click", loadEmployeeDashboard);
el.btnEmployeePayslip.addEventListener("click", generateEmployeeDashboardPayslip);
el.btnBackToCompanyDashboard.addEventListener("click", async () => {
  await showCompanyAdminDashboard();
});
el.companyAdminSelect.addEventListener("change", () => switchCompanyAdmin(el.companyAdminSelect.value));
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
el.btnCloseEmployeeQr.addEventListener("click", closeEmployeeQr);
el.employeeQrModal.addEventListener("click", (e) => {
  if (e.target === el.employeeQrModal) closeEmployeeQr();
});
el.eventTimeForm.addEventListener("submit", saveEventTime);
el.btnCloseEventTime.addEventListener("click", closeEventTimeEditor);
el.eventTimeModal.addEventListener("click", (e) => {
  if (e.target === el.eventTimeModal) closeEventTimeEditor();
});
el.btnClosePayrollBreakdown.addEventListener("click", closePayrollBreakdown);
el.payrollBreakdownModal.addEventListener("click", (e) => {
  if (e.target === el.payrollBreakdownModal) closePayrollBreakdown();
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
    await sb.auth.signOut();
    showSignedOut();
    setAuthError(e.message || "Unable to load your workspace.");
  }
})();
