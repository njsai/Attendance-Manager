import { db } from "@workspace/db";
import {
  companiesTable,
  superAdminsTable,
  branchesTable,
  departmentsTable,
  shiftsTable,
  employeesTable,
  settingsTable,
  companyLocationTable,
} from "@workspace/db";
import { sql, isNull } from "drizzle-orm";
import crypto from "crypto";

function hashPassword(p: string) {
  return crypto.createHash("sha256").update(p + "salt_attend_2024").digest("hex");
}

async function main() {
  console.log("Starting multi-tenancy migration...");

  // 1. Create default company
  const [company] = await db
    .insert(companiesTable)
    .values({
      name: "شركة الحضور النموذجية",
      address: "بغداد، العراق",
      phone: "07700000000",
      email: "admin@attendance.iq",
      isActive: true,
    })
    .onConflictDoNothing()
    .returning();

  let companyId: number;
  if (company) {
    companyId = company.id;
    console.log("Created default company, id:", companyId);
  } else {
    const existing = await db.select().from(companiesTable).limit(1);
    companyId = existing[0].id;
    console.log("Using existing company, id:", companyId);
  }

  // 2. Assign company_id to all orphaned records
  await db.execute(sql`UPDATE branches SET company_id = ${companyId} WHERE company_id IS NULL`);
  await db.execute(sql`UPDATE departments SET company_id = ${companyId} WHERE company_id IS NULL`);
  await db.execute(sql`UPDATE shifts SET company_id = ${companyId} WHERE company_id IS NULL`);
  await db.execute(sql`UPDATE employees SET company_id = ${companyId} WHERE company_id IS NULL`);
  await db.execute(sql`UPDATE settings SET company_id = ${companyId} WHERE company_id IS NULL`);
  await db.execute(sql`UPDATE company_location SET company_id = ${companyId} WHERE company_id IS NULL`);

  console.log("Assigned company_id to all existing records.");

  // 3. Create super admin account
  await db
    .insert(superAdminsTable)
    .values({
      username: "superadmin",
      passwordHash: hashPassword("superadmin123"),
      fullName: "مدير النظام الرئيسي",
      email: "superadmin@system.iq",
    })
    .onConflictDoUpdate({
      target: superAdminsTable.username,
      set: { passwordHash: hashPassword("superadmin123") },
    });

  console.log("Super admin created: superadmin / superadmin123");

  // 4. Ensure default company location exists
  const locs = await db.select().from(companyLocationTable);
  if (locs.length === 0) {
    await db.insert(companyLocationTable).values({
      companyId,
      name: "المقر الرئيسي",
      latitude: 33.3152,
      longitude: 44.3661,
      radiusMeters: 200,
    });
    console.log("Created default company location.");
  }

  // Verify
  const emps = await db.select({ username: employeesTable.username, companyId: employeesTable.companyId }).from(employeesTable);
  console.log("Employees:", emps.map(e => `${e.username}(co:${e.companyId})`).join(", "));

  console.log("Migration complete!");
  process.exit(0);
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
