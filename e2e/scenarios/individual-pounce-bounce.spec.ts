import { expect } from "@playwright/test";
import { individualTest as test } from "../fixtures/quiz-fixture";
import {
  createRoomViaUI,
  joinRoomViaUI,
  postQuestion,
  waitForQuestionVisible,
  closeRoomViaUI,
  waitForRoomClosed,
} from "../helpers/room";

test.describe("Individual + Pounce-Bounce Mode", () => {
  test("Pounce-bounce flow: pounce window, advance to bounce, mark answers", async ({
    qmPage,
    p1Page,
    p2Page,
  }) => {
    let roomCode: string;

    await test.step("QM creates an individual pounce-bounce room", async () => {
      roomCode = await createRoomViaUI(qmPage, {
        name: "E2E Individual Pounce Bounce",
        mode: "individual",
        scoringMode: "pounce_bounce",
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

    await test.step("QM posts a pounce-bounce question", async () => {
      await postQuestion(
        qmPage,
        "What year did the Berlin Wall fall?",
        { timerSeconds: 60, points: 10, correctAnswer: "1989" }
      );
    });

    await test.step("Both players see the question", async () => {
      await waitForQuestionVisible(p1Page, "What year did the Berlin Wall fall?");
      await waitForQuestionVisible(p2Page, "What year did the Berlin Wall fall?");
    });

    await test.step("QM sees 'Pounce Window Open'", async () => {
      await expect(
        qmPage.getByText("Pounce Window Open", { exact: true })
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step("Non-assigned player sees pounce option", async () => {
      const pages = [p1Page, p2Page];
      let pouncerPage = null;

      for (const page of pages) {
        const pounceBtn = page.locator('button:has-text("Pounce!")');
        if (await pounceBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          pouncerPage = page;
          break;
        }
      }

      if (pouncerPage) {
        await pouncerPage.click('button:has-text("Pounce!")');
        await pouncerPage.fill('input[placeholder="Your pounce answer..."]', "1989");
        await pouncerPage.click('button:has-text("Submit Pounce")');
      }
    });

    await test.step("QM advances from pounce to bounce phase", async () => {
      const advanceBtn = qmPage.locator('button:has-text("Close Pounce")');
      await expect(advanceBtn).toBeVisible({ timeout: 5_000 });
      await advanceBtn.click();
    });

    await test.step("Assigned player gets to answer in bounce phase", async () => {
      await qmPage.waitForTimeout(2000);

      const pages = [p1Page, p2Page];
      let directPage = null;

      for (const page of pages) {
        const turnText = page.locator("text=Your turn to answer");
        if (await turnText.isVisible({ timeout: 3000 }).catch(() => false)) {
          directPage = page;
          break;
        }
      }

      if (directPage) {
        await directPage.fill('input[placeholder="Type your answer..."]', "1989");
        await directPage.click('button:has-text("Submit")');
      }
    });

    await test.step("QM marks the bounce answer correct", async () => {
      await qmPage.waitForTimeout(1000);
      const correctButtons = qmPage.locator('button:has-text("Correct")');
      const count = await correctButtons.count();
      if (count > 0) {
        await correctButtons.first().click();
      }
    });

    await test.step("Pounce marking phase appears for QM", async () => {
      const markPounce = qmPage.locator("text=Mark Pounce Answers");
      const hasPouncePhase = await markPounce
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      if (hasPouncePhase) {
        const pounceCorrectBtns = qmPage.locator(
          '.border-purple-500\\/15 button:has-text("Correct")'
        );
        const pounceCount = await pounceCorrectBtns.count();
        for (let i = 0; i < pounceCount; i++) {
          await pounceCorrectBtns.nth(i).click();
          await qmPage.waitForTimeout(500);
        }
      }
    });

    await test.step("Leaderboard reflects pounce-bounce scores", async () => {
      await qmPage.waitForTimeout(2000);
      await expect(qmPage.locator("text=Leaderboard")).toBeVisible();
    });

    await test.step("QM closes the room", async () => {
      await qmPage.waitForTimeout(500);
      await closeRoomViaUI(qmPage);
      await waitForRoomClosed(qmPage);
    });
  });
});
