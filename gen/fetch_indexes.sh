#!/bin/sh
# Télécharge les index officiels des dépôts (Debian, Ubuntu, Arch, Fedora, Void, Gentoo, Flathub) dans le dossier $1.
# Écrit aussi $1/meta-<base>.json : version de chaque base et date de vérification.
# Usage : sh gen/fetch_indexes.sh /chemin/vers/idx [base...]   (sans base : toutes)
set -eu
DEBIAN=trixie DEBIAN_LABEL="Debian 13 (trixie)"
UBUNTU=resolute UBUNTU_LABEL="Ubuntu 26.04 LTS (resolute)"
FEDORA=44 FEDORA_LABEL="Fedora 44"
ARCH_LABEL="Arch Linux (dépôts du jour)"
VOID_LABEL="Void Linux x86_64 glibc (dépôt current du jour)"
GENTOO_LABEL="Gentoo (arbre Portage du jour)"
d=${1:?dossier de sortie}
shift
BASES=${*:-debian ubuntu arch fedora void gentoo flathub}
mkdir -p "$d"
get() { curl -sfL --retry 3 "$1" -o "$2" || { echo "échec : $1" >&2; exit 1; }; }
today=$(date +%F)
meta() { printf '{"%s":{"label":"%s","verified_on":"%s","sources":"%s"}}\n' "$1" "$2" "$today" "$3" > "$d/meta-$1.json"; }
want() { case " $BASES " in *" $1 "*) return 0;; esac; return 1; }

if want debian; then
  D=https://deb.debian.org/debian/dists
  for s in $DEBIAN $DEBIAN-updates; do for c in main contrib non-free non-free-firmware; do
    get "$D/$s/$c/binary-amd64/Packages.xz" "$d/deb-$s-$c.xz"; done; done
  meta debian "$DEBIAN_LABEL" "$DEBIAN, $DEBIAN-updates : main contrib non-free non-free-firmware"
fi
if want ubuntu; then
  U=http://archive.ubuntu.com/ubuntu/dists
  for s in $UBUNTU $UBUNTU-updates; do for c in main restricted universe multiverse; do
    get "$U/$s/$c/binary-amd64/Packages.xz" "$d/ubu-$s-$c.xz"; done; done
  meta ubuntu "$UBUNTU_LABEL" "$UBUNTU, $UBUNTU-updates : main restricted universe multiverse"
fi
if want arch; then
  A=https://geo.mirror.pkgbuild.com
  for r in core extra multilib; do get "$A/$r/os/x86_64/$r.db" "$d/arch-$r.db"; done
  meta arch "$ARCH_LABEL" "core extra multilib"
fi
if want fedora; then
  F=https://dl.fedoraproject.org/pub/fedora/linux
  for r in releases updates; do
    url=$F/$r/$FEDORA/Everything/x86_64; [ $r = releases ] && url=$url/os
    p=$(curl -sfL "$url/repodata/repomd.xml" | grep -o 'href="repodata/[^"]*primary.xml.zst"' | cut -d'"' -f2)
    get "$url/$p" "$d/fed-$r-primary.xml.zst"
  done
  meta fedora "$FEDORA_LABEL" "Everything + updates"
fi
if want void; then
  V=https://repo-default.voidlinux.org/current
  get "$V/x86_64-repodata" "$d/void-main.repodata"
  get "$V/nonfree/x86_64-repodata" "$d/void-nonfree.repodata"
  get "$V/multilib/x86_64-repodata" "$d/void-multilib.repodata"
  meta void "$VOID_LABEL" "current, current/nonfree, current/multilib (x86_64-repodata)"
fi
if want gentoo; then
  # instantané de l'arbre Portage (~50 Mo) : on n'en garde que la liste catégorie/paquet
  get https://distfiles.gentoo.org/snapshots/gentoo-latest.tar.xz "$d/gentoo-latest.tar.xz"
  tar -tJf "$d/gentoo-latest.tar.xz" | awk -F/ 'NF>=4 && $4 ~ /\.ebuild$/ {print $2"/"$3}' | sort -u > "$d/gentoo-atoms.txt"
  tar -xJOf "$d/gentoo-latest.tar.xz" --wildcards '*/profiles/profiles.desc' > "$d/gentoo-profiles.desc"
  rm "$d/gentoo-latest.tar.xz"
  meta gentoo "$GENTOO_LABEL" "gentoo-latest.tar.xz (distfiles.gentoo.org/snapshots)"
fi
if want flathub; then
  get https://flathub.org/api/v2/appstream "$d/flathub-appstream.json"
  meta flathub "Flathub" "flathub.org/api/v2/appstream"
fi
echo "index téléchargés dans $d : $BASES"
