# MicroSIP DUMA Project Context

This repository contains the customized MicroSIP desktop client and the native
libraries needed to build it. The DUMA Client Info web application was split
into the separate private repository `eXqusic92/client-info` on 2026-07-22.

## Repository Layout

```text
pjproject-2.15.1/                     PJSIP source and dependencies
pjproject-2.15.1/MicroSIP-3.22.3-src/ Customized MicroSIP 3.22.3 source
opus-1.6.1/                           Opus source
tools/test-call-microsip.ps1          Local SIP call helper
```

## MicroSIP Direction

MicroSIP is customized to:

- show DUMA branding and Ukrainian UI text;
- expose a Client Info link on incoming and accepted calls;
- store the Client Info host in settings;
- open the browser card URL using the caller phone number.

MicroSIP must not fetch or render business/customer data itself. Client data,
call analytics, integrations, authentication, and operator UI belong to the
separate Client Info service.

## Windows Build

MSBuild is normally located at:

```text
C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\MSBuild\Current\Bin\MSBuild.exe
```

Build command:

```powershell
$src='C:\Users\pavlo\microsip-ewe\pjproject-2.15.1\MicroSIP-3.22.3-src'
$msbuild='C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\MSBuild\Current\Bin\MSBuild.exe'
& $msbuild "$src\microsip.vcxproj" /p:Configuration=Release /p:Platform=Win32 /m /v:minimal
```

Expected output:

```text
pjproject-2.15.1\MicroSIP-3.22.3-src\Release\microsip.exe
```

If the linker cannot replace `microsip.exe`, close the running MicroSIP process
and rebuild.

## PJSIP and Opus

The tracked PJSIP configuration is:

```text
pjproject-2.15.1\pjlib\include\pj\config_site.h
```

It enables the project's TLS, SRTP/DTLS, Opus, and selected video support.
Generated native outputs and runtime DLLs stay ignored by Git.

## Local Test Call

The helper `tools/test-call-microsip.ps1` starts the built PJSUA console client
and calls a local MicroSIP instance on port 5060:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\pavlo\microsip-ewe\tools\test-call-microsip.ps1 -Phone 380671112233
```

## Git and Security

- GitHub remote: `https://github.com/eXqusic92/microsip-ewe.git`
- Default branch: `main`
- Do not commit credentials, certificates, logs, recordings, executables,
  libraries, or Visual Studio build output.
- Client Info remains visible in historical commits of this public repository;
  the split did not rewrite published history.
