const k='AIzaSyBjU1_zqwIathLAB4LH2LnemwaIHp-d9Zc'; 
const test = async (m) => { 
  try { 
    const s = Date.now(); 
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + k, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }] }) 
    }); 
    const d = await r.json(); 
    console.log(m, r.status, d.error ? d.error.message : (Date.now() - s) + 'ms'); 
  } catch (e) { 
    console.log(m, 'error', e.message); 
  } 
}; 
(async () => {
  await test('gemini-flash-lite-latest'); 
  await test('gemini-1.5-flash'); 
  await test('gemini-2.5-flash-lite'); 
  await test('gemini-flash-latest');
})();
