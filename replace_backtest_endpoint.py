from pathlib import Path
import re

path = Path("api_pro.py")
text = path.read_text(encoding="utf-8")

endpoint = r'''
@app.get("/strategy-backtest")
def strategy_backtest():
    try:
        signals = get_all_signals()

        def is_win(s):
            r = str(s.get("result") or "").upper()
            return bool(s.get("hit_tp1") or s.get("hit_tp2") or s.get("hit_tp3") or "TP" in r or "WIN" in r)

        def is_loss(s):
            r = str(s.get("result") or "").upper()
            return ("SL" in r or "LOSS" in r) and not is_win(s)

        def calc(strategy_name):
            rows = [s for s in signals if s.get("strategy") == strategy_name]
            wins = [s for s in rows if is_win(s)]
            losses = [s for s in rows if is_loss(s)]
            closed = len(wins) + len(losses)

            pair_rows = []
            pairs = sorted(list(set([s.get("symbol") for s in rows if s.get("symbol")])))
            for pair in pairs:
            


    p_rows = [s for s in rows if s.get("symbol") == pair]
                p_wins = [s for s in p_rows if is_win(s)]
                p_losses = [s for s in p_rows if is_loss(s)]
                p_closed = len(p_wins) + len(p_losses)

                pair_rows.append({
 





                   "pair": pair,
                    "trades": len(p_rows),
                    "wins": len(p_wins),
                    "losses": len(p_losses),
                    "winRate": round((len(p_wins) / p_closed) * 100, 2) if p_closed else 0,
 




                   "tp1": len([s for s in p_rows if s.get("hit_tp1")]),
      
              "tp2": len([s for s in p_rows if s.get("hit_tp2")]),
                    "tp3": len([s for s in p_rows if s.get("hit_tp3")]),
 

               })

            pair_rows = sorted(pair_rows, key=lambda x: (x["winRate"], x["trades"]), reverse=True)




            return {
                "strategy": strategy_name,
                "totalSignals": len(rows),
 



               "closedTrades": closed,
                "wins": len(wins),
                "losses": len(losses),
 


               "winRate": round((len(wins) / closed) * 100, 2) if closed else 0,
                "tp1": len([s for s in rows if s.get("hit_tp1")]),
                "tp2": len([s for s in rows if s.get("hit_tp2")]),
 


               "tp3": len([s for s in rows if s.get("hit_tp3")]),
                "bestPairs": pair_rows[:3],
 

               "worstPairs": sorted(pair_rows, key=lambda x: (x["winRate"], -x["trades"]))[:3],
            }



        ranked = sorted(
            [calc("Strategy A"), calc("Strategy B"), calc("Strategy C")],
 


           key=lambda x: (x["winRate"], x["closedTrades"]),
            reverse=True,
        )




        return {
            "success": True,
 


           "mode": "stored-signal-backtest",
            "totalSignals": len(signals),
 

           "rankedStrategies": ranked,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
 

       }

    except Exception as e:
 


       return {
            "success": False,
            "error": str(e),
 


           "generatedAt": datetime.now(timezone.utc).isoformat(),
        }
'

''

pattern = r'@

app\.get\("/strategy-backtest"\)\ndef strategy_backtest\(\):.*?\Z'
text = re.sub(pattern, endpoint.strip() + "\n", text, flags=re.S)
p

ath.write_text(text, encoding="utf-8")
