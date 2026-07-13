// Beta waitlist: request → (you) approve → emailed a unique, gated download link.
// APK lives on GitHub Releases (APK_URL); the /beta/download route validates the token before
// redirecting, so only approved testers can install. Email via Resend (no-op if unconfigured).
import { randomUUID } from 'crypto';
import { betaApprove, betaByToken, betaList, betaRequest } from './db.js';

const FROM = process.env.BETA_FROM_EMAIL || 'What Should I Order <onboarding@resend.dev>';

async function sendEmail(to, subject, html) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[beta] (no RESEND_API_KEY) would email ${to}: ${subject}`);
    return { skipped: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const isEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s || '').trim());

export async function handleBetaRequest(body) {
  const email = String(body.email || '').trim().toLowerCase();
  if (!isEmail(email)) return { status: 400, payload: { error: 'Enter a valid email.' } };
  await betaRequest(email);
  return { status: 200, payload: { ok: true } };
}

// Admin-only: approve an email → mint a token → email the gated download link.
export async function handleBetaApprove(body, publicUrl) {
  const email = String(body.email || '').trim().toLowerCase();
  if (!isEmail(email)) return { status: 400, payload: { error: 'invalid email' } };

  const token = randomUUID();
  await betaApprove(email, token);
  const link = `${publicUrl}/beta/download?token=${token}`;
  try {
    await sendEmail(
      email,
      "You're in — What Should I Order beta",
      `<h2>You're approved 🎉</h2>
       <p>Tap below on your Android phone to install the beta:</p>
       <p><a href="${link}" style="background:#f97316;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Download the app</a></p>
       <p style="color:#666;font-size:13px">You'll sign in with your own Swiggy account. Android may ask you to allow installs from your browser — that's expected for a beta. Powered by Swiggy.</p>`
    );
  } catch (e) {
    return { status: 502, payload: { error: `approved but email failed: ${e.message}`, link } };
  }
  return { status: 200, payload: { ok: true, link } };
}

export async function handleBetaDownload(token) {
  const row = token && (await betaByToken(token));
  if (!row) return { redirect: null, status: 403, payload: { error: 'invalid or unapproved link' } };
  const apk = process.env.APK_URL;
  if (!apk) return { redirect: null, status: 503, payload: { error: 'APK not published yet' } };
  return { redirect: apk };
}

export async function handleBetaList() {
  return { status: 200, payload: { testers: await betaList() } };
}

export function landingPage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>What Should I Order — Beta</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0c0c11;color:#fff;
       min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{max-width:440px;width:100%}
  h1{font-size:32px;font-weight:900;letter-spacing:-.02em;margin:0 0 8px}
  p.sub{color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 28px}
  form{display:flex;gap:8px}
  input{flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;
        padding:14px;color:#fff;font-size:15px}
  button{background:#f97316;border:0;border-radius:12px;padding:0 20px;color:#fff;font-weight:800;font-size:14px;cursor:pointer}
  button:disabled{opacity:.6}
  .msg{margin-top:16px;font-size:14px;min-height:20px}
  .ok{color:#4ade80}.err{color:#f87171}
  .foot{color:#4b5563;font-size:12px;margin-top:36px;line-height:1.6}
</style></head><body>
<div class="card">
  <h1>What Should I Order?</h1>
  <p class="sub">Find dishes near you that fit your cuisine &amp; budget — ranked by your own Swiggy order history. Android beta.</p>
  <form id="f">
    <input id="email" type="email" placeholder="you@email.com" autocomplete="email" required>
    <button id="b" type="submit">Request access</button>
  </form>
  <div class="msg" id="m"></div>
  <p class="foot">We'll email you an install link once you're approved. You'll sign in with your own Swiggy account — we never see your Swiggy password. Powered by Swiggy.</p>
</div>
<script>
  const f=document.getElementById('f'),m=document.getElementById('m'),b=document.getElementById('b');
  f.onsubmit=async(e)=>{e.preventDefault();b.disabled=true;m.textContent='';m.className='msg';
    try{const r=await fetch('/beta/request',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:document.getElementById('email').value})});
      const d=await r.json();
      if(r.ok){m.textContent="You're on the list — we'll email your invite soon. 🎉";m.className='msg ok';f.reset();}
      else{m.textContent=d.error||'Something went wrong.';m.className='msg err';}
    }catch(_){m.textContent='Network error — try again.';m.className='msg err';}
    b.disabled=false;};
</script></body></html>`;
}
