import { createClient } from '@supabase/supabase-js';

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const hostname = url.hostname;
      const AVAILABLE_DOMAINS = (env.DOMAINS || env.DOMAIN || 'miuzy.web.id').split(',').map(d => d.trim());
      const ADMIN_KEY = env.ADMIN_KEY;
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

      if (url.pathname === '/robots.txt') {
        return new Response('User-agent: *\nAllow: /\n\nUser-agent: facebookexternalhit\nAllow: /\n\nUser-agent: Facebot\nAllow: /', {
          headers: { 'Content-Type': 'text/plain' }
        });
      }
      if (url.pathname === '/favicon.ico') {
        return new Response('', { status: 204 });
      }

      const rootDomain = AVAILABLE_DOMAINS.find(d => hostname.endsWith(d));
      if (rootDomain && hostname !== rootDomain && !hostname.startsWith('www.')) {
        const sub = hostname.split('.')[0];
        return await handleRedirect(supabase, sub);
      }

      if (url.pathname.startsWith('/api/')) {
        const auth = request.headers.get('Authorization');
        if (auth !== `Bearer ${ADMIN_KEY}`) {
          return json({ error: 'Unauthorized' }, 401);
        }
        if (url.pathname === '/api/create' && request.method === 'POST') {
          return handleCreate(request, supabase);
        }
        if (url.pathname === '/api/list' && request.method === 'GET') {
          return handleList(supabase);
        }
        if (url.pathname.startsWith('/api/delete/') && request.method === 'DELETE') {
          return handleDelete(supabase, url.pathname.split('/').pop());
        }
      }

      if (url.pathname === '/' || url.pathname === '') {
        return new Response(getDashboardHTML(AVAILABLE_DOMAINS), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
      return new Response('Not Found', { status: 404 });
    } catch (err) {
      return new Response('Error: ' + err.message, { status: 500 });
    }
  }
};

async function handleRedirect(supabase, sub) {
  const { data, error } = await supabase
    .from('links')
    .select('target_url,title,description,image_url,domain')
    .eq('subdomain', sub)
    .single();

  if (error || !data) {
    return new Response('Link Tidak Ditemukan', { status: 404 });
  }

  const ua = (await supabase).headers?.get('User-Agent') || '';
  const isFacebookCrawler = /facebookexternalhit|Facebot/i.test(ua);

  if (isFacebookCrawler) {
    return new Response(getOgHTML(data, sub), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Robots-Tag': 'noindex, nofollow'
      }
    });
  }

  return new Response(getRedirectHTML(data.target_url), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  });
}

