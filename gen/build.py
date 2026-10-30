#!/usr/bin/env python3
"""Génère les fragments JS (catégories, fiches, aides, fonctions) depuis d1..d4 et les injecte dans atlas-distro.html."""
import json, re, sys

SRC = ["/home/claude/gen/d1.txt", "/home/claude/gen/d2.txt", "/home/claude/gen/d3.txt", "/home/claude/gen/d4.txt"]
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

# ---------- FONCTIONS ----------
FUNC_HELP = {
 "transfer": ["Envoyer rapidement un fichier d'un appareil à l'autre, sans passer par un service en ligne.", "Partage de fichiers"],
 "sync": ["Garder les mêmes dossiers à jour sur plusieurs appareils, automatiquement.", "Synchronisation de fichiers"],
 "backup": ["Faire des copies de tes données pour les retrouver après une panne ou une erreur.", "Sauvegarde informatique"],
 "photo": ["Retoucher des photos, dessiner et peindre sur ordinateur.", "Retouche d'image"],
 "raw": ["Développer les photos brutes (RAW) de ton appareil et ranger une grande collection.", "Format RAW"],
 "vector": ["Dessiner des logos et illustrations qui restent nets à toute taille.", "Dessin vectoriel"],
 "vedit": ["Couper, assembler et habiller des vidéos.", "Montage vidéo"],
 "vconv": ["Changer le format d'une vidéo ou réduire son poids.", "Transcodage"],
 "capture": ["Enregistrer ton écran ou diffuser en direct, par exemple un jeu.", "Enregistrement d'écran"],
 "audio": ["Éditer du son, enregistrer ou composer de la musique.", "Édition audio"],
 "cad": ["Modéliser des objets 3D, des pièces mécaniques ou des circuits électroniques.", "Conception assistée par ordinateur"],
 "slicer": ["Préparer un modèle 3D pour qu'une imprimante 3D puisse l'imprimer.", "Impression 3D"],
 "layout": ["Mettre en page des documents, des livres ou des affiches.", "Publication assistée par ordinateur"],
 "passwords": ["Garder tous tes mots de passe dans un coffre chiffré avec un seul mot de passe à retenir.", "Gestionnaire de mots de passe"],
 "vpn": ["Chiffrer ta connexion ou rejoindre un réseau privé à distance.", "Réseau privé virtuel"],
 "fenc": ["Protéger des fichiers sensibles avec un mot de passe ou une clé.", "Chiffrement"],
 "audit": ["Chercher des virus ou vérifier la sécurité des réglages du système.", "Antivirus"],
 "notes": ["Prendre des notes et relier ses idées entre elles.", "Prise de notes"],
 "mail": ["Lire et écrire des e-mails, avec agenda et contacts selon le logiciel.", "Client de messagerie"],
 "tasks": ["Suivre ce qui reste à faire, avec priorités et échéances.", "Gestion de tâches"],
 "books": ["Lire des livres numériques, ranger sa bibliothèque ou citer des sources.", "Livre numérique"],
 "monitor": ["Voir en direct ce que consomment le processeur, la mémoire, les disques et le réseau.", "Moniteur système"],
 "disks": ["Partitionner les disques, voir ce qui prend de la place et surveiller leur santé.", "Partition de disque"],
 "archives": ["Compresser des fichiers en un seul et les extraire.", "Archive informatique"],
 "snapshots": ["Prendre des photos du système pour revenir en arrière après une mauvaise mise à jour.", "Instantané de système de fichiers"],
 "files": ["Parcourir, copier et ranger ses fichiers.", "Gestionnaire de fichiers"],
 "terminal": ["La fenêtre où l'on tape des commandes. Elle sert à tout piloter au clavier.", "Émulateur de terminal"],
 "shell": ["Le programme qui lit les commandes tapées dans le terminal. Il sert aussi à écrire des scripts.", "Interpréteur de commandes"],
 "cli": ["Des remplaçants plus rapides et plus agréables pour des commandes classiques comme grep, find, ls ou cat.", "Interface en ligne de commande"],
 "shots": ["Capturer l'écran et gérer le copier-coller, surtout sous Wayland.", "Capture d'écran"],
 "vm": ["Faire tourner un autre système dans une fenêtre, pour tester sans risque.", "Machine virtuelle"],
 "box": ["Lancer une autre distribution dans un conteneur intégré à ton bureau, par exemple pour installer des logiciels non disponibles sur ta distro.", "Conteneur Linux"],
 "sysc": ["Faire tourner des systèmes complets légers, comme de petites machines.", "Conteneur système"],
 "ssh": ["Se connecter en terminal à un autre ordinateur ou à un serveur, de façon sécurisée.", "Secure Shell"],
 "remote": ["Voir et contrôler l'écran d'un autre ordinateur, ou jouer à distance.", "Bureau à distance"],
 "net": ["Comprendre et diagnostiquer ce qui circule sur un réseau.", "Analyse de trafic réseau"],
 "dl": ["Télécharger des fichiers, des torrents ou des vidéos, avec reprise après coupure.", "Gestionnaire de téléchargement"],
 "music": ["Écouter ta collection de musique ou des services en ligne.", "Lecteur de musique"],
 "retro": ["Jouer à d'anciens jeux de consoles sur ordinateur. Utilise uniquement tes propres jeux.", "Émulateur"],
 "gametools": ["Optimiser la machine pendant les jeux, afficher les images par seconde, gérer Proton.", "Optimisation de jeux vidéo"],
 "media": ["Organiser et regarder tes films et séries, sur ton ordinateur ou ta télé.", "Centre multimédia"],
 "rss": ["Suivre automatiquement les nouveaux articles et épisodes de tes sites et podcasts.", "Flux RSS"],
}
for k, (h, w) in FUNC_HELP.items():
    help_lines.append('%s:%s,\n' % (js("func:" + k), js([h, w])))
