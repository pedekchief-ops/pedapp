"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// RLS (supabase/migrations/0016_feedback.sql) lets any signed-in user
// insert -- the name field is genuinely optional, same as the request.
export async function submitFeedback(params: { name: string; message: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  const message = params.message.trim();
  if (!message) throw new Error("empty message");

  const { error } = await supabase.from("feedback_submissions").insert({
    name: params.name.trim() || null,
    message,
    created_by: user.id,
  });
  if (error) throw error;

  revalidatePath("/admin");
}