async function handleCreate(req, supabase) {
  try {
    const body = await req.json();
    const sub = body.subdomain?.toLowerCase().trim();
    const domain = body.domain;
    const targetUrl = body.targetUrl?.trim();
    const title = body.title?.trim();
    const description = body.description?.trim();
    const imageUrl = body.imageUrl?.trim();

    if (!sub || !domain || !targetUrl) {
      return json({ error: 'Subdomain, Domain, dan URL Tujuan wajib diisi' }, 400);
    }

    const { data: existing } = await supabase
      .from('links')
      .select('subdomain')
      .eq('subdomain', sub)
      .single();

    if (existing) {
      return json({ error: 'Subdomain sudah ada' }, 409);
    }

    const { error } = await supabase.from('links').insert({
      subdomain: sub,
      domain: domain,
      target_url: targetUrl,
      title: title || null,
      description: description || null,
      image_url: imageUrl || null
    });

    if (error) return json({ error: error.message }, 500);
    return json({ success: true, url: `https://${sub}.${domain}` });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

async function handleList(supabase) {
  try {
    const { data, error } = await supabase
      .from('links')
      .select('subdomain,domain,title,target_url')
      .order('subdomain', { ascending: true });

    if (error) return json({ error: error.message }, 500);
    return json({ success: true, data: data || [] });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

async function handleDelete(supabase, sub) {
  try {
    if (!sub || sub.trim() === '') return json({ error: 'Subdomain tidak valid' }, 400);
    const { error } = await supabase.from('links').delete().eq('subdomain', sub);
    if (error) return json({ error: error.message }, 500);
    return json({ success: true, message: 'Link berhasil dihapus' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

function getRedirectHTML(url) {
  const cleanUrl = url.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta http-equiv="refresh" content="1; url=${cleanUrl}">
<title>Loading...</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#0f0f1a;display:flex;justify-content:center;align-items:center;min-height:100vh;overflow:hidden}
.loader{display:flex;flex-direction:column;align-items:center;gap:14px}
.spinner{width:48px;height:48px;border:3px solid rgba(99,102,241,0.2);border-top:3px solid #6366f1;border-radius:50%;animation:spin 0.8s linear infinite}
@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.dots{display:flex;gap:5px;margin-top:10px}
.dot{width:6px;height:6px;background:#6366f1;border-radius:50%;animation:bounce 1.4s infinite ease-in-out both;opacity:0.5}
.dot:nth-child(1){animation-delay:-0.32s}.dot:nth-child(2){animation-delay:-0.16s}
@keyframes bounce{0%,80%,100%{transform:scale(0.5)}40%{transform:scale(1)}}
p{color:#64748b;font-size:15px;font-weight:500;margin-top:6px;letter-spacing:0.5px}
</style>
<script>
setTimeout(()=>window.location.href="${cleanUrl}",1000);
document.addEventListener('click',()=>window.location.href="${cleanUrl}");
<\/script>
</head>
<body>
<div class="loader" onclick="window.location.href='${cleanUrl}'">
<div class="spinner"></div>
<div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
<p>Redirecting...</p>
</div>
</body>
</html>`;
}

function getOgHTML(d, sub) {
  const img = d.image_url || 'https://via.placeholder.com/1200x630/6366f1/ffffff?text=Video';
  const title = (d.title || '').replace(/"/g, '&quot;');
  const desc = (d.description || '').replace(/"/g, '&quot;');
  const domain = d.domain || '';
  return `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${img}">
<meta property="og:url" content="https://${sub}.${domain}/">
<title>${title}</title>
</head><body><h1>${title}</h1><p>${desc}</p><img src="${img}" alt="${title}"></body></html>`;
}

function getDashboardHTML(domains) {
  const options = domains.map(d => `<option value="${d}">${d}</option>`).join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Login Generate &mdash; Dashboard</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#0b0b14;--card:rgba(255,255,255,0.035);--card-hover:rgba(255,255,255,0.06);
    --border:rgba(255,255,255,0.06);--primary:#6366f1;--primary-glow:rgba(99,102,241,0.3);
    --primary-light:#818cf8;--accent:#c084fc;--danger:#ef4444;--success:#22c55e;
    --text:#f8fafc;--text-secondary:#94a3b8;--text-muted:#64748b;
    --radius:18px;--radius-sm:12px;--shadow:0 8px 32px rgba(0,0,0,0.45);
    --shadow-glow:0 0 60px rgba(99,102,241,0.12);
  }
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif}
  body{background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden;line-height:1.5;}
  body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse at 20% 20%,rgba(99,102,241,0.12) 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,rgba(139,92,246,0.08) 0%,transparent 50%);pointer-events:none;z-index:0;}
  .app-container{position:relative;z-index:1;max-width:1440px;margin:0 auto;display:flex;min-height:100vh}
  .sidebar{width:280px;background:rgba(11,11,20,0.85);backdrop-filter:blur(24px);border-right:1px solid var(--border);padding:32px 20px;position:fixed;height:100vh;overflow-y:auto;z-index:100;display:none;flex-direction:column;}
  .sidebar-logo{font-size:26px;font-weight:800;background:linear-gradient(135deg,var(--primary-light),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:40px;padding:0 12px;}
  .nav-item{display:flex;align-items:center;gap:14px;padding:14px 18px;margin:6px 0;border-radius:var(--radius-sm);color:var(--text-secondary);font-weight:600;font-size:15px;transition:all 0.3s;cursor:pointer;border:1px solid transparent;}
  .nav-item:hover{background:var(--card-hover);color:var(--text);border-color:var(--border);}
  .nav-item.active{background:linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08));color:var(--primary-light);border-color:rgba(99,102,241,0.18);box-shadow:0 0 20px rgba(99,102,241,0.08);}
  .sidebar-footer{margin-top:auto;padding-top:24px;border-top:1px solid var(--border);font-size:12px;color:var(--text-muted);text-align:center;}
  .main-content{flex:1;margin-left:0;padding:20px;width:100%;padding-bottom:100px;}
  .mobile-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;background:rgba(11,11,20,0.9);backdrop-filter:blur(20px);margin:-20px -20px 24px -20px;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:99;}
  .mobile-title{font-size:22px;font-weight:800;background:linear-gradient(135deg,var(--primary-light),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
  .card{background:var(--card);backdrop-filter:blur(16px);border:1px solid var(--border);border-radius:var(--radius);padding:28px;margin-bottom:24px;box-shadow:var(--shadow);transition:all 0.3s;}
  .card:hover{box-shadow:var(--shadow-glow)}
  .card-title{font-size:20px;font-weight:700;margin-bottom:6px;color:var(--text);display:flex;align-items:center;justify-content:space-between;}
  .card-subtitle{font-size:13px;color:var(--text-muted);font-weight:500;margin-bottom:24px;}
  .form-group{margin-bottom:20px}
  label{display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;}
  input,textarea{width:100%;padding:14px 18px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:15px;background:rgba(255,255,255,0.025);color:var(--text);transition:all 0.2s;min-height:48px;outline:none;}
  input::placeholder,textarea::placeholder{color:var(--text-muted);opacity:0.5}
  input:focus,textarea:focus{border-color:var(--primary);box-shadow:0 0 0 4px var(--primary-glow),0 0 20px rgba(99,102,241,0.08);background:rgba(255,255,255,0.04);}
  select{width:100%;padding:14px 18px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:15px;background:rgba(255,255,255,0.025);color:var(--text);cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center;padding-right:44px;outline:none;}
  select:focus{border-color:var(--primary);box-shadow:0 0 0 4px var(--primary-glow);}
  textarea{resize:vertical;min-height:80px}
  .form-row{display:grid;grid-template-columns:1fr;gap:20px}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:14px 28px;border:none;border-radius:var(--radius-sm);font-size:15px;font-weight:600;cursor:pointer;transition:all 0.3s;min-height:48px;width:100%;position:relative;overflow:hidden;}
  .btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0.1),transparent);opacity:0;transition:opacity 0.3s;}
  .btn:hover::before{opacity:1}
  .btn:hover{transform:translateY(-2px)}
  .btn-primary{background:linear-gradient(135deg,var(--primary),#8b5cf6);color:#fff;box-shadow:0 4px 20px var(--primary-glow);}
  .btn-secondary{background:rgba(255,255,255,0.04);color:var(--text-secondary);border:1px solid var(--border);}
  .btn-secondary:hover{background:rgba(255,255,255,0.07);color:var(--text);}
  .btn-success{background:linear-gradient(135deg,var(--success),#16a34a);color:#fff;}
  .btn-danger{background:linear-gradient(135deg,var(--danger),#dc2626);color:#fff;}
  .btn-sm{padding:10px 18px;font-size:13px}
  .btn-logout{background:transparent;color:var(--danger);border:1px solid rgba(239,68,68,0.25);padding:10px 18px;font-size:13px;width:auto;}
  .btn-logout:hover{background:rgba(239,68,68,0.08);}
  .nav-buttons{display:flex;gap:12px;margin-top:24px;padding-top:24px;border-top:1px solid var(--border)}
  .links-grid{display:grid;grid-template-columns:1fr;gap:20px}
  .link-item{background:var(--card);backdrop-filter:blur(12px);border:1px solid var(--border);border-radius:var(--radius);padding:20px;display:flex;flex-direction:column;gap:10px;transition:all 0.4s;position:relative;overflow:hidden;}
  .link-item::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--primary),#8b5cf6,#ec4899);opacity:0;transition:opacity 0.3s;}
  .link-item:hover{transform:translateY(-4px);box-shadow:var(--shadow-glow);border-color:rgba(99,102,241,0.18);}
  .link-item:hover::before{opacity:1}
  .link-url{font-size:13px;color:var(--primary-light);background:rgba(99,102,241,0.08);padding:6px 14px;border-radius:20px;font-weight:600;word-break:break-all;border:1px solid rgba(99,102,241,0.12);display:inline-block;}
  .link-meta{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--text-muted);margin-top:4px;}
  .link-actions{display:grid;grid-template-columns:1fr auto;gap:10px;margin-top:8px}
  .login-container{max-width:420px;margin:100px auto;padding:0 20px;position:relative;z-index:1;}
  .login-card{background:var(--card);backdrop-filter:blur(20px);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-glow);padding:48px 36px;text-align:center;position:relative;overflow:hidden;}
  .login-logo{font-size:36px;font-weight:800;background:linear-gradient(135deg,var(--primary-light),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px;}
  .login-subtitle{color:var(--text-muted);margin-bottom:36px;font-size:15px;}
  .hidden{display:none!important}
  .text-center{text-align:center}
  .mt-2{margin-top:16px}
  .toast{position:fixed;bottom:28px;right:28px;background:linear-gradient(135deg,#1e1b4b,#312e81);color:#fff;padding:18px 28px;border-radius:var(--radius-sm);box-shadow:0 8px 32px rgba(0,0,0,0.5);border:1px solid rgba(99,102,241,0.2);z-index:1000;transform:translateY(120px) scale(0.9);opacity:0;transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);font-weight:500;max-width:360px;}
  .toast.show{transform:translateY(0) scale(1);opacity:1;}
  @media(min-width:768px){.main-content{padding:28px 36px;padding-bottom:40px}.form-row{grid-template-columns:repeat(2,1fr)}.links-grid{grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}}
  @media(min-width:1024px){.sidebar{display:flex}.main-content{margin-left:280px;padding:36px 48px}.mobile-header{display:none}.btn{width:auto}.btn-full{width:100%}.link-actions{grid-template-columns:1fr 90px}.nav-buttons{flex-direction:row}.nav-buttons .btn{flex:1}}
  @media(min-width:1280px){.links-grid{grid-template-columns:repeat(3,1fr)}}
</style>
</head>
<body>

<div id="loginView" class="login-container">
  <div class="login-card">
    <div class="login-logo">Login Generate</div>
    <div class="login-subtitle">Tools by Sesepuh &mdash; v3.0 Minimal</div>
    <div class="form-group">
      <input type="password" id="pass" placeholder="Masukkan Password Admin" onkeypress="if(event.key===\'Enter\')doLogin()">
    </div>
    <button class="btn btn-primary btn-full" onclick="doLogin()">Masuk Dashboard</button>
  </div>
</div>

<div id="appView" class="app-container hidden">
  <nav class="sidebar">
    <div class="sidebar-logo">Login Generate</div>
    <a class="nav-item active" onclick="showSection(\'create\')">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
      <span>Buat Link</span>
    </a>
    <a class="nav-item" onclick="showSection(\'list\')">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      <span>Daftar Link</span>
    </a>
    <div class="sidebar-footer">Tools by Sesepuh &copy; 2025<br><span style="font-size:11px;opacity:0.6">Minimal Edition</span></div>
  </nav>

  <main class="main-content">
    <header class="mobile-header">
      <span class="mobile-title">Login Generate</span>
      <button class="btn btn-logout btn-sm" onclick="doLogout()">Logout</button>
    </header>

    <section id="createSection" class="section">
      <div class="card">
        <div class="card-title">
          <div>Buat Link Baru<div class="card-subtitle">Isi semua field secara manual</div></div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Subdomain *</label>
            <input type="text" id="sub" placeholder="promo-gacor">
          </div>
          <div class="form-group">
            <label>Domain *</label>
            <select id="dom">` + options + `</select>
          </div>
        </div>
        <div class="form-group">
          <label>URL Tujuan *</label>
          <input type="url" id="target" placeholder="https://example.com/offer">
        </div>
        <div class="form-group">
          <label>Judul OG (Facebook)</label>
          <input type="text" id="t" placeholder="Contoh: HI! I\'M ANGEL - ON LIVE SHOWS!">
        </div>
        <div class="form-group">
          <label>Deskripsi OG</label>
          <textarea id="desc" placeholder="Contoh: 673.829 Online Members"></textarea>
        </div>
        <div class="form-group">
          <label>URL Gambar OG</label>
          <input type="url" id="img" placeholder="https://example.com/image.jpg">
        </div>
        <button class="btn btn-primary btn-full" onclick="create()" id="btn">Generate & Salin Link</button>
        <div class="nav-buttons">
          <button class="btn btn-secondary" onclick="showSection(\'list\')">Lihat Daftar Link</button>
        </div>
      </div>
    </section>

    <section id="listSection" class="section hidden">
      <div class="card">
        <div class="card-title">
          <div>Daftar Link<div class="card-subtitle">Semua link yang telah dibuat</div></div>
          <button class="btn btn-primary btn-sm" onclick="showSection(\'create\')">+ Buat Baru</button>
        </div>
        <div style="margin-bottom:24px;">
          <button class="btn btn-secondary btn-sm" onclick="showSection(\'create\')" style="width:auto">&larr; Kembali</button>
        </div>
        <div id="linksContainer" class="links-grid">
          <div class="text-center mt-2" style="color:var(--text-muted)">Memuat data...</div>
        </div>
      </div>
    </section>

    <div class="text-center" style="color:var(--text-muted);font-size:12px;padding:20px 0;">Tools by Sesepuh &copy; 2025 &bull; Minimal Edition</div>
  </main>
</div>

<div id="toast" class="toast"></div>

<script>
var k = localStorage.getItem(\'k\');
if(k) showApp();

function showToast(msg){
  var t=document.getElementById(\'toast\');
  t.textContent=msg;
  t.classList.add(\'show\');
  setTimeout(function(){t.classList.remove(\'show\');},3000);
}
function doLogin(){
  k = document.getElementById(\'pass\').value;
  if(!k){showToast(\'Password wajib diisi\');return;}
  localStorage.setItem(\'k\', k);
  showApp();
}
function doLogout(){
  localStorage.removeItem(\'k\');
  location.reload();
}
function showApp(){
  document.getElementById(\'loginView\').classList.add(\'hidden\');
  document.getElementById(\'appView\').classList.remove(\'hidden\');
  showSection(\'create\');
}
function showSection(name){
  document.getElementById(\'createSection\').classList.toggle(\'hidden\',name!==\'create\');
  document.getElementById(\'listSection\').classList.toggle(\'hidden\',name!==\'list\');
  var items=document.querySelectorAll(\'.nav-item\');
  for(var i=0;i<items.length;i++){
    items[i].classList.toggle(\'active\',(name===\'create\'&&i===0)||(name===\'list\'&&i===1));
  }
  if(name===\'list\')load();
}

async function create(){
  var btn=document.getElementById(\'btn\');
  var originalText=btn.textContent;
  btn.textContent=\'Memproses...\';
  btn.disabled=true;

  var sub=document.getElementById(\'sub\').value.trim().toLowerCase();
  var targetUrl=document.getElementById(\'target\').value.trim();

  if(!sub || !targetUrl){
    showToast(\'Subdomain dan URL Tujuan wajib diisi\');
    btn.textContent=originalText;
    btn.disabled=false;
    return;
  }

  var payload={
    subdomain:sub,
    domain:document.getElementById(\'dom\').value,
    targetUrl:targetUrl,
    title:document.getElementById(\'t\').value,
    description:document.getElementById(\'desc\').value,
    imageUrl:document.getElementById(\'img\').value
  };

  try{
    var res=await fetch(\'/api/create\',{
      method:\'POST\',
      headers:{\'Authorization\':\'Bearer \'+k,\'Content-Type\':\'application/json\'},
      body:JSON.stringify(payload)
    });
    if(res.ok){
      var data=await res.json();
      copyToClipboard(data.url);
      showToast(\'Link berhasil dibuat & disalin!\');
      document.getElementById(\'sub\').value=\'\';
      document.getElementById(\'target\').value=\'\';
      document.getElementById(\'t\').value=\'\';
      document.getElementById(\'desc\').value=\'\';
      document.getElementById(\'img\').value=\'\';
      setTimeout(function(){showSection(\'list\');},500);
    }else{
      var err=await res.json();
      showToast(\'Gagal: \'+err.error);
      if(res.status===401){localStorage.removeItem(\'k\');location.reload();}
    }
  }catch(e){
    showToast(\'Error: \'+e.message);
  }
  btn.textContent=originalText;
  btn.disabled=false;
}

async function load(){
  var container=document.getElementById(\'linksContainer\');
  try{
    var res=await fetch(\'/api/list\',{headers:{\'Authorization\':\'Bearer \'+k}});
    if(res.status===401){localStorage.removeItem(\'k\');location.reload();return;}
    var d=await res.json();
    if(d.success && d.data && d.data.length>0){
      var html=\'\';
      for(var i=0;i<d.data.length;i++){
        var item=d.data[i];
        html += \'<div class="link-item">\'+
          \'<div class="link-url">\'+escapeHtml(item.subdomain)+\'.\'+escapeHtml(item.domain)+\'</div>\'+
          \'<div class="link-meta">\'+
            \'<span style="color:var(--text-secondary)">\'+escapeHtml(item.title||\'\')+\'</span>\'+
          \'</div>\'+
          \'<div class="link-actions">\'+
            \'<button class="btn btn-success btn-sm" onclick="copyToClipboard(\'https://\'+escapeHtml(item.subdomain)+\'.\'+escapeHtml(item.domain)+\')">Salin Link</button>\'+
            \'<button class="btn btn-danger btn-sm" onclick="deleteLink(\'\'+escapeHtml(item.subdomain)+\'\')">Hapus</button>\'+
          \'</div>\'+
        \'</div>\';
      }
      container.innerHTML=html;
    }else{
      container.innerHTML=\'<div class="text-center mt-2" style="color:var(--text-muted);grid-column:1/-1;padding:40px 0;">Belum ada link.</div>\';
    }
  }catch(e){
    container.innerHTML=\'<div class="text-center mt-2" style="color:var(--danger);grid-column:1/-1;padding:40px 0;">Gagal memuat data</div>\';
  }
}

async function deleteLink(sub){
  if(!confirm(\'Yakin ingin menghapus link ini?\'))return;
  try{
    var res = await fetch(\'/api/delete/\'+encodeURIComponent(sub),{method:\'DELETE\',headers:{\'Authorization\':\'Bearer \'+k}});
    var data = await res.json();
    if(res.ok && data.success){
      showToast(\'Link berhasil dihapus\');
      load();
    }else{
      showToast(\'Gagal menghapus: \' + (data.error || \'Unknown error\'));
    }
  }catch(e){
    showToast(\'Gagal menghapus: \' + e.message);
  }
}

function copyToClipboard(text){
  if(navigator.clipboard){
    navigator.clipboard.writeText(text);
    showToast(\'Link disalin!\');
  }else{
    var el=document.createElement(\'textarea\');
    el.value=text;
    document.body.appendChild(el);
    el.select();
    document.execCommand(\'copy\');
    document.body.removeChild(el);
    showToast(\'Link disalin!\');
  }
}

function escapeHtml(text){
  if(!text) return \'\';
  var div=document.createElement(\'div\');
  div.textContent=text;
  return div.innerHTML;
}
</script>

</body></html>`;
}

function json(d, s = 200) {
  return new Response(JSON.stringify(d), {status: s, headers: {'Content-Type': 'application/json'}});
}
