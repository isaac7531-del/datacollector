import { createScaffoldConnector } from "../scaffoldConnector";
import { getRegisteredSource } from "../../sources/sourceRegistry";

export const useaManifest = getRegisteredSource("usea");

export function createUseaConnector() {
  if (!useaManifest) throw new Error("usea source is not registered.");
  return createScaffoldConnector(useaManifest);
}
