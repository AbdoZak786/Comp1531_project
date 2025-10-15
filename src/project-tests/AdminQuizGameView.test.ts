import {
  deleteReq, getReq, postReq, getSeshId, getBody,
  startQuiz, expectResToBeError
} from '../helperFunctions';
import { describe, test, expect, beforeEach } from '@jest/globals';

let seshId: string;
const testUser = {
  email: 'z5481970@ad.unsw.edu.au',
  password: 'password1!',
  nameFirst: 'Yifan',
  nameLast: 'Liang'
};

beforeEach(() => {
  deleteReq('/v1/clear');
  seshId = getSeshId(postReq('/v1/admin/auth/register', { json: testUser }));
});

describe('GET /v1/admin/quiz/{quizid}/games - error testing', () => {
  test('session is empty or invalid', () => {
    const quizId = startQuiz(seshId);
    const res = getReq(`/v1/admin/quiz/${quizId}/games`, {
      headers: { session: 'invalidSession' }
    });
    expectResToBeError(res, true, 401);
  });

  test('quiz does not exist', () => {
    const res = getReq('/v1/admin/quiz/999/games', {
      headers: { session: seshId }
    });
    expectResToBeError(res, true, 403);
  });

  test('user does not own provided quiz', () => {
    const quizId = startQuiz(seshId);

    // Create second user
    const seshId2 = getSeshId(postReq('/v1/admin/auth/register', {
      json: {
        email: 'z9876543@ad.unsw.edu.au',
        password: 'password!1',
        nameFirst: 'Smelly',
        nameLast: 'Man'
      }
    }));

    const res = getReq(`/v1/admin/quiz/${quizId}/games`, {
      headers: { session: seshId2 }
    });
    expectResToBeError(res, true, 403);
  });
});

describe('GET /v1/admin/quiz/{quizid}/games - successful cases', () => {
  test('returns empty arrays when no games exist', () => {
    const quizId = startQuiz(seshId);
    const res = getReq(`/v1/admin/quiz/${quizId}/games`, {
      headers: { session: seshId }
    });

    expectResToBeError(res, false, 200);
    expect(getBody(res)).toStrictEqual({
      activeGames: [],
      inactiveGames: []
    });
  });
});
