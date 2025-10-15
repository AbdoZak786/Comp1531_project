
import {
  postReq, deleteReq, getReq, getBody, getSeshId
} from '../helperFunctions';
import { Response } from 'sync-request-curl';

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

const falseUserEmails = [
  'sillybilly@gmail.com',
  'kentuckyfriedchicken',
  'z3942012434@ad.unsw.edu.au',
  'long@gmail.com'
];

const falseUserPasswords = [
  'BigBilly',
  '102941-a',
  'sadkjhB@192',
  '&'
];

describe('Checking sucessful cases', () => {
  test.each(newUsers.map(user => [user.nameFirst, user]))(
    'registers %s then tests with a correct email and password',
    (_, user) => {
      postReq('/v1/admin/auth/register', { json: user });
      // user logs into database
      const res = postReq('/v1/admin/auth/login', {
        json: { email: user.email, password: user.password }
      });
      const loginSeshId = getSeshId(res);
      // check if the loginsesh is actually created
      const detailsRes = getReq('/v1/admin/user/details', { headers: { session: loginSeshId } });
      // assuming successful logins are 2 after logging in  (register counts as a login too)

      expect(getBody(detailsRes)).toStrictEqual({
        user: {
          userId: expect.any(Number),
          name: user.nameFirst + ' ' + user.nameLast,
          email: user.email,
          numSuccessfulLogins: 2,
          numFailedPasswordsSinceLastLogin: 0
        }
      });
    });
});

// this is the stuff being tested for error cases
describe('Checking error cases with invalid email or password', () => {
  test.each(newUsers.map((user, index) => [user.nameFirst, user, falseUserEmails[index]]))(
    'registers %s then tests with a false email',
    (_, user, falseUserEmails) => {
      // Register the valid user
      postReq('/v1/admin/auth/register', { json: user });
      // Attempt to log in with an invalid user
      const res = postReq('/v1/admin/auth/login', {
        json: { email: falseUserEmails, password: user.password }
      });
      expect(getBody(res)).not.toBe(undefined);
      expect(res.statusCode).toBe(400);
    }
  );
  test.each(newUsers.map((user, index) => [user.nameFirst, user, falseUserPasswords[index]]))(
    'registers %s then tests with a false password',
    (_, user, falseUserPasswords) => {
      // Register the valid user
      postReq('/v1/admin/auth/register', { json: user });
      // Attempt to log in with an invalid user
      const res = postReq('/v1/admin/auth/login', {
        json: { email: user.email, password: falseUserPasswords }
      });
      expect(getBody(res)).not.toBe(undefined);
      expect(res.statusCode).toBe(400);
    }
  );
});

describe('Checking error cases to do with multiple logins', () => {
  test('return correct number of successfull logins: 3', () => {
    // register 1 user
    const user = newUsers[0];
    const seshId1 = getSeshId(postReq('/v1/admin/auth/register', { json: user }));

    let detailsRes = getReq('/v1/admin/user/details', { headers: { session: seshId1 } });
    // assuming successful logins are 1 when it is registered
    expect(getBody(detailsRes)).toStrictEqual({
      user: {
        userId: expect.any(Number),
        name: user.nameFirst + ' ' + user.nameLast,
        email: user.email,
        numSuccessfulLogins: 1,
        numFailedPasswordsSinceLastLogin: 0
      }
    });

    const res1 = postReq('/v1/admin/auth/login',
      { json: { email: user.email, password: user.password } });
    expect(getBody(res1)).toStrictEqual({ session: expect.any(String) });
    expect(res1.statusCode).toStrictEqual(200);

    detailsRes = getReq('/v1/admin/user/details', { headers: { session: seshId1 } });
    expect(getBody(detailsRes)).toStrictEqual({
      user: {
        userId: expect.any(Number),
        name: user.nameFirst + ' ' + user.nameLast,
        email: user.email,
        numSuccessfulLogins: 2,
        numFailedPasswordsSinceLastLogin: 0
      }
    });

    const res2 = postReq('/v1/admin/auth/login',
      { json: { email: user.email, password: user.password } });
    expect(getBody(res2)).toStrictEqual({ session: expect.any(String) });
    expect(res2.statusCode).toStrictEqual(200);

    detailsRes = getReq('/v1/admin/user/details', { headers: { session: seshId1 } });
    expect(getBody(detailsRes)).toStrictEqual({
      user: {
        userId: expect.any(Number),
        name: user.nameFirst + ' ' + user.nameLast,
        email: user.email,
        numSuccessfulLogins: 3,
        numFailedPasswordsSinceLastLogin: 0
      }
    });
  });

  test('correctly updates when logins are failed multiple times before being correct', () => {
    // register 1 user
    const user = newUsers[0];
    const seshId1 = getSeshId(postReq('/v1/admin/auth/register', { json: user }));

    let detailsRes = getReq('/v1/admin/user/details', { headers: { session: seshId1 } });
    // assuming successful logins are 1 when it is registered
    expect(getBody(detailsRes)).toStrictEqual({
      user: {
        userId: expect.any(Number),
        name: user.nameFirst + ' ' + user.nameLast,
        email: user.email,
        numSuccessfulLogins: 1,
        numFailedPasswordsSinceLastLogin: 0
      }
    });
    let res: Response;
    res = postReq('/v1/admin/auth/login', {
      json: { email: user.email, password: 'false password' }
    });
    expect(getBody(res)).not.toBe(undefined);
    expect(res.statusCode).toBe(400);

    detailsRes = getReq('/v1/admin/user/details', { headers: { session: seshId1 } });
    expect(getBody(detailsRes)).toStrictEqual({
      user: {
        userId: expect.any(Number),
        name: user.nameFirst + ' ' + user.nameLast,
        email: user.email,
        numSuccessfulLogins: 1,
        numFailedPasswordsSinceLastLogin: 1
      }
    });

    res = postReq('/v1/admin/auth/login', {
      json: { email: user.email, password: 'false password' }
    });
    expect(getBody(res)).not.toBe(undefined);
    expect(res.statusCode).toBe(400);

    detailsRes = getReq('/v1/admin/user/details', { headers: { session: seshId1 } });
    expect(getBody(detailsRes)).toStrictEqual({
      user: {
        userId: expect.any(Number),
        name: user.nameFirst + ' ' + user.nameLast,
        email: user.email,
        numSuccessfulLogins: 1,
        numFailedPasswordsSinceLastLogin: 2
      }
    });

    res = postReq('/v1/admin/auth/login', {
      json: { email: user.email, password: 'false password' }
    });
    expect(getBody(res)).not.toBe(undefined);
    expect(res.statusCode).toBe(400);

    detailsRes = getReq('/v1/admin/user/details', { headers: { session: seshId1 } });
    expect(getBody(detailsRes)).toStrictEqual({
      user: {
        userId: expect.any(Number),
        name: user.nameFirst + ' ' + user.nameLast,
        email: user.email,
        numSuccessfulLogins: 1,
        numFailedPasswordsSinceLastLogin: 3
      }
    });

    res = postReq('/v1/admin/auth/login',
      { json: { email: user.email, password: user.password } });
    expect(getBody(res)).toStrictEqual({ session: expect.any(String) });
    expect(res.statusCode).toStrictEqual(200);

    detailsRes = getReq('/v1/admin/user/details', { headers: { session: seshId1 } });
    expect(getBody(detailsRes)).toStrictEqual({
      user: {
        userId: expect.any(Number),
        name: user.nameFirst + ' ' + user.nameLast,
        email: user.email,
        numSuccessfulLogins: 2,
        numFailedPasswordsSinceLastLogin: 0
      }
    });
  });
});
