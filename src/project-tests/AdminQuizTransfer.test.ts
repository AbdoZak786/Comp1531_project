
import { deleteReq, postReq, getSeshId, getBody } from '../helperFunctions';
import { GameStates, isErrorObjectType } from '../types';
import * as data from '../dataStore';

const newUsers = [
  { email: 'admin@example.com', password: 'password123', nameFirst: 'Admin', nameLast: 'User' },
  { email: 'user@example.com', password: 'password456', nameFirst: 'Test', nameLast: 'User' }
];

beforeEach(() => {
  deleteReq('/v1/clear');
});

describe('adminQuizTransfer success testing', () => {
  let seshIdAdmin: string;
  let quizId: number;
  let seshIdUser: string;

  beforeEach(() => {
    // Register admin user
    const adminRes = postReq('/v1/admin/auth/register', { json: newUsers[0] });
    seshIdAdmin = getSeshId(adminRes) as string;
    if (isErrorObjectType(seshIdAdmin)) throw new Error('Invalid Session Id');

    // Register regular user
    const userRes = postReq('/v1/admin/auth/register', { json: newUsers[1] });
    seshIdUser = getSeshId(userRes) as string;
    if (isErrorObjectType(seshIdUser)) throw new Error('Invalid Session Id');

    // Create quiz as admin
    const quizRes = postReq('/v1/admin/quiz', {
      json: { name: 'Test Quiz', description: 'This is a test quiz!' },
      headers: { session: seshIdAdmin }
    });
    quizId = getBody(quizRes).quizId;
  });

  test('valid quiz transfer', () => {
    const res = postReq(`/v1/admin/quiz/${quizId}/transfer`, {
      json: { userEmail: newUsers[1].email },
      headers: { session: seshIdAdmin }
    });
    expect(res.statusCode).toBe(200);
    expect(getBody(res)).toEqual({});
  });
});