helps_js = "".join(help_lines)

DK = "(S.find(x=>x.label===\"Bureau\")||{}).tool"
def D(arr): return "()=>" + js(arr)
def F(i, label, tl, d="[]"): return '{id:%s,label:%s,tools:%s,def:%s}' % (js(i), js(label), js(tl), d if d.startswith("(") or d.startswith("()") else D(json.loads(d)))
groups = [
 ("Partage et synchronisation", [
  ("transfer", "Envoyer des fichiers entre appareils", ["localsend", "kdeconnect", "warpinator", "croc"], "[]"),
  ("sync", "Synchroniser des dossiers", ["syncthing", "nextcloud-client", "unison", "rclone"], "[]"),
  ("backup", "Sauvegarder", ["restic", "borgbackup", "pika-backup", "kopia", "duplicity"], '["restic"]')]),
 ("Création", [
  ("photo", "Retoucher et dessiner des images", ["gimp", "krita", "pinta", "photocraft"], "[]"),
  ("raw", "Développer des photos RAW", ["darktable", "rawtherapee", "lightcraft"], "[]"),
  ("vector", "Dessin vectoriel", ["inkscape", "vectorcraft"], "[]"),
  ("vedit", "Montage vidéo", ["kdenlive", "shotcut", "pitivi", "openshot", "filmcraft"], "[]"),
  ("vconv", "Convertir des vidéos", ["handbrake", "ffmpeg"], "[]"),
  ("capture", "Enregistrer l'écran et diffuser", ["obs-studio", "simplescreenrecorder", "wf-recorder"], '["obs-studio"]'),
  ("audio", "Audio et musique (création)", ["audacity", "tenacity", "ardour", "lmms", "hydrogen", "musescore", "soundcraft"], "[]"),
  ("cad", "3D, CAO et électronique", ["blender", "freecad", "openscad", "kicad", "cadcraft"], "[]"),
  ("slicer", "Impression 3D", ["cura", "prusaslicer"], "[]"),
  ("layout", "Mise en page et composition", ["scribus", "designcraft", "typst", "texlive"], "[]")]),
 ("Sécurité personnelle", [
  ("passwords", "Gestionnaire de mots de passe", ["keepassxc", "bitwarden", "pass"], '["keepassxc"]'),
  ("vpn", "VPN", ["wireguard", "openvpn", "tailscale", "mullvad"], "[]"),
  ("fenc", "Chiffrer des fichiers", ["cryptomator", "veracrypt", "age", "gnupg"], "[]"),
  ("audit", "Antivirus et audit", ["clamav", "lynis"], "[]")]),
 ("Organisation", [
  ("notes", "Notes et connaissances", ["joplin", "logseq", "obsidian", "zim", "zettlr"], "[]"),
  ("mail", "Courriel et agenda", ["thunderbird", "evolution", "kmail", "geary", "aerc", "neomutt"], '["thunderbird"]'),
  ("tasks", "Tâches et projets", ["taskwarrior", "taskwarrior-tui", "todoman", "super-productivity"], "[]"),
  ("books", "Livres numériques et références", ["calibre", "foliate", "koreader", "zotero"], "[]")]),
 ("Utilitaires système", [
  ("monitor", "Surveillance système", ["btop", "htop", "glances", "bottom", "resources", "nvtop"], '["btop"]'),
  ("disks", "Disques et stockage", ["gparted", "gnome-disks", "smartmontools", "ncdu", "baobab", "filelight"], "[]"),
  ("archives", "Archives", ["7zip", "ark", "file-roller"],
   "(S)=>{const d=%s;return[d===\"kde-plasma\"?\"ark\":\"file-roller\"]}" % DK),
  ("snapshots", "Instantanés système", ["timeshift", "snapper"], "[]"),
  ("files", "Gestionnaire de fichiers", ["dolphin", "thunar", "nautilus", "pcmanfm", "yazi", "ranger"],
   "(S)=>{const d=%s;return[d===\"kde-plasma\"?\"dolphin\":d===\"gnome\"?\"nautilus\":d===\"xfce\"?\"thunar\":\"yazi\"]}" % DK),
  ("terminal", "Terminal", ["kitty", "alacritty", "foot", "wezterm", "ghostty"], '["kitty"]'),
  ("shell", "Shell", ["bash", "zsh", "fish", "nushell"], '["bash"]'),
  ("cli", "Outils en ligne de commande modernes", ["ripgrep", "fd", "fzf", "bat", "eza", "zoxide", "starship"], "[]"),
  ("shots", "Captures d'écran et presse-papiers", ["grim", "flameshot", "spectacle", "wl-clipboard", "cliphist"],
   "(S)=>{const d=%s;return d===\"kde-plasma\"?[\"spectacle\"]:[\"hyprland\",\"sway\",\"mangowc\"].includes(d)?[\"grim\",\"wl-clipboard\"]:[\"flameshot\"]}" % DK)]),
 ("Virtualisation", [
  ("vm", "Machines virtuelles", ["qemu", "virt-manager", "gnome-boxes", "virtualbox"], "[]"),
  ("box", "Environnements isolés (Distrobox)", ["distrobox", "toolbx"], "[]"),
  ("sysc", "Conteneurs système", ["incus", "lxc"], "[]")]),
 ("Réseau et accès distant", [
  ("ssh", "Accès distant en ligne de commande", ["openssh", "mosh", "dropbear"], '["openssh"]'),
  ("remote", "Bureau à distance", ["rustdesk", "remmina", "tigervnc", "moonlight", "sunshine"], "[]"),
  ("net", "Analyse réseau", ["wireshark", "nmap", "tcpdump", "mtr", "bandwhich"], "[]"),
  ("dl", "Téléchargements", ["aria2", "qbittorrent", "transmission", "yt-dlp"], "[]")]),
 ("Loisirs", [
  ("music", "Lecteur de musique", ["strawberry", "mpd", "lollypop", "amberol", "spotify", "ncspot", "cmus"], "[]"),
  ("retro", "Émulation et jeux rétro", ["retroarch", "dolphin-emu", "pcsx2", "ppsspp", "mgba", "cemu"], "[]"),
  ("gametools", "Outils de jeu", ["gamemode", "mangohud", "gamescope", "protonup-qt"], '["gamemode","mangohud"]'),
  ("media", "Médiathèque et streaming vidéo", ["kodi", "jellyfin-player"], "[]"),
  ("rss", "Flux RSS et podcasts", ["newsboat", "liferea", "gpodder", "akregator"], "[]")]),
]
toolids = set(ids) | set(re.findall(r'T\(\{id:"([^"]+)"', html))
fe = []
for gname, funcs in groups:
    fl = []
    for i, label, tl, d in funcs:
        for tid in tl:
            if tid not in toolids: fe.append("fonction %s: outil inconnu %s" % (i, tid))
        fl.append(F(i, label, tl, d))
    groups_js_part = '  {name:%s,funcs:[\n   %s]}' % (js(gname), ",\n   ".join(fl))
    groups_js = globals().setdefault("_g", [])
    groups_js.append(groups_js_part)
if fe:
    print("\n".join(fe)); sys.exit(1)
groups_js = ",\n".join(globals()["_g"])

# ---------- INJECTION ----------
def inject(html, marker, text, before=True, once=True):
    assert marker in html, "marqueur introuvable: " + marker[:40]
    return html.replace(marker, (text + marker) if before else (marker + text), 1)

if "/* GEN-BEGIN */" in html:
    sys.exit("déjà injecté")
html = inject(html, ' C("file-manager"', "/* GEN-BEGIN */\n" + cats_js)
html = inject(html, "/* ---- GESTIONNAIRES DE PAQUETS ---- */", "/* GEN-TOOLS */\n" + tools_js)
html = inject(html, '"crit:release_model":', helps_js)
old = ' ]},\n bricks:{"Bibliothèque C"'
assert old in html
html = html.replace(old, ",\n" + groups_js + "\n ]},\n bricks:{\"Bibliothèque C\"", 1)
# la dernière fonction du groupe existant se terminait par ']}' : on a juste ajouté ',' devant
open(HTML, "w", encoding="utf-8").write(html)
print("OK: %d catégories, %d fiches, %d aides" % (len(cats), len(tools), len(help_lines)))
