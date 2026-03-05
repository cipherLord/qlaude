import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";
import {
  verifyAccessToken,
  verifyRefreshToken,
  signAccessToken,
  setAuthCookies,
  signRefreshToken,
  clearAuthCookies,
} from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    const refreshToken = cookieStore.get("refreshToken")?.value;

    let payload = null;

    if (accessToken) {
      try {
        payload = verifyAccessToken(accessToken);
      } catch {
        // Access token expired, try refresh
      }
    }

    if (!payload && refreshToken) {
      try {
        payload = verifyRefreshToken(refreshToken);
        const newAccessToken = signAccessToken({
          userId: payload.userId,
          email: payload.email,
        });
        const newRefreshToken = signRefreshToken({
          userId: payload.userId,
          email: payload.email,
        });
        setAuthCookies(cookieStore, newAccessToken, newRefreshToken);
      } catch {
        clearAuthCookies(cookieStore);
        return NextResponse.json({ user: null }, { status: 401 });
      }
    }

    if (!payload) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findById(payload.userId).select(
      "-passwordHash"
    );

    if (!user) {
      clearAuthCookies(cookieStore);
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio || null,
        activeRoomId: user.activeRoomId,
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  clearAuthCookies(cookieStore);
  return NextResponse.json({ success: true });
}
