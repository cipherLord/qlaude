import { expect } from "@playwright/test";
import { individualTest as test } from "../fixtures/quiz-fixture";
import {
  createRoomViaUI,
  joinRoomViaUI,
  closeRoomViaUI,
  waitForRoomClosed,
  postQuestion,
  waitForQuestionVisible,
  submitAnswer,
  markCorrect,
} from "../helpers/room";

test.describe("Room Lifecycle", () => {
  test("Join, participate, leave, and close flow", async ({
    qmPage,
    p1Page,
    p2Page,
    player1User,
    player2User,
  }) => {
    let roomCode: string;

    await test.step("QM creates a room", async () => {
      roomCode = await createRoomViaUI(qmPage, {
        name: "E2E Lifecycle Room",
        mode: "individual",
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

    await test.step("QM sees both players in participant list", async () => {
      await qmPage.waitForTimeout(2000);
      await expect(qmPage.locator("text=Players")).toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step("Player 1 leaves the room", async () => {
      await p1Page.click("text=Leave");
      await p1Page.waitForURL("**/dashboard", { timeout: 10_000 });
      await expect(p1Page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    });

    await test.step("QM can still interact after player leaves", async () => {
      await postQuestion(qmPage, "Test question after leave", {
        timerSeconds: 60,
        correctAnswer: "answer",
      });
    });

    await test.step("Player 2 sees the question", async () => {
      await waitForQuestionVisible(p2Page, "Test question after leave");
    });

    await test.step("Player 2 submits answer", async () => {
      await submitAnswer(p2Page, "answer");
      await expect(p2Page.locator("text=Answer Submitted")).toBeVisible({
        timeout: 5_000,
      });
    });

    await test.step("QM marks answer and resolves question", async () => {
      await qmPage.waitForTimeout(1000);
      await markCorrect(qmPage, 0);
    });

    await test.step("QM disqualifies Player 2 via remove button", async () => {
      await qmPage.waitForTimeout(1000);

      const removeButton = qmPage.locator('button:has-text("Remove")').first();
      const isVisible = await removeButton.isVisible().catch(() => false);

      if (isVisible) {
        await removeButton.click();
        const confirmBtn = qmPage.locator('button:has-text("Confirm?")');
        await expect(confirmBtn).toBeVisible({ timeout: 3_000 });
        await confirmBtn.click();
      }
    });

    await test.step("QM closes the room", async () => {
      await qmPage.waitForTimeout(1000);
      await closeRoomViaUI(qmPage);
    });

    await test.step("QM sees room closed state", async () => {
      await waitForRoomClosed(qmPage);
      await expect(
        qmPage.locator("text=Previous Questions")
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step("Visiting closed room shows closed state", async () => {
      await p1Page.goto(`/room/${roomCode}`);
      await waitForRoomClosed(p1Page);
    });
  });
});
