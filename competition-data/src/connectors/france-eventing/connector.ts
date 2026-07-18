import { createScaffoldConnector } from "../scaffoldConnector";
import { getRegisteredSource } from "../../sources/sourceRegistry";

export const franceEventingManifest = getRegisteredSource("france-eventing");

export function createFranceEventingConnector() {
  if (!franceEventingManifest) throw new Error("france-eventing source is not registered.");
  return createScaffoldConnector(franceEventingManifest);
}
