// import { clear } from '../other';
// import { adminAuthRegister } from '../auth';
// import { adminQuizCreate, adminQuizQuestionCreate } from '../quiz';
import { deleteReq, postReq, getSeshId, getBody, getReq } from '../helperFunctions';
import { isColoursEnum, isErrorObjectType } from '../types';
// import * as data from '../dataStore';

// v1 tests
describe('adminQuizQuestionCreate interface testing', () => {
  let seshId: string;
  let quizId: number;

  beforeEach(() => {
    deleteReq('/v1/clear');
    // Register a user through HTTP and get session id
    const tempSeshId = getSeshId(
      postReq('/v1/admin/auth/register', {
        json: {
          email: 'email@gmail.com',
          password: 'Password123',
          nameFirst: 'Fernando',
          nameLast: 'Djingga'
        }
      })
    );
    if (isErrorObjectType(tempSeshId)) {
      throw new Error('Failed to register user: ' + tempSeshId.error);
    }
    seshId = tempSeshId;
    // Create a quiz through HTTP and get quizId
    const resQuiz = postReq('/v1/admin/quiz', {
      json: { name: 'Sample Quiz', description: 'A sample quiz for testing' },
      headers: { session: seshId }
    });
    quizId = getBody(resQuiz).quizId;
  });

  describe('Success Tests', () => {
    test('successfully creates a question with valid inputs', () => {
      const questionBody: {
        question: string;
        timeLimit: number;
        points: number;
        answerOptions: Array<{ answer: string; correct: boolean }>;
      } = {
        question: 'Who is the Monarch of England?',
        timeLimit: 4,
        points: 5,
        answerOptions: [
          { answer: 'Prince Charles', correct: true },
          { answer: 'Queen Elizabeth', correct: false }
        ]
      };
      // HTTP endpoint for creating quiz question, request body wraps question body
      let res = postReq(`/v1/admin/quiz/${quizId}/question`, {
        json: { questionBody },
        headers: { session: seshId }
      });
      const result = getBody(res);
      expect(result).toHaveProperty('questionId');
      expect(typeof result.questionId).toBe('number');

      // Check if the question was added correctly, timing and colors are also correct.
      res = getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: seshId } });
      const updatedQuiz = getBody(res);
      expect(updatedQuiz.numQuestions).toBe(1);
      expect(updatedQuiz.questions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ question: 'Who is the Monarch of England?' })
        ])
      );
    });

    test('successfully creates multiple questions with unique questionIds, answer colours', () => {
      const q1Body: {
        question: string;
        timeLimit: number;
        points: number;
        answerOptions: Array<{ answer: string; correct: boolean }>;
      } = {
        question: 'What is 2+2?',
        timeLimit: 10,
        points: 3,
        answerOptions: [
          { answer: '3', correct: false },
          { answer: '4', correct: true }
        ]
      };
      const q2Body: {
        question: string;
        timeLimit: number;
        points: number;
        answerOptions: Array<{ answer: string; correct: boolean }>;
      } = {
        question: 'What is the capital city of Australia?',
        timeLimit: 15,
        points: 4,
        answerOptions: [
          { answer: 'Canberra', correct: true },
          { answer: 'Sydney', correct: false }
        ]
      };
      const res1 = postReq(`/v1/admin/quiz/${quizId}/question`, {
        json: { questionBody: q1Body },
        headers: { session: seshId }
      });
      const res2 = postReq(`/v1/admin/quiz/${quizId}/question`, {
        json: { questionBody: q2Body },
        headers: { session: seshId }
      });
      const result1 = getBody(res1);
      const result2 = getBody(res2);
      expect(result1).toHaveProperty('questionId');
      expect(result2).toHaveProperty('questionId');
      expect(result1.questionId).not.toEqual(result2.questionId);
    });
  });

  describe('Error Tests', () => {
    test('error when question text is less than 5 characters', () => {
      const questionBody = {
        question: 'Hi?',
        timeLimit: 10,
        points: 5,
        answerOptions: [
          { answer: 'A', correct: true },
          { answer: 'B', correct: false }
        ]
      };
      const res = postReq(`/v1/admin/quiz/${quizId}/question`, {
        json: { questionBody },
        headers: { session: seshId }
      });
      expect(() => getBody(res)).toThrow();
    });

    test('error when question text is more than 50 characters', () => {
      const longQuestion: string = 'A'.repeat(51);
      const questionBody = {
        question: longQuestion,
        timeLimit: 10,
        points: 5,
        answerOptions: [
          { answer: 'Option1', correct: true },
          { answer: 'Option2', correct: false }
        ]
      };
      const res = postReq(`/v1/admin/quiz/${quizId}/question`, {
        json: { questionBody },
        headers: { session: seshId }
      });
      expect(() => getBody(res)).toThrow();
    });

    test('error when answerOptions has less than 2 answers', () => {
      const questionBody = {
        question: 'Valid question?',
        timeLimit: 10,
        points: 5,
        answerOptions: [
          { answer: 'Only one', correct: true }
        ]
      };
      const res = postReq(`/v1/admin/quiz/${quizId}/question`, {
        json: { questionBody },
        headers: { session: seshId }
      });
      expect(() => getBody(res)).toThrow();
    });

    test('error when answerOptions has more than 6 answers', () => {
      const answers: Array<{ answer: string; correct: boolean }> = [];
      for (let i = 0; i < 7; i++) {
        answers.push({ answer: `Option ${i}`, correct: i === 0 });
      }
      const questionBody = {
        question: 'Valid question?',
        timeLimit: 10,
        points: 5,
        answerOptions: answers
      };
      const res = postReq(`/v1/admin/quiz/${quizId}/question`, {
        json: { questionBody },
        headers: { session: seshId }
      });
      expect(() => getBody(res)).toThrow();
    });

    test('error when timeLimit is not a positive number', () => {
      const questionBody = {
        question: 'Valid question?',
        timeLimit: 0,
        points: 5,
        answerOptions: [
          { answer: 'Option1', correct: true },
          { answer: 'Option2', correct: false }
        ]
      };
      const res = postReq(`/v1/admin/quiz/${quizId}/question`, {
        json: { questionBody },
        headers: { session: seshId }
      });
      expect(() => getBody(res)).toThrow();
    });

    test('error when the sum of timeLimits in quiz exceeds 180 seconds or 3 minutes', () => {
      const q1Body = {
        question: 'First question?',
        timeLimit: 170,
        points: 5,
        answerOptions: [
          { answer: 'A', correct: true },
          { answer: 'B', correct: false }
        ]
      };
      const res1 = postReq(`/v1/admin/quiz/${quizId}/question`, {
        json: { questionBody: q1Body },
        headers: { session: seshId }
      });
      expect(getBody(res1)).toHaveProperty('questionId');
      const q2Body = {
        question: 'Second question?',
        timeLimit: 20,
        points: 5,
        answerOptions: [
          { answer: 'C', correct: true },
          { answer: 'D', correct: false }
        ]
      };
      const res2 = postReq(`/v1/admin/quiz/${quizId}/question`, {
        json: { questionBody: q2Body },
        headers: { session: seshId }
      });
      expect(getBody(res2)).toHaveProperty('error');
    });

    test('error when points awarded is less than 1 or greater than 10', () => {
      const pointsTooLow = {
        question: 'Valid question?',
        timeLimit: 10,
        points: 0,
        answerOptions: [
          { answer: 'Option1', correct: true },
          { answer: 'Option2', correct: false }
        ]
      };
      const pointsTooHigh = {
        question: 'Valid question?',
        timeLimit: 10,
        points: 11,
        answerOptions: [
          { answer: 'Option1', correct: true },
          { answer: 'Option2', correct: false }
        ]
      };
      const resLow = postReq(`/v1/admin/quiz/${quizId}/question`, {
        json: { questionBody: pointsTooLow },
        headers: { session: seshId }
      });
      const resHigh = postReq(`/v1/admin/quiz/${quizId}/question`, {
        json: { questionBody: pointsTooHigh },
        headers: { session: seshId }
      });
      expect(getBody(resLow)).toHaveProperty('error');
      expect(getBody(resHigh)).toHaveProperty('error');
    });

    test('error when answer option length is shorter than 1 or longer than 30 characters', () => {
      const tooShortAnswerBody = {
        question: 'Valid question?',
        timeLimit: 10,
        points: 5,
        answerOptions: [
          { answer: '', correct: true },
          { answer: 'Valid', correct: false }
        ]
      };
      const tooLongAnswerBody = {
        question: 'Valid question?',
        timeLimit: 10,
        points: 5,
        answerOptions: [
          { answer: 'A'.repeat(31), correct: true },
          { answer: 'Valid', correct: false }
        ]
      };
      const resShort = postReq(`/v1/admin/quiz/${quizId}/question`, {
        json: { questionBody: tooShortAnswerBody },
        headers: { session: seshId }
      });
      const resLong = postReq(`/v1/admin/quiz/${quizId}/question`, {
        json: { questionBody: tooLongAnswerBody },
        headers: { session: seshId }
      });
      expect(getBody(resShort)).toHaveProperty('error');
      expect(getBody(resLong)).toHaveProperty('error');
    });

    test('error when duplicate answer strings are present in answerOptions', () => {
      const questionBody = {
        question: 'Valid question?',
        timeLimit: 10,
        points: 5,
        answerOptions: [
          { answer: 'Duplicate', correct: true },
          { answer: 'Duplicate', correct: false }
        ]
      };
      const res = postReq(`/v1/admin/quiz/${quizId}/question`, {
        json: { questionBody },
        headers: { session: seshId }
      });
      expect(() => getBody(res)).toThrow();
    });

    test('error when there are no correct answers', () => {
      const questionBody = {
        question: 'Valid question?',
        timeLimit: 10,
        points: 5,
        answerOptions: [
          { answer: 'Option1', correct: false },
          { answer: 'Option2', correct: false }
        ]
      };
      const res = postReq(`/v1/admin/quiz/${quizId}/question`, {
        json: { questionBody },
        headers: { session: seshId }
      });
      expect(() => getBody(res)).toThrow();
    });

    test('error when a user that does not own the quiz tries to create a question', () => {
      // Register a second user through HTTP who does not own the quiz
      const tempOtherUserId = getSeshId(
        postReq('/v1/admin/auth/register', {
          json: {
            email: 'other@gmail.com',
            password: 'Password123',
            nameFirst: 'Ferna',
            nameLast: 'Ingga'
          }
        })
      );
      if (isErrorObjectType(tempOtherUserId)) {
        throw new Error('Failed to register other user: ' + tempOtherUserId.error);
      }
      const otherUserId: string = tempOtherUserId;
      const questionBody = {
        question: 'Valid question?',
        timeLimit: 10,
        points: 5,
        answerOptions: [
          { answer: 'Option1', correct: true },
          { answer: 'Option2', correct: false }
        ]
      };
      const res = postReq(`/v1/admin/quiz/${quizId}/question`, {
        json: { questionBody },
        headers: { session: otherUserId }
      });
      expect(() => getBody(res)).toThrow();
    });

    test('error when quizId is invalid', () => {
      const invalidQuizId: number = quizId + 1;
      const questionBody = {
        question: 'Valid question?',
        timeLimit: 10,
        points: 5,
        answerOptions: [
          { answer: 'Option1', correct: true },
          { answer: 'Option2', correct: false }
        ]
      };
      const res = postReq(`/v1/admin/quiz/${invalidQuizId}/question`, {
        json: { questionBody },
        headers: { session: seshId }
      });
      expect(() => getBody(res)).toThrow();
    });

    test('error when userId is invalid', () => {
      const res = postReq(`/v1/admin/quiz/${quizId}/question`, {
        json: {
          questionBody: {
            question: 'Valid question?',
            timeLimit: 10,
            points: 5,
            answerOptions: [
              { answer: 'Option1', correct: true },
              { answer: 'Option2', correct: false }
            ]
          }
        },
        headers: { session: 'invalid' }
      });
      expect(() => getBody(res)).toThrow();
    });
    test('error when questionBody missing or not object', () => {
      // Empty JSON → no questionBody → 400
      const res = postReq(`/v1/admin/quiz/${quizId}/question`, {
        headers: { session: seshId },
        json: { }
      });
      expect(() => getBody(res)).toThrow();
    });
    test('error when quizId is not a number', () => {
      const questionBody = {
        question: 'Valid question?',
        timeLimit: 5,
        points: 2,
        answerOptions: [
          { answer: 'A', correct: true },
          { answer: 'B', correct: false }
        ]
      };
      const res = postReq('/v1/admin/quiz/abc/question', {
        headers: { session: seshId },
        json: { questionBody }
      });
      expect(() => getBody(res)).toThrow();
    });
    test('error when session header missing', () => {
      const questionBody = {
        question: 'Valid question?',
        timeLimit: 5,
        points: 2,
        answerOptions: [
          { answer: 'A', correct: true },
          { answer: 'B', correct: false }
        ]
      };
      const res = postReq(`/v1/admin/quiz/${quizId}/question`, {
        json: { questionBody }
        // <— no headers.session
      });
      expect(() => getBody(res)).toThrow();
    });
  });
});

