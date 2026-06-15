import { cookies } from "next/headers";
import {
  GABI_MASTER_COOKIE,
  masterSessionCookieOptions,
  peekMasterSessionEmail,
  signMasterSession,
  verifyMasterSessionValue,
} from "@/lib/gabi/master-session-cookie";

export {
  GABI_MASTER_COOKIE,
  masterSessionCookieOptions,
  peekMasterSessionEmail,
  signMasterSession,
  verifyMasterSessionValue,
};

export async function getMasterSessionEmail(): Promise<string | null> {
  const cookieStore = cookies();
  const value = cookieStore.get(GABI_MASTER_COOKIE)?.value;
  return verifyMasterSessionValue(value);
}
