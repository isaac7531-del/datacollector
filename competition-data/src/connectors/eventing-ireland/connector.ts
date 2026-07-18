import { createScaffoldConnector } from "../scaffoldConnector";
import { getRegisteredSource } from "../../sources/sourceRegistry";

export const eventingIrelandManifest = getRegisteredSource("eventing-ireland");

export function createEventingIrelandConnector() {
  if (!eventingIrelandManifest) throw new Error("eventing-ireland source is not registered.");
  return createScaffoldConnector(eventingIrelandManifest);
}
