
/* ============ PARCOURS : COMMUNS ============ */
const BC=["desktop-environment","compositor"];
const dyn=(arr)=>()=>BASEDEF[G.base]?[]:arr;
const Q_TINKER={t:"Tu veux que tout marche tout de suite, ou tu aimes bricoler ?",o:["Que tout marche tout de suite","J'aime bricoler"],def:0};
const Q_RAM={t:"Combien de mémoire (RAM) a ta machine ?",o:["2 Go ou moins","4 Go","8 Go ou plus"],def:1,skipIf:()=>!!HW.ram,fromHw:()=>HW.ram==="4"?1:2};
const dflt=(u,...ix)=>ix.some(i=>u[i])?" (Choix par défaut : tu n'as pas su répondre.)":"";
const mk=(cat,label,tool,why)=>{const t=byId(tool);return {cat,label,name:t?t.name:tool,tool,why}};
const BASEUPD={alpine:"sixmonth",debian:"stable",arch:"rolling",fedora:"sixmonth",ubuntu:"sixmonth",void:"rolling",gentoo:"rolling",nixos:"sixmonth",opensuse:"rolling",devuan:"stable",lfs:"stable",raspios:"stable",openwrt:"stable",tinycore:"stable",slackware:"stable",rocky:"lts",almalinux:"lts"};
const UPDWHY={rolling:"Toujours les derniers logiciels et correctifs, avec un risque de casse à surveiller.",sixmonth:"Une nouvelle version tous les 6 mois : logiciels récents et étapes claires.",stable:"Versions figées et très prévisibles, avec des correctifs de sécurité.",lts:"Support très long, idéal pour ne pas toucher au système pendant des années."};
function coreBricks(base,gb,why){
  const BD=BASEDEF[base],r=[];
  r.push({cat:"base-distro",label:"Distribution de base",name:BD.name,tool:base,why:gb?"Choisie au départ.":"Recommandée pour ton objectif : "+why});
  r.push(BD.libc==="musl"?{cat:"libc",label:"Bibliothèque C",name:"musl",tool:"musl",why:BD.name+" utilise musl."}:{cat:"libc",label:"Bibliothèque C",name:"glibc",tool:"glibc",why:"La plus compatible avec les logiciels du marché."});
  r.push(BD.init[0]?mk("init","Système d'init",BD.init[0],BD.init[2]):{cat:"init",label:"Système d'init",name:BD.init[1],tool:null,why:BD.init[2]});
  r.push({cat:"package-manager",label:"Gestionnaire de paquets",name:BD.pm[1],tool:BD.pm[0],why:BD.pm[2]+(gb?"":" Il vient avec la base conseillée.")});
  return r;
}
function updBrick(base){const k=BASEUPD[base]||"stable";return mk("update-model","Mises à jour",k,UPDWHY[k])}
function bootBrick(base,dual){
  const sysd=BASEDEF[base].init[0]==="systemd",bios=HW.boot==="bios";
  if(dual||bios)return mk("bootloader","Chargeur d'amorçage","grub",dual?"Peut détecter Windows et proposer un menu au démarrage.":"Ton PC démarre en BIOS : GRUB le gère, pas systemd-boot.");
  return sysd?mk("bootloader","Chargeur d'amorçage","systemd-boot","Très simple et fourni avec systemd."):mk("bootloader","Chargeur d'amorçage","limine","Un seul fichier de configuration, sans dépendre de systemd.");
}
function commonRules(S,a){
  const t=l=>(S.find(x=>x.label===l)||{}).tool,out=[];
  const libc=t("Bibliothèque C"),init=t("Système d'init"),boot=t("Chargeur d'amorçage"),disp=t("Serveur d'affichage"),desk=t("Bureau");
  if(init==="systemd"&&libc==="musl")out.push({id:"systemd-musl",at:["Système d'init","Bibliothèque C"],msg:"systemd est conçu pour glibc (le support musl est récent).",fixes:[{type:"tool",label:"Bibliothèque C",tool:"glibc",text:"Passer à glibc"},{type:"tool",label:"Système d'init",tool:"openrc",text:"Passer à OpenRC"}]});
  if(boot==="systemd-boot"&&init!=="systemd")out.push({id:"sdboot-init",at:["Chargeur d'amorçage","Système d'init"],msg:"systemd-boot est fourni avec systemd.",fixes:[{type:"tool",label:"Chargeur d'amorçage",tool:"limine",text:"Passer à Limine"},{type:"tool",label:"Système d'init",tool:"systemd",text:"Passer à systemd"}]});
  if(boot==="systemd-boot"&&HW.boot==="bios")out.push({id:"sdboot-bios",at:["Chargeur d'amorçage"],msg:"systemd-boot démarre uniquement en UEFI, et ton PC est en BIOS.",fixes:[{type:"tool",label:"Chargeur d'amorçage",tool:"grub",text:"Passer à GRUB"},{type:"tool",label:"Chargeur d'amorçage",tool:"limine",text:"Passer à Limine"}]});
  if(["hyprland","sway","mangowc"].includes(desk)&&disp==="xorg")out.push({id:"wm-xorg",at:["Serveur d'affichage","Bureau"],msg:"Hyprland, Sway et MangoWC fonctionnent uniquement sous Wayland.",fixes:[{type:"tool",label:"Serveur d'affichage",tool:"wayland",text:"Passer à Wayland"},{type:"tool",label:"Bureau",tool:"xfce",text:"Choisir Xfce (X11)"}]});
  if(["i3","openbox"].includes(desk)&&disp==="wayland")out.push({id:"x11wm-wayland",at:["Serveur d'affichage","Bureau"],msg:"i3 et Openbox fonctionnent uniquement sous X11.",fixes:[{type:"tool",label:"Serveur d'affichage",tool:"xorg",text:"Passer à Xorg"},{type:"tool",label:"Bureau",tool:"sway",text:"Choisir Sway (Wayland)"}]});
  return out;
}
const BASEFIX=[{type:"tool",label:"Distribution de base",tool:"debian",text:"Passer à Debian"},{type:"tool",label:"Distribution de base",tool:"fedora",text:"Passer à Fedora"}];
function mkSoft(over){
  const g0=TREES.gaming.software.groups;
  return {groups:g0.map(g=>({name:g.name,funcs:g.funcs.map(f=>Object.assign({},f,{def:over[f.id]||(()=>[])}))}))};
}
const deskOf=S=>(S.find(x=>x.label==="Bureau")||{}).tool;
const dispOf=S=>(S.find(x=>x.label==="Serveur d'affichage")||{}).tool;
const wlWm=d=>["sway","hyprland","mangowc"].includes(d);
const sFiles=S=>{const d=deskOf(S);return [d==="kde-plasma"?"dolphin":d==="gnome"?"nautilus":d==="xfce"?"thunar":d?"yazi":"ranger"]};
const sArch=S=>{const d=deskOf(S);return [d==="kde-plasma"?"ark":(d==="gnome"||d==="xfce")?"file-roller":"7zip"]};
const sTerm=S=>[dispOf(S)==="xorg"?"alacritty":dispOf(S)?"foot":"kitty"];
const sShots=S=>{const d=deskOf(S);return d==="kde-plasma"?["spectacle"]:wlWm(d)?["grim","wl-clipboard"]:d?["flameshot"]:[]};
const PICK={bar:t=>/Barre/.test((t.criteria&&t.criteria.component)||""),launch:t=>/Lanceur/.test((t.criteria&&t.criteria.component)||""),notif:t=>/Notifications|Centre de notifications/.test((t.criteria&&t.criteria.component)||"")};
function shellBricks(desk,x11){
  if(desk.tool==="xfce"||desk.tool==="gnome"||desk.tool==="kde-plasma")return [];
  const w=!x11;
  return [
   Object.assign(mk("desktop-shell","Barre d'état",w?"waybar":"polybar",w?"Barre légère et très répandue pour Wayland.":"Barre classique pour X11."),{pick:PICK.bar}),
   Object.assign(mk("desktop-shell","Lanceur",w?"fuzzel":"rofi",w?"Lanceur d'applications rapide pour Wayland.":"Lanceur et menus très configurables."),{pick:PICK.launch}),
   Object.assign(mk("desktop-shell","Notifications",w?"mako":"dunst",w?"Démon de notifications léger pour Wayland.":"Démon de notifications léger pour X11."),{pick:PICK.notif})];
}

