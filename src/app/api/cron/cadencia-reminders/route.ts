import { NextResponse } from "next/server";
import { listDesarrollosWithCrmPlaybookEnabled } from "@/lib/comercial/crm-playbook-enablement";
import { sendCadenciaReminderToAsesor } from "@/lib/comercial/cadencia-notifications";
import {
  listCadenciaDailyReminderTargets,
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

  for (const desarrolloId of await listDesarrollosWithCrmPlaybookEnabled()) {
    const config = await getCrmPlaybookConfig(desarrolloId);
    if (!config?.enabled) {
      continue;
    }

    const targets = await listCadenciaDailyReminderTargets(desarrolloId);
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
