/* Shared Shiftly payroll engine. Browser and trusted server use this exact module. */
(function(root,factory){ const api=factory(); if(typeof module==='object'&&module.exports)module.exports=api; else root.ShiftlyPayrollEngine=api; })(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
// Payroll wall-clock rules are South African, independent of the server's TZ.
const NativeDate=globalThis.Date;
class Date extends NativeDate {
 constructor(...args){
  if(args.length>1)super(NativeDate.UTC(...args)-7200000);
  else if(typeof args[0]==='string'&&/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?$/.test(args[0]))super(args[0].includes('T')?args[0]+'+02:00':args[0]+'T00:00:00+02:00');
  else if(args.length)super(args[0]);else super();
 }
 wall(){return new NativeDate(this.getTime()+7200000)}
 getFullYear(){return this.wall().getUTCFullYear()} getMonth(){return this.wall().getUTCMonth()} getDate(){return this.wall().getUTCDate()} getDay(){return this.wall().getUTCDay()}
 getHours(){return this.wall().getUTCHours()} getMinutes(){return this.wall().getUTCMinutes()} getSeconds(){return this.wall().getUTCSeconds()} getMilliseconds(){return this.wall().getUTCMilliseconds()}
 getTimezoneOffset(){return -120}
 setHours(...v){const d=this.wall();d.setUTCHours(...v);return this.setTime(d.getTime()-7200000)}
 setDate(v){const d=this.wall();d.setUTCDate(v);return this.setTime(d.getTime()-7200000)}
}
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


function create(context={}) {
const currentCompany=()=>context.company||null;
const companyPayrollRules=context.rules||{};
const companyAdminEmployees=context.employees||[];
const companyDeductionTypes=context.deductionTypes||[];
const activePayrollRules=()=>normalisePayrollRules(companyPayrollRules);
const payrollPeriodRange=()=>({start:context.start||'',end:context.end||''});
const el={payrollStartDate:{value:context.start||''},payrollEndDate:{value:context.end||''}};
const payrollTaxYearStart=value=>{const [y,m]=String(value).split('-').map(Number);return (m>=3?y:y-1)+'-03-01'};
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

function isTrElectricalCompany(company = currentCompany()) {
  return String(company?.id || "") === TR_ELECTRICAL_COMPANY_ID;
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

function payrollHourlyRateForPayType(payType, rate, rules) {
  const type = String(payType || "hourly").toLowerCase();
  if (type === "daily") return dailyHourlyRate(rate, rules);
  if (type === "monthly") return monthlyHourlyRate(rate, rules);
  return moneyNumber(rate);
}

function dailyHourlyRate(dayRate, rules) {
  const rate = Number(dayRate || 0);
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return rate / dailyStandardHours(rules);
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

function monthlyHourlyRate(monthlySalary, rules) {
  const salary = Number(monthlySalary || 0);
  const hours = Number(rules?.monthly_normal_hours || DEFAULT_PAYROLL_RULES.monthly_normal_hours || 195);
  if (!Number.isFinite(salary) || salary <= 0 || !Number.isFinite(hours) || hours <= 0) return 0;
  return salary / hours;
}

function moneyNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function payrollEventTime(event, rules) {
  const raw = String(event?.created_at || "");
  return new Date(raw);
}

function dateKey(date) {
  return localDateInputValue(date);
}

function localDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateAtPayrollMinutes(date, minutes) {
  const next = new Date(date);
  next.setHours(0, minutes, 0, 0);
  return next;
}

function normalThresholdHours(payCycle, rules = activePayrollRules()) {
  if (payCycle === "weekly") return rules.weekly_normal_hours;
  if (payCycle === "monthly") return rules.monthly_normal_hours;
  return rules.fortnightly_normal_hours;
}

function workWeekForDate(date, rules) {
  const day = WORK_WEEK_DAYS.find((item) => item.dayIndex === date.getDay());
  return day ? rules.work_week[day.key] : { normal_hours: rules.daily_normal_hours, rule: "threshold" };
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

function timeValueToMinutes(value) {
  const time = normaliseTimeValue(value);
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
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

function isPublicHoliday(date) {
  return SA_PUBLIC_HOLIDAYS_2026.has(dateKey(date));
}

function splitSegmentByDay(start, end, forcedRule = "") {
  return splitShiftByDay(start, end).map((part) => ({ ...part, forcedRule }));
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

function shouldApplyPublicHolidayTopup(date) {
  const companyId = String(currentCompany()?.id || "");
  return !(PVS_COMPANY_IDS.has(companyId) && date.getDay() === 0);
}

function normaliseNbceiDesignationCode(value) {
  const code = String(value || "").trim().toLowerCase();
  if (code === "none") return "none";
  return TR_ELECTRICAL_NBCEI_RATES[code] ? code : "";
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

function isStandardAdjustment(adjustment) {
  return STANDARD_ADJUSTMENT_FIELDS.some((field) => (
    String(adjustment.adjustment_type || "") === field.key
    || field.label.toLowerCase() === String(adjustment.description || "").toLowerCase()
  ));
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

function deductionAmountForField(deductions, field) {
  const labels = [field.label, ...(field.aliases || [])].map((label) => label.toLowerCase());
  return (deductions || [])
    .filter((item) => item.active && labels.includes(String(item.description || "").toLowerCase()))
    .reduce((sum, item) => sum + moneyNumber(item.amount), 0);
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

function periodCountForPayCycle(payCycle) {
  const cycle = String(payCycle || "fortnightly").toLowerCase();
  if (cycle === "weekly") return 52;
  if (cycle === "monthly") return 12;
  return 26;
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

function calculateAnnualTax2027(annualIncome) {
  const taxable = Math.max(0, moneyNumber(annualIncome));
  const bracket = SA_PAYE_2027.brackets.find((item) => taxable <= item.upTo) || SA_PAYE_2027.brackets[SA_PAYE_2027.brackets.length - 1];
  const taxBeforeRebate = bracket.base + Math.max(0, taxable - bracket.over) * bracket.rate;
  return Math.max(0, taxBeforeRebate - SA_PAYE_2027.primaryRebate);
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

function validatePayrollYtdContinuity(rows, ytdContext, periodEnd) {
  if (!ytdContext?.enabled) return;
  if (ytdContext.standardHistory && !ytdContext.preserveTrContinuity) return;
  const problems = [];
  const isTakeoverTaxYear = ytdContext.taxYearStart === "2026-03-01";
  for (const row of rows || []) {
    if (moneyNumber(row.rate) <= 0 && moneyNumber(row.gross) <= 0) continue;
    const context = payrollEmployeeYtdContext(ytdContext, row.employee_id);
    const employedBeforeTakeover = !row.employment_date
      || String(row.employment_date) < ytdContext.takeoverDate;
    if (!ytdContext.standardHistory && isTakeoverTaxYear && employedBeforeTakeover && !context.hasOpening) {
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

function expectedMonthlyPeriodsBefore(periodStart, taxYearStart) {
  const period = new Date(`${periodStart}T00:00:00`);
  const taxStart = new Date(`${taxYearStart}T00:00:00`);
  if (!Number.isFinite(period.getTime()) || !Number.isFinite(taxStart.getTime())) return 0;
  return Math.max(0, (period.getFullYear() - taxStart.getFullYear()) * 12 + period.getMonth() - taxStart.getMonth());
}

function previewPayrollLevyPeriod(company, start, end, weeks) {
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
    created_by: null
  };
  return payload;
}

function usesPayrollYtd(company, periodEnd) {
  const takeoverDate = payrollYtdTakeoverDate(company);
  return Boolean(takeoverDate && String(periodEnd || "") >= takeoverDate);
}

function payrollYtdTakeoverDate(company = currentCompany()) {
  return PAYROLL_YTD_TAKEOVER_DATES[String(company?.id || "")] || "";
}
return {calculatePayroll,normalisePayrollRules,normaliseWorkWeek,normaliseTimeValue,buildPayrollBreakdown,isTrElectricalCompany,buildTrElectricalPayrollBreakdown,payrollHourlyRateForPayType,dailyHourlyRate,dailyStandardHours,monthlyHourlyRate,moneyNumber,payrollEventTime,dateKey,localDateInputValue,dateAtPayrollMinutes,normalThresholdHours,workWeekForDate,buildMixocronDailyParts,timeValueToMinutes,mixocronWallEventTime,chooseMixocronDayTimes,isPublicHoliday,splitSegmentByDay,splitShiftByDay,addHoursByRule,buildShiftPartsForPayroll,allocateDailyThresholdOnly,datesInRange,shouldApplyPublicHolidayTopup,normaliseNbceiDesignationCode,attachAdjustmentsToPayrollRows,normaliseAdjustment,isStandardAdjustment,attachDeductionsToPayrollRows,normaliseDeduction,deductionAmountForField,payrollEmployeeYtdContext,statutoryDeductionRows,periodCountForPayCycle,calculateCumulativePaye,calculateAnnualTax2027,trElectricalAutomaticLevyDeductions,validatePayrollYtdContinuity,expectedMonthlyPeriodsBefore,previewPayrollLevyPeriod,usesPayrollYtd,payrollYtdTakeoverDate};
}
return Object.freeze({create,version:'payroll-engine-1'});
});
