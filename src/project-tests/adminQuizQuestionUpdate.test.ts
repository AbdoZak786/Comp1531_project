import { putReq, getBody, deleteReq, getSeshId, postReq, getReq } from '../helperFunctions';
import { isErrorObjectType, isQuizType, Answer, Question } from '../types';
describe('adminQuizQuestionUpdate endpoint testing', () => {
  let seshId: string;
  let quizId: number;
  let questionId: number;

  beforeEach(() => {
    deleteReq('/v1/clear');

    // Register a user through HTTP and get session id
    const res = postReq('/v1/admin/auth/register', {
      json: {
        email: 'email@gmail.com',
        password: 'Password123',
        nameFirst: 'Fernando',
        nameLast: 'Djingga'
      }
    });
    if (isErrorObjectType(getSeshId(res))) {
      return;
    }
    const session = getSeshId(res);
    if (typeof session !== 'string') {
      throw new Error('Failed to get valid session ID');
    }
    seshId = session;
    // Create a quiz through HTTP and get quizId
    const resQuiz = postReq('/v1/admin/quiz', {
      json: { name: 'Sample Quiz', description: 'A sample quiz for testing' },
      headers: { session: seshId }
    });
    quizId = getBody(resQuiz).quizId;

    // Create a question through HTTP and get questionId
    const resQuestion = postReq(`/v1/admin/quiz/${quizId}/question`, {
      json: {
        questionBody: {
          question: 'Original question?',
          timeLimit: 10,
          points: 5,
          answerOptions: [
            { answer: 'Original answer 1', correct: true },
            { answer: 'Original answer 2', correct: false }
          ]
        }
      },
      headers: { session: seshId }
    });
    questionId = getBody(resQuestion).questionId;
  });

  describe('Success Tests', () => {
    test('successfully updates a question with valid inputs', () => {
      const updatedQuestion = {
        questionBody: {
          question: 'Updated question?',
          timeLimit: 15,
          points: 7,
          answerOptions: [
            { answer: 'Updated answer 1', correct: true },
            { answer: 'Updated answer 2', correct: false }
          ]
        }
      };

      const res = putReq(`/v1/admin/quiz/${quizId}/question/${questionId}`, {
        json: updatedQuestion,
        headers: { session: seshId }
      });

      expect(res.statusCode).toBe(200);
      expect(getBody(res)).toEqual({});

      // Verify the question was actually updated
      const quizRes = getReq(`/v1/admin/quiz/${quizId}`, {
        headers: { session: seshId }
      });
      const quizInfo = getBody(quizRes);
      if (!isQuizType(quizInfo)) {
        return;
      }
      const updatedQ = quizInfo.questions.find(q => q.questionId === questionId);
      expect(updatedQ.question).toBe('Updated question?');
      expect(updatedQ.timeLimit).toBe(15);
      expect(updatedQ.points).toBe(7);
    });
  });

  describe('Error Tests', () => {
    test('error when user does not own the quiz', () => {
      // Register another user
      const otherSeshId = getSeshId(
        postReq('/v1/admin/auth/register', {
          json: {
            email: 'other@gmail.com',
            password: 'Password123',
            nameFirst: 'Other',
            nameLast: 'User'
          }
        })
      );

      const questionBody = {
        questionBody: {
          question: 'Valid question?',
          timeLimit: 10,
          points: 5,
          answerOptions: [
            { answer: 'A', correct: true },
            { answer: 'B', correct: false }
          ]
        }
      };
      if (isErrorObjectType(otherSeshId)) {
        return;
      }
      const res = putReq(`/v1/admin/quiz/${quizId}/question/${questionId}`, {
        json: questionBody,
        headers: { session: otherSeshId }
      });
      expect(res.statusCode).toBe(403);
      expect(getBody(res).error).toMatch(/does not own/i);
    });
  });

  describe('Unit Tests', () => {
    test('Update question text only', () => {
      const updatedQuestion = {
        questionBody: {
          question: 'New question text?',
          timeLimit: 10,
          points: 5,
          answerOptions: [
            { answer: 'Original answer 1', correct: true },
            { answer: 'Original answer 2', correct: false }
          ]
        }
      };

      const res = putReq(`/v1/admin/quiz/${quizId}/question/${questionId}`, {
        json: updatedQuestion,
        headers: { session: seshId }
      });

      expect(res.statusCode).toBe(200);
      const quizInfo = getBody(getReq(`/v1/admin/quiz/${quizId}`,
        { headers: { session: seshId } }));
      expect(quizInfo.questions[0].question).toBe('New question text?');
    });

    test('Update timeLimit only', () => {
      const updatedQuestion = {
        questionBody: {
          question: 'Original question?',
          timeLimit: 20,
          points: 5,
          answerOptions: [
            { answer: 'Original answer 1', correct: true },
            { answer: 'Original answer 2', correct: false }
          ]
        }
      };

      const res = putReq(`/v1/admin/quiz/${quizId}/question/${questionId}`, {
        json: updatedQuestion,
        headers: { session: seshId }
      });

      expect(res.statusCode).toBe(200);
      const quizInfo = getBody(getReq(`/v1/admin/quiz/${quizId}`,
        { headers: { session: seshId } }));
      expect(quizInfo.questions[0].timeLimit).toBe(20);
    });

    test('Update answer options only', () => {
      const updatedQuestion = {
        questionBody: {
          question: 'Original question?',
          timeLimit: 10,
          points: 5,
          answerOptions: [
            { answer: 'New answer 1', correct: true },
            { answer: 'New answer 2', correct: false },
            { answer: 'New answer 3', correct: false }
          ]
        }
      };

      const res = putReq(`/v1/admin/quiz/${quizId}/question/${questionId}`, {
        json: updatedQuestion,
        headers: { session: seshId }
      });

      expect(res.statusCode).toBe(200);
      const quizInfo = getBody(getReq(`/v1/admin/quiz/${quizId}`,
        { headers: { session: seshId } }));
      expect(quizInfo.questions[0].answerOptions.length).toBe(3);
      expect(quizInfo.questions[0].answerOptions[0].answer).toBe('New answer 1');
    });

    test('Error: Question text too short', () => {
      const res = putReq(`/v1/admin/quiz/${quizId}/question/${questionId}`, {
        json: {
          questionBody: {
            question: 'Hi?',
            timeLimit: 10,
            points: 5,
            answerOptions: [
              { answer: 'A', correct: true },
              { answer: 'B', correct: false }
            ]
          }
        },
        headers: { session: seshId }
      });
      expect(res.statusCode).toBe(400);
      expect(getBody(res).error).toMatch(/5-50 characters/);
    });

    test('Error: No correct answers', () => {
      const res = putReq(`/v1/admin/quiz/${quizId}/question/${questionId}`, {
        json: {
          questionBody: {
            question: 'Valid question?',
            timeLimit: 10,
            points: 5,
            answerOptions: [
              { answer: 'A', correct: false },
              { answer: 'B', correct: false }
            ]
          }
        },
        headers: { session: seshId }
      });
      expect(res.statusCode).toBe(400);
      expect(getBody(res).error).toMatch(/At least one answer must be correct/);
    });
  });

  describe('Sideways Tests', () => {
    test('Update question after quiz transfer', () => {
      // Register another user
      const otherSeshId = getSeshId(
        postReq('/v1/admin/auth/register', {
          json: {
            email: 'other@gmail.com',
            password: 'Password123',
            nameFirst: 'Other',
            nameLast: 'User'
          }
        })
      );

      // Transfer quiz
      const transferRes = postReq(`/v1/admin/quiz/${quizId}/transfer`, {
        json: { userEmail: 'other@gmail.com' },
        headers: { session: seshId }
      });
      expect(transferRes.statusCode).toBe(200);

      // Update question as new owner
      if (isErrorObjectType(otherSeshId)) {
        return;
      }
      const updateRes = putReq(`/v1/admin/quiz/${quizId}/question/${questionId}`, {
        json: {
          questionBody: {
            question: 'Updated by new owner',
            timeLimit: 10,
            points: 5,
            answerOptions: [
              { answer: 'A', correct: true },
              { answer: 'B', correct: false }
            ]
          }
        },
        headers: { session: otherSeshId }
      });
      expect(updateRes.statusCode).toBe(200);
    });

    test('Error: Update non-existent question', () => {
      const res = putReq(`/v1/admin/quiz/${quizId}/question/9999`, {
        json: {
          questionBody: {
            question: 'Valid question?',
            timeLimit: 10,
            points: 5,
            answerOptions: [
              { answer: 'A', correct: true },
              { answer: 'B', correct: false }
            ]
          }
        },
        headers: { session: seshId }
      });
      expect(res.statusCode).toBe(403);
    });
    test('Concurrent updates to same question', () => {
      // First update
      const update1 = putReq(`/v1/admin/quiz/${quizId}/question/${questionId}`, {
        json: {
          questionBody: {
            question: 'Update 1',
            timeLimit: 10,
            points: 5,
            answerOptions: [
              { answer: 'A', correct: true },
              { answer: 'B', correct: false }
            ]
          }
        },
        headers: { session: seshId }
      });

      // Second update
      const update2 = putReq(`/v1/admin/quiz/${quizId}/question/${questionId}`, {
        json: {
          questionBody: {
            question: 'Update 2',
            timeLimit: 15,
            points: 7,
            answerOptions: [
              { answer: 'C', correct: true },
              { answer: 'D', correct: false }
            ]
          }
        },
        headers: { session: seshId }
      });

      expect(update1.statusCode).toBe(200);
      expect(update2.statusCode).toBe(200);
    });

    test('Update preserves answer colors when possible', () => {
      // Get original colors
      const quizInfo = getBody(getReq(`/v1/admin/quiz/${quizId}`,
        { headers: { session: seshId } }));
      const originalColors = quizInfo.questions[0].answerOptions.map((o: Answer) => o.color);

      // Update with similar answers
      const res = putReq(`/v1/admin/quiz/${quizId}/question/${questionId}`, {
        json: {
          questionBody: {
            question: 'Same answers different order',
            timeLimit: 10,
            points: 5,
            answerOptions: [
              { answer: 'Original answer 2', correct: false },
              { answer: 'Original answer 1', correct: true }
            ]
          }
        },
        headers: { session: seshId }
      });

      expect(res.statusCode).toBe(200);
      const updatedQuiz = getBody(getReq(`/v1/admin/quiz/${quizId}`,
        { headers: { session: seshId } }));
      const newColors = updatedQuiz.questions[0].answerOptions.map((o: Answer) => o.color);
      expect(newColors).toEqual(expect.arrayContaining(originalColors));
    });
  });
  describe('adminQuizQuestionUpdateV2 endpoint testing', () => {
    // ... (previous setup code remains the same)

    describe('Thumbnail URL Validation Tests', () => {
      test('Error: thumbnailUrl is empty string', () => {
        const res = putReq(`/v2/admin/quiz/${quizId}/question/${questionId}`, {
          json: {
            questionBody: {
              question: 'Valid question?',
              timeLimit: 10,
              points: 5,
              thumbnailUrl: '',
              answerOptions: [
                { answer: 'A', correct: true },
                { answer: 'B', correct: false }
              ]
            }
          },
          headers: { session: seshId }
        });
        expect(res.statusCode).toBe(400);
        expect(getBody(res).error).toMatch(/The thumbnailUrl is an empty string/);
      });

      test('Error: thumbnailUrl does not begin with http:// or https://', () => {
        const res = putReq(`/v2/admin/quiz/${quizId}/question/${questionId}`, {
          json: {
            questionBody: {
              question: 'Valid question?',
              timeLimit: 10,
              points: 5,
              thumbnailUrl: 'ftp://example.com/image.jpg',
              answerOptions: [
                { answer: 'A', correct: true },
                { answer: 'B', correct: false }
              ]
            }
          },
          headers: { session: seshId }
        });
        expect(res.statusCode).toBe(400);
        expect(getBody(res).error).toMatch(
          /The thumbnailUrl does not begin with 'http:\/\/' or 'https:\/\/'/
        );
      });

      test('Error: thumbnailUrl does not end with valid filetype', () => {
        const res = putReq(`/v2/admin/quiz/${quizId}/question/${questionId}`, {
          json: {
            questionBody: {
              question: 'Valid question?',
              timeLimit: 10,
              points: 5,
              thumbnailUrl: 'https://example.com/image.gif',
              answerOptions: [
                { answer: 'A', correct: true },
                { answer: 'B', correct: false }
              ]
            }
          },
          headers: { session: seshId }
        });
        expect(res.statusCode).toBe(400);
        expect(getBody(res).error).toMatch(
          /The thumbnailUrl does not end with one of the following filetypes/
        );
      });

      test('Success: valid thumbnailUrl with jpg extension', () => {
        const res = putReq(`/v2/admin/quiz/${quizId}/question/${questionId}`, {
          json: {
            questionBody: {
              question: 'Valid question?',
              timeLimit: 10,
              points: 5,
              thumbnailUrl: 'https://example.com/image.jpg',
              answerOptions: [
                { answer: 'A', correct: true },
                { answer: 'B', correct: false }
              ]
            }
          },
          headers: { session: seshId }
        });
        expect(res.statusCode).toBe(200);
      });

      test('Success: valid thumbnailUrl with png extension', () => {
        const res = putReq(`/v2/admin/quiz/${quizId}/question/${questionId}`, {
          json: {
            questionBody: {
              question: 'Valid question?',
              timeLimit: 10,
              points: 5,
              thumbnailUrl: 'https://example.com/image.PNG',
              answerOptions: [
                { answer: 'A', correct: true },
                { answer: 'B', correct: false }
              ]
            }
          },
          headers: { session: seshId }
        });
        expect(res.statusCode).toBe(200);
      });

      test('Success: valid thumbnailUrl with jpeg extension', () => {
        const res = putReq(`/v2/admin/quiz/${quizId}/question/${questionId}`, {
          json: {
            questionBody: {
              question: 'Valid question?',
              timeLimit: 10,
              points: 5,
              thumbnailUrl: 'https://example.com/image.jpeg',
              answerOptions: [
                { answer: 'A', correct: true },
                { answer: 'B', correct: false }
              ]
            }
          },
          headers: { session: seshId }
        });
        expect(res.statusCode).toBe(200);
      });

      test('Success: thumbnailUrl not provided (should keep existing)', () => {
        // First set a thumbnail
        putReq(`/v2/admin/quiz/${quizId}/question/${questionId}`, {
          json: {
            questionBody: {
              question: 'Valid question?',
              timeLimit: 10,
              points: 5,
              thumbnailUrl: 'https://example.com/image.jpg',
              answerOptions: [
                { answer: 'A', correct: true },
                { answer: 'B', correct: false }
              ]
            }
          },
          headers: { session: seshId }
        });

        // Update without providing thumbnailUrl
        const res = putReq(`/v2/admin/quiz/${quizId}/question/${questionId}`, {
          json: {
            questionBody: {
              question: 'Updated question?',
              timeLimit: 10,
              points: 5,
              answerOptions: [
                { answer: 'A', correct: true },
                { answer: 'B', correct: false }
              ]
            }
          },
          headers: { session: seshId }
        });

        expect(res.statusCode).toBe(200);

        // Verify thumbnail was preserved
        const quizRes = getReq(`/v2/admin/quiz/${quizId}`, {
          headers: { session: seshId }
        });
        const quizInfo = getBody(quizRes);
        const updatedQ = quizInfo.questions.find((q: Question) => q.questionId === questionId);
        expect(updatedQ.thumbnailUrl).toBe('https://example.com/image.jpg');
      });
    });

    // ... (rest of the tests remain the same)
  });
});
