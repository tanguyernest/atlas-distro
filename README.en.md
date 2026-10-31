# Atlas distro

[🇫🇷 Français](README.md) · 🇬🇧 English

> **⚠️ Learning tool, provided without warranty.**
> - Follow the tutorial in a virtual machine first, not on your main machine.
> - Never run a command you do not understand.
> - Back up your data before touching disks.
> - Only Alpine has been tested in a VM. The other bases are written but not tested yet.

Atlas distro helps you **understand and choose the building blocks of a Linux distribution**: base, kernel, libc, init, bootloader, package manager, desktop, security, software. It compares the options, flags conflicts between choices, then generates a **step-by-step `.md` tutorial**: creating a test VM, partitioning, installing the base in a chroot, bootloader, desktop, then a custom ISO.

It is a single web page, **in French and English**, that works **offline**: no server, no account, nothing is sent anywhere.

**Status: public beta (version 0.1.0).**

> **Translation in progress.** The interface, the question tree, the goals, the bases and the hardware questions are available in English. The tool sheets, the « ? » help and the generated tutorial are still in French for now. The language follows your browser (French if it is neither French nor English); the button at the top right switches it. Commands, package names, identifiers and tool names are never translated.

## Using the app

- Online: <https://tanguyernest.github.io/atlas-distro/>
- Repository: <https://github.com/tanguyernest/atlas-distro>
- Offline: download `atlas-distro.html` and open it in a browser. No installation.

## Status per base

« Distro from scratch » path (VM, partitioning, base in a chroot, bootloader, desktop):

| Base | Tutorial | Package names |
|---|---|---|
| Alpine Linux | ✅ Complete and tested in a VM (Alpine 3.24.3, UEFI, limine, Xfce) | verified (date not recorded) |
| Debian | ✍️ Written, not tested yet | verified on 2026-10-30 (Debian 13) |
| Ubuntu | ✍️ Written, not tested yet | verified on 2026-10-30 (Ubuntu 26.04 LTS) |
| Arch Linux | ✍️ Written, not tested yet | verified on 2026-10-30 |
| Fedora | ✍️ Written, not tested yet | verified on 2026-10-30 (Fedora 44) |
| Void Linux | ✍️ Written, not tested yet | verified on 2026-10-30 |
| Gentoo Linux | ✍️ Written, not tested yet | verified on 2026-10-30 |
| NixOS, openSUSE, Devuan, Linux From Scratch, Raspberry Pi OS, OpenWrt, Tiny Core, Slackware, Rocky, AlmaLinux | ⏳ Not covered yet (comparison sheets only) | not verified |

In the tutorial, every step carries a state:

- 🧪 tested in a VM (date and version shown), only for the exact commands that were tested
- 🟡 package name verified in the official index, command not run
- ⚠️ to be checked
- 🔧 to do by hand, with the official documentation
- ℹ️ nothing to install

## Reporting an error

Every tutorial step has an identifier (`<base>-<path>-<step>`, for example `debian-light-base-chroot`) and a **« Report it »** link (« Signale-la » in the French tutorial). It opens a pre-filled GitHub issue: base, path, step, app version. You only need to paste the command and the error message.

You can also open an issue directly, with one of the two forms (labels are bilingual, you can write in French or English):

- **Failing command**: base, path, step identifier, command, error message.
- **Package not found**: base, package, error message, check date shown at the top of the tutorial.

The end of every tutorial contains a « Report a problem » block to copy: it summarizes your choices, without user name or local path. Never put a password or personal data in an issue.

## Known limits

- Only the Alpine path (UEFI, limine, Xfce) has been run in a VM. The other bases, as well as LUKS, BIOS mode and the other bootloaders, are written but not tested.
- A verified package name does not guarantee the command works: repositories change, and so do names.
- Packages from third-party repositories (COPR, AUR, PPA…) stay marked ⚠️.
- Step identifiers depend neither on the language nor on the order: adding a step or translating the app does not change them.
- Proprietary drivers outside the repositories (for example NVIDIA on Alpine) and the internal settings of the software are not covered.
- Gentoo: long compilation (several hours for the base).
- The VirtualBox alternative is described, not tested.
- English translation in progress (see above).

## Repository contents

- `atlas-distro.html`: the complete app (code and data). This is the reference source.
- `index.html`: redirects to the app, for GitHub Pages.
- `gen/`: package-name checks against the official indexes, generator tests, audits, VM test bench (`gen/vm/`). The password written in `gen/vm/run_vm.py` is only for disposable test VMs: it is worthless, do not reuse it anywhere.
- `.github/ISSUE_TEMPLATE/`: issue forms.

Tests (Node + Playwright): `node gen/test-i18n.js`, `node gen/test-tutorials.js`, `node gen/audit.js`, `node gen/audit2.js`, `node gen/audit3.js`. Set `ATLAS_LANG=en` to run them against the English interface.

## Licenses

- **Code**: MIT license, see [`LICENSE`](LICENSE).
- **Data and texts** (sheets, paths, steps, commands, generated tutorials, this README): CC BY-SA 4.0, see [`LICENSE-DATA`](LICENSE-DATA).

Everything is **provided without warranty**. The commands described can erase data: you run them at your own risk.
