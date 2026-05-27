from pathlib import Path

path = Path("api_pro.py")
text = path.read_text(encoding="utf-8")

start = text.find("def result_message(signal: dict, result: str):")
end = text.find("def get_active_signals", start)

if start == -1 or end == -1:
    raise SystemExit("Could not find result_message block")

new_result = '''def result_message(signal: dict, result: str):
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
--




----------------------------

*TYPE:* {direction}
*CONFIDENCE:* {confidence}%

{note}

#EasyPipsAI #{str(symbol).replace("/", "").replace(":", "")}
"""


'''

text = text[:start] + new_result + text[end:]
path.write_text(text, encoding="utf-8")
print("result_message fixed")
