# Banc de test VM : exécute les commandes exactes du tutoriel dans QEMU, par la console série.
# Usage : python3 -I gen/vm/run_vm.py steps.json <dossier de travail> [--jusqua <id d'étape>]
#
# Phases :
#   1. hôte  : commandes de « Créer une machine virtuelle de test », exécutées telles quelles.
#              La commande qemu-system reçoit en plus -display none et un moniteur, pour une capture d'écran.
#   2. live  : l'ISO démarre par chargement direct de son noyau et de son initramfs (bases.json),
#              avec console=ttyS0 en plus, pour piloter le système live par la console série.
#              L'ISO y est branchée en disque virtio (lecture seule) : en IDE, le noyau chargé directement
#              ne voit pas le lecteur CD. La commande -cdrom du tutoriel est testée telle quelle en phase 1.
#   3. disque: la commande « Démarrer sur le disque » du tutoriel, telle quelle, plus -display none
#              et un moniteur. Sa console série (-serial mon:stdio) est pilotée par stdin/stdout.
# Résultat : results.json (état de chaque étape) et les journaux serial-*.log dans le dossier de travail.
import json, os, re, socket, subprocess, sys, time, select

HERE = os.path.dirname(os.path.abspath(__file__))
PW = 'Atlas-test-2026'
ANSI = re.compile(r'\x1b\[[0-9;?]*[A-Za-z]|\x1b[()][A-Z0-9]|\r')
PROMPTS = [  # (motif en fin de sortie, réponse)
    (re.compile(r"(?i)type 'yes' in capital letters\)?:\s*$"), 'YES'),
    (re.compile(r'(?i)(new password|retype( new)? password|enter passphrase[^:]*|verify passphrase|password)\s*:\s*$'), PW),
]
SHELL_SWITCH = re.compile(r'^(chroot |arch-chroot |sudo -i$|exit$)')

class Console:
    """Console série : envoie une commande, attend le marqueur __RC=n__."""
    def __init__(self, log, rd, wr):
        self.log, self.rd, self.wr, self.buf = log, rd, wr, ''
    def _read(self, timeout):
        r, _, _ = select.select([self.rd], [], [], timeout)
        if not r: return ''
        data = self.rd.recv(65536) if hasattr(self.rd, 'recv') else os.read(self.rd.fileno(), 65536)
        if not data: raise EOFError('console fermée')
        t = ANSI.sub('', data.decode('utf-8', 'replace'))
        self.log.write(t); self.log.flush(); self.buf += t
        return t
    def send(self, s):
        b = s.encode()
        if hasattr(self.wr, 'sendall'): self.wr.sendall(b)
        else: self.wr.write(b); self.wr.flush()
    def wait(self, pattern, timeout, answer_prompts=True):
        rx = re.compile(pattern); end = time.time() + timeout
        while time.time() < end:
            m = rx.search(self.buf)
            if m: self.buf = self.buf[m.end():]; return m
            if answer_prompts:
                tail = self.buf[-200:]
                for prx, ans in PROMPTS:
                    if prx.search(tail):
                        self.buf = ''; self.send(ans + '\n'); break
            self._read(1)
        raise TimeoutError(f'attente de {pattern!r} dépassée ({timeout} s)')
    def run(self, cmd, timeout=1800):
        """Exécute une commande (éventuellement multiligne), renvoie son code de retour."""
        self.buf = ''
        if SHELL_SWITCH.match(cmd):
            self.send(cmd + '\n'); time.sleep(2); self.send('echo "__RC=$?__"\n')
        elif '\n' in cmd or re.search(r'\s#', cmd):  # multiligne ou commentaire en fin de ligne
            self.send(cmd + '\necho "__RC=$?__"\n')
        else:
            self.send(cmd + '; echo "__RC=$?__"\n')
        return int(self.wait(r'__RC=(\d+)__', timeout).group(1))

def monitor(sock_path, cmd):
    s = socket.socket(socket.AF_UNIX); s.connect(sock_path); s.settimeout(5)
    try:
        time.sleep(0.5); s.recv(65536)
        s.sendall((cmd + '\n').encode()); time.sleep(2)
        try: return s.recv(65536).decode('utf-8', 'replace')
        except socket.timeout: return ''
    finally: s.close()

