/** UUID de admin_profiles o null (operador master / ids sintéticos). Sin next/headers. */

const ADMIN_USER_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const resolveAdminUserIdForDb = (userId: string | null | undefined): string | null => {
  if (!userId || userId === "operador-gabi") {
    return null;
  }
  return ADMIN_USER_UUID.test(userId) ? userId : null;
};
