import { test as base, Page, BrowserContext } from "@playwright/test";
import {
  generateUser,
  createAuthenticatedContext,
  TestUser,
} from "../helpers/auth";

interface IndividualFixture {
  qmUser: TestUser;
  player1User: TestUser;
  player2User: TestUser;
  qmContext: BrowserContext;
  p1Context: BrowserContext;
  p2Context: BrowserContext;
  qmPage: Page;
  p1Page: Page;
  p2Page: Page;
}

interface TeamFixture {
  qmUser: TestUser;
  cap1User: TestUser;
  cap2User: TestUser;
  cap3User: TestUser;
  qmContext: BrowserContext;
  cap1Context: BrowserContext;
  cap2Context: BrowserContext;
  cap3Context: BrowserContext;
  qmPage: Page;
  cap1Page: Page;
  cap2Page: Page;
  cap3Page: Page;
}

export const individualTest = base.extend<IndividualFixture>({
  qmUser: async ({}, use) => {
    await use(generateUser("qm"));
  },
  player1User: async ({}, use) => {
    await use(generateUser("player1"));
  },
  player2User: async ({}, use) => {
    await use(generateUser("player2"));
  },

  qmContext: async ({ browser, qmUser }, use) => {
    const ctx = await createAuthenticatedContext(
      browser,
      "http://localhost:3000",
      qmUser
    );
    await use(ctx);
    await ctx.close();
  },
  p1Context: async ({ browser, player1User }, use) => {
    const ctx = await createAuthenticatedContext(
      browser,
      "http://localhost:3000",
      player1User
    );
    await use(ctx);
    await ctx.close();
  },
  p2Context: async ({ browser, player2User }, use) => {
    const ctx = await createAuthenticatedContext(
      browser,
      "http://localhost:3000",
      player2User
    );
    await use(ctx);
    await ctx.close();
  },

  qmPage: async ({ qmContext }, use) => {
    const page = await qmContext.newPage();
    await use(page);
  },
  p1Page: async ({ p1Context }, use) => {
    const page = await p1Context.newPage();
    await use(page);
  },
  p2Page: async ({ p2Context }, use) => {
    const page = await p2Context.newPage();
    await use(page);
  },
});

export const teamTest = base.extend<TeamFixture>({
  qmUser: async ({}, use) => {
    await use(generateUser("qm"));
  },
  cap1User: async ({}, use) => {
    await use(generateUser("cap1"));
  },
  cap2User: async ({}, use) => {
    await use(generateUser("cap2"));
  },
  cap3User: async ({}, use) => {
    await use(generateUser("cap3"));
  },

  qmContext: async ({ browser, qmUser }, use) => {
    const ctx = await createAuthenticatedContext(
      browser,
      "http://localhost:3000",
      qmUser
    );
    await use(ctx);
    await ctx.close();
  },
  cap1Context: async ({ browser, cap1User }, use) => {
    const ctx = await createAuthenticatedContext(
      browser,
      "http://localhost:3000",
      cap1User
    );
    await use(ctx);
    await ctx.close();
  },
  cap2Context: async ({ browser, cap2User }, use) => {
    const ctx = await createAuthenticatedContext(
      browser,
      "http://localhost:3000",
      cap2User
    );
    await use(ctx);
    await ctx.close();
  },
  cap3Context: async ({ browser, cap3User }, use) => {
    const ctx = await createAuthenticatedContext(
      browser,
      "http://localhost:3000",
      cap3User
    );
    await use(ctx);
    await ctx.close();
  },

  qmPage: async ({ qmContext }, use) => {
    const page = await qmContext.newPage();
    await use(page);
  },
  cap1Page: async ({ cap1Context }, use) => {
    const page = await cap1Context.newPage();
    await use(page);
  },
  cap2Page: async ({ cap2Context }, use) => {
    const page = await cap2Context.newPage();
    await use(page);
  },
  cap3Page: async ({ cap3Context }, use) => {
    const page = await cap3Context.newPage();
    await use(page);
  },
});
