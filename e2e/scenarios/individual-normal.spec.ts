import { expect } from "@playwright/test";
import { individualTest as test } from "../fixtures/quiz-fixture";
import {
  createRoomViaUI,
  joinRoomViaUI,
  navigateToRoom,
  postQuestion,
  submitAnswer,
  waitForQuestionVisible,
  markCorrect,
  closeRoomViaUI,
  waitForRoomClosed,
} from "../helpers/room";

test.describe("Individual + Normal Mode", () => {
  test("Full quiz flow: create, join, question, answer, mark, leaderboard, close", async ({
    qmPage,
    p1Page,
    p2Page,
    player1User,
    player2User,
  }) => {
    let roomCode: string;

    await test.step("Quizmaster creates an individual-mode room", async () => {
      roomCode = await createRoomViaUI(qmPage, {
        name: "E2E Individual Quiz",
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

    await test.step("QM sees participant list with players", async () => {
      await qmPage.waitForTimeout(2000);
      const participantSection = qmPage.locator("text=Players");
      await expect(participantSection).toBeVisible({ timeout: 10_000 });
    });

    await test.step("QM posts Question 1", async () => {
      await postQuestion(qmPage, "What is the capital of France?", {
        timerSeconds: 60,
        points: 10,
        correctAnswer: "Paris",
      });
    });

    await test.step("Both players see the question", async () => {
      await waitForQuestionVisible(p1Page, "What is the capital of France?");
      await waitForQuestionVisible(p2Page, "What is the capital of France?");
    });

    await test.step("Player 1 submits correct answer", async () => {
      await submitAnswer(p1Page, "Paris");
      await expect(p1Page.locator("text=Answer Submitted")).toBeVisible({
        timeout: 5_000,
      });
    });

    await test.step("Player 2 submits wrong answer", async () => {
      await submitAnswer(p2Page, "London");
      await expect(p2Page.locator("text=Answer Submitted")).toBeVisible({
        timeout: 5_000,
      });
    });

    await test.step("QM sees incoming answers", async () => {
      await expect(
        qmPage.locator("text=Incoming Answers")
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step("QM marks the first answer correct", async () => {
      await markCorrect(qmPage, 0);
    });

    await test.step("Players see answers revealed", async () => {
      await expect(
        p1Page.locator("text=Answers Revealed")
      ).toBeVisible({ timeout: 10_000 });
      await expect(
        p2Page.locator("text=Answers Revealed")
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step("Leaderboard updates for all users", async () => {
      await expect(qmPage.locator("text=Leaderboard")).toBeVisible();
      await expect(p1Page.locator("text=Leaderboard")).toBeVisible();
      const leaderboardSection = qmPage.locator("text=pts").first();
      await expect(leaderboardSection).toBeVisible({ timeout: 10_000 });
    });

    await test.step("QM posts Question 2", async () => {
      await postQuestion(qmPage, "What is 2 + 2?", {
        timerSeconds: 30,
        points: 10,
        correctAnswer: "4",
      });
    });

    await test.step("Both players see Question 2", async () => {
      await waitForQuestionVisible(p1Page, "What is 2 + 2?");
      await waitForQuestionVisible(p2Page, "What is 2 + 2?");
    });

    await test.step("Both players submit answers to Q2", async () => {
      await submitAnswer(p1Page, "4");
      await submitAnswer(p2Page, "4");
    });

    await test.step("QM marks Q2 answer correct", async () => {
      await qmPage.waitForTimeout(1000);
      await markCorrect(qmPage, 0);
    });

    await test.step("QM closes the room", async () => {
      await qmPage.waitForTimeout(1000);
      await closeRoomViaUI(qmPage);
    });

    await test.step("All users see room closed", async () => {
      await waitForRoomClosed(qmPage);
      await waitForRoomClosed(p1Page);
      await waitForRoomClosed(p2Page);
    });

    await test.step("Question history is visible after close", async () => {
      await expect(
        qmPage.locator("text=Previous Questions")
      ).toBeVisible({ timeout: 10_000 });
    });
  });
});
