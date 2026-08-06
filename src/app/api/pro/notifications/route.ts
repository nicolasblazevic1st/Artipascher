import { NextRequest, NextResponse } from "next/server";
import { getProSession } from "@/lib/pro-auth";
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
  markNotificationsRead,
} from "@/lib/store";

export async function GET() {
  const session = await getProSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    getNotificationsForUser("pro", session.proId),
    getUnreadNotificationCount("pro", session.proId),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function POST(request: NextRequest) {
  const session = await getProSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let ids: string[] | undefined;
  try {
    const body = await request.json();
    if (Array.isArray(body.ids)) {
      ids = body.ids.filter((id: unknown): id is string => typeof id === "string");
    }
  } catch {
    ids = undefined;
  }

  const marked = await markNotificationsRead("pro", session.proId, ids);
  return NextResponse.json({ success: true, marked });
}
