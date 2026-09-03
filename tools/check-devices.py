#!/usr/bin/env python3
"""
Check every page across the device sizes the site actually has to survive.

    pip install playwright && playwright install chromium
    python3 tools/check-devices.py                 # every page
    python3 tools/check-devices.py records         # just one
    python3 tools/check-devices.py

Loads each page at twelve viewports, from a 320px phone to a 2560px
desktop, at the right pixel density and with touch emulation where a real
device would have it. On each it looks for the three things that actually
break a layout across devices — the page ending up wider than the screen,
an element painted outside the frame, and text taller than the box that
clips it — and on the sizes that show a burger, that the drawer opens,
that nothing inside it spills, and that the close icon draws both strokes
of its X.

Every one of these was a real defect at some point: a phone rendered the
close icon as a single diagonal stroke, and the drawer's call button was
picking up the drawer's 30px link styling and spilling out of its own pill.

Exit code 1 on any finding, so it can run in CI.
"""
import asyncio, subprocess, sys, time, signal
from playwright.async_api import async_playwright

# A plain file server is the wrong thing to test against. The deployed site
# runs with vercel.json's cleanUrls, so its real addresses have no extension
# — /records, not /records.html — and a bug that only exists at those
# addresses is invisible to a server that will not serve them. One did:
# every page but the landing page rendered the landing page's navigation,
# because the page was identified by matching ".html" in the path.
#
# So the harness serves the site the way Vercel does, and the pages below
# are visited at BOTH addresses.
_SERVER = r'''
import http.server, os, sys
ROOT = sys.argv[2]
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def translate_path(self, path):
        full = super().translate_path(path)
        if not os.path.exists(full) and not os.path.splitext(full)[1]:
            if os.path.exists(full + ".html"): return full + ".html"
        return full
    def log_message(self, *a): pass
http.server.HTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
'''
_ROOT = str(__import__("pathlib").Path(__file__).resolve().parent.parent)
srv=subprocess.Popen(["python3","-c",_SERVER,"8220",_ROOT],
    stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1.5)
B="http://127.0.0.1:8220"
FAIL=[]
def chk(c,m):
    if not c: FAIL.append(m); print("  FAIL "+m)

# width, height, dpr, touch, label — the spread the site actually has to survive
DEVICES = [
    (320,  568, 2, True,  "iPhone SE (smallest in use)"),
    (360,  740, 3, True,  "Android compact"),
    (390,  844, 3, True,  "iPhone 14"),
    (412,  915, 2.6,True, "Pixel 7"),
    (430,  932, 3, True,  "iPhone 15 Pro Max"),
    (768, 1024, 2, True,  "iPad portrait"),
    (820, 1180, 2, True,  "iPad Air portrait"),
    (1024, 768, 2, True,  "iPad landscape"),
    (1280, 800, 1, False, "small laptop"),
    (1440, 900, 2, False, "MacBook"),
    (1920,1080, 1, False, "Windows desktop"),
    (2560,1440, 1, False, "wide desktop"),
]

OVERFLOW = """() => {
  const bad=[]; const W=document.documentElement.clientWidth;
  for (const el of document.querySelectorAll('body *')) {
    const cs=getComputedStyle(el);
    if (cs.display==='none'||cs.visibility==='hidden'||cs.position==='fixed') continue;
    const r=el.getBoundingClientRect();
    if (!r.width||!r.height) continue;
    // Only judge what is on screen. Entrance animations park below-fold
    // elements at an x offset until their trigger fires, so measuring those
    // reports an overflow the reader can never see.
    if (r.bottom < 0 || r.top > innerHeight) continue;
    if (getComputedStyle(el).transform !== 'none') continue;
    // something poking out past the right edge, or starting off the left
    if (r.right > W+1.5 || r.left < -1.5) {
      // ignore anything inside a deliberate horizontal scroller
      let p=el, inScroller=false;
      while (p && p!==document.body) {
        const pc=getComputedStyle(p);
        if (pc.overflowX==='auto'||pc.overflowX==='scroll'||pc.overflowX==='hidden') { inScroller=true; break; }
        p=p.parentElement;
      }
      if (inScroller) continue;
      bad.push(el.tagName+'.'+(el.className||'').toString().split(' ')[0]
               +' ['+Math.round(r.left)+'..'+Math.round(r.right)+'] vs '+W);
    }
  }
  return [...new Set(bad)].slice(0,6);
}"""

