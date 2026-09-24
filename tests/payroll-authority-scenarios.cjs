// Runs only inside the explicitly isolated PostgreSQL harness; no remote clients.
module.exports = async function({admin,connect,user,call,owner,employee,c,id,ok}) {
  const assert=require('node:assert/strict');
  const Authority=require('../src/payroll-authority.js');
  const ph=require('../public/payroll-history.js');
  const manager=await user();
  await admin.query("insert into company_users(company_id,user_id,role) values($1,$2,'owner')",[c,owner]);
  await admin.query('update company_payroll_rules set payroll_history_enabled=true where company_id=$1',[c]);
  const deps={secret:'isolated-fixture-signing-secret-not-for-production',
    user:async auth=>({id:auth}),logo:async()=>'',
    inputs:async(auth,company,s,t)=>call(await user(auth),'get_payroll_calculation_inputs',[company,s,t]),
    request:async(auth,company,request)=>call(await user(auth),'get_payroll_request',[company,request]),
    commit:async(actor,company,request,payload)=>{
      const connection=await connect();await connection.query('set role service_role');
      return call(connection,'commit_trusted_payroll',[company,request,payload,actor]);
    }};
  const execute=Authority.create(deps);
  const select={action:'preview',c,start:'2026-09-01',end:'2026-09-30',levyWeeks:null};
  const preview=()=>execute(owner,select);
  const confirm=p=>({action:'finalise',c,request:id(),token:p.token});
  for(const field of ['gross','paye_deducted','employee_uif','retirement_fund_contributions','previousPaye','rows']){
    const p=await preview();
    await assert.rejects(execute(owner,{...confirm(p),[field]:field==='rows'?[]:1}),/monetary values are not accepted/);
    ok('authority rejects manipulated '+field+' from authorised admin');
  }
  await assert.rejects(call(manager,'finalise_payroll',[c,id(),{}]),/permission denied/);
  await assert.rejects(call(manager,'commit_trusted_payroll',[c,id(),{},owner]),/permission denied/);
  await assert.rejects(execute(employee,select),/access required/);
  ok('browser monetary bypass and employee authority access denied');
  const stale=async(label,change)=>{
    const p=await preview();await change();
    await assert.rejects(execute(owner,confirm(p)),/inputs changed/);ok(label);
  };
  await stale('stale employee payroll setting rejected',()=>admin.query('update employees set rate=11000 where company_id=$1',[c]));
  await stale('stale independent PAYE/UIF setting rejected',()=>admin.query('update company_payroll_rules set calculate_uif=false where company_id=$1',[c]));
  await admin.query('update company_payroll_rules set calculate_uif=true where company_id=$1',[c]);
  await stale('stale YTD adjustment rejected',async()=>{
    const h=await call(manager,'get_employee_payroll_ytd',[c,'E1','2026-03-01']);
    await call(manager,'save_employee_with_ytd',[c,'E1',false,{company_id:c,employee_id:'E1',full_name:'E1',pay_type:'monthly',pay_cycle:'monthly',rate:11000,active:true},{paye:'125.00',uif:'25.00',reason:'Synthetic adjustment'},h.revision,id()]);
  });
  await stale('stale deduction type input rejected',()=>admin.query('insert into company_deduction_types(id,company_id,name) values($1,$2,$3)',[id(),c,'Synthetic deduction']));
  await stale('stale attendance input rejected',()=>admin.query("insert into clock_events(entry_id,company_id,employee_id,employee_name,created_at,action,result) values($1,$2,'E1','E1','2026-09-02T06:00:00Z','IN','OK')",[id(),c]));
  // Writer wins after service calculation but before SQL commit: revision check rejects.
  let p=await preview();
  const raced=Authority.create({...deps,commit:async(...args)=>{
    await admin.query('update employees set rate=12000 where company_id=$1',[c]);
    return deps.commit(...args);
  }});
  await assert.rejects(raced(owner,confirm(p)),/changed/);
  assert.equal((await admin.query('select count(*)::int n from payroll_runs where company_id=$1',[c])).rows[0].n,0);
  ok('input change between trusted calculation and SQL commit rejects entire run');
  p=await preview();
  const expected=Authority.calculate(await deps.inputs(owner,c,select.start,select.end),select);
  const req=confirm(p);
  const results=await Promise.all([execute(owner,req),execute(owner,req)]);
  assert.equal(results[0].id,results[1].id);
  ok('concurrent duplicate authority finalisation contributes once');
  assert.equal((await execute(owner,req)).id,results[0].id);
  ok('lost-response retry returns saved result without recalculation or new contribution');
  const saved=await call(manager,'get_payroll_history',[c,select.start,select.end]);
  assert.equal(saved.periods.length,2);
  assert.equal((await admin.query('select count(*)::int n from payroll_runs where company_id=$1',[c])).rows[0].n,1);
  ok('valid unchanged preview creates exactly one full run');
  for(const row of expected.rows){const actual=saved.periods.find(e=>e.employee_id===row.employee_id);
    for(const field of ['gross_remuneration','retirement_fund_contributions','paye_deducted','employee_uif']) assert.equal(Number(actual[field]),Number(row[field]));
    assert.deepEqual(actual.document_row,row.document_row);
  }
  ok('saved authoritative money and document snapshot equal trusted shared calculation');
  await assert.rejects(execute(owner,{...req,request:id()}),/changed|overlapping/);
  const crossing=await execute(owner,{...select,start:'2027-02-20',end:'2027-03-05'});
  await assert.rejects(execute(owner,confirm(crossing)),/two tax years/);
  ok('authority blocks duplicate new request and cross-tax-year confirmation');
  // Finalisation wins first: a later material writer cannot commit in its critical window.
  select.start='2026-10-01';select.end='2026-10-31';
  const hold=await connect(),writer=await connect();
  await hold.query('begin');await hold.query('set local role service_role');
  const values=Authority.calculate(await deps.inputs(owner,c,select.start,select.end),select);
  await call(hold,'commit_trusted_payroll',[c,id(),values,owner]);
  const pid=(await writer.query('select pg_backend_pid() pid')).rows[0].pid;
  let finished=false;const mutation=writer.query('update employees set rate=13000 where company_id=$1',[c]).then(()=>{finished=true;});
  let waiting=false;
  for(let i=0;i<40;i++){
    const state=(await admin.query('select wait_event from pg_stat_activity where pid=$1',[pid])).rows[0];
    if(state?.wait_event==='advisory'){waiting=true;break;}
    await new Promise(resolve=>setTimeout(resolve,25));
  }
  assert.equal(waiting,true,'material writer must wait on payroll lock');assert.equal(finished,false);
  await hold.query('commit');await mutation;
  ok('material input writer cannot commit after revision check but before finalisation commit');
};
