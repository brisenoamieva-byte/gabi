import Link from "next/link";

export function DmbAdminBackLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/admin/dmb"
      className={`text-xs font-semibold text-dmb-accent hover:underline ${className}`.trim()}
    >
      ← Admin DMB
    </Link>
  );
}
