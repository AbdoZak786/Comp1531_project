import { deleteReq, getReq, postReq, getSeshId, getBody } from '../helperFunctions';
import { ErrorObject, isErrorObjectType } from '../types';

beforeEach(() => { deleteReq('/v1/clear'); });

// A list of fake users to create a database from
const newUsers = [
  {
    email: 'z1942032@ad.unsw.edu.au',
    password: 'newPassword01',
    nameFirst: 'Chuck',
    nameLast: 'Norris'
  },
  {
    email: 'z6942043@ad.unsw.edu.au',
    password: 'qwerty789',
    nameFirst: 'Brock',
    nameLast: 'Lesnar'
  },
  {
    email: 'z3942034@ad.unsw.edu.au',
    password: 'securePass1',
    nameFirst: 'Alf',
    nameLast: 'Stewart'
  },
  {
    email: 'z7942445@ad.unsw.edu.au',
    password: 'abc1234xyz',
    nameFirst: 'Mickey',
    nameLast: 'Mouse'
  }
];

const fullNames = newUsers.map(user => user.nameFirst + ' ' + user.nameLast);
describe('failure state testing', () => {
  test('returns an error when no users exist', () => {
    const res = getReq('/v1/admin/user/details', { headers: { session: '0' } });
    expect(isErrorObjectType(getBody(res))).toStrictEqual(true);
    expect(res.statusCode).toStrictEqual(401);
  });

  test('returns an error when invalid session id is given', () => {
    const user = newUsers[0];
    const seshId = getSeshId(postReq('/v1/admin/auth/register', { json: user }));
    if (isErrorObjectType(seshId)) throw new Error('Failed to register user');

    const invalidSeshId:string = (+seshId + 1).toString();
    const res = getReq(
      '/v1/admin/user/details', { headers: { session: invalidSeshId } }
    );
    expect(isErrorObjectType(getBody(res))).toStrictEqual(true);
    expect(res.statusCode).toStrictEqual(401);
  });
});

describe('return correct user object for a new user', () => {
  test('successfully returns a single user\'s details', () => {
    const user = newUsers[0];
    // Make a new user
    const seshId = getSeshId(postReq('/v1/admin/auth/register', { json: user }));
    if (isErrorObjectType(seshId)) throw new Error('Failed to register user');

    const res = getReq('/v1/admin/user/details', { headers: { session: seshId } });
    expect(getBody(res)).toStrictEqual({
      user: {
        userId: expect.any(Number),
        name: fullNames[0],
        email: user.email,
        numSuccessfulLogins: 1,
        numFailedPasswordsSinceLastLogin: 0
      }
    });
    expect(res.statusCode).toStrictEqual(200);
  });

  test('return corect user object for each new user', () => {
    newUsers.forEach((u) => {
      const seshId = getSeshId(postReq('/v1/admin/auth/register', { json: u }));
      if (isErrorObjectType(seshId)) throw new Error('Failed to register user');

      const res = getReq('/v1/admin/user/details', { headers: { session: seshId } });
      expect(getBody(res)).toStrictEqual({
        user: {
          userId: expect.any(Number),
          name: u.nameFirst + ' ' + u.nameLast,
          email: u.email,
          numSuccessfulLogins: 1,
          numFailedPasswordsSinceLastLogin: 0
        }
      });
      expect(res.statusCode).toStrictEqual(200);
    });
  });
});

describe('return correct user object after user activity', () => {
  const testUser = {
    email: 'z1234567@ad.unsw.edu.au',
    password: 'genericPassword1',
    nameFirst: 'Test',
    nameLast: 'User'
  };

  let seshId: string | ErrorObject;

  beforeEach(() => {
    seshId = getSeshId(postReq('/v1/admin/auth/register', { json: testUser }));
    if (isErrorObjectType(seshId)) throw new Error('Failed to register user');
  });

  describe('varying number of successful logins', () => {
    test.each(
      [1, 2, 3, 10, 50, 1000]
    )('user has %s successful logins', (totalLogins) => {
      for (let logins = 1; logins < totalLogins; logins++) {
        // This will probably generate a ton of sessionIds...
        postReq('/v1/admin/auth/login', {
          json: { email: testUser.email, password: testUser.password }
        });
      }

      const res = getReq(
        '/v1/admin/user/details', { headers: { session: seshId as string } }
      );
      expect(getBody(res)).toStrictEqual({
        user: {
          userId: expect.any(Number),
          name: testUser.nameFirst + ' ' + testUser.nameLast,
          email: testUser.email,
          numSuccessfulLogins: totalLogins,
          numFailedPasswordsSinceLastLogin: 0
        }
      });
      expect(res.statusCode).toStrictEqual(200);
    });
  });

  describe('varying number of failed logins since last login', () => {
    test.each(
      [0, 1, 2, 3, 10, 50, 1000]
    )('user has failed %s times since last login', (totalFails) => {
      for (let attempts = 0; attempts < totalFails; attempts++) {
        postReq('/v1/admin/auth/login', {
          json: { email: testUser.email, password: 'nonGenericPassword' }
        });
      }

      const res = getReq(
        '/v1/admin/user/details', { headers: { session: seshId as string } }
      );
      expect(getBody(res)).toStrictEqual({
        user: {
          userId: expect.any(Number),
          name: testUser.nameFirst + ' ' + testUser.nameLast,
          email: testUser.email,
          numSuccessfulLogins: 1,
          numFailedPasswordsSinceLastLogin: totalFails
        }
      });
      expect(res.statusCode).toStrictEqual(200);
    });
  });
});
