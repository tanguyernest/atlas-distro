#!/usr/bin/env python3
"""Génère les fragments JS (catégories, fiches, aides, fonctions) depuis d1..d4 et les injecte dans atlas-distro.html."""
import json, re, sys

SRC = ["/home/claude/gen/d6.txt"]
HTML = "/home/claude/atlas-distro.html"

def js(v):
    return json.dumps(v, ensure_ascii=False)

cats, tools, helps_cat, helps_crit = [], [], {}, {}
cur = None  # id de la catégorie courante
cur_def = None

def parse():
    global cur, cur_def
    t = None
    for path in SRC:
        for raw in open(path, encoding="utf-8"):
            line = raw.rstrip("\n")
            if not line.strip():
                continue
            if line.startswith("# CAT "):
                parts = [p.strip() for p in line[6:].split("|")]
                cid, layer, name, desc, help_, wiki = parts[:6]
                cur = cid
                cur_def = {"id": cid, "layer": layer, "name": name, "description": desc, "criteria": []}
                cats.append(cur_def)
                helps_cat[cid] = [help_, wiki]
                continue
            if line.startswith("# USE "):
                cur = line[6:].strip()
                cur_def = None
                continue
            if line.startswith("crit "):
                p = [x.strip() for x in line[5:].split("|")]
                cur_def["criteria"].append(p)
                continue
            if line.startswith("#h "):
                k, txt = [x.strip() for x in line[3:].split("|", 1)]
                helps_crit[k] = txt
                continue
            if line.startswith("@ "):
                p = [x.strip() for x in line[2:].split("|")]
                t = {"id": p[0], "name": p[1], "category": cur, "license": p[2], "maturity": p[3],
                     "difficulty": int(p[4]), "musl": p[5], "used_by": [], "pros": [], "cons": [], "needs": [],
                     "requires": [], "conflicts": [], "works_well_with": [], "implement": [], "docs": [],
                     "pitfalls": []}
                tools.append(t)
                continue
            tag, _, rest = line.partition(" ")
            rest = rest.strip()
            if tag == "s": t["summary"] = rest
            elif tag == "c":
                crit = {}
                for pair in rest.split(" ; "):
                    k, _, v = pair.partition("=")
                    k, v = k.strip(), v.strip()
                    crit[k] = True if v == "true" else False if v == "false" else None if v == "null" else v
                t["criteria"] = crit
            elif tag == "+": t["pros"] = [x.strip() for x in rest.split(" ; ")]
            elif tag == "-": t["cons"] = [x.strip() for x in rest.split(" ; ")]
            elif tag == "l": t["learn"] = rest
            elif tag == "n": t["needs"] = [x.strip() for x in rest.split(" ; ")]
            elif tag == "p": t["pitfalls"].append(rest)
            elif tag == "i":
                title, _, cmds = rest.partition(" :: ")
                t["implement"].append({"title": title.strip(), "commands": [c.strip() for c in cmds.split(" ;; ")]})
            elif tag == "d":
                label, _, url = rest.partition("|")
                t["docs"].append({"label": label.strip(), "url": url.strip()})
            elif tag == "r": t["requires"] = [x.strip() for x in rest.split(",")]
            elif tag == "x": t["conflicts"] = [x.strip() for x in rest.split(",")]
            elif tag == "w": t["works_well_with"] = [x.strip() for x in rest.split(",")]
            else:
                sys.exit("ligne inconnue: " + line)

parse()

# ---------- contrôles ----------
errs = []
catids = {c["id"] for c in cats}
for t in tools:
    if "summary" not in t: errs.append("sans résumé: " + t["id"])
    if not t["docs"]: errs.append("sans doc: " + t["id"])
    t["criteria"] = t.get("criteria", {})
ids = [t["id"] for t in tools]
dup = {i for i in ids if ids.count(i) > 1}
if dup: errs.append("ids en double: %s" % dup)
# critères cohérents avec la catégorie
catcrit = {c["id"]: [x[0] for x in c["criteria"]] for c in cats}
html = open(HTML, encoding="utf-8").read()
for m in re.finditer(r'C\("([a-z0-9-]+)",', html):
    catcrit.setdefault(m.group(1), None)
