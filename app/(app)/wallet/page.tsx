import { redirect } from "next/navigation";

/** Old URL: the app home now lives at /app. Keeps ?account= for shared links. */
export default async function WalletRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) if (typeof v === "string") q.set(k, v);
  redirect(`/app${q.size ? `?${q}` : ""}`);
}
