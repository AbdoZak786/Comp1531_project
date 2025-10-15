// import { adminAuthRegister } from '../auth';
// import { adminQuizCreate, adminQuizList } from '../quiz';
// import { clear } from '../other';

import { postReq, getReq, getSeshId, deleteReq, getBody } from '../helperFunctions';
import { isErrorObjectType } from '../types';

describe('adminQuizList', () => {
  // Declare the variables for testing
  let email: string, password: string, nameFirst: string, nameLast: string, seshId: string;

  // Reset the state of the application before each test to keep them independent
  beforeEach(() => {
    deleteReq('/v1/clear');
    // Ensure there is one registered user to fetch the list of its quizzes
    email = 'user@gmail.com';
    password = 'Password123';
    nameFirst = 'Fernando';
    nameLast = 'Djingga';
    const tempSeshId = getSeshId(
      postReq('/v1/admin/auth/register', { json: { email, password, nameFirst, nameLast } })
    );
    if (isErrorObjectType(tempSeshId)) {
      throw new Error('Failed to register user: ' + tempSeshId.error);
    }
    seshId = tempSeshId;
  });

  describe('adminQuizList Success Tests', () => {
    // Success Test 1: Function must be able to fetch a quiz list for a user with at least one quiz
    test('Fetching a quiz list with one single quiz', () => {
      const name: string = 'Quiz';
      const description:string = 'Description';
      const resCreate = postReq('/v1/admin/quiz', {
        json: { name, description },
        headers: { session: seshId }
      });
      const createQuiz = getBody(resCreate);
      expect(createQuiz).toHaveProperty('quizId');

      const resList = getReq('/v1/admin/quiz/list', { headers: { session: seshId } });
      const result = getBody(resList);
      expect(Array.isArray(result.quizzes)).toBe(true);
      expect(result.quizzes.length).toBeGreaterThanOrEqual(1);

      const quiz = result.quizzes.find((q: any) => q.quizId === createQuiz.quizId);
      expect(quiz).toBeDefined();
      expect(quiz).toHaveProperty('name', name);
    });

    // Success Test 2: Function must be able to fetch a quiz list for a user with no quizzes
    test('Fetching an empty quiz list for a user with 0 quizzes', () => {
      // Create a new user with no quizzes
      const email2: string = 'newuser@gmail.com';
      const password2: string = 'Password124';
      const nameFirst2: string = 'Nando';
      const nameLast2: string = 'Djin';
      const tempSeshId2 = getSeshId(
        postReq('/v1/admin/auth/register', {
          json: {
            email: email2,
            password: password2,
            nameFirst: nameFirst2,
            nameLast: nameLast2
          }
        })
      );
      if (isErrorObjectType(tempSeshId2)) {
        throw new Error('Failed to register second user: ' + tempSeshId2.error);
      }
      const seshId2: string = tempSeshId2;
      const resList = getReq('/v1/admin/quiz/list', { headers: { session: seshId2 } });
      const result = getBody(resList);
      expect(Array.isArray(result.quizzes)).toBe(true);
      expect(result.quizzes.length).toBe(0);
    });

    // Success Test 3: Function must be able to return quizzes in the correct
    // order: from the oldest to the newest
    test('Quizzes return in the correct order', () => {
      postReq('/v1/admin/quiz', {
        json: { name: 'Quiz 1', description: 'First' },
        headers: { session: seshId }
      });
      postReq('/v1/admin/quiz', {
        json: { name: 'Quiz 2', description: 'Second' },
        headers: { session: seshId }
      });
      postReq('/v1/admin/quiz', {
        json: { name: 'Quiz 3', description: 'Third' },
        headers: { session: seshId }
      });
      const resList = getReq('/v1/admin/quiz/list', { headers: { session: seshId } });
      const result = getBody(resList);
      expect(result.quizzes[0].name).toBe('Quiz 1');
      expect(result.quizzes[1].name).toBe('Quiz 2');
      expect(result.quizzes[2].name).toBe('Quiz 3');
    });

    // Success Test 4: Function must be able to return quizzes in the correct
    // order (in ascending order)
    test('Quiz list is sorted in by quizId in ascending order', () => {
      const res1 = postReq('/v1/admin/quiz', {
        json: { name: 'Quiz A', description: 'First' },
        headers: { session: seshId }
      });
      const res2 = postReq('/v1/admin/quiz', {
        json: { name: 'Quiz B', description: 'Second' },
        headers: { session: seshId }
      });
      const res3 = postReq('/v1/admin/quiz', {
        json: { name: 'Quiz C', description: 'Third' },
        headers: { session: seshId }
      });
      const quiz1 = getBody(res1);
      const quiz2 = getBody(res2);
      const quiz3 = getBody(res3);
      const resList = getReq('/v1/admin/quiz/list', { headers: { session: seshId } });
      const result = getBody(resList);
      // Verify quizIds is in the correct order
      const quizIdCheck = result.quizzes.map((q: any) => q.quizId);
      expect(quizIdCheck).toEqual([quiz1.quizId, quiz2.quizId, quiz3.quizId]);
    });

    // Success Test 5: Function must be able to fetch a quiz list with a
    // large number of quizzes
    test('Retrieving quiz list with a very large number of quizzes', () => {
      for (let i = 1; i <= 300; i++) {
        postReq('/v1/admin/quiz', {
          json: { name: `Quiz ${i}`, description: `Description for quiz ${i}` },
          headers: { session: seshId }
        });
      }
      const resList = getReq('/v1/admin/quiz/list', { headers: { session: seshId } });
      const result = getBody(resList);
      expect(result.quizzes.length).toBe(300);
    });

    // Success Test 6: Function must prevent any user to have other
    // users' quizzes in their quiz list
    test('Fetched quiz list must be correct to any specific user', () => {
      // Create 2 users and different quizzes
      postReq('/v1/admin/quiz', {
        json: { name: 'Quiz 1', description: 'Description 1' },
        headers: { session: seshId }
      });
      const resList1 = getReq('/v1/admin/quiz/list', { headers: { session: seshId } });
      const quizList1 = getBody(resList1);

      const email2: string = 'user2@gmail.com';
      const password2: string = 'Password125';
      const nameFirst2: string = 'Ferna';
      const nameLast2: string = 'Ingga';
      const tempSeshId2 = getSeshId(
        postReq('/v1/admin/auth/register', {
          json: {
            email: email2,
            password: password2,
            nameFirst: nameFirst2,
            nameLast: nameLast2
          }
        })
      );
      if (isErrorObjectType(tempSeshId2)) {
        throw new Error('Failed to register second user: ' + tempSeshId2.error);
      }
      const seshId2: string = tempSeshId2;
      postReq('/v1/admin/quiz', {
        json: { name: 'Quiz 2', description: 'Description 2' },
        headers: { session: seshId2 }
      });
      const resList2 = getReq('/v1/admin/quiz/list', { headers: { session: seshId2 } });
      const quizList2 = getBody(resList2);
      // Check if the quizzes are there
      expect(quizList1.quizzes.some((q: any) => q.name === 'Quiz 2')).toBe(false);
      expect(quizList2.quizzes.some((q: any) => q.name === 'Quiz 1')).toBe(false);
    });
  });

  describe('adminQuizList Error Tests', () => {
    // Error Test 1: missing or invalid session header
    test('401 when session header is missing or invalid', () => {
      const res = getReq('/v1/admin/quiz/list');
      expect(res.statusCode).toBe(401);
      expect(() => getBody(res)).toThrow();
    });

    // Error Test 2: invalid session types
    test.each([
      0.5,
      -1,
      null,
      undefined,
      '123',
      '',
      [1, 2, 3],
      {},
      true,
      false
    ])('401 when session header is malformed: %p', (badSession: any) => {
      const res = getReq('/v1/admin/quiz/list', {
        headers: { session: String(badSession) }
      });
      expect(res.statusCode).toBe(401);
      expect(() => getBody(res)).toThrow();
    });

    // Error Test 3: duplicate quiz name for same user
    test('403 when attempting to create a duplicate quiz name for the same user', () => {
      const name: string = 'Duplicate Quiz';
      postReq('/v1/admin/quiz', {
        json: { name, description: 'Description 1' },
        headers: { session: seshId }
      });
      const resDuplicate = postReq('/v1/admin/quiz', {
        json: { name, description: 'Description 2' },
        headers: { session: seshId }
      });
      expect(() => getBody(resDuplicate)).toThrow();
    });
  });
});
