import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("the public email field is readable and editable without granting access to store secrets", () => {
  const sql = readFileSync("drizzle/migrations/0013_store_business_email_column_access.sql", "utf8");
  for (const privilege of ["SELECT", "UPDATE", "INSERT"]) {
    expect(sql).toContain(`GRANT ${privilege} (business_email) ON public.stores TO authenticated;`);
  }
  expect(sql).not.toMatch(/GRANT\s+(SELECT|ALL)(?:\s+PRIVILEGES)?\s+ON\s+public\.stores/i);
  expect(sql).not.toMatch(/\bTO\s+anon\b/i);
});