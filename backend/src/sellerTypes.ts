/**
 * Single source of truth for Area -> Seller Type options on the backend.
 * Mirror any change here in frontend/src/config/sellerTypes.ts.
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

export function isValidArea(value: string): value is Area {
  return (AREAS as string[]).includes(value);
}

export function isValidSellerType(area: Area, sellerType: string): boolean {
  return (sellerTypesByArea[area] as readonly string[]).includes(sellerType);
}
