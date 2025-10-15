
import { deleteReq, postReq, getBody } from '../helperFunctions';
describe('DELETE /v1/admin/quiz/{quizid}', () => {
  let seshId: string;
  let quizId: number;

  beforeAll(() => {
    deleteReq('/v1/clear');
    const regRes = postReq('/v1/admin/auth/register', {
      json: {
        email: 'owner@test.com',
        password: 'password123',
        nameFirst: 'Owner',
        nameLast: 'User'
      }
    });
    seshId = getBody(regRes).session;
    quizId = getBody(postReq('/v1/admin/quiz', {
      json: { name: 'Owned Quiz', description: '' },
      headers: { session: seshId }
    })).quizId;
  });

  test('200: Successfully removes owned quiz', () => {
    const res = deleteReq(`/v1/admin/quiz/${quizId}`, {
      headers: { session: seshId }
    });
    expect(res.statusCode).toBe(200);
    expect(getBody(res)).toStrictEqual({});
  });

  test('401: Missing session header', () => {
    const res = deleteReq(`/v1/admin/quiz/${quizId}`);
    expect(res.statusCode).toBe(401);
    expect(getBody(res)).toStrictEqual({
      error: 'Session is empty or invalid'
    });
  });

  test('401: Invalid session token', () => {
    const res = deleteReq(`/v1/admin/quiz/${quizId}`, {
      headers: { session: 'invalid-session' }
    });
    expect(res.statusCode).toBe(401);
  });

  test('403: Non-numeric quiz ID', () => {
    const res = deleteReq('/v1/admin/quiz/not-a-number', {
      headers: { session: seshId }
    });
    expect(res.statusCode).toBe(403);
    expect(getBody(res)).toStrictEqual({
      error: 'Invalid quiz ID'
    });
  });

  test('403: Non-owner attempt', () => {
    // Create second user
    const seshId2 = getBody(postReq('/v1/admin/auth/register', {
      json: {
        email: 'nonowner@test.com',
        password: 'password456',
        nameFirst: 'Non',
        nameLast: 'Owner'
      }
    })).session;

    const res = deleteReq(`/v1/admin/quiz/${quizId}`, {
      headers: { session: seshId2 }
    });
    expect(res.statusCode).toBe(403);
  });
});
