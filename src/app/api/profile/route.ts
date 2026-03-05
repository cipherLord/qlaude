import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { displayName, bio, avatarUrl } = body;

    await dbConnect();

    const updateFields: Record<string, unknown> = {};

    if (typeof displayName === "string") {
      const trimmed = displayName.trim();
      if (trimmed.length < 1 || trimmed.length > 50) {
        return NextResponse.json(
          { error: "Display name must be 1-50 characters" },
          { status: 400 }
        );
      }
      updateFields.displayName = trimmed;
    }

    if (bio !== undefined) {
      if (bio === null || bio === "") {
        updateFields.bio = null;
      } else if (typeof bio === "string") {
        const trimmed = bio.trim();
        if (trimmed.length > 200) {
          return NextResponse.json(
            { error: "Bio must be 200 characters or less" },
            { status: 400 }
          );
        }
        updateFields.bio = trimmed;
      }
    }

    if (typeof avatarUrl === "string") {
      if (avatarUrl && !avatarUrl.startsWith("/uploads/")) {
        return NextResponse.json(
          { error: "Invalid avatar URL" },
          { status: 400 }
        );
      }
      updateFields.avatarUrl = avatarUrl || null;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndUpdate(
      authUser.userId,
      { $set: updateFields },
      { new: true }
    ).select("-passwordHash");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
