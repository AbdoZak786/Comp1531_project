
import { deleteReq, postReq, getReq, getBody, getSeshId } from '../helperFunctions';
import { isErrorObjectType } from '../types';

describe('adminQuizQuestionSuggestion HTTP interface testing', () => {
  let seshId: string, quizId: number;

  beforeEach(() => {
    deleteReq('/v1/clear');
    const res = postReq('/v1/admin/auth/register', {
      json: {
        email: 'newuser@gmail.com',
        password: 'Password123',
        nameFirst: 'Fernando',
        nameLast: 'Djingga'
      }
    });
    const tempSeshId = getSeshId(res);
    if (isErrorObjectType(tempSeshId)) {
      throw new Error('User registration failed: ' + tempSeshId.error);
    }
    seshId = tempSeshId;
    // Create a quiz through HTTP and get its quizId
    const quizRes = postReq('/v1/admin/quiz', {
      json: { name: 'Australian Geography Quiz', description: 'Quiz about Australian Geography' },
      headers: { session: seshId }
    });
    quizId = getBody(quizRes).quizId;
  });

  describe('Success Cases', () => {
    test.skip('returns a valid suggestion when inputs are valid', () => {
      const res = getReq(`/v1/admin/quiz/${quizId}/question/suggestion`, {
        headers: { session: seshId }
      });
      const result = getBody(res);
      expect(result).toHaveProperty('question');
      expect(typeof result.question).toBe('string');
      expect(result.question.length).toBeGreaterThan(0);
    });
  });

  describe('Error Cases', () => {
    test('Error when quiz id is invalid', () => {
      const invalidQuizId = quizId + 1;
      const res = getReq(`/v1/admin/quiz/${invalidQuizId}/question/suggestion`, {
        headers: { session: seshId }
      });
      expect(res.statusCode).not.toBe(200);
      expect(() => getBody(res)).toThrow();
    });
    test('Error when user is not the owner', () => {
      // Register a new user who does not own the quiz
      const res2 = postReq('/v1/admin/auth/register', {
        json: {
          email: 'email@gmail.com',
          password: 'Password125',
          nameFirst: 'Ferna',
          nameLast: 'Ingga'
        }
      });
      const seshId2 = getSeshId(res2);
      if (typeof seshId2 !== 'string') throw new Error('Second user registration failed');

      const res = getReq(`/v1/admin/quiz/${quizId}/question/suggestion`, {
        headers: { session: seshId2 }
      });
      expect(res.statusCode).not.toBe(200);
      expect(() => getBody(res)).toThrow();
    });
  });
});
