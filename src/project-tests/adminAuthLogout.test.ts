import {
  postReq, deleteReq, getBody, getSeshId
} from '../helperFunctions';

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

describe('Checking successful cases', () => {
  test.each(newUsers.map(user => [user.nameFirst, user]))(
    'registers %s then tests by logging out of that user',
    (_, user) => {
      const regSeshId = getSeshId(postReq('/v1/admin/auth/register', { json: user }));
      const logoutRes = postReq('/v1/admin/auth/logout',
        { headers: { session: regSeshId } });
      expect(logoutRes.statusCode).toStrictEqual(200);
      expect(getBody(logoutRes)).toStrictEqual({ });
    });
});

describe('Checking unsuccessful cases', () => {
  test.each(newUsers.map(user => [user.nameFirst, user]))(
    'registers %s then tests by logging out of a false sessionID',
    (_, user) => {
      const regSeshId = getSeshId(postReq('/v1/admin/auth/register', { json: user }));
      const temp = (+regSeshId + 1).toString();
      const logoutRes = postReq('/v1/admin/auth/logout', { headers: { session: temp } });
      expect(getBody(logoutRes)).not.toBe(undefined);
      expect(logoutRes.statusCode).toBe(401);
    });
});
