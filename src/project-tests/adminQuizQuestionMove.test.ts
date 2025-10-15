
import { deleteReq, postReq, getSeshId, getBody, getReq, putReq } from '../helperFunctions';

beforeEach(() => {
  deleteReq('/v1/clear');
});

describe('PUT /v1/admin/quiz/{quizid}/question/{questionid}/move', () => {
  let seshId: string;
  let quizId: number;
  let questionId1: number;
  let questionId2: number;

  beforeEach(() => {
    // Register user and create quiz for testing
    const registerResponse = postReq('/v1/admin/auth/register', {
      json: {
        email: 'test@example.com',
        password: 'Password123',
        nameFirst: 'Test',
        nameLast: 'User'
      }
    });

    const possibleSeshId = getSeshId(registerResponse);
    if (typeof possibleSeshId !== 'string') {
      throw new Error('Failed to register user');
    }
    seshId = possibleSeshId;

    // Create quiz
    const quizRes = postReq('/v1/admin/quiz', {
      json: { name: 'Test Quiz', description: 'Test Description' },
      headers: { session: seshId }
    });
    quizId = getBody(quizRes).quizId;

    // Add questions
    const question1Res = postReq(`/v1/admin/quiz/${quizId}/question`, {
      json: {
        questionBody: {
          question: 'Question 1',
          timeLimit: 10,
          points: 5,
          answerOptions: [
            { answer: 'Answer 1', correct: true },
            { answer: 'Answer 2', correct: false }
          ]
        }
      },
      headers: { session: seshId }
    });
    questionId1 = getBody(question1Res).questionId;

    const question2Res = postReq(`/v1/admin/quiz/${quizId}/question`, {
      json: {
        questionBody: {
          question: 'Question 2',
          timeLimit: 15,
          points: 10,
          answerOptions: [
            { answer: 'Answer A', correct: true },
            { answer: 'Answer B', correct: false }
          ]
        }
      },
      headers: { session: seshId }
    });
    questionId2 = getBody(question2Res).questionId;
  });

  test('Successfully move question to new position', () => {
    // Get initial quiz info
    const initialQuizRes = getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: seshId } });
    const initialQuiz = getBody(initialQuizRes);
    const initialTimeLastEdited = initialQuiz.timeLastEdited;

    // Move question 1 to position 1 (after question 2)
    const moveRes = putReq(`/v1/admin/quiz/${quizId}/question/${questionId1}/move`, {
      json: { newPosition: 1 },
      headers: { session: seshId }
    });

    expect(getBody(moveRes)).toStrictEqual({});
    expect(moveRes.statusCode).toBe(200);

    // Verify question order changed and timeLastEdited updated
    const updatedQuizRes = getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: seshId } });
    const updatedQuiz = getBody(updatedQuizRes);

    expect(updatedQuiz.questions[0].questionId).toBe(questionId2);
    expect(updatedQuiz.questions[1].questionId).toBe(questionId1);
    expect(updatedQuiz.timeLastEdited - initialTimeLastEdited).toBeLessThanOrEqual(1000);
  });

  test('Error when newPosition is invalid (negative)', () => {
    const moveRes = putReq(`/v1/admin/quiz/${quizId}/question/${questionId1}/move`, {
      json: { newPosition: -1 },
      headers: { session: seshId }
    });

    expect(getBody(moveRes)).toStrictEqual({
      error: 'NewPosition is less than 0, greater than the number of questions'
    });
    expect(moveRes.statusCode).toBe(400);
  });

  test('Error when newPosition is invalid (too large)', () => {
    const moveRes = putReq(`/v1/admin/quiz/${quizId}/question/${questionId1}/move`, {
      json: { newPosition: 2 }, // Only 2 questions exist (positions 0 and 1)
      headers: { session: seshId }
    });

    expect(getBody(moveRes)).toStrictEqual({
      error: 'NewPosition is less than 0, greater than the number of questions'
    });
    expect(moveRes.statusCode).toBe(400);
  });

  test('Error when newPosition is current position', () => {
    const moveRes = putReq(`/v1/admin/quiz/${quizId}/question/${questionId1}/move`, {
      json: { newPosition: 0 },
      headers: { session: seshId }
    });

    expect(getBody(moveRes)).toStrictEqual({
      error: 'NewPosition is the position of the current question'
    });
    expect(moveRes.statusCode).toBe(400);
  });

  test('Error when questionId is invalid', () => {
    const moveRes = putReq(`/v1/admin/quiz/${quizId}/question/999/move`, {
      json: { newPosition: 1 },
      headers: { session: seshId }
    });

    expect(getBody(moveRes)).toStrictEqual({
      error: 'Question Id does not refer to a valid question within this quiz'
    });
    expect(moveRes.statusCode).toBe(400);
  });

  test('Error when session is invalid', () => {
    const moveRes = putReq(`/v1/admin/quiz/${quizId}/question/${questionId1}/move`, {
      json: { newPosition: 1 },
      headers: { session: 'invalid-session' }
    });

    expect(getBody(moveRes)).toStrictEqual({
      error: 'Session is empty or invalid'
    });
    expect(moveRes.statusCode).toBe(401);
  });

  test('Error when user is not owner of quiz', () => {
    // Register a second user
    const registerResponse = postReq('/v1/admin/auth/register', {
      json: {
        email: 'another@example.com',
        password: 'Password123',
        nameFirst: 'Another',
        nameLast: 'User'
      }
    });

    const seshId2 = getSeshId(registerResponse);

    // Try to move question with second user's session
    const moveRes = putReq(`/v1/admin/quiz/${quizId}/question/${questionId1}/move`, {
      json: { newPosition: 1 },
      headers: { session: seshId2 }
    });

    expect(getBody(moveRes)).toStrictEqual({
      error: 'Valid session, but user not an owner of this quiz or quiz doesn\'t exist'
    });
    expect(moveRes.statusCode).toBe(403);
  });
});
