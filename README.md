# Atlas distro

🇫🇷 Français · [🇬🇧 English](README.en.md)

> **⚠️ Outil d'apprentissage, fourni sans garantie.**
> - Suis ce tutoriel d'abord dans une machine virtuelle, pas sur ta machine principale.
> - Ne lance jamais une commande que tu ne comprends pas.
> - Sauvegarde tes données avant de toucher aux disques.
> - Seul Alpine a été testé en VM. Les autres bases sont écrites mais pas encore testées.

Atlas distro aide à **comprendre et choisir les briques d'une distribution Linux** : base, noyau, libc, init, chargeur d'amorçage, gestionnaire de paquets, bureau, sécurité, logiciels. Il compare les options, signale les conflits entre choix, puis génère un **tutoriel `.md` pas à pas** : création d'une VM de test, partitionnement, installation de la base dans un chroot, chargeur d'amorçage, bureau, puis ISO personnalisée.

C'est une page web unique, **en français et en anglais**, qui marche **hors ligne** : aucun serveur, aucun compte, rien n'est envoyé.

**État : bêta publique (version 0.1.0).**

## Utiliser l'app

- En ligne : <https://tanguyernest.github.io/atlas-distro/>
- Dépôt : <https://github.com/tanguyernest/atlas-distro>
- Hors ligne : télécharge `atlas-distro.html` et ouvre-le dans un navigateur. Aucune installation.

## Statut par base

Parcours « distro depuis zéro » (VM, partitionnement, base dans un chroot, chargeur, bureau) :

| Base | Tutoriel | Noms de paquets |
|---|---|---|
| Alpine Linux | ✅ Complet et testé en VM (Alpine 3.24.3, UEFI, limine, Xfce) | vérifiés (date non enregistrée) |
| Debian | ✍️ Écrit, pas encore testé | vérifiés le 30/10/2026 (Debian 13) |
| Ubuntu | ✍️ Écrit, pas encore testé | vérifiés le 30/10/2026 (Ubuntu 26.04 LTS) |
| Arch Linux | ✍️ Écrit, pas encore testé | vérifiés le 30/10/2026 |
| Fedora | ✍️ Écrit, pas encore testé | vérifiés le 30/10/2026 (Fedora 44) |
| Void Linux | ✍️ Écrit, pas encore testé | vérifiés le 30/10/2026 |
| Gentoo Linux | ✍️ Écrit, pas encore testé | vérifiés le 30/10/2026 |
| NixOS, openSUSE, Devuan, Linux From Scratch, Raspberry Pi OS, OpenWrt, Tiny Core, Slackware, Rocky, AlmaLinux | ⏳ Pas encore couvert (fiches de comparaison seulement) | non vérifiés |

Dans le tutoriel, chaque étape porte un état :

- 🧪 testé en VM (date et version indiquées), uniquement pour les commandes exactes testées
- 🟡 nom de paquet vérifié dans l'index officiel, commande non exécutée
- ⚠️ à vérifier
- 🔧 à faire à la main, avec la documentation officielle
- ℹ️ rien à installer

## Signaler une erreur

Chaque étape du tutoriel a un identifiant (`<base>-<parcours>-<étape>`, par exemple `debian-light-base-chroot`) et un lien **« Signale-la »**. Il ouvre un ticket GitHub déjà rempli : base, parcours, étape, version de l'app. Il te reste à coller la commande et le message d'erreur.

Tu peux aussi ouvrir un ticket directement, avec l'un des deux modèles :

- **Commande qui échoue** : base, parcours, identifiant d'étape, commande, message d'erreur.
- **Paquet introuvable** : base, paquet, message d'erreur, date de vérification indiquée en tête du tutoriel.

La fin de chaque tutoriel contient un bloc « Signaler un problème » à copier : il résume tes choix, sans nom d'utilisateur ni chemin de ta machine. N'ajoute jamais de mot de passe ni de donnée personnelle dans un ticket.

## Limites connues

- Seul le parcours Alpine (UEFI, limine, Xfce) a été exécuté en VM. Les autres bases, ainsi que LUKS, le mode BIOS et les autres chargeurs, sont écrits mais pas testés.
- Un nom de paquet vérifié ne garantit pas que la commande marche : les dépôts changent, les noms aussi.
- Les paquets de dépôts tiers (COPR, AUR, PPA…) restent marqués ⚠️.
- Les identifiants d'étape ne dépendent ni de la langue ni de l'ordre : ajouter une étape ou traduire l'app ne les change pas.
- Les pilotes propriétaires hors dépôts (par exemple NVIDIA sur Alpine) et les réglages internes des logiciels ne sont pas couverts.
- Gentoo : compilation longue (plusieurs heures pour la base).
- L'alternative VirtualBox est décrite, pas testée.
- Traduction anglaise en cours : l'interface, les questions et les bases d'abord ; les fiches, l'aide « ? » et le tutoriel généré restent en français pour l'instant.

## Contenu du dépôt

- `atlas-distro.html` : l'app complète (code et données). C'est la source de référence.
- `index.html` : redirige vers l'app, pour GitHub Pages.
- `gen/` : vérification des noms de paquets dans les index officiels, tests du générateur, audits, banc de test VM (`gen/vm/`). Le mot de passe écrit dans `gen/vm/run_vm.py` sert seulement aux VM de test jetables : il est sans valeur, ne le réutilise nulle part.
- `.github/ISSUE_TEMPLATE/` : modèles de ticket.

Tests (Node + Playwright) : `node gen/test-i18n.js`, `node gen/test-tutorials.js`, `node gen/audit.js`, `node gen/audit2.js`, `node gen/audit3.js`. Avec `ATLAS_LANG=en`, ils chargent l'interface anglaise.

## Licences

- **Code** : licence MIT, voir [`LICENSE`](LICENSE).
- **Données et textes** (fiches, parcours, étapes, commandes, tutoriels générés, ce README) : CC BY-SA 4.0, voir [`LICENSE-DATA`](LICENSE-DATA).

Le tout est **fourni sans garantie**. Les commandes décrites peuvent effacer des données : tu les exécutes à tes propres risques.
