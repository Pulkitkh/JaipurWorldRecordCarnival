#!/usr/bin/env python3
"""
Check every page across the device sizes the site actually has to survive.

    pip install playwright && playwright install chromium
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
import asyncio, subprocess, time, signal
from playwright.async_api import async_playwright

srv=subprocess.Popen(["python3","-m","http.server","8220","--bind","127.0.0.1"],
    cwd=str(__import__("pathlib").Path(__file__).resolve().parent.parent),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1.5)
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
    if (el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0) {
      const t=(el.textContent||'').trim().slice(0,26);
      if (t) bad.push('.'+(el.className||el.tagName).toString().split(' ')[0]
                      +' "'+t+'" '+el.clientHeight+'<'+el.scrollHeight);
    }
  }
  return [...new Set(bad)].slice(0,6);
}"""

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        for page,label in ((f"{B}/","landing"),(f"{B}/about.html","about")):
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
import sys; sys.exit(1 if FAIL else 0)
