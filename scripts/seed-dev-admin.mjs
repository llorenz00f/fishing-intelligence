import { createClient } from "@supabase/supabase-js";

if (process.env.NODE_ENV === "production" || process.env.DEV_ADMIN_ENABLE !== "true") {
  throw new Error("Dev admin seed disabled. Set DEV_ADMIN_ENABLE=true only in a local environment.");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.DEV_ADMIN_EMAIL;
const password = process.env.DEV_ADMIN_PASSWORD;
if (!url || !serviceRoleKey || !email || !password) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEV_ADMIN_EMAIL and DEV_ADMIN_PASSWORD.");
}
if (password.length < 8) throw new Error("DEV_ADMIN_PASSWORD must contain at least 8 characters.");

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await supabase.auth.admin.createUser({
  email, password, email_confirm: true,
  user_metadata: { display_name: "admin", is_beta_tester: true },
});
if (error && error.code !== "email_exists") throw error;
let user = data.user;
if (!user) {
  const { data: users, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  user = users.users.find(item => item.email?.toLowerCase() === email.toLowerCase());
}
if (!user) throw new Error("Admin user not found after seed.");
const { error: profileError } = await supabase.from("profiles").update({ display_name: "admin", role: "admin", is_beta_tester: true, plan: "CAPTAIN" }).eq("id", user.id);
if (profileError) throw profileError;
console.log(`Development admin ready: ${email}`);