/* ============ PARCOURS : BUREAU LÉGER ============ */
TREES.light={
 questions:[
  Q_RAM,
  {t:"Tu préfères la souris ou le clavier pour piloter ton bureau ?",o:["La souris (bureau classique)","Le clavier (fenêtres rangées automatiquement)"],def:0},
  {t:"Ton PC a-t-il plus de 10 ans ?",o:["Oui","Non"],def:1},
  Q_TINKER
 ],
 resolve(a,u){
  const ram=a[0],kb=a[1]===1,old=a[2]===0,tinker=a[3]===1;
  const gb=BASEDEF[G.base]?G.base:null,base=gb||(tinker?"alpine":"debian");
  const r=coreBricks(base,gb,tinker?"petite, rapide et économe en mémoire.":"stable et très compatible, avec un bureau léger prêt à l'emploi.");
  r.push(mk("kernel","Noyau","linux-lts","Stable et économe : suffisant pour un bureau léger."+dflt(u,0)));
  r.push(bootBrick(base,false));
  r.push(HW.disk==="emmc"?mk("filesystem","Système de fichiers","f2fs","Conçu pour les cartes SD et l'eMMC : réduit l'usure."):mk("filesystem","Système de fichiers","ext4","Simple, léger et très éprouvé."));
  r.push(base==="alpine"?mk("coreutils","Outils de base","busybox","Un seul petit programme : très économe en espace et en mémoire."):mk("coreutils","Outils de base","gnu-coreutils","Toutes les options habituelles, très compatibles."));
  r.push(old?mk("display-server","Serveur d'affichage","xorg","Fonctionne avec les vieux processeurs graphiques et les vieux pilotes."+dflt(u,2)):mk("display-server","Serveur d'affichage","wayland","Moderne et léger, adapté à un PC récent."+dflt(u,2)));
  const desk=!kb?Object.assign(mk("desktop-environment","Bureau","xfce","Bureau complet à la souris, très léger."+(ram===0?" Convient à 2 Go de RAM.":"")+dflt(u,1)),{cats:BC}):
    old?Object.assign(mk("compositor","Bureau","i3","Fenêtres rangées automatiquement, très léger, pour X11."+dflt(u,1,2)),{cats:BC}):
    tinker?Object.assign(mk("compositor","Bureau","mangowc","Léger, au clavier, avec quelques effets."+dflt(u,1,3)),{cats:BC}):
    Object.assign(mk("compositor","Bureau","sway","Léger, au clavier, stable et sans animations."+dflt(u,1,3)),{cats:BC});
  r.push(desk);
  shellBricks(desk,old).forEach(x=>r.push(x));
  r.push(mk("audio","Son","pipewire","Léger et bien pris en charge."));
  r.push(tinker?mk("network","Réseau","iwd","Démon Wi-Fi léger, très économe."+dflt(u,3)):mk("network","Réseau","networkmanager","Simple : Wi-Fi, câble et VPN avec une applet."+dflt(u,3)));
  r.push(updBrick(base));
  return r;
 },
 rules(S,a){
  const out=commonRules(S,a);
  const desk=deskOf(S);
  if(["kde-plasma","gnome"].includes(desk)&&a[0]===0)out.push({id:"heavy-de",at:["Bureau"],msg:"Ce bureau est trop lourd pour 2 Go de RAM ou moins.",fixes:[{type:"tool",label:"Bureau",tool:"xfce",text:"Choisir Xfce"},{type:"tool",label:"Bureau",tool:"sway",text:"Choisir Sway"}]});
  return out;
 },
 software:mkSoft({
  web:()=>["firefox"],passwords:()=>["keepassxc"],monitor:()=>["htop"],video:()=>["mpv"],ssh:()=>["openssh"],shell:()=>["bash"],
  files:S=>sFiles(S),archives:S=>sArch(S),terminal:S=>sTerm(S),shots:S=>sShots(S),
  code:(S,a)=>a[3]===1?["neovim"]:[]
 }),
 bricks:{"Distribution de base":dyn([3]),"Gestionnaire de paquets":dyn([3]),"Noyau":[0],"Système de fichiers":[0],"Bibliothèque C":[3],"Système d'init":[3],"Chargeur d'amorçage":[3],"Outils de base":[3],"Serveur d'affichage":[2],"Bureau":[1,2,3],"Barre d'état":[1,2,3],"Lanceur":[1,2,3],"Notifications":[1,2,3],"Son":[2],"Réseau":[3],"Mises à jour":[3]}
};

