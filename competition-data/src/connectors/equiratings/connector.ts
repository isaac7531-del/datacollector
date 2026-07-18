import { createScaffoldConnector } from "../scaffoldConnector";
import { getRegisteredSource } from "../../sources/sourceRegistry";

export const equiratingsManifest = getRegisteredSource("equiratings");

export function createEquiratingsConnector() {
  if (!equiratingsManifest) throw new Error("equiratings source is not registered.");
  return createScaffoldConnector(equiratingsManifest);
}
