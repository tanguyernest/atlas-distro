
/* ============ GÉNÉRATEUR DE TUTORIEL (.md) ============ */
const FAMILY={alpine:"apk",openwrt:"apk",debian:"apt",ubuntu:"apt",devuan:"apt",raspios:"apt",arch:"pacman",fedora:"dnf",rocky:"dnf",almalinux:"dnf",opensuse:"zypper",void:"xbps",gentoo:"emerge",nixos:"nix",tinycore:"tce",slackware:"slackpkg",lfs:"none"};
const INSTALL={apk:"apk add",apt:"apt install -y",pacman:"pacman -S --needed",dnf:"dnf install -y",zypper:"zypper install -y",xbps:"xbps-install -S",emerge:"emerge --ask",nix:"nix profile install",tce:"tce-load -wi",slackpkg:"slackpkg install"};
const QUERY={apk:p=>`apk info -e ${p}`,apt:p=>`dpkg -s ${p}`,pacman:p=>`pacman -Q ${p}`,dnf:p=>`rpm -q ${p}`,zypper:p=>`rpm -q ${p}`,xbps:p=>`xbps-query ${p}`,emerge:p=>`qlist -I ${p}`};
const OVKEY={debian:"debian",ubuntu:"debian",devuan:"debian",raspios:"debian",arch:"arch",fedora:"fedora",rocky:"fedora",almalinux:"fedora"};
const ALPINE_STATUS=__ALPINE_STATUS__;
/* Paquets système (alpine = noms vérifiés ; autres familles = à vérifier). null = rien à installer séparément. */
const SYSPKG={
 "linux-lts":{apk:["linux-lts"],apt:["linux-image-amd64"],pacman:["linux-lts"],dnf:null},
 "linux-hardened":{pacman:["linux-hardened"]},
 "linux-mainline":{pacman:["linux"],dnf:["kernel"],apt:["linux-image-amd64"]},
 "grub":{apk:["grub","grub-efi"],apt:["grub-efi-amd64"],pacman:["grub","efibootmgr"],dnf:["grub2-efi-x64","grub2-tools"]},
 "limine":{apk:["limine"],pacman:["limine"]},
 "systemd-boot":{apt:["systemd-boot"],pacman:null,dnf:["systemd-boot-unsigned"]},
 "kde-plasma":{apk:["plasma-desktop"],apt:["kde-plasma-desktop"],pacman:["plasma-meta"],dnf:["group:kde-desktop-environment"]},
 "gnome":{apk:["gnome"],apt:["gnome"],pacman:["gnome"],dnf:["group:gnome-desktop"]},
 "xfce":{apk:["xfce4"],apt:["xfce4"],pacman:["xfce4"],dnf:["group:xfce-desktop-environment"]},
 "sway":{apk:["sway"],apt:["sway"],pacman:["sway"],dnf:["sway"]},
 "hyprland":{apk:["hyprland"],pacman:["hyprland"]},
 "i3":{apk:["i3wm"],apt:["i3"],pacman:["i3-wm"],dnf:["i3"]},
 "openbox":{apk:["openbox"],apt:["openbox"],pacman:["openbox"],dnf:["openbox"]},
 "xorg":{apk:["xorg-server"],apt:["xorg"],pacman:["xorg-server"],dnf:["xorg-x11-server-Xorg"]},
 "wayland":null,
 "pipewire":{apk:["pipewire","wireplumber","pipewire-pulse","pipewire-alsa"],apt:["pipewire","pipewire-pulse","wireplumber"],pacman:["pipewire","pipewire-pulse","wireplumber"],dnf:["pipewire","pipewire-pulseaudio","wireplumber"]},
 "networkmanager":{apk:["networkmanager"],apt:["network-manager"],pacman:["networkmanager"],dnf:["NetworkManager"]},
 "iwd":{apk:["iwd"],apt:["iwd"],pacman:["iwd"],dnf:["iwd"]},
 "nftables":{apk:["nftables"],apt:["nftables"],pacman:["nftables"],dnf:["nftables"]},
 "ufw":{apk:["ufw"],apt:["ufw"],pacman:["ufw"],dnf:["ufw"]},
 "firewalld":{apk:["firewalld"],apt:["firewalld"],pacman:["firewalld"],dnf:["firewalld"]},
 "apparmor":{apk:["apparmor"],apt:["apparmor","apparmor-utils"],pacman:["apparmor"],dnf:null},
 "luks":{apk:["cryptsetup"],apt:["cryptsetup"],pacman:["cryptsetup"],dnf:["cryptsetup"]},
 "btrfs":{apk:["btrfs-progs"],apt:["btrfs-progs"],pacman:["btrfs-progs"],dnf:["btrfs-progs"]},
 "ext4":{apk:["e2fsprogs"],apt:["e2fsprogs"],pacman:["e2fsprogs"],dnf:["e2fsprogs"]},
 "xfs":{apk:["xfsprogs"],apt:["xfsprogs"],pacman:["xfsprogs"],dnf:["xfsprogs"]},
 "f2fs":{apk:["f2fs-tools"],apt:["f2fs-tools"],pacman:["f2fs-tools"],dnf:["f2fs-tools"]},
 "flatpak":{apk:["flatpak"],apt:["flatpak"],pacman:["flatpak"],dnf:["flatpak"]},
 "bubblewrap":{apk:["bubblewrap"],apt:["bubblewrap"],pacman:["bubblewrap"],dnf:["bubblewrap"]},
 "podman":{apk:["podman"],apt:["podman"],pacman:["podman"],dnf:["podman"]},
 "docker":{apk:["docker"],apt:["docker.io"],pacman:["docker"],dnf:["moby-engine"]}
};
const SERVICE={
 networkmanager:{n:"NetworkManager",openrc:"networkmanager"},iwd:{n:"iwd"},nftables:{n:"nftables"},ufw:{n:"ufw"},firewalld:{n:"firewalld"},
 apparmor:{n:"apparmor"},docker:{n:"docker"},openssh:{n:"sshd"},tailscale:{n:"tailscaled",openrc:"tailscale"},"virt-manager":{n:"libvirtd"}
};
const INIT_ENABLE={
 openrc:(s)=>[`rc-update add ${s.openrc||s.n.toLowerCase()} default`,`rc-service ${s.openrc||s.n.toLowerCase()} start`],
 systemd:(s)=>[`systemctl enable --now ${s.n}`],
 runit:(s)=>[`ln -s /etc/sv/${s.n} /var/service/`]
};
const INSTALL_DOC={
 alpine:["Guide d'installation Alpine","https://wiki.alpinelinux.org/wiki/Installation"],
 debian:["Manuel d'installation Debian","https://www.debian.org/releases/stable/installmanual"],
 ubuntu:["Installer Ubuntu Desktop","https://ubuntu.com/tutorials/install-ubuntu-desktop"],
 arch:["Guide d'installation Arch","https://wiki.archlinux.org/title/Installation_guide"],
 fedora:["Guide d'installation Fedora","https://docs.fedoraproject.org/en-US/fedora/latest/install-guide/"],
 devuan:["Documentation Devuan","https://www.devuan.org/os/documentation"],
 void:["Installer Void","https://docs.voidlinux.org/installation/index.html"],
 gentoo:["Manuel Gentoo","https://wiki.gentoo.org/wiki/Handbook:Main_Page"],
 nixos:["Manuel NixOS","https://nixos.org/manual/nixos/stable/#sec-installation"],
 opensuse:["Installer openSUSE","https://doc.opensuse.org/documentation/leap/startup/html/book-startup/"],
 lfs:["Livre Linux From Scratch","https://www.linuxfromscratch.org/lfs/read.html"],
 raspios:["Installer Raspberry Pi OS","https://www.raspberrypi.com/documentation/computers/getting-started.html"],
 openwrt:["Installer OpenWrt","https://openwrt.org/docs/guide-quick-start/start"],
 tinycore:["Démarrer avec Tiny Core","http://tinycorelinux.net/intro.html"],
 slackware:["Installer Slackware","https://docs.slackware.com/slackware:install"],
 rocky:["Installer Rocky Linux","https://docs.rockylinux.org/guides/installation/"],
 almalinux:["Installer AlmaLinux","https://wiki.almalinux.org/documentation/installation-guide.html"]
};
const ST={
 ok:"🟡 Nom du paquet vérifié dans le dépôt, commande non testée",
 check:"⚠️ À vérifier",
 manual:"🔧 Étape manuelle"
};
function famOf(base){return FAMILY[base]||"none"}
function sysPkgs(tid,base){
  if(!(tid in SYSPKG))return undefined;
  const e=SYSPKG[tid];
  if(e===null)return null;
  const f=famOf(base);
  const v=f==="apk"?e.apk:e[f];
  return v===undefined?"unknown":v;
}
function ovName(n,base){const k=OVKEY[base];const o=PKG[n];return o&&k&&o[k]!==undefined?o[k]:n}
function toolPkgs(t,base){
  const f=famOf(base);
  const sp=sysPkgs(t.id,base);
  const res={pkgs:[],flatpak:null,compile:null,nothing:false,unknownFam:false,none:false};
  if(sp===null){res.nothing=true;return res}
  if(sp==="unknown"){res.unknownFam=true;return res}
  if(sp!==undefined){res.pkgs=sp;return res}
  const apkNames=[],aptNames=[];let fp=null,comp=null;
  (t.implement||[]).forEach(st=>{
    if(/^Installer \(Alpine/.test(st.title))st.commands.forEach(c=>{const m=/^apk add (.+)$/.exec(c);if(m)m[1].split(/\s+/).forEach(n=>apkNames.push(n))});
    if(/^Installer \(Debian\)/.test(st.title))st.commands.forEach(c=>{const m=/^apt install (.+)$/.exec(c);if(m)m[1].split(/\s+/).forEach(n=>aptNames.push(n))});
    if(/Flatpak/.test(st.title))st.commands.forEach(c=>{const m=/flatpak install flathub (\S+)/.exec(c);if(m)fp=m[1]});
    if(/^Compiler/.test(st.title))comp=st.commands;
  });
  if(f==="apk"&&apkNames.length)res.pkgs=apkNames;
  else if(f==="apt"&&aptNames.length)res.pkgs=aptNames;
  else if(apkNames.length){const out=[];apkNames.forEach(n=>ovName(n,base).split(/\s+/).filter(Boolean).forEach(x=>out.push(x)));res.pkgs=out}
  if(fp)res.flatpak=fp;
  if(comp)res.compile=comp;
  if(!res.pkgs.length&&!fp&&!comp)res.none=true;
  return res;
}
function instCmd(base,pkgs){
  const f=famOf(base);const groups=pkgs.filter(p=>p.startsWith("group:")),plain=pkgs.filter(p=>!p.startsWith("group:"));
  const out=[];
  if(plain.length)out.push(`${INSTALL[f]||"# gestionnaire de paquets inconnu :"} ${f==="nix"?plain.map(p=>"nixpkgs#"+p).join(" "):plain.join(" ")}`);
  groups.forEach(g=>out.push(`dnf group install -y ${g.slice(6)}`));
  return out;
}
function verifyCmds(base,pkgs){
  const f=famOf(base);const q=QUERY[f];if(!q)return [];
  return pkgs.filter(p=>!p.startsWith("group:")).slice(0,6).map(p=>q(p));
}
function pkgState(base,pkgs){
  // 🟡 seulement pour Alpine, quand chaque nom existe dans le dépôt
  if(famOf(base)==="apk"&&base==="alpine"&&pkgs.length&&pkgs.every(p=>{const s=ALPINE_STATUS[p];return s&&s!=="testing"&&s!=="?"}))return "ok";
  return "check";
}
function mdEscape(s){return String(s).replace(/\|/g,"\\|")}
function buildTutorial(){
  const tree=TREES[G.obj];if(!tree)return "";
  const eff=effOf(tree),unk=tree.questions.map((q,k)=>G.ans[k]<0);
  const raw=tree.resolve(eff,unk),stack=applyManual(raw),issues=tree.rules(stack,eff).filter(x=>!G.keep[x.id]);
  const keptIssues=tree.rules(stack,eff).filter(x=>G.keep[x.id]);
  const sel=swSelection(tree,stack,eff);
  const baseId=(stack.find(x=>x.label==="Distribution de base")||{}).tool||"debian";
  const BD=BASEDEF[baseId],fam=famOf(baseId);
  const obj=OBJECTIVES.find(o=>o.id===G.obj);
  const initId=(stack.find(x=>x.label==="Système d'init")||{}).tool;
  const steps=[];let needFlatpak=false;const allPkgs=[];
  const addPkgs=a=>a.forEach(p=>{if(!allPkgs.includes(p)&&!p.startsWith("group:"))allPkgs.push(p)});
  const date=new Date().toISOString().slice(0,10);
  const L=[];
  const P=s=>L.push(s);

  // ---------- étapes ----------
  steps.push({title:"Préparer",state:"manual",why:"Éviter de perdre des données et préparer le support d'installation.",
    notes:["Sauvegarde tes données importantes : une installation peut effacer le disque.","Télécharge l'image d'installation de "+BD.name+" depuis le site officiel et vérifie sa somme de contrôle.","Prépare une clé USB avec un outil adapté à ton système (balenaEtcher, Ventoy ou `dd` avec le bon périphérique)."],
    verify:["lsblk  # identifie bien la clé USB avant de l'écrire"]});
  const doc=INSTALL_DOC[baseId];
  const choices=[];
  const sv=l=>(stack.find(x=>x.label===l)||{});
  if(sv("Chargeur d'amorçage").name)choices.push("Chargeur d'amorçage : "+sv("Chargeur d'amorçage").name);
  if(sv("Système de fichiers").name)choices.push("Système de fichiers : "+sv("Système de fichiers").name);
  if(sv("Chiffrement du disque").name)choices.push("Chiffrement du disque : "+sv("Chiffrement du disque").name);
  if(HW.boot)choices.push("Mode de démarrage de ta machine : "+hwLabel("boot",HW.boot));
  steps.push({title:"Installer la base "+BD.name,state:"manual",why:"La base impose "+BD.pm[1]+", la bibliothèque "+BD.libc+" et l'init "+BD.init[1]+".",
    notes:["Suis le guide officiel pour l'installation du système minimal."].concat(choices.length?["Choix à appliquer pendant l'installation :"].concat(choices.map(c=>"  - "+c)):[]),
    docs:doc?[doc]:[],
    verify:["cat /etc/os-release","uname -r"]});
  // mise à jour initiale
  const UPD={apk:["apk update","apk upgrade"],apt:["apt update","apt upgrade -y"],pacman:["pacman -Syu"],dnf:["dnf upgrade -y"],zypper:["zypper refresh","zypper update -y"],xbps:["xbps-install -Su"],emerge:["emerge --sync","emerge --ask --update --deep @world"],nix:["nix-channel --update"]};
  if(UPD[fam])steps.push({title:"Mettre à jour le système",state:"check",why:"Partir d'un système à jour avant d'ajouter des paquets.",cmds:UPD[fam],verify:["echo $?  # doit afficher 0"],stateNote:"Commande standard de "+BD.pm[1]+", non testée dans ce tutoriel."});

  // briques de la pile
  const SKIP=new Set(["Distribution de base","Bibliothèque C","Système d'init","Gestionnaire de paquets","Mises à jour","Logiciels de jeu","Modèle d'image"]);
  stack.forEach(x=>{
    if(SKIP.has(x.label)||!x.tool)return;
    const t=byId(x.tool);if(!t)return;
    const r=toolPkgs(t,baseId);
    if(r.nothing){steps.push({title:x.label+" : "+x.name,state:"ok",why:x.why,notes:["Aucun paquet à installer séparément : "+(t.id==="wayland"?"Wayland est fourni par ton bureau ou ton compositeur.":"déjà fourni par la base.")]});return}
    if(r.unknownFam){steps.push({title:x.label+" : "+x.name,state:"check",why:x.why,notes:["Le nom du paquet n'est pas renseigné pour "+BD.name+" : consulte la documentation de la base."],docs:(t.docs||[]).slice(0,1).map(d=>[d.label,d.url])});return}
    if(r.none)return;
    const st={title:x.label+" : "+x.name,why:x.why,cmds:[],verify:[],pitfalls:(t.pitfalls||[]).slice(0,2),docs:(t.docs||[]).slice(0,1).map(d=>[d.label,d.url]),needs:needsForBase(t,baseId)};
    if(r.pkgs.length){st.cmds=st.cmds.concat(instCmd(baseId,r.pkgs));st.verify=st.verify.concat(verifyCmds(baseId,r.pkgs));addPkgs(r.pkgs);st.state=pkgState(baseId,r.pkgs)}
    if(r.flatpak){needFlatpak=true;st.cmds.push(`flatpak install -y flathub ${r.flatpak}`);st.verify.push(`flatpak info ${r.flatpak}`);st.state="check";st.stateNote="Identifiant Flathub non vérifié."}
    if(r.compile){st.cmds=st.cmds.concat(r.compile);st.state="check";st.stateNote="Compilation depuis les sources : étapes à suivre dans le dépôt du projet."}
    if(!st.state)st.state="check";
    if(famOf(baseId)==="none")st.stateNote="Cette base n'a pas de gestionnaire de paquets : compile depuis les sources.";
    if(famOf(baseId)==="apk"&&baseId==="alpine"&&r.pkgs.some(p=>ALPINE_STATUS[p]==="testing"))st.stateNote="Paquet dans le dépôt testing d'Alpine : active-le dans /etc/apk/repositories.";
    steps.push(st);
  });

  // services
  const svcLines=[];
  const chosenTools=[...stack.map(x=>x.tool),...Object.values(sel).flat()].filter(Boolean);
  const uniq=[...new Set(chosenTools)];
  uniq.forEach(tid=>{const s=SERVICE[tid];if(!s)return;const f=INIT_ENABLE[initId];if(!f)return;const t=byId(tid);svcLines.push({name:t?t.name:tid,cmds:f(s)})});
  if(svcLines.length)steps.push({title:"Activer les services",state:"check",why:"Les services ne démarrent pas tout seuls après l'installation.",
    notes:["Init détectée : "+((byId(initId)||{}).name||BD.init[1])+"."],
    cmds:svcLines.flatMap(s=>["# "+s.name].concat(s.cmds)),
    verify:["# vérifier chaque service avec la commande de ton init (rc-status, systemctl status, sv status)"],
    stateNote:"Les noms de services peuvent varier selon la distribution."});

  // logiciels
  const groupsMd=[];
  tree.software.groups.forEach(g=>g.funcs.forEach(f=>{
    sel[f.id].forEach(tid=>{
      const t=byId(tid);if(!t)return;
      if(stack.some(x=>x.tool===tid))return;
      const r=toolPkgs(t,baseId);
      if(r.unknownFam){groupsMd.push({title:f.label+" : "+t.name,state:"check",why:t.summary,notes:["Le nom du paquet n'est pas renseigné pour "+BD.name+" : consulte la documentation du projet."]});return}
      const st={title:f.label+" : "+t.name,why:t.summary,cmds:[],verify:[],pitfalls:(t.pitfalls||[]).slice(0,2),docs:(t.docs||[]).slice(0,1).map(d=>[d.label,d.url]),needs:needsForBase(t,baseId)};
      if(r.pkgs.length){st.cmds=st.cmds.concat(instCmd(baseId,r.pkgs));st.verify=st.verify.concat(verifyCmds(baseId,r.pkgs));addPkgs(r.pkgs);st.state=pkgState(baseId,r.pkgs)}
      if(r.flatpak){needFlatpak=true;st.cmds.push(`flatpak install -y flathub ${r.flatpak}`);st.verify.push(`flatpak info ${r.flatpak}`);st.state="check";st.stateNote="Identifiant Flathub non vérifié."}
      if(r.compile){st.cmds=st.cmds.concat(r.compile);st.state="check";st.stateNote="Compilation depuis les sources."}
      if(!st.cmds.length){st.state="check";st.notes=["Aucune commande d'installation connue pour cette base : consulte la documentation du projet."]}
      if(!st.state)st.state="check";
      if(famOf(baseId)==="apk"&&baseId==="alpine"&&r.pkgs.some(p=>ALPINE_STATUS[p]==="testing"))st.stateNote="Paquet dans le dépôt testing d'Alpine : active-le dans /etc/apk/repositories.";
      groupsMd.push(st);
    });
  }));
  if(needFlatpak)steps.push({title:"Préparer Flatpak",state:"check",why:"Certains logiciels ne sont pas dans les dépôts de "+BD.name+" et passent par Flatpak.",
    cmds:instCmd(baseId,["flatpak"]).concat(["flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo"]),
    verify:["flatpak remotes"],stateNote:"Sur certaines bases, il faut aussi installer un portail xdg-desktop-portal et redémarrer la session.",docs:[["Configurer Flatpak","https://flatpak.org/setup/"]]});
  groupsMd.forEach(x=>steps.push(x));

  // ISO
  const BUILD=buildIso(baseId,allPkgs);

  // ---------- rédaction ----------
  P(`# Distro ${obj.name.toLowerCase()} sur ${BD.name} : tutoriel pas à pas`);
  P("");
  P(`> Généré par l'Atlas distro le ${date}. Les données sont écrites à la main : relis chaque étape avant de l'exécuter, surtout celles marquées ⚠️.`);
  P("");
  P("## Légende des états");
  P("");
  P(`- ${ST.ok}`);
  P(`- ${ST.check} : nom de paquet, option ou identifiant non confirmé pour cette base`);
  P(`- ${ST.manual} : à faire à la main, avec la documentation officielle`);
  P("");
  P("Les commandes sont à lancer en root (ou avec `sudo` ou `doas`).");
  P("");
  P("## Ta pile");
  P("");
  P("| Brique | Choix | Pourquoi |");
  P("|---|---|---|");
  stack.forEach(x=>P(`| ${mdEscape(x.label)} | ${mdEscape(x.name)}${x.manual?" (choix manuel)":""} | ${mdEscape((x.why||"").replace(/ \(Choix par défaut[^)]*\)/,""))} |`));
  P("");
  if(G.scope==="precise"){
    P("## Ton matériel");P("");P("- "+hwSummary());hwNotes().forEach(n=>P("- "+n));P("");
  }
  const warns=[];
  issues.forEach(i=>warns.push("**Conflit non résolu** : "+i.msg));
  keptIssues.forEach(i=>warns.push("**Conflit conservé volontairement** : "+i.msg));
  G.changed.forEach(c=>warns.push(`**Objectif de départ modifié** : « ${tree.questions[c.i].t} » est passé de « ${tree.questions[c.i].o[c.from]} » à « ${tree.questions[c.i].o[c.to]} »`));
  if(warns.length){P("## Avertissements");P("");warns.forEach(w=>P("- "+w));P("")}
  P("## Étapes");P("");
  steps.forEach((s,i)=>{
    P(`### ${i+1}. ${s.title}`);P("");
    P(`**État :** ${ST[s.state]||ST.check}${s.stateNote?" — "+s.stateNote:""}`);P("");
    if(s.why){P(`**Pourquoi :** ${s.why}`);P("")}
    if(s.needs&&s.needs.length){P("**À prévoir :**");s.needs.forEach(n=>P("- "+n));P("")}
    if(s.notes){s.notes.forEach(n=>P(n.startsWith("  ")?n:"- "+n));P("")}
    if(s.cmds&&s.cmds.length){P("**Commande :**");P("");P("```bash");s.cmds.forEach(c=>P(c));P("```");P("")}
    if(s.verify&&s.verify.length){P("**Vérifier :**");P("");P("```bash");s.verify.forEach(c=>P(c));P("```");P("")}
    if(s.pitfalls&&s.pitfalls.length){P("**Pièges :**");s.pitfalls.forEach(n=>P("- "+n));P("")}
    if(s.docs&&s.docs.length){P("**Documentation :** "+s.docs.map(d=>`[${d[0]}](${d[1]})`).join(", "));P("")}
  });
  P("## Liste complète des paquets");P("");
  if(allPkgs.length){P("```text");P(allPkgs.join("\n"));P("```")}else P("Aucun paquet listé pour cette base.");
  P("");
  P("## Construire une ISO personnalisée");P("");
  P(`**État :** ${ST[BUILD.state]}${BUILD.stateNote?" — "+BUILD.stateNote:""}`);P("");
  P(`**Outil :** ${BUILD.tool}`);P("");
  BUILD.steps.forEach((s,i)=>{P(`${i+1}. ${s.text}`);if(s.cmds&&s.cmds.length){P("");P("   ```bash");s.cmds.forEach(c=>P("   "+c));P("   ```")}});
  P("");
  if(BUILD.docs)P("**Documentation :** "+BUILD.docs.map(d=>`[${d[0]}](${d[1]})`).join(", "));
  P("");
  const cnt={ok:0,check:0,manual:0};steps.forEach(s=>cnt[s.state||"check"]++);
  P("## Récapitulatif des vérifications");P("");
  P("| État | Étapes |");P("|---|---|");
  P(`| ${ST.ok} | ${cnt.ok} |`);P(`| ${ST.check} | ${cnt.check} |`);P(`| ${ST.manual} | ${cnt.manual} |`);
  P("");
  P("Aucune étape n'a été testée dans un conteneur ou une machine virtuelle. Signale toute erreur pour qu'elle soit corrigée dans les données.");
  return L.join("\n")+"\n";
}
function needsForBase(t,base){
  const n=(t.needs||[]).filter(x=>base==="alpine"||!/Alpine/.test(x));
  return n;
}
function buildIso(base,pkgs){
  const list=pkgs.filter(p=>!/^group:/.test(p));
  const f=famOf(base);
  if(base==="alpine")return {state:"check",stateNote:"Procédure inspirée du wiki Alpine, non testée.",tool:"mkimage (aports)",docs:[["Créer une ISO personnalisée","https://wiki.alpinelinux.org/wiki/How_to_make_a_custom_ISO_image_with_mkimage"]],steps:[
   {text:"Installe les outils de construction.",cmds:["apk add alpine-sdk squashfs-tools xorriso mkinitfs grub-efi","adduser $USER abuild"]},
   {text:"Crée une clé de signature de paquets.",cmds:["abuild-keygen -i -a"]},
   {text:"Récupère les scripts de construction.",cmds:["git clone --depth=1 https://gitlab.alpinelinux.org/alpine/aports.git","cd aports/scripts"]},
   {text:"Crée le profil `mkimg.macdistro.sh` avec la liste des paquets de ce tutoriel.",cmds:["cat > mkimg.macdistro.sh <<'EOF'","profile_macdistro() {","\tprofile_standard","\ttitle=\"Ma distro\"","\tapks=\"$apks "+list.join(" ")+"\"","}","EOF"]},
   {text:"Construis l'image.",cmds:["sh mkimage.sh --tag edge --outdir ~/iso --arch x86_64 --repository https://dl-cdn.alpinelinux.org/alpine/edge/main --repository https://dl-cdn.alpinelinux.org/alpine/edge/community --profile macdistro"]},
   {text:"Vérifie que l'image est créée.",cmds:["ls -lh ~/iso/*.iso"]}]};
  if(base==="arch")return {state:"check",stateNote:"Procédure inspirée de la page archiso de l'ArchWiki, non testée.",tool:"archiso",docs:[["archiso","https://wiki.archlinux.org/title/Archiso"]],steps:[
   {text:"Installe archiso.",cmds:["pacman -S --needed archiso"]},
   {text:"Copie le profil de base.",cmds:["cp -r /usr/share/archiso/configs/releng/ ~/macdistro"]},
   {text:"Ajoute les paquets de ce tutoriel à `~/macdistro/packages.x86_64`.",cmds:["cat >> ~/macdistro/packages.x86_64 <<'EOF'"].concat(list).concat(["EOF"])},
   {text:"Construis l'image.",cmds:["mkarchiso -v -w /tmp/archiso-work -o ~/iso ~/macdistro"]},
   {text:"Vérifie que l'image est créée.",cmds:["ls -lh ~/iso/*.iso"]}]};
  if(f==="apt")return {state:"check",stateNote:"Procédure inspirée du manuel de live-build, non testée. Il faut la lancer depuis un système Debian.",tool:"live-build",docs:[["Manuel de live-build","https://live-team.pages.debian.net/live-manual/"]],steps:[
   {text:"Installe live-build.",cmds:["apt install -y live-build"]},
   {text:"Crée le dossier de travail et la configuration.",cmds:["mkdir ~/macdistro && cd ~/macdistro","lb config"]},
   {text:"Ajoute les paquets de ce tutoriel.",cmds:["mkdir -p config/package-lists","cat > config/package-lists/macdistro.list.chroot <<'EOF'"].concat(list).concat(["EOF"])},
   {text:"Construis l'image.",cmds:["lb build"]},
   {text:"Vérifie que l'image est créée.",cmds:["ls -lh *.iso"]}]};
  if(f==="dnf"&&base==="fedora")return {state:"manual",stateNote:"Procédure non générée : choisir entre KIWI NG et livemedia-creator.",tool:"KIWI NG ou livemedia-creator",docs:[["KIWI NG","https://osinside.github.io/kiwi/"],["Construire une image Fedora","https://docs.fedoraproject.org/en-US/fedora-live-respin/"]],steps:[
   {text:"Choisis un outil, puis ajoute à sa description la liste complète des paquets ci-dessus."},
   {text:"Construis l'image en suivant la documentation officielle, puis teste-la dans une machine virtuelle."}]};
  return {state:"manual",stateNote:"Aucune procédure générée pour cette base.",tool:"mkosi (multi-distributions) ou l'outil de la base",docs:[["mkosi","https://github.com/systemd/mkosi"]],steps:[
   {text:"Utilise l'outil de construction de ta base, ou mkosi, avec la liste complète des paquets ci-dessus."},
   {text:"Teste l'image dans une machine virtuelle avant de la graver."}]};
}
function downloadMd(text,name){
  try{const b=new Blob([text],{type:"text/markdown;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}catch(e){}
}
function mdScreen(){
  const text=buildTutorial();
  const lines=text.split("\n").length;
  const states=(text.match(/\*\*État :\*\*/g)||[]).length;
  return `<h2>Ton tutoriel</h2><p class="lead">Un fichier Markdown pas à pas : installation de la pile puis construction de l'ISO. ${lines} lignes, ${states} étapes, chacune avec son état de vérification.</p>
   <div class="warn" style="margin:0 0 12px">⚠️ Aucune étape n'a été testée dans un conteneur ou une machine virtuelle. Les étapes marquées « À vérifier » demandent ta relecture.</div>
   <button class="big" data-mddl="1" style="margin:0 0 8px">Télécharger le fichier .md</button>
   <button class="opt" data-mdcopy="1">Copier le texte</button>
   <details class="grp"><summary>Aperçu du fichier <span class="cnt">${lines} lignes</span></summary><pre style="max-height:60vh;overflow:auto;font-size:11px">${esc(text)}</pre></details>
   <button class="ghost" data-mdback="1">← Retour à la pile</button>`;
}
