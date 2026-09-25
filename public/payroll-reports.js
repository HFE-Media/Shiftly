/* Payroll report presentation over server-authoritative finalised report data. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShiftlyPayrollReports=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const TYPES=Object.freeze([
    Object.freeze({id:'monthly',label:'Monthly Payroll Tax Report'}),
    Object.freeze({id:'ytd',label:'Year-to-Date (YTD) Payroll Report'}),
    Object.freeze({id:'emp201',label:'EMP201 Summary'})
  ]);
  const escape=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const number=value=>{const n=Number(value);return Number.isFinite(n)?n:0;};
  const money=value=>'R'+number(value).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
  function reportsApplicable(rules){return rules?.calculate_paye===true||rules?.calculate_uif===true;}
  function date(value){const d=new Date(`${value}T00:00:00Z`);if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value))||!Number.isFinite(d.getTime()))throw Error('Invalid report date');return d;}
  function monthLabel(value){return new Intl.DateTimeFormat('en-ZA',{month:'long',year:'numeric',timeZone:'UTC'}).format(date(value));}
  function longDate(value){return new Intl.DateTimeFormat('en-ZA',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(date(value));}
  function normalisePeriods(rows){return [...(rows||[])].map(row=>({...row,label:monthLabel(row.period_end),range:`${longDate(row.period_start)} – ${longDate(row.period_end)}`})).sort((a,b)=>String(b.period_end).localeCompare(String(a.period_end))||String(b.finalised_at).localeCompare(String(a.finalised_at))||String(b.id).localeCompare(String(a.id)));}
  function totals(rows){return (rows||[]).reduce((sum,row)=>({gross:sum.gross+number(row.gross),paye:sum.paye+number(row.paye),uif_combined:sum.uif_combined+number(row.uif_combined),sdl:sum.sdl+number(row.sdl)}),{gross:0,paye:0,uif_combined:0,sdl:0});}
  function model(bundle,type){
    if(!TYPES.some(item=>item.id===type))throw Error('Invalid payroll report type');
    const run=bundle?.run;if(!run?.id)throw Error('Finalised payroll report unavailable');
    const monthly=bundle.monthly||[];const rows=type==='ytd'?(bundle.ytd||[]):monthly;const sum=totals(rows);
    return {type,title:TYPES.find(item=>item.id===type).label,company:run.company?.name||'Company',month:monthLabel(run.period_end),period:`${longDate(run.period_start)} – ${longDate(run.period_end)}`,taxYear:Number(String(run.tax_year_start).slice(0,4))+1,rows,totals:sum,sdlSupported:bundle.sdl_supported===true,liability:sum.paye+sum.uif_combined+sum.sdl};
  }
  function employeeTable(report){
    const ytd=report.type==='ytd';
    const prefix=ytd?'YTD ':'';
    const columns=[
      {label:'Employee ID',width:12,value:row=>escape(row.employee_id),total:'TOTAL'},
      {label:'Employee Name',width:21,value:row=>escape(row.employee_name),total:''},
      {label:'ID Number',width:18,value:row=>escape(row.id_number||'—'),total:''},
      {label:`${prefix}Gross Remuneration`,width:17,numeric:true,value:row=>money(row.gross),total:money(report.totals.gross)},
      {label:`${prefix}PAYE`,width:11,numeric:true,value:row=>money(row.paye),total:money(report.totals.paye)},
      {label:`${prefix}UIF ×2`,width:11,numeric:true,value:row=>money(row.uif_combined),total:money(report.totals.uif_combined)},
      {label:`${prefix}SDL`,width:10,numeric:true,value:row=>money(row.sdl),total:money(report.totals.sdl)}
    ];
    const cells=values=>columns.map((column,index)=>`<td${column.numeric?' class="number"':''}>${values(column,index)}</td>`).join('');
    const body=report.rows.map(row=>`<tr>${cells(column=>column.value(row))}</tr>`).join('');
    return `<table><colgroup>${columns.map(column=>`<col style="width:${column.width}%">`).join('')}</colgroup><thead><tr>${columns.map(column=>`<th${column.numeric?' class="number"':''}>${column.label}</th>`).join('')}</tr></thead><tbody>${body}<tr class="total">${cells(column=>column.total)}</tr></tbody></table>`;
  }
  function emp201(report){return `<section class="liabilities"><h2>Payment Details</h2><div><span>PAYE Liability</span><b>${money(report.totals.paye)}</b></div><div><span>UIF Liability</span><b>${money(report.totals.uif_combined)}</b></div><div><span>SDL Liability</span><b>${money(report.totals.sdl)}</b></div><div class="grand"><span>Payroll Liability</span><b>${money(report.liability)}</b></div></section><p class="notice">EMP201 summary only. This report is not proof of submission to SARS.</p>`;}
  function documentHtml(bundle,type,generated=new Date()){
    const report=model(bundle,type);const subtitle=type==='ytd'?`Tax Year: ${report.taxYear}<br>Up to Payroll Period: ${escape(report.period)}`:`Payroll Period: ${escape(report.period)}`;
    const sdlNote=report.sdlSupported?'':'<p class="note">SDL is not currently calculated by Shiftly and is shown as R0.00.</p>';
    return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(report.title)} — ${escape(report.month)}</title><style>@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{margin:0;background:#ddd;color:#171717;font:11px Arial,sans-serif}.tools{position:fixed;right:12px;top:10px}.tools button{padding:10px 14px;font-weight:800;background:#fff;border:1px solid #111;border-radius:5px}.page{width:297mm;min-height:210mm;margin:0 auto;background:#fff;padding:14mm}.head{display:flex;justify-content:space-between;border-bottom:3px solid #b8860b;padding-bottom:11px}.head h1{margin:4px 0;color:#9b7100}.meta{text-align:right;line-height:1.55}table{width:100%;table-layout:fixed;border-collapse:collapse;margin-top:18px}thead{display:table-header-group}tr{break-inside:avoid}th,td{padding:7px 6px;border-bottom:1px solid #ddd;text-align:left}th{background:#f3f1ec;text-transform:uppercase;font-size:8px}.number{text-align:right}.total{font-weight:800;background:#f7f4ee}.liabilities{width:320px;max-width:100%;margin:28px 0 0 0;padding:14px;border:1px solid #d9d3c7;border-radius:7px}.liabilities h2{margin:0 0 8px;text-transform:uppercase;font-size:11px;color:#9b7100}.liabilities div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:28px;align-items:center;padding:9px 8px;border-bottom:1px solid #ddd}.liabilities div b{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}.liabilities .grand{margin-top:3px;border:0;background:#171717;color:#fff;font-size:13px;font-weight:800}.notice,.note{color:#666;margin-top:14px}.footer{margin-top:25px;border-top:1px solid #ddd;padding-top:8px;color:#666;display:flex;justify-content:space-between}@media print{body{background:#fff}.tools{display:none}.page{width:auto;min-height:0;padding:0}}</style></head><body><div class="tools"><button onclick="window.print()">Print / Save PDF</button></div><main class="page"><header class="head"><div><b>${escape(report.company)}</b><h1>${escape(report.title)} — ${escape(report.month)}</h1></div><div class="meta">${subtitle}</div></header>${type==='emp201'?emp201(report):employeeTable(report)}${sdlNote}<footer class="footer"><span>Generated by Shiftly</span><span>${escape(new Intl.DateTimeFormat('en-ZA',{dateStyle:'long'}).format(generated))}</span></footer></main></body></html>`;
  }
  return Object.freeze({TYPES,reportsApplicable,monthLabel,longDate,normalisePeriods,totals,model,documentHtml});
});
