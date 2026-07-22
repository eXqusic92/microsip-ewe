# AGENTS.md

@/Users/exqusic/.codex/RTK.md

## Project

This repository contains the customized MicroSIP client and its native codec/SIP dependencies.

- MicroSIP source: `pjproject-2.15.1/MicroSIP-3.22.3-src/`
- PJSIP source: `pjproject-2.15.1/`
- Opus source: `opus-1.6.1/`
- Local call test helper: `tools/test-call-microsip.ps1`

The DUMA Client Info web application lives in the separate private repository
`eXqusic92/client-info` and is not maintained here.

## Commands

Always run shell commands through `rtk`.

The primary build environment is Windows with Visual Studio 2022 Build Tools.
Build `pjproject-2.15.1/MicroSIP-3.22.3-src/microsip.vcxproj` using the Release/Win32 configuration.

## Native Source Rules

- Keep `pjproject-2.15.1/pjlib/include/pj/config_site.h` tracked.
- Preserve the existing PJSIP, TLS, SRTP, Opus, and video configuration unless a task explicitly changes it.
- Do not commit generated Visual Studio outputs, native binaries, libraries, logs, or credentials.
- Keep MicroSIP focused on opening the external Client Info URL by phone number; do not restore the old business-API popup integration.

## Editing and Verification

- Use `apply_patch` for manual edits.
- Keep changes scoped and preserve unrelated user work.
- Prefer existing MicroSIP/PJSIP patterns over new abstractions.
- After native changes, build Release/Win32 and report the resulting `microsip.exe` path.
- Use `tools/test-call-microsip.ps1` for local SIP call checks when the Windows toolchain is available.
