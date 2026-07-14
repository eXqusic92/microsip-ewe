---
type: "query"
date: "2026-07-10T10:18:48.438543+00:00"
question: "Why were restricted navigation tabs still visible to ordinary users?"
contributor: "graphify"
source_nodes: ["renderProfileMenu", "app-tabs"]
---

# Q: Why were restricted navigation tabs still visible to ordinary users?

## Answer

The role renderer correctly set the hidden property, but the app-tabs anchor CSS forced display:inline-flex. A scoped .app-tabs a[hidden] { display:none; } rule now ensures hidden restricted tabs disappear while admins and department heads can still reveal them.

## Source Nodes

- renderProfileMenu
- app-tabs