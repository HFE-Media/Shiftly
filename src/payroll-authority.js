/* Trusted payroll orchestration. UMD for the browser-independent Node/Deno runtime. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../public/payroll-engine.js'),require('../public/payroll-history.js'));else root.ShiftlyPayrollAuthority=factory(root.ShiftlyPayrollEngine,root.ShiftlyPayrollHistory);})(globalThis,function(Engine,History){
  'use strict';
  const encoder=new TextEncoder();
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const fail=message=>{throw Error(message)};
  const hex=bytes=>Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
  const digest=async value=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(History.stable(value))));
  const base64=value=>btoa(String.fromCharCode(...encoder.encode(JSON.stringify(value)))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  const decode=value=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0))));
  async function key(secret){if(typeof secret!=='string'||secret.length<32)fail('Payroll signing secret unavailable');return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
  async function sign(value,secret){const body=base64(value);return body+'.'+hex(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(body)));}
  async function verify(token,secret){
    if(typeof token!=='string'||token.length>5000)fail('Invalid payroll confirmation');
    const [body,signature,...extra]=token.split('.');
    if(extra.length||!/^[0-9a-f]{64}$/.test(signature||''))fail('Invalid payroll confirmation');
    const bytes=Uint8Array.from(signature.match(/../g),s=>parseInt(s,16));
    if(!await crypto.subtle.verify('HMAC',await key(secret),bytes,encoder.encode(body)))fail('Invalid payroll confirmation');
    return decode(body);
  }
  function calculate(input,selection){
    const company=input.company;const context={company,rules:input.rules,employees:input.employees,
      deductionTypes:input.deductionTypes,start:selection.start,end:selection.end};
    const engine=Engine.create(context);const rules=engine.normalisePayrollRules(input.rules);
    const enabled=engine.usesPayrollYtd(company,selection.end)&&rules.calculate_paye;
    const history={enabled,standardHistory:input.history,preserveTrContinuity:engine.isTrElectricalCompany(company),
      taxYearStart:History.taxYear(selection.end),takeoverDate:engine.payrollYtdTakeoverDate(company),companyName:company.name,
      byEmployee:new Map(input.history.employees.map(e=>[e.employee_id,History.context(e,enabled,History.taxYear(selection.end))]))};
    let levy=null;
    if(engine.isTrElectricalCompany(company)){
      if(![4,5].includes(selection.levyWeeks))fail('Choose a 4-week or 5-week levy period.');
      levy=input.levy && Number(input.levy.levy_weeks)===selection.levyWeeks
        ? input.levy : engine.previewPayrollLevyPeriod(company,selection.start,selection.end,selection.levyWeeks);
      if(context.employees.some(e=>e.active!==false&&!engine.normaliseNbceiDesignationCode(e.nbcei_designation_code)))fail('Set all active employee NBCEI designations before running payroll.');
    }else if(selection.levyWeeks!==null&&selection.levyWeeks!==undefined)fail('Levy weeks do not apply to this company');
    const adjusted=engine.attachAdjustmentsToPayrollRows(engine.calculatePayroll(input.events,input.employees,rules),input.adjustments,rules);
    engine.validatePayrollYtdContinuity(adjusted,history,selection.end);
    const rows=engine.attachDeductionsToPayrollRows(adjusted,engine.trElectricalAutomaticLevyDeductions(adjusted,input.deductions,levy,company),rules,history);
    return {version:History.VERSION,start:selection.start,end:selection.end,revision:input.history.revision,
      company:{id:company.id,name:company.name,logo_url:company.frozen_logo||''},rules,levy,
      rows:rows.map(row=>History.employeeSnapshot(row,rules))};
  }
  function create(deps){
    return async function execute(authorization,body){
      if(!body||typeof body!=='object'||Array.isArray(body))fail('Invalid payroll request');
      const user=await deps.user(authorization);if(!user?.id)fail('Authentication required');
      if(!uuid.test(body.c||''))fail('Invalid company');
      const allowed=body.action==='preview'?['action','c','start','end','levyWeeks']:['action','c','request','token'];
      if(Object.keys(body).some(k=>!allowed.includes(k)))fail('Unexpected payroll request fields; monetary values are not accepted');
      if(body.action==='preview'){
        History.date(body.start);History.date(body.end);if(body.start>body.end)fail('Invalid payroll dates');
        const selection={start:body.start,end:body.end,levyWeeks:body.levyWeeks??null};
        const input=await deps.inputs(authorization,body.c,body.start,body.end);
        if(input.company.id!==body.c)fail('Company mismatch');
        input.company.frozen_logo=await deps.logo(input.company.logo_url||'');
        const payload=calculate(input,selection);
        const token=await sign({actor:user.id,c:body.c,...selection,revision:payload.revision,
          calculation:await digest(payload),engine:Engine.version,expires:Date.now()+15*60*1000},deps.secret);
        return {token,rows:payload.rows.map(r=>r.document_row),rules:payload.rules,company:payload.company,revision:payload.revision};
      }
      if(body.action!=='finalise'||!uuid.test(body.request||''))fail('Invalid finalisation request');
      const confirmed=await verify(body.token,deps.secret);
      if(confirmed.actor!==user.id||confirmed.c!==body.c)fail('Payroll confirmation belongs to another user/company');
      const confirmation=await digest(body.token);
      const existing=await deps.request(authorization,body.c,body.request);
      if(existing){if(existing.confirmation!==confirmation)fail('Request ID already used for another confirmation');return {id:existing.id,replayed:true};}
      if(confirmed.expires<Date.now()||confirmed.engine!==Engine.version)fail('Payroll preview expired or calculation version changed. Run Payroll again.');
      History.finalisationRange(confirmed.start,confirmed.end);
      try {
        const input=await deps.inputs(authorization,body.c,confirmed.start,confirmed.end);
        if(input.history.revision!==confirmed.revision)fail('Payroll inputs changed. Run Payroll again and review before finalising.');
        input.company.frozen_logo=await deps.logo(input.company.logo_url||'');
        const payload=calculate(input,confirmed);
        if(await digest(payload)!==confirmed.calculation)fail('Payroll calculation changed. Run Payroll again and review.');
        payload.confirmation=confirmation;
        const id=await deps.commit(user.id,body.c,body.request,payload);
        return {id,replayed:false};
      } catch(error) {
        // Another identical confirmation may have committed after our first lookup.
        // Also resolves a lost commit response; never reinterpret another request.
        const saved=await deps.request(authorization,body.c,body.request);
        if(saved?.confirmation===confirmation) return {id:saved.id,replayed:true};
        throw error;
      }
    };
  }
  return Object.freeze({create,calculate});
});