/* ============ PARCOURS : SÉCURISÉE / DURCIE ============ */
TREES.secure={
 questions:[
  {t:"Ton ordinateur peut-il être volé ou perdu ?",o:["Oui (portable, déplacements)","Non"],def:0},
  {t:"Tu lances souvent des applications téléchargées ou tu ouvres des sites inconnus ?",o:["Oui","Non, mon usage est maîtrisé"],def:0},
  {t:"Tu acceptes que certains logiciels ne marchent plus pour gagner en sécurité ?",o:["Oui, la sécurité d'abord","Non, je veux un équilibre"],def:1},
  {t:"Tu es à l'aise pour configurer toi-même des règles de sécurité ?",o:["Oui","Non"],def:1},
  {t:"Tu as besoin de jeux Windows ou de logiciels propriétaires ?",o:["Oui","Non"],def:1}
 ],
 resolve(a,u){
  const theft=a[0]===0,untrusted=a[1]===0,strict=a[2]===0,adept=a[3]===0,prop=a[4]===0;
  const gb=BASEDEF[G.base]?G.base:null,base=gb||(strict?(prop?"fedora":"alpine"):"debian");
  const r=coreBricks(base,gb,strict?(prop?"SELinux par défaut et glibc pour les logiciels propriétaires.":"minuscule, compilée avec des protections, avec peu de code à attaquer."):"stable, avec AppArmor et des correctifs de sécurité réguliers.");
  r.push(base==="arch"&&strict?mk("kernel","Noyau","linux-hardened","Options de durcissement activées par défaut."+dflt(u,2)):mk("kernel","Noyau","linux-lts","Stable, avec des correctifs de sécurité longtemps."+dflt(u,2)));
  r.push(bootBrick(base,false));
  r.push(strict?mk("filesystem","Système de fichiers","ext4","Simple et très éprouvé : moins de code, moins de surprises."+dflt(u,2)):mk("filesystem","Système de fichiers","btrfs","Instantanés pour revenir en arrière après un incident."+dflt(u,2)));
  r.push(base==="alpine"?mk("coreutils","Outils de base","busybox","Très petit : peu de code à auditer."):mk("coreutils","Outils de base","gnu-coreutils","Complets et très compatibles."));
  r.push(mk("display-server","Serveur d'affichage","wayland","Les applications sont isolées entre elles : un programme ne peut pas espionner les autres, contrairement à X11."));
  const desk=strict?Object.assign(mk("compositor","Bureau","sway","Petit et simple : peu de surface d'attaque."+dflt(u,2)),{cats:BC}):Object.assign(mk("desktop-environment","Bureau","gnome","Bureau Wayland natif, simple et adapté aux applications isolées."+dflt(u,2)),{cats:BC});
  r.push(desk);
  shellBricks(desk,false).forEach(x=>r.push(x));
  r.push(mk("audio","Son","pipewire","Gère aussi les accès au micro et à l'écran par portails."));
  r.push(strict&&base==="alpine"?mk("network","Réseau","iwd","Léger et sans services inutiles."+dflt(u,2)):mk("network","Réseau","networkmanager","Complet, avec VPN et Wi-Fi."+dflt(u,2)));
  r.push(strict||adept?mk("firewall","Pare-feu","nftables","Standard moderne du noyau, règles précises."+dflt(u,2,3)):mk("firewall","Pare-feu","ufw","Simple : quelques commandes pour bloquer l'entrant."+dflt(u,2,3)));
  r.push(base==="fedora"||(strict&&adept)?mk("access-control","Contrôle d'accès","selinux","Étiquettes sur tous les fichiers : le plus fin, mais le plus difficile."+dflt(u,2,3)):mk("access-control","Contrôle d'accès","apparmor","Profils par chemins : plus simple et déjà prêt pour beaucoup de logiciels."+dflt(u,2,3)));
  r.push(theft?mk("disk-encryption","Chiffrement du disque","luks","Indispensable si l'appareil peut être volé : sans mot de passe, le disque est illisible."+dflt(u,0)):mk("disk-encryption","Chiffrement du disque","fscrypt","Chiffre seulement les dossiers sensibles, sans couche supplémentaire."+dflt(u,0)));
  r.push(strict?mk("kernel-hardening","Durcissement du noyau","kspp-config","Options de compilation recommandées par le projet KSPP."+dflt(u,2)):mk("kernel-hardening","Durcissement du noyau","sysctl-hardening","Réglages faciles et peu risqués."+dflt(u,2)));
  r.push(untrusted?mk("sandbox","Isolation des applications","flatpak","Chaque application tourne avec ses propres permissions."+dflt(u,1)):mk("sandbox","Isolation des applications","bubblewrap","Léger : isole à la demande les programmes sensibles."+dflt(u,1)));
  r.push(base==="fedora"?mk("system-image","Modèle d'image","ostree","Le système est en lecture seule et se met à jour d'un bloc : plus difficile à altérer."):mk("system-image","Modèle d'image","sys-classic","Système classique, simple à entretenir."));
  r.push(updBrick(base));
  return r;
 },
 rules(S,a){
  const out=commonRules(S,a);
  const t=l=>(S.find(x=>x.label===l)||{}).tool;
  const base=t("Distribution de base"),libc=t("Bibliothèque C");
  const muslBase=BASEDEF[base]&&BASEDEF[base].libc==="musl";
  if(t("Contrôle d'accès")==="selinux"&&base==="alpine")out.push({id:"selinux-alpine",at:["Contrôle d'accès"],msg:"Alpine n'a pas de politique SELinux complète (seulement dans testing).",fixes:[{type:"tool",label:"Contrôle d'accès",tool:"apparmor",text:"Choisir AppArmor"},{type:"tool",label:"Distribution de base",tool:"fedora",text:"Passer à Fedora"}]});
  if(libc==="musl"&&a[4]===0){const f=muslBase?BASEFIX.slice():[{type:"tool",label:"Bibliothèque C",tool:"glibc",text:"Choisir glibc"}];f.push({type:"answer",q:4,k:1,text:"Je n'ai pas besoin de logiciels propriétaires"});out.push({id:"musl-prop",at:["Distribution de base","Bibliothèque C"],msg:"Les logiciels propriétaires et les jeux demandent glibc, pas musl.",fixes:f})}
  if(a[0]===0&&HW.boot==="bios")out.push({id:"secureboot-bios",at:["Chargeur d'amorçage"],msg:"Ton PC démarre en BIOS : le démarrage sécurisé (Secure Boot) n'existe pas, donc la chaîne de démarrage n'est pas protégée.",fixes:[]});
  return out;
 },
 software:mkSoft({
  web:()=>["firefox"],passwords:()=>["keepassxc"],vpn:()=>["wireguard"],fenc:()=>["age"],audit:()=>["lynis","clamav"],backup:()=>["restic"],perso:()=>["signal"],
  monitor:()=>["htop"],ssh:()=>["openssh"],shell:()=>["bash"],mail:()=>["thunderbird"],
  files:S=>sFiles(S),archives:S=>sArch(S),terminal:S=>sTerm(S),shots:S=>sShots(S)
 }),
 bricks:{"Distribution de base":dyn([2,4]),"Gestionnaire de paquets":dyn([2,4]),"Bibliothèque C":[2,4],"Système d'init":[2,4],"Noyau":[2],"Chargeur d'amorçage":[2,4],"Système de fichiers":[2],"Outils de base":[2,4],"Serveur d'affichage":[0],"Bureau":[2],"Barre d'état":[2],"Lanceur":[2],"Notifications":[2],"Son":[0],"Réseau":[2],"Pare-feu":[2,3],"Contrôle d'accès":[2,3,4],"Chiffrement du disque":[0],"Durcissement du noyau":[2],"Isolation des applications":[1],"Modèle d'image":[2,4],"Mises à jour":[2,4]}
};

