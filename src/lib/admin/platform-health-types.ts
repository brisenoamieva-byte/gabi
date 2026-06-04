export type PlatformHealthCheck = {
  id: string;
  label: string;
  migrationFile: string;
  ok: boolean;
  detail: string;
};

export type PlatformHealth = {
  ok: boolean;
  supabaseConfigured: boolean;
  parseurSecretConfigured: boolean;
  checks: PlatformHealthCheck[];
};
