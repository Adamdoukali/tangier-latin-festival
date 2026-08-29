/** Build a compact international phone number from a selected calling code
 * and the number typed by the user. Existing +/00 international numbers are
 * preserved, while a local trunk zero is removed before adding the code. */
export function formatInternationalPhone(
  phone: string | null | undefined,
  dialCode: string | null | undefined = "+212",
): string {
  const raw = (phone || "").trim();
  if (!raw) return "";

  const compact = raw.replace(/[\s().-]+/g, "");
  if (compact.startsWith("+")) return `+${compact.slice(1).replace(/\D/g, "")}`;
  if (compact.startsWith("00")) return `+${compact.slice(2).replace(/\D/g, "")}`;

  const numberDigits = compact.replace(/\D/g, "");
  const dialDigits = (dialCode || "+212").replace(/\D/g, "");
  if (!numberDigits) return "";
  if (dialDigits && numberDigits.startsWith(dialDigits)) return `+${numberDigits}`;

  const localNumber = numberDigits.replace(/^0+/, "");
  return `+${dialDigits}${localNumber}`;
}
