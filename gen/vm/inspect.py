# Diagnostic : démarre le disque installé d'un test, se connecte en root par la console série,
# exécute des commandes et affiche leur sortie, puis prend une capture d'écran et éteint.
# Usage : python3 -I gen/vm/inspect.py <dossier de travail> 'cmd1' 'cmd2' ...
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from run_vm import Console, monitor, PW
work = os.path.abspath(sys.argv[1]); cmds = sys.argv[2:]
steps = json.load(open(os.path.join(work, 'steps.json')))['steps']
boot = next(s for s in steps if s['id'] == 'scratch-diskboot')['cmds'][0]
mon = os.path.join(work, 'mon.sock')
if os.path.exists(mon): os.remove(mon)
p = subprocess.Popen(['bash', '-c', boot.replace('\\\n', ' ') + f' -display none -monitor unix:{mon},server,nowait'],
                     cwd=work, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, bufsize=0)
log = open(os.path.join(work, 'serial-inspect.log'), 'w')
con = Console(log, p.stdout, p.stdin)
try:
    con.wait(r'login:\s*$', 300, answer_prompts=False)
    con.send('root\n'); con.wait(r'(?i)password:\s*$', 30, answer_prompts=False); con.send(PW + '\n'); time.sleep(3)
    for c in cmds:
        start = log.tell(); rc = con.run(c, 600)
        print(f'### {c}  (code {rc})', flush=True)
    monitor(mon, f'screendump {work}/ecran-inspect.png -f png')
    con.send('poweroff\n'); p.wait(120)
finally:
    if p.poll() is None: p.kill()
print(open(os.path.join(work, 'serial-inspect.log')).read()[-6000:])
