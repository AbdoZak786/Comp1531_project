
// import { clear } from '../other';
// import { adminAuthRegister } from '../auth';
// import { adminQuizCreate, adminQuizInfo } from '../quiz';
// import * as data from '../src/dataStore';

import { deleteReq, postReq, getSeshId, getReq, getBody } from '../helperFunctions';
import { isErrorObjectType } from '../types';

describe('adminQuizInfo interface testing', () => {
  let seshId: string, quizId: number;
  const newUsers:
  Array<{ email: string; password: string; nameFirst: string; nameLast: string }> = [
    {
      email: 'test1@email.com',
      password: 'password123',
      nameFirst: 'John',
      nameLast: 'Doe'
    },
    {
      email: 'test2@email.com',
      password: 'password456',
      nameFirst: 'Jane',
      nameLast: 'Smith'
    }
  ];

  beforeEach(() => {
    // DataStore must be cleared before every test, and a user with session id should be registered
    deleteReq('/v1/clear');
    const tempId = getSeshId(
      postReq('/v1/admin/auth/register', { json: newUsers[0] })
    );
    if (isErrorObjectType(tempId)) throw new Error('Invalid Session Id');
    seshId = tempId;
    if (typeof seshId !== 'string') {
      throw new Error('Failed to register user');
    }
    // Create quiz via HTTP endpoint; get the quizId from response
    const resQuiz = postReq('/v1/admin/quiz', {
      json: { name: 'Test Quiz', description: 'A sample quiz' },
      headers: { session: seshId }
    });
    quizId = getBody(resQuiz).quizId;
  });
  describe('Successful cases', () => {
    test('successfully retrieves quiz info', () => {
      const res = getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: seshId } });
      expect(res.statusCode).toBe(200);
      const result = getBody(res);
      expect(result).toStrictEqual({
        quizId: expect.any(Number),
        thumbnailUrl: expect.any(String),
        name: 'Test Quiz',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: 'A sample quiz',
        numQuestions: 0,
        questions: [],
        timeLimit: 0
      });
    });
  });
  describe('Invalid Error cases', () => {
    test('error when user is not the owner', () => {
      // Register a second user via HTTP and get the session id
      const tempId2 = getSeshId(
        postReq('/v1/admin/auth/register', { json: newUsers[1] })
      );
      if (isErrorObjectType(tempId2)) {
        throw new Error('Failed to register second user: ' + tempId2.error);
      }
      const seshId2: string = tempId2;
      const res = getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: seshId2 } });
      expect(res.statusCode).toBe(403);
      expect(getBody(res)).toStrictEqual({
        error: expect.any(String),
      });
    });

    test('error when quizId is invalid', (): void => {
      const res = getReq(`/v1/admin/quiz/${quizId + 1}`, { headers: { session: seshId } });
      expect(res.statusCode).toBe(403);
      expect(getBody(res)).toStrictEqual({
        error: expect.any(String),
      });
    });
  });

  describe('Edge cases for extra fields', () => {
    test('numQuestions correctly returns the number of questions in the quiz', () => {
      let res = getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: seshId } });
      expect(res.statusCode).toBe(200);
      let result = (getBody(res));
      expect(result.numQuestions).toBe(0);

      // Add question through the HTTP endpoint
      const questionBody = {
        question: 'Who is the Monarch of England?',
        timeLimit: 4,
        points: 5,
        answerOptions: [
          { answer: 'Prince Charles', correct: true },
          { answer: 'Queen Elizabeth', correct: false }
        ]
      };

      // Call the HTTP endpoint for adding a question to the quiz.
      const resQuestion = postReq(`/v1/admin/quiz/${quizId}/question`, {
        json: { questionBody },
        headers: { session: seshId }
      });
      const questionResult = getBody(resQuestion);
      expect(questionResult).toHaveProperty('questionId');
      expect(typeof questionResult.questionId).toBe('number');

      // Get the quiz info via HTTP
      res = getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: seshId } });
      expect(res.statusCode).toBe(200);
      result = (getBody(res));
      expect(result.numQuestions).toBe(1);
      expect(result.questions).toEqual(expect.arrayContaining(
        [expect.objectContaining({ question: 'Who is the Monarch of England?' })]));
    });

    test('timeLimit returns correctly', () => {
      const res = getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: seshId } });
      expect(res.statusCode).toBe(200);
      const result = (getBody(res));
      expect(result.timeLimit).toBe(0);
    });
  });

  describe('adminQuizInfo v2 interface testing', () => {
    let seshId2: string, quizId2: number;
    const users = [
      {
        email: 'test3@email.com',
        password: 'password1234',
        nameFirst: 'Firstx',
        nameLast: 'Lastx'
      },
      {
        email: 'test4@email.com',
        password: 'password4567',
        nameFirst: 'Firsty',
        nameLast: 'Lasty'
      }
    ];

    beforeEach(() => {
      deleteReq('/v1/clear');
      const tmp = getSeshId(postReq('/v1/admin/auth/register', { json: users[0] }));
      if (isErrorObjectType(tmp)) throw new Error('Failed to register');
      seshId2 = tmp;
      const resQ = postReq('/v1/admin/quiz', {
        json: { name: 'Test Quiz', description: 'A sample quiz' },
        headers: { session: seshId2 }
      });
      quizId2 = getBody(resQ).quizId;
    });

    test('v2: 200 successful retrieval with no questions', () => {
      const res = getReq(`/v2/admin/quiz/${quizId2}`, { headers: { session: seshId2 } });
      expect(res.statusCode).toBe(200);
      const body = (getBody(res));
      expect(body).toStrictEqual({
        quizId: expect.any(Number),
        name: 'Test Quiz',
        timeCreated: expect.any(Number),
        timeLastEdited: expect.any(Number),
        description: 'A sample quiz',
        numQuestions: 0,
        questions: [],
        timeLimit: 0,
        thumbnailUrl: ''
      });
    });

    test('v2: 401 when session header is missing', () => {
      const res = getReq(`/v2/admin/quiz/${quizId2}`); // no session header
      expect(res.statusCode).toBe(401);
      expect(getBody(res)).toStrictEqual({
        error: expect.any(String),
      });
    });

    test('v2: 401 when session is invalid', () => {
      const res = getReq(`/v2/admin/quiz/${quizId2}`, { headers: { session: 'bogus' } });
      expect(res.statusCode).toBe(401);
      expect(getBody(res)).toStrictEqual({
        error: expect.any(String),
      });
    });

    test('v2: 400 when quizId is not a number', () => {
      const res = getReq('/v2/admin/quiz/notANumber', { headers: { session: seshId2 } });
      expect(res.statusCode).toBe(400);
      expect(getBody(res)).toStrictEqual({
        error: expect.any(String),
      });
    });

    test('v2: 403 when user is not owner', () => {
      const tmp2 = getSeshId(postReq('/v1/admin/auth/register', { json: users[1] }));
      if (isErrorObjectType(tmp2)) throw new Error('Failed second register');
      const res = getReq(`/v2/admin/quiz/${quizId2}`, { headers: { session: tmp2 } });
      expect(res.statusCode).toBe(403);
      expect(getBody(res)).toStrictEqual({
        error: expect.any(String),
      });
    });

    test('v2: 403 when quiz does not exist', () => {
      const res = getReq(`/v1/admin/quiz/${quizId2 + 1}`, { headers: { session: seshId2 } });
      expect(res.statusCode).toBe(403);
      expect(getBody(res)).toStrictEqual({
        error: expect.any(String),
      });
    });

    test('v2: returns full question details after adding a question', () => {
      // Add a question via v1 endpoint
      const question = {
        question: 'Who is Monarch?',
        timeLimit: 4,
        points: 5,
        answerOptions: [
          { answer: 'Prince Charles', correct: true },
          { answer: 'Queen Elizabeth', correct: false }
        ],
        thumbnailUrl: 'http://google.com/some/image/path.jpg'
      };
      const resQ = postReq(`/v2/admin/quiz/${quizId2}/question`, {
        json: { questionBody: question },
        headers: { session: seshId2 }
      });
      expect((getBody(resQ))).toHaveProperty('questionId');

      const res = getReq(`/v2/admin/quiz/${quizId2}`, { headers: { session: seshId2 } });
      expect(res.statusCode).toBe(200);
      const body = (getBody(res));

      // Check quiz fields, question and answer details
      expect(body.numQuestions).toBe(1);
      expect(body.thumbnailUrl).toBe('');

      const q = body.questions[0];
      // match object because these r the only fields im interested in
      expect(q).toMatchObject({
        questionId: expect.any(Number),
        question: 'Who is Monarch?',
        timeLimit: 4,
        thumbnailUrl: 'http://google.com/some/image/path.jpg',
        points: 5
      });

      expect(Array.isArray(q.answerOptions)).toBe(true);
      expect(q.answerOptions.length).toBe(2);
      const [opt1, opt2] = q.answerOptions;
      expect(opt1).toStrictEqual({
        answerId: expect.any(Number),
        answer: 'Prince Charles',
        color: expect.any(String),
        correct: true,
      });
      expect(opt2).toStrictEqual({
        answerId: expect.any(Number),
        answer: 'Queen Elizabeth',
        color: expect.any(String),
        correct: false
      });
    });
  });
});
