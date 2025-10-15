import { postReq, deleteReq, getBody, getSeshId, putReq } from '../helperFunctions';

beforeEach(() => {
  deleteReq('/v1/clear');
});

describe('PUT /v1/admin/user/password', () => {
  const OLD_PASSWORD = 'ValidPass123';
  const NEW_PASSWORD = 'NewValidPass123';
  let sessionId: string;
  const email = 'test@unsw.edu.au';

  beforeEach(() => {
    // Register test user
    const registerRes = postReq('/v1/admin/auth/register', {
      json: {
        email: email,
        password: OLD_PASSWORD,
        nameFirst: 'Test',
        nameLast: 'User'
      }
    });
    const session = getSeshId(registerRes);
    if (typeof session !== 'string') {
      throw new Error('Failed to get valid session ID');
    }
    sessionId = session;
  });

  describe('Successful updates', () => {
    test('Updates password and verifies login with new password', async () => {
      // Update password
      const updateRes = putReq('/v1/admin/user/password', {
        json: {
          oldPassword: OLD_PASSWORD,
          newPassword: NEW_PASSWORD
        },
        headers: {
          session: sessionId
        }
      });
      expect(updateRes.statusCode).toBe(200);
      expect(getBody(updateRes)).toEqual({});

      // Verify login with new password
      const loginRes = postReq('/v1/admin/auth/login', {
        json: {
          email: email,
          password: NEW_PASSWORD
        }
      });
      expect(loginRes.statusCode).toBe(200);
    });

    test('Allows special characters in password', () => {
      const specialPass = 'New@Pass123!';
      const res = putReq('/v1/admin/user/password', {
        json: {
          oldPassword: OLD_PASSWORD,
          newPassword: specialPass
        },
        headers: {
          session: sessionId
        }
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('Error cases', () => {
    test('Rejects wrong old password', () => {
      const res = putReq('/v1/admin/user/password', {
        json: {
          oldPassword: 'WrongPass',
          newPassword: NEW_PASSWORD
        },
        headers: {
          session: sessionId
        }
      });
      expect(res.statusCode).toBe(401);
    });

    test('Rejects short passwords', () => {
      const res = putReq('/v1/admin/user/password', {
        json: {
          oldPassword: OLD_PASSWORD,
          newPassword: 'Short1'
        },
        headers: {
          session: sessionId
        }
      });
      expect(res.statusCode).toBe(400);
    });

    test('Rejects reused passwords', async () => {
      // First password change
      await putReq('/v1/admin/user/password', {
        json: {
          oldPassword: OLD_PASSWORD,
          newPassword: NEW_PASSWORD
        },
        headers: {
          session: sessionId
        }
      });

      // Try to change back
      const res = putReq('/v1/admin/user/password', {
        json: {
          oldPassword: NEW_PASSWORD,
          newPassword: OLD_PASSWORD
        },
        headers: {
          session: sessionId
        }
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
