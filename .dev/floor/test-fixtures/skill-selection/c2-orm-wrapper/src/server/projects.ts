import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { projects } from "../db/schema";

export async function listProjects(orgId: string) {
  return db.select().from(projects).where(eq(projects.orgId, orgId));
}
