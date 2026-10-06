import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function PATCH(req: Request) {
  const session = await getSession(req);
  const body = await req.json();
  await db.update(users).set({ displayName: body.displayName, bio: body.bio }).where(eq(users.id, session.userId));
  return NextResponse.json({ ok: true });
}
