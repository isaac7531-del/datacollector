import { createScaffoldConnector } from "../scaffoldConnector";
import { getRegisteredSource } from "../../sources/sourceRegistry";

export const equestrianAustraliaManifest = getRegisteredSource("equestrian-australia");

export function createEquestrianAustraliaConnector() {
  if (!equestrianAustraliaManifest) throw new Error("equestrian-australia source is not registered.");
  return createScaffoldConnector(equestrianAustraliaManifest);
}
