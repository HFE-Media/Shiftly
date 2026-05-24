# Shiftly Workforce

Shiftly is a premium multi-company workforce clocking platform built with a static frontend, Supabase, Vercel, and Firebase Hosting.

## Live Deployments

- Vercel: https://project-qj3xc.vercel.app
- Firebase Hosting: https://shiftly-21919.web.app

## What Is Included

- Multi-company login and role-based dashboards
- Platform admin dashboard for managing companies
- Company dashboard for users, employees, supervisors, sites, payroll, logos, and clock events
- Supervisor clocking screen for QR-based employee clocking
- Employee dashboard with personal payroll and payslip access
- Supabase Edge Function for inviting company users
- SQL migration/setup scripts in `database/`

## Local Preview

```powershell
node dev-server.js 5191
```

Then open:

```text
http://127.0.0.1:5191/
```

## Deploy

Deploy to Vercel:

```powershell
npx vercel --prod
```

Deploy to Firebase Hosting:

```powershell
npx firebase-tools deploy --only hosting --project shiftly-21919
```

Deploy the invite Edge Function:

```powershell
npx supabase functions deploy invite-company-user --project-ref szougedvngaoratbtars
```

## Configuration

Frontend Supabase settings live in `public/config.js`. It uses the Supabase URL and public anon key only.

Server-side secrets for Supabase functions must stay in Supabase function secrets or local `.env` files. Do not commit service-role keys or access tokens.
