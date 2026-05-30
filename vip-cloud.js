// ============================================================
// VIP zóna — cloudové úložisko (Supabase)
// Mário Tišťan · Partners Group SK
// URL aj publishable key sú VEREJNÉ (bezpečné v prehliadači).
// Prístup k dátam chráni Row Level Security (každý vidí len svoje).
// ============================================================
(function(){
  var SUPABASE_URL = 'https://myntuhdvoksykpnxjqgk.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_av-jz49vt71NeSq1eqSzDA_KducRdBO';
  if(!window.supabase || !window.supabase.createClient){
    console.error('Supabase knižnica sa nenačítala.');
    return;
  }
  window.sbc = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
})();

// ── Autentifikácia ──────────────────────────────────────────
// Ochrana stránky: ak nie je relácia, presmeruje na login.
async function vipRequireAuth(){
  try{
    var res = await window.sbc.auth.getSession();
    if(!res.data.session){ window.location.replace('vip-login.html'); return null; }
    return res.data.session.user;
  }catch(e){
    window.location.replace('vip-login.html');
    return null;
  }
}
async function vipCurrentUser(){
  try{
    var res = await window.sbc.auth.getSession();
    return res.data.session ? res.data.session.user : null;
  }catch(e){ return null; }
}
async function vipLogout(){
  try{ await window.sbc.auth.signOut(); }catch(e){}
  window.location.replace('vip-login.html');
}

// ── AOF cloud (CRUD) ────────────────────────────────────────
async function aofCloudList(){
  var r = await window.sbc.from('aof_analyzy')
    .select('id,nazov,updated_at')
    .order('updated_at', { ascending: false });
  if(r.error) throw r.error;
  return r.data || [];
}
async function aofCloudGet(id){
  var r = await window.sbc.from('aof_analyzy').select('*').eq('id', id).single();
  if(r.error) throw r.error;
  return r.data;
}
// id = undefined → nový záznam (insert); id zadané → update existujúceho
async function aofCloudSave(nazov, dataObj, id){
  var user = await vipCurrentUser();
  if(!user) throw new Error('Nie ste prihlásený.');
  if(id){
    var u = await window.sbc.from('aof_analyzy')
      .update({ nazov: nazov, data: dataObj }).eq('id', id).select().single();
    if(u.error) throw u.error;
    return u.data;
  }
  var ins = await window.sbc.from('aof_analyzy')
    .insert({ user_id: user.id, nazov: nazov, data: dataObj }).select().single();
  if(ins.error) throw ins.error;
  return ins.data;
}
async function aofCloudDelete(id){
  var r = await window.sbc.from('aof_analyzy').delete().eq('id', id);
  if(r.error) throw r.error;
}

// Pomôcka: rozlíši cloud UUID od starého localStorage kľúča (aof_...)
function isCloudId(v){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
