export const SHIP_STEP_IDS = ["build", "checks", "database", "publish", "golive", "verify"] as const;
export type ShipStepId = (typeof SHIP_STEP_IDS)[number];
export type ShipStepStatus = "pending" | "running" | "done" | "failed" | "skipped";
export type ShipFailureCode = "checks-failed" | "destructive-migration" | "rehearsal-failed" | "restore-unavailable" | "migration-failed" | "main-moved" | "publish-failed" | "deploy-failed" | "verify-failed";
export type ProductionChanged = "no" | "database" | "code-on-main" | "live";
