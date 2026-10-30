# Compare les paquets de l'app (list_pkgs.js) aux index officiels (fetch_indexes.sh).
# Écrit gen/distro_status.json et injecte DISTRO_STATUS et FLATHUB_STATUS dans atlas-distro.html.
# Usage : python3 -I gen/check_pkgs.py /chemin/vers/idx pkgs.json
# Seules les bases dont les index sont présents dans idx sont revérifiées : les autres gardent
# leur état et leur date dans gen/distro_status.json.
# États : ok, virtual (nom fourni par un autre paquet), virtual-group (groupe pacman),
#         thirdparty (dépôt tiers, voir thirdparty.json), optrepo (dépôt officiel désactivé par défaut,
#         nonfree ou multilib de Void), ambiguous (Gentoo : nom court présent dans plusieurs catégories), absent.
import sys, os, re, json, glob, subprocess, tarfile, plistlib
idx, pkgs_file = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(here, '..', 'atlas-distro.html')

def unpack(cmd, f):
    return subprocess.run([cmd, '-dc', f], capture_output=True, text=True, check=True).stdout

def deb(prefix):
    names, prov = set(), set()
    for f in glob.glob(f'{idx}/{prefix}-*.xz'):
        for line in unpack('xz', f).splitlines():
            if line.startswith('Package: '): names.add(line[9:].strip())
            elif line.startswith('Provides: '):
                prov.update(p.strip().split(' ')[0] for p in line[10:].split(','))
    return names, prov, set()

def arch():
    names, prov, groups = set(), set(), set()
    for f in glob.glob(f'{idx}/arch-*.db'):
        with tarfile.open(f) as t:
            for m in t.getmembers():
                if not m.name.endswith('/desc'): continue
                sec = None
                for line in t.extractfile(m).read().decode().splitlines():
                    if line.startswith('%'): sec = line; continue
                    if not line: continue
                    if sec == '%NAME%': names.add(line)
                    elif sec == '%PROVIDES%': prov.add(re.split('[<>=]', line)[0])
                    elif sec == '%GROUPS%': groups.add(line)
    return names, prov, groups

def fed():
    names, prov = set(), set()
    for f in glob.glob(f'{idx}/fed-*.zst'):
        for m in re.finditer(r'<package type="rpm">.*?</package>', unpack('zstd', f), re.S):
            b = m.group(0)
            if '<arch>src</arch>' in b: continue
            names.add(re.search(r'<name>([^<]+)</name>', b).group(1))
            pb = re.search(r'<rpm:provides>(.*?)</rpm:provides>', b, re.S)
            if pb: prov.update(re.findall(r'<rpm:entry name="([^"]+)"', pb.group(1)))
    return names, prov, set()

def void():
    # index.plist de chaque dépôt : clés de premier niveau = noms des paquets
    names, prov, opt = set(), set(), set()
    for f in sorted(glob.glob(f'{idx}/void-*.repodata')):
        plist = subprocess.run(['tar', '--zstd', '-xOf', f, 'index.plist'], capture_output=True, check=True).stdout
        repo = plistlib.loads(plist)
        target = names if f.endswith('void-main.repodata') else opt
        for k, v in repo.items():
            target.add(k)
            prov.update(re.sub(r'-[^-]+$', '', x) for x in v.get('provides', []) if not x.startswith('cmd:'))
    return names, prov, set(), opt - names

def gentoo():
    # catégorie/paquet ; un nom court n'est valide que s'il n'existe que dans une catégorie
    atoms = set(open(f'{idx}/gentoo-atoms.txt').read().split())
    short = {}
    for a in atoms: short.setdefault(a.split('/')[1], []).append(a)
    return atoms, short

PARSERS = {'debian': (lambda: deb('deb'), 'deb-*.xz'), 'ubuntu': (lambda: deb('ubu'), 'ubu-*.xz'), 'arch': (arch, 'arch-*.db'),
           'fedora': (fed, 'fed-*.zst'), 'void': (void, 'void-*.repodata'), 'gentoo': (gentoo, 'gentoo-atoms.txt')}
