import { createClient } from '@supabase/supabase-js';

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const hostname = url.hostname;

      const AVAILABLE_DOMAINS = (env.DOMAINS || env.DOMAIN || 'miuzy.web.id').split(',').map(d => d.trim());
      const ADMIN_KEY = env.ADMIN_KEY;

      // Inisialisasi Supabase client
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
        return await handleRedirect(request, env, supabase, sub, ctx);
      }

      if (url.pathname.startsWith('/api/')) {
        const auth = request.headers.get('Authorization');
        if (auth !== `Bearer ${ADMIN_KEY}`) {
          return json({ error: 'Unauthorized' }, 401);
        }

        if (url.pathname === '/api/create' && request.method === 'POST') {
          return handleCreate(request, env, supabase);
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

const OFFER_LINKS = {
  'GACOR': 'https://fdeddg.hubss.one/p/yCTUy',
  'DENNY': 'https://fdeddg.trfsm.com/p/dJbbK',
  'RONGGOLAWE': 'https://fdeddg.hubss.one/p/7vKE6',
  'PENTOLKOREK': 'https://fdeddg.hubss.one/p/g1V27',
  'KLOWOR': 'https://fdeddg.hubss.one/p/A8Se6',
  'DENNOK': 'https://fdeddg.hubss.one/p/ylgz0',
  'CUSTOM': null
};

const GIRL_NAMES = [
  'Emma', 'Olivia', 'Sophia', 'Ava', 'Isabella', 'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn',
  'Abigail', 'Emily', 'Ella', 'Elizabeth', 'Sofia', 'Avery', 'Mila', 'Aria', 'Scarlett', 'Victoria',
  'Madison', 'Luna', 'Grace', 'Chloe', 'Penelope', 'Layla', 'Riley', 'Zoey', 'Nora', 'Lily',
  'Eleanor', 'Hannah', 'Lillian', 'Addison', 'Aubrey', 'Ellie', 'Stella', 'Natalie', 'Zoe', 'Leah',
  'Hazel', 'Violet', 'Aurora', 'Savannah', 'Audrey', 'Brooklyn', 'Bella', 'Claire', 'Skylar', 'Lucy'
];

const DEFAULT_TITLES = [
  "HI! I'M ANGEL - ON LIVE SHOWS!",
  "HI! I'M MONA - ON LIVE SHOWS!",
  "HI! I'M LUNA - ON LIVE SHOWS!",
  "HI! I'M MONICA - ON LIVE SHOWS!",
  "HI! I'M JESSICA - ON LIVE SHOWS!"
];

const DEFAULT_DESCS = [
  "673.829 Online Members",
  "671.817 Online Members",
  "473.829 Online Members",
  "573.729 Online Members",
  "483.829 Online Members"
];

const DEFAULT_IMAGES = [
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEia5EZN81KImOLwCf4Maw9Rx93SMzi-Y1sl4FlymVs-p7A7fzpnnwzV3PPTRw95HtjanyPfOC7wGpR7PWlJbeLoK1fmtI5Siziuo1SMQJDqnwd7BZhjbHDuErzJIXkaXqw6Mp8WRohL9fyh93oJhDEgPbpV0ErLx6V5mA15iSO1gWlduuNVAOwxo7Ev455P/s1600/1000273276.jpg",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEg8Dww4NmXkBhQklIJkpCwUwSGlpEwRlO_v9xk2Sif9c0IqxCkx9_2Bh2Trg-Ghidlqty_ZxX_jvdVsyQGNp7fGaek0EzoQ-i1_DMglfA9ATJzhn2yfmWbOD9HItFSPAgq24eM6KMRLxwNNxeLaLuo4N8VDwUurVtBBYhmAw5Lhi7K_MhE2fKzWxiMqNuXv/s1600/1000281899.jpg",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgLmLDHXtTQrS45ZtnxZdnkIcWi1JJR1sJeC2OnzAO2V9zH1h7gaiAvNpkiaQIk1kwulp84CqoKfEDxnV3cnGHSFBgSrLoL6__uvdsiH392xvwxdFQIiws2OL1E2dCR_4Csa4iVdnNInHkrBmo-i-U8CGaI9mYrMDndq1fWogmCCUQGS4p-yFlA253eOfmY/s16000/1000278957.jpg",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhY2U1nNExdEb1EmswodAdiZqFJvBi-j5qmXYihXFcnIUndSXE3u4zxS6yuKvKFCL6Y2dh0hdqk3Oc0oZZ1tg5pYWMzcRoaIlT3NVw0pZ7fldLwJCdE5mfn8UNtwDTnksPulL9NK3yG5cp7HYdKjmB8rdyv7kAt-B5Jrlu3P5o0xUbwIC8TDOXWpyKjimZN/s1600/1000277246.jpg",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgVt6Bj8uzv9tZc5AChsYKNjcPzFOtR8yM5WUrG3hseYZl_RrEyU_6MOsu2CtaUuKrQ7WkPvfGIGvzGxQurpR7P5rKo1aAEwsn6zXl1t-jZf4Uz0jeTdsVr_c3L5pvMNukqOTfMLaw9yVw62_fzDUs9bSIQmvQ39OmLEp0k6H-nJS_HLp48-5CA1QYRdU6Y/s1600/1000271008.jpg",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh_X109SK-QhlSOb1NiSyRSnY54QJNX0WKy0UsOtgMA-sYsqzk6qhC9D3WHovVRF3uK_cIMA-J1K8hWmc__ZUG_gihjOYjwBg54bZVNlDKWiNtfbTpEOvSj-Nd2_aRX_fYaiFdsZBNZdlehyo14bgl-Dxgk9qNDepHwfwNFidERYyAAjsWhWMY5_PyASPSP/s1600/1000270623.jpg"
];

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function handleRedirect(req, env, supabase, sub, ctx) {
  const { data, error } = await supabase
    .from('links')
    .select('*')
    .eq('subdomain', sub)
    .single();

  if (error || !data) {
    return new Response('Link Tidak Ditemukan', { status: 404 });
  }

  const ua = req.headers.get('User-Agent') || '';
  const isFacebookCrawler = /facebookexternalhit|Facebot/i.test(ua);
  const isFacebookApp = /FBAN|FBAV|FB_IAB/i.test(ua);

  ctx.waitUntil(updateStats(supabase, sub));

  if (isFacebookCrawler && !isFacebookApp) {
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

async function handleCreate(req, env, supabase) {
  try {
    const body = await req.json();

    const offerId = body.offerId || 'CUSTOM';
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const randomGirlName = getRandom(GIRL_NAMES).toLowerCase();

    const sub = body.customCode
      ? body.customCode.toLowerCase().trim()
      : randomGirlName + '-' + randomSuffix;

    let targetUrl = body.targetUrl;
    if (offerId !== 'CUSTOM' && OFFER_LINKS[offerId]) {
      targetUrl = OFFER_LINKS[offerId];
    }

    if (!targetUrl) {
      return json({ error: 'URL Tujuan tidak ditemukan' }, 400);
    }

    // Cek apakah subdomain sudah ada
    const { data: existing } = await supabase
      .from('links')
      .select('subdomain')
      .eq('subdomain', sub)
      .single();

    if (existing) {
      return json({ error: 'Subdomain sudah ada' }, 409);
    }

    const imageUrl = body.imageUrl?.trim()
      ? body.imageUrl.trim()
      : getRandom(DEFAULT_IMAGES);

    const data = {
      subdomain: sub,
      domain: body.domain,
      title: body.title?.trim() || getRandom(DEFAULT_TITLES),
      description: body.description?.trim() || getRandom(DEFAULT_DESCS),
      image_url: imageUrl,
      target_url: targetUrl,
      offer_id: offerId,
      clicks: 0,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('links').insert(data);

    if (error) {
      return json({ error: error.message }, 500);
    }

    return json({ success: true, url: `https://${sub}.${body.domain}` });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

async function handleList(supabase) {
  try {
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return json({ error: error.message }, 500);
    }

    // Format data agar kompatibel dengan frontend (mapping snake_case ke camelCase)
    const links = (data || []).map(item => ({
      subdomain: item.subdomain,
      domain: item.domain,
      title: item.title,
      description: item.description,
      imageUrl: item.image_url,
      targetUrl: item.target_url,
      offerId: item.offer_id,
      clicks: item.clicks,
      createdAt: item.created_at
    }));

    return json({ success: true, data: links });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

async function handleDelete(supabase, sub) {
  try {
    if (!sub || sub.trim() === '') {
      return json({ error: 'Subdomain tidak valid' }, 400);
    }

    const { error } = await supabase
      .from('links')
      .delete()
      .eq('subdomain', sub);

    if (error) {
      return json({ error: error.message }, 500);
    }

    return json({ success: true, message: 'Link berhasil dihapus' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

async function updateStats(supabase, sub) {
  try {
    const { data } = await supabase
      .from('links')
      .select('clicks')
      .eq('subdomain', sub)
      .single();

    if (data) {
      await supabase
        .from('links')
        .update({ clicks: (data.clicks || 0) + 1 })
        .eq('subdomain', sub);
    }
  } catch (e) {
    console.error('Stats update failed:', e);
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
        body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#f0f2f5;display:flex;justify-content:center;align-items:center;min-height:100vh;overflow:hidden}
        .loader{display:flex;flex-direction:column;align-items:center;gap:10px}
        .spinner{width:40px;height:40px;border:3px solid #e4e6eb;border-top:3px solid #1877f2;border-radius:50%;animation:spin 0.8s linear infinite}
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        .dots{display:flex;gap:4px;height:4px;align-items:center;margin-top:8px}
        .dot{width:4px;height:4px;background:#1877f2;border-radius:50%;animation:bounce 1.4s infinite ease-in-out both;opacity:0.6}
        .dot:nth-child(1){animation-delay:-0.32s}.dot:nth-child(2){animation-delay:-0.16s}
        @keyframes bounce{0%,80%,100%{transform:scale(0.6)}40%{transform:scale(1)}}
        p{color:#65676b;font-size:14px;font-weight:500;letter-spacing:0.5px;margin-top:4px}
    </style>
    <script>
        setTimeout(()=>window.location.href="${cleanUrl}",1000);
        document.addEventListener('click',()=>window.location.href="${cleanUrl}");
    </script>
</head>
<body>
    <div class="loader" onclick="window.location.href='${cleanUrl}'">
        <div class="spinner"></div>
        <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
        <p>Loading...</p>
    </div>
</body>
</html>`;
}

function getOgHTML(d, sub) {
  const img = d.image_url || 'https://via.placeholder.com/1200x630/1877f2/ffffff?text=Video';
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
  const offerOptions = Object.keys(OFFER_LINKS)
    .filter(k => k !== 'CUSTOM')
    .map(k => `<option value="${k}">${k}</option>`).join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Login Generate - Dashboard</title>
<style>
  :root{--primary:#1877f2;--primary-dark:#166fe5;--danger:#f02849;--success:#42b72a;--warning:#f7b928;--bg:#f0f2f5;--card-bg:#fff;--text:#1c1e21;--text-secondary:#65676b;--border:#ddd;--shadow:0 2px 12px rgba(0,0,0,0.1);--radius:12px;--radius-sm:8px}
  *{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
  body{background:var(--bg);color:var(--text);line-height:1.6;min-height:100vh}
  .app-container{max-width:1400px;margin:0 auto;display:flex;min-height:100vh}
  .sidebar{width:260px;background:var(--card-bg);border-right:1px solid var(--border);padding:24px 16px;position:fixed;height:100vh;overflow-y:auto;z-index:100;display:none}
  .sidebar-logo{font-size:22px;font-weight:800;color:var(--primary);margin-bottom:32px;padding:0 8px;letter-spacing:-0.5px;line-height:1.2}
  .nav-item{display:flex;align-items:center;gap:12px;padding:12px 16px;margin:4px 0;border-radius:var(--radius-sm);color:var(--text-secondary);text-decoration:none;font-weight:600;font-size:15px;transition:all 0.2s;cursor:pointer}
  .nav-item:hover,.nav-item.active{background:var(--bg);color:var(--primary)}
  .sidebar-footer{position:absolute;bottom:24px;left:16px;right:16px;font-size:12px;color:var(--text-secondary);text-align:center}
  .main-content{flex:1;margin-left:0;padding:16px;width:100%;padding-bottom:80px}
  .mobile-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:var(--card-bg);margin:-16px -16px 16px -16px;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:99}
  .mobile-title{font-size:20px;font-weight:800;color:var(--primary)}
  .card{background:var(--card-bg);border-radius:var(--radius);box-shadow:var(--shadow);padding:20px;margin-bottom:20px}
  .card-title{font-size:18px;font-weight:700;margin-bottom:20px;color:var(--text);display:flex;align-items:center;justify-content:space-between}
  .card-subtitle{font-size:13px;color:var(--text-secondary);font-weight:500;margin-top:4px}
  .form-group{margin-bottom:16px}
  label{display:block;font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.3px}
  input,select,textarea{width:100%;padding:12px 16px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:15px;background:var(--card-bg);transition:all 0.2s;min-height:44px}
  input:focus,select:focus,textarea:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(24,119,242,0.1)}
  select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2365676b' d='M6 9L1 4h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center;padding-right:40px}
  textarea{resize:vertical;min-height:80px}
  .form-row{display:grid;grid-template-columns:1fr;gap:16px}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border:none;border-radius:var(--radius-sm);font-size:15px;font-weight:600;cursor:pointer;transition:all 0.2s;min-height:44px;width:100%}
  .btn-primary{background:var(--primary);color:#fff}
  .btn-primary:hover{background:var(--primary-dark);transform:translateY(-1px)}
  .btn-secondary{background:#e4e6eb;color:var(--text);border:1px solid var(--border)}
  .btn-secondary:hover{background:var(--border)}
  .btn-success{background:var(--success);color:#fff}
  .btn-danger{background:var(--danger);color:#fff}
  .btn-sm{padding:8px 16px;font-size:13px}
  .btn-logout{background:transparent;color:var(--danger);border:1px solid var(--danger);padding:8px 16px;font-size:13px;width:auto}
  .nav-buttons{display:flex;gap:12px;margin-top:20px;padding-top:20px;border-top:1px solid var(--border)}
  .offer-select{background:linear-gradient(135deg,#f0f2f5 0%,#e4e6eb 100%);color:var(--primary);font-weight:700;border:2px solid var(--primary)}
  .offer-badge{display:inline-flex;align-items:center;background:var(--primary);color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.5px}
  .links-grid{display:grid;grid-template-columns:1fr;gap:16px}
  .link-item{background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius);padding:16px;display:flex;flex-direction:column;gap:8px;transition:all 0.2s;position:relative;overflow:hidden}
  .link-item:hover{box-shadow:0 4px 20px rgba(0,0,0,0.1);transform:translateY(-2px)}
  .link-header{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .link-title{font-weight:700;font-size:15px;color:var(--text);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .link-url{font-size:13px;color:var(--primary);background:rgba(24,119,242,0.1);padding:4px 12px;border-radius:20px;font-weight:600;word-break:break-all}
  .link-meta{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--text-secondary);margin-top:4px}
  .link-actions{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:8px}
  .login-container{max-width:400px;margin:80px auto;padding:0 20px}
  .login-card{background:var(--card-bg);border-radius:var(--radius);box-shadow:var(--shadow);padding:40px 32px;text-align:center}
  .login-logo{font-size:32px;font-weight:800;color:var(--primary);margin-bottom:8px;letter-spacing:-1px}
  .login-subtitle{color:var(--text-secondary);margin-bottom:32px;font-size:15px}
  .hidden{display:none!important}
  .text-center{text-align:center}
  .mt-1{margin-top:8px}
  .mt-2{margin-top:16px}
  .mb-2{margin-bottom:16px}
  @media(min-width:768px){.main-content{padding:24px 32px;padding-bottom:40px}.form-row{grid-template-columns:repeat(2,1fr)}.links-grid{grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}}
  @media(min-width:1024px){.sidebar{display:block}.main-content{margin-left:260px;padding:32px 40px}.mobile-header{display:none}.btn{width:auto}.btn-full{width:100%}.link-actions{grid-template-columns:1fr 80px}.nav-buttons{flex-direction:row}.nav-buttons .btn{flex:1}}
  @media(min-width:1280px){.links-grid{grid-template-columns:repeat(3,1fr)}}
  .toast{position:fixed;bottom:24px;right:24px;background:var(--text);color:#fff;padding:16px 24px;border-radius:var(--radius-sm);box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:1000;transform:translateY(100px);opacity:0;transition:all 0.3s}
  .toast.show{transform:translateY(0);opacity:1}
</style>
</head>
<body>

<!-- LOGIN VIEW -->
<div id="loginView" class="login-container">
  <div class="login-card">
    <div class="login-logo">Login Generate</div>
    <div class="login-subtitle">Tools by Sesepuh</div>
    <div class="form-group">
      <input type="password" id="pass" placeholder="Masukkan Password Admin" onkeypress="if(event.key==='Enter')doLogin()">
    </div>
    <button class="btn btn-primary btn-full" onclick="doLogin()">Masuk Dashboard</button>
  </div>
</div>

<!-- MAIN APP -->
<div id="appView" class="app-container hidden">
  <!-- Sidebar Desktop -->
  <nav class="sidebar">
    <div class="sidebar-logo">Login Generate</div>
    <a class="nav-item active" onclick="showSection('create')"><span>Buat Link</span></a>
    <a class="nav-item" onclick="showSection('list')"><span>Riwayat Link</span></a>
    <div class="sidebar-footer">Tools by Sesepuh &copy; 2025<br><span style="font-size:11px;opacity:0.7">v3.0 Supabase</span></div>
  </nav>

  <!-- Main Content -->
  <main class="main-content">
    <!-- Mobile Header -->
    <header class="mobile-header">
      <span class="mobile-title">Login Generate</span>
      <button class="btn btn-logout btn-sm" onclick="doLogout()">Logout</button>
    </header>

    <!-- Create Section -->
    <section id="createSection" class="section">
      <div class="card">
        <div class="card-title">
          <div>
            Buat Link Baru
            <div class="card-subtitle">Generate shortlink dengan preset offer</div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Pilih Offer ID</label>
            <select id="offerId" class="offer-select" onchange="handleOfferChange()">
              ${offerOptions}
              <option value="CUSTOM">CUSTOM (Manual)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Domain</label>
            <select id="dom">${options}</select>
          </div>
        </div>

        <div id="customUrlGroup" class="form-group hidden">
          <label>URL Tujuan Custom</label>
          <input type="url" id="target" placeholder="https://example.com/offer">
        </div>

        <div class="form-group">
          <label>Judul Postingan <span style="font-weight:400;color:var(--text-secondary)">(Opsional - Auto Random)</span></label>
          <input type="text" id="t" placeholder="Contoh: HI! I'M ANGEL - ON LIVE SHOWS!">
        </div>

        <div class="form-group">
          <label>Deskripsi <span style="font-weight:400;color:var(--text-secondary)">(Opsional - Auto Random)</span></label>
          <textarea id="desc" placeholder="Contoh: 673.829 Online Members"></textarea>
        </div>

        <div class="form-group">
          <label>URL Gambar <span style="font-weight:400;color:var(--text-secondary)">(Opsional - Auto Random)</span></label>
          <input type="url" id="img" placeholder="https://example.com/image.jpg">
        </div>

        <div class="form-group">
          <label>Custom Subdomain <span style="font-weight:400;color:var(--text-secondary)">(Opsional)</span></label>
          <input type="text" id="code" placeholder="promo-gacor">
        </div>

        <button class="btn btn-primary btn-full" onclick="create()" id="btn">Generate & Salin Link</button>

        <div class="nav-buttons">
          <button class="btn btn-secondary" onclick="showSection('list')">Lihat Riwayat Link</button>
        </div>
      </div>
    </section>

    <!-- List Section -->
    <section id="listSection" class="section hidden">
      <div class="card">
        <div class="card-title">
          <div>
            Riwayat Link
            <div class="card-subtitle">Semua link yang telah dibuat</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="showSection('create')">+ Buat Baru</button>
        </div>

        <div style="margin-bottom:20px;">
          <button class="btn btn-secondary btn-sm" onclick="showSection('create')" style="width:auto">&larr; Kembali ke Buat Link</button>
        </div>

        <div id="linksContainer" class="links-grid">
          <div class="text-center mt-2" style="color:var(--text-secondary)">Memuat data...</div>
        </div>
      </div>
    </section>

    <div class="text-center mt-2" style="color:var(--text-secondary);font-size:12px;padding-bottom:20px;">
      Tools by Sesepuh &copy; 2025
    </div>
  </main>
</div>

<div id="toast" class="toast"></div>

<script>
let k = localStorage.getItem('k');
if(k) showApp();

function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3000);
}

function doLogin(){
  k = document.getElementById('pass').value;
  if(!k){showToast('Password wajib diisi');return;}
  localStorage.setItem('k', k);
  showApp();
}

function doLogout(){
  localStorage.removeItem('k');
  location.reload();
}

function showApp(){
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('appView').classList.remove('hidden');
  showSection('create');
  load();
}

function showSection(name){
  document.getElementById('createSection').classList.toggle('hidden',name!=='create');
  document.getElementById('listSection').classList.toggle('hidden',name!=='list');
  document.querySelectorAll('.nav-item').forEach((el,idx)=>{
    el.classList.toggle('active',(name==='create'&&idx===0)||(name==='list'&&idx===1));
  });
  if(name==='list')load();
}

function handleOfferChange(){
  const isCustom = document.getElementById('offerId').value==='CUSTOM';
  document.getElementById('customUrlGroup').classList.toggle('hidden',!isCustom);
}

async function create(){
  const btn=document.getElementById('btn');
  const originalText=btn.textContent;
  btn.textContent='Memproses...';
  btn.disabled=true;

  const offerId=document.getElementById('offerId').value;
  let targetUrl='';

  if(offerId==='CUSTOM'){
    targetUrl=document.getElementById('target').value;
    if(!targetUrl){
      showToast('URL Custom wajib diisi');
      btn.textContent=originalText;
      btn.disabled=false;
      return;
    }
  }

  const payload={
    title:document.getElementById('t').value,
    description:document.getElementById('desc').value,
    imageUrl:document.getElementById('img').value,
    targetUrl:targetUrl,
    domain:document.getElementById('dom').value,
    customCode:document.getElementById('code').value,
    offerId:offerId
  };

  try{
    const res=await fetch('/api/create',{
      method:'POST',
      headers:{'Authorization':'Bearer '+k,'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });

    if(res.ok){
      const data=await res.json();
      copyToClipboard(data.url);
      showToast('Link berhasil dibuat & disalin!');
      document.getElementById('t').value='';
      document.getElementById('desc').value='';
      document.getElementById('img').value='';
      document.getElementById('target').value='';
      document.getElementById('code').value='';
      setTimeout(()=>showSection('list'),500);
    }else{
      const err=await res.json();
      showToast('Gagal: '+err.error);
      if(res.status===401){localStorage.removeItem('k');location.reload();}
    }
  }catch(e){
    showToast('Error: '+e.message);
  }

  btn.textContent=originalText;
  btn.disabled=false;
}

async function load(){
  const container=document.getElementById('linksContainer');
  try{
    const res=await fetch('/api/list',{headers:{'Authorization':'Bearer '+k}});
    if(res.status===401){localStorage.removeItem('k');location.reload();return;}
    const d=await res.json();

    if(d.success&&d.data.length>0){
      container.innerHTML=d.data.map(i=>{
        const date=new Date(i.createdAt).toLocaleDateString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
        return `
        <div class="link-item">
          <div class="link-header">
            <span class="offer-badge">${i.offerId}</span>
            <span class="link-title" title="${i.title}">${i.title}</span>
          </div>
          <div class="link-url">${i.subdomain}.${i.domain}</div>
          <div class="link-meta">
            <span>${date}</span>
            <span style="font-weight:600;color:var(--text)">${i.clicks||0} klik</span>
          </div>
          <div class="link-actions">
            <button class="btn btn-success btn-sm" onclick="copyToClipboard('https://${i.subdomain}.${i.domain}')">Salin Link</button>
            <button class="btn btn-danger btn-sm" onclick="deleteLink('${i.subdomain}')">Hapus</button>
          </div>
        </div>
        `;
      }).join('');
    }else{
      container.innerHTML='<div class="text-center mt-2" style="color:var(--text-secondary);grid-column:1/-1">Belum ada link. Buat link pertama Anda!</div>';
    }
  }catch(e){
    container.innerHTML='<div class="text-center mt-2" style="color:var(--danger);grid-column:1/-1">Gagal memuat data</div>';
  }
}

async function deleteLink(sub){
  if(!confirm('Yakin ingin menghapus link ini?'))return;
  try{
    const res = await fetch('/api/delete/'+sub,{method:'DELETE',headers:{'Authorization':'Bearer '+k}});
    const data = await res.json();
    if(res.ok && data.success){
      showToast('Link berhasil dihapus');
      load();
    }else{
      showToast('Gagal menghapus: ' + (data.error || 'Unknown error'));
    }
  }catch(e){
    showToast('Gagal menghapus: ' + e.message);
  }
}

function copyToClipboard(text){
  if(navigator.clipboard){
    navigator.clipboard.writeText(text);
  }else{
    const el=document.createElement('textarea');
    el.value=text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
}
</script>

</body></html>`;
}

function json(d, s = 200) {
  return new Response(JSON.stringify(d), {status: s, headers: {'Content-Type': 'application/json'}});
}