/* ============ PARCOURS : SERVEUR / CONTENEURS ============ */
TREES.server={
 questions:[
  {t:"Que veux-tu faire tourner ?",o:["Des conteneurs (Docker, Podman)","Des services classiques (web, fichiers, base de données)","Des machines virtuelles"],def:1},
  {t:"Le serveur doit-il rester stable pendant des années ?",o:["Oui","Non, des mises à jour fréquentes me vont"],def:0},
  Q_RAM,
  {t:"Veux-tu pouvoir revenir en arrière après une mise à jour ratée ?",o:["Oui","Non"],def:0},
  {t:"Un écran et un bureau graphique sont-ils nécessaires sur le serveur ?",o:["Non, j'administre par SSH","Oui"],def:0},
  Q_TINKER
 ],
 resolve(a,u){
  const cont=a[0]===0,vm=a[0]===2,stable=a[1]===0,ram=a[2],rb=a[3]===0,gui=a[4]===1,tinker=a[5]===1;
  const gb=BASEDEF[G.base]?G.base:null,base=gb||(stable?(tinker&&cont?"alpine":"debian"):"fedora");
  const r=coreBricks(base,gb,stable?(base==="alpine"?"minuscule et rapide à démarrer, idéale pour héberger des conteneurs.":"très stable, avec un énorme choix de logiciels et un support long."):"récente, avec des versions fréquentes et SELinux par défaut.");
  r.push(mk("kernel","Noyau","linux-lts","Stable et suivi longtemps : le bon choix pour un serveur."));
  r.push(bootBrick(base,false));
  r.push(rb?(ram===2&&tinker?mk("filesystem","Système de fichiers","zfs","Instantanés, sommes de contrôle et chiffrement natif. Demande de la mémoire."+dflt(u,2,3)):mk("filesystem","Système de fichiers","btrfs","Instantanés pour revenir en arrière après une mise à jour ratée."+dflt(u,3))):mk("filesystem","Système de fichiers","ext4","Simple et très éprouvé."+dflt(u,3)));
  r.push(base==="alpine"?mk("coreutils","Outils de base","busybox","Très petit : idéal en conteneur."):mk("coreutils","Outils de base","gnu-coreutils","Complets et très compatibles."));
  r.push(BASEDEF[base].init[0]==="systemd"?mk("network","Réseau","systemd-networkd","Configuration par fichiers, intégrée à systemd."):base==="alpine"?mk("network","Réseau","ifupdown-ng","Un fichier simple : le choix d'Alpine."):mk("network","Réseau","networkmanager","Gestion complète et disponible partout."));
  r.push(tinker?mk("firewall","Pare-feu","nftables","Standard moderne du noyau, règles précises."+dflt(u,5)):mk("firewall","Pare-feu","ufw","Simple : quelques commandes pour autoriser SSH et les services."+dflt(u,5)));
  r.push(["fedora","rocky","almalinux","opensuse"].includes(base)?mk("access-control","Contrôle d'accès","selinux","Actif par défaut sur cette base : contient les services compromis."):mk("access-control","Contrôle d'accès","apparmor","Profils par chemins, simples à activer."));
  r.push(mk("disk-encryption","Chiffrement du disque","luks","Protège les données si le serveur est volé. Le déverrouillage à distance demande un petit serveur SSH dans l'initramfs."));
  r.push(mk("kernel-hardening","Durcissement du noyau","sysctl-hardening","Réglages simples et peu risqués pour un serveur."));
  if(cont)r.push(mk("containers","Conteneurs","podman","Sans démon et sans droits administrateur, compatible avec les commandes Docker."+dflt(u,0)));
  if(vm)r.push(mk("vm","Machines virtuelles",gui?"virt-manager":"qemu",gui?"Interface graphique pour gérer les machines virtuelles."+dflt(u,0,4):"QEMU/KVM : machines virtuelles rapides, pilotables en ligne de commande."+dflt(u,0,4)));
  if(gui){r.push(mk("display-server","Serveur d'affichage","xorg","Compatible avec l'affichage à distance (VNC, RDP)."));r.push(Object.assign(mk("desktop-environment","Bureau","xfce","Bureau léger pour un serveur."),{cats:BC}))}
  r.push(rb&&base==="fedora"?mk("system-image","Modèle d'image","ostree","Mises à jour atomiques avec retour en arrière."+dflt(u,3)):mk("system-image","Modèle d'image","sys-classic","Système classique ; le retour en arrière passe par les instantanés du système de fichiers."+dflt(u,3)));
  r.push(updBrick(base));
  return r;
 },
 rules(S,a){
  const out=commonRules(S,a);
  const t=l=>(S.find(x=>x.label===l)||{}).tool;
  const base=t("Distribution de base");
  if(t("Système de fichiers")==="zfs"&&a[2]===0)out.push({id:"zfs-ram",at:["Système de fichiers"],msg:"ZFS demande beaucoup de mémoire : 2 Go ou moins ne suffisent pas.",fixes:[{type:"tool",label:"Système de fichiers",tool:"btrfs",text:"Choisir Btrfs"},{type:"tool",label:"Système de fichiers",tool:"ext4",text:"Choisir ext4"}]});
  if(["arch","void","gentoo"].includes(base)&&a[1]===0)out.push({id:"rolling-stable",at:["Distribution de base"],msg:"Cette base est en continu : les mises à jour fréquentes ne conviennent pas à un serveur qui doit rester stable.",fixes:[{type:"tool",label:"Distribution de base",tool:"debian",text:"Passer à Debian"},{type:"tool",label:"Distribution de base",tool:"rocky",text:"Passer à Rocky Linux"},{type:"answer",q:1,k:1,text:"Les mises à jour fréquentes me vont"}]});
  if(t("Contrôle d'accès")==="selinux"&&base==="alpine")out.push({id:"selinux-alpine",at:["Contrôle d'accès"],msg:"Alpine n'a pas de politique SELinux complète (seulement dans testing).",fixes:[{type:"tool",label:"Contrôle d'accès",tool:"apparmor",text:"Choisir AppArmor"}]});
  if(a[0]===2&&a[2]===0)out.push({id:"vm-ram",at:["Machines virtuelles"],msg:"2 Go de RAM ou moins laissent très peu de place aux machines virtuelles.",fixes:[{type:"answer",q:0,k:0,text:"Je préfère des conteneurs (plus légers)"}]});
  return out;
 },
 software:mkSoft({
  backup:()=>["restic"],monitor:()=>["htop"],ssh:()=>["openssh"],shell:()=>["bash"],vcs:()=>["git"],
  code:(S,a)=>a[5]===1?["neovim"]:[],net:()=>["tcpdump"],audit:()=>["lynis"],vpn:()=>["wireguard"],
  cont:S=>{const x=S.find(y=>y.label==="Conteneurs");return x&&x.tool?[x.tool]:[]},
  vm:S=>{const x=S.find(y=>y.label==="Machines virtuelles");return x&&x.tool?[x.tool]:[]},
  archives:()=>["7zip"]
 }),
 bricks:{"Distribution de base":dyn([0,1,5]),"Gestionnaire de paquets":dyn([0,1,5]),"Bibliothèque C":[0,1,5],"Système d'init":[0,1,5],"Noyau":[0],"Chargeur d'amorçage":[0,1,5],"Système de fichiers":[2,3],"Outils de base":[0,1,5],"Réseau":[0,1,5],"Pare-feu":[5],"Contrôle d'accès":[0,1,5],"Chiffrement du disque":[0],"Durcissement du noyau":[0],"Conteneurs":[0],"Machines virtuelles":[0,4],"Serveur d'affichage":[4],"Bureau":[4],"Modèle d'image":[3],"Mises à jour":[0,1,5]}
};

