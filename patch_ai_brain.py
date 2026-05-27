from pathlib import Path
import re

path = Path("app/components/EasyPipsShell.tsx")
text = path.read_text(encoding="utf-8")

ai_brain = r'''
        <div className="mt-2 overflow-hidden rounded-xl border border-cyan-400/25 bg-gradient-to-br from-cyan-400/[0.10] via-emerald-400/[0.06] to-yellow-400/[0.06] p-[1px] shadow-lg shadow-cyan-500/10">
          <div className="relative rounded-xl bg-[#07101b]/95 p-3">
            <div className="absolute right-3 top-3 h-2 w-2 animate-ping rounded-full bg-emerald-400"></div>
            <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-emerald-300"></div>

            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">AI Brain</p>

            <div className="mt-3 flex items-center justify-center">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 shadow-lg shadow-cyan-400/20">
                <div className="absolute h-20 w-20 animate-pulse rounded-full border border-emerald-400/20"></div>
                <div className="absolute h-12 w-12 rounded-full border border-yellow-300/20"></div>
                <span className="text-lg font-black text-cyan-200">AI</span>
              </div>
            </div>

            <div className="mt-3 space-y-2 text-[10px] font-bold text-slate-300">
              <div className="flex items-center justify-between">
                <span>Market Analysis</span>
                <span className="text-emerald-300">LIVE</span>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[82%] animate-pulse rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"></div>
              </div>





              <div className="grid grid-cols-3 gap-1 text-center">
                <div className="rounded-lg border border-white/8 bg-black/30 p-1">
                  <p className="text-cyan-300">28</p>
                  <p className="text-[8px] text-slate-500">Markets</p>
                </div>
                <div className="rounded-lg border border-white/8 bg-black/30 p-1">
 






                 <p className="text-yellow-300">82%</p>
                  <p className="text-[8px] text-slate-500">Confirm</p>
                </div>
                <div className="rounded-lg border border-white/8 bg-black/30 p-1">
                  <p className="text-emerald-300">ON</p>
 




                 <p className="text-[8px] text-slate-500">Signals</p>
                </div>
              </div>

 



             <div className="relative mt-2 rounded-lg border border-cyan-400/20 bg-black/30 p-2">
                <div className="absolute left-2 top-1/2 h-[1px] w-[85%] bg-gradient-to-r from-cyan-300/0 via-cyan-300/60 to-emerald-300/0"></div>
 

               <p className="relative text-[9px] text-slate-400">
                  Scanning liquidity, volatility, news risk, and premium signal zones.
                </p>
 


             </div>
            </div>
          </div>
 


       </div>
'''

p


attern = r'''(?s)\s*<div className="mt-2 rounded-xl border border-white/8 bg-white/\[0\.04\]\s*p-1\.5">.*?</div>\s*(?=</aside>)'''

new_text, count = re.subn(pattern, "\n" + ai_brain + "\n", text, count=1)




if count == 0:
    raise SystemExit("AI Brain patch failed: old sidebar status block not found")




path.write_text(new_text, encoding="utf-8")
p

rint("AI Brain sidebar module added.")
