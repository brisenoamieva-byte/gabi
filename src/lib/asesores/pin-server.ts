import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { isValidPin } from "@/lib/asesores/pin-utils";

const SALT_LEN = 16;
const KEY_LEN = 64;

export { isValidPin } from "@/lib/asesores/pin-utils";

export const hashPin = (pin: string) => {
  if (!isValidPin(pin)) {
    throw new Error("El PIN debe ser de 4 dígitos.");
  }

  const salt = randomBytes(SALT_LEN);
  const hash = scryptSync(pin, salt, KEY_LEN);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
};

export const verifyPin = (pin: string, stored: string) => {
  if (!isValidPin(pin)) {
    return false;
  }

  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) {
    return false;
  }

  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(pin, salt, KEY_LEN);
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
};
