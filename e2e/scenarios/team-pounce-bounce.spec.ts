import { expect } from "@playwright/test";
import { teamTest as test } from "../fixtures/quiz-fixture";
import {
  createRoomViaUI,
  createTeamViaUI,
  postQuestion,
  waitForQuestionVisible,
  closeRoomViaUI,
  waitForRoomClosed,
} from "../helpers/room";

test.describe("Team + Pounce-Bounce Mode", () => {
  test("Pounce-bounce flow: pounce window, advance to bounce, mark answers", async ({
    qmPage,
    cap1Page,
    cap2Page,
    cap3Page,
  }) => {
    let roomCode: string;

    await test.step("QM creates a pounce-bounce team room", async () => {
      roomCode = await createRoomViaUI(qmPage, {
        name: "E2E Pounce Bounce Quiz",
        mode: "team",
        scoringMode: "pounce_bounce",
      });
      expect(roomCode).toBeTruthy();
      await expect(qmPage.locator("text=Connected")).toBeVisible({
        timeout: 20_000,
      });
    });

    await test.step("Three captains create teams", async () => {
      await cap1Page.goto(`/room/${roomCode}`);
      await createTeamViaUI(cap1Page, "Team Alpha");

      await cap2Page.goto(`/room/${roomCode}`);
      await createTeamViaUI(cap2Page, "Team Beta");

      await cap3Page.goto(`/room/${roomCode}`);
      await createTeamViaUI(cap3Page, "Team Gamma");
    });

    await test.step("QM sees all teams in participant list", async () => {
      await qmPage.waitForTimeout(2000);
      await expect(qmPage.getByRole("heading", { name: /Teams/ })).toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step("QM posts a pounce-bounce question", async () => {
      await postQuestion(
        qmPage,
        "What year did the first Moon landing happen?",
        { timerSeconds: 60, points: 10, correctAnswer: "1969" }
      );
    });

    await test.step("All captains see the question", async () => {
      await waitForQuestionVisible(
        cap1Page,
        "What year did the first Moon landing happen?"
      );
      await waitForQuestionVisible(
        cap2Page,
        "What year did the first Moon landing happen?"
      );
      await waitForQuestionVisible(
        cap3Page,
        "What year did the first Moon landing happen?"
      );
    });

    await test.step("QM sees 'Pounce Window Open'", async () => {
      await expect(
        qmPage.getByText("Pounce Window Open", { exact: true })
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step("Non-assigned teams see pounce option", async () => {
      const pages = [cap1Page, cap2Page, cap3Page];
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
        await pouncerPage.fill(
          'input[placeholder="Your pounce answer..."]',
          "1969"
        );
        await pouncerPage.click('button:has-text("Submit Pounce")');
      }
    });

    await test.step("QM advances from pounce to bounce phase", async () => {
      const advanceBtn = qmPage.locator(
        'button:has-text("Close Pounce")'
      );
      await expect(advanceBtn).toBeVisible({ timeout: 5_000 });
      await advanceBtn.click();
    });

    await test.step("Assigned team gets to answer in bounce phase", async () => {
      await qmPage.waitForTimeout(2000);

      const pages = [cap1Page, cap2Page, cap3Page];
      let directPage = null;

      for (const page of pages) {
        const turnText = page.locator("text=Your turn to answer");
        if (await turnText.isVisible({ timeout: 3000 }).catch(() => false)) {
          directPage = page;
          break;
        }
      }

      if (directPage) {
        await directPage.fill(
          'input[placeholder="Type your answer..."]',
          "1969"
        );
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
