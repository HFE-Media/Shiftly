import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type InvitePayload = {
  company_id?: string;
  email?: string;
  full_name?: string;
  role?: "owner" | "admin" | "supervisor" | "employee" | "viewer";
  employee_id?: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const user = data.users.find((u) => cleanEmail(u.email) === email);
    if (user) return user;
    if (data.users.length < 1000) return null;
  }

  return null;
}

function isUserAlreadyExistsError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("already") || lower.includes("registered") || lower.includes("exists");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const siteUrl = Deno.env.get("SHIFTLY_SITE_URL") || "https://project-qj3xc.vercel.app";

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Edge Function secrets are not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace("Bearer ", "").trim();
  if (!jwt) return json({ error: "Authentication required" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: requester, error: requesterError } = await admin.auth.getUser(jwt);
  if (requesterError || !requester.user) {
    return json({ error: "Invalid session" }, 401);
  }

  const { data: platformAdmin, error: platformAdminError } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", requester.user.id)
    .eq("active", true)
    .maybeSingle();

  if (platformAdminError) return json({ error: platformAdminError.message }, 500);
  if (!platformAdmin) return json({ error: "Platform admin access required" }, 403);

  const payload = (await req.json()) as InvitePayload;
  const companyId = String(payload.company_id || "").trim();
  const email = cleanEmail(payload.email);
  const fullName = String(payload.full_name || "").trim();
  const employeeId = String(payload.employee_id || "").trim().toUpperCase() || null;
  const role = payload.role || "owner";

  if (!companyId) return json({ error: "company_id is required" }, 400);
  if (!email) return json({ error: "email is required" }, 400);
  if (!fullName) return json({ error: "full_name is required" }, 400);
  if (!["owner", "admin", "supervisor", "employee", "viewer"].includes(role)) {
    return json({ error: "Invalid role" }, 400);
  }

  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("id,name")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) return json({ error: companyError.message }, 500);
  if (!company) return json({ error: "Company not found" }, 404);

  let invitedUser = await findUserByEmail(admin, email);
  let inviteSent = false;

  if (!invitedUser) {
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, name: fullName, company_id: companyId, company_name: company.name, role },
      redirectTo: siteUrl,
    });

    if (inviteError) {
      if (!isUserAlreadyExistsError(inviteError.message)) {
        return json({ error: inviteError.message }, 400);
      }
      invitedUser = await findUserByEmail(admin, email);
      if (!invitedUser) return json({ error: inviteError.message }, 400);
    } else {
      invitedUser = inviteData.user;
      inviteSent = true;
    }
  }

  if (!invitedUser?.id) return json({ error: "Unable to resolve invited user" }, 500);

  const { error: membershipError } = await admin
    .from("company_users")
    .upsert(
      {
        company_id: companyId,
        user_id: invitedUser.id,
        email,
        full_name: fullName,
        role,
        employee_id: employeeId,
        active: true,
      },
      { onConflict: "company_id,user_id" },
    );

  if (membershipError) return json({ error: membershipError.message }, 500);

  return json({
    ok: true,
    company_id: companyId,
    company_name: company.name,
    user_id: invitedUser.id,
    email,
    full_name: fullName,
    role,
    employee_id: employeeId,
    invite_sent: inviteSent,
  });
});
