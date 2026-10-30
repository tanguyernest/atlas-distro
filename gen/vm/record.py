# Enregistre les étapes réussies d'un test VM dans gen/vm_tests.json et injecte VM_TESTS dans le HTML.
# Usage : python3 -I gen/vm/record.py <dossier de travail>/results.json [--confirme scratch-vm,scratch-desktop]
# Une étape « visual » (capture d'écran) n'est enregistrée que si elle est confirmée après lecture de la capture.
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(HERE, '..', 'vm_tests.json')
HTML = os.path.join(HERE, '..', '..', 'atlas-distro.html')
res = json.load(open(sys.argv[1]))
conf = set(sys.argv[sys.argv.index('--confirme') + 1].split(',')) if '--confirme' in sys.argv else set()
db = json.load(open(DB)) if os.path.exists(DB) else {}
b = db.setdefault(res['base'], {'label': res['label'], 'tests': {}})
b['label'] = res['label']
added = []
for sid, r in res['steps'].items():
    if not r['ok'] or (r.get('visual') and sid not in conf): continue
    b['tests'][f"{sid}:{r['hash']}"] = {'date': res['date'], 'label': res['label'], 'obj': res['obj'], 'boot': res['boot'], 'title': r['title']}
    added.append(r['title'])
json.dump(db, open(DB, 'w'), ensure_ascii=False, indent=1)
html = open(HTML, encoding='utf-8').read()
line = 'const VM_TESTS=' + json.dumps(db, ensure_ascii=False, separators=(',', ':')) + ';'
html = re.sub(r'^const VM_TESTS=.*;$', lambda m: line, html, count=1, flags=re.M)
open(HTML, 'w', encoding='utf-8').write(html)
print(f"{len(added)} étapes enregistrées pour {res['base']} :"); [print('  -', t) for t in added]
