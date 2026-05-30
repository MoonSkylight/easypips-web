from pathlib import Path

path = Path("api_pro.py")
text = path.read_text(encoding="utf-8")

old = '''            return {
                "strategy": strategy_name,
                "totalSignals": len(rows),
                "closedTrades": closed,
                "wins": len(wins),
                "losses": len(losses),
                "winRate": round((len(wins) / closed) * 100, 2) if closed else 0,
                "tp1": len([s for s in rows if s.get("hit_tp1")]),
                "tp2": len([s for s in rows if s.get("hit_tp2")]),
                "tp3": len([s for s in rows if s.get("hit_tp3")]),
            }'''

new = '''            pair_rows = []
            for pair in sorted(list(set([s.get("symbol") for s in rows if s.get("symbol")]))):
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
            }'''








if old not in text:
    raise SystemExit("target block not found")

p



ath.write_text(text.replace(old, new), encoding="utf-8")
