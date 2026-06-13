# EvolveAgent AI Work Summary

Branch: `linear/evo-171`

This file maps the recent roadmap work to commits and status so Linear or GitHub can be reviewed without digging through chat history.

## v2.7 — Knowledge Base + Project Brain

Epic: `EVO-256`

| Issue | Status | Commit | Summary |
| --- | --- | --- | --- |
| `EVO-257` | Complete | `7faeb6e` | Added Project Brain / Knowledge Base foundation and workspace search. |
| `EVO-258` | Complete | `7faeb6e` | Added frontend Project Brain / Assistant Tools panels. |
| `EVO-259` | Complete | `37b0307` | Added cross-session knowledge links with persistent JSON storage and API support. |
| `EVO-260` | Complete | `37b0307` | Added memory importance ranking, pin/unpin, and ranked retrieval. |
| `EVO-261` | Complete | `7faeb6e` | Added Markdown/JSON knowledge export. |

Verification:

- Backend tests passed after `37b0307`.
- Frontend build passed after `37b0307`.

## v2.8 — Real Tool Router + Plugin System

Epic: `EVO-262`

| Issue | Status | Commit | Summary |
| --- | --- | --- | --- |
| `EVO-263` | Complete | `6e7076e` | Added Tool Registry service and tool metadata endpoints. |
| `EVO-264` | Complete | `6e7076e` | Added local plugin manifest loader with invalid-plugin isolation. |
| `EVO-265` | Complete | `6e7076e` | Integrated Tool Router selection into `/api/run` metadata. |
| `EVO-266` | Complete | `6e7076e` | Added permission-level handling for tools and plugin manifests. |
| `EVO-267` | Complete | `b4d64b6` | Added Developer Mode Tool Trace panel. |

Verification:

- Backend tests passed after `6e7076e`.
- Frontend build passed after `b4d64b6`.

## v2.9 — Approval Workflow 2.0

Epic: `EVO-268`

| Issue | Status | Commit | Summary |
| --- | --- | --- | --- |
| `EVO-269` | Complete | `8116df2` | Added approval chains and approval storage. |
| `EVO-270` | Complete | `e40e62e` | Added Developer Mode Approval Queue UI. |
| `EVO-271` | Complete | `8116df2` | Added approval audit trail and audit endpoint. |
| `EVO-272` | Complete | `8116df2` | Added rejection and rollback records for approval decisions. |
| `EVO-273` | Complete | `8116df2` | Added optional approval webhook notification with safe no-op behavior. |

Verification:

- Backend tests passed after `8116df2`.
- Frontend build passed after `e40e62e`.

## v3.0 — Agent OS Foundation

Epic: `EVO-157`

| Issue | Status | Commit | Summary |
| --- | --- | --- | --- |
| `EVO-158` | Complete | `7e9164c`, `d806da8` | Added Agent Jobs scheduler backend and Developer Mode Agent Jobs UI. |
| `EVO-159` | Complete | `7e9164c`, `d806da8` | Added lifecycle states and pause/resume/cancel/heartbeat controls. |
| `EVO-160` | Complete | `7e9164c`, `d806da8` | Added System Prompt Registry backend and Developer Mode editor panel. |
| `EVO-161` | Complete | `7e9164c` | Added thin Kernel Service around request orchestration without changing `/api/run` behavior. |
| `EVO-162` | Complete | `7e9164c`, `d806da8` | Added agent job health monitoring and Developer Mode health display. |

Verification:

- Backend tests passed after `7e9164c`.
- Frontend build passed after `d806da8`.
- Latest checkpoint verification: backend `98 passed`, frontend build passed.

## v3.5 — UI/UX Professional Polish

Epic: `EVO-163`

| Commit | Summary |
| --- | --- |
| `6aba5df` | Polished Jarvis-style Simple Mode voice/text UI. |
| `56b5431` | Added responsive Jarvis UI polish, theme toggle, onboarding, and accessibility prep. |
| `86bae79` | Reconciled theme tokens across older panels, composer, markdown/code blocks, and controls. |

Manual verification:

- Simple Mode Jarvis UI checked.
- Developer Mode checked.
- Light/dark theme checked.
- Onboarding checked.
- Responsive layout checked.

Verification:

- Frontend build passed after `86bae79`.

## Current Notes

- The Linear panel was removed from the EvolveAgent UI. Linear should be managed in Linear itself.
- Backend Linear/Codex automation services remain available when explicitly configured.
- Full autonomous Codex worker mode is disabled by default.
- Runtime data, uploads, secrets, and local generated files should not be committed.
