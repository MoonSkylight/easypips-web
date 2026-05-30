from pathlib import Path

path = Path("api_pro.py")
text = path.read_text(encoding="utf-8")

if '@app.get("/strategy-backtest")' not in text:
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
'''
    path.write_text(text.rstrip() + endpoint + "\n", encoding="utf-8")
