(() => {
  "use strict";

  const STORAGE_KEY = "shiftly.jobs.mock.v1";
  const DEMO_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
  const isLocalDevelopment = window.location.protocol === "file:" || DEMO_HOSTS.has(window.location.hostname);
  const isQaSession = isLocalDevelopment && new URLSearchParams(window.location.search).get("jobsQa") === "1";
  const isMockMode = isLocalDevelopment && ['admin','supervisor','employee'].includes(new URLSearchParams(window.location.search).get('jobsDemo'));
  const supervisorIdentity = { employeeId: "E100", name: "Thabo Mokoena", role: "Lead Supervisor" };
  const teamDirectory = [
    supervisorIdentity,
    { employeeId: "E104", name: "Lerato Dlamini", role: "Electrician" },
    { employeeId: "E111", name: "Sipho Ndlovu", role: "Technician" },
    { employeeId: "E118", name: "Ayesha Daniels", role: "Assistant" }
  ];
  const adminTabs = [["overview", "Overview"], ["work", "Work Record"], ["team-time", "Team & Time"], ["review", "Review"], ["card", "Job Card"]];
  const supervisorTabs = [["overview", "Overview"], ["today", "Today's Work"], ["records", "Job Records"], ["signoff", "Sign-off"]];

  const initialState = () => ({
    sequence: 50,
    jobs: [
      {
        id: "job-0048",
        jobNumber: "JC-2026-0048",
        clientName: "Kopano Agri Services (Demo)",
        title: "Irrigation pump control inspection",
        clientContactName: "Nomsa Khumalo",
        clientPhone: "+27 10 555 0184",
        clientEmail: "nomsa@example.test",
        site: "North Pump Station",
        serviceAddress: "Rustenburg district, North West",
        scheduledDate: "2026-09-08",
        priority: "high",
        description: "Inspect intermittent pump trips, verify control wiring and provide a field-service record.",
        status: "scheduled",
        lead: supervisorIdentity,
        team: [supervisorIdentity, teamDirectory[1]],
        sessions: [], workDays: [], materials: [], testing: [], photos: [], notes: [], signoff: null,
        createdAt: "2026-09-02T09:20:00+02:00",
        lastActivity: "2026-09-03T14:10:00+02:00",
        activity: [
          activity("job_created", "Job created", "Amina Jacobs", "2026-09-02T09:20:00+02:00"),
          activity("job_scheduled", "Scheduled for 8 September and assigned to Thabo's team", "Amina Jacobs", "2026-09-03T14:10:00+02:00")
        ]
      },
      {
        id: "job-0049",
        jobNumber: "JC-2026-0049",
        clientName: "Highveld Packaging (Demo)",
        title: "Conveyor isolator replacement",
        clientContactName: "Marius Botha",
        clientPhone: "+27 11 555 0149",
        clientEmail: "marius@example.test",
        site: "Production Line 3",
        serviceAddress: "Isando industrial area, Gauteng",
        scheduledDate: "2026-09-04",
        priority: "urgent",
        description: "Replace damaged local isolator, confirm lock-out integrity and test conveyor start circuit.",
        status: "in_progress",
        lead: supervisorIdentity,
        team: [supervisorIdentity, teamDirectory[2]],
        sessions: [
          session("ses-49-1", supervisorIdentity, "2026-09-04T08:03:00+02:00", null)
        ],
        workDays: [],
        materials: [{ id: "mat-49-1", description: "40A weatherproof isolator", quantity: 1, unit: "unit", addedAt: "2026-09-04T08:30:00+02:00", by: supervisorIdentity.name }],
        testing: [], photos: [], notes: [], signoff: null,
        createdAt: "2026-09-03T11:15:00+02:00",
        lastActivity: "2026-09-04T08:03:00+02:00",
        activity: [
          activity("job_created", "Job created and scheduled", "Amina Jacobs", "2026-09-03T11:15:00+02:00"),
          activity("job_started", "Thabo started work", supervisorIdentity.name, "2026-09-04T08:03:00+02:00")
        ]
      },
      {
        id: "job-0046",
        jobNumber: "JC-2026-0046",
        clientName: "Umoya Facilities (Demo)",
        title: "Multi-day roof leak investigation",
        clientContactName: "Zanele Radebe",
        clientPhone: "+27 12 555 0166",
        clientEmail: "zanele@example.test",
        site: "Administration Block",
        serviceAddress: "Centurion, Gauteng",
        scheduledDate: "2026-09-01",
        priority: "normal",
        description: "Trace water ingress above the eastern office wing and repair failed waterproofing junctions.",
        status: "in_progress",
        lead: supervisorIdentity,
        team: [supervisorIdentity, teamDirectory[1], teamDirectory[3]],
        sessions: [
          session("ses-46-1", supervisorIdentity, "2026-09-01T08:10:00+02:00", "2026-09-01T16:20:00+02:00"),
          session("ses-46-2", teamDirectory[1], "2026-09-01T08:18:00+02:00", "2026-09-01T16:12:00+02:00"),
          session("ses-46-3", supervisorIdentity, "2026-09-02T07:55:00+02:00", "2026-09-02T15:40:00+02:00")
        ],
        workDays: [
          workDay("day-46-1", "2026-09-01", "Opened ceiling inspection points and traced ingress to two parapet junctions.", "Area isolated. Drying required before final membrane work.", ["mat-46-1"], ["photo-46-1"], ["ses-46-1", "ses-46-2"]),
          workDay("day-46-2", "2026-09-02", "Removed failed sealant, prepared surfaces and completed the first waterproofing layer.", "Return after cure period for water test and final coat.", ["mat-46-2"], ["photo-46-2"], ["ses-46-3"])
        ],
        materials: [
          { id: "mat-46-1", description: "Polyurethane joint sealant", quantity: 4, unit: "cartridges", addedAt: "2026-09-01T13:20:00+02:00", by: supervisorIdentity.name },
          { id: "mat-46-2", description: "Reinforced waterproofing membrane", quantity: 12, unit: "m²", addedAt: "2026-09-02T10:05:00+02:00", by: supervisorIdentity.name }
        ],
        testing: [{ id: "test-46-1", description: "Moisture reading", result: "Drying in progress", note: "Final flood test pending.", addedAt: "2026-09-02T15:22:00+02:00", by: supervisorIdentity.name }],
        photos: [
          photo("photo-46-1", "Before", "Failed junction above eastern office wing", "2026-09-01T09:05:00+02:00"),
          photo("photo-46-2", "During", "Prepared joint and first membrane layer", "2026-09-02T11:40:00+02:00")
        ],
        notes: [{ id: "note-46-1", text: "Client requested that the final water test be witnessed by facilities management.", by: supervisorIdentity.name, at: "2026-09-02T15:32:00+02:00" }],
        signoff: null,
        createdAt: "2026-08-31T10:00:00+02:00",
        lastActivity: "2026-09-02T15:40:00+02:00",
        activity: [
          activity("job_created", "Job created", "Amina Jacobs", "2026-08-31T10:00:00+02:00"),
          activity("job_started", "Day 1 work started", supervisorIdentity.name, "2026-09-01T08:10:00+02:00"),
          activity("work_paused", "Finished work for Day 1", supervisorIdentity.name, "2026-09-01T16:20:00+02:00"),
          activity("job_continued", "Day 2 work continued", supervisorIdentity.name, "2026-09-02T07:55:00+02:00"),
          activity("work_paused", "Finished work for Day 2", supervisorIdentity.name, "2026-09-02T15:40:00+02:00")
        ]
      },
      {
        id: "job-0045",
        jobNumber: "JC-2026-0045",
        clientName: "Cape Meridian Foods (Demo)",
        title: "Cold-room door heater repair",
        clientContactName: "Danielle Petersen",
        clientPhone: "+27 21 555 0145",
        clientEmail: "danielle@example.test",
        site: "Dispatch Cold Room",
        serviceAddress: "Epping, Cape Town",
        scheduledDate: "2026-08-29",
        priority: "high",
        description: "Investigate ice build-up around the cold-room door and restore heater operation.",
        status: "submitted_for_review",
        lead: supervisorIdentity,
        team: [supervisorIdentity, teamDirectory[2]],
        sessions: [session("ses-45-1", supervisorIdentity, "2026-08-29T09:02:00+02:00", "2026-08-29T13:38:00+02:00")],
        workDays: [workDay("day-45-1", "2026-08-29", "Tested heater circuit, replaced failed element connection and reinstated insulation.", "Door seal and drain channel checked.", ["mat-45-1"], ["photo-45-1", "photo-45-2"], ["ses-45-1"])],
        materials: [{ id: "mat-45-1", description: "High-temperature terminal kit", quantity: 1, unit: "kit", addedAt: "2026-08-29T11:12:00+02:00", by: supervisorIdentity.name }],
        testing: [{ id: "test-45-1", description: "Door heater current draw", result: "PASS — 1.8 A", note: "Stable after 15-minute observation.", addedAt: "2026-08-29T13:20:00+02:00", by: supervisorIdentity.name }],
        photos: [photo("photo-45-1", "Before", "Icing at lower hinge side", "2026-08-29T09:14:00+02:00"), photo("photo-45-2", "After", "Repaired connection and reinstated cover", "2026-08-29T13:18:00+02:00")],
        notes: [],
        signoff: { clientName: "Danielle Petersen", signedAt: "2026-08-29T13:34:00+02:00", unavailable: false, reason: "", signature: "Danielle Petersen" },
        createdAt: "2026-08-28T12:30:00+02:00",
        lastActivity: "2026-08-29T13:42:00+02:00",
        activity: [
          activity("job_created", "Job created", "Amina Jacobs", "2026-08-28T12:30:00+02:00"),
          activity("job_started", "Work started", supervisorIdentity.name, "2026-08-29T09:02:00+02:00"),
          activity("work_paused", "Work session closed", supervisorIdentity.name, "2026-08-29T13:38:00+02:00"),
          activity("submitted_for_review", "Submitted for admin review", supervisorIdentity.name, "2026-08-29T13:42:00+02:00")
        ]
      },
      {
        id: "job-0044",
        jobNumber: "JC-2026-0044",
        clientName: "Westlake Community Centre (Demo)",
        title: "Emergency lighting service",
        clientContactName: "Farai Moyo",
        clientPhone: "+27 31 555 0144",
        clientEmail: "farai@example.test",
        site: "Main Hall",
        serviceAddress: "Westville, KwaZulu-Natal",
        scheduledDate: "2026-08-27",
        priority: "normal",
        description: "Service emergency luminaires and document the duration test.",
        status: "correction_required",
        correctionReason: "Please add the final duration-test result and an after photo of the distribution board label.",
        lead: supervisorIdentity,
        team: [supervisorIdentity, teamDirectory[3]],
        sessions: [session("ses-44-1", supervisorIdentity, "2026-08-27T08:22:00+02:00", "2026-08-27T14:05:00+02:00")],
        workDays: [workDay("day-44-1", "2026-08-27", "Replaced two failed emergency luminaires and checked the charging indicators.", "Duration test started; final result still required.", ["mat-44-1"], ["photo-44-1"], ["ses-44-1"])],
        materials: [{ id: "mat-44-1", description: "LED emergency luminaire", quantity: 2, unit: "units", addedAt: "2026-08-27T10:10:00+02:00", by: supervisorIdentity.name }],
        testing: [{ id: "test-44-1", description: "Charge indicator check", result: "PASS", note: "Duration result outstanding.", addedAt: "2026-08-27T13:40:00+02:00", by: supervisorIdentity.name }],
        photos: [photo("photo-44-1", "During", "Replacement luminaire installed", "2026-08-27T11:04:00+02:00")],
        notes: [], signoff: null,
        createdAt: "2026-08-26T15:25:00+02:00",
        lastActivity: "2026-08-28T09:10:00+02:00",
        activity: [
          activity("job_created", "Job created", "Amina Jacobs", "2026-08-26T15:25:00+02:00"),
          activity("submitted_for_review", "Submitted for admin review", supervisorIdentity.name, "2026-08-27T14:12:00+02:00"),
          activity("returned_for_correction", "Returned: final duration result and after photo required", "Amina Jacobs", "2026-08-28T09:10:00+02:00")
        ]
      },
      {
        id: "job-0042",
        jobNumber: "JC-2026-0042",
        clientName: "Mahlangu Engineering Works (Demo)",
        title: "Workshop DB thermal fault repair",
        clientContactName: "Bongani Mahlangu",
        clientPhone: "+27 13 555 0142",
        clientEmail: "bongani@example.test",
        site: "Fabrication Workshop",
        serviceAddress: "Middelburg, Mpumalanga",
        scheduledDate: "2026-08-21",
        priority: "urgent",
        description: "Investigate overheating at the workshop distribution board and repair the affected termination.",
        status: "completed",
        lead: supervisorIdentity,
        team: [supervisorIdentity, teamDirectory[1]],
        sessions: [
          session("ses-42-1", supervisorIdentity, "2026-08-21T07:48:00+02:00", "2026-08-21T12:26:00+02:00"),
          session("ses-42-2", teamDirectory[1], "2026-08-21T08:00:00+02:00", "2026-08-21T12:18:00+02:00")
        ],
        workDays: [workDay("day-42-1", "2026-08-21", "Isolated the DB, replaced the heat-damaged breaker termination and torqued all outgoing connections.", "Thermal scan repeated under load with no abnormal rise.", ["mat-42-1", "mat-42-2"], ["photo-42-1", "photo-42-2"], ["ses-42-1", "ses-42-2"])],
        materials: [
          { id: "mat-42-1", description: "63A three-pole breaker", quantity: 1, unit: "unit", addedAt: "2026-08-21T09:20:00+02:00", by: supervisorIdentity.name },
          { id: "mat-42-2", description: "Copper cable lugs", quantity: 6, unit: "units", addedAt: "2026-08-21T09:22:00+02:00", by: supervisorIdentity.name }
        ],
        testing: [
          { id: "test-42-1", description: "Insulation resistance", result: "PASS", note: ">200 MΩ", addedAt: "2026-08-21T11:42:00+02:00", by: supervisorIdentity.name },
          { id: "test-42-2", description: "Loaded thermal scan", result: "PASS", note: "No abnormal temperature rise after 20 minutes.", addedAt: "2026-08-21T12:15:00+02:00", by: supervisorIdentity.name }
        ],
        photos: [photo("photo-42-1", "Before", "Heat damage at outgoing breaker termination", "2026-08-21T08:14:00+02:00"), photo("photo-42-2", "After", "Completed termination and DB label", "2026-08-21T12:12:00+02:00")],
        notes: [{ id: "note-42-1", text: "Recommended a planned annual torque and thermal inspection for the workshop boards.", by: supervisorIdentity.name, at: "2026-08-21T12:20:00+02:00" }],
        signoff: { clientName: "Bongani Mahlangu", signedAt: "2026-08-21T12:24:00+02:00", unavailable: false, reason: "", signature: "Bongani Mahlangu" },
        completion: { by: "Amina Jacobs", at: "2026-08-21T14:10:00+02:00", outcome: "Completed" },
        createdAt: "2026-08-20T13:20:00+02:00",
        lastActivity: "2026-08-21T14:10:00+02:00",
        activity: [
          activity("job_created", "Job created", "Amina Jacobs", "2026-08-20T13:20:00+02:00"),
          activity("job_started", "Work started", supervisorIdentity.name, "2026-08-21T07:48:00+02:00"),
          activity("submitted_for_review", "Submitted for review", supervisorIdentity.name, "2026-08-21T12:30:00+02:00"),
          activity("completed", "Approved and completed", "Amina Jacobs", "2026-08-21T14:10:00+02:00")
        ]
      }
    ]
  });

  function activity(type, summary, actor, at) { return { id: uid("act"), type, summary, actor, at }; }
  function session(id, employee, startedAt, endedAt) { return { id, employeeId: employee.employeeId, employeeName: employee.name, startedAt, endedAt }; }
  function workDay(id, date, work, notes, materialIds = [], photoIds = [], sessionIds = [], testingIds = []) { return { id, date, work, notes, materialIds, photoIds, sessionIds, testingIds }; }
  function photo(id, category, note, at) { return { id, category, note, at, by: supervisorIdentity.name }; }
  function uid(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }

  const dataService = isMockMode ? window.ShiftlyJobsData.createMock({
    location: window.location, fixtures: initialState, storage: isQaSession ? null : window.localStorage,
    key: STORAGE_KEY, qa: isQaSession, identity: supervisorIdentity, team: teamDirectory
  }) : null;
  let state = mockState();
  const liveDrafts = new Map();
  let directoryCache = null;
  // Real mode receives only the explicitly enabled workflow capabilities.
  let jobsViewState = null;
  let liveAdapter = null;
  let liveDetail = null;
  let liveRequest = 0;
  let livePage = {offset:0,limit:25,hasMore:false};
  let liveStatus = 'idle';
  let liveMessage = '';
  let planningPending=false;
  let liveWorkerActive=false;
  function canExecute(job=liveDetail) {
    return !isMockMode && window.ShiftlyJobsData.canOpen(liveContext()) && liveContext().role==='supervisor' && liveWorkerActive && liveAdapter?.capabilities.execution===true && job?.detailLoaded===true && job.team.some(e=>e.employeeId===liveContext().employeeId);
  }
  function canOperate(){return canPlan()||canExecute();}
  function isLead(job){return canExecute(job)&&job.lead?.employeeId===liveContext().employeeId;}
  function reviewAllowed(method,job=liveDetail) {
    if(!job||!liveAdapter?.capabilities.review||['completed','cancelled'].includes(job.status))return false;
    if(['submit','resubmit'].includes(method))return isLead(job)&&['in_progress','correction_required'].includes(job.status)&&!openSessions(job).length&&job.workDays.some(d=>d.work?.trim())&&(method!=='resubmit'||!!job.correctedAt);
    if(!canPlan())return false;
    if(method==='returnCorrection')return job.status==='submitted_for_review';
    if(method==='approve')return job.status==='submitted_for_review'&&!openSessions(job).length&&!!job.lead;
    return method==='cancel'&&!openSessions(job).length;
  }
  let planningRefreshRequired=false;
  let modalPlanning=false;
  let planningJobId='';
  let directoryRequest=0;
  function canPlan() { return !isMockMode && window.ShiftlyJobsData.canOpen(liveContext()) && ['owner','admin'].includes(liveContext().role) && liveAdapter?.capabilities.planning===true; }
  function liveContext() {
    const c=currentJobsContext();
    return {userId:c.userId,companyId:c.companyId,role:c.role,employeeId:c.employeeId,
      jobsEnabled:c.jobsEnabled,version:c.version,membershipActive:c.membershipActive,linkedEmployeeActive:c.linkedEmployeeActive};
  }
  function mockState() { return isMockMode && dataService ? dataService.getState() : { jobs: [], sequence: 0 }; }
  function jobsEmployeeId() { return isMockMode ? supervisorIdentity.employeeId : currentJobsContext().employeeId || ''; }
  function getDirectories() {
    if (!isMockMode) return directoryCache;
    return { sites:[{siteId:'WORKSHOP',name:'Workshop'},{siteId:'ADMIN',name:'Administration Block'},{siteId:'LINE3',name:'Production Line 3'}],
      team:teamDirectory, leads:teamDirectory.filter(p=>/supervisor/i.test(p.role)) };
  }
  function mediaAvailable() { return isMockMode; }
  let pendingAction = false;
  let contextKey = "";
  let contextGeneration = 0;
  let role = "admin";
  let screen = "dashboard";
  let selectedJobId = "";
  let activeTab = "overview";
  let adminFilter = "all";
  let adminSearch = "";
  let modalSubmit = null;
  let toastTimer = null;
  let shell;
  let root;
  let modal;
  let devBar;
  let workspace;
  let allJobsWorkspace;
  let allJobsScroll = 0;
  let allJobsFocus;
  let detailReturnSurface = "dashboard";
  let dashboardScroll = 0;
  let dashboardFocus;
  let savedBodyOverflow = "";
  let dashboardDirty = false;

  function persist() {
    // Persistence belongs to the adapter. Rendering never writes production data.
  }

  function currentJobsContext() {
    try {
      return window.ShiftlyJobsContext?.get() || {};
    } catch { return {}; }
  }

  function setLocalContext(nextRole) {
    if (!isMockMode || !dataService) return;
    dataService.setContext({ userId: "demo-" + nextRole, companyId: "demo",
      role: nextRole, jobsEnabled: true, employeeId: nextRole === "supervisor" ? supervisorIdentity.employeeId : "" });
  }

  async function performAction(action) {
    if (!isMockMode) { toast('Jobs backend connection is not active.'); return; }
    if (pendingAction) return;
    pendingAction = true;
    const generation = contextGeneration;
    const controls = [...(shell?.querySelectorAll("button,input,textarea,select") || []),
      ...(modal?.querySelectorAll("button,input,textarea,select") || [])];
    const previous = controls.map(control => control.disabled);
    controls.forEach(control => { control.disabled = true; });
    shell?.setAttribute("aria-busy", "true");
    try { await action(); }
    catch (error) {
      if (generation === contextGeneration) {
        const failure = window.ShiftlyJobsData.errorState(error);
        toast(failure.message);
        const target = modal && !modal.hidden ? modal.querySelector(".jobsModalBody") : workspace?.querySelector("#jobsTabPanel") || root;
        let alert = target?.querySelector(".jobsDataError");
        if (!alert && target) { alert = document.createElement("div"); alert.className = "jobsDataError jobsReviewBanner correction"; alert.setAttribute("role","alert"); target.prepend(alert); }
        if (alert) alert.textContent = failure.message;
      }
    } finally {
      pendingAction = false; shell?.removeAttribute("aria-busy");
      controls.forEach((control,index) => { if (control.isConnected) control.disabled = previous[index]; });
    }
  }

  function contextChanged() {
    const context = currentJobsContext();
    const next = JSON.stringify(context);
    if (next === contextKey) return;
    contextKey = next; contextGeneration++;
    jobsViewState?.clear(); liveDrafts.clear(); directoryCache = null;
    liveRequest++; liveAdapter?.clear(); liveAdapter=null; liveDetail=null;
    directoryRequest++;planningPending=false;planningRefreshRequired=false;modalPlanning=false;planningJobId='';
    liveWorkerActive=false;
    livePage={offset:0,limit:25,hasMore:false};liveStatus='idle';liveMessage='';
    closeJob(); closeAllJobs(false);
    if (shell) shell.hidden = true;
    if (modal) closeModal();
    selectedJobId = ""; adminSearch = ""; adminFilter = "all";
    state = { jobs: [], sequence: 0 }; pendingAction = false;
    if (!isMockMode && root) root.innerHTML='';
  }

  function h(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function localDate(value) {
    if (!value) return "Not set";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
    return new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  }

  function localDateTime(value) {
    if (!value) return "Open now";
    return new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  }

  function timeOnly(value) {
    if (!value) return "Open";
    return new Intl.DateTimeFormat("en-ZA", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  }

  function minutesBetween(start, end) {
    return Math.max(0, Math.round((new Date(end || Date.now()) - new Date(start)) / 60000));
  }

  function totalMinutes(job) { return job.sessions.reduce((sum, item) => sum + minutesBetween(item.startedAt, item.endedAt), 0); }
  function duration(minutes) { const hrs = Math.floor(minutes / 60); const mins = minutes % 60; return `${hrs}h ${String(mins).padStart(2, "0")}m`; }
  function openSessions(job) { return job.sessions.filter((item) => !item.endedAt); }
  function currentSession(job) { return openSessions(job).find((item) => item.employeeId === jobsEmployeeId()); }
  function isAssigned(job) { return job.team.some((person) => person.employeeId === jobsEmployeeId()); }
  function selectedJob() { return isMockMode ? state.jobs.find((job) => job.id === selectedJobId) : liveDetail; }

  const statusMap = {
    draft: ["Draft", "draft"], scheduled: ["Scheduled", "scheduled"], in_progress: ["Paused / Continue", "scheduled"],
    submitted_for_review: ["Awaiting Review", "review"], correction_required: ["Correction Required", "correction"],
    completed: ["Completed", "completed"], cancelled: ["Cancelled", "cancelled"]
  };

  function displayStatus(job) {
    if (!Array.isArray(job.sessions) && job.status === 'in_progress') return ['In progress', 'scheduled'];
    if (Array.isArray(job.sessions) && openSessions(job).length) return ["Working Now", "working"];
    return statusMap[job.status] || [job.status, ""];
  }

  function statusBadge(job) {
    const [label, tone] = displayStatus(job);
    return `<span class="jobsStatus ${tone}">${h(label)}</span>`;
  }

  function ensureDom() {
    if (shell) return;
    shell = document.createElement("main");
    shell.id = "jobsShell";
    shell.className = "jobsShell";
    shell.hidden = true;
    shell.innerHTML = `<div id="jobsRoot"></div><div id="jobsToast" class="jobsToast" role="status" aria-live="polite"></div>`;
    document.body.appendChild(shell);
    root = shell.querySelector("#jobsRoot");

    modal = document.createElement("div");
    modal.id = "jobsModal";
    modal.className = "jobsModal";
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.appendChild(modal);

    if (isMockMode) {
      document.body.classList.add("jobsLocalDemo");
      devBar = document.createElement("div");
      devBar.className = "jobsDevBar";
      devBar.setAttribute("aria-label", "Jobs local role simulator");
      document.body.appendChild(devBar);
      renderDevBar();
    }

    bindEvents();
  }

  function topbar() {
    const subtitle = role === "admin" ? "Create, assign, track and complete field work." : "Assigned field work";
    return `<header class="platformTop jobsNativeTop">
      <div class="platformBrand"><div class="brandBadge"><i class="ph ph-briefcase"></i></div><div><div class="platformTitle">Shiftly Jobs</div><div class="platformSub">${subtitle}</div></div></div>
      <div class="platformActions jobsGlobalActions">${!isMockMode ? hostNavigation() : `
        ${role === "admin" ? `<button class="miniIconBtn" type="button" data-action="close" title="Company Dashboard" aria-label="Company Dashboard"><i class="ph ph-buildings"></i></button><button class="miniIconBtn" type="button" data-action="billing" title="Open billing" aria-label="Open billing"><i class="ph ph-receipt"></i></button>` : ""}
        <button class="miniIconBtn" type="button" data-action="clocking" title="Open clocking" aria-label="Open clocking"><i class="ph ph-fingerprint"></i></button>
      `}</div>
    </header>`;
  }

  function hostNavigationSource() {
    return document.querySelector(role==='admin' ? '#companyAdminShell .platformActions' : '#appShell .headerActions');
  }

  let hostNavigationObserver;
  function watchHostNavigation() {
    hostNavigationObserver?.disconnect();
    const source=hostNavigationSource();
    if(!source)return;
    hostNavigationObserver=new MutationObserver(()=>{
      const target=root?.querySelector('.jobsGlobalActions');
      if(!isMockMode&&!shell.hidden&&target)target.innerHTML=hostNavigation();
    });
    hostNavigationObserver.observe(source,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','disabled','class','style','title','aria-label']});
  }

  function hostNavigation() {
    const source=hostNavigationSource();
    if(!source)return ''; // Never invent access when the authenticated host is absent.
    const back=role==='admin'?'<button class="miniIconBtn" type="button" data-action="close" title="Company Dashboard" aria-label="Company Dashboard"><i class="ph ph-squares-four"></i></button>':'<button class="miniIconBtn" type="button" data-action="close" title="Open scanner" aria-label="Open scanner"><i class="ph ph-fingerprint"></i></button>';
    const excluded=new Set(['btnOpenJobsAdmin','btnOpenJobsSupervisor','btnCompanyAdminPortfolio','btnCompanyAdminSwitch','btnBackToPortfolio']);
    return back+[...source.querySelectorAll('button[id]')].filter(button=>!excluded.has(button.id)&&!button.hidden&&button.style.display!=='none').map(button=>{
      const active=button.id===(role==='admin'?'btnOpenJobsAdmin':'btnOpenJobsSupervisor');
      return `<button type="button" class="${h(button.className)}${active?' active jobsNavActive':''}" data-action="host-nav" data-host-id="${h(button.id)}" title="${h(button.title)}" aria-label="${h(button.getAttribute('aria-label')||button.title)}" ${active?'aria-current="page"':''} ${button.disabled?'disabled':''}>${button.innerHTML}</button>`;
    }).join('');
  }

  async function navigateHost(id) {
    const source=hostNavigationSource();
    const button=[...(source?.querySelectorAll('button[id]')||[])].find(button=>button.id===id);
    if(!button||button.hidden||button.disabled||button.style.display==='none')return;
    if(id==='btnOpenJobsAdmin'||id==='btnOpenJobsSupervisor')return;
    // Preserve the actual authenticated application's handlers and permission checks.
    await closeJobs(false);
    button.click();
  }

  function render() {
    ensureDom();
    if (!isMockMode) { renderLiveList(); return; }
    if (screen === "detail" && selectedJob()) renderDetail();
    else if (role === "supervisor") renderSupervisorDashboard();
    else renderAdminDashboard();
    renderDevBar();
  }

  function renderLiveList() {
    if(allJobsWorkspace) {
      if(liveStatus==='ready'||liveStatus==='empty'){renderAllJobs();return;}
      if(liveStatus==='loading-detail')return;
      closeAllJobs(false);
    }
    if(liveStatus==='ready'||liveStatus==='empty') {
      if(role==='supervisor')renderSupervisorDashboard();else renderAdminDashboard();
      return;
    }
    const loading=liveStatus==='loading-list'||liveStatus==='loading-detail';
    const error=liveStatus==='error';
    const content=loading ? '<p role="status">'+(liveStatus==='loading-detail'?'Loading Job detail…':'Loading Jobs…')+'</p>' :
      error ? `<div role="alert">${h(liveMessage)} <button class="platformBtn inline jobsBtn secondary" data-action="live-retry">Retry list</button></div>` :
      state.jobs.length ? `<div class="jobsCompactList">${state.jobs.map(job=>`<article class="jobsCompactRow"><button type="button" data-action="open" data-id="${h(job.id)}"><div class="jobsCompactMain"><strong>${h(job.jobNumber)} · ${h(job.title)}</strong><span>${h(job.clientName)} · ${h(job.site || job.serviceAddress)}</span><small>Scheduled ${localDate(job.scheduledDate)}</small></div><div class="jobsCompactAction">${statusBadge(job)}<span>Open Job</span></div></button></article>`).join('')}</div>` : '<p role="status">No Jobs to show.</p>';
    root.innerHTML=`<div class="jobsApp">${topbar()}<section class="jobsDetailPanel"><div class="jobsPanelHead"><div><h2>Jobs</h2><p>${canPlan()?'Planning and session recovery enabled; review follows Job state.':'Work sessions require assigned active Supervisor access; review follows Job state.'}</p></div><button class="platformBtn inline jobsBtn primary" type="button" data-action="plan-create" ${canPlan()&&!planningPending&&!planningRefreshRequired?'':'disabled'}>Create Job</button></div>${liveStatus==='unavailable'?`<p role="status">${h(liveMessage)}</p>`:''}${content}<div class="jobsActionButtons"><button class="platformBtn inline jobsBtn secondary" data-action="live-retry" ${loading||planningPending?'disabled':''}>Refresh list</button><button class="platformBtn inline jobsBtn secondary" data-action="live-prev" ${loading||!livePage.offset?'disabled':''}>Previous</button><span>Page ${Math.floor(livePage.offset/livePage.limit)+1}</span><button class="platformBtn inline jobsBtn secondary" data-action="live-next" ${loading||!livePage.hasMore?'disabled':''}>Next</button></div></section></div>`;
  }

  function liveReadValid(request,key) {
    return request===liveRequest && key===JSON.stringify(liveContext()) && window.ShiftlyJobsData.canOpen(liveContext()) && !shell.hidden;
  }

  async function liveReadFailure(error) {
    liveDetail=null;selectedJobId='';
    const failure=window.ShiftlyJobsData.errorState(error);
    if(failure.category==='ACCESS_DENIED') {
      state={jobs:[],sequence:0};
      await closeJobs();syncEntrypoints();return;
    }
    if(error.code==='PGRST116') {
      liveStatus='unavailable';liveMessage='This Job is no longer available.';
    } else { liveStatus='error';liveMessage=failure.message;state={jobs:[],sequence:0}; }
    renderLiveList();
  }

  async function loadLiveList(offset=livePage.offset) {
    if(isMockMode || !liveAdapter || !window.ShiftlyJobsData.canOpen(liveContext())) return;
    closeJob();liveDetail=null;selectedJobId='';
    const request=++liveRequest,key=JSON.stringify(liveContext());
    livePage={offset:Math.max(0,offset),limit:25,hasMore:false};
    liveStatus='loading-list';state={jobs:[],sequence:0};renderLiveList();
    try {
      const rows=await liveAdapter.dashboard();
      if(!liveReadValid(request,key))return;
      state={jobs:rows,sequence:0};livePage.hasMore=rows.length===livePage.limit;
      if(!planningPending)planningRefreshRequired=false;
      liveStatus=rows.length?'ready':'empty';renderLiveList();
    }catch(error){if(liveReadValid(request,key))await liveReadFailure(error);}
  }

  async function loadLiveDetail(id) {
    if(isMockMode || !liveAdapter || !window.ShiftlyJobsData.canOpen(liveContext())) return;
    closeJob();liveDetail=null;selectedJobId='';
    const request=++liveRequest,key=JSON.stringify(liveContext());
    liveStatus='loading-detail';renderLiveList();
    try {
      const detail=await liveAdapter.detail(id);
      const workerActive=liveContext().role==='supervisor'?await liveAdapter.workEligibility():false;
      if(!liveReadValid(request,key))return;
      liveWorkerActive=workerActive;
      liveStatus='ready';renderLiveList();liveDetail=detail;openJob(id,true);
    }catch(error){if(liveReadValid(request,key))await liveReadFailure(error);}
  }

  function adminSummary() {
    return {
      scheduled: state.jobs.filter((j) => j.status === "scheduled").length,
      working: state.jobs.filter((j) => openSessions(j).length).length,
      review: state.jobs.filter((j) => j.status === "submitted_for_review").length,
      completed: state.jobs.filter((j) => j.status === "completed").length,
      attention: state.jobs.filter((j) => j.status === "correction_required" || j.priority === "urgent" && j.status !== "completed").length
    };
  }

  function matchesFilter(job) {
    const query = adminSearch.trim().toLowerCase();
    const searchMatch = !query || [job.jobNumber, job.clientName, job.title, job.site, job.serviceAddress, job.lead?.name].some((value) => String(value || "").toLowerCase().includes(query));
    if (!searchMatch) return false;
    if (adminFilter === "all") return true;
    if (adminFilter === "attention") return job.status === "correction_required" || job.priority === "urgent" && job.status !== "completed";
    return job.status === adminFilter;
  }

  function renderAdminDashboard() {
    screen = "dashboard";
    const summary = adminSummary();
    const jobs = state.jobs.slice().sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
    const active = jobs.filter((job) => openSessions(job).length || ["in_progress", "correction_required"].includes(job.status));
    const review = jobs.filter((job) => job.status === "submitted_for_review");
    const scheduled = jobs.filter((job) => ["scheduled", "draft"].includes(job.status));
    const completed = jobs.filter((job) => job.status === "completed").slice(0, 5);
    root.innerHTML = `<div class="jobsApp platformWrap">${topbar()}
      <section class="panel jobsCompanyContext"><div class="panelHead"><div class="companyProfileHead"><div class="companyLogoMark"><i class="ph ph-buildings"></i></div><div><div class="panelTitle">${h(jobCardCompany().name)}</div><div class="mutedText">Jobs workspace</div></div></div><div class="jobsCompanyActions"><button class="platformBtn secondary inline jobsAllJobsBtn" type="button" data-action="all-jobs"><i class="ph ph-list-magnifying-glass"></i>View All Jobs</button><button class="platformBtn inline jobsCreateBtn" type="button" data-action="${isMockMode ? 'create' : 'plan-create'}" ${!isMockMode && (!canPlan() || planningPending || planningRefreshRequired) ? 'disabled' : ''}><i class="ph ph-plus"></i>Create Job</button></div></div><div class="panelBody"><div class="statGrid jobsNativeStats">${nativeStat(summary.scheduled, "Scheduled", "scheduled")}${nativeStat(summary.working, "Working", "in_progress")}${nativeStat(summary.review, "Awaiting Review", "submitted_for_review")}${nativeStat(summary.completed, "Completed", "completed")}${nativeStat(summary.attention, "Needs Attention", "attention")}</div></div></section>
      <div class="jobsAdminGroups">${adminGroup("Active Jobs", active)}${adminGroup("Awaiting Review", review, true)}${adminGroup("Scheduled Jobs", scheduled)}${adminGroup("Recently Completed", completed)}</div>
    </div>`;
  }

  function nativeStat(value, label, filter = "") { return filter ? `<button class="stat jobsStatShortcut" type="button" data-action="all-jobs" data-filter="${filter}" aria-label="View ${label} Jobs"><b>${value}</b><span>${label}</span></button>` : `<div class="stat"><b>${value}</b><span>${label}</span></div>`; }
  function adminGroup(title, jobs, review = false) { return `<section class="panel jobsGroupPanel"><div class="panelHead"><div class="panelTitle">${title}</div><span class="statusPill">${jobs.length}</span></div><div class="jobsCompactList">${jobs.length ? jobs.map((job) => compactJobRow(job, review)).join("") : `<div class="emptyState">No ${title.toLowerCase()}.</div>`}</div></section>`; }
  function compactJobRow(job, review = false) { const session = openSessions(job)[0]; return `<article class="jobsCompactRow"><button type="button" data-action="open" data-id="${job.id}" aria-label="Open ${h(job.jobNumber)}"><div class="jobsCompactMain"><strong>${h(job.jobNumber)} · ${h(job.title)}</strong><span>${h(job.clientName)} · ${h(job.site || job.serviceAddress)}</span><small>${h(job.lead?.name || "Unassigned")} · ${session ? `Started ${timeOnly(session.startedAt)}` : `Scheduled ${localDate(job.scheduledDate)}`} · Updated ${localDateTime(job.lastActivity)}</small></div><div class="jobsCompactAction">${statusBadge(job)}<span>${review ? "Review Job" : job.status === "completed" ? "View Job Card" : "Open Job"}<i class="ph ph-caret-right"></i></span></div></button></article>`; }
  function filterButtons() {
    const options = [["all", "All"], ["scheduled", "Scheduled"], ["in_progress", "In Progress"], ["submitted_for_review", "Awaiting Review"], ["correction_required", "Correction Required"], ["completed", "Completed"], ["attention", "Needs Attention"]];
    return options.map(([value, label]) => `<button class="jobsFilter ${adminFilter === value ? "active" : ""}" type="button" role="tab" aria-selected="${adminFilter === value}" data-action="filter" data-filter="${value}">${label}</button>`).join("");
  }

  function jobsTable(jobs) {
    return `<table class="jobsTable"><thead><tr><th>Job</th><th>Client / title</th><th>Site / address</th><th>Lead</th><th>Scheduled</th><th>Status</th><th>Last activity</th><th><span class="srOnly">Action</span></th></tr></thead><tbody>${jobs.map((job) => `<tr tabindex="0" data-action="open" data-id="${job.id}" aria-label="Open ${h(job.jobNumber)}"><td><strong>${h(job.jobNumber)}</strong><small>${h(job.priority)} priority</small></td><td><strong>${h(job.clientName)}</strong><small>${h(job.title)}</small></td><td><strong>${h(job.site || "Service address")}</strong><small>${h(job.serviceAddress)}</small></td><td>${h(job.lead?.name || "Unassigned")}</td><td>${localDate(job.scheduledDate)}</td><td>${statusBadge(job)}</td><td>${localDateTime(job.lastActivity)}</td><td><span class="jobsTableOpen">Open Job <i class="ph ph-caret-right"></i></span></td></tr>`).join("")}</tbody></table>`;
  }

  function renderAllJobs() {
    if (role !== "admin") return;
    const jobs = state.jobs.filter(matchesFilter).sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
    const previousScroll = allJobsWorkspace?.querySelector(".jobsAllJobsBody")?.scrollTop ?? allJobsScroll;
    if (!allJobsWorkspace) {
      allJobsWorkspace = document.createElement("div");
      allJobsWorkspace.className = "jobsWorkspaceOverlay jobsAllJobsOverlay";
      allJobsWorkspace.addEventListener("click", (event) => { if (event.target === allJobsWorkspace && modal.hidden && !workspace) closeAllJobs(); });
      root.appendChild(allJobsWorkspace);
    }
    allJobsWorkspace.innerHTML = `<div class="jobsWorkspaceCard jobsAllJobsCard" role="dialog" aria-modal="true" aria-labelledby="jobsAllJobsTitle" tabindex="-1">
      <header class="jobsWorkspaceHead"><div class="jobsWorkspaceIdentity"><h2 id="jobsAllJobsTitle">All Jobs</h2><div class="mutedText">Find and manage company Jobs.</div></div><button class="jobsIconBtn" type="button" data-action="all-jobs-close" aria-label="Close All Jobs"><i class="ph ph-x"></i></button></header>
      <div class="jobsAllJobsBody"><div class="jobsAllJobsTools"><label class="jobsSearchWrap jobsAllJobsSearch"><i class="ph ph-magnifying-glass"></i><span class="srOnly">Search Jobs</span><input id="jobsSearch" class="jobsSearch platformInput" type="search" value="${h(adminSearch)}" placeholder="Search jobs..." autocomplete="off"/></label><div class="jobsFilters" role="tablist" aria-label="Filter All Jobs">${filterButtons()}</div><span class="statusPill jobsResultCount">${jobs.length} ${jobs.length === 1 ? "result" : "results"}</span></div>
      <div class="jobsAllJobsResults">${jobs.length ? `<div class="jobsTableWrap">${jobsTable(jobs)}</div><div class="jobsMobileList jobsAllJobsMobile">${jobs.map((job) => compactJobRow(job, job.status === "submitted_for_review")).join("")}</div>` : `<div class="jobsAllJobsEmpty">${empty("magnifying-glass", "No matching Jobs", "Try another search or status filter.")}</div>`}</div></div></div>`;
    const body = allJobsWorkspace.querySelector(".jobsAllJobsBody");
    body.scrollTop = previousScroll;
    allJobsScroll = previousScroll;
  }

  function openAllJobs(filter = "all") {
    if (role !== "admin") return;
    adminFilter = filter;
    adminSearch = "";
    dashboardScroll = window.scrollY;
    dashboardFocus = document.activeElement;
    savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root.querySelector(".jobsApp").inert = true;
    renderAllJobs();
    allJobsWorkspace.querySelector("#jobsSearch")?.focus({ preventScroll: true });
  }

  function closeAllJobs(restoreDashboard = true) {
    if (!allJobsWorkspace || workspace) return;
    const returnFilter = dashboardFocus?.dataset?.filter || "";
    const returnAction = dashboardFocus?.dataset?.action || "";
    allJobsWorkspace.remove();
    allJobsWorkspace = null;
    allJobsScroll = 0;
    document.body.style.overflow = savedBodyOverflow;
    if (!restoreDashboard) return;
    if (dashboardDirty) { renderAdminDashboard(); dashboardDirty = false; }
    else root.querySelector(".jobsApp").inert = false;
    const replacement = returnAction === "all-jobs"
      ? root.querySelector(`[data-action="all-jobs"]${returnFilter ? `[data-filter="${returnFilter}"]` : ":not([data-filter])"}`)
      : null;
    (replacement || dashboardFocus)?.focus?.({ preventScroll: true });
    window.scrollTo({ top: dashboardScroll, behavior: "instant" });
  }

  function jobCard(job, current = false) {
    return `<article class="jobsCard ${current ? "jobsCurrentCard" : ""}">
      <div class="jobsNumber">${h(job.jobNumber)}</div><div class="jobsCardHead"><h3>${h(job.title)}</h3>${statusBadge(job)}</div>
      <div class="jobsMetaGrid"><div><span>Client</span><b>${h(job.clientName)}</b></div><div><span>Site</span><b>${h(job.site || job.serviceAddress)}</b></div><div><span>Scheduled</span><b>${localDate(job.scheduledDate)}</b></div><div><span>Last activity</span><b>${localDateTime(job.lastActivity)}</b></div></div>
      <div class="jobsCardActions"><button class="platformBtn inline jobsBtn small secondary" type="button" data-action="open" data-id="${job.id}">Open Job <i class="ph ph-arrow-right"></i></button></div>
    </article>`;
  }

  function renderSupervisorDashboard() {
    screen = "dashboard";
    const assigned = state.jobs.filter(isAssigned);
    const groups = [
      ["Current Job", "Active work session", assigned.filter((job) => !!currentSession(job)), true],
      ["Continue Job", "Multi-day work ready to continue", assigned.filter((job) => ["in_progress", "correction_required"].includes(job.status) && !currentSession(job)), false],
      ["Scheduled", "Upcoming assigned work", assigned.filter((job) => ["scheduled", "draft"].includes(job.status)), false],
      ["Awaiting Review", "Submitted to the office", assigned.filter((job) => job.status === "submitted_for_review"), false],
      ["Recently Completed", "Read-only Job Cards", assigned.filter((job) => job.status === "completed").slice(0, 3), false]
    ];
    const counts = groups.slice(0, 3).map(([title, , jobs]) => `<span><b>${jobs.length}</b>${title.replace(" Job", "")}</span>`).join("");
    root.innerHTML = `<div class="jobsApp platformWrap jobsSupervisorApp">${topbar()}<div class="jobsSupervisorCounts">${counts}</div><section class="jobsSupervisorSections">${groups.map(([title, subtitle, jobs, current]) => supervisorSection(title, subtitle, jobs, current)).join("")}</section></div>`;
  }

  function supervisorSection(title, subtitle, jobs, current) {
    return `<section class="panel jobsSupervisorGroup"><div class="panelHead"><div><div class="panelTitle">${title}</div><div class="mutedText">${subtitle}</div></div><span class="statusPill">${jobs.length}</span></div><div class="jobsCompactList">${jobs.length ? jobs.map((job) => supervisorJobRow(job, current)).join("") : `<div class="emptyState">Nothing here right now.</div>`}</div></section>`;
  }

  function supervisorJobRow(job, current) { const session = currentSession(job); return `<article class="jobsCompactRow jobsSupervisorRow ${current ? "current" : ""}"><button type="button" data-action="open" data-id="${job.id}"><div class="jobsCompactMain"><strong>${h(job.jobNumber)} · ${h(job.title)}</strong><span>${h(job.clientName)}</span><small>${h(job.site || job.serviceAddress)}${session ? ` · Started ${timeOnly(session.startedAt)} · ${duration(minutesBetween(session.startedAt))}` : ` · ${localDate(job.scheduledDate)}`}</small></div><div class="jobsCompactAction">${statusBadge(job)}<span>Open Job <i class="ph ph-arrow-right"></i></span></div></button></article>`; }

  function renderDetail() {
    const job = selectedJob();
    if (!job) return render();
    const readOnly = !isMockMode || job.status === "completed" || role === "supervisor" && job.status === "submitted_for_review";
    const visibleTabs = role === "admin" ? adminTabs : job.status === "completed" ? [...supervisorTabs, ["card", "Job Card"]] : supervisorTabs;
    if (!visibleTabs.some(([id]) => id === activeTab)) activeTab = "overview";
    const previousScroll = workspace?.querySelector(".jobsWorkspaceBody")?.scrollTop || 0;
    const focusedTab = document.activeElement?.classList.contains("jobsTab");
    if (!workspace) {
      workspace = document.createElement("div");
      workspace.className = "jobsWorkspaceOverlay";
      workspace.addEventListener("click", (event) => { if (event.target === workspace && modal.hidden) closeJob(); });
      root.appendChild(workspace);
      root.querySelector(".jobsApp").inert = true;
    }
    workspace.innerHTML = `<div class="jobsWorkspaceCard" role="dialog" aria-modal="true" aria-labelledby="jobsWorkspaceTitle" tabindex="-1">
      <header class="jobsWorkspaceHead"><div class="jobsWorkspaceIdentity"><h2 id="jobsWorkspaceTitle">${h(job.jobNumber)} · ${h(job.title)}</h2><div class="mutedText">${h(job.clientName)} · ${h(job.site || job.serviceAddress)}</div><div class="jobsWorkspaceContext">${statusBadge(job)}<span>Lead <b>${h(job.lead?.name || "Unassigned")}</b></span><span>Team <b>${job.team.length}</b></span><span>Total time <b>${duration(totalMinutes(job))}</b></span></div></div><button class="jobsIconBtn" type="button" data-action="dashboard" aria-label="Close Job"><i class="ph ph-x"></i></button></header>
      <nav class="jobsTabs" role="tablist" aria-label="Job details">${visibleTabs.map(([id, label]) => `<button class="jobsTab ${activeTab === id ? "active" : ""}" type="button" role="tab" aria-selected="${activeTab === id}" data-action="tab" data-tab="${id}">${label}</button>`).join("")}</nav>
      <div class="jobsWorkspaceBody"><div class="jobsWorkspaceContent">${reviewBar(job)}
      ${(canPlan() || role === "supervisor") && (!isMockMode || !(activeTab === "today" && currentSession(job))) ? workflowBar(job) : ""}
      <section id="jobsTabPanel" role="tabpanel">${renderTab(job, activeTab, readOnly)}</section></div></div></div>`;
    workspace.querySelector(".jobsWorkspaceBody").scrollTop = previousScroll;
    if (focusedTab) workspace.querySelector('.jobsTab.active')?.focus({ preventScroll: true });
  }

  function scheduleLabel(job) { return `${localDate(job.scheduledDate)}${job.scheduledTime ? ` · ${job.scheduledTime}` : ""}`; }

  function fact(label, value) { return `<div class="jobsFact"><span>${label}</span><b>${h(value)}</b></div>`; }

  function workflowBar(job) {
    if(!isMockMode && role==='admin' && activeTab!=='team-time')return '';
    if(!isMockMode) {
      const own=currentSession(job);
      if(canExecute(job))return `<div class="jobsActionBar"><div class="jobsActionCopy"><b>${own?'Active session':job.status==='in_progress'?'Paused — no own open session':'Job work'}</b><span>Job work time is separate from attendance.</span></div><div class="jobsActionButtons">${own&&job.status==='in_progress'?'<button class="platformBtn inline jobsBtn primary" data-action="execute-finish">Finish Work for Today</button>':!own&&['scheduled','in_progress','correction_required'].includes(job.status)?`<button class="platformBtn inline jobsBtn primary" data-action="execute-start">${job.status==='scheduled'?'Start Job':'Continue Job'}</button>`:''}</div></div>`;
      if(canPlan()&&['in_progress','correction_required'].includes(job.status)&&openSessions(job).length)return `<div class="jobsActionBar"><b>Open technician sessions</b><div class="jobsActionButtons">${openSessions(job).map(s=>`<button class="platformBtn inline jobsBtn danger" data-action="execute-recover" data-session="${h(s.id)}">Emergency Close Session — ${h(s.employeeName)}</button>`).join('')}</div></div>`;
    }
    if(canPlan() && !['completed','cancelled','submitted_for_review'].includes(job.status))return `<div class="jobsActionBar"><div class="jobsActionCopy"><b>Job planning</b><span>Supervisor work sessions are separate; review follows Job state.</span></div><div class="jobsActionButtons"><button class="platformBtn inline jobsBtn secondary" data-action="plan-team">Manage technicians</button>${['draft','scheduled'].includes(job.status)?'<button class="platformBtn inline jobsBtn secondary" data-action="plan-schedule">Schedule / reschedule</button>':''}</div></div>`;
    if (!isMockMode) return '<div class="jobsReviewBanner"><b>Job record</b><p>Use available lifecycle actions above. Evidence and media remain unavailable.</p></div>';
    let buttons = "";
    let title = "Job record";
    let copy = "Review the current facts and activity for this Job.";
    if (role === "supervisor") {
      const ownOpen = currentSession(job);
      const canSubmit = job.workDays.length > 0 && !openSessions(job).length && ["in_progress", "correction_required"].includes(job.status);
      if (ownOpen) {
        title = "Working now"; copy = `Started ${timeOnly(ownOpen.startedAt)} · ${duration(minutesBetween(ownOpen.startedAt))}`;
        buttons = `<button class="platformBtn inline jobsBtn primary" data-action="tab" data-tab="today" type="button"><i class="ph ph-pencil-simple-line"></i>Open Today's Work</button>`;
      } else if (["scheduled", "in_progress", "correction_required"].includes(job.status)) {
        const label = job.status === "scheduled" ? "Start Job" : "Continue Job";
        title = job.status === "correction_required" ? "Correction required" : job.status === "scheduled" ? "Ready to start" : "Ready to continue";
        copy = job.status === "correction_required" ? job.correctionReason : `${job.workDays.length} completed work day${job.workDays.length === 1 ? "" : "s"}`;
        buttons = `<button class="platformBtn inline jobsBtn primary" data-action="start" type="button"><i class="ph ph-play-circle"></i>${label}</button>${canSubmit ? `<button class="platformBtn inline jobsBtn secondary" data-action="submit" type="button"><i class="ph ph-paper-plane-tilt"></i>${job.status === "correction_required" ? "Resubmit for Review" : "Submit for Review"}</button>` : ""}`;
      } else if (job.status === "submitted_for_review") {
        title = "Awaiting admin review"; copy = "Submitted work is read-only until reviewed.";
      } else if (job.status === "completed") {
        title = "Completed Job"; copy = `Completed ${localDateTime(job.completion?.at)}.`;
        buttons = `<button class="platformBtn inline jobsBtn secondary" data-action="tab" data-tab="card" type="button"><i class="ph ph-file-pdf"></i>View Job Card</button>`;
      }
    } else if (job.status === "submitted_for_review") {
      title = "Admin review required"; copy = "Inspect the full work record before returning it or completing the Job.";
      buttons = `<button class="platformBtn inline jobsBtn danger" data-action="return" type="button"><i class="ph ph-arrow-u-up-left"></i>Return for Correction</button><button class="platformBtn inline jobsBtn success" data-action="approve" type="button"><i class="ph ph-seal-check"></i>Approve & Complete</button>`;
    } else if (job.status === "correction_required") {
      title = "Returned for correction"; copy = job.correctionReason || "The field team must correct and resubmit this Job.";
    } else if (job.status === "completed") {
      title = "Completed Job"; copy = `Completed by ${job.completion?.by || "Admin"} on ${localDateTime(job.completion?.at)}.`;
      buttons = `<button class="platformBtn inline jobsBtn secondary" data-action="tab" data-tab="card" type="button"><i class="ph ph-file-pdf"></i>Preview Job Card</button>`;
    }
    return `<div class="jobsActionBar"><div class="jobsActionCopy"><b>${h(title)}</b><span>${h(copy)}</span></div><div class="jobsActionButtons">${buttons}</div></div>`;
  }

  function reviewBar(job) {
    if(isMockMode)return '';
    if(role==='admin' && activeTab!=='review')return '';
    // Keep the work editor focused; lifecycle review remains on Overview/Review.
    if(activeTab==='today')return '';
    const closed=['completed','cancelled'].includes(job.status);
    const buttons=[];
    const action=(method,label)=>`<button class="platformBtn inline jobsBtn ${method==='approve'?'success':method==='cancel'?'danger':'secondary'}" data-action="review-${method}">${label}</button>`;
    const method=job.correctedAt?'resubmit':'submit';
    if(reviewAllowed(method,job))buttons.push(action(method,method==='resubmit'?'Resubmit for Review':'Submit for Review'));
    if(reviewAllowed('returnCorrection',job))buttons.push(action('returnCorrection','Return for Correction'));
    if(reviewAllowed('approve',job))buttons.push(action('approve','Approve & Complete'));
    if(reviewAllowed('cancel',job))buttons.push(action('cancel','Cancel Job'));
    const blockers=!closed&&(isLead(job)||canPlan())&&openSessions(job).length?`<p>Finish open work sessions before submission, approval or cancellation: ${openSessions(job).map(s=>`${h(s.employeeName||s.employeeId)} — started ${h(localDateTime(s.startedAt))}`).join('; ')}. Sessions are never closed automatically.</p>`:'';
    const correction=job.correctionReason?`<p><b>Correction required:</b> ${h(job.correctionReason)}</p>`:'';
    const cancellation=job.cancelReason?`<p><b>Cancellation reason:</b> ${h(job.cancelReason)}</p>`:'';
    return `<section class="jobsReviewBanner jobsLifecycleStrip"><b>${closed?'Historical Job — read-only':job.status==='submitted_for_review'?'Awaiting manager review':'Job lifecycle'}</b>${correction}${cancellation}${blockers}${!closed&&isLead(job)&&!job.workDays.some(d=>d.work?.trim())?'<p>Record work before submitting for review.</p>':''}<div class="jobsActionButtons">${buttons.join('')}</div><details class="jobsEvidenceDisclosure"><summary>Activity history</summary><div class="jobsTimeline">${job.activity.slice().reverse().map(a=>timeline(a.actor,a.summary,a.at)).join('')||'<p>No activity returned.</p>'}</div></details></section>`;
  }

  function openReview(method) {
    if(planningPending||planningRefreshRequired||!reviewAllowed(method))return;
    const id=liveDetail.id;planningJobId=id;
    const titles={submit:'Submit for Review',resubmit:'Resubmit for Review',returnCorrection:'Return for Correction',approve:'Approve and Complete Job?',cancel:'Cancel Job'};
    const needsReason=['returnCorrection','cancel'].includes(method);
    openModal({planning:true,title:titles[method],submitLabel:titles[method],copy:method==='approve'?'Completion is final. The backend freezes the historical Job record.':method==='cancel'?'Cancellation preserves the Job and its history. It does not close sessions.':'This action uses the current authoritative Job revision.',body:`${needsReason?label('reason',method==='cancel'?'Cancellation reason':'Correction reason','<textarea class="jobsInput" name="NAME" required></textarea>'):''}<label class="jobsCheck"><input type="checkbox" name="confirmLifecycle"/>I confirm this action for ${h(liveDetail.jobNumber)}.</label>`,onSubmit:async form=>{
      if(liveDetail?.id!==id||!reviewAllowed(method))throw new Error('This lifecycle action is no longer available. Check the refreshed Job.');
      if(modal.querySelector('[name="confirmLifecycle"]').checked!==true)throw new Error('Explicit confirmation is required.');
      if(needsReason&&!form.get('reason')?.trim())throw new Error('A reason is required.');
      await planningMutation(method,[id,liveDetail.revision,...(needsReason?[form.get('reason').trim()]:[])],id);
    }});
  }

  function renderTab(job, tab, readOnly) {
    if (role === "admin") {
      const renderers = { overview: adminOverviewTab, work: adminWorkTab, "team-time": adminTeamTimeTab, review: adminReviewTab, card: jobCardTab };
      return (renderers[tab] || adminOverviewTab)(job, readOnly);
    }
    const renderers = { overview: supervisorOverviewTab, today: todayWorkTab, records: supervisorRecordsTab, signoff: signoffTab, card: jobCardTab };
    return (renderers[tab] || supervisorOverviewTab)(job, readOnly);
  }

  function panel(title, copy, body, action = "") { return `<article class="jobsDetailPanel"><div class="jobsPanelHead" style="padding:0 0 14px;border:0;"><div><h2>${title}</h2><p>${copy}</p></div>${action}</div>${body}</article>`; }

  function adminOverviewTab(job) {
    const correction = job.status === "correction_required" ? `<div class="jobsReviewBanner correction"><b>Correction requested</b><p>${h(job.correctionReason)}</p></div>` : "";
    return `${correction}<div class="jobsOverviewLayout"><section class="jobsOverviewMain"><h3 class="sectionLabel">Client request</h3><p class="jobsRequestText">${h(job.description)}</p><div class="jobsOverviewLocation"><h3 class="sectionLabel">Client & location</h3><strong>${h(job.clientName)}</strong><p>${h(job.site || "No linked site")}<br>${h(job.serviceAddress)}</p><p class="mutedText">${h(job.clientContactName)}<br>${h(job.clientPhone)} · ${h(job.clientEmail)}</p></div></section><aside class="jobsOverviewAside"><h3 class="sectionLabel">Planning & responsibility</h3><dl class="jobsMetadata">${metadata("Scheduled", scheduleLabel(job))}${metadata("Priority", job.priority)}${metadata("Lead supervisor", job.lead?.name || "Unassigned")}${metadata("Assigned team", job.team.map((person) => person.name).join(", "))}${metadata("Work recorded", `${job.workDays.length} days · ${job.sessions.length} sessions`)}${metadata("Last activity", localDateTime(job.lastActivity))}</dl></aside></div>`;
  }
  function metadata(label, value) { return `<div><dt>${h(label)}</dt><dd>${h(value)}</dd></div>`; }
  function adminWorkTab(job) { return `${panel("Daily work record", "", workDaysMarkup(job))}<div class="jobsGroupedGrid">${materialsTab(job, true)}${testingTab(job, true)}${photosTab(job, true)}${notesTab(job, true)}</div>`; }
  function adminTeamTimeTab(job) { return `${teamTab(job)}${timeTab(job)}`; }
  function adminReviewTab(job) {
    const submitted = [...job.activity].reverse().find((item) => ["submitted_for_review", "resubmitted"].includes(item.type));
    return `<div class="jobsReviewLayout"><section class="jobsReviewEvidence"><h3 class="sectionLabel">Request & outcome</h3><p class="jobsRequestText">${h(job.description)}</p><div class="jobsReviewCounts"><span><b>${job.workDays.length}</b> work days</span><span><b>${duration(totalMinutes(job))}</b> team time</span><span><b>${job.team.length}</b> team members</span></div>${workDaysMarkup(job)}<details class="jobsEvidenceDisclosure"><summary>Materials, results & photos <span>${job.materials.length} · ${job.testing.length} · ${job.photos.length}</span></summary><div class="jobsEvidenceBody">${materialsTab(job, true)}${testingTab(job, true)}${photosTab(job, true)}${notesTab(job, true)}</div></details><details class="jobsEvidenceDisclosure"><summary>Team & work sessions</summary><div class="jobsEvidenceBody">${adminTeamTimeTab(job)}</div></details></section><aside class="jobsReviewDecision">${signoffTab(job, true)}<dl class="jobsMetadata">${metadata("Submitted", submitted ? `${submitted.actor} · ${localDateTime(submitted.at)}` : "Not submitted")}${job.correctionReason ? metadata("Correction requested", job.correctionReason) : ""}</dl>${workflowBar(job)}<details class="jobsEvidenceDisclosure"><summary>Activity history <span>${job.activity.length}</span></summary><div class="jobsTimeline">${job.activity.slice().reverse().map((item) => timeline(item.actor, item.summary, item.at)).join("")}</div></details></aside></div>`;
  }
  function supervisorOverviewTab(job) { const correction = job.status === "correction_required" ? `<div class="jobsReviewBanner correction"><b>Correction required</b><p>${h(job.correctionReason)}</p></div>` : ""; return `${correction}${panel("Job details", "", `<div class="jobsDetailGrid">${field("Client", job.clientName)}${field("Scheduled", scheduleLabel(job))}${field("Site / address", `${job.site || ""}\n${job.serviceAddress}`)}${field("Team", job.team.map((person) => person.name).join(", "))}</div>`)}${panel("Client request", "", `<div class="jobsFieldCard"><p>${h(job.description)}</p></div>`)}`; }
  function supervisorRecordsTab(job) { return panel("Job records", "Completed daily work, newest last.", workDaysMarkup(job)); }
  function teamTab(job) { return panel("Assigned team", "", `<div class="jobsDetailGrid">${job.team.map((person) => `<div class="jobsFieldCard"><div class="jobsPerson"><div class="jobsAvatar">${initials(person.name)}</div><div><b>${h(person.name)}</b><span>${h(person.employeeId)} · ${h(person.employeeId === job.lead?.employeeId ? "Lead Supervisor" : person.role)}</span></div></div></div>`).join("")}</div>`); }
  function todayWorkTab(job, readOnly) {
    const active = currentSession(job);
    if(!isMockMode)readOnly=!canExecute(job)||['completed','cancelled','submitted_for_review'].includes(job.status);
    if (readOnly) return panel(job.status === "completed" ? "Completed Job" : !isMockMode ? "Today's work" : "Awaiting Review", "", `<div class="emptyState">This work record is read-only.</div>`);
    if (!active) return panel("Today's work", "", `<div class="jobsTodayEmpty"><i class="ph ph-play-circle"></i><b>${job.status === "scheduled" ? "Start this Job to begin today's work." : "Continue this Job to begin a new work day."}</b><button class="platformBtn inline jobsBtn primary" type="button" data-action="${isMockMode ? 'start' : 'execute-start'}">${job.status === "scheduled" ? "Start Job" : "Continue Job"}</button></div>`);
    const draft = job.currentDraft || (!isMockMode && liveDrafts.get(job.id)) || { work: "", notes: "" };
    return `<form id="jobsTodayForm" class="jobsTodayForm"><div class="jobsTodayHead"><div><span>Today's work</span><h2>${localDate(new Date().toISOString().slice(0, 10))}</h2></div><span class="mutedText">Session started ${localDateTime(active.startedAt)}</span></div><label class="jobsLabel jobsWorkDescription">Work Performed<textarea class="jobsInput platformInput" name="todayWork" required placeholder="Describe the work completed today">${h(draft.work)}</textarea></label>
      <div class="jobsGroupedGrid jobsTodayRecords">${materialsTab(job, !isMockMode)}${testingTab(job, !isMockMode)}</div>${photosTab(job, !isMockMode)}
      <label class="jobsLabel jobsOutstandingNotes">Notes / Outstanding Work<textarea class="jobsInput platformInput" name="todayNotes" placeholder="What remains to be done? Include access notes or handover details.">${h(draft.notes)}</textarea></label>
      <div class="jobsTodayFinish"><div><b>Ready to finish this session?</b><span>Save this work record. The Job stays open for another day.</span></div><button class="platformBtn inline jobsBtn primary" type="submit"><i class="ph ph-stop-circle"></i>Finish Work for Today</button></div></form>`;
  }
  function materialsTab(job, readOnly) { return panel("Materials used", "", dataRows(job.materials, (item) => `<div><b>${h(item.description)}</b><span>${h(item.by)} · ${localDateTime(item.addedAt)}</span></div><strong>${h(item.quantity)} ${h(item.unit)}</strong>`), !readOnly && role === "supervisor" ? `<button class="platformBtn inline jobsBtn small secondary" type="button" data-action="add-material"><i class="ph ph-plus"></i>Add material</button>` : ""); }
  function testingTab(job, readOnly) { return panel("Testing & results", "", dataRows(job.testing, (item) => `<div><b>${h(item.description)}</b><span>${h(item.note || "No additional note")} · ${h(item.by)}</span></div><strong>${h(item.result)}</strong>`), !readOnly && role === "supervisor" ? `<button class="platformBtn inline jobsBtn small secondary" type="button" data-action="add-test"><i class="ph ph-plus"></i>Add result</button>` : ""); }
  function photosTab(job, readOnly) { if (!mediaAvailable()) return panel("Photos", "", '<p>Media will be available in a later phase.</p><button type="button" disabled>Add photo</button>'); return panel("Photos", "", job.photos.length ? `<div class="jobsPhotoGrid">${job.photos.map((item) => `<article class="jobsPhoto"><div class="jobsPhotoVisual"><i class="ph ph-image"></i></div><div class="jobsPhotoMeta"><b>${h(item.category)}</b><span>${h(item.note || "No note")} · ${localDateTime(item.at)}</span></div></article>`).join("")}</div>` : empty("camera", "No photos added", "Before, During, After and Other photos will appear here."), !readOnly && role === "supervisor" ? `<button class="platformBtn inline jobsBtn small secondary" type="button" data-action="add-photo"><i class="ph ph-camera"></i>Add photo</button>` : ""); }
  function notesTab(job, readOnly) { return panel("Notes", "", job.notes.length ? `<div class="jobsTimeline">${job.notes.slice().reverse().map((item) => timeline(item.by, item.text, item.at)).join("")}</div>` : empty("note", "No notes", "Notes will appear here."), !readOnly && role === "supervisor" ? `<button class="platformBtn inline jobsBtn small secondary" data-action="add-note"><i class="ph ph-plus"></i>Add note</button>` : ""); }
  function signoffTab(job, readOnly) {
    if (!mediaAvailable()) return panel('Client sign-off', '', '<p>Signature capture will be available in a later phase.</p><button type="button" disabled>Capture sign-off</button>');
    const signoff = job.signoff;
    const body = signoff ? `<div class="jobsDetailGrid"><div class="jobsFieldCard"><span>Client</span><b>${h(signoff.clientName || "Unavailable")}</b></div><div class="jobsFieldCard"><span>Timestamp</span><b>${localDateTime(signoff.signedAt)}</b></div></div><div class="jobsSignature ${signoff.unavailable ? "" : "signed"}" style="margin-top:12px;">${signoff.unavailable ? `<div><i class="ph ph-user-minus"></i><b>Signature unavailable</b><div>${h(signoff.reason)}</div></div>` : h(signoff.signature || signoff.clientName)}</div>` : empty("signature", "No client sign-off", "A signature is optional; an unavailable reason may be recorded instead.");
    return panel("Client sign-off", "", body, !readOnly && role === "supervisor" ? `<button class="platformBtn inline jobsBtn small secondary" data-action="signoff"><i class="ph ph-signature"></i>${signoff ? "Update" : "Capture"} sign-off</button>` : "");
  }
  function timeTab(job) { return panel("Job time", "", job.sessions.length ? `<div class="jobsDataList">${job.sessions.map((item) => `<div class="jobsDataRow"><div><b>${h(item.employeeName)}</b><span>${localDate(item.startedAt)} · ${timeOnly(item.startedAt)}–${timeOnly(item.endedAt)}</span></div><strong>${duration(minutesBetween(item.startedAt, item.endedAt))}${item.endedAt ? "" : " · OPEN"}</strong></div>`).join("")}</div><div class="jobsReviewBanner" style="margin-top:12px;"><b>Total Job time: ${duration(totalMinutes(job))}</b></div>` : empty("timer", "No Job time yet", "No work sessions recorded.")); }
  function jobCardTab(job) { return `<article class="jobsDetailPanel jobsPrintPanel"><div class="jobsPanelHead" style="padding:0 0 14px;border:0;"><div><h2>Job Card</h2><p>Preview the completed field record.</p></div>${role === "admin" ? `<button class="platformBtn inline jobsBtn primary" data-action="print" type="button"><i class="ph ph-download-simple"></i>Download PDF</button>` : ""}</div>${jobCardPaper(job)}</article>`; }

  function field(label, value) { return `<div class="jobsFieldCard"><span>${label}</span><p>${h(value || "Not provided").replace(/\n/g, "<br>")}</p></div>`; }
  function dataRows(items, renderer) { return items.length ? `<div class="jobsDataList">${items.map((item) => `<div class="jobsDataRow">${renderer(item)}</div>`).join("")}</div>` : empty("tray", "Nothing recorded", "Entries will appear here chronologically."); }
  function timeline(actor, summary, at) { return `<div class="jobsTimelineItem"><b>${h(summary)}</b><div class="jobsTimelineMeta"><span>${h(actor)}</span><span>•</span><span>${localDateTime(at)}</span></div></div>`; }
  function initials(name) { return String(name || "?").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
  function empty(icon, title, copy) { return `<div class="jobsEmpty"><i class="ph ph-${icon}"></i><b>${h(title)}</b><span>${h(copy)}</span></div>`; }

  function workDaysMarkup(job) {
    if (!job.workDays.length) return empty("calendar-blank", "No completed work days", "Finish Work for Today to preserve the first daily record.");
    return `<div class="jobsDayList">${job.workDays.map((day, index) => {
      const sessions = day.sessionIds?.length
        ? job.sessions.filter((item) => day.sessionIds.includes(item.id))
        : job.sessions.filter((item) => item.startedAt.slice(0, 10) === day.date);
      const start = sessions.length ? timeOnly(sessions[0].startedAt) : "—";
      const end = sessions.length ? timeOnly(sessions[sessions.length - 1].endedAt) : "—";
      const linked = { ...job, materials: job.materials.filter((item) => day.materialIds.includes(item.id)), photos: job.photos.filter((item) => day.photoIds.includes(item.id)), testing: job.testing.filter((item) => (day.testingIds || []).includes(item.id)) };
      const evidence = linked.materials.length + linked.photos.length + linked.testing.length;
      return `<article class="jobsDayCard"><div class="jobsDayHead"><b>Day ${index + 1} · ${localDate(day.date)}</b><span>${start} – ${end} · ${duration(sessions.reduce((sum, item) => sum + minutesBetween(item.startedAt, item.endedAt), 0))}</span></div><div class="jobsDayBody"><h4>Work performed</h4><p>${h(day.work)}</p>${day.notes ? `<h4>Notes / outstanding work</h4><p>${h(day.notes)}</p>` : ""}${evidence ? `<details class="jobsEvidenceDisclosure"><summary>Day's evidence <span>${linked.materials.length} materials · ${linked.testing.length} results · ${linked.photos.length} photos</span></summary><div class="jobsEvidenceBody">${linked.materials.length ? materialsTab(linked, true) : ""}${linked.testing.length ? testingTab(linked, true) : ""}${linked.photos.length ? photosTab(linked, true) : ""}</div></details>` : `<div class="jobsDayLinks"><span>No supporting entries</span></div>`}</div></article>`;
    }).join("")}</div>`;
  }

  function jobCardCompany() {
    let company = null;
    try { company = typeof currentCompany === "function" ? currentCompany() : null; } catch {}
    if(!company&&!isMockMode)company=currentJobsContext()?.company;
    return {
      name: String(company?.name || (isMockMode ? "Demo Service Company" : "Company")),
      logoUrl: String(company?.logo_url || "").trim()
    };
  }

  function jobCardPaper(job) {
    job = job.cardSnapshot || job;
    const company = job.company || jobCardCompany();
    const companyLogo = company.logoUrl ? `<img class="jobsPaperCompanyLogo" src="${h(company.logoUrl)}" alt="${h(company.name)} logo"/>` : "";
    return `<div class="jobsJobCardPaper">
      <div class="jobsPaperHead"><div class="jobsPaperBrand">${companyLogo}<div class="jobsPaperBrandText"><b>${h(company.name)}</b><span>DIGITAL JOB CARD</span></div></div><div class="jobsPaperNumber"><span>JOB CARD</span><b>${h(job.jobNumber)}</b>${statusBadge(job)}</div></div>
      <div class="jobsPaperSection jobsPaperGrid"><div><span>Client</span><b>${h(job.clientName)}</b></div><div><span>Job title</span><b>${h(job.title)}</b></div><div><span>Site</span><b>${h(job.site || "Not linked")}</b></div><div><span>Service address</span><b>${h(job.serviceAddress)}</b></div><div><span>Client contact</span><b>${h(job.clientContactName)} · ${h(job.clientPhone)}</b></div><div><span>Lead supervisor</span><b>${h(job.lead?.name || "Unassigned")}</b></div></div>
      <div class="jobsPaperSection"><h3>Client request</h3><p>${h(job.description)}</p></div>
      <div class="jobsPaperSection"><h3>Work carried out</h3>${job.workDays.map((day, index) => `<p><b>Day ${index + 1} · ${localDate(day.date)}</b><br>${h(day.work)}${day.notes ? `<br><i>${h(day.notes)}</i>` : ""}</p>`).join("<br>") || "<p>No work record.</p>"}</div>
      <div class="jobsPaperSection"><h3>Materials</h3>${paperTable(["Description", "Quantity", "Unit"], job.materials.map((item) => [item.description, item.quantity, item.unit]))}</div>
      <div class="jobsPaperSection"><h3>Testing & results</h3>${paperTable(["Check", "Result", "Note"], job.testing.map((item) => [item.description, item.result, item.note || "-"]))}</div>
      <div class="jobsPaperSection"><h3>Notes</h3>${job.notes.map(n=>`<p>${h(n.text)}</p>`).join('')||'<p>None recorded.</p>'}</div>
      <div class="jobsPaperSection"><h3>Work sessions</h3>${paperTable(["Team member", "Start", "Finish", "Duration"], job.sessions.map((item) => [item.employeeName, localDateTime(item.startedAt), item.endedAt ? localDateTime(item.endedAt) : "Open", duration(minutesBetween(item.startedAt, item.endedAt))]))}<p style="margin-top:10px"><b>Total Job time: ${duration(totalMinutes(job))}</b></p></div>
      <div class="jobsPaperSection"><h3>Team</h3><p>${job.team.map((person) => `${h(person.name)} (${h(person.employeeId)})`).join(", ")}</p></div>
      <div class="jobsPaperSection"><h3>Photos</h3><p>${job.photos.length} photo record${job.photos.length === 1 ? "" : "s"}: ${job.photos.map((item) => h(item.category)).join(", ") || "None"}</p></div>
      <div class="jobsPaperSection jobsPaperGrid"><div><span>Client sign-off</span><b>${job.signoff ? h(job.signoff.unavailable ? `Unavailable — ${job.signoff.reason}` : job.signoff.clientName) : "Not captured"}</b></div><div><span>Completion</span><b>${job.completion ? `${h(job.completion.by)} · ${localDateTime(job.completion.at)}` : "Pending"}</b></div></div>
      <div class="jobsPaperFooter"><span>${h(company.name)}</span><span>Generated by Shiftly</span></div>
    </div>`;
  }

  function paperTable(headings, rows) { return rows.length ? `<table class="jobsPaperTable"><thead><tr>${headings.map((value) => `<th>${h(value)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((value) => `<td>${h(value)}</td>`).join("")}</tr>`).join("")}</tbody></table>` : `<p>None recorded.</p>`; }

  function openJob(id, loaded = false) {
    if (!isMockMode && !loaded) return loadLiveDetail(id);
    if (isMockMode && !state.jobs.some((job) => job.id === id)) return;
    detailReturnSurface = allJobsWorkspace ? "all-jobs" : "dashboard";
    if (detailReturnSurface === "all-jobs") {
      allJobsScroll = allJobsWorkspace.querySelector(".jobsAllJobsBody")?.scrollTop || 0;
      allJobsFocus = document.activeElement?.closest('[data-action="open"]') || allJobsWorkspace.querySelector(`[data-action="open"][data-id="${id}"]`);
      allJobsWorkspace.inert = true;
    } else {
      dashboardScroll = window.scrollY;
      dashboardFocus = document.activeElement;
      savedBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    if (detailReturnSurface === "dashboard") dashboardDirty = false;
    selectedJobId = id;
    const job = selectedJob();
    activeTab = role === "admin" && job.status === "submitted_for_review" ? "review" : role === "supervisor" && currentSession(job) ? "today" : "overview";
    screen = "detail";
    renderDetail();
    workspace.querySelector('[data-action="dashboard"]').focus({ preventScroll: true });
  }

  function closeJob() {
    if (!isMockMode) { liveRequest++;liveDetail=null;selectedJobId=''; }
    if (!workspace) return;
    closeModal();
    const returnToAllJobs = detailReturnSurface === "all-jobs" && allJobsWorkspace;
    const focusSource = returnToAllJobs ? allJobsFocus : dashboardFocus;
    const openerId = focusSource?.closest('[data-action="open"]')?.dataset.id;
    workspace.remove(); workspace = null;
    screen = "dashboard"; selectedJobId = "";
    if (returnToAllJobs) {
      if (dashboardDirty) renderAllJobs();
      allJobsWorkspace.inert = false;
      const opener = [...allJobsWorkspace.querySelectorAll('[data-action="open"]')].find((el) => el.dataset.id === openerId && el.getClientRects().length);
      (opener || allJobsWorkspace.querySelector("#jobsSearch"))?.focus({ preventScroll: true });
      allJobsWorkspace.querySelector(".jobsAllJobsBody").scrollTop = allJobsScroll;
      detailReturnSurface = "dashboard";
      return;
    }
    document.body.style.overflow = savedBodyOverflow;
    if (dashboardDirty) render();
    else root.querySelector(".jobsApp").inert = false;
    const opener = [...root.querySelectorAll('[data-action="open"]')].find((el) => el.dataset.id === openerId);
    (opener || root.querySelector("button"))?.focus({ preventScroll: true });
    window.scrollTo({ top: dashboardScroll, behavior: "instant" });
    detailReturnSurface = "dashboard";
  }
  function updateJob() {
    if (!isMockMode) return; // Live workflows refresh authoritative adapter data.
    state = mockState(); dashboardDirty = true; renderDetail();
  }

  function openModal({ title, copy = "", body, submitLabel = "Save", tone = "primary", onSubmit, planning = false }) {
    if (!isMockMode && !(planning && canOperate())) { toast('This workflow is unavailable in this checkpoint.'); return; }
    modalPlanning=planning;
    modalSubmit = onSubmit;
    modal.innerHTML = `<div class="jobsModalCard ${title === "Create Job" ? "jobsCreateModal" : ""}" role="dialog" aria-modal="true" aria-labelledby="jobsModalTitle"><form id="jobsModalForm"><div class="jobsModalHead"><div><h2 id="jobsModalTitle">${h(title)}</h2>${copy ? `<p>${h(copy)}</p>` : ""}</div><button class="jobsIconBtn" type="button" data-modal-close aria-label="Close"><i class="ph ph-x"></i></button></div><div class="jobsModalBody">${body}</div><div class="jobsModalActions"><button class="platformBtn inline jobsBtn secondary" type="button" data-modal-close>Cancel</button><button class="platformBtn inline jobsBtn ${tone}" type="submit">${h(submitLabel)}</button></div></form></div>`;
    syncCreateLead();
    modal.hidden = false; modal.setAttribute("aria-hidden", "false");
    if (workspace) workspace.inert = true;
    setTimeout(() => modal.querySelector("input,textarea,select,button")?.focus(), 0);
  }

  function closeModal() { modal.hidden = true; modal.setAttribute("aria-hidden", "true"); modal.innerHTML = ""; modalSubmit = null; if (workspace) { if(!isMockMode && liveDetail)renderDetail(); workspace.inert = false; workspace.querySelector('.jobsWorkspaceCard')?.focus({ preventScroll: true }); } }
  const label = (name, text, input, wide = false) => `<label class="jobsLabel ${wide ? "wide" : ""}">${text}${input.replace("NAME", name)}</label>`;
  const input = (type, placeholder = "", required = false, value = "") => `<input class="jobsInput" name="NAME" type="${type}" placeholder="${h(placeholder)}" value="${h(value)}" ${required ? "required" : ""}/>`;

  function createJobModal() {
    const directories = getDirectories();
    if (!directories) { toast('Jobs directories are not available yet.'); return; }
    openModal({ title: "Create Job", submitLabel: "Create Job", body: createJobFields(directories), onSubmit: async (data) => {
      if (!isMockMode || !dataService) throw new Error('Jobs backend connection is not active.');
      if(modal.querySelector('[name="scheduleIntent"]').checked && !data.get('scheduled')) throw new Error('Choose a date to schedule this Job.');
      const job = await dataService.create({ title: data.get("title"), clientName: data.get("clientName"),
        clientContactName: data.get("contactName"), clientPhone: data.get("phone"), clientEmail: data.get("email"),
        siteId: data.get("site"), site: directories.sites.find(site=>site.siteId===data.get("site"))?.name || "", scheduleRequested: modal.querySelector('[name="scheduleIntent"]').checked, serviceAddress: data.get("address"), scheduledDate: data.get("scheduled"),
        scheduledTime: data.get("scheduledTime"), priority: data.get("priority"), description: data.get("description"),
        teamIds: data.getAll("team"), leadId: data.get("lead") });
      state = mockState(); closeModal(); toast(`${job.jobNumber} created`); openJob(job.id); dashboardDirty = true;
    }});
  }

  function syncCreateLead() {
    const select=modal.querySelector('.jobsCreateSections [name="lead"]');
    if(!select)return;
    modal.querySelectorAll('.jobsTeamPicker input[name="team"]').forEach(box=>{
      const card=box.closest('label'),subtitle=card.querySelector('small');
      if(!subtitle.dataset.original)subtitle.dataset.original=subtitle.textContent;
      const isLead=!!select.value&&box.value===select.value;
      if(isLead)box.checked=true;
      subtitle.textContent=isLead?`Lead Technician · ${box.value}`:subtitle.dataset.original;
    });
  }

  function createJobFields(directories) {
    return `<div class="jobsCreateSections">
      <section><h3>Job</h3><div class="jobsFormGrid jobsFormGridThree">${label("title", "Job Title", input("text", "e.g. DB board repair", true), true)}${label("priority", "Priority", `<select class="jobsInput" name="NAME"><option value="normal">Normal</option><option value="low">Low</option><option value="high">High</option><option value="urgent">Urgent</option></select>`)}${label("scheduled", "Scheduled Date", input("date"))}${label("scheduledTime", "Scheduled Time (optional)", input("time"))}<label class="jobsCheck jobsCreateSchedule"><input type="checkbox" name="scheduleIntent" value="yes"/><span>Schedule this Job</span></label>${label("site", "Shiftly Site (optional)", `<select class="jobsInput" name="NAME"><option value="">No linked site</option>${directories.sites.map(site=>`<option value="${h(site.siteId)}">${h(site.name)}</option>`).join("")}</select>`, true)}</div></section>
      <section><h3>Client</h3><div class="jobsFormGrid">${label("clientName", "Client Name", input("text", "e.g. Demo Engineering", true))}${label("contactName", "Contact Name", input("text", "Contact person"))}${label("phone", "Phone", input("tel", "+27"))}${label("email", "Email", input("email", "name@example.test"))}${label("address", "Service Address", input("text", "Street / area / province", true), true)}</div></section>
      <section><h3>Work Required</h3>${label("description", "Client Request / Job Description", `<textarea class="jobsInput" name="NAME" placeholder="What must the field team do?" required></textarea>`, true)}</section>
      <section><h3>Assign Team</h3><div class="jobsFormGrid">${label("lead", "Lead Supervisor", `<select class="jobsInput" name="NAME">${!isMockMode ? '<option value="">Select eligible lead</option>' : ''}${directories.leads.map(person=>`<option value="${h(person.employeeId)}">${h(person.supervisorId ? `${person.supervisorId} · ${person.name}` : person.name)}</option>`).join("")}</select>`)}<label class="jobsLabel">Find Team Members<input id="jobsTeamSearch" class="jobsInput" type="search" placeholder="Search employees"/></label></div><div class="jobsTeamPicker">${directories.team.map((person) => `<label class="jobsCheck" data-team-option="${h(`${person.name} ${person.role}`.toLowerCase())}"><input type="checkbox" name="team" value="${person.employeeId}"/><span><b>${h(person.name)}</b><small>${h(person.role)} · ${h(person.employeeId)}</small></span></label>`).join("")}</div></section>
    </div>`;
  }

  async function planningDirectories() {
    if(!canPlan())throw new Error('Job planning is unavailable.');
    if(directoryCache)return directoryCache;
    const key=JSON.stringify(liveContext()),request=++directoryRequest;
    toast('Loading company sites and technicians…');
    const data=await liveAdapter.directories();
    if(key!==JSON.stringify(liveContext()) || request!==directoryRequest || !canPlan())return null;
    directoryCache=data;return data;
  }

  function validatePlanCreate(data,dirs) {
    if(!data.title?.trim()||!data.clientName?.trim())throw new Error('Title and client name are required.');
    if(data.siteId&&!dirs.sites.some(s=>s.siteId===data.siteId))throw new Error('Choose a current company site.');
    if(!dirs.leads.some(e=>e.employeeId===data.leadId))throw new Error('Choose an eligible Lead Technician.');
    if(new Set(data.teamIds).size!==data.teamIds.length)throw new Error('Duplicate technician selection.');
    if(data.teamIds.some(id=>!dirs.team.some(e=>e.employeeId===id)))throw new Error('Choose current company technicians.');
    if(data.scheduleRequested && !data.scheduledDate)throw new Error('Choose a schedule start date.');
    if(data.scheduleRequested)planDate(data.scheduledDate,data.scheduledTime);
    return {...data,siteId:data.siteId||null,teamIds:data.teamIds.includes(data.leadId)?data.teamIds:[data.leadId,...data.teamIds]};
  }
  function planDate(date,time='08:00') {
    const value=`${date}T${time||'08:00'}:00+02:00`;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!Number.isFinite(Date.parse(value)))throw new Error('Choose a valid date and time.');
    return value;
  }
  function planningError(message,refresh=false) {
    let box=modal.querySelector('.jobsPlanningError');
    if(!box){box=document.createElement('div');box.className='jobsPlanningError jobsReviewBanner correction';box.setAttribute('role','alert');modal.querySelector('.jobsModalBody')?.prepend(box);}
    box.innerHTML=`<p>${h(message)}</p>${refresh?'<button type="button" class="platformBtn inline jobsBtn secondary" data-plan-refresh>Refresh authoritative state</button>':''}`;
  }
  function lockPlanningForm(locked) {
    modal.querySelectorAll('input,select,textarea,button').forEach(el=>{el.disabled=locked;});
    const submit=modal.querySelector('button[type="submit"]');if(submit)submit.disabled=locked||planningRefreshRequired;
    const create=root.querySelector('[data-action="plan-create"]');if(create)create.disabled=locked||planningRefreshRequired||!canPlan();
  }
  async function fetchPlanningState(jobId) {
    const rows=await liveAdapter.dashboard();
    const detail=jobId?await liveAdapter.detail(jobId):null;
    const workerActive=liveContext().role==='supervisor'?await liveAdapter.workEligibility():false;
    return {rows,detail,workerActive};
  }
  async function refreshPlanning() {
    if(!canOperate()||planningPending)return;
    planningPending=true;lockPlanningForm(true);const key=JSON.stringify(liveContext());
    try {
      const fresh=await fetchPlanningState(planningJobId);
      if(key!==JSON.stringify(liveContext())||!canOperate())return;
      liveWorkerActive=fresh.workerActive;
      if(fresh.detail&&!currentSession(fresh.detail))liveDrafts.delete(fresh.detail.id);
      state={jobs:fresh.rows,sequence:0};if(fresh.detail)liveDetail=fresh.detail;
      planningRefreshRequired=false;
      if(fresh.detail&&['completed','cancelled'].includes(fresh.detail.status)){
        closeModal();closeJob();liveStatus='ready';renderLiveList();liveDetail=fresh.detail;openJob(fresh.detail.id,true);return;
      }
      planningError('Authoritative state refreshed. Check these records before deliberately retrying: '+fresh.rows.map(j=>`${j.jobNumber}: ${j.title}`).join('; '));
    }catch(error){if(key===JSON.stringify(liveContext())){if(window.ShiftlyJobsData.errorState(error).category==='ACCESS_DENIED')await liveReadFailure(error);else planningError('Refresh failed. Do not resubmit until authoritative state can be checked.',true);}}
    finally{if(key===JSON.stringify(liveContext())){planningPending=false;lockPlanningForm(false);}}
  }
  async function submitPlanning(action,data) {
    if(!canOperate()||planningPending||planningRefreshRequired)return;
    planningPending=true;lockPlanningForm(true);const key=JSON.stringify(liveContext()),adapter=liveAdapter;
    try {await action(data);}
    catch(error){if(adapter===liveAdapter&&key===JSON.stringify(liveContext())&&canOperate()&&!shell.hidden)planningError(error.message||'Unable to submit Job action.');}
    finally{if(adapter===liveAdapter&&key===JSON.stringify(liveContext())){planningPending=false;lockPlanningForm(false);}}
  }
  async function planningMutation(method,args,jobId='') {
    if(!canOperate()||!['create','assign','replaceLead','unassign','schedule','start','finish','adminCloseSession','submit','resubmit','returnCorrection','approve','cancel'].includes(method))throw new Error('Workflow unavailable.');
    if(planningRefreshRequired)throw new Error('Refresh authoritative state before retrying.');
    if(method!=='create') {
      const job=liveDetail;
      if(!job?.detailLoaded||job.id!==jobId||args[0]!==job.id||args[1]!==job.revision)throw new Error('Refresh this Job before continuing.');
      if(['completed','cancelled'].includes(job.status))throw new Error('Closed Job is read-only.');
      if(['assign','replaceLead','unassign'].includes(method)&&job.status==='submitted_for_review')throw new Error('Return Job for correction before changing team.');
      if(method==='schedule'&&!['draft','scheduled'].includes(job.status))throw new Error('Only draft or scheduled Jobs can be scheduled.');
      if(method==='replaceLead'&&openSessions(job).length)throw new Error('Finish all open Job sessions before replacing the lead.');
      if(method==='unassign'&&(job.lead?.employeeId===args[2]||!job.team.some(e=>e.employeeId===args[2])||openSessions(job).some(s=>s.employeeId===args[2])))throw new Error('Choose an assigned non-lead technician without an open session.');
      if(method==='start'&&(currentSession(job)||!['scheduled','in_progress','correction_required'].includes(job.status)))throw new Error('Start is no longer available.');
      if(method==='finish'&&(!currentSession(job)||job.status!=='in_progress'||!args[2]?.trim()))throw new Error('Own open session and meaningful work required.');
      if(method==='adminCloseSession'&&(!['in_progress','correction_required'].includes(job.status)||!openSessions(job).some(s=>s.id===args[2])||!args[3]?.trim()))throw new Error('Open session and recovery reason required.');
    }
    if(['submit','resubmit','returnCorrection','approve','cancel'].includes(method)){if(!reviewAllowed(method))throw new Error('This lifecycle action is no longer available. Refresh the Job.');}
    else if(['start','finish'].includes(method)){if(!canExecute())throw new Error('Assigned active Supervisor required.');}
    else if(!canPlan())throw new Error('Manager required.');
    const key=JSON.stringify(liveContext()),adapter=liveAdapter;
    const current=()=>adapter===liveAdapter&&key===JSON.stringify(liveContext())&&canOperate()&&!shell.hidden;
    let confirmed=false;
    try {
      const result=await liveAdapter[method](...args);confirmed=true;
      if(!current())return;
      if(method==='finish')liveDrafts.delete(jobId);
      const id=method==='create'?result.id:jobId;
      planningJobId=id;
      const fresh=await fetchPlanningState(id);
      if(!current())return;
      closeModal();closeJob();state={jobs:fresh.rows,sequence:0};liveWorkerActive=fresh.workerActive;livePage={offset:0,limit:25,hasMore:fresh.rows.length===25};
      liveStatus='ready';renderLiveList();liveDetail=fresh.detail;openJob(id,true);toast('Job action saved.');
    }catch(error){
      if(!current())return;
      const failure=window.ShiftlyJobsData.errorState(error);
      if(failure.category==='ACCESS_DENIED'){await liveReadFailure(error);return;}
      if(confirmed || failure.category==='NETWORK_OR_UNKNOWN') {
        planningRefreshRequired=true;
        planningError(confirmed?'Saved, but refreshed state could not be loaded. Do not submit again. Refresh and close this form.':'Outcome could not be confirmed. Do not submit again until you refresh and check whether it succeeded.',true);
        // A confirmed create must never become a second create via this form.
        if(confirmed){modalSubmit=async()=>{closeModal();await loadLiveList(0);};modal.querySelector('button[type="submit"]').textContent='Return to Jobs';}
      } else if(['STALE_REVISION','CONFLICT'].includes(failure.category)||(method==='cancel'&&failure.category==='VALIDATION')) {
        try{const fresh=await fetchPlanningState(jobId);if(!current())return;state={jobs:fresh.rows,sequence:0};liveDetail=fresh.detail;liveWorkerActive=fresh.workerActive;
          if(fresh.detail&&['completed','cancelled'].includes(fresh.detail.status)){planningRefreshRequired=false;closeModal();closeJob();liveStatus='ready';renderLiveList();liveDetail=fresh.detail;openJob(fresh.detail.id,true);return;}
          if(method==='cancel'&&failure.category==='VALIDATION'){planningError(`${failure.message} Refreshed open sessions: ${openSessions(fresh.detail).map(s=>s.employeeName||s.employeeId).join(', ')||'none returned'}. No session was closed.`);return;}
          planningError(failure.category==='STALE_REVISION'?'Job changed. Authoritative state refreshed; review your input and deliberately retry.':method==='start'?'You already have an open Job session. No session was closed or switched. Check your Jobs before retrying.':'Conflicting assignment. Authoritative state refreshed; review your selection.');}
        catch(refreshError){if(!current())return;if(window.ShiftlyJobsData.errorState(refreshError).category==='ACCESS_DENIED'){await liveReadFailure(refreshError);return;}planningRefreshRequired=true;planningError('Job changed. Refresh authoritative state before retrying.',true);}
      }else planningError(failure.message);
    }
  }
  async function openPlanning(action) {
    if(!canPlan()||planningPending)return;
    if(planningRefreshRequired){await loadLiveList(0);toast('Refresh the authoritative list and check the previous result before retrying.');return;}
    const key=JSON.stringify(liveContext());
    try {
      const dirs=await planningDirectories();if(!dirs||key!==JSON.stringify(liveContext()))return;
      planningJobId=action==='create'?'':liveDetail?.id||'';
      const options=people=>people.map(e=>`<option value="${h(e.employeeId)}">${h(e.name)}</option>`).join('');
      if(action==='create') {
        openModal({planning:true,title:'Create Job',submitLabel:'Create Job',body:createJobFields(dirs),onSubmit:async form=>{
          const data=validatePlanCreate({title:form.get('title'),clientName:form.get('clientName'),clientContactName:form.get('contactName'),clientEmail:form.get('email'),clientPhone:form.get('phone'),siteId:form.get('site'),serviceAddress:form.get('address'),description:form.get('description'),priority:form.get('priority'),leadId:form.get('lead'),teamIds:form.getAll('team'),scheduleRequested:modal.querySelector('[name="scheduleIntent"]').checked===true,scheduledDate:form.get('scheduled'),scheduledTime:form.get('scheduledTime')},dirs);
          await planningMutation('create',[data]);
        }});return;
      }
      const job=liveDetail;if(!job||['completed','cancelled','submitted_for_review'].includes(job.status))return;
      if(action==='schedule') {
        if(!['draft','scheduled'].includes(job.status))return;
        openModal({planning:true,title:'Schedule / reschedule Job',submitLabel:'Save schedule',body:`<p>Times use South Africa time (UTC+02:00).</p><div class="jobsFormGrid">${label('startDate','Start date',input('date','',true,job.scheduledDate))}${label('startTime','Start time',input('time','',true,job.scheduledTime||'08:00'))}${label('endDate','End date (optional)',input('date'))}${label('endTime','End time (optional)',input('time'))}</div>`,onSubmit:async form=>{
          const start=planDate(form.get('startDate'),form.get('startTime'));
          if(form.get('endTime')&&!form.get('endDate'))throw new Error('Choose an end date.');
          const end=form.get('endDate')?planDate(form.get('endDate'),form.get('endTime')):null;
          if(end&&Date.parse(end)<Date.parse(start))throw new Error('End must not precede start.');
          await planningMutation('schedule',[job.id,liveDetail.revision,start,end],job.id);
        }});return;
      }
      openModal({planning:true,title:'Manage technicians',submitLabel:'Apply team change',body:`<p>Lead Technician: ${h(job.lead?.name||'Unassigned')}. Replace the lead atomically; lead removal is not offered.</p><div class="jobsFormGrid">${label('operation','Change','<select name="NAME" class="jobsInput"><option value="assign">Add assigned technician</option><option value="replaceLead">Replace Lead Technician</option><option value="unassign">Remove assigned technician</option></select>')}${label('employee','Assigned Technician',`<select name="NAME" class="jobsInput">${options(dirs.team)}</select>`)}${label('lead','Eligible Lead Technician',`<select name="NAME" class="jobsInput">${options(dirs.leads)}</select>`)}</div>`,onSubmit:async form=>{
        const method=form.get('operation'),id=method==='replaceLead'?form.get('lead'):form.get('employee');
        if(!['assign','replaceLead','unassign'].includes(method))throw new Error('Invalid team operation.');
        if(!(method==='replaceLead'?dirs.leads:dirs.team).some(e=>e.employeeId===id))throw new Error('Choose an eligible technician.');
        if(method==='unassign'&&(liveDetail.lead?.employeeId===id||!liveDetail.team.some(e=>e.employeeId===id)))throw new Error('Choose an assigned non-lead technician.');
        if(method==='assign'&&liveDetail.team.some(e=>e.employeeId===id))throw new Error('Technician is already assigned.');
        await planningMutation(method,[job.id,liveDetail.revision,id,...(method==='assign'?['member']:[])],job.id);
      }});
    }catch(error){if(key===JSON.stringify(liveContext())){if(window.ShiftlyJobsData.errorState(error).category==='ACCESS_DENIED')await liveReadFailure(error);else toast(error.message||'Directories unavailable.');}}
  }

  function openExecution(action,sessionId='') {
    if(!canOperate()||planningPending)return;
    if(planningRefreshRequired){toast('Refresh authoritative state before retrying.');return;}
    const job=liveDetail;if(!job)return;
    const own=currentSession(job);
    if(action==='start'&&(!canExecute(job)||own||!['scheduled','in_progress','correction_required'].includes(job.status)))return;
    if(action==='finish'&&(!canExecute(job)||!own||job.status!=='in_progress'))return;
    if(action==='recover'&&(!canPlan()||!['in_progress','correction_required'].includes(job.status)||!openSessions(job).some(s=>s.id===sessionId)))return;
    planningJobId=job.id;
    const title=action==='start'?(job.status==='scheduled'?'Start Job':'Continue Job'):action==='finish'?'Finish Work for Today':'Emergency Close Session';
    const body=action==='start'?'<p>Start a Job work session. This does not clock you in for attendance.</p>':action==='finish'?`${label('work','Work performed','<textarea name="NAME" class="jobsInput" required></textarea>')}${label('notes','Notes','<textarea name="NAME" class="jobsInput"></textarea>')}`:`<p>Emergency recovery only. The original start time is preserved; the backend records the end time and audit reason.</p>${label('reason','Required recovery reason','<textarea name="NAME" class="jobsInput" required></textarea>')}<label class="jobsCheck"><input type="checkbox" name="confirmRecovery"/>I confirm emergency closure of this selected session.</label>`;
    openModal({planning:true,title,body,submitLabel:title,onSubmit:async form=>{
      const current=liveDetail;
      if(!current||current.id!==job.id)throw new Error('Refresh this Job before continuing.');
      if(action==='start') {
        if(!canExecute(current)||currentSession(current)||!['scheduled','in_progress','correction_required'].includes(current.status))throw new Error('Start is no longer available. Check the refreshed session.');
        await planningMutation('start',[current.id,current.revision],current.id);
      }else if(action==='finish') {
        if(!canExecute(current)||!currentSession(current)||currentSession(current).id!==own.id||current.status!=='in_progress')throw new Error('No own open session matching this work form is available.');
        if(!form.get('work')?.trim())throw new Error('Work performed is required.');
        await planningMutation('finish',[current.id,current.revision,form.get('work').trim(),form.get('notes')||''],current.id);
      }else {
        if(!canPlan()||!['in_progress','correction_required'].includes(current.status)||!openSessions(current).some(s=>s.id===sessionId))throw new Error('Selected open session is unavailable.');
        if(!form.get('reason')?.trim()||modal.querySelector('[name="confirmRecovery"]').checked!==true)throw new Error('A reason and explicit confirmation are required.');
        await planningMutation('adminCloseSession',[current.id,current.revision,sessionId,form.get('reason').trim()],current.id);
      }
    }});
    if(action==='finish') {
      const draft=job.currentDraft||liveDrafts.get(job.id);
      if(draft){modal.querySelector('[name="work"]').value=draft.work||'';modal.querySelector('[name="notes"]').value=draft.notes||'';}
    }
  }

  async function startJob(job) {
    if (!isMockMode) throw new Error('Jobs is read-only in this checkpoint.');
    await dataService.start(job.id, job.revision);
    activeTab = "today"; updateJob(); toast("Work session started");
  }

  async function finishWork(job, open, work, notes) {
    if (!isMockMode) throw new Error('Jobs is read-only in this checkpoint.');
    await dataService.finish(job.id, job.revision, work, notes);
    activeTab = "records"; closeModal(); updateJob(); toast("Today's work saved");
  }

  function finishModal(job) {
    const open = currentSession(job); if (!open) return toast("No open session was found.");
    openModal({ title: "Finish Work for Today", submitLabel: "Finish Work", body: `<div class="jobsFormGrid">${label("work", "Work performed today", `<textarea class="jobsInput" name="NAME" required placeholder="Describe the work completed during this session">${h(job.currentDraft?.work || "")}</textarea>`, true)}${label("notes", "Notes / next step", `<textarea class="jobsInput" name="NAME" placeholder="Outstanding work, access notes or handover">${h(job.currentDraft?.notes || "")}</textarea>`, true)}</div>`, onSubmit: (data) => finishWork(job, open, data.get("work"), data.get("notes"))});
  }

  function submitReviewModal(job) {
    const open = openSessions(job);
    const blocked = open.length > 0;
    openModal({ title: job.status === "correction_required" ? "Resubmit Job for Review" : "Submit Job for Review", copy: "This is different from finishing work for today.", submitLabel: blocked ? "Blocked by open work" : "Submit for Review", body: `${blocked ? `<div class="jobsReviewBanner correction"><b>Submission blocked</b><p>Open sessions: ${open.map((item) => h(item.employeeName)).join(", ")}. Do not auto-close another person's session.</p></div>` : `<div class="jobsReviewBanner"><b>Ready for admin review</b><p>${job.workDays.length} work day records · ${job.materials.length} materials · ${job.photos.length} photos · ${job.testing.length} tests · ${duration(totalMinutes(job))} total time.</p></div>`}<div class="jobsDetailGrid" style="margin-top:12px">${field("Client sign-off", job.signoff ? (job.signoff.unavailable ? "Unavailable reason recorded" : "Captured") : "Not captured (optional)")}${field("Team", job.team.map((person) => person.name).join(", "))}</div>`,
      onSubmit: async () => { await dataService.submit(job.id,job.revision); closeModal(); updateJob(); toast("Job submitted for review"); } });
    if (blocked) modal.querySelector("button[type=submit]").disabled = true;
  }

  function returnCorrectionModal(job) {
    openModal({ title: "Return for Correction", copy: "The reason becomes part of the Job activity history.", submitLabel: "Return Job", tone: "danger", body: label("reason", "Correction reason", `<textarea class="jobsInput" name="NAME" required placeholder="Explain exactly what the field team must correct"></textarea>`, true),
      onSubmit: async data => { await dataService.returnCorrection(job.id,job.revision,data.get("reason")); closeModal(); updateJob(); toast("Job returned to Supervisor"); } });
  }

  function approveModal(job) {
    openModal({ title: "Approve & Complete", copy: "This finalises the mock Job and makes the completed Job Card available.", submitLabel: "Approve & Complete", tone: "success", body: `<div class="jobsDetailGrid">${field("Work days", String(job.workDays.length))}${field("Total Job time", duration(totalMinutes(job)))}${field("Materials", String(job.materials.length))}${field("Photos", String(job.photos.length))}${field("Testing entries", String(job.testing.length))}${field("Client sign-off", job.signoff ? "Recorded" : "Not recorded")}</div>`,
      onSubmit: async () => { await dataService.approve(job.id,job.revision,jobCardCompany()); closeModal(); activeTab="card"; updateJob(); toast("Job approved and completed"); } });
  }

  function simpleEntryModal(kind, config) {
    const job = selectedJob(); if (!job) return;
    openModal({ ...config, onSubmit: async data => { await config.save(job,data); closeModal(); updateJob(); toast(`${kind} added locally`); } });
  }

  function addWorkModal() { toast("Use Finish Work for Today to save a work record with its session."); }
  function addMaterialModal() { simpleEntryModal("Material", { title:"Add Material",submitLabel:"Add Material",
    body: `<div class="jobsFormGrid">${label("description", "Description", input("text", "e.g. Weatherproof isolator", true), true)}${label("quantity", "Quantity", input("number", "1", true, "1"))}${label("unit", "Unit", `<select class="jobsInput" name="NAME"><option>unit</option><option>metres</option><option>m²</option><option>kg</option><option>litres</option><option>pack</option></select>`)}</div>`,
    save:(job,data)=>dataService.evidence(job.id,job.revision,"material",{description:data.get("description"),quantity:Number(data.get("quantity")),unit:data.get("unit")}) }); }
  function addTestModal() { simpleEntryModal("Test result", { title:"Add Test / Check",submitLabel:"Add Result",
    body: `<div class="jobsFormGrid">${label("description", "Test / check description", input("text", "e.g. Insulation resistance", true), true)}${label("result", "Result", input("text", "PASS / reading", true))}${label("note", "Note", input("text", "Optional supporting detail"))}</div>`,
    save:(job,data)=>dataService.evidence(job.id,job.revision,"test",{description:data.get("description"),result:data.get("result"),note:data.get("note")}) }); }
  function addPhotoModal() { if(!mediaAvailable()){toast('Media will be available in a later phase.');return;} simpleEntryModal("Photo", { title:"Add Photo",submitLabel:"Add Photo",
    body: `<div class="jobsFormGrid">${label("category", "Category", `<select class="jobsInput" name="NAME"><option>Before</option><option>During</option><option>After</option><option>Other</option></select>`)}${label("note", "Optional note", input("text", "What does the photo show?"), true)}</div>`,
    save:(job,data)=>dataService.evidence(job.id,job.revision,"photo",{category:data.get("category"),note:data.get("note")}) }); }
  function addNoteModal() { simpleEntryModal("Note", { title:"Add Job Note",submitLabel:"Add Note",
    body: label("note", "Note", `<textarea class="jobsInput" name="NAME" required></textarea>`, true),
    save:(job,data)=>dataService.evidence(job.id,job.revision,"note",{text:data.get("note")}) }); }

  function signoffModal() {
    if(!mediaAvailable()){toast('Media will be available in a later phase.');return;}
    const job = selectedJob(); if (!job) return;
    openModal({ title: "Client Sign-off", copy: "Signature is optional. Record an unavailable reason when needed.", submitLabel: "Save Sign-off", body: `<div class="jobsFormGrid">${label("clientName", "Client Name", input("text", "Name of client representative", false, job.clientContactName || ""), true)}<label class="jobsCheck wide"><input id="jobsSignatureUnavailable" type="checkbox" name="unavailable"/>Client unavailable / no signature</label>${label("reason", "No-signature reason", input("text", "Optional reason"), true)}<div class="wide"><div class="jobsLabel" style="margin-bottom:6px">Signature area</div><canvas id="jobsSignatureCanvas" class="jobsSignature" width="640" height="180" aria-label="Client signature area"></canvas><button id="jobsClearSignature" class="platformBtn inline jobsBtn small secondary" type="button" style="margin-top:8px">Clear signature</button></div></div>`, onSubmit: async (data) => {
      const unavailable = data.get("unavailable") === "on"; const clientName = data.get("clientName").trim(); const canvas = modal.querySelector("#jobsSignatureCanvas");
      if (!unavailable && canvas.dataset.signed !== "true") throw new Error("Draw the client signature or record an unavailable reason.");
      await dataService.evidence(job.id,job.revision,"signoff",{clientName,unavailable,reason:data.get("reason"),
        signature:unavailable ? "" : clientName,signatureImage:unavailable ? "" : canvas.toDataURL("image/png")});
      closeModal(); updateJob(); toast("Client sign-off saved locally");
    }});
    initSignatureCanvas();
  }

  function initSignatureCanvas() {
    const canvas = modal.querySelector("#jobsSignatureCanvas"); if (!canvas) return;
    const ctx = canvas.getContext("2d"); let drawing = false;
    ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
    const point = (event) => { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height }; };
    canvas.addEventListener("pointerdown", (event) => { drawing = true; canvas.dataset.signed = "true"; canvas.setPointerCapture(event.pointerId); const p = point(event); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
    canvas.addEventListener("pointermove", (event) => { if (!drawing) return; const p = point(event); ctx.lineTo(p.x, p.y); ctx.stroke(); });
    canvas.addEventListener("pointerup", () => { drawing = false; });
    modal.querySelector("#jobsClearSignature")?.addEventListener("click", () => { ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.dataset.signed = "false"; });
  }

  function printJobCard() {
    activeTab = "card"; renderDetail(); document.body.classList.add("jobsPrinting");
    const done = () => document.body.classList.remove("jobsPrinting"); window.addEventListener("afterprint", done, { once: true }); setTimeout(() => { window.print(); setTimeout(done, 500); }, 50);
  }

  function toast(message) {
    const target = shell?.querySelector("#jobsToast"); if (!target) return;
    target.textContent = message; target.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => target.classList.remove("show"), 2600);
  }

  function hideOperationalShells() {
    ["authScreen", "platformShell", "portfolioShell", "companyAdminShell", "billingShell", "employeeShell", "appShell"].forEach((id) => { const element = document.getElementById(id); if (element) element.hidden = true; });
  }

  async function openJobs(nextRole, jobId = "") {
    const context = currentJobsContext();
    if (nextRole === "employee") return;
    if (!isMockMode) {
      ensureDom(); contextChanged();closeJob(); closeAllJobs(false); closeModal(); shell.hidden = true;
      state = {jobs:[],sequence:0};liveDrafts.clear();directoryCache=null;jobsViewState?.clear();
      if (!window.ShiftlyJobsData.canOpen(context)) { toast("Jobs is disabled or unavailable for this account."); return; }
      if (typeof sb === 'undefined') { toast('Existing Shiftly connection is unavailable.'); return; }
      liveAdapter?.clear();
      liveAdapter=window.ShiftlyJobsData.createSupabase({client:sb,getContext:liveContext,readOnly:true,planning:['owner','admin'].includes(context.role),execution:true,review:true});
      role=context.role==='supervisor'?'supervisor':'admin';
      watchHostNavigation();
      hideOperationalShells();shell.hidden=false;screen='dashboard';
      await loadLiveList(0);
      if(jobId && !shell.hidden) await loadLiveDetail(jobId);
      return;
    }
    if (!dataService) return;
    setLocalContext(nextRole); state = mockState();
    ensureDom(); closeJob(); closeAllJobs(false); role = nextRole === "supervisor" ? "supervisor" : "admin";
    try { if (typeof stopScanning === "function") await stopScanning(); } catch {}
    hideOperationalShells(); shell.hidden = false;
    screen = "dashboard"; selectedJobId = ""; render();
    if (jobId) openJob(jobId); else window.scrollTo(0, 0);
  }

  async function closeJobs(returnToHost=true) {
    hostNavigationObserver?.disconnect();
    if (!isMockMode) { liveRequest++;liveAdapter?.clear();liveAdapter=null;liveDetail=null;state={jobs:[],sequence:0};directoryRequest++;directoryCache=null;liveDrafts.clear();liveWorkerActive=false;planningPending=false; }
    closeJob(); closeAllJobs(false);
    shell.hidden = true; closeModal();
    if (!isMockMode) root.innerHTML='';
    if(!returnToHost)return;
    if (isLocalDevelopment && demoRoleFromUrl()) { const auth = document.getElementById("authScreen"); if (auth) auth.hidden = false; return; }
    try {
      const appRole = getAppRole();
      if (["owner", "admin"].includes(appRole) && typeof showCompanyAdminDashboard === "function") await showCompanyAdminDashboard();
      else if (appRole === "supervisor" && typeof bootWorkspace === "function") await bootWorkspace();
      else { const auth = document.getElementById("authScreen"); if (auth) auth.hidden = false; }
    } catch { const auth = document.getElementById("authScreen"); if (auth) auth.hidden = false; }
  }

  async function openBillingModule() {
    closeJob(); closeAllJobs(false);
    shell.hidden = true;
    closeModal();
    try { if (typeof showBillingDashboard === "function") await showBillingDashboard(); else throw new Error("Billing unavailable"); }
    catch { const auth = document.getElementById("authScreen"); if (auth) auth.hidden = false; }
  }

  async function openClockingModule() {
    closeJob(); closeAllJobs(false);
    shell.hidden = true;
    closeModal();
    try { if (typeof bootWorkspace === "function") await bootWorkspace(); else throw new Error("Clocking unavailable"); }
    catch { const auth = document.getElementById("authScreen"); if (auth) auth.hidden = false; }
  }

  function getAppRole() {
    return String(currentJobsContext().role || '').toLowerCase();
  }

  function syncEntrypoints() {
    contextChanged();
    const appRole = getAppRole();
    const context = currentJobsContext();
    const adminButton = document.getElementById("btnOpenJobsAdmin");
    const supervisorButton = document.getElementById("btnOpenJobsSupervisor");
    const companiesButton = document.getElementById("btnCompanyAdminPortfolio");
    if (companiesButton && adminButton && window.ShiftlyJobsData.canOpen(context)) {
      // Owner navigation only; reuse the existing company-switch action.
      if (appRole === "owner" && adminButton.nextElementSibling !== companiesButton) adminButton.after(companiesButton);
      else if (appRole !== "owner" && companiesButton.parentElement.firstElementChild !== companiesButton) companiesButton.parentElement.prepend(companiesButton);
    }
    if (adminButton) adminButton.hidden = !window.ShiftlyJobsData.canOpen(context) || !["owner", "admin"].includes(appRole);
    if (supervisorButton) supervisorButton.hidden = !window.ShiftlyJobsData.canOpen(context) || appRole !== "supervisor";
  }

  function demoRoleFromUrl() {
    if (!isLocalDevelopment) return "";
    const value = new URLSearchParams(window.location.search).get("jobsDemo");
    return ["admin", "supervisor", "employee"].includes(value) ? value : "";
  }

  function setDemoRole(nextRole) {
    closeJob(); closeAllJobs(false);
    const url = new URL(window.location.href); url.searchParams.set("jobsDemo", nextRole); history.replaceState(null, "", url);
    role = nextRole;
    if (nextRole === "employee") {
      shell.hidden = true; const auth = document.getElementById("authScreen"); if (auth) auth.hidden = false; renderDevBar();
    } else openJobs(nextRole);
  }

  function renderDevBar() {
    if (!devBar) return; const current = demoRoleFromUrl() || role;
    devBar.innerHTML = `<span>${current === "employee" ? "EMPLOYEE · JOBS HIDDEN" : "LOCAL JOBS ROLE"}</span>${["admin", "supervisor", "employee"].map((item) => `<button class="${current === item ? "active" : ""}" type="button" data-dev-role="${item}">${item[0].toUpperCase() + item.slice(1)}</button>`).join("")}<button type="button" data-dev-reset title="Reset local mock data"><i class="ph ph-arrow-counter-clockwise"></i></button>`;
  }

  function bindEvents() {
    document.getElementById("btnOpenJobsAdmin")?.addEventListener("click", () => openJobs("admin"));
    document.getElementById("btnOpenJobsSupervisor")?.addEventListener("click", () => openJobs("supervisor"));
    root.addEventListener("click", event => { const action = event.target.closest("[data-action]")?.dataset.action; if (["start","finish","submit","return","approve","create","add-material","add-test","add-photo","add-note","signoff"].includes(action)) performAction(() => handleRootClick(event)); else handleRootClick(event); });
    root.addEventListener("keydown", (event) => {
      const row = event.target.closest("tr[data-action=open]"); if (row && ["Enter", " "].includes(event.key)) { event.preventDefault(); openJob(row.dataset.id); }
      const tab = event.target.closest("[role=tab]"); if (tab && ["ArrowLeft", "ArrowRight"].includes(event.key)) { const list = [...tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]')]; const index = list.indexOf(tab); const next = list[(index + (event.key === "ArrowRight" ? 1 : -1) + list.length) % list.length]; next.focus(); next.click(); }
    });
    root.addEventListener("input", (event) => {
      if (event.target.id === "jobsSearch") { adminSearch = event.target.value; const cursor = event.target.selectionStart; renderAllJobs(); const next = allJobsWorkspace?.querySelector("#jobsSearch"); next?.focus(); next?.setSelectionRange(cursor, cursor); }
      if (["todayWork", "todayNotes"].includes(event.target.name)) { const job = selectedJob(); if (job) { job.currentDraft ||= { work: "", notes: "" }; job.currentDraft[event.target.name === "todayWork" ? "work" : "notes"] = event.target.value; try { if(isMockMode) dataService.saveDraft(job.id,job.currentDraft); else liveDrafts.set(job.id,{...job.currentDraft}); } catch(error) { toast(error.message); } } }
    });
    root.addEventListener("submit", (event) => { if (event.target.id !== "jobsTodayForm") return; event.preventDefault(); const job = selectedJob(); const open = job && currentSession(job); if (!job || !open) return; const data = new FormData(event.target); if(!isMockMode){openExecution('finish');const work=modal.querySelector('[name="work"]'),notes=modal.querySelector('[name="notes"]');if(work)work.value=data.get('todayWork')||'';if(notes)notes.value=data.get('todayNotes')||'';return;} performAction(() => finishWork(job, open, data.get("todayWork"), data.get("todayNotes"))); });
    modal.addEventListener("click", (event) => { if (event.target === modal || event.target.closest("[data-modal-close]")) closeModal(); });
    modal.addEventListener("submit", (event) => { event.preventDefault(); if (modalSubmit) { const action=modalSubmit; const data=new FormData(event.target); if(!isMockMode&&modalPlanning)submitPlanning(action,data);else performAction(() => action(data)); } });
    modal.addEventListener('click',event=>{if(event.target.closest('[data-plan-refresh]'))refreshPlanning();});
    modal.addEventListener('change',event=>{if(['lead','team'].includes(event.target.name))syncCreateLead();});
    modal.addEventListener("input", (event) => { if (event.target.id !== "jobsTeamSearch") return; const query = event.target.value.trim().toLowerCase(); modal.querySelectorAll("[data-team-option]").forEach((option) => { option.hidden = !!query && !option.dataset.teamOption.includes(query); }); });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (!modal.hidden) { event.preventDefault(); closeModal(); }
        else if (workspace) { event.preventDefault(); closeJob(); }
        else if (allJobsWorkspace) { event.preventDefault(); closeAllJobs(); }
      }
      const dialog = !modal.hidden ? modal : workspace || allJobsWorkspace;
      if (event.key !== "Tab" || !dialog) return;
      const controls = [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],summary,[tabindex="0"]')].filter((el) => el.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) return;
      if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) { event.preventDefault(); first.focus(); }
    });
    devBar?.addEventListener("click", (event) => { const roleButton = event.target.closest("[data-dev-role]"); if (roleButton) setDemoRole(roleButton.dataset.devRole); if (event.target.closest("[data-dev-reset]")) { state = dataService.reset(); toast("Mock Jobs reset"); render(); } });
    document.getElementById("companySelect")?.addEventListener("change", () => setTimeout(syncEntrypoints, 0));
    window.addEventListener("shiftly:company-context", syncEntrypoints);
    const observer = new MutationObserver(syncEntrypoints);
    ["companyAdminShell", "appShell"].forEach((id) => { const element = document.getElementById(id); if (element) observer.observe(element, { attributes: true, attributeFilter: ["hidden"] }); });
  }

  function handleRootClick(event) {
    const button = event.target.closest("[data-action]"); if (!button) return;
    const action = button.dataset.action;
    if (!isMockMode) {
      if(button.disabled)return;
      if(action==='host-nav')return navigateHost(button.dataset.hostId);
      if(action.startsWith('review-'))return openReview(action.slice(7));
      if(action==='execute-start')return openExecution('start');
      if(action==='execute-finish')return openExecution('finish');
      if(action==='execute-recover')return openExecution('recover',button.dataset.session);
      if(action==='plan-create'||action==='create')return openPlanning('create');
      if(action==='plan-team')return openPlanning('team');
      if(action==='plan-schedule')return openPlanning('schedule');
      if(action==='live-retry')return loadLiveList();
      if(action==='live-prev')return loadLiveList(livePage.offset-livePage.limit);
      if(action==='live-next')return loadLiveList(livePage.offset+livePage.limit);
      if(!['close','billing','clocking','dashboard','open','tab','print','all-jobs','all-jobs-close','filter'].includes(action)){toast('Jobs is read-only in this checkpoint.');return;}
    }
    if (action === "close") return closeJobs();
    if (action === "billing") return openBillingModule();
    if (action === "clocking") return openClockingModule();
    if (action === "dashboard") return closeJob();
    if (action === "all-jobs") return openAllJobs(button.dataset.filter || "all");
    if (action === "all-jobs-close") return closeAllJobs();
    if (action === "create") return createJobModal();
    if (action === "open") return openJob(button.dataset.id);
    if (action === "filter") { adminFilter = button.dataset.filter; renderAllJobs(); allJobsWorkspace?.querySelector('.jobsFilter[aria-selected="true"]')?.focus({ preventScroll: true }); return; }
    if (action === "tab") {
      activeTab = button.dataset.tab;
      if (workspace) workspace.querySelector('.jobsWorkspaceBody').scrollTop = 0;
      renderDetail();
      workspace?.querySelector('.jobsTab[aria-selected="true"]')?.focus({ preventScroll: true });
      return;
    }
    const job = selectedJob(); if (!job) return;
    if (action === "start") return startJob(job);
    if (action === "finish") return finishModal(job);
    if (action === "submit") return submitReviewModal(job);
    if (action === "return") return returnCorrectionModal(job);
    if (action === "approve") return approveModal(job);
    if (action === "add-work") return addWorkModal();
    if (action === "add-material") return addMaterialModal();
    if (action === "add-test") return addTestModal();
    if (action === "add-photo") return addPhotoModal();
    if (action === "add-note") return addNoteModal();
    if (action === "signoff") return signoffModal();
    if (action === "print") return printJobCard();
  }

  function boot() {
    ensureDom(); syncEntrypoints();
    const demoRole = demoRoleFromUrl();
    if (demoRole === "admin" || demoRole === "supervisor") setTimeout(() => openJobs(demoRole), 0);
    else if (demoRole === "employee") { role = "employee"; renderDevBar(); }
    window.ShiftlyJobs = Object.freeze({ openAdmin: () => openJobs("admin"), openSupervisor: () => openJobs("supervisor"), syncRole: syncEntrypoints, resetMock: () => { if (!isLocalDevelopment || !dataService) return; state = dataService.reset(); render(); } });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
