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
  const cents=value=>Math.round(Number(value||0)*100);
  const amount=c=>Number((c/100).toFixed(2));
  function classificationIndex(input){
    return new Map((input.classifications||[]).map(item=>[String(item.id),item]));
  }
  function enrichDeductions(input){
    const classifications=classificationIndex(input);
    const types=new Map((input.deductionTypes||[]).map(item=>[String(item.id),item]));
    return (input.deductions||[]).map(item=>{
      const type=types.get(String(item.deduction_type_id||''));
      const id=item.payroll_item_classification_id||type?.payroll_item_classification_id;
      return {...item,payroll_item_classification_id:id||null,
        payroll_item_classification:id?classifications.get(String(id))||null:null};
    });
  }
  function employeeSdlCircumstance(input,employeeId,selection){
    const rows=(input.sdl?.employee_circumstances||[]).filter(item=>String(item.employee_id)===String(employeeId));
    if(!rows.length)return {circumstance:'standard',effective_from:null,effective_to:null,evidence_reference:null,source:'default'};
    if(rows.length!==1||rows[0].effective_from>selection.start||(rows[0].effective_to&&rows[0].effective_to<=selection.end))
      fail('SDL employee circumstances change inside this payroll period. Split the payroll at the effective date.');
    const row=rows[0];
    if(row.circumstance==='section_18_3_learner'&&!String(row.evidence_reference||'').trim())
      fail('SDL learner evidence is required before payroll can be calculated.');
    return {id:row.id,circumstance:row.circumstance,effective_from:row.effective_from,
      effective_to:row.effective_to||null,evidence_reference:row.evidence_reference||null,source:'employee_record'};
  }
  function calculateSdl(input,selection,rows,rules){
    const enabled=rules.calculate_sdl===true;
    const config=input.sdl?.configuration||null;
    const rate=input.sdl?.rate||null;
    if(enabled&&(!config||config.enabled!==true||config.effective_from>selection.start||(config.effective_to&&config.effective_to<=selection.end)))
      fail('SDL configuration is unavailable or changes inside this payroll period. Split the payroll at the effective date.');
    if(enabled&&(!rate||Number(rate.rate)!==0.01||rate.effective_from>selection.start||(rate.effective_to&&rate.effective_to<=selection.end)))
      fail('The authoritative SDL rate is unavailable for this payroll period.');
    const classifications=classificationIndex(input);
    const fixedKeys=['ordinary_remuneration','overtime','annual_bonus','paid_leave_taken'];
    const fixed=Object.fromEntries(fixedKeys.map(key=>[key,(input.classifications||[]).find(item=>item.item_key===key)]));
    if(enabled&&fixedKeys.some(key=>!fixed[key]||fixed[key].sdl_treatment!=='included_remuneration'))
      fail('Authoritative SDL remuneration classifications are unavailable for this payroll period.');
    return rows.map(row=>{
      const circumstance=employeeSdlCircumstance(input,row.employee_id,selection);
      if(enabled&&Number(row.breakdown?.allowancePay||0)>0)
        fail('Generic Allowance is not authoritatively classified for SDL. Replace it with a supported payroll item before finalising.');
      if(enabled){
        const unresolvedAdjustment=(input.adjustments||[]).find(item=>String(item.employee_id)===String(row.employee_id)&&item.active!==false&&cents(item.amount)>0&&item.payroll_item_definition_id);
        if(unresolvedAdjustment){
          const item=classifications.get(String(unresolvedAdjustment.payroll_item_classification_id||''));
          if(!item||item.calculation_status!=='payroll_active')fail(`${item?.display_name||unresolvedAdjustment.description||'This payroll adjustment'} is not yet activated as authoritative employee remuneration for SDL.`);
        }
        const unresolvedDeduction=(input.deductions||[]).find(item=>String(item.employee_id)===String(row.employee_id)&&item.active!==false&&cents(item.amount)>0&&item.payroll_item_definition_id&&classifications.get(String(item.payroll_item_classification_id||''))?.calculation_status!=='payroll_active');
        if(unresolvedDeduction)fail(`${classifications.get(String(unresolvedDeduction.payroll_item_classification_id||''))?.display_name||unresolvedDeduction.description||'This payroll deduction'} needs statutory evidence or calculation support before SDL can be finalised.`);
      }
      const allowable=(row.deductions||[]).filter(item=>item.payroll_item_classification?.calculation_status==='payroll_active'&&item.payroll_item_classification?.sdl_treatment==='allowable_deduction').reduce((sum,item)=>sum+cents(item.amount),0);
      const base=enabled&&circumstance.circumstance!=='section_18_3_learner'?Math.max(0,cents(row.gross)-allowable):0;
      const sdl=enabled?Math.round(base*Number(rate.rate)):0;
      const used=[...fixedKeys.map(key=>fixed[key]?.id),...(row.deductions||[]).map(item=>item.payroll_item_classification_id)].filter(Boolean);
      return {...row,sdl_leviable_remuneration:amount(base),sdl_amount:amount(sdl),sdl_rate:enabled?rate.rate:0,
        sdl_rate_version:enabled?rate.rate_version:'disabled',sdl_configuration_id:enabled?config.id:null,
        sdl_circumstance:circumstance,sdl_classifications:[...new Set(used)]};
    });
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
    const deductions=enrichDeductions(input);
    let rows=engine.attachDeductionsToPayrollRows(adjusted,engine.trElectricalAutomaticLevyDeductions(adjusted,deductions,levy,company),rules,history);
    // Only the authoritative input supplies monthly consumption; never infer it from YTD.
    for(const row of rows){
      const cents=value=>Number(History.money(value))*100;
      let liable=0, contribution=0;
      if(rules.calculate_uif){
        const month=input.uif_month;
        const used=month?.employees?.find(e=>e.employee_id===row.employee_id);
        if(month?.month!==selection.end.slice(0,7)+'-01'||!used)fail('Monthly UIF history unavailable. Refresh payroll.');
        if(used.ambiguous)fail('This UIF month contains legacy payroll with incomplete UIF information. Monthly UIF cannot be calculated safely.');
        liable=Math.round(cents(row.gross||0));
        const remaining=Math.max(0,1771200-Math.round(cents(used.liable)));
        const remainingContribution=Math.max(0,17712-Math.round(cents(used.employee)),0);
        const remainingEmployer=Math.max(0,17712-Math.round(cents(used.employer)));
        contribution=Math.min(Math.round(Math.min(liable,remaining)/100),remainingContribution,remainingEmployer);
      }
      row.uif_liable_remuneration=(liable/100).toFixed(2);
      row.employer_uif=(contribution/100).toFixed(2);
      row.combined_uif=(contribution*2/100).toFixed(2);
      if(rules.calculate_uif){
        row.deductions=row.deductions.filter(d=>String(d.description||'').toLowerCase()!=='uif');
        row.deductions.push({employee_id:row.employee_id,description:'UIF',amount:contribution/100,active:true,statutory:true});
      }
      row.totalDeductions=row.deductions.reduce((sum,d)=>sum+Number(d.amount),0);
      row.net=Math.max(0,Number(row.gross)-row.totalDeductions);
    }
    rows=calculateSdl(input,selection,rows,rules);
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
  return Object.freeze({create,calculate,calculateSdl});
});
