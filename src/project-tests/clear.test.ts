import { postReq, getReq, deleteReq, getBody, getSeshId } from '../helperFunctions';
import { ErrorObject, isErrorObjectType } from '../types';
import { Response } from 'sync-request-curl';

beforeEach(() => { deleteReq('/v1/clear'); });

test('/v1/clear returns { } when used on fresh startup', () => {
  const res: Response = deleteReq('/v1/clear');
  expect(getBody(res)).toStrictEqual({});
  expect(res.statusCode).toStrictEqual(200);
});

const userArray = [
  {
    email: 'z5481970@ad.unsw.edu.au',
    password: 'password1',
    nameFirst: 'Steve',
    nameLast: 'Jobs'
  },
  {
    email: 'z5415236@ad.unsw.edu.au',
    password: 'password2',
    nameFirst: 'Adam',
    nameLast: 'Apples'
  },
  {
    email: 'z5429372@ad.unsw.edu.au',
    password: 'password3',
    nameFirst: 'Bill',
    nameLast: 'Bye'
  }
];

const user = userArray[0];

describe('User removal testing', () => {
  test('/v1/clear successfully removes a user', () => {
    // postReq should return a response object with a
    // JSON object with a single key called session: number.
    // We call getBody to objectify the JSON, then convert the number into a string
    const regRes: string | ErrorObject = getSeshId(
      postReq('/v1/admin/auth/register', { json: user })
    );
    let seshId: string;
    if (isErrorObjectType(regRes)) throw new Error('regRes is an ErrorObject');
    else seshId = regRes;

    const userDetails = getReq(
      '/v1/admin/user/details',
      { headers: { session: seshId } }
    );
    expect(getBody(userDetails)).toStrictEqual({
      user: {
        userId: expect.any(Number),
        name: 'Steve Jobs',
        email: 'z5481970@ad.unsw.edu.au',
        numSuccessfulLogins: 1,
        numFailedPasswordsSinceLastLogin: 0
      }
    });

    const res = deleteReq('/v1/clear');
    const updatedUserDetails = getReq(
      '/v1/admin/user/details',
      { headers: { session: seshId } }
    );
    expect(getBody(res)).toStrictEqual({});
    expect(res.statusCode).toStrictEqual(200);
    expect(updatedUserDetails.statusCode).toStrictEqual(401);
  });

  test('/v1/clear successfully cleans the database of all users', () => {
    // Creates an entry in the database for each user in userArray
    const seshIdArray: string[] = userArray.map((u) => {
      const res = getSeshId(postReq('/v1/admin/auth/register', { json: u }));
      let seshId: string;
      if (isErrorObjectType(res)) throw new Error('Failed to register user');
      else seshId = res;

      // Checking for successful entry creation
      expect(typeof +seshId).toBe('number');
      return seshId;
    });

    const res = deleteReq('/v1/clear');
    expect(getBody(res)).toStrictEqual({});
    expect(res.statusCode).toStrictEqual(200);

    seshIdArray.forEach((id: string) => {
      const getRes = getReq('/v1/admin/user/details', { headers: { session: id } });
      expect(getRes.statusCode).toStrictEqual(401);
    });
  });
});

describe('quiz removal testing', () => {
  const quizArray = [
    {
      name: 'quiz 1',
      description: 'First test quiz.'
    },
    {
      name: 'quiz 2',
      description: 'Second test quiz.'
    },
    {
      name: 'quiz 3',
      description: 'Third test quiz.'
    }
  ];

  let seshId: string;
  beforeEach(() => {
    // Add a user before each test
    const res = postReq('/v1/admin/auth/register', { json: userArray[0] });
    expect(() => getSeshId(res)).not.toThrow(Error);
    seshId = getSeshId(res);
  });

  test('removes one quiz from user', () => {
    const res = postReq('/v1/admin/quiz', {
      json: quizArray[0], headers: { session: seshId }
    });
    const quizId: number = getBody(res).quizId;
    expect(typeof quizId).toBe('number');
    expect(res.statusCode).toStrictEqual(200);
    expect(
      getBody(getReq('/v1/admin/quiz/list', { headers: { session: seshId } }))
    ).toStrictEqual({
      quizzes: [
        {
          quizId: expect.any(Number),
          name: 'quiz 1'
        }
      ]
    });

    const clearRes = deleteReq('/v1/clear');
    // Is /v1/clear successfully called?
    expect(getBody(clearRes)).toStrictEqual({});
    expect(clearRes.statusCode).toStrictEqual(200);

    const listReq = getReq('/v1/admin/quiz/list', { headers: { session: seshId } });
    // Does there still exist a user to get the quiz from?
    expect(listReq.statusCode).toStrictEqual(401);
    expect(listReq.statusCode).toStrictEqual(401);
  });

  test('removes all quizzes from user', () => {
    quizArray.forEach((q) => {
      postReq('/v1/admin/quiz', { json: q, headers: { session: seshId } });
    });
    const clearRes = deleteReq('/v1/clear');
    // Is /v1/clear successfully called?
    expect(getBody(clearRes)).toStrictEqual({});
    expect(clearRes.statusCode).toStrictEqual(200);

    const listReq = getReq('/v1/admin/quiz/list', { headers: { session: seshId } });
    // Does there still exist a user to get the quiz from?
    expect(listReq.statusCode).toStrictEqual(401);
  });
});

describe('session removal testing', () => {
  test('successfully removes all active sessions from a user', () => {
    const regRes = postReq('/v1/admin/auth/register', { json: user });
    const logRes = postReq('/v1/admin/auth/login', {
      json: { email: user.email, password: user.password }
    });

    if (isErrorObjectType(getBody(regRes))) throw new Error('Failed to register user');
    if (isErrorObjectType(getBody(logRes))) throw new Error('Failed to login user');

    const regSeshId = getSeshId(regRes);
    const logSeshId = getSeshId(logRes);
    expect(regSeshId).toEqual(expect.any(String));
    expect(logSeshId).toEqual(expect.any(String));
    expect(regRes.statusCode).toStrictEqual(200);
    expect(logRes.statusCode).toStrictEqual(200);

    deleteReq('/v1/clear');
    const regDetails = getReq('/v1/admin/user/details', {
      headers: { session: regSeshId as string }
    });
    const logDetails = getReq('/v1/admin/user/details', {
      headers: { session: logSeshId as string }
    });

    expect(regDetails.statusCode).toStrictEqual(401);
    expect(logDetails.statusCode).toStrictEqual(401);
  });
});