# text painted outside the box that is supposed to contain it
CLIPPED = """() => {
  const bad=[];
  for (const el of document.querySelectorAll('a,button,.btn,h1,h2,h3,h4,span,p')) {
    const cs=getComputedStyle(el);
    if (cs.display==='none'||cs.visibility==='hidden') continue;
    if (cs.overflow!=='hidden' && cs.overflowY!=='hidden') continue;
    // A visually-hidden label is a 1px box holding real text on purpose —
    // that is how a screen reader is told what an icon button does. Text
    // overflowing a box that small is the technique working, not a fault.
    if (el.clientHeight <= 2 || el.clientWidth <= 2) continue;
    if (el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0) {
      const t=(el.textContent||'').trim().slice(0,26);
      if (t) bad.push('.'+(el.className||el.tagName).toString().split(' ')[0]
                      +' "'+t+'" '+el.clientHeight+'<'+el.scrollHeight);
    }
  }
  return [...new Set(bad)].slice(0,6);
}"""

ALL_PAGES=[(f"{B}/","landing"),(f"{B}/records","records"),
           (f"{B}/take-part","take part"),(f"{B}/about","about")]
want=[a.replace(".html","") for a in sys.argv[1:]]
PAGES=[p for p in ALL_PAGES if not want or any(w in p[0] or w in p[1] for w in want)] or ALL_PAGES

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        for page,label in PAGES:
            print(f"\n══ {label} ══")
            for w,h,dpr,touch,name in DEVICES:
                ctx=await b.new_context(viewport={"width":w,"height":h},
                        device_scale_factor=dpr, has_touch=touch, is_mobile=touch)
                pg=await ctx.new_page()
                errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
                await pg.goto(page); await pg.wait_for_timeout(2600)
                sw=await pg.evaluate("document.documentElement.scrollWidth")
                over=await pg.evaluate(OVERFLOW)
                clip=await pg.evaluate(CLIPPED)
                chk(sw<=w+1, f"{label} {name} ({w}px): page is {sw}px wide")
                chk(not over, f"{label} {name} ({w}px): overflowing {over}")
                chk(not clip, f"{label} {name} ({w}px): clipped text {clip}")
                chk(not errs, f"{label} {name} ({w}px): JS errors {errs[:1]}")

                # an outline button must never match the ground it stands on.
                # This regressed once per new dark section until the rule
                # stopped depending on a list of section names.
                faint=await pg.evaluate("""() => {
                  const px=(c)=>{const m=(c||'').match(/[\d.]+/g); return m?m.slice(0,3).map(Number):null;};
                  const al=(c)=>{const m=(c||'').match(/[\d.]+/g); return m&&m.length>3?+m[3]:1;};
                  const lum=(p)=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};
                    return .2126*f(p[0])+.7152*f(p[1])+.0722*f(p[2]);};
                  // composite every translucent layer down to an opaque colour.
                  // Reading only the nearest background reports a 3.5% ivory
                  // panel as near-white when it is really a shade of navy.
                  const ground=(el)=>{
                    const stack=[]; let n=el;
                    while (n && n!==document.documentElement) {
                      const cs=getComputedStyle(n), p=px(cs.backgroundColor), a=al(cs.backgroundColor);
                      if (p && a>0) { stack.push([p,a]); if (a>=1) break; }
                      n=n.parentElement;
                    }
                    if (!stack.length) return null;
                    let out=[255,255,255];
                    for (let i=stack.length-1;i>=0;i--){ const [c,a]=stack[i];
                      out=[0,1,2].map(k=>c[k]*a+out[k]*(1-a)); }
                    return out;
                  };
                  const out=[];
                  for (const b of document.querySelectorAll('.btn.ghost')) {
                    const bg=ground(b); if(!bg) continue;
                    const fg=px(getComputedStyle(b).color); if(!fg) continue;
                    const r=(Math.max(lum(fg),lum(bg))+.05)/(Math.min(lum(fg),lum(bg))+.05);
                    if (r < 3) out.push(b.textContent.trim().slice(0,20)+' @'+r.toFixed(1)+':1');
                  }
                  return out; }""")
                chk(not faint, f"{label} {name} ({w}px): outline button lost in its ground {faint}")

                # Anything the site reveals must end up revealed. Two things
                # can stop that, and both have happened: a stagger container
                # whose children ALSO carry data-anim runs two competing
                # gsap.from tweens on one element, and the second reads the
                # mid-flight opacity as its target — so the element animates
                # from 0 to 0 and is never seen again. Checking the structure
                # catches the cause; walking the page catches everything else.
                clash=await pg.evaluate("""()=>[...document.querySelectorAll('[data-stag]')]
                  .flatMap(p=>[...p.children].filter(c=>c.hasAttribute('data-anim'))
                    .map(c=>(p.className||p.tagName)+' > '+(c.className||c.tagName)))
                  .slice(0,4)""")
                chk(not clash, f"{label} {name} ({w}px): animated twice, will stay hidden {clash}")

                # Every bare anchor the chrome offers must land somewhere on
                # THIS page. A nav built for the wrong page still renders and
                # still looks right — its links simply do nothing, which is
                # how the whole site shipped with the landing page's menu on
                # every page for a day.
                dead=await pg.evaluate("""()=>{
                  const out=[];
                  for (const a of document.querySelectorAll('.nav a, .drawer a, .foot a')) {
                    const h=a.getAttribute('href')||'';
                    if (!h.startsWith('#') || h==='#') continue;
                    if (!document.querySelector(h)) out.push(a.textContent.trim()+' -> '+h);
                  }
                  return [...new Set(out)].slice(0,4); }""")
                chk(not dead, f"{label} {name} ({w}px): menu links go nowhere {dead}")

                if w >= 1024:      # walk the whole page once, on one size only
                    H=await pg.evaluate("document.body.scrollHeight"); y=0
                    while y < H:
                        await pg.evaluate(f"window.scrollTo(0,{y})")
                        await pg.wait_for_timeout(360); y += 700
                    await pg.wait_for_timeout(1300)
                    ghosts=await pg.evaluate("""()=>[...document.querySelectorAll(
                        '[data-anim],[data-split],[data-stag] > *')]
                      .filter(el=>{
                        const r=el.getBoundingClientRect();
                        if (r.width<4||r.height<4) return false;
                        return +getComputedStyle(el).opacity < 0.06; })
                      .map(el=>(el.className&&el.className.baseVal===undefined
                                 ? el.className : el.tagName)+' :: '
                               +el.textContent.trim().slice(0,26))
                      .slice(0,5)""")
                    chk(not ghosts, f"{label} {name} ({w}px): revealed nothing {ghosts}")
                    await pg.evaluate("window.scrollTo(0,0)")
                    await pg.wait_for_timeout(500)

                # the drawer, on the sizes that actually show a burger
                if w < 900:
                    burger=await pg.query_selector("#burger")
                    if burger:
                        await burger.click(); await pg.wait_for_timeout(700)
                        d=await pg.evaluate("""() => {
                          const dr=document.querySelector('#drawer');
                          const W=document.documentElement.clientWidth;
                          const bars=[...document.querySelectorAll('#burger i')].map(i=>{
                            const r=i.getBoundingClientRect();
                            return {y:Math.round(r.top), op:+getComputedStyle(i).opacity};});
                          const bad=[];
                          for (const el of dr.querySelectorAll('a')) {
                            const r=el.getBoundingClientRect();
                            if (r.right>W+1.5||r.left<-1.5) bad.push((el.className||'a')+' out of frame');
                            if (el.scrollHeight>el.clientHeight+2 && getComputedStyle(el).overflow==='hidden')
                              bad.push((el.className||'a')+' text clipped');
                          }
                          return {open:dr.classList.contains('open'), bad, bars,
                                  fs:getComputedStyle(dr.querySelector('.btn')||dr).fontSize};}""")
                        chk(d["open"], f"{label} {name}: drawer opens")
                        chk(not d["bad"], f"{label} {name}: drawer {d['bad']}")
                        vis=[x for x in d["bars"] if x["op"]>0.05]
                        chk(len(vis)==2 and abs(vis[0]["y"]-vis[1]["y"])<=1,
                            f"{label} {name}: burger X bars at {[x['y'] for x in vis]}")
                        await pg.evaluate("document.querySelector('#burger').click()")
                        await pg.wait_for_timeout(400)
                await ctx.close()
        await b.close()
    print("\n"+("ALL PASS" if not FAIL else f"{len(FAIL)} FAILURES"))
asyncio.run(main()); srv.send_signal(signal.SIGTERM)
sys.exit(1 if FAIL else 0)
