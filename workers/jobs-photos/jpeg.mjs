// Validate the bounded, baseline JPEG produced by browser canvas and remove all
// APP/COM metadata. This is structural validation, not a full pixel decoder.
export function sanitizeJpeg(input) {
  const bad = () => { throw Object.assign(new Error('Use a supported JPEG photo.'), {status:400}); };
  const b = new Uint8Array(input);
  if (b.length < 20 || b.length > 2097152 || b[0] !== 255 || b[1] !== 216) bad();
  const parts = [b.subarray(0,2)];
  let p=2, frame=false, quant=false, huffman=false;
  while (p < b.length) {
    const start=p;
    if (b[p++] !== 255) bad();
    const marker=b[p++];
    if (p+2>b.length) bad();
    const length=(b[p]<<8)|b[p+1], end=p+length;
    if (length<2 || end>b.length) bad();
    if (marker===192) {
      if (frame || length<11 || b[p+2]!==8) bad();
      const height=(b[p+3]<<8)|b[p+4], width=(b[p+5]<<8)|b[p+6], components=b[p+7];
      if (!height || !width || height>1920 || width>1920 || ![1,3].includes(components) || length!==8+3*components) bad();
      frame=true;
    } else if (marker===219) quant=true;
    else if (marker===196) huffman=true;
    else if (marker===218) {
      if (!frame || !quant || !huffman || length<6 || length!==6+2*b[p+2]) bad();
      // Only a single baseline scan; no trailing data, hidden metadata or scans.
      for (let i=end;i<b.length;i++) {
        if (b[i]!==255) continue;
        const next=b[++i];
        if (next===0 || (next>=208 && next<=215)) continue;
        if (next===217 && i===b.length-1 && i>end) {
          parts.push(b.subarray(start));
          const output=new Uint8Array(parts.reduce((n,part)=>n+part.length,0));
          let offset=0; for(const part of parts){output.set(part,offset);offset+=part.length;}
          return output;
        }
        bad();
      }
      bad();
    } else if (marker!==221 && marker!==254 && !(marker>=224 && marker<=239)) bad();
    if (marker!==254 && !(marker>=224 && marker<=239)) parts.push(b.subarray(start,end));
    p=end;
  }
  bad();
}
