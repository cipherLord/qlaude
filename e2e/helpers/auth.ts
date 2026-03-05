import { APIRequestContext, Browser, BrowserContext } from "@playwright/test";

export interface TestUser {
  email: string;
  password: string;
  displayName: string;
  username: string;
}

let counter = 0;

function shortId(): string {
  counter += 1;
  return `${Date.now().toString(36)}${counter.toString(36)}`;
}

export function generateUser(role: string): TestUser {
  const id = shortId();
  return {
    email: `e2e_${role}_${id}@test.local`,
    password: "TestPass123!",
    displayName: `${role}_${id}`,
    username: `t${id}`,
  };
}

export async function registerUserViaAPI(
  request: APIRequestContext,
  user: TestUser
): Promise<void> {
  const res = await request.post("/api/auth/register", {
    data: {
      email: user.email,
      password: user.password,
      displayName: user.displayName,
      username: user.username,
    },
  });
  if (!res.ok()) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      `Register failed for ${user.username}: ${res.status()} ${body.error || ""}`
    );
  }
}

export async function loginUserViaAPI(
  request: APIRequestContext,
  user: TestUser
): Promise<void> {
  const res = await request.post("/api/auth/login", {
    data: { email: user.email, password: user.password },
  });
  if (!res.ok()) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      `Login failed for ${user.username}: ${res.status()} ${body.error || ""}`
    );
  }
}

export async function createAuthenticatedContext(
  browser: Browser,
  baseURL: string,
  user: TestUser
): Promise<BrowserContext> {
  const context = await browser.newContext({ baseURL });
  const request = context.request;

  await registerUserViaAPI(request, user);

  return context;
}
