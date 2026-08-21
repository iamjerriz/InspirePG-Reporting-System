/**
 * Single source of truth for Area -> Seller Type options on the frontend.
 * Mirror any change here in backend/src/sellerTypes.ts - the backend is the
 * one that actually enforces which combinations are accepted.
 *
 * Note: the "BaMiro" area covers Batangas/Mindoro. The source spec listed a
 * generic "EMVIEM" seller type for BaMiro and, separately, "BATANGAS EMVIEM"
 * / "MINDORO EMVIEM" for the Batangas/Mindoro split. This config keeps the
 * two region-specific options and drops the generic one - adjust below if
 * that reading is wrong.
 */
export const sellerTypesByArea = {
  Cavite: ["FSE BAU", "FSE TB", "CBA", "Wiredup", "PTM", "ConnectPro"],
  Laguna: ["FSE BAU", "FSE TB", "CBA", "GMC", "JASS", "NOAH GENESIS"],
  BaMiro: ["FSE BAU", "FSE TB", "STL", "CBA", "BATANGAS EMVIEM", "MINDORO EMVIEM"],
  "Quezon Province": ["FSE BAU", "CBA INHOUSE", "CBA RCJC", "STL"],
  Bicol: ["FSE BAU", "STL", "CBA TEAMBASED", "CBA INHOUSE", "RMS"],
} as const;

export type Area = keyof typeof sellerTypesByArea;

export const AREAS = Object.keys(sellerTypesByArea) as Area[];
