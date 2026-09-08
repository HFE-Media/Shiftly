/* Jobs-only data boundary. No client is created here. The live adapter is never
 * selected by the UI in this local readiness phase. */
(() => {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const fail = (message, code = 'VALIDATION') => { throw Object.assign(new Error(message), { code }); };
  const local = location => location.protocol === 'file:' || ['localhost', '127.0.0.1', '0.0.0.0'].includes(location.hostname);
  const canOpen = context => Boolean(context?.userId && context.companyId && context.jobsEnabled === true &&
    (['owner', 'admin'].includes(context.role) || context.role === 'supervisor' && context.employeeId));
  function errorState(error) {
    if (['PGRST301','PGRST302','SESSION_EXPIRED'].includes(error.code)) return { kind: 'session', message: 'Your session expired. Sign in again before continuing.' };
    if (error.code === '40001') return { kind: 'conflict', message: 'This Job changed. Refresh before trying again.' };
    if (error.code === '23505') return { kind: 'conflict', message: error.message || 'An assignment or work session already exists.' };
    if (error.code === '42501') return { kind: 'denied', message: 'Jobs is disabled, your session expired, or you no longer have access.' };
    if (error instanceof TypeError || error.code === 'NETWORK') return { kind: 'network', message: 'Could not reach Jobs. Your work has not been confirmed. Refresh before retrying.' };
    return { kind: 'validation', message: error.message || 'Unable to complete this action.' };
  }
  function createMock({ location, fixtures, storage, key = 'shiftly.jobs.mock.v1', qa = false, identity, team, now = () => new Date().toISOString() }) {
    if (!local(location)) fail('Mock Jobs is local-only', '42501');
    let state;
    try { state = !qa && storage ? JSON.parse(storage.getItem(key)) : null; } catch {}
    if (!state || !Array.isArray(state.jobs)) state = fixtures();
    for (const job of state.jobs) job.revision ||= 1;
    let context = { userId: 'demo-admin', companyId: 'demo', jobsEnabled: true, role: 'admin' };
    const id = () => crypto.randomUUID();
    const persist = () => { if (!qa && storage) storage.setItem(key, JSON.stringify(state)); };
    const manager = () => { if (!['admin', 'owner'].includes(context.role)) fail('Manager required', '42501'); };
    const assigned = job => job.team.some(person => person.employeeId === context.employeeId);
    const allowed = job => canOpen(context) && (['owner', 'admin'].includes(context.role) || assigned(job));
    const worker = job => { if (context.role !== 'supervisor' || !assigned(job)) fail('Assigned Supervisor required', '42501'); };
    const noOpen = job => { if (job.sessions.some(s => !s.endedAt)) fail('Finish all open Job sessions before continuing.'); };
    const meaningful = job => { if (!job.workDays.some(d => d.work.trim())) fail('Record work before submitting.'); };
    function transaction(jobId, revision, action) {
      if (!canOpen(context)) fail('Jobs access denied', '42501');
      const next = copy(state); const job = next.jobs.find(j => j.id === jobId);
      if (jobId) {
        if (!job || !allowed(job)) fail('Job access denied', '42501');
        if (revision !== job.revision) fail('Job changed. Refresh and try again.', '40001');
        if (['completed', 'cancelled'].includes(job.status)) fail('Closed Job is read-only');
      }
      const stamp = now();
      const log = (type, summary) => { job.lastActivity = stamp; job.activity.push({ id: id(), type, summary, actor: context.role === 'supervisor' ? identity.name : 'Amina Jacobs', at: stamp }); };
      const result = action(next, job, stamp, log);
      if (job) job.revision++;
      const previous = copy(state);
      Object.assign(state, next);
      try { persist(); } catch (error) { Object.assign(state, previous); fail('Local draft storage is full or unavailable. Nothing was saved.', 'STORAGE'); }
      return result || (job && copy(job));
    }
    return {
      mode: 'mock',
      setContext(value) { context = { ...value }; },
      getState() { return state; },
      list() { if (!canOpen(context)) fail('Jobs access denied', '42501'); return copy(state.jobs.filter(allowed)); },
      detail(jobId) { const job = state.jobs.find(j => j.id === jobId); if (!job || !allowed(job)) fail('Job access denied', '42501'); return copy(job); },
      reset() { state = fixtures(); for (const j of state.jobs) j.revision = 1; persist(); return state; },
      saveDraft(jobId, draft) { const job = state.jobs.find(j => j.id === jobId); if (!job || !allowed(job)) fail('Job access denied', '42501'); worker(job); if (['completed','submitted_for_review','cancelled'].includes(job.status)) fail('Work is read-only'); job.currentDraft = copy(draft); persist(); },
      create(data) { manager(); let created; transaction(null, null, (next, _, stamp) => {
        const number = next.sequence++; const chosen = team.filter(p => data.teamIds.includes(p.employeeId));
        created = { ...copy(data), id: id(), jobNumber: `JC-${new Date(stamp).getUTCFullYear()}-${String(number).padStart(4, '0')}`,
          status: data.scheduledDate ? 'scheduled' : 'draft', lead: copy(identity), team: [copy(identity), ...copy(chosen.filter(p => p.employeeId !== identity.employeeId))],
          sessions: [], workDays: [], materials: [], testing: [], photos: [], notes: [], signoff: null, revision: 1,
          createdAt: stamp, lastActivity: stamp, activity: [{ id: id(), type: 'job_created', summary: 'Job created', actor: 'Amina Jacobs', at: stamp }] };
        next.jobs.unshift(created);
      }); return copy(created); },
      start(jobId, revision) { return transaction(jobId, revision, (next, job, stamp, log) => {
        worker(job); if (!['scheduled','in_progress','correction_required'].includes(job.status)) fail('Job unavailable for work');
        if (!job.lead) fail('Active lead required');
        if (next.jobs.some(j => j.sessions.some(s => s.employeeId === context.employeeId && !s.endedAt))) fail('Finish your open Job session first', '23505');
        const prior = job.sessions.length; job.sessions.push({ id: id(), employeeId: context.employeeId, employeeName: identity.name, startedAt: stamp, endedAt: null });
        job.status = 'in_progress'; job.currentDraft = { work: '', notes: '' }; log(prior ? 'job_continued' : 'job_started', 'Work session started');
      }); },
      finish(jobId, revision, work, notes) { return transaction(jobId, revision, (_, job, stamp, log) => {
        worker(job); if (job.status !== 'in_progress' || !work?.trim()) fail('Meaningful work record required');
        const open = job.sessions.find(s => s.employeeId === context.employeeId && !s.endedAt); if (!open) fail('No open session');
        job.workDays.push({ id: id(), date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(new Date(open.startedAt)), work: work.trim(), notes: notes || '', sessionIds: [open.id],
          materialIds: job.materials.filter(e => e.sessionId === open.id).map(e => e.id), photoIds: job.photos.filter(e => e.sessionId === open.id).map(e => e.id), testingIds: job.testing.filter(e => e.sessionId === open.id).map(e => e.id) });
        open.endedAt = stamp; delete job.currentDraft; log('work_paused', 'Finished work for today');
      }); },
      submit(jobId, revision) { return transaction(jobId, revision, (_, job, stamp, log) => {
        worker(job); if (job.lead?.employeeId !== context.employeeId) fail('Assigned Supervisor lead required','42501');
        if (!['in_progress','correction_required'].includes(job.status)) fail('Job is not ready for review'); noOpen(job); meaningful(job);
        const corrected = job.activity.some(a => a.type === 'returned_for_correction'); job.status = 'submitted_for_review'; job.correctionReason = ''; job.submittedAt = stamp;
        log(corrected ? 'resubmitted' : 'submitted_for_review', 'Submitted for review');
      }); },
      returnCorrection(jobId, revision, reason) { manager(); return transaction(jobId, revision, (_, job, stamp, log) => {
        if (job.status !== 'submitted_for_review' || !reason?.trim()) fail('Submitted Job and correction reason required');
        job.status = 'correction_required'; job.correctionReason = reason.trim(); log('returned_for_correction', reason.trim());
      }); },
      approve(jobId, revision, company) { manager(); return transaction(jobId, revision, (_, job, stamp, log) => {
        if (job.status !== 'submitted_for_review') fail('Submitted Job required'); noOpen(job); meaningful(job);
        job.status = 'completed'; job.completion = { by: 'Amina Jacobs', at: stamp, outcome: 'completed' }; job.company = copy(company);
        log('completed', 'Approved and completed'); job.cardSnapshot = copy(job);
      }); },
      evidence(jobId, revision, kind, data) { return transaction(jobId, revision, (_, job, stamp, log) => {
        worker(job); if (!['in_progress','correction_required'].includes(job.status)) fail('Evidence is read-only');
        const sessionId = job.sessions.find(s => s.employeeId === context.employeeId && !s.endedAt)?.id || '';
        const entry = { ...copy(data), id: id(), by: identity.name, addedAt: stamp, at: stamp, sessionId };
        if (kind === 'material') { if (!(Number(data.quantity) > 0) || !data.description?.trim()) fail('Description and positive quantity required'); job.materials.push(entry); }
        else if (kind === 'test') { if (!data.description?.trim() || !data.result?.trim()) fail('Test description and result required'); job.testing.push(entry); }
        else if (kind === 'photo') job.photos.push(entry);
        else if (kind === 'note') { if (!data.text?.trim()) fail('Note required'); job.notes.push(entry); }
        else if (kind === 'signoff') { if (data.unavailable ? !data.reason?.trim() : !data.clientName?.trim() || !data.signatureImage) fail('Client name/signature or unavailable reason required'); job.signoff = { ...entry, signedAt: stamp }; }
        else fail('Unsupported evidence kind'); log(kind === 'signoff' ? 'signature_captured' : `${kind}_added`, `Added ${kind}`);
      }); }
    };
  }

  // Single normalization contract used by live detail and immutable snapshots.
  function normalize(payload) {
    const j = payload.job; const arr = name => payload[name] || [];
    const order = (rows, field) => [...rows].sort((a,b) => String(a[field]).localeCompare(String(b[field])) || String(a.id).localeCompare(String(b.id)));
    const people = arr('job_assignments').filter(a => !a.unassigned_at).map(a => ({ employeeId: a.employee_id, name: a.employee_name, role: a.assignment_role }));
    const evidence = rows => order(rows,'created_at').map(e => ({ ...e, sessionId: e.session_id, by: e.actor_name, addedAt: e.created_at, at: e.created_at, objectPath: e.object_path }));
    const materials = evidence(arr('job_materials')), testing = evidence(arr('job_test_results')), photos = evidence(arr('job_photos'));
    const sign = order(arr('job_client_signoffs'),'signed_at').at(-1);
    return {
      id: j.id, companyId: j.company_id, revision: j.revision, jobNumber: j.job_number, title: j.title, clientName: j.client_name,
      clientContactName: j.client_contact_name, clientEmail: j.client_email, clientPhone: j.client_contact_phone,
      site: j.site_name, siteId: j.site_id, serviceAddress: j.service_address, description: j.description,
      scheduledDate: j.scheduled_start_at ? new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg'}).format(new Date(j.scheduled_start_at)) : '',
      scheduledTime: j.scheduled_start_at ? new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Johannesburg',hour:'2-digit',minute:'2-digit'}).format(new Date(j.scheduled_start_at)) : '',
      priority: j.priority, status: j.lifecycle_status, correctionReason: j.correction_reason || '',
      createdAt: j.created_at, lastActivity: j.updated_at, team: people, lead: people.find(p => p.role === 'lead'),
      company: { name: j.company_name, logoUrl: j.company_logo_url },
      sessions: order(arr('job_time_entries'),'started_at').map(s => ({ id:s.id,employeeId:s.employee_id,employeeName:s.employee_name,startedAt:s.started_at,endedAt:s.ended_at })),
      materials, testing, photos, notes: evidence(arr('job_notes')).map(n => ({...n,text:n.note})),
      workDays: order(arr('job_work_days'),'created_at').map(d => ({ id:d.id,date:d.work_date,work:d.work_performed,notes:d.notes,sessionIds:[d.session_id],
        materialIds:materials.filter(e => e.sessionId===d.session_id).map(e=>e.id),photoIds:photos.filter(e=>e.sessionId===d.session_id).map(e=>e.id),testingIds:testing.filter(e=>e.sessionId===d.session_id).map(e=>e.id) })),
      signoff:sign ? {clientName:sign.client_name,signedAt:sign.signed_at,unavailable:!sign.signature_object_path,reason:sign.unavailable_reason,objectPath:sign.signature_object_path,signature:sign.client_name} : null,
      completion:j.completed_at ? {by:j.completed_actor_name,at:j.completed_at,outcome:j.completion_outcome} : null,
      activity:order(arr('job_activity'),'occurred_at').map(a=>({id:a.id,type:a.event_type,summary:a.summary,actor:a.actor_name,at:a.occurred_at}))
    };
  }
  function createSupabase({ client, getContext }) {
    let generation = 0;
    const context = () => { const c=getContext(); if(!canOpen(c)) fail('Jobs access denied','42501'); return {...c}; };
    const same = (c, g) => { const latest=getContext(); if(g!==generation || latest?.companyId!==c.companyId || latest?.userId!==c.userId || latest?.role!==c.role || latest?.employeeId!==c.employeeId || !canOpen(latest)) fail('Company or session changed','42501'); };
    async function query(build) { const c=context(),g=generation; const {data,error}=await build(c); same(c,g); if(error) throw error; return data; }
    const table = async (name,jobId) => {
      const c=context(),g=generation,all=[];
      // Never silently truncate a historical card at the server's row cap.
      for(let offset=0;;offset+=250){
        const page=await query(c=>client.from(name).select('*').eq('company_id',c.companyId).eq('job_id',jobId).order('id').range(offset,offset+249));
        same(c,g);all.push(...page);if(page.length<250)return all;
      }
    };
    const rpc = (name, args) => query(c=>client.rpc(name,{p_company_id:c.companyId,...args}));
    const args = (id,revision) => ({p_job_id:id,p_revision:revision});
    return {
      mode:'supabase', clear(){generation++;},
      // Paginated summaries; request detail before rendering a workspace/card.
      async list({offset=0,limit=100}={}) {
        const size=Math.max(1,Math.min(200,limit));
        const rows=await query(c=>client.from('jobs').select('*').eq('company_id',c.companyId).order('updated_at',{ascending:false}).order('id').range(offset,offset+size-1));
        return rows.map(job=>({...normalize({job}),detailLoaded:false}));
      },
      assignedJobs(){ return this.list(); }, // SQL, not a browser filter, scopes Supervisors.
      assignments:id=>table('job_assignments',id), timeEntries:id=>table('job_time_entries',id),workDays:id=>table('job_work_days',id),
      materials:id=>table('job_materials',id),tests:id=>table('job_test_results',id),notes:id=>table('job_notes',id),photos:id=>table('job_photos',id),
      signoffs:id=>table('job_client_signoffs',id),activity:id=>table('job_activity',id),
      async detail(id) {
        const c=context(),g=generation;
        const rows=await query(c=>client.from('jobs').select('*').eq('company_id',c.companyId).eq('id',id).single());
        if(rows.lifecycle_status==='completed') { const snapshots=await table('job_completion_snapshots',id); same(c,g); if(!snapshots.length) fail('Completed Job snapshot is missing'); return normalize(snapshots[0].payload); }
        const names=['job_assignments','job_time_entries','job_work_days','job_materials','job_test_results','job_notes','job_photos','job_client_signoffs','job_activity'];
        const values=await Promise.all(names.map(name=>table(name,id))); same(c,g);
        const latest=await query(c=>client.from('jobs').select('revision').eq('company_id',c.companyId).eq('id',id).single());
        if(latest.revision!==rows.revision) fail('Job changed while loading','40001');
        return normalize({job:rows,...Object.fromEntries(names.map((n,i)=>[n,values[i]]))});
      },
      create:data=>rpc('create_job_with_team',{p_data:{title:data.title,client_name:data.clientName,client_contact_name:data.clientContactName,client_email:data.clientEmail,client_contact_phone:data.clientPhone,site_id:data.siteId || null,service_address:data.serviceAddress,description:data.description,priority:data.priority},p_team:data.teamIds,p_lead:data.leadId,p_schedule:!!data.scheduledDate,p_start:data.scheduledDate ? `${data.scheduledDate}T${data.scheduledTime || '08:00'}:00+02:00` : null}),
      assign:(id,r,e,role='member')=>rpc('assign_job_employee',{...args(id,r),p_employee_id:e,p_assignment_role:role}),
      replaceLead:(id,r,e)=>rpc('replace_job_lead',{...args(id,r),p_employee_id:e}),
      unassign:(id,r,e)=>rpc('unassign_job_employee',{...args(id,r),p_employee_id:e}),
      schedule:(id,r,start,end=null)=>rpc('schedule_job',{...args(id,r),p_start:start,p_end:end}),
      start:(id,r)=>rpc('start_job_work',args(id,r)),
      finish:(id,r,work,notes)=>rpc('finish_work_for_today',{...args(id,r),p_work:work,p_notes:notes}),
      adminCloseSession:(id,r,sessionId,reason)=>rpc('admin_close_job_session',{...args(id,r),p_session_id:sessionId,p_reason:reason}),
      submit:(id,r)=>rpc('submit_job_for_review',args(id,r)),resubmit:(id,r)=>rpc('resubmit_job_for_review',args(id,r)),
      returnCorrection:(id,r,reason)=>rpc('return_job_for_correction',{...args(id,r),p_reason:reason}),
      approve:(id,r)=>rpc('approve_job_complete',args(id,r)),cancel:(id,r,reason)=>rpc('cancel_job',{...args(id,r),p_reason:reason}),
      evidence:(id,r,kind,data)=>rpc('add_job_evidence',{...args(id,r),p_kind:kind,p_data:
        kind==='note' ? {note:data.text ?? data.note} :
        kind==='signoff' ? {client_name:data.clientName,object_path:data.objectPath || null,unavailable_reason:data.unavailable ? data.reason : null} :
        kind==='photo' ? {category:data.category,note:data.note,object_path:data.objectPath || null} : data}),
      // Prepared only. Caller must explicitly provide a validated platform context.
      setEntitlement(companyId,value) { if(getContext()?.platformAdmin!==true) fail('Platform administrator required','42501'); return client.from('companies').update({jobs_enabled:value===true}).eq('id',companyId).select('id,jobs_enabled').single(); }
    };
  }
  // Preparation hook only: host explicitly mounts this in PLATFORM settings.
  // No handler/client is wired here, so it cannot update any company.
  function entitlementControl(document,context) {
    if(context?.platformAdmin!==true) return null;
    const label=document.createElement('label');
    const toggle=document.createElement('input'); toggle.type='checkbox'; toggle.disabled=true;
    toggle.checked=context.jobsEnabled===true; toggle.setAttribute('aria-label','Jobs entitlement (backend not connected)');
    const copy=document.createElement('span'); copy.textContent='Jobs — Enable job cards, field work tracking and supervisor job workflows.';
    label.append(toggle,copy); return label;
  }
  // Presentation-state hook for the later, explicitly authorized connection.
  // Changing context immediately erases old rows/detail, before any reload.
  function createViewState({adapter,getContext,onChange=()=>{}}) {
    let generation=0,current={kind:'idle',rows:[],detail:null};
    const publish=value=>{current=value;onChange({...current});return current;};
    const key=()=>JSON.stringify(getContext());
    async function load(jobId) {
      const g=++generation,k=key(),c=getContext();
      if(!c?.userId)return publish({kind:'session',rows:[],detail:null});
      if(c.jobsEnabled!==true)return publish({kind:'disabled',rows:[],detail:null});
      if(!canOpen(c))return publish({kind:'denied',rows:[],detail:null});
      publish({kind:'loading',rows:[],detail:null});
      try {
        const result=await (jobId?adapter.detail(jobId):adapter.list());
        if(g!==generation)return current;
        if(k!==key())return clear();
        return publish({kind:!jobId&&!result.length?'empty':'ready',rows:jobId?[]:result,detail:jobId?result:null});
      }catch(error){if(g!==generation)return current;if(k!==key())return clear();return publish({...errorState(error),rows:[],detail:null});}
    }
    function clear(){generation++;adapter.clear?.();return publish({kind:'company-changed',rows:[],detail:null});}
    return {load,clear,getState:()=>({...current})};
  }
  window.ShiftlyJobsData=Object.freeze({createMock,createSupabase,normalize,canOpen,errorState,isLocal:local,entitlementControl,createViewState});
})();
