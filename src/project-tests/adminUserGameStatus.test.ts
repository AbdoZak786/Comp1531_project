import {
  deleteReq, getReq, postReq, getSeshId, getBody,
  startTestGame, startQuiz, startQuestion, expectResToBeError
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

const getGameDetails = (quizId: number, gameId: number, seshId: string) => {
  return getReq(`/v1/admin/quiz/${quizId}/game/${gameId}`, {
    headers: { session: seshId }
  });
};

beforeEach(() => {
  deleteReq('/v1/clear');
  seshId = getSeshId(postReq('/v1/admin/auth/register', { json: testUser }));

  quizId = startQuiz(seshId);
  startQuestion(quizId, seshId);

  const res = startTestGame(quizId, seshId, DEFAULTAUTOSTARTNUM);

  gameId = getBody(res).gameId as number;
});

describe('error testing', () => {
  test('invalid gameId in the quiz', () => {
    const res = getGameDetails(quizId, gameId + 1, seshId);
    expectResToBeError(res, true, 400);
  });

  test('empty session', () => {
    const res = getGameDetails(quizId, gameId, '');
    expectResToBeError(res, true, 401);
  });

  test('invalid session', () => {
    const res = getGameDetails(quizId, gameId, (+seshId + 1).toString());
    expectResToBeError(res, true, 401);
  });

  test('user does not own quiz', () => {
    const newSeshId = getSeshId(postReq('/v1/admin/auth/register', {
      json: {
        email: 'z1234567@ad.unsw.edu.au',
        password: 'password!1',
        nameFirst: 'mr',
        nameLast: 'smelly'
      }
    }));
    const res = getGameDetails(quizId, gameId, newSeshId);
    expectResToBeError(res, true, 403);
  });

  test('quiz does not exist', () => {
    const res = getGameDetails(quizId + 1, gameId, seshId);
    expectResToBeError(res, true, 403);
  });
});

describe('successful cases', () => {
  test('returns game state', () => {
    const res = getGameDetails(quizId, gameId, seshId);
    expectResToBeError(res, false, 200);

    const body = getBody(res);
    expect(body).toStrictEqual({
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
