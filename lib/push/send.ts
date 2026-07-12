import webpush from "web-push";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Sends a Web Push notification to every resident's stored subscription
// when an admin publishes a page edit (called from lib/actions/admin.ts).
// Uses the service-role client because reading *all* subscriptions across
// every user is exactly what push_subscriptions' RLS policy ("manage own")
// forbids for a normal user-scoped client -- this is a deliberately
// privileged, server-only operation.
export async function notifyResidentsOfPageUpdate(params: {
  sectionNameHe: string;
  pageTitleHe: string;
  url: string;
}) {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    // VAPID keys not configured yet (see .env.local.example) -- publishing
    // still succeeds, notifications are just skipped rather than failing
    // the whole publish action.
    return;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const supabase = createServiceRoleClient();
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, subscription");
  if (!subscriptions?.length) return;

  const payload = JSON.stringify({
    title: `${params.sectionNameHe} עודכן`,
    body: params.pageTitleHe,
    url: params.url,
  });

  await Promise.all(
    subscriptions.map(async (row: { id: string; subscription: webpush.PushSubscription }) => {
      try {
        await webpush.sendNotification(row.subscription, payload);
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        // 404/410 means the browser subscription no longer exists (user
        // cleared data, uninstalled, etc.) -- prune it so we stop retrying.
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", row.id);
        }
      }
    })
  );
}
