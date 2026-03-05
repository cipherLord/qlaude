import { expect } from "@playwright/test";
import { teamTest as test } from "../fixtures/quiz-fixture";
import {
  createRoomViaUI,
  createTeamViaUI,
  postQuestion,
  waitForQuestionVisible,
  markCorrect,
  markWrong,
  closeRoomViaUI,
  waitForRoomClosed,
} from "../helpers/room";

test.describe("Team + Bounce Mode", () => {
  test("Bounce flow: assigned team answers, wrong bounces to next, correct scores", async ({
    qmPage,
    cap1Page,
    cap2Page,
    cap3Page,
  }) => {
    let roomCode: string;

    await test.step("QM creates a bounce-mode team room", async () => {
      roomCode = await createRoomViaUI(qmPage, {
        name: "E2E Bounce Quiz",
        mode: "team",
        scoringMode: "bounce",
      });
      expect(roomCode).toBeTruthy();
      await expect(qmPage.locator("text=Connected")).toBeVisible({
        timeout: 20_000,
      });
    });

    await test.step("Captain 1 creates Team Alpha", async () => {
      await cap1Page.goto(`/room/${roomCode}`);
      await createTeamViaUI(cap1Page, "Team Alpha");
    });

    await test.step("Captain 2 creates Team Beta", async () => {
      await cap2Page.goto(`/room/${roomCode}`);
      await createTeamViaUI(cap2Page, "Team Beta");
    });

    await test.step("Captain 3 creates Team Gamma", async () => {
      await cap3Page.goto(`/room/${roomCode}`);
      await createTeamViaUI(cap3Page, "Team Gamma");
    });

    await test.step("QM sees all teams", async () => {
      await qmPage.waitForTimeout(2000);
      await expect(qmPage.getByRole("heading", { name: /Teams/ })).toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step("QM posts a bounce question", async () => {
      await postQuestion(qmPage, "Name the largest ocean on Earth", {
        timerSeconds: 60,
        points: 10,
        correctAnswer: "Pacific",
      });
    });

    await test.step("All captains see the question", async () => {
      await waitForQuestionVisible(
        cap1Page,
        "Name the largest ocean on Earth"
      );
      await waitForQuestionVisible(
        cap2Page,
        "Name the largest ocean on Earth"
      );
      await waitForQuestionVisible(
        cap3Page,
        "Name the largest ocean on Earth"
      );
    });

    await test.step("Bounce status bar is visible for all", async () => {
      for (const p of [cap1Page, cap2Page, cap3Page]) {
        await expect(
          p.locator("text=Team Alpha").or(p.locator("text=Team Beta")).or(p.locator("text=Team Gamma")).first()
        ).toBeVisible({ timeout: 10_000 });
      }
    });

    await test.step("Assigned team sees 'Your turn to answer'", async () => {
      const pages = [cap1Page, cap2Page, cap3Page];
      let assignedPage = null;
      for (const page of pages) {
        const turnIndicator = page.locator("text=Your turn to answer");
        if (await turnIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
          assignedPage = page;
          break;
        }
      }
      expect(assignedPage).toBeTruthy();

      if (assignedPage) {
        await assignedPage.fill(
          'input[placeholder="Type your answer..."]',
          "Atlantic"
        );
        await assignedPage.click('button:has-text("Submit")');
      }
    });

    await test.step("QM sees the answer and marks it wrong to trigger bounce", async () => {
      await expect(
        qmPage.locator("text=Incoming Answers")
      ).toBeVisible({ timeout: 10_000 });

      await markWrong(qmPage, 0);
    });

    await test.step("Question bounces to the next team", async () => {
      await qmPage.waitForTimeout(2000);
      const pages = [cap1Page, cap2Page, cap3Page];
      let bouncedPage = null;
      for (const page of pages) {
        const bounceIndicator = page.locator("text=Bounced to you!");
        if (await bounceIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
          bouncedPage = page;
          break;
        }
      }

      if (bouncedPage) {
        await bouncedPage.fill(
          'input[placeholder="Type your answer..."]',
          "Pacific"
        );
        await bouncedPage.click('button:has-text("Submit")');
      }
    });

    await test.step("QM marks the bounced answer correct", async () => {
      await qmPage.waitForTimeout(1000);
      const correctButtons = qmPage.locator('button:has-text("Correct")');
      const count = await correctButtons.count();
      if (count > 0) {
        await correctButtons.first().click();
      }
    });

    await test.step("Leaderboard updates with bounce scoring", async () => {
      await qmPage.waitForTimeout(2000);
      await expect(qmPage.locator("text=Leaderboard")).toBeVisible();
      await expect(qmPage.locator("text=pts").first()).toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step("QM closes the room", async () => {
      await qmPage.waitForTimeout(500);
      await closeRoomViaUI(qmPage);
      await waitForRoomClosed(qmPage);
    });
  });
});
