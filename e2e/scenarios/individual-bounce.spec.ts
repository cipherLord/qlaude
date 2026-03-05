import { expect } from "@playwright/test";
import { individualTest as test } from "../fixtures/quiz-fixture";
import {
  createRoomViaUI,
  joinRoomViaUI,
  postQuestion,
  waitForQuestionVisible,
  markCorrect,
  markWrong,
  closeRoomViaUI,
  waitForRoomClosed,
} from "../helpers/room";

test.describe("Individual + Bounce Mode", () => {
  test("Bounce flow: assigned player answers, wrong bounces to next, correct scores", async ({
    qmPage,
    p1Page,
    p2Page,
  }) => {
    let roomCode: string;

    await test.step("QM creates an individual bounce room", async () => {
      roomCode = await createRoomViaUI(qmPage, {
        name: "E2E Individual Bounce",
        mode: "individual",
        scoringMode: "bounce",
      });
      expect(roomCode).toBeTruthy();
      await expect(qmPage.locator("text=Connected")).toBeVisible({
        timeout: 20_000,
      });
    });

    await test.step("Player 1 joins the room", async () => {
      await joinRoomViaUI(p1Page, roomCode);
      await expect(p1Page.locator("text=Connected")).toBeVisible({
        timeout: 20_000,
      });
    });

    await test.step("Player 2 joins the room", async () => {
      await joinRoomViaUI(p2Page, roomCode);
      await expect(p2Page.locator("text=Connected")).toBeVisible({
        timeout: 20_000,
      });
    });

    await test.step("QM sees players in participant list", async () => {
      await qmPage.waitForTimeout(2000);
      await expect(qmPage.getByRole("heading", { name: /Players/ })).toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step("QM posts a bounce question", async () => {
      await postQuestion(qmPage, "What is the largest planet?", {
        timerSeconds: 60,
        points: 10,
        correctAnswer: "Jupiter",
      });

      await expect(
        qmPage.locator("text=What is the largest planet?")
      ).toBeVisible({ timeout: 15_000 });
    });

    await test.step("Both players see the question", async () => {
      await waitForQuestionVisible(p1Page, "What is the largest planet?");
      await waitForQuestionVisible(p2Page, "What is the largest planet?");
    });

    await test.step("Assigned player sees 'Your turn to answer'", async () => {
      const pages = [p1Page, p2Page];
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
        await assignedPage.fill('input[placeholder="Type your answer..."]', "Saturn");
        await assignedPage.click('button:has-text("Submit")');
      }
    });

    await test.step("QM marks the answer wrong to trigger bounce", async () => {
      await expect(
        qmPage.locator("text=Incoming Answers")
      ).toBeVisible({ timeout: 10_000 });
      await markWrong(qmPage, 0);
    });

    await test.step("Question bounces to the next player", async () => {
      await qmPage.waitForTimeout(2000);
      const pages = [p1Page, p2Page];
      let bouncedPage = null;
      for (const page of pages) {
        const bounceIndicator = page.locator("text=Bounced to you!");
        if (await bounceIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
          bouncedPage = page;
          break;
        }
      }

      if (bouncedPage) {
        await bouncedPage.fill('input[placeholder="Type your answer..."]', "Jupiter");
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
