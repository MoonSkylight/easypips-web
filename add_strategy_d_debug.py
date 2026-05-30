from pathlib import Path

path = Path("api_pro.py")
text = path.read_text(encoding="utf-8")

if '@app.get("/strategy-d-debug")' not in text:
    endpoint = r'''

@app.get("/strategy-d-debug")
def strategy_d_debug():
    results = []

    for symbol, yahoo_symbol in list(SYMBOLS.items())[:3]:
        item = {"symbol": symbol, "strategyD": {}}

        try:
            data = get_yahoo_history(yahoo_symbol, period="5d", interval="1m")

            if data is None or data.empty or len(data) < 220:
                item["strategyD"] = {"status": "blocked", "reason": "Not enough 1m data"}
            else:
                setup = generate_strategy_d_signal(data, symbol)
                if setup:
                    item["strategyD"] = {"status": "signal", **setup}
                else:
                    item["strategyD"] = {"status": "blocked", "reason": "Scalping conditions not aligned"}

        except Exception as e:
            item["strate

gyD"] = {"status": "error", "reason": str(e)}

        results.append(item)

    return {
        "status": "ok",
        "message": "Strategy D debug completed",
        "results": results,
    }
'''
    path.write_text(text.rstrip() + endpoint + "\n", encoding="utf-8")