# récupère les critères des catégories existantes (pour USE)
for m in re.finditer(r' C\("([a-z0-9-]+)","[a-z]+","[^"]*","[^"]*",\[(.*?)\]\)', html):
    catcrit.setdefault(m.group(1), [k for k in re.findall(r'\["([a-z_0-9]+)"', m.group(2))])
    if catcrit[m.group(1)] is None:
        catcrit[m.group(1)] = [k for k in re.findall(r'\["([a-z_0-9]+)"', m.group(2))]
for t in tools:
    keys = catcrit.get(t["category"])
    if keys is None: errs.append("catégorie inconnue: %s (%s)" % (t["category"], t["id"])); continue
    for k in t["criteria"]:
        if k not in keys: errs.append("critère hors catégorie: %s.%s" % (t["id"], k))
    for k in keys:
        if k not in t["criteria"] and k != "footprint_mb": errs.append("critère manquant: %s.%s" % (t["id"], k))
if errs:
    print("\n".join(errs)); sys.exit(1)

# ---------- CATS ----------
def cat_js(c):
    crits = []
    for p in c["criteria"]:
        key, label, typ = p[0], p[1], p[2]
        unit = p[3] if len(p) > 3 else None
        crits.append("[%s,%s,%s%s]" % (js(key), js(label), js(typ), ("," + js(unit)) if unit else ""))
    return ' C(%s,%s,%s,%s,[%s]),\n' % (js(c["id"]), js(c["layer"]), js(c["name"]), js(c["description"]), ",".join(crits))
cats_js = "".join(cat_js(c) for c in cats)

# ---------- TOOLS ----------
def tool_js(t):
    o = {
        "id": t["id"], "name": t["name"], "category": t["category"], "summary": t["summary"],
        "license": t["license"], "maturity": t["maturity"], "difficulty": t["difficulty"],
        "criteria": t["criteria"], "pros": t["pros"], "cons": t["cons"],
    }
    if t.get("learn"): o["learn"] = t["learn"]
    o["musl"] = t["musl"]
    if t["needs"]: o["needs"] = t["needs"]
    if t["requires"]: o["requires"] = t["requires"]
    if t["conflicts"]: o["conflicts"] = t["conflicts"]
    if t["works_well_with"]: o["works_well_with"] = t["works_well_with"]
    o["implement"] = t["implement"]
    o["pitfalls"] = t["pitfalls"]
    o["docs"] = t["docs"]
    return "T(" + js(o) + "),\n"
tools_js = "".join(tool_js(t) for t in tools)

# ---------- AIDES ----------
existing_help = set(re.findall(r'^"((?:crit|cat|func|layer|hw):[^"]+)":', html, re.M))
help_lines = []
for cid, (h, w) in helps_cat.items():
    k = "cat:" + cid
    if k not in existing_help: help_lines.append('%s:%s,\n' % (js(k), js([h, w])))
for k, txt in helps_crit.items():
    kk = "crit:" + k
    if kk not in existing_help: help_lines.append('%s:%s,\n' % (js(kk), js([txt])))
# critères sans aide
allkeys = {p[0] for c in cats for p in c["criteria"]}
missing = sorted(k for k in allkeys if ("crit:" + k) not in existing_help and k not in helps_crit)
if missing:
    print("critères sans aide:", missing)

helps_js = "".join(help_lines)

# ---------- INJECTION ----------
def inject(html, marker, text, before=True, once=True):
    assert marker in html, "marqueur introuvable: " + marker[:40]
    return html.replace(marker, (text + marker) if before else (marker + text), 1)

html = inject(html, ' C("file-manager"', cats_js)
html = inject(html, "/* ---- GESTIONNAIRES DE PAQUETS ---- */", tools_js)
html = inject(html, '"crit:release_model":', helps_js)
open(HTML, "w", encoding="utf-8").write(html)
print("OK: %d catégories, %d fiches, %d aides" % (len(cats), len(tools), len(help_lines)))