wanted = json.load(open(pkgs_file))
third = json.load(open(os.path.join(here, 'thirdparty.json')))
meta = {}
for f in sorted(glob.glob(os.path.join(idx, 'meta*.json'))): meta.update(json.load(open(f)))
STATUS = os.path.join(here, 'distro_status.json')
status = json.load(open(STATUS)) if os.path.exists(STATUS) else {'_meta': {}, '_thirdparty': {}}
for base, (parse, pattern) in PARSERS.items():
    if not glob.glob(os.path.join(idx, pattern)):
        print(f'== {base} : pas d\'index dans {idx}, état précédent conservé' + (f" ({status['_meta'][base]['verified_on']})" if base in status['_meta'] else ''))
        continue
    st, tp = {}, {}
    if base == 'gentoo':
        atoms, short = parse()
        for p in sorted(wanted[base]):
            if p in atoms: st[p] = 'ok'
            elif len(short.get(p, [])) == 1: st[p] = 'ok'
            elif short.get(p): st[p] = 'ambiguous'
            else: st[p] = 'absent'
    else:
        r = parse()
        names, prov, groups = r[:3]
        opt = r[3] if len(r) > 3 else set()
        for p in sorted(wanted[base]):
            if p in names: st[p] = 'ok'
            elif p in groups: st[p] = 'virtual-group'
            elif p in prov: st[p] = 'virtual'
            elif p in opt: st[p] = 'optrepo'
            elif p in third.get(base, {}): st[p] = 'thirdparty'; tp[p] = third[base][p]
            else: st[p] = 'absent'
    status[base] = st
    status['_meta'][base] = meta[base]
    status['_thirdparty'].pop(base, None)
    if tp: status['_thirdparty'][base] = tp
    by = {}
    for p, s in st.items(): by.setdefault(s, []).append(p)
    print(f"== {base} ({meta[base]['label']}) : " + ', '.join(f'{len(v)} {k}' for k, v in sorted(by.items())))
    for k in ('virtual', 'virtual-group', 'thirdparty', 'optrepo', 'ambiguous', 'absent'):
        if k in by: print(f'  {k} : ' + ' '.join(by[k]))

FH = os.path.join(here, 'flathub_status.json')
if os.path.exists(os.path.join(idx, 'flathub-appstream.json')):
    flathub = set(json.load(open(os.path.join(idx, 'flathub-appstream.json'))))
    fh = {'_meta': meta['flathub'], 'ids': {i: ('ok' if i in flathub else 'absent') for i in wanted['_flatpak']}}
    miss = [i for i, s in fh['ids'].items() if s == 'absent']
    print(f"== flathub : {len(fh['ids']) - len(miss)} ok, {len(miss)} absent" + (' : ' + ' '.join(miss) if miss else ''))
else:
    fh = json.load(open(FH))
    new = [i for i in wanted['_flatpak'] if i not in fh['ids']]
    print(f"== flathub : pas d'index, état précédent conservé ({fh['_meta']['verified_on']})" + (' ; non vérifiés : ' + ' '.join(new) if new else ''))

json.dump(status, open(STATUS, 'w'), ensure_ascii=False, indent=1)
json.dump(fh, open(FH, 'w'), ensure_ascii=False, indent=1)
html = open(HTML, encoding='utf-8').read()
def inject(html, name, data):
    line = f'const {name}=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';'
    if re.search(rf'^const {name}=.*;$', html, re.M):
        return re.sub(rf'^const {name}=.*;$', lambda m: line, html, count=1, flags=re.M)
    m = re.search(r'^const ALPINE_STATUS=.*;$', html, re.M)
    return html[:m.end()] + '\n' + line + html[m.end():]
html = inject(html, 'DISTRO_STATUS', status)
html = inject(html, 'FLATHUB_STATUS', fh)
open(HTML, 'w', encoding='utf-8').write(html)
print('DISTRO_STATUS et FLATHUB_STATUS injectés dans', os.path.normpath(HTML))