/* ============ PARCOURS : BUREAUTIQUE ============ */
TREES.office={
 questions:[
  {t:"Tu échanges beaucoup de documents avec des personnes qui utilisent Microsoft Office ?",o:["Oui, tout le temps","Un peu","Non"],def:1},
  {t:"Tu fais surtout du texte, ou aussi des tableaux et des présentations ?",o:["Surtout du texte","Texte, tableaux et présentations"],def:1},
  {t:"Quel bureau préfères-tu ?",o:["Familier, comme Windows (KDE Plasma)","Simple et épuré (GNOME)","Léger (Xfce)"],def:0},
  {t:"Tu travailles à plusieurs sur les mêmes documents ?",o:["Oui","Non"],def:1},
  {t:"Tu veux des logiciels récents ou un système très stable ?",o:["Récents","Très stable"],def:1}
 ],
 resolve(a,u){
  const de=a[2],fresh=a[4]===0;
  const gb=BASEDEF[G.base]?G.base:null,base=gb||(fresh?"fedora":"debian");
  const r=coreBricks(base,gb,fresh?"récente, avec les derniers logiciels et un bureau moderne.":"très stable : les mises à jour ne bousculent pas ton travail.");
  r.push(fresh?mk("kernel","Noyau","linux-mainline","Meilleur support du matériel récent."+dflt(u,4)):mk("kernel","Noyau","linux-lts","Stable : le bureau ne change pas sous tes pieds."+dflt(u,4)));
  r.push(bootBrick(base,false));
  r.push(mk("filesystem","Système de fichiers","ext4","Simple et très éprouvé."));
  r.push(base==="alpine"?mk("coreutils","Outils de base","busybox","Très petit."):mk("coreutils","Outils de base","gnu-coreutils","Complets et très compatibles."));
  r.push(de===2?mk("display-server","Serveur d'affichage","xorg","Xfce fonctionne encore le mieux sous X11."+dflt(u,2)):mk("display-server","Serveur d'affichage","wayland","Standard actuel des bureaux KDE et GNOME."+dflt(u,2)));
  r.push(de===0?Object.assign(mk("desktop-environment","Bureau","kde-plasma","Familier pour qui vient de Windows : barre des tâches, menu et réglages complets."+dflt(u,2)),{cats:BC}):de===1?Object.assign(mk("desktop-environment","Bureau","gnome","Simple et épuré, sans distraction."+dflt(u,2)),{cats:BC}):Object.assign(mk("desktop-environment","Bureau","xfce","Léger et classique, très stable."+dflt(u,2)),{cats:BC}));
  r.push(mk("audio","Son","pipewire","Bien pris en charge, avec le partage d'écran en visioconférence."));
  r.push(mk("network","Réseau","networkmanager","Simple : Wi-Fi, câble et VPN avec une applet."));
  r.push(mk("firewall","Pare-feu","ufw","Simple : bloque l'entrant sans réglage."));
  r.push(mk("disk-encryption","Chiffrement du disque","luks","Protège tes documents si l'ordinateur est perdu ou volé."));
  r.push(updBrick(base));
  return r;
 },
 rules(S,a){
  const out=commonRules(S,a);
  const t=l=>(S.find(x=>x.label===l)||{}).tool;
  if(t("Bureau")==="xfce"&&t("Serveur d'affichage")==="wayland")out.push({id:"xfce-wayland",at:["Serveur d'affichage","Bureau"],msg:"Xfce ne fonctionne pas encore complètement sous Wayland.",fixes:[{type:"tool",label:"Serveur d'affichage",tool:"xorg",text:"Passer à Xorg"},{type:"tool",label:"Bureau",tool:"kde-plasma",text:"Choisir KDE Plasma"}]});
  return out;
 },
 software:mkSoft({
  web:()=>["firefox"],
  write:(S,a)=>a[0]===0?["onlyoffice"]:["lo-writer"],
  calc:(S,a)=>a[1]===0?[]:a[0]===0?["onlyoffice"]:["lo-calc"],
  slides:(S,a)=>a[1]===0?[]:a[0]===0?["onlyoffice"]:["lo-impress"],
  pdf:S=>[deskOf(S)==="kde-plasma"?"okular":"evince"],
  mail:()=>["thunderbird"],passwords:()=>["keepassxc"],backup:()=>["restic"],video:()=>["vlc"],
  sync:(S,a)=>a[3]===0?["nextcloud-client"]:[],
  files:S=>sFiles(S),archives:S=>sArch(S),shots:S=>sShots(S),
  notes:()=>["joplin"]
 }),
 bricks:{"Distribution de base":dyn([4]),"Gestionnaire de paquets":dyn([4]),"Bibliothèque C":[4],"Système d'init":[4],"Noyau":[4],"Chargeur d'amorçage":[4],"Système de fichiers":[4],"Outils de base":[4],"Serveur d'affichage":[2],"Bureau":[2],"Son":[2],"Réseau":[4],"Pare-feu":[4],"Chiffrement du disque":[4],"Mises à jour":[4]}
};
OBJECTIVES.forEach(o=>{if(TREES[o.id])o.ready=true});
