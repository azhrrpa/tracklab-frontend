/** Columns every table shares (created_by, created_on, ...). */
export type AuditColumns = {
  id: string;
  createdBy?: string | null;
  createdOn?: string | null;
  lastUpdatedBy?: string | null;
  lastUpdatedOn?: string | null;
  isActive?: boolean;
};

/** m_trackers: one step a request can go through. */
export type Tracker = AuditColumns & {
  code: string;
  parentCode?: string | null;
  description: string;
  actionType: string;
  moduleFlow: string;
  isUsingNotification: boolean;
  isPublic: boolean;
  icon?: string | null;
  order: number;
  mandays?: number | null;
  isParallel: boolean;
};

/** t_request_headers: a lab analysis request. Partner name fields are optional extras some responses include. */
export type LabRequest = AuditColumns & {
  partnerId: string;
  partnerName?: string | null;
  companyName?: string | null;
  partner?: { name?: string | null; partnerName?: string | null } | null;
  projectCode: string;
  requestDate?: string | null;
  /** Computed by the API: requestDate + leadTime days. Read-only. */
  dueDate?: string | null;
  receivingStatus?: string | null;
  totalFee: number;
  receivedDate?: string | null;
  lastStatus?: string | null;
  analysisWipDate?: string | null;
  analysisCompletedDate?: string | null;
  leadTime?: number | null;
};

/**
 * t_trackings: request X reached tracker step Y, with an optional value.
 * The list endpoint also joins the tracker's fields (trackerDescription, trackerIcon, ...),
 * so a step can still be shown after its tracker has been deleted.
 */
export type Tracking = AuditColumns & {
  trackerId: string;
  trackerCode?: string | null;
  requestId: string;
  partnerId: string;
  value?: string | null;
  trackerDescription?: string | null;
  trackerParentCode?: string | null;
  trackerActionType?: string | null;
  trackerModuleFlow?: string | null;
  trackerIcon?: string | null;
  trackerOrder?: number | null;
  trackerMandays?: number | null;
  trackerIsParallel?: boolean | null;
  trackerIsPublic?: boolean | null;
  trackerIsUsingNotification?: boolean | null;
};

export type CurrentUser = {
  username: string;
  displayName: string;
  authorization?: unknown;
};

export type AuditAction = "Create" | "Update" | "Delete" | "HardDelete";

export type AuditEntry = {
  id: string;
  timestamp: string;
  user: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  changes: { field: string; oldValue: string | null; newValue: string | null }[];
  before?: unknown;
  after?: unknown;
  correlationId?: string | null;
};

export type LogRecord = {
  timestamp: string;
  level: string;
  category: string;
  message: string;
  exception?: string | null;
  correlationId?: string | null;
};

export type Paged<T> = {
  items: T[];
  total: number | null;
  /** Set when the API couldn't sort by the requested column and the backend fell back to the default order. */
  sortFallback?: string | null;
};

export type SortOrder = "ASC" | "DESC";

export type PageParams = {
  offset: number;
  limit: number;
  sortBy?: string;
  sortOrder: SortOrder;
  search?: string;
};
