import {
  deleteReq, getReq, postReq, getSeshId, getBody,
  startTestGame, startQuiz, startQuestion, expectResToBeError, putReq
} from '../helperFunctions';

let seshId: string;
let quizId: number;
let gameId: number;
const DEFAULTAUTOSTARTNUM = 3;

const testUser = {
  email: 'z5481970@ad.unsw.edu.au',
  password: 'password1!',
  nameFirst: 'Yifan',
  nameLast: 'Liang'
};

const getGameResults = (quizId: number, gameId: number, seshId: string) => {
  return getReq(`/v1/admin/quiz/${quizId}/game/${gameId}/results`, {
    headers: { session: seshId }
  });
};

const getGameState = (quizId: number, gameId: number, seshId: string) => {
  const res = getReq(`/v1/admin/quiz/${quizId}/game/${gameId}`, {
    headers: { session: seshId }
  });
  return getBody(res).state;
};

const sendAction = (quizId: number, gameId: number, seshId: string, action: string) => {
  return putReq(`/v1/admin/quiz/${quizId}/game/${gameId}`, {
    json: { action },
    headers: { session: seshId }
  });
};

beforeEach(() => {
  deleteReq('/v1/clear');
  seshId = getSeshId(postReq('/v1/admin/auth/register', { json: testUser }));
  quizId = startQuiz(seshId);
  startQuestion(quizId, seshId);
  gameId = getBody(startTestGame(quizId, seshId, DEFAULTAUTOSTARTNUM)).gameId;
});

describe('error testing', () => {
  test('invalid gameId in quiz', () => {
    const res = getGameResults(quizId, gameId + 1, seshId);
    expectResToBeError(res, true, 400);
  });

  test('session is empty or invalid', () => {
    const res = getGameResults(quizId, gameId, '');
    expectResToBeError(res, true, 401);
  });

  test('quiz does not exist', () => {
    const res = getGameResults(quizId + 999, gameId, seshId);
    expectResToBeError(res, true, 400);
  });

  test('user does not own quiz', () => {
    const seshId2 = getSeshId(postReq('/v1/admin/auth/register', {
      json: {
        email: 'z1234567@ad.unsw.edu.au',
        password: 'password!1',
        nameFirst: 'Smelly',
        nameLast: 'Man'
      }
    }));
    const res = getGameResults(quizId, gameId, seshId2);
    expectResToBeError(res, true, 403);
  });

  test('game is not in FINAL_RESULTS state', () => {
    const res = getGameResults(quizId, gameId, seshId);
    expectResToBeError(res, true, 400);
  });
});

describe('successful cases', () => {
  test('returns game results when game is in FINAL_RESULTS state', async () => {
    // From LOBBY -> QUESTION_COUNTDOWN
    sendAction(quizId, gameId, seshId, 'NEXT_QUESTION');
    await new Promise(resolve => setTimeout(resolve,  3000));

    // QUESTION_COUNTDOWN -> QUESTION_OPEN
    sendAction(quizId, gameId, seshId, 'SKIP_COUNTDOWN');
    await new Promise(resolve => setTimeout(resolve,  3000));

    // Wait in QUESTION_OPEN state briefly
    await new Promise(resolve => setTimeout(resolve,  3000));

    // QUESTION_OPEN -> QUESTION_CLOSE -> ANSWER_SHOW
    sendAction(quizId, gameId, seshId, 'GO_TO_ANSWER');
    await new Promise(resolve => setTimeout(resolve,  3000));

    // ANSWER_SHOW -> FINAL_RESULTS
    sendAction(quizId, gameId, seshId, 'GO_TO_FINAL_RESULTS');
    await new Promise(resolve => setTimeout(resolve,  3000));

    // Verify game is in FINAL_RESULTS state
    const state = getGameState(quizId, gameId, seshId);
    expect(state).toBe('FINAL_RESULTS');

    // Get results
    const res = getGameResults(quizId, gameId, seshId);
    expectResToBeError(res, false, 200);

    const body = getBody(res);
    expect(body).toStrictEqual({
      usersRankedByScore: expect.any(Array),
      questionResults: expect.arrayContaining([
        expect.objectContaining({
          questionId: expect.any(Number),
          playersCorrect: expect.any(Array),
          averageAnswerTime: expect.any(Number),
          percentCorrect: expect.any(Number)
        })
      ])
    });
  });
});
