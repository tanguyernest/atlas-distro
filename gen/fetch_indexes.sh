#!/bin/sh
# Télécharge les index officiels des dépôts (Debian, Ubuntu, Arch, Fedora, Flathub) dans le dossier $1.
# Écrit aussi $1/meta.json : version de chaque base et date de vérification.
# Usage : sh gen/fetch_indexes.sh /chemin/vers/idx
set -eu
DEBIAN=trixie DEBIAN_LABEL="Debian 13 (trixie)"
UBUNTU=resolute UBUNTU_LABEL="Ubuntu 26.04 LTS (resolute)"
FEDORA=44 FEDORA_LABEL="Fedora 44"
ARCH_LABEL="Arch Linux (dépôts du jour)"
d=${1:?dossier de sortie}
mkdir -p "$d"
get() { curl -sfL --retry 3 "$1" -o "$2" || { echo "échec : $1" >&2; exit 1; }; }

D=https://deb.debian.org/debian/dists
for s in $DEBIAN $DEBIAN-updates; do for c in main contrib non-free non-free-firmware; do
  get "$D/$s/$c/binary-amd64/Packages.xz" "$d/deb-$s-$c.xz"; done; done
U=http://archive.ubuntu.com/ubuntu/dists
for s in $UBUNTU $UBUNTU-updates; do for c in main restricted universe multiverse; do
  get "$U/$s/$c/binary-amd64/Packages.xz" "$d/ubu-$s-$c.xz"; done; done
A=https://geo.mirror.pkgbuild.com
for r in core extra multilib; do get "$A/$r/os/x86_64/$r.db" "$d/arch-$r.db"; done
F=https://dl.fedoraproject.org/pub/fedora/linux
for r in releases updates; do
  url=$F/$r/$FEDORA/Everything/x86_64; [ $r = releases ] && url=$url/os
  p=$(curl -sfL "$url/repodata/repomd.xml" | grep -o 'href="repodata/[^"]*primary.xml.zst"' | cut -d'"' -f2)
  get "$url/$p" "$d/fed-$r-primary.xml.zst"
done

get https://flathub.org/api/v2/appstream "$d/flathub-appstream.json"

today=$(date +%F)
cat > "$d/meta.json" <<J
{"debian":{"label":"$DEBIAN_LABEL","verified_on":"$today","sources":"$DEBIAN, $DEBIAN-updates : main contrib non-free non-free-firmware"},
 "ubuntu":{"label":"$UBUNTU_LABEL","verified_on":"$today","sources":"$UBUNTU, $UBUNTU-updates : main restricted universe multiverse"},
 "arch":{"label":"$ARCH_LABEL","verified_on":"$today","sources":"core extra multilib"},
 "fedora":{"label":"$FEDORA_LABEL","verified_on":"$today","sources":"Everything + updates"},
 "flathub":{"label":"Flathub","verified_on":"$today","sources":"flathub.org/api/v2/appstream"}}
J
echo "index téléchargés dans $d"
