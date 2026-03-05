import { NextResponse } from "next/server";
import { getAuthUser, signAccessToken } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ token: null }, { status: 401 });
    }
    const token = signAccessToken({ userId: user.userId, email: user.email });
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ token: null }, { status: 500 });
  }
}
