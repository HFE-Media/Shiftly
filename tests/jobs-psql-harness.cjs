// Runs this repository's limited psql test syntax through an already-local pg
// connection. Supports quoted variables, SQL/dollar strings, \gset and the
// explicit disposable gate. It does not support connections or shell commands.
module.exports=async function run(client,source,variables,onResult){
  if(variables.jobs_disposable_test_database!=='on')throw Error('Disposable gate required');
  const lines=source.split(/\r?\n/);let skip=false;
  source=lines.filter(line=>{
    if(line.startsWith('\\if :{?jobs_disposable_test_database}'))return false;
    if(line.startsWith('\\else')){skip=true;return false;}
    if(line.startsWith('\\endif')){skip=false;return false;}
    if(skip||line.startsWith('\\set ')||line.startsWith('\\echo '))return false;
    return true;
  }).join('\n');
  let buffer='',quote=null,dollar=null;
  async function flush(gset=false){
    if(!buffer.trim())return;
    const sql=buffer.replace(/:'([a-z_]+)'/gi,(_,key)=>{if(!(key in variables))throw Error('Missing '+key);return "'"+String(variables[key]).replace(/'/g,"''")+"'";})
      .replace(/(?<!:):([a-z_]+)\b/gi,(_,key)=>{if(!(key in variables))throw Error('Missing '+key);if(!/^\d+$/.test(String(variables[key])))throw Error('Only numeric unquoted variables');return variables[key];});
    buffer='';const result=await client.query(sql);onResult({sql,rows:result.rows});
    if(gset){if(result.rows.length!==1)throw Error('gset requires one row');Object.assign(variables,result.rows[0]);}
  }
  for(let i=0;i<source.length;i++){
    const c=source[i];
    if(dollar){if(source.startsWith(dollar,i)){buffer+=dollar;i+=dollar.length-1;dollar=null;}else buffer+=c;continue;}
    if(quote){buffer+=c;if(c===quote){if(source[i+1]===quote){buffer+=source[++i];}else quote=null;}continue;}
    if(c==='-'&&source[i+1]==='-'){while(i<source.length&&source[i]!=='\n')i++;buffer+='\n';continue;}
    if(c==="'"||c==='"'){quote=c;buffer+=c;continue;}
    if(c==='$'){const match=source.slice(i).match(/^\$[a-z_]*\$/i);if(match){dollar=match[0];buffer+=dollar;i+=dollar.length-1;continue;}}
    if(source.startsWith('\\gset',i)){await flush(true);i+=4;continue;}
    if(c===';'){await flush();continue;}
    if(c==='\\')throw Error('Unsupported psql command');
    buffer+=c;
  }
  if(quote||dollar)throw Error('Unterminated SQL string');await flush();
};
