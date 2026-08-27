import { redirect } from "next/navigation";

export default async function EnemyRedirectPage({
  params,
}: {
  params: Promise<{ enemy: string }>;
}) {
  const { enemy } = await params;
  redirect(`/database/enemies/${enemy}`);
}
