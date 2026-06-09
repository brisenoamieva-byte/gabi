import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SALT_LEN = 16;
const KEY_LEN = 64;

export const isValidShareCode = (code: string) => /^\d{6}$/.test(code);

export const generateShareCode = () =>
  String(Math.floor(100000 + Math.random() * 900000));

export const hashShareCode = (code: string) => {
  if (!isValidShareCode(code)) {
    throw new Error("El código debe ser de 6 dígitos.");
  }

  const salt = randomBytes(SALT_LEN);
  const hash = scryptSync(code, salt, KEY_LEN);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
};

export const verifyShareCode = (code: string, stored: string) => {
  if (!isValidShareCode(code)) {
    return false;
  }

  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) {
    return false;
  }

  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(code, salt, KEY_LEN);
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
};

export const generateShareToken = () => randomBytes(18).toString("base64url");
