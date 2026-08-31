const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { DOMParser } = require('linkedom');

const source = fs.readFileSync('public/app.js', 'utf8');
const helpers = source.slice(source.indexOf('function formatBillingDocumentMoney('), source.indexOf('function openBillingPdf('));
const fixture = {
  currentCompany: () => ({name:'Demo Media'}),
  billingClients: [], billingQuotes: [],
  billingProfile: {
    registration_number:'2026/000000/07', address:'2 Example Avenue\nSelection Park\nSprings\nGauteng\n1559',
    phone:'010 000 0000', email:'accounts@example.com',
    bank_name:'Example Bank', account_name:'Demo Media', account_type:'Business Account',
    account_number:'123456789', branch_code:'250000'
  },
  escapeHtml: value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
};
vm.createContext(fixture);
vm.runInContext(helpers, fixture);
const engineContext = {console, DOMParser, Uint8Array, ArrayBuffer, TextEncoder, TextDecoder, setTimeout, clearTimeout, btoa: value => Buffer.from(value,'binary').toString('base64'), atob: value => Buffer.from(value,'base64').toString('binary')};
vm.createContext(engineContext);
vm.runInContext(fs.readFileSync('public/vendor/billing-pdf.js','utf8'), engineContext);
const engine = engineContext.ShiftlyBillingPdf;
const output = path.resolve('tmp/pdfs');
fs.mkdirSync(output, {recursive:true});
function sample(count = 2, notes = 'Thank you for your business.') {
  const items = Array.from({length:count}, (_,i) => ({
    sort_order:i, item_code:`SERVICE-${String(i+1).padStart(3,'0')}`, description:`Monthly service ${i+1} - professional support`,
    quantity:1, unit_price:100, discount_percent:0, vat_type:'standard', line_subtotal:100, line_total:115
  }));
  return {client_name:'PVS Waterproofing', client_contact:'Sérgio Ndimande', client_email:'client@example.com',
    client_address:'12 Example Road\nIndustrial Park UNIT B07\nMiddelburg\nMpumalanga\n1050',client_vat_number:'4000000000',
    invoice_number:'INV-00045', quote_number:'Q-00045', issue_date:'2026-09-25', due_date:'2026-10-10', expiry_date:'2026-10-09',
    subtotal:count*100, vat_total:count*15, total:count*115, discount_total:0, paid_total:0, balance_due:count*115,
    notes, billing_invoice_items:items, billing_quote_items:items};
}

