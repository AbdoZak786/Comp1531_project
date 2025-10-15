import {
  deleteReq, getReq, postReq, getSeshId, getBody,
  startTestGame, startQuiz, startQuestion, expectResToBeError, putReq
} from '../helperFunctions';
import { GameActions as GA } from '../types';

let seshId: string;
let quizId: number;
let gameId: number;
const DEFAULTAUTOSTARTNUM = 3;
const STARTQUESTIONCOUNTDOWN = 4;
const QUESTIONTIMELIMIT = 3;

const testUser = {
  email: 'z5481970@ad.unsw.edu.au',
  password: 'password1!',
  nameFirst: 'Yifan',
  nameLast: 'Liang'
};

function sendActionSpecific(
  action: GA,
  seshid: string,
  quizid: number,
  gameid: number
) {
  return putReq(`/v1/admin/quiz/${quizid}/game/${gameid}`, {
    json: { action },
    headers: { session: seshid }
  });
}

function sendAction(action: GA) {
  return sendActionSpecific(action, seshId, quizId, gameId);
}

const getState = (quizid: number, gameid: number, seshid: string) => {
  return getBody(getReq(`/v1/admin/quiz/${quizid}/game/${gameid}`, {
    headers: { session: seshid }
  })).state;
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
    const res = sendActionSpecific(GA.END, seshId, quizId, gameId + 1);
    expectResToBeError(res, true, 400);
  });

  test('invalid Action enum', () => {
    const res = putReq(`/v1/admin/quiz/${quizId}/game/${gameId}`, {
      json: { action: 'SHOOT' },
      headers: { session: seshId }
    });
    expectResToBeError(res, true, 400);
  });

  test('invalid action in current state', () => {
    const res = sendActionSpecific(GA.SKIP_COUNTDOWN, seshId, quizId, gameId);
    expectResToBeError(res, true, 400);
  });

  test('invalid session', () => {
    const res = sendActionSpecific(GA.END, seshId + 1, quizId, gameId);
    expectResToBeError(res, true, 401);
  });

  test('quiz does not exist', () => {
    const res = sendActionSpecific(GA.END, seshId, quizId + 1, gameId);
    expectResToBeError(res, true, 403);
  });

  test('user does not own quiz', () => {
    const seshId2: string = getSeshId(postReq('/v1/admin/auth/register', {
      json: {
        email: 'z1234567@ad.unsw.edu.au',
        password: 'password!1',
        nameFirst: 'Smelly',
        nameLast: 'Man'
      }
    }));
    const quizId2: number = startQuiz(seshId2);
    const gameId2: number = getBody(
      startTestGame(quizId2, seshId2, DEFAULTAUTOSTARTNUM)
    ).gameId;
    const res = sendActionSpecific(GA.END, seshId, quizId2, gameId2);
    expectResToBeError(res, true, 403);
  });
});

