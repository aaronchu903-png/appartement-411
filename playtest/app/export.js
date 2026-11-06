(function () {
  'use strict';
  const status = document.getElementById('export-status');
  const output = document.getElementById('export-json');
  let storage, result;
  try { storage = localStorage; result = Day8Save.exportLegacy(storage); }
  catch (_) { result = {ok:false,error:'Storage is unavailable in this browser context.'}; }
  output.value = result.text || '';
  status.textContent = result.ok ? `Jinyi · ${result.counts.words} words · ${result.counts.cards} review cards. Original save unchanged.` : result.error || 'No Jinyi save is visible here. Open this page in the old game’s original origin and storage context.';
  document.getElementById('download-export').disabled = !result.ok;
  document.getElementById('copy-export').disabled = !result.ok;
  function download(text, name) {
    const url = URL.createObjectURL(new Blob([text],{type:'application/json'}));
    const anchor = document.createElement('a'); anchor.href=url;anchor.download=name;anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  document.getElementById('download-export').onclick = () => download(output.value,'a411-jinyi-export.json');
  document.getElementById('copy-export').onclick = async () => {
    try { await navigator.clipboard.writeText(output.value);status.textContent='已复制 · Copied. Original save unchanged.'; }
    catch (_) {output.focus();output.select();status.textContent='请选择上方文本并复制，或下载文件。 Select and copy the text, or use Download.';}
  };
  document.getElementById('legacy-export').onclick = () => {
    if (!document.getElementById('legacy-consent').checked) {status.textContent='Please explicitly confirm this unnamed save belongs to you.';return;}
    const key=document.getElementById('legacy-key').value;
    if (!['a411.save','a411.save.tmp','a404.save','a404.save.tmp'].includes(key)) return;
    try {
      const text=storage.getItem(key);
      if (!text) throw new Error('No save at the selected key.');
      const checked=Day8Save.importData(text,null,[],{allowLegacy:true});
      if (!checked.ok) throw new Error(checked.error);
      output.value=text;download(text,'a411-selected-legacy-export.json');status.textContent='Legacy export downloaded. Original save unchanged.';
    } catch (error) {status.textContent=error.message;}
  };
})();