def main():
    steps_file, work = sys.argv[1], os.path.abspath(sys.argv[2])
    stop = sys.argv[sys.argv.index('--jusqua') + 1] if '--jusqua' in sys.argv else None
    data = json.load(open(steps_file)); base = data['base']
    cfg = json.load(open(os.path.join(HERE, 'bases.json')))[base]
    os.makedirs(work, exist_ok=True)
    iso = os.path.join(work, cfg['iso'])
    results = {'base': base, 'label': cfg['label'], 'obj': data['obj'], 'boot': data['boot'], 'date': time.strftime('%Y-%m-%d'), 'steps': {}}
    def save(): json.dump(results, open(os.path.join(work, 'results.json'), 'w'), ensure_ascii=False, indent=1)
    def mark(st, ok, why='', **extra):
        results['steps'][st['id']] = dict(hash=st['hash'], title=st['title'], ok=ok, why=why, **extra); save()
        print(('OK    ' if ok else 'ÉCHEC ') + st['title'] + (f' : {why}' if why else ''), flush=True)
    steps = data['steps']
    idx = {s['id']: n for n, s in enumerate(steps)}
    todo = steps[:idx[stop] + 1] if stop else steps
    mon = os.path.join(work, 'mon.sock')

    # ---------- 1. hôte ----------
    st = steps[idx['scratch-vm']]
    for f in ('disque.qcow2', 'uefi-vars.fd'):
        if os.path.exists(os.path.join(work, f)): os.remove(os.path.join(work, f))
    ok, why = True, ''
    for c in st['cmds'] + st['verify']:
        if c.startswith('qemu-system'):
            if os.path.exists(mon): os.remove(mon)
            p = subprocess.Popen(['bash', '-c', c.replace('\\\n', ' ') + f' -display none -monitor unix:{mon},server,nowait'],
                                 cwd=work, stdin=subprocess.PIPE, stdout=open(os.path.join(work, 'serial-iso.log'), 'w'), stderr=subprocess.STDOUT)
            time.sleep(45)
            if p.poll() is not None: ok, why = False, f'qemu s\'est arrêté (code {p.returncode})'; break
            monitor(mon, f'screendump {work}/ecran-iso.png -f png')
            monitor(mon, 'quit'); p.wait(30)
        else:
            r = subprocess.run(['bash', '-c', c], cwd=work, capture_output=True, text=True)
            if r.returncode: ok, why = False, f'{c} : code {r.returncode} {r.stderr.strip()[:200]}'; break
    mark(st, ok, why, screenshot='ecran-iso.png', visual=True)
    if not ok: return

    # ---------- 2. live ----------
    for f in ('kernel', 'initrd'):
        subprocess.run(['bsdtar', '-xf', iso, '-C', work, '-s', f'|.*|{f}|', cfg[f]], check=True)
    ser = os.path.join(work, 'serial.sock')
    for f in (ser, mon):
        if os.path.exists(f): os.remove(f)
    fw = ['-drive', 'if=pflash,format=raw,readonly=on,file=/usr/share/edk2/x64/OVMF_CODE.4m.fd',
          '-drive', 'if=pflash,format=raw,file=uefi-vars.fd'] if data['boot'] == 'uefi' else []
    q = subprocess.Popen(['qemu-system-x86_64', '-enable-kvm', '-cpu', 'host', '-m', '2G', '-smp', '2'] + fw +
        ['-drive', 'file=disque.qcow2,if=virtio', '-drive', f"file={cfg['iso']},if=virtio,format=raw,readonly=on", '-kernel', 'kernel', '-initrd', 'initrd',
         '-append', cfg['append'], '-nic', 'user,model=virtio-net-pci', '-display', 'none',
         '-serial', f'unix:{ser},server,nowait', '-monitor', f'unix:{mon},server,nowait'], cwd=work)
    time.sleep(3)
    s = socket.socket(socket.AF_UNIX); s.connect(ser)
    con = Console(open(os.path.join(work, 'serial-live.log'), 'w'), s, s)
    try:
        con.send('\n'); con.wait(r'login:\s*$', 300)
        con.send(cfg['login'] + '\n'); time.sleep(3)
        for st in todo:
            if st['where'] not in ('live', 'chroot'): continue
            if st['id'] == 'scratch-poweroff':
                ok = True
                for c in st['cmds']:
                    if c == 'poweroff': con.send('poweroff\n'); q.wait(300); break
                    if con.run(c) != 0: ok = False; break
                mark(st, ok, '' if ok else f'{c} : échec'); break
            ok, why = True, ''
            for c in st['cmds'] + st['verify']:
                rc = con.run(c)
                if rc: ok, why = False, f'{c.splitlines()[0]} : code {rc}'; break
            mark(st, ok, why)
            if not ok: return
    finally:
        if q.poll() is None: q.kill()

    # ---------- 3. disque ----------
    st = steps[idx['scratch-diskboot']]
    if os.path.exists(mon): os.remove(mon)
    p = subprocess.Popen(['bash', '-c', st['cmds'][0].replace('\\\n', ' ') + f' -display none -monitor unix:{mon},server,nowait'],
                         cwd=work, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, bufsize=0)
    con = Console(open(os.path.join(work, 'serial-disk.log'), 'w'), p.stdout, p.stdin)
    try:
        def login():
            con.wait(r'login:\s*$', 300, answer_prompts=False)
            con.send('root\n'); con.wait(r'(?i)password:\s*$', 30, answer_prompts=False); con.send(PW + '\n'); time.sleep(3)
        login()
        ok, why = True, ''
        for c in st['verify']:
            rc = con.run(c, 120)
            if rc: ok, why = False, f'{c} : code {rc}'; break
        mark(st, ok, why);
        if not ok: return
        after = False
        for st in todo:
            if st['id'] == 'scratch-diskboot': after = True; continue
            if not after or st['where'] != 'systeme' or not st['cmds']: continue
            ok, why = True, ''
            for c in st['cmds'] + st['verify']:
                if c.lstrip().startswith('#'): continue
                if c == 'reboot':  # redémarrage : attendre la console, se reconnecter
                    con.buf = ''; con.send('reboot\n'); login(); continue
                rc = con.run(c)
                if rc: ok, why = False, f'{c.splitlines()[0]} : code {rc}'; break
            extra = {}
            if st['id'] == 'scratch-desktop' and ok:
                time.sleep(20); monitor(mon, f'screendump {work}/ecran-bureau.png -f png')
                extra = dict(screenshot='ecran-bureau.png', visual=True)
            mark(st, ok, why, **extra)
        con.send('poweroff\n'); p.wait(300)
    finally:
        if p.poll() is None: p.kill()

if __name__ == '__main__':
    main()
