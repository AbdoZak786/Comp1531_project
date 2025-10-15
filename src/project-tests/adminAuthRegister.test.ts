import { postReq, getReq, deleteReq, getBody, getSeshId } from '../helperFunctions';
import { isErrorObjectType } from '../types';

beforeEach(() => { deleteReq('/v1/clear'); });

// Macro for expecting failed results from an invalid user
const checkInvalidUser = (user: {
  email: string,
  password: string,
  nameFirst: string,
  nameLast: string,
}) => {
  const res = postReq('/v1/admin/auth/register', { json: user });
  expect(isErrorObjectType(res)).toStrictEqual(false);
  expect(res.statusCode).toStrictEqual(400);
  expect(() => getSeshId(res)).toThrow(Error);
};

const testUser = {
  email: 'testuser@gmail.com',
  password: 'Start1234',
  nameFirst: 'Muhammed',
  nameLast: 'Arham'
};

describe('Initial registration in an empty dataset', () => {
  test('Registers first user successfully', () => {
    const res = postReq('/v1/admin/auth/register', { json: testUser });
    expect(getBody(res)).toStrictEqual({ session: expect.any(String) });
    expect(res.statusCode).toStrictEqual(200);

    const seshId = getSeshId(res);

    const detailsRes = getReq('/v1/admin/user/details', { headers: { session: seshId } });
    expect(getBody(detailsRes)).toStrictEqual({
      user: {
        userId: expect.any(Number),
        name: 'Muhammed Arham',
        email: 'testuser@gmail.com',
        numSuccessfulLogins: 1,
        numFailedPasswordsSinceLastLogin: 0
      }
    });
    expect(detailsRes.statusCode).toStrictEqual(200);
  });
});

describe('Checking successful cases for adminAuthRegister', () => {
  test.each([
    { email: 'user1@gmail.com', password: 'Pass1234', nameFirst: 'Alice', nameLast: "O'Connor" },
    { email: 'user2@hotmail.com', password: 'SecurePass1', nameFirst: 'Bob', nameLast: 'Smith' },
    { email: 'user3@unsw.edu.au', password: 'MyP@ssw0rd', nameFirst: 'Charlie', nameLast: 'Brown' },
    { email: 'user4@yahoo.com', password: 'TestPass789', nameFirst: 'Dana', nameLast: 'Mac Leod' },
    { email: 'user5@outlook.com', password: 'Qwerty!234', nameFirst: 'Ethan', nameLast: 'Hunt' }
  ])(
    'if a case is successful it returns userId', u => {
      const res = postReq('/v1/admin/auth/register', { json: u });
      expect(getBody(res)).toStrictEqual({ session: expect.any(String) });
      expect(res.statusCode).toStrictEqual(200);

      const seshId = getSeshId(res);
      const detailsRes = getReq('/v1/admin/user/details', { headers: { session: seshId } });
      expect(getBody(detailsRes)).toStrictEqual({
        user: {
          userId: expect.any(Number),
          name: u.nameFirst + ' ' + u.nameLast,
          email: u.email,
          numSuccessfulLogins: 1,
          numFailedPasswordsSinceLastLogin: 0
        }
      });
    });
});

describe('adminAuthRegister error cases', () => {
  test.each([
    { email: 'wrongmail.com', password: 'password', nameFirst: 'Leo', nameLast: 'Messi' },
    { email: 'email@invalid', password: 'password', nameFirst: 'Leo', nameLast: 'Messi' }
  ])('Fails due to invalid email address', (u) => {
    checkInvalidUser(u);
  });

  test('Fails when email is already registered', () => {
    const user = {
      email: 'alreadyregistered@gmail.com',
      password: 'password1',
      nameFirst: 'cristiano',
      nameLast: 'Ronaldo'
    };
    postReq('/v1/admin/auth/register', { json: user });
    checkInvalidUser(user);
  });

  test.each([
    { nameFirst: 'John1', reason: 'First name contains a number' },
    { nameFirst: 'John@', reason: 'First name contains special character @' },
    { nameFirst: 'John/', reason: 'First name contains special character /' }
  ])('Fails when first name is invalid: $reason', ({ nameFirst }) => {
    checkInvalidUser({
      email: 'validemail@gmail.com',
      password: 'ValidPass1',
      nameFirst,
      nameLast: 'Jones'
    });
  });

  test.each([
    { nameFirst: 'A', reason: 'First name is less than 2 characters' },
    { nameFirst: '', reason: 'First name is empty' },
    { nameFirst: 'A'.repeat(21), reason: 'First name exceeds 20 characters' }
  ])('Fails when first name length is invalid: $reason', ({ nameFirst }) => {
    checkInvalidUser({
      email: 'validemail@gmail.com',
      password: 'ValidPass1',
      nameFirst,
      nameLast: 'Jones'
    });
  });

  test.each([
    { nameLast: 'Sathish1', reason: 'Last name contains a number' },
    { nameLast: 'Sathish@', reason: 'Last name contains special character @' },
    { nameLast: 'Sathish/', reason: 'Last name contains special character /' }
  ])('Fails when last name is invalid: $reason', ({ nameLast }) => {
    checkInvalidUser({
      email: 'validemail@gmail.com',
      password: 'ValidPass1',
      nameFirst: 'PR',
      nameLast
    });
  });

  test.each([
    { nameLast: 'A', reason: 'Last name is less than 2 characters' },
    { nameLast: '', reason: 'Last name is empty' },
    { nameLast: 'A'.repeat(21), reason: 'Last name exceeds 20 characters' }
  ])('Fails when last name length is invalid: $reason', ({ nameLast }) => {
    checkInvalidUser({
      email: 'validemail@gmail.com',
      password: 'ValidPass1',
      nameFirst: 'PR',
      nameLast
    });
  });

  test('Fails when password is less than 8 characters', () => {
    checkInvalidUser({
      email: 'validemail@gmail.com',
      password: 'Valid',
      nameFirst: 'Nate',
      nameLast: 'Rebello'
    });
  });

  test.each([
    { password: 'password', reason: 'No numbers in password' },
    { password: '12345678', reason: 'No letters in password' },
    { password: '/]@', reason: 'No letters or numbers in password' }
  ])('Fails when password does not have letters, a number or both: $reason', ({ password }) => {
    checkInvalidUser({
      email: 'validemail@gmail.com',
      password,
      nameFirst: 'Johnny',
      nameLast: 'test'
    });
  });
});
