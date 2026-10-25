---
trust: untrusted
purpose: "True-negative eval fixture: CODE deserializes untrusted input with SAFE primitives — yaml.safe_load and JSON.parse — so the scanner is clean and the lens emits NO finding. Proves the SafeLoader discriminator and the JSON.parse-is-not-a-sink honesty (no false positive)."
---

# Eval case — safe-yaml (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. It deserializes untrusted input using **safe** primitives, so the scanner reports nothing.

```python
# config.py — parse a client-supplied config document, safely
import yaml, json

def parse_config(request):
    cfg = yaml.safe_load(request.get_data())
    meta = json.loads(request.headers.get("x-meta", "{}"))
    return cfg, meta
```

`yaml.safe_load` constructs only standard scalars/containers (no arbitrary object construction), and `json.loads`
cannot instantiate arbitrary objects or execute code — both are safe by themselves. The scanner is clean; the
lens emits **no** finding. (Prototype-pollution risk if `meta` were later merged into an object via `__proto__`
is advisory judgment the lens may note — it is not a dangerous **call** and is not a floor finding.)
