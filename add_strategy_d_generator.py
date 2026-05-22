from pathlib import Path

path = Path("api_pro.py")
code = path.read_text(encoding="utf-8")

generator = '''
def generate_strategy_d_signals():
    created = 0
    rejected = 0

    for symbol, yahoo_symbol in SYMBOLS.items():
        try:
            if created >= 1:
                break

            if active_strategy_signal_exists(symbol, "Strategy D"):
                continue

            data = yf.Ticker(yahoo_symbol).history(period="15d", interval="15m")

            if data is None or data.empty or len(data) < 220:
                continue

            setup = generate_strategy_d_signal(data, symbol)

            if not setup:
                continue

            new_signal = {
                "source": "AI Engine",
                "strategy": "Strategy D",
                "desk": None,
                "pattern": setup.get("pattern", "Institutional Liquidity Scalper"),
                "timeframe": setup.get("timeframe", "15m"),
                "symbol": symbol,
                "direction": setup["direction"],
                "entry": str(setup["entry"]),
                "sl": str(setup["sl"]),
                "tp1": str(setup["tp1"]),












                "tp2": str(setup["tp2"]),
                "tp3": str(setup["tp3"]),
                "confidence": setup.get("confidence", 93),
                "score": setup.get("confidence", 93),
                "status": "ACTIVE",
                "result": "RUNNING",
                "hit_tp1": False,
                "hit_tp2": False,
                "hit_tp3": False,
                "hit_sl": False,
                "telegram_sent": False,
                "analyst": "Institutional AI Engine",
 












               "note": setup.get("reason", "Institutional liquidity scalper"),
            }

            ok, reason = quality_gate(new_signal)

            if not ok:
                save_rejected_signal(new_signal, reason)
                rejected += 1
                continue










            save_signal(new_signal)
            send_new_signal_with_chart(new_signal)
            created += 1

        except Exception as e:
            print("Strategy D error for", symbol, str(e))
            rejected += 1








    return {"created": created, "rejected": rejected}


'''

i






f "def generate_strategy_d_signals" not in code:
    code = code.replace("def generate_strategy_a_signals():", generator + "def generate_strategy_a_signals():")

path.write_text(code, encoding="utf-8")
