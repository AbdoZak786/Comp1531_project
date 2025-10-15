import {
  deleteReq, getReq, postReq, getSeshId, getBody,
  startTestGame, startQuiz, startQuestion, expectResToBeError
} from '../helperFunctions';

let seshId: string;
const DEFAULTAUTOSTARTNUM = 3;

const testUser = {
  email: 'z5481970@ad.unsw.edu.au',
  password: 'password1!',
  nameFirst: 'Yifan',
  nameLast: 'Liang'
};

const getGameDetails = (quizId: number, gameId: number, seshId: string) => {
  return getReq(`/v1/admin/quiz/${quizId}/game/${gameId}`, {
    headers: { session: seshId }
  });
};

beforeEach(() => {
  deleteReq('/v1/clear');
  seshId = getSeshId(postReq('/v1/admin/auth/register', { json: testUser }));
});

describe('error testing', () => {
  test('autoStartNum is greater than 50 (autoStartNum = 51)', () => {
    const quizId: number = startQuiz(seshId);
    startQuestion(quizId, seshId);

    const res = startTestGame(quizId, seshId, 51);

    expectResToBeError(res, true, 400);
  });

  test('10 active games exist for this quiz', () => {
    const quizId = startQuiz(seshId);
    startQuestion(quizId, seshId);

    // Creates 10 active instances of the game
    for (let i = 0; i < 10; i++) {
      const res = startTestGame(quizId, seshId, DEFAULTAUTOSTARTNUM);

      expectResToBeError(res, false, 200);
    }

    const res = startTestGame(quizId, seshId, DEFAULTAUTOSTARTNUM);

    expectResToBeError(res, true, 400);
  });

  test('quiz does not contain any questions', () => {
    const quizId = startQuiz(seshId);
    const res = startTestGame(quizId, seshId, DEFAULTAUTOSTARTNUM);

    expectResToBeError(res, true, 400);
  });

  test('session is empty or invalid', () => {
    const quizId = startQuiz(seshId);
    startQuestion(quizId, seshId);

    const res = startTestGame(quizId, (+seshId + 1).toString(), DEFAULTAUTOSTARTNUM);

    expectResToBeError(res, true, 401);
  });

  test('quiz does not exist', () => {
    const res = startTestGame(0, seshId, DEFAULTAUTOSTARTNUM);
    expectResToBeError(res, true, 403);
  });

  test('user does not own provided quiz', () => {
    const quizId = startQuiz(seshId);
    startQuestion(quizId, seshId);

    const seshId2 = getSeshId(postReq('/v1/admin/auth/register', {
      json: {
        email: 'z9876543@ad.unsw.edu.au',
        password: 'password!1',
        nameFirst: 'Smelly',
        nameLast: 'Man'
      }
    }));
    const quizId2 = startQuiz(seshId2);
    startQuestion(quizId2, seshId2);

    const res = startTestGame(quizId2, seshId, DEFAULTAUTOSTARTNUM);
    expectResToBeError(res, true, 403);
  });
});

describe('successful cases', () => {
  test('successfully starts up a game', () => {
    const quizId = startQuiz(seshId);
    startQuestion(quizId, seshId);

    const res = startTestGame(quizId, seshId, DEFAULTAUTOSTARTNUM);

    expectResToBeError(res, false, 200);
    expect(getBody(res)).toStrictEqual({
      gameId: expect.any(Number)
    });
    const gameId = getBody(res).gameId;

    const details = getBody(getGameDetails(quizId, gameId, seshId));
    expect(details).toStrictEqual({
      state: 'LOBBY',
      atQuestion: 0,
      players: [],
      metadata: {
        quizId: expect.any(Number),
        name: 'TestQuiz',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: 'Test quiz description',
        numQuestions: 1,
        questions: [
          {
            questionId: expect.any(Number),
            question: 'Who is the Monarch of England?',
            timeLimit: expect.any(Number),
            points: 5,
            answerOptions: [
              {
                answerId: expect.any(Number),
                answer: 'Prince Charles',
                color: expect.any(String),
                correct: true
              },
              {
                answerId: expect.any(Number),
                answer: 'Queen Elizabeth',
                color: expect.any(String),
                correct: false
              }
            ]
          }
        ],
        timeLimit: expect.any(Number),
      }
    });
  });
});