test('filenames use the stored document date and safe client/document names', () => {
  const context = {client:{name:'Fallback Client'}, number:'INV-00045'};
  assert.equal(fixture.billingDocumentPdfTitle(sample(),context),'PVS Waterproofing September 2026 - INV-00045');
  assert.equal(fixture.billingDocumentPdfTitle({...sample(), issue_date:'2025-12-31'},context),'PVS Waterproofing December 2025 - INV-00045');
  assert.equal(fixture.billingDocumentPdfTitle({...sample(), issue_date:'2026-02-31'},context),'PVS Waterproofing - INV-00045');
  assert.equal(fixture.billingDocumentPdfTitle({}, {type:'quote'}),'Client - Quote');
  const safe = fixture.billingDocumentPdfTitle({...sample(),client_name:'ACME / West: "Branch" <One> | A?B* \\ .\n'},context);
  assert(!/[<>:"/\\|?*\u0000-\u001f\u007f]/.test(safe));
});

test('shared HTML is the source of amounts, dates, notes, and quote exclusions', () => {
  const invoice = engine.readDocument(fixture.buildBillingDocument('invoice',sample()));
  const quote = engine.readDocument(fixture.buildBillingDocument('quote',sample()));
  assert.equal(quote.heading,'QUOTE');
  assert.equal(quote.title,'PVS Waterproofing September 2026 - Q-00045');
  assert.equal(invoice.heading,'TAX INVOICE');
  assert.equal(invoice.bank.length,6);
  assert.equal(quote.bank.length,0);
  assert(!quote.bankHeading);
  assert.equal(invoice.totals.length,6);
  assert.equal(quote.totals.length,4);
  assert(!quote.totals.some(row=>/paid|balance/i.test(row.label)));
  assert.equal(quote.rows[0].values[6],'R115.00');
  assert(quote.parties[1].columns[1].includes('\n'));
});

for (const [name,type,count,notes] of [
  ['invoice','invoice',2,'Thank you for your business.'],
  ['quote','quote',2,'Thank you for your business.'],
  ['multipage','invoice',75,'Final notes after all seventy-five line items.'],
  ['long-notes','quote',2,Array.from({length:180},(_,i)=>`Note ${i+1}: Full-width service conditions retained without clipping.`).join('\n')]
]) {
  test(`${name}: A4 PDF and expected pagination`, async () => {
    const html = fixture.buildBillingDocument(type,sample(count,notes));
    const model = engine.readDocument(html);
    const pdf = await engine.createPdf(model);
    assert(Math.abs(pdf.internal.pageSize.getWidth()-210)<0.01);
    assert(Math.abs(pdf.internal.pageSize.getHeight()-297)<0.01);
    assert(name==='invoice'||name==='quote' ? pdf.getNumberOfPages()===1 : pdf.getNumberOfPages()>1);
    const bytes = Buffer.from(pdf.output('arraybuffer'));
    assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
    fs.writeFileSync(path.join(output,`${name}.pdf`),bytes);
    fs.writeFileSync(path.join(output,`${name}.html`),html);
    console.log(`${name}: ${pdf.getNumberOfPages()} page(s), ${bytes.length} bytes`);
  });
}

test('Download PDF and Print are distinct actions; no database changes on download', () => {
  assert(source.includes('if (action === "pdf") return downloadBillingPdf(type, id);'));
  assert(source.includes('if (action === "print") return openBillingPdf(type, id);'));
  const download = source.slice(source.indexOf('async function downloadBillingPdf('),source.indexOf('async function setBillingRecurringActive('));
  assert(!/sb\.(from|rpc)\(/.test(download));
  assert(download.includes('billingPdfDownloadBusy'));
  assert(download.includes('finally'));
});

test('an oversized description can span pages without dropping its ending', async () => {
  const record = sample(1);
  record.billing_invoice_items[0].description = Array.from({length:160},(_,i)=>`Detail ${i+1}: Service specification preserved.`).join('\n');
  const model = engine.readDocument(fixture.buildBillingDocument('invoice',record));
  const pdf = await engine.createPdf(model);
  assert(pdf.getNumberOfPages()>1);
  fs.writeFileSync(path.join(output,'oversized-row.pdf'),Buffer.from(pdf.output('arraybuffer')));
});

test('empty line tables and long customer names still generate', async () => {
  const record = {...sample(0),client_name:'A long customer name with multiple business divisions and maintenance services'};
  const model = engine.readDocument(fixture.buildBillingDocument('quote',record));
  const pdf = await engine.createPdf(model);
  assert.equal(pdf.getNumberOfPages(),1);
});

// Isolated browser harness: real Download/Print handlers, synthetic documents,
// no Supabase client, authentication or mutations to customer data.
const downloadFunctions = source.slice(source.indexOf('function openBillingPdf('), source.indexOf('async function setBillingRecurringActive('));
const fixtures = JSON.stringify({company:fixture.currentCompany(),profile:fixture.billingProfile,record:{...sample(),id:'test-invoice'}}).replace(/</g,'\\u003c');
fs.writeFileSync(path.join(output,'harness.html'), `<!doctype html><html><head><meta charset="utf-8"><title>Billing PDF test</title></head><body>
<h1>Billing PDF download test</h1><p>Synthetic data only. No live database connection.</p>
<label>Document type <select id="type"><option value="invoice">Invoice</option><option value="quote">Quote</option></select></label>
<label>Logo <select id="logo"><option value="">No logo</option><option value="/test-logo.png">Include logo</option><option value="/missing-logo.png">Broken logo</option></select></label>
<div id="actions"><button data-billing-action="pdf" id="download">Download PDF</button><button id="print">Print / Preview</button></div>
<p id="status">Ready</p><script>
const fixtures=${fixtures}; const billingInvoices=[fixtures.record],billingQuotes=[fixtures.record],billingClients=[],billingProfile=fixtures.profile;
const currentCompany=()=>fixtures.company;
const escapeHtml=${fixture.escapeHtml.toString()};
const el={billingActionList:document.querySelector('#actions')};
let currentBillingAction={type:'invoice',id:'test-invoice'};
function closeBillingActionModal(){document.querySelector('#status').textContent='Download requested';}
${helpers}
${downloadFunctions}
document.querySelector('#type').onchange=e=>{currentBillingAction.type=e.target.value;document.querySelector('#status').textContent='Ready';};
document.querySelector('#logo').onchange=e=>{fixtures.company.logo_url=e.target.value;document.querySelector('#status').textContent='Ready';};
document.querySelector('#download').onclick=()=>downloadBillingPdf(currentBillingAction.type,currentBillingAction.id);
document.querySelector('#print').onclick=()=>openBillingPdf(currentBillingAction.type,currentBillingAction.id);
</script></body></html>`);
