import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";
import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
} from "@/lib/auth";

const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[0-9]/.test(password))
    return "Password must contain at least one number";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, displayName, username } = body;

    if (!email || !password || !displayName || !username) {
      return NextResponse.json(
        { error: "Email, username, password, and display name are required" },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim().toLowerCase();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      return NextResponse.json(
        { error: "Username must be between 3 and 30 characters" },
        { status: 400 }
      );
    }
    if (!USERNAME_RE.test(trimmedUsername)) {
      return NextResponse.json(
        {
          error:
            "Username can only contain letters, numbers, and underscores",
        },
        { status: 400 }
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    if (displayName.trim().length === 0) {
      return NextResponse.json(
        { error: "Display name is required" },
        { status: 400 }
      );
    }
    if (displayName.length > 50) {
      return NextResponse.json(
        { error: "Display name must be at most 50 characters" },
        { status: 400 }
      );
    }

    await dbConnect();

    const [existingEmail, existingUsername] = await Promise.all([
      User.findOne({ email: email.toLowerCase().trim() }),
      User.findOne({ username: trimmedUsername }),
    ]);

    if (existingEmail) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }
    if (existingUsername) {
      return NextResponse.json(
        { error: "This username is already taken" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      email: email.toLowerCase().trim(),
      username: trimmedUsername,
      passwordHash,
      displayName: displayName.trim(),
    });

    const payload = { userId: user._id.toString(), email: user.email };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const cookieStore = await cookies();
    setAuthCookies(cookieStore, accessToken, refreshToken);

    return NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
