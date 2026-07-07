import { NextResponse } from "next/server";
import { CRM_PLAYBOOK_PILOT_DESARROLLO_IDS } from "@/lib/comercial/crm-playbook";
import { sendCadenciaReminderToAsesor } from "@/lib/comercial/cadencia-notifications";
import {
  listCadenciaReminderTargets,
  markCadenciaRemindersSent,
} from "@/lib/comercial/cadencia-service";
import { getMexicoCityParts } from "@/lib/comercial/cadencia-perfilamiento";
import { getCrmPlaybookConfig } from "@/lib/comercial/crm-playbook-service";

const authorizeCron = (request: Request): boolean => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) {
    return true;
  }

  return request.headers.get("x-cron-secret") === secret;
};

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { hour } = getMexicoCityParts();
  const errors: string[] = [];
  let remindersSent = 0;
  let targetsChecked = 0;

  for (const desarrolloId of CRM_PLAYBOOK_PILOT_DESARROLLO_IDS) {
    const config = await getCrmPlaybookConfig(desarrolloId);
    if (!config?.enabled) {
      continue;
    }

    const targets = await listCadenciaReminderTargets(desarrolloId, hour);
    targetsChecked += targets.length;

    for (const target of targets) {
      const result = await sendCadenciaReminderToAsesor(target);

      if (result.sent) {
        remindersSent += 1;
        const touchIds = target.touches.map((item) => item.touch.id);
        await markCadenciaRemindersSent(touchIds);
      } else if (result.error) {
        errors.push(`${target.asesorId}: ${result.error}`);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    mexicoHour: hour,
    targetsChecked,
    remindersSent,
    errors,
  });
}
