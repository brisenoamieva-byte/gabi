import { isGabiOperator } from "@/lib/gabi/operator";

export const assertGabiOperator = (email: string | undefined | null) => {
  if (!isGabiOperator({ email: email?.trim() ?? null })) {
    throw new Error("OPERATOR_FORBIDDEN");
  }
};
