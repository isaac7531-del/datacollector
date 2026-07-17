export function normaliseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normaliseSearchText(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return normaliseWhitespace(value)
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function namesMatch(left: string | undefined, right: string | undefined): boolean {
  return normaliseSearchText(left) === normaliseSearchText(right);
}

export function compactIdentifier(value: string | undefined): string {
  return normaliseSearchText(value).replace(/\s+/g, "");
}

export function dateOnly(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0];
}