describe('success testing', () => {
  test('no errors in call', () => {
    const res = sendAction(GA.END);
    expectResToBeError(res, false, 200);
    expect(getBody(res)).toStrictEqual({ });
  });

  const testCases: { actions: (GA | 'WAIT')[]; expectedStates: string[] }[] = [
    {
      actions: [GA.END],
      expectedStates: ['LOBBY', 'END']
    },
    {
      actions: [GA.NEXT_QUESTION, 'WAIT', GA.END],
      expectedStates: ['LOBBY', 'QUESTION_COUNTDOWN', 'QUESTION_OPEN', 'END']
    },
    {
      actions: [GA.NEXT_QUESTION, GA.SKIP_COUNTDOWN, GA.END],
      expectedStates: ['LOBBY', 'QUESTION_COUNTDOWN', 'QUESTION_OPEN', 'END']
    },
    {
      actions: [GA.NEXT_QUESTION, GA.SKIP_COUNTDOWN, 'WAIT', GA.END],
      expectedStates: [
        'LOBBY', 'QUESTION_COUNTDOWN', 'QUESTION_OPEN', 'QUESTION_CLOSE', 'END'
      ]
    },
    {
      actions: [
        GA.NEXT_QUESTION,
        GA.SKIP_COUNTDOWN,
        GA.GO_TO_ANSWER,
        GA.END
      ],
      expectedStates: [
        'LOBBY',
        'QUESTION_COUNTDOWN',
        'QUESTION_OPEN',
        'ANSWER_SHOW',
        'END'
      ]
    },
    {
      actions: [
        GA.NEXT_QUESTION,
        GA.SKIP_COUNTDOWN,
        'WAIT',
        GA.GO_TO_FINAL_RESULTS,
        GA.END
      ],
      expectedStates: [
        'LOBBY',
        'QUESTION_COUNTDOWN',
        'QUESTION_OPEN',
        'QUESTION_CLOSE',
        'FINAL_RESULTS',
        'END'
      ]
    },
    // ^^ All possible end routes tested
    {
      actions: [
        GA.NEXT_QUESTION,
        GA.SKIP_COUNTDOWN,
        GA.GO_TO_ANSWER,
        GA.GO_TO_FINAL_RESULTS,
        GA.END
      ],
      expectedStates: [
        'LOBBY',
        'QUESTION_COUNTDOWN',
        'QUESTION_OPEN',
        'ANSWER_SHOW',
        'FINAL_RESULTS',
        'END'
      ]
    },
    {
      actions: [
        GA.NEXT_QUESTION,
        GA.SKIP_COUNTDOWN,
        'WAIT',
        GA.GO_TO_FINAL_RESULTS,
        GA.END
      ],
      expectedStates: [
        'LOBBY',
        'QUESTION_COUNTDOWN',
        'QUESTION_OPEN',
        'QUESTION_CLOSE',
        'FINAL_RESULTS',
        'END'
      ]
    },
    {
      actions: [
        GA.NEXT_QUESTION,
        GA.SKIP_COUNTDOWN,
        'WAIT',
        GA.NEXT_QUESTION,
        GA.END
      ],
      expectedStates: [
        'LOBBY',
        'QUESTION_COUNTDOWN',
        'QUESTION_OPEN',
        'QUESTION_CLOSE',
        'QUESTION_COUNTDOWN',
        'END'
      ]
    },
    {
      actions: [
        GA.NEXT_QUESTION,
        GA.SKIP_COUNTDOWN,
        'WAIT',
        GA.GO_TO_ANSWER,
        GA.NEXT_QUESTION,
        GA.END
      ],
      expectedStates: [
        'LOBBY',
        'QUESTION_COUNTDOWN',
        'QUESTION_OPEN',
        'QUESTION_CLOSE',
        'ANSWER_SHOW',
        'QUESTION_COUNTDOWN',
        'END'
      ]
    },
  ];

  test.each(testCases.map(tc => [
    `${tc.expectedStates.join(' -> ')}`,
    tc.actions,
    tc.expectedStates
  ]))('testing route: %s', async (_, actions, expectedStates) => {
    const stateHistory: string[] = [];

    let currentState = 'LOBBY';
    stateHistory.push(currentState);

    for (const action of actions) {
      if (
        currentState === 'QUESTION_COUNTDOWN' &&
        action === 'WAIT'
      ) {
        await new Promise(
          resolve => setTimeout(resolve, STARTQUESTIONCOUNTDOWN * 1000)
        );
      } else if (
        currentState === 'QUESTION_OPEN' &&
        action === 'WAIT'
      ) {
        await new Promise(
          resolve => setTimeout(resolve, QUESTIONTIMELIMIT * 1000)
        );
      } else if (action !== 'WAIT') {
        const res = sendAction(action);
        expectResToBeError(res, false, 200);
        expect(getBody(res)).toStrictEqual({ });
      }

      currentState = getState(quizId, gameId, seshId) as string;
      stateHistory.push(currentState);
    }

    expect(stateHistory).toEqual(expectedStates);
  });
});
