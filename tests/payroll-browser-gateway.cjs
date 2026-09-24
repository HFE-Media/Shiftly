module.exports=async function({admin,connect,user,call,owner,employee,c}){
  const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
  const Authority=require('../src/payroll-authority.js');
  const base='http://127.0.0.1:5197',root=path.resolve('public');
  const key=crypto.randomBytes(32),requests=[];
  const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
  const signature=s=>crypto.createHmac('sha256',key).update(s).digest('base64url');
  const token=id=>{const s=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600});return s+'.'+signature(s);};
  const identity=auth=>{const [h,p,s]=String(auth).replace(/^Bearer /,'').split('.');if(!s||signature(h+'.'+p)!==s)throw Error('Synthetic login required');const value=JSON.parse(Buffer.from(p,'base64url'));if(value.exp<Date.now()/1000||![owner,employee].includes(value.sub))throw Error('Invalid synthetic session');return value.sub;};
  const person=id=>({id,aud:'authenticated',role:'authenticated',email:id===owner?'owner@acceptance.invalid':'employee@acceptance.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'});
  const rpc=async(auth,name,args)=>{const client=await user(identity(auth));try{return await call(client,name,args);}finally{await client.end();}};
  const authority=Authority.create({secret:key.toString('hex'),user:async auth=>person(identity(auth)),logo:async()=>'',
    inputs:(auth,c,s,t)=>rpc(auth,'get_payroll_calculation_inputs',[c,s,t]),request:(auth,c,r)=>rpc(auth,'get_payroll_request',[c,r]),
    commit:async(actor,c,r,p)=>{const client=await connect();try{await client.query('set role service_role');return await call(client,'commit_trusted_payroll',[c,r,p,actor]);}finally{await client.end();}}});
  const schema=new Map();for(const row of (await admin.query("select table_name,column_name from information_schema.columns where table_schema='public'")).rows){if(!schema.has(row.table_name))schema.set(row.table_name,new Set());schema.get(row.table_name).add(row.column_name);}
  const names={get_payroll_history:['c','s','t'],get_payroll_calculation_inputs:['c','s','t'],get_payroll_request:['c','request'],get_employee_payroll_ytd:['c','e','y'],get_employee_payroll_ytd_at:['c','e','y','as_at'],get_own_payroll_ytd:['c','s','t'],get_own_payroll_snapshot:['c','s','t'],get_payroll_report_periods:['c'],get_payroll_report:['c','r_id'],save_employee_with_ytd:['c','e','is_new','details','targets','expected_revision','request'],finalise_payroll:['c','request','payload'],commit_trusted_payroll:['c','request','payload','actor']};
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,base),auth=req.headers.authorization||'';const route=url.pathname;
    requests.push({method:req.method,path:route});
    res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"connect-src 'self'; object-src 'none'");
    const json=(data,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
    try{
      let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>100000)throw Error('Request too large');}const body=raw?JSON.parse(raw):{};
      if(route==='/acceptance-status')return json({requests,runs:(await admin.query('select id,period_start,period_end,employee_count from payroll_runs')).rows,totals:(await admin.query('select employee_id,paye_deducted,employee_uif from employee_payroll_period_totals')).rows,adjustments:(await admin.query('select employee_id,value_type,delta from payroll_financial_events')).rows});
      if(route==='/auth/v1/token'){
        let id;if(url.searchParams.get('grant_type')==='refresh_token')id=identity('Bearer '+body.refresh_token);
        else {if(body.password!=='Synthetic-Only-5197!')throw Error('Synthetic password required');id=body.email==='owner@acceptance.invalid'?owner:body.email==='employee@acceptance.invalid'?employee:null;if(!id)throw Error('Unknown synthetic user');}
        const access=token(id);return json({access_token:access,refresh_token:access,token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:person(id)});
      }
      if(route==='/auth/v1/user')return json(person(identity(auth)));
      if(route==='/auth/v1/logout')return json({});
      if(route==='/payroll-authority')return json(await authority(auth,body));
      if(route.startsWith('/rest/v1/rpc/')){const name=route.split('/').pop();if(!names[name])throw Error('Unsupported fixture RPC '+name);return json(await rpc(auth,name,names[name].map(k=>body[k]??null)));}
      if(route.startsWith('/rest/v1/')){
        const actor=identity(auth),table=route.split('/').pop();
        if(!schema.has(table)){if(req.method==='GET'||req.method==='HEAD')return json([]);throw Error('Unsupported fixture table');}
        const columns=schema.get(table),params=[],where=[];
        for(const [name,value]of url.searchParams){if(!columns.has(name))continue;const dot=value.indexOf('.'),op=value.slice(0,dot),v=value.slice(dot+1);
          if(op==='in'){const list=v.replace(/^\(|\)$/g,'').split(',').map(x=>x.replaceAll('"',''));params.push(list);where.push('"'+name+'"=any($'+params.length+')');}
          else if(['eq','gte','lte','gt','lt'].includes(op)){params.push(v);where.push('"'+name+'"'+({eq:'=',gte:'>=',lte:'<=',gt:'>',lt:'<'}[op])+'$'+params.length);}
        }
        // Only synthetic tenant is reachable. SQL RPCs enforce real role/RLS checks.
        if(columns.has('company_id')){params.push(c);where.push('company_id=$'+params.length);}
        if(table==='company_users'){params.push(actor);where.push('user_id=$'+params.length);}
        if(actor===employee&&columns.has('employee_id')&&table!=='company_users'){params.push('E1');where.push('employee_id=$'+params.length);}
        const filter=where.length?' where '+where.join(' and '):'';
        if(!['GET','HEAD'].includes(req.method)){
          if(table!=='company_payroll_rules'||req.method!=='POST'||actor!==owner||!body||Array.isArray(body))
            throw Error('Direct writes disabled in fixture; use actual audited UI RPC');
          const writable=Object.keys(body).filter(name=>columns.has(name)&&!['company_id','created_at','updated_at'].includes(name));
          if(!writable.length)throw Error('No supported payroll rules supplied');
          const values=[c,...writable.map(name=>body[name])];
          const quoted=writable.map(name=>'"'+name+'"');
          const assignments=writable.map((name,index)=>'"'+name+'"=$'+(index+2));
          const client=await user(actor);let rows;
          try{rows=(await client.query('update "company_payroll_rules" set '+assignments.join(',')+' where company_id=$1 returning *',values)).rows;}
          finally{await client.end();}
          return json(rows);
        }
        const client=await user(actor);let rows;try{rows=(await client.query('select * from "'+table+'"'+filter,params)).rows;}finally{await client.end();}
        res.setHeader('Content-Range','0-'+Math.max(0,rows.length-1)+'/'+rows.length);
        const single=String(req.headers.accept||'').includes('application/vnd.pgrst.object');return json(single?rows[0]||null:rows);
      }
      if(route==='/config.js'){res.setHeader('Content-Type','application/javascript');return res.end('window.SHIFTLY_CONFIG='+JSON.stringify({SUPABASE_URL:base,SUPABASE_ANON_KEY:'synthetic-local-anon-placeholder-not-production-5197',PAYROLL_HISTORY_LOCAL:true,PAYROLL_AUTHORITY_URL:base+'/payroll-authority',ENVIRONMENT_LABEL:'ISOLATED ACCEPTANCE'})+';');}
      if(route==='/service-worker.js')return json({error:'Disabled in fixture'},404);
      const file=path.resolve(root,'.'+(route==='/'||route==='/login'?'/login.html':route));
      if(!file.startsWith(root+path.sep)||path.basename(file)==='config.js')throw Error('Invalid asset');
      res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
    }catch(e){if(!res.headersSent)json({error:e.message,message:e.message},400);else res.end();}
  });
  await new Promise(resolve=>server.listen(5197,'127.0.0.1',resolve));
  console.log('Isolated PostgreSQL-backed UI acceptance ready: '+base+'/login');
  await new Promise(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve);});
  await new Promise(resolve=>server.close(resolve));
};
