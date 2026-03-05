import { Page, expect } from "@playwright/test";

export type RoomMode = "individual" | "team";
export type ScoringMode = "normal" | "bounce" | "pounce_bounce";

export interface CreateRoomOptions {
  name: string;
  mode: RoomMode;
  scoringMode?: ScoringMode;
}

export async function createRoomViaUI(
  page: Page,
  options: CreateRoomOptions
): Promise<string> {
  await page.goto("/dashboard");
  await page.waitForSelector('h1:has-text("Dashboard")');

  await page.click("text=Create Room");

  const modal = page.locator(".fixed.inset-0.z-50");
  await expect(modal).toBeVisible({ timeout: 5_000 });

  await modal.locator('input[placeholder="e.g. Friday Trivia Night"]').fill(options.name);

  if (options.mode === "team") {
    await modal.locator('button[type="button"]:has-text("Teams")').click();
    await page.waitForTimeout(300);
  }

  if (options.scoringMode === "bounce") {
    await modal.locator('button[type="button"] >> text=Bounce').first().click();
  } else if (options.scoringMode === "pounce_bounce") {
    await modal.locator('button[type="button"]:has-text("Pounce + Bounce")').click();
  }

  await modal.locator('button[type="submit"]').click();

  await page.waitForURL(/\/room\/[A-Z0-9]+/, { timeout: 15_000 });

  const url = page.url();
  const roomCode = url.split("/room/")[1];
  return roomCode;
}

export async function joinRoomViaUI(page: Page, roomCode: string): Promise<void> {
  await page.goto("/dashboard");
  await page.waitForSelector('h1:has-text("Dashboard")');

  await page.fill('input[placeholder="Enter room code"]', roomCode);
  await page.click('button:has-text("Join")');

  await page.waitForURL(`**/room/${roomCode}`, { timeout: 15_000 });
}

export async function navigateToRoom(page: Page, roomCode: string): Promise<void> {
  await page.goto(`/room/${roomCode}`);
  await page.waitForSelector("text=Connected", { timeout: 20_000 });
}

export async function createTeamViaUI(
  page: Page,
  teamName: string
): Promise<void> {
  await page.waitForSelector("text=Join a Team", { timeout: 10_000 });

  await page.getByRole("button", { name: "Create Team", exact: true }).click();
  await page.fill('input[placeholder="Team name"]', teamName);
  await page.getByRole("button", { name: /Create Team \(as Captain\)/ }).click();

  await page.waitForSelector("text=Connected", { timeout: 20_000 });
}

export async function joinTeamViaUI(
  page: Page,
  teamCode: string
): Promise<void> {
  await page.waitForSelector("text=Join a Team", { timeout: 10_000 });

  await page.getByRole("button", { name: "Join Existing", exact: true }).click();
  await page.fill('input[placeholder="Team code"]', teamCode);
  await page.getByRole("button", { name: /Join Team \(as Member\)/ }).click();

  await page.waitForSelector("text=Connected", { timeout: 20_000 });
}

export async function postQuestion(
  page: Page,
  questionText: string,
  opts: { timerSeconds?: number; points?: number; correctAnswer?: string } = {}
): Promise<void> {
  const form = page.locator('form:has(textarea[placeholder="Type your question..."])');
  await form.locator('textarea').fill(questionText);

  if (opts.timerSeconds) {
    await form.locator('select').first().selectOption(String(opts.timerSeconds));
  }

  if (opts.points) {
    await form.locator('input[type="number"]').fill(String(opts.points));
  }

  if (opts.correctAnswer) {
    await form
      .locator('input[placeholder="Type the correct answer..."]')
      .fill(opts.correctAnswer);
  }

  await form.locator('button[type="submit"]').click();
}

export async function submitAnswer(page: Page, answerText: string): Promise<void> {
  await page.fill('input[placeholder="Type your answer..."]', answerText);
  await page.click('button:has-text("Submit")');
}

export async function waitForQuestionVisible(
  page: Page,
  questionText: string,
  timeout = 15_000
): Promise<void> {
  await page.waitForSelector(`text=${questionText}`, { timeout });
}

export async function markCorrect(page: Page, index = 0): Promise<void> {
  const buttons = page.locator('button:has-text("Correct")');
  await buttons.nth(index).click();
}

export async function markWrong(page: Page, index = 0): Promise<void> {
  const wrongButtons = page.locator(
    '.glass-card button:has-text("Wrong")'
  );
  await wrongButtons.nth(index).click();
}

export async function waitForLeaderboardEntry(
  page: Page,
  name: string,
  timeout = 10_000
): Promise<void> {
  await page.waitForSelector(`text=${name}`, { timeout });
}

export async function closeRoomViaUI(page: Page): Promise<void> {
  await page.click("text=Close Room");
  await page.click("text=Yes, close");
}

export async function waitForRoomClosed(page: Page, timeout = 10_000): Promise<void> {
  await expect(page.locator("text=This room has been closed")).toBeVisible({
    timeout,
  });
}

export async function getTeamCodeFromAPI(
  page: Page,
  roomCode: string,
  teamName: string
): Promise<string> {
  const res = await page.request.get(`/api/rooms/${roomCode}`);
  const data = await res.json();
  const team = data.teams?.find(
    (t: { name: string; code: string }) => t.name === teamName
  );
  if (!team) throw new Error(`Team "${teamName}" not found in room ${roomCode}`);
  return team.code;
}
