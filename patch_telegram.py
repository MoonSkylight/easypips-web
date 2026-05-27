from pathlib import Path

path = Path("api_pro.py")
text = path.read_text(encoding="utf-8")

start = text.find("def new_signal_message(signal: dict):")
end = text.find("def get_active_signals", start)

if start == -1 or end == -1:
    raise SystemExit("Could not find Telegram message block")

new_block = '''def new_signal_message(signal: dict):
    source = signal.get("desk") or signal.get("strategy") or signal.get("source") or "EasyPips"
    symbol = signal.get("symbol") or signal.get("pair") or "-"
    direction = signal.get("direction") or signal.get("type") or "-"
    entry = signal.get("entry") or "-"
    sl = signal.get("sl") or "-"
    tp1 = signal.get("tp1") or "-"
    tp2 = signal.get("tp2") or "-"
    tp3 = signal.get("tp3") or "-"
    confidence = signal.get("confidence") or signal.get("score") or "N/A"
    pattern = signal.get("pattern") or "AI confirmed setup"

    return f"""
*EASY PIPS AI - LIVE SIGNAL*

------------------------------
*PAIR:* {symbol}
*TYPE:* {direction}
------------------------------

*ENTRY:* `{entry}`
*STOP LOSS:* `{sl}`

*TAKE PROFIT 1:* `{tp1}`
*TAKE PROFIT 2:* `{tp2}`
*TAKE PROFIT 3:* `{tp3}`











------------------------------
*STRATEGY:* {source}
*CONFIDENCE:* {confidence}%
*SETUP:* {pattern}
*AI STATUS:* CONFIRMED
------------------------------

Risk properly. Educational signal only.
#EasyPipsAI #{str(symbol).replace("/", "").replace(":", ""








)}
"""


def result_message(signal: dict, result: str):
    symbol = signal.get("symbol") or "-"
    direction = signal.get("direction") or "-"
    confidence = signal.get("confidence") or signal.get("score") or "N/A"
 







   result_text = str(result or "").upper()

    if "SL" in result_text:
        title = "*EASY PIPS AI - STOP LOSS*"
        status = "SL HIT"
 




       note = "Risk managed correctly. Waiting for next high probability setup."
    else:
        title = "*EASY PIPS AI - TARGET HIT*"
        status = f"{result_text} HIT"
        note = "Partial profits secured. Manage remaining position carefully."






    return f"""
{title}

------------------------------
*PAIR:* {symbol}
*RESULT:* {status}
-






-----------------------------

*TYPE:* {direction}
*CONFIDENCE:* {confidence}%

{note}







#EasyPipsAI #{str(symbol).replace("/", "").replace(":", "")}
"""


'''







text = text[:start] + new_block + text[end:]
path.write_text(text, encoding="utf-8")
print("Telegram message block replaced successfully")
