import { redirect } from "next/navigation";
import { requireOwner, HttpError } from "@/lib/server";
import { listJobs } from "@/lib/jobs";
import Hub from "@/components/hub";
export const dynamic = "force-dynamic";
export default async function Home() {
  let user;
  try {
    user = await requireOwner();
  } catch (e) {
    if (e instanceof HttpError) redirect("/sign-in");
    throw e;
  }
  return <Hub initialJobs={await listJobs(user.id)} ownerName={user.name} />;
}
