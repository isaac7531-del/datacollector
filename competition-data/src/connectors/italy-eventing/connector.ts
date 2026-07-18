import { createScaffoldConnector } from "../scaffoldConnector";
import { getRegisteredSource } from "../../sources/sourceRegistry";

export const italyEventingManifest = getRegisteredSource("italy-eventing");

export function createItalyEventingConnector() {
  if (!italyEventingManifest) throw new Error("italy-eventing source is not registered.");
  return createScaffoldConnector(italyEventingManifest);
}
