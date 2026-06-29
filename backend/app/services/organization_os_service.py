from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from app.models.response_models import GovernanceEvent
from app.services.governance_service import GovernanceService
from app.services.storage_service import StorageService

ROLES = ["owner", "admin", "manager", "contributor", "viewer"]
# Default permission profiles per role (advisory/local only — NOT enforced auth).
_ROLE_PERMISSIONS = {
    "owner": ["manage_org", "manage_members", "manage_roles", "edit", "view"],
    "admin": ["manage_members", "manage_roles", "edit", "view"],
    "manager": ["manage_members", "edit", "view"],
    "contributor": ["edit", "view"],
    "viewer": ["view"],
}


class OrganizationOSService:
    """v38.0 Multi-User Organization OS (local planning/structure only).

    A local organization/team/workspace model: organizations, member profiles,
    roles, permission profiles, workspace links, and an activity log. This is NOT
    production auth and adds NO real user login — member records are local
    planning data only. Stateful actions are governance-logged.
    """

    organizations_file = "organizations.json"
    members_file = "organization_members.json"
    roles_file = "organization_roles.json"
    permissions_file = "organization_permissions.json"
    workspaces_file = "organization_workspaces.json"
    activity_file = "organization_activity.json"

    def __init__(self, storage: StorageService, governance_service: GovernanceService):
        self.storage = storage
        self.governance = governance_service

    def _now(self) -> str:
        return datetime.now(UTC).isoformat()

    def _clean(self, value, max_length: int, default: str = "") -> str:
        return str(value if value is not None else default).strip()[:max_length]

    def _enum(self, value, allowed: list[str], default: str) -> str:
        candidate = str(value or "").strip().lower()
        return candidate if candidate in allowed else default

    def _string_list(self, values, limit: int = 30, item_max: int = 120) -> list[str]:
        cleaned: list[str] = []
        for value in values or []:
            text = str(value).strip()[:item_max]
            if text and text not in cleaned:
                cleaned.append(text)
            if len(cleaned) >= limit:
                break
        return cleaned

    def _activity(self, event: str, ref_id: str, detail: str) -> None:
        self.storage.append(
            self.activity_file,
            {"activity_id": str(uuid4()), "event": event, "ref_id": ref_id, "detail": detail, "created_at": self._now()},
        )

    def _log(self, action_type: str, reason: str) -> None:
        self.governance.log_event(
            GovernanceEvent(
                task_type="organization_os",
                agent_name="Organization OS",
                action_type=action_type,
                tool_used="OrganizationOSService",
                permission_level="read_only",
                approved=True,
                blocked=False,
                risk_score=5,
                reason=reason,
            )
        )

    # ------------------------------------------------------------------
    # Organizations
    # ------------------------------------------------------------------
    def list_organizations(self) -> list[dict]:
        return self.storage.read_list(self.organizations_file)

    def get_organization(self, organization_id: str) -> dict | None:
        return next((o for o in self.storage.read_list(self.organizations_file) if o.get("organization_id") == organization_id), None)

    def create_organization(self, data: dict) -> dict:
        org = {
            "organization_id": str(uuid4()),
            "name": self._clean(data.get("name"), 160) or "Organization",
            "description": self._clean(data.get("description"), 2000),
            "is_local_record": True,
            "created_at": self._now(),
            "updated_at": self._now(),
        }
        self.storage.append(self.organizations_file, org)
        self._activity("organization_created", org["organization_id"], f"Created organization {org['name']}.")
        self._log("organization_created", f"Created organization {org['name']} (local record, no auth).")
        return org

    # ------------------------------------------------------------------
    # Members
    # ------------------------------------------------------------------
    def list_members(self) -> list[dict]:
        return self.storage.read_list(self.members_file)

    def create_member(self, data: dict) -> dict:
        role = self._enum(data.get("role"), ROLES, "contributor")
        member = {
            "member_id": str(uuid4()),
            "organization_id": self._clean(data.get("organization_id"), 120) or None,
            "display_name": self._clean(data.get("display_name"), 160) or "Member",
            "role": role,
            "permissions": list(_ROLE_PERMISSIONS[role]),
            "active": True,
            "is_local_profile": True,
            "created_at": self._now(),
            "updated_at": self._now(),
        }
        self.storage.append(self.members_file, member)
        self._activity("member_added", member["member_id"], f"Added member {member['display_name']} as {role}.")
        self._log("organization_member_created", f"Added local member profile {member['member_id']} ({role}).")
        return member

    def update_member(self, member_id: str, updates: dict) -> dict:
        members = self.storage.read_list(self.members_file)
        member = next((m for m in members if m.get("member_id") == member_id), None)
        if member is None:
            raise ValueError("Member not found")
        if updates.get("display_name") is not None:
            member["display_name"] = self._clean(updates["display_name"], 160) or member["display_name"]
        if updates.get("role") is not None:
            member["role"] = self._enum(updates["role"], ROLES, member["role"])
            member["permissions"] = list(_ROLE_PERMISSIONS[member["role"]])
        if updates.get("active") is not None:
            member["active"] = bool(updates["active"])
        member["updated_at"] = self._now()
        self.storage.write_list(self.members_file, members)
        self._activity("member_updated", member_id, f"Updated member {member_id}.")
        self._log("organization_member_updated", f"Updated member {member_id}.")
        return member

    # ------------------------------------------------------------------
    # Roles
    # ------------------------------------------------------------------
    def list_roles(self) -> list[dict]:
        stored = self.storage.read_list(self.roles_file)
        defaults = [{"role": r, "permissions": _ROLE_PERMISSIONS[r], "built_in": True} for r in ROLES]
        return defaults + stored

    def create_role(self, data: dict) -> dict:
        role = {
            "role_id": str(uuid4()),
            "name": self._clean(data.get("name"), 80) or "custom_role",
            "permissions": self._string_list(data.get("permissions")),
            "built_in": False,
            "created_at": self._now(),
        }
        self.storage.append(self.roles_file, role)
        self.storage.append(self.permissions_file, {"role_id": role["role_id"], "permissions": role["permissions"], "created_at": self._now()})
        self._activity("role_created", role["role_id"], f"Created custom role {role['name']}.")
        self._log("organization_role_created", f"Created custom role {role['name']}.")
        return role

    # ------------------------------------------------------------------
    # Workspace links
    # ------------------------------------------------------------------
    def create_workspace_link(self, data: dict) -> dict:
        link = {
            "link_id": str(uuid4()),
            "organization_id": self._clean(data.get("organization_id"), 120) or None,
            "workspace_id": self._clean(data.get("workspace_id"), 120) or None,
            "workspace_name": self._clean(data.get("workspace_name"), 160),
            "created_at": self._now(),
        }
        self.storage.append(self.workspaces_file, link)
        self._activity("workspace_linked", link["link_id"], f"Linked workspace to org {link['organization_id']}.")
        self._log("organization_workspace_linked", f"Linked workspace {link['workspace_id']} to org {link['organization_id']}.")
        return link

    def list_workspace_links(self) -> list[dict]:
        return self.storage.read_list(self.workspaces_file)

    # ------------------------------------------------------------------
    # Activity + dashboard
    # ------------------------------------------------------------------
    def activity_log(self, limit: int = 50) -> list[dict]:
        return list(reversed(self.storage.read_list(self.activity_file)[-limit:]))

    def dashboard(self) -> dict:
        members = self.list_members()
        role_counts: dict[str, int] = {}
        for member in members:
            role_counts[member.get("role", "viewer")] = role_counts.get(member.get("role", "viewer"), 0) + 1
        return {
            "organization_count": len(self.list_organizations()),
            "member_count": len(members),
            "active_member_count": sum(1 for m in members if m.get("active", True)),
            "role_distribution": role_counts,
            "custom_role_count": len(self.storage.read_list(self.roles_file)),
            "workspace_link_count": len(self.list_workspace_links()),
            "activity_event_count": len(self.storage.read_list(self.activity_file)),
            "available_roles": ROLES,
            "note": "Local organization records only — no production authentication or real user login.",
        }