// v2 tests
describe('v2 adminQuizQuestionCreate interface testing', () => {
  let seshId: string;
  let otherSeshId: string;
  let quizId: number;

  // v2 questionBody
  const validBody = {
    question: 'What is 1+1?',
    timeLimit: 5,
    points: 2,
    answerOptions: [
      { answer: '2', correct: true },
      { answer: '3', correct: false }
    ],
    thumbnailUrl: 'https://google.com/image.png'
  };

  beforeEach(() => {
    deleteReq('/v1/clear');
    // Register users and a create quiz
    const t1 = getSeshId(postReq('/v1/admin/auth/register', {
      json: {
        email: 'f@d.com',
        password: 'Password123',
        nameFirst: 'Fer',
        nameLast: 'Dji'
      }
    }));
    if (isErrorObjectType(t1)) throw new Error(t1.error);
    seshId = t1;

    const q = postReq('/v1/admin/quiz', {
      json: { name: 'Quiz', description: 'Desc' },
      headers: { session: seshId }
    });
    quizId = getBody(q).quizId;

    const t2 = getSeshId(postReq('/v1/admin/auth/register', {
      json: {
        email: 'g@d.com',
        password: 'Password125',
        nameFirst: 'Ferna',
        nameLast: 'Ingga'
      }
    }));
    if (isErrorObjectType(t2)) throw new Error(t2.error);
    otherSeshId = t2;
  });

  // Success Test
  test('Success (200) returns questionId and quiz is updated', () => {
    const res = postReq(`/v2/admin/quiz/${quizId}/question`, {
      json: { questionBody: validBody },
      headers: { session: seshId }
    });
    expect(res.statusCode).toBe(200);
    const body = getBody(res);
    expect(body).toHaveProperty('questionId');

    // Verify that the question exists
    const quizRes = getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: seshId } });
    const quiz = getBody(quizRes);
    expect(quiz.numQuestions).toBe(1);
    const q = quiz.questions.find((x: any) => x.question === validBody.question);
    expect(q).toBeDefined();

    // Ensure answerIds and colours are valid
    expect(q.answerOptions.every((a: any) =>
      typeof a.answerId === 'number' &&
      isColoursEnum(a.color)
    )).toBe(true);
  });

  // Error Tests 400
  test('Error if quizId not a number', () => {
    const res = postReq('/v2/admin/quiz/foo/question', {
      json: { questionBody: validBody },
      headers: { session: seshId }
    });
    expect(res.statusCode).toBe(400);
  });

  test('Error if questionBody is invalid', () => {
    const res = postReq(`/v2/admin/quiz/${quizId}/question`, {
      json: {},
      headers: { session: seshId }
    });
    expect(res.statusCode).toBe(400);
  });

  test('Error if thumbnailUrl missing', () => {
    const body = { ...validBody } as any;
    delete body.thumbnailUrl;
    const res = postReq(`/v2/admin/quiz/${quizId}/question`, {
      json: { questionBody: body },
      headers: { session: seshId }
    });
    expect(res.statusCode).toBe(400);
    expect(getBody(res).error).toMatch(/Thumbnail URL/);
  });

  test('Error if thumbnailUrl invalid format', () => {
    const bads = ['', 'lol://haha.jpg', 'http://bitmap.bmp', 'p.png'];
    for (const u of bads) {
      const body = { ...validBody, thumbnailUrl: u };
      const res = postReq(`/v2/admin/quiz/${quizId}/question`, {
        json: { questionBody: body },
        headers: { session: seshId }
      });
      expect(res.statusCode).toBe(400);
      expect(getBody(res).error).toMatch(/Thumbnail URL/);
    }
  });

  test('Error if question text too short or too long', () => {
    const tooShort = { ...validBody, question: 'Hey?' };
    const tooLong = { ...validBody, question: 'A'.repeat(51) };
    const r1 = postReq(`/v2/admin/quiz/${quizId}/question`, {
      json: { questionBody: tooShort }, headers: { session: seshId }
    });
    const r2 = postReq(`/v2/admin/quiz/${quizId}/question`, {
      json: { questionBody: tooLong }, headers: { session: seshId }
    });
    expect(r1.statusCode).toBe(400);
    expect(getBody(r1).error).toMatch(/between 5 and 50 characters/);
    expect(r2.statusCode).toBe(400);
    expect(getBody(r2).error).toMatch(/between 5 and 50 characters/);
  });

  test('Error if timeLimit invalid', () => {
    const body = { ...validBody, timeLimit: 0 };
    const res = postReq(`/v2/admin/quiz/${quizId}/question`, {
      json: { questionBody: body }, headers: { session: seshId }
    });
    expect(res.statusCode).toBe(400);
    expect(getBody(res).error).toMatch(/positive number/);
  });

  test('Error if points outside <1 or >10', () => {
    const low = { ...validBody, points: 0 };
    const high = { ...validBody, points: 11 };
    const r1 = postReq(`/v2/admin/quiz/${quizId}/question`, {
      json: { questionBody: low }, headers: { session: seshId }
    });
    const r2 = postReq(`/v2/admin/quiz/${quizId}/question`, {
      json: { questionBody: high }, headers: { session: seshId }
    });
    expect(r1.statusCode).toBe(400);
    expect(getBody(r1).error).toMatch(/between 1 and 10/);
    expect(r2.statusCode).toBe(400);
    expect(getBody(r2).error).toMatch(/between 1 and 10/);
  });

  test('Error if answerOptions length <2 or >6', () => {
    const tooFew = { ...validBody, answerOptions: [{ answer: 'A', correct: true }] };
    const tooMany = Array.from({ length: 7 }, (_, i) => ({
      answer: `opt${i}`, correct: i === 0
    }));
    const r1 = postReq(`/v2/admin/quiz/${quizId}/question`, {
      json: { questionBody: tooFew }, headers: { session: seshId }
    });
    const r2 = postReq(`/v2/admin/quiz/${quizId}/question`, {
      json: { questionBody: { ...validBody, answerOptions: tooMany } },
      headers: { session: seshId }
    });
    expect(r1.statusCode).toBe(400);
    expect(getBody(r1).error).toMatch(/between 2 and 6/);
    expect(r2.statusCode).toBe(400);
    expect(getBody(r2).error).toMatch(/between 2 and 6/);
  });

  test('Error if duplicate answers', () => {
    const dup = {
      ...validBody,
      answerOptions: [
        { answer: 'dup', correct: true },
        { answer: 'Dup', correct: false }
      ]
    };
    const res = postReq(`/v2/admin/quiz/${quizId}/question`, {
      json: { questionBody: dup }, headers: { session: seshId }
    });
    expect(res.statusCode).toBe(400);
    expect(getBody(res).error).toMatch(/Duplicate answer options/);
  });

  test('Error if no correct answers', () => {
    const none = {
      ...validBody,
      answerOptions: [
        { answer: 'A', correct: false },
        { answer: 'B', correct: false }
      ]
    };
    const res = postReq(`/v2/admin/quiz/${quizId}/question`, {
      json: { questionBody: none }, headers: { session: seshId }
    });
    expect(res.statusCode).toBe(400);
    expect(getBody(res).error).toMatch(/At least one answer option/);
  });

  test('Error if total timeLimit goes over 180s', () => {
    // First question 3 minutes
    const first = { ...validBody, timeLimit: 180 };
    const ok = postReq(`/v2/admin/quiz/${quizId}/question`, {
      json: { questionBody: first }, headers: { session: seshId }
    });
    expect(ok.statusCode).toBe(200);
    // Second question has no time left
    const second = { ...validBody, timeLimit: 1 };
    const r2 = postReq(`/v2/admin/quiz/${quizId}/question`, {
      json: { questionBody: second }, headers: { session: seshId }
    });
    expect(r2.statusCode).toBe(400);
    expect(getBody(r2).error).toMatch(/total time limit for all questions/);
  });

  // Error Tests 401
  test('Error if session is invalid', () => {
    const res = postReq(`/v2/admin/quiz/${quizId}/question`, {
      json: { questionBody: validBody },
      headers: { session: 'invalid' }
    });
    expect(res.statusCode).toBe(401);
  });

  test('Error if session header invalid', () => {
    const res = postReq(`/v2/admin/quiz/${quizId}/question`, {
      json: { questionBody: validBody }
    });
    expect(res.statusCode).toBe(401);
  });

  // Error Tests 403
  test('Error if user is not the quiz owner', () => {
    const res = postReq(`/v2/admin/quiz/${quizId}/question`, {
      json: { questionBody: validBody },
      headers: { session: otherSeshId }
    });
    expect(res.statusCode).toBe(403);
  });
  test('Error if quiz does not exist', () => {
    const res = postReq(`/v2/admin/quiz/${quizId + 1}/question`, {
      headers: { session: seshId },
      json: { questionBody: validBody }
    });
    expect(res.statusCode).toBe(403);
  });
});