describe('adminQuizTransfer error testing', () => {
  let seshIdAdmin: string;
  let seshIdUser: string;
  let quizId: number;

  beforeEach(() => {
    // Register admin user
    const adminRes = postReq('/v1/admin/auth/register', { json: newUsers[0] });
    seshIdAdmin = getSeshId(adminRes) as string;
    if (isErrorObjectType(seshIdAdmin)) throw new Error('Invalid Session Id');

    // Register regular user
    const userRes = postReq('/v1/admin/auth/register', { json: newUsers[1] });
    seshIdUser = getSeshId(userRes) as string;
    if (isErrorObjectType(seshIdUser)) throw new Error('Invalid Session Id');

    // Create quiz as admin
    const quizRes = postReq('/v1/admin/quiz', {
      json: { name: 'Test Quiz', description: 'This is a test quiz!' },
      headers: { session: seshIdAdmin }
    });
    quizId = getBody(quizRes).quizId;
  });

  test('non-existent user', () => {
    const res = postReq(`/v1/admin/quiz/${quizId}/transfer`, {
      json: { userEmail: 'nonexistent@example.com' },
      headers: { session: seshIdAdmin }
    });
    expect(res.statusCode).toBe(400);
    expect(getBody(res)).toEqual({ error: expect.any(String) });
  });
  test('session is empty or invalid', () => {
    const res = postReq(`/v1/admin/quiz/${quizId}/transfer`, {
      json: { userEmail: newUsers[1].email },
      headers: { session: 'invalidSession' }
    });
    expect(res.statusCode).toBe(401);
    expect(getBody(res)).toEqual({ error: expect.any(String) });
  });
  test('self-transfer', () => {
    const res = postReq(`/v1/admin/quiz/${quizId}/transfer`, {
      json: { userEmail: newUsers[0].email },
      headers: { session: seshIdAdmin }
    });
    expect(res.statusCode).toBe(403);
    expect(getBody(res)).toEqual({ error: expect.any(String) });
  });

  test('ownership validation', () => {
    const res = postReq(`/v1/admin/quiz/${quizId}/transfer`, {
      json: { userEmail: newUsers[1].email },
      headers: { session: seshIdUser }
    });
    expect(res.statusCode).toBe(403);
    expect(getBody(res)).toEqual({ error: expect.any(String) });
  });

  test('quiz name already exists for target user', () => {
    // First, transfer the quiz to user
    postReq(`/v1/admin/quiz/${quizId}/transfer`, {
      json: { userEmail: newUsers[1].email },
      headers: { session: seshIdAdmin }
    });

    // Create another quiz with same name as admin
    const quizRes2 = postReq('/v1/admin/quiz', {
      json: { name: 'Test Quiz', description: 'Second quiz with same name' },
      headers: { session: seshIdAdmin }
    });
    const quizId2 = getBody(quizRes2).quizId;

    // Try to transfer the new quiz to user (who already has a quiz with same name)
    const res = postReq(`/v1/admin/quiz/${quizId2}/transfer`, {
      json: { userEmail: newUsers[1].email },
      headers: { session: seshIdAdmin }
    });
    expect(res.statusCode).toBe(400);
    expect(getBody(res)).toEqual({ error: expect.any(String) });
  });
  describe('adminQuizTransfer V2 testing', () => {
    let sessionAdmin: string;
    let sessionUser: string;
    let quizId: number;

    beforeEach(() => {
    // Clear data
      deleteReq('/v1/clear');

      // Register admin user
      const adminRes = postReq('/v1/admin/auth/register', { json: newUsers[0] });
      sessionAdmin = getBody(adminRes).session;
      if (isErrorObjectType(sessionAdmin)) throw new Error('Invalid Session');

      // Register regular user
      const userRes = postReq('/v1/admin/auth/register', { json: newUsers[1] });
      sessionUser = getBody(userRes).session;
      if (isErrorObjectType(sessionUser)) throw new Error('Invalid Session');

      // Create quiz as admin
      const quizRes = postReq('/v1/admin/quiz', {
        json: { name: 'Test Quiz', description: 'This is a test quiz!' },
        headers: { session: sessionAdmin }
      });
      quizId = getBody(quizRes).quizId;
    });

    test('successful transfer with no active games', () => {
      const res = postReq(`/v2/admin/quiz/${quizId}/transfer`, {
        json: { userEmail: newUsers[1].email },
        headers: { session: sessionAdmin }
      });
      expect(res.statusCode).toBe(200);
      expect(getBody(res)).toEqual({});
    });

    test('fails with invalid email', () => {
      const res = postReq(`/v2/admin/quiz/${quizId}/transfer`, {
        json: { userEmail: 'invalid@example.com' },
        headers: { session: sessionAdmin }
      });
      expect(res.statusCode).toBe(400);
    });

    test('fails with duplicate quiz name', () => {
    // First transfer
      postReq(`/v2/admin/quiz/${quizId}/transfer`, {
        json: { userEmail: newUsers[1].email },
        headers: { session: sessionAdmin }
      });

      // Create another quiz with same name
      const quizRes = postReq('/v1/admin/quiz', {
        json: { name: 'Test Quiz', description: 'Another quiz' },
        headers: { session: sessionAdmin }
      });
      const newQuizId = getBody(quizRes).quizId;

      // Try to transfer back
      const transferRes = postReq(`/v2/admin/quiz/${newQuizId}/transfer`, {
        json: { userEmail: newUsers[1].email },
        headers: { session: sessionAdmin }
      });
      expect(transferRes.statusCode).toBe(400);
    });
  });
  describe('adminQuizTransfer V2 game state validation', () => {
    let sessionAdmin: string;
    let quizId: number;

    beforeEach(() => {
    // Clear data
      deleteReq('/v1/clear');

      // Register users
      const adminRes = postReq('/v1/admin/auth/register', { json: newUsers[0] });
      sessionAdmin = getBody(adminRes).session;

      postReq('/v1/admin/auth/register', { json: newUsers[1] });

      // Create quiz
      const quizRes = postReq('/v1/admin/quiz', {
        json: { name: 'Test Quiz', description: 'Test quiz' },
        headers: { session: sessionAdmin }
      });
      quizId = getBody(quizRes).quizId;
    });

    test('allows transfer when no active games exist', () => {
    // No games started - should allow transfer
      const transferRes = postReq(`/v2/admin/quiz/${quizId}/transfer`, {
        json: { userEmail: newUsers[1].email },
        headers: { session: sessionAdmin }
      });

      expect(transferRes.statusCode).toBe(200);
      expect(getBody(transferRes)).toEqual({});
    });

    test('allows transfer when only inactive games exist', () => {
    // Start and complete a game
      const gameRes = postReq(`/v1/admin/quiz/${quizId}/game/start`, {
        headers: { session: sessionAdmin },
        json: { autoStartNum: 0 }
      });
      const gameId = getBody(gameRes).gameId;

      // Manually mark game as inactive (simulate completion)
      const allGames = data.getAllGames();
      const gameIndex = allGames.activeGames.findIndex(g => g.gameId === gameId);
      if (gameIndex !== -1) {
        const [game] = allGames.activeGames.splice(gameIndex, 1);
        game.isActive = false;
        game.state = GameStates.END; // Use the enum value instead of string
        allGames.inactiveGames.push(game);
      }

      // Should allow transfer
      const transferRes = postReq(`/v2/admin/quiz/${quizId}/transfer`, {
        json: { userEmail: newUsers[1].email },
        headers: { session: sessionAdmin }
      });

      expect(transferRes.statusCode).toBe(200);
      expect(getBody(transferRes)).toEqual({});
    });
  });
});
