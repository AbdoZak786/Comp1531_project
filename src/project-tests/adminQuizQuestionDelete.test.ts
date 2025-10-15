
import { deleteReq, postReq, getSeshId, getBody, getReq } from '../helperFunctions';

beforeEach(() => {
  deleteReq('/v1/clear');
});

describe('DELETE /v1/admin/quiz/{quizid}/question/{questionid}', () => {
  let seshId: string;
  let quizId: number;
  let questionId1: number;

  beforeEach(() => {
    // Register user and create quiz with questions
    const seshIdResult = getSeshId(
      postReq('/v1/admin/auth/register', {
        json: {
          email: 'test@example.com',
          password: 'Password123',
          nameFirst: 'Test',
          nameLast: 'User'
        }
      })
    );
    if (typeof seshIdResult !== 'string') {
      throw new Error('Failed to register user');
    }
    seshId = seshIdResult;

    // Create quiz
    const quizRes = postReq('/v1/admin/quiz', {
      json: { name: 'Test Quiz', description: 'Test Description' },
      headers: { session: seshId }
    });
    quizId = getBody(quizRes).quizId;

    // Add question
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
  });

  test('Successfully delete question', () => {
    // Get initial quiz info
    const initialQuizRes = getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: seshId } });
    const initialQuiz = getBody(initialQuizRes);
    const initialTimeLastEdited = initialQuiz.timeLastEdited;
    const initialQuestionCount = initialQuiz.numQuestions;

    // Delete question
    const deleteRes = deleteReq(`/v1/admin/quiz/${quizId}/question/${questionId1}`, {
      headers: { session: seshId }
    });

    expect(getBody(deleteRes)).toStrictEqual({});
    expect(deleteRes.statusCode).toBe(200);

    // Verify question was deleted and timeLastEdited updated
    const updatedQuizRes = getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: seshId } });
    const updatedQuiz = getBody(updatedQuizRes);

    expect(updatedQuiz.numQuestions).toBe(initialQuestionCount - 1);
    expect(
      updatedQuiz.questions.some((q: { questionId: number }) =>
        q.questionId === questionId1
      )
    ).toBe(false);
    expect(updatedQuiz.timeLastEdited - initialTimeLastEdited).toBeLessThanOrEqual(1000);
  });

  test('Error when questionId is invalid', () => {
    const deleteRes = deleteReq(`/v1/admin/quiz/${quizId}/question/999`, {
      headers: { session: seshId }
    });

    expect(getBody(deleteRes)).toStrictEqual({
      error: 'Question Id does not refer to a valid question within this quiz'
    });
    expect(deleteRes.statusCode).toBe(400);
  });

  test('Error when session is invalid', () => {
    const deleteRes = deleteReq(`/v1/admin/quiz/${quizId}/question/${questionId1}`, {
      headers: { session: 'invalid-session' }
    });

    expect(getBody(deleteRes)).toStrictEqual({
      error: 'Session is empty or invalid'
    });
    expect(deleteRes.statusCode).toBe(401);
  });

  test('Error when user is not owner of quiz', () => {
    // Register second user
    const seshId2Result = getSeshId(
      postReq('/v1/admin/auth/register', {
        json: {
          email: 'another@example.com',
          password: 'Password123',
          nameFirst: 'Another',
          nameLast: 'User'
        }
      })
    );
    if (typeof seshId2Result !== 'string') {
      throw new Error('Failed to register second user');
    }
    const seshId2 = seshId2Result;

    // Try to delete question with second user's session
    const deleteRes = deleteReq(`/v1/admin/quiz/${quizId}/question/${questionId1}`, {
      headers: { session: seshId2 }
    });

    expect(getBody(deleteRes)).toStrictEqual({
      error: 'Valid session, but user not an owner of this quiz or quiz doesn\'t exist'
    });
    expect(deleteRes.statusCode).toBe(403);
  });

  test('Error when quiz does not exist', () => {
    const deleteRes = deleteReq(`/v1/admin/quiz/999/question/${questionId1}`, {
      headers: { session: seshId }
    });

    expect(getBody(deleteRes)).toStrictEqual({
      error: 'Valid session, but user not an owner of this quiz or quiz doesn\'t exist'
    });
    expect(deleteRes.statusCode).toBe(403);
  });
});
