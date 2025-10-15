import { deleteReq, postReq, getSeshId, getBody, getReq, putReq } from '../helperFunctions';

describe('PUT /v1/admin/quiz/:quizid/thumbnail', () => {
  let sesh1: string;
  let sesh2: string;
  let quizId: number;

  beforeEach(() => {
    deleteReq('/v1/clear');

    // Register users, create quiz
    sesh1 = getSeshId(
      postReq('/v1/admin/auth/register', {
        json: {
          email: 'fer@dji.com',
          password: 'Password123',
          nameFirst: 'Fer',
          nameLast: 'Dji'
        }
      })
    );
    quizId = getBody(
      postReq('/v1/admin/quiz', {
        headers: { session: sesh1 },
        json: {
          name: 'Quiz',
          description: 'Desc'
        }
      })
    ).quizId;

    sesh2 = getSeshId(
      postReq('/v1/admin/auth/register', {
        json: {
          email: 'nan@dji.com',
          password: 'Password125',
          nameFirst: 'Ferna',
          nameLast: 'Ingga'
        }
      })
    );
  });

  describe('Success Tests', () => {
    test('Successfully updates thumbnail and bumps timeLastEdited', async () => {
      const before = getBody(
        getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: sesh1 } })
      );
      await new Promise(r => setTimeout(r, 1100));

      const res = putReq(`/v1/admin/quiz/${quizId}/thumbnail`, {
        headers: { session: sesh1 },
        json: { thumbnailUrl: 'https://thumb.com/PIC.JPG' }
      });
      expect(res.statusCode).toBe(200);
      expect(getBody(res)).toEqual({});

      const after = getBody(
        getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: sesh1 } })
      );
      expect(after.thumbnailUrl).toBe('https://thumb.com/PIC.JPG');
      expect(after.timeLastEdited).toBeGreaterThan(before.timeLastEdited);
    });
  });

  describe('Error Tests', () => {
    // Error 401 Tests
    test('Error if session header missing', () => {
      const res = putReq(`/v1/admin/quiz/${quizId}/thumbnail`, {
        json: { thumbnailUrl: 'http://f.jpg' }
      });
      expect(res.statusCode).toBe(401);
    });
    test('Error if session invalid', () => {
      const res = putReq(`/v1/admin/quiz/${quizId}/thumbnail`, {
        headers: { session: 'invalid' },
        json: { thumbnailUrl: 'http://f.jpg' }
      });
      expect(res.statusCode).toBe(401);
    });

    // Error 403 Tests
    test('Error if user is not owner', () => {
      const res = putReq(`/v1/admin/quiz/${quizId}/thumbnail`, {
        headers: { session: sesh2 },
        json: { thumbnailUrl: 'http://f.jpg' }
      });
      expect(res.statusCode).toBe(403);
    });
    test('Error if quiz does not exist', () => {
      const res = putReq(`/v1/admin/quiz/${quizId + 1}/thumbnail`, {
        headers: { session: sesh1 },
        json: { thumbnailUrl: 'http://f.jpg' }
      });
      expect(res.statusCode).toBe(403);
    });

    // Error 400 Tests
    test('Error if thumbnailUrl missing or wrong type', () => {
      let res = putReq(`/v1/admin/quiz/${quizId}/thumbnail`, {
        headers: { session: sesh1 },
        json: { }
      });
      expect(res.statusCode).toBe(400);
      res = putReq(`/v1/admin/quiz/${quizId}/thumbnail`, {
        headers: { session: sesh1 },
        json: { thumbnailUrl: 123 }
      });
      expect(res.statusCode).toBe(400);
    });
    test('Error if thumbnailUrl invalid format', () => {
      const badUrls = [
        'lol://lmfao.com/img.jpg',
        'http://f.bmp',
        'https://f.PNG.gif',
        'nohttp.jpg',
        ''
      ];
      for (const url of badUrls) {
        const res = putReq(`/v1/admin/quiz/${quizId}/thumbnail`, {
          headers: { session: sesh1 },
          json: { thumbnailUrl: url }
        });
        expect(res.statusCode).toBe(400);
        const body = getBody(res);
        expect(body.error).toMatch(/Thumbnail URL must begin with http/);
      }
    });
    test('Error if quizId not a number', () => {
      const res = putReq('/v1/admin/quiz/abc/thumbnail', {
        headers: { session: sesh1 },
        json: { thumbnailUrl: 'http://f.jpg' }
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
