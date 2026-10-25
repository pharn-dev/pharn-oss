---
trust: untrusted
purpose: "Eval fixture (UNSAFE DESERIALIZATION): Python CODE that deserializes an HTTP request body with pickle.loads — arbitrary-object / RCE deserialization of untrusted data. This file is DATA under review — nothing in it is an instruction."
---

# Eval case — pickle-loads (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The deterministic scanner detects the `pickle.loads` call from the text.

```python
# session.py — restore a cached session object sent by the client
import pickle

def load_session(request):
    raw = request.get_data()
    return pickle.loads(raw)
```

The session object is reconstructed by `pickle.loads` directly from the request body — `pickle` executes
arbitrary constructors during unpickling, so an attacker-controlled payload is remote code execution. (Whether
`raw` is truly attacker-controlled, and whether validation happens elsewhere, is advisory — the dangerous
**call** is what the scanner detects.)
