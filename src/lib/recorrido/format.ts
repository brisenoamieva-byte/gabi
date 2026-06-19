import { formatPrice } from "@/lib/data";

export const formatRecorridoMoney = (value: number) => formatPrice(Math.max(0, value));
