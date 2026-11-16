"use client";

import { useCurrentUser } from "@/features/auth/use-current-user";
import type { ResourceName } from "@/lib/resources";

export type Permission = { read: boolean; create: boolean; update: boolean; delete: boolean };

type ModuleAccess = { moduleCode?: string } & Partial<Permission>;

/** Module codes from GET /auth/authorization that govern each API resource. */
export const MODULE_BY_RESOURCE: Record<ResourceName, string> = {
  trackers: "API-TRACKER",
  requests: "API-REQUEST",
  trackings: "API-TRACKING",
};

const FULL_ACCESS: Permission = { read: true, create: true, update: true, delete: true };
const READ_ONLY: Permission = { read: true, create: false, update: false, delete: false };

function moduleAccesses(authorization: unknown): ModuleAccess[] | null {
  const root = authorization as { data?: { moduleAccesses?: unknown }; moduleAccesses?: unknown } | null | undefined;
  const list = root?.data?.moduleAccesses ?? root?.moduleAccesses;
  return Array.isArray(list) ? (list as ModuleAccess[]) : null;
}

/**
 * What the user may do with a resource, from the roles returned by /auth/authorization.
 * Several roles are combined (any role that allows an action allows it). If the authorization data
 * isn't available the UI doesn't hide anything: the API enforces permissions either way.
 */
export function readPermissions(authorization: unknown, resource: ResourceName): Permission {
  const accesses = moduleAccesses(authorization);
  if (!accesses) return FULL_ACCESS;

  const entries = accesses.filter((access) => access.moduleCode === MODULE_BY_RESOURCE[resource]);
  if (entries.length === 0) return READ_ONLY;

  return {
    read: entries.some((e) => e.read === true),
    create: entries.some((e) => e.create === true),
    update: entries.some((e) => e.update === true),
    delete: entries.some((e) => e.delete === true),
  };
}

export function usePermissions(resource: ResourceName): Permission {
  const { data } = useCurrentUser();
  return readPermissions(data?.authorization, resource);
}
