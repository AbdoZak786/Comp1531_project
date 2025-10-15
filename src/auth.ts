import * as hf from './helperFunctions';
import * as data from './dataStore';
// import * as other from './other';
// import * as quiz from './quiz';
import { User, isUserType } from './types';
import validator from 'validator';

/**
 * Registers a new user with the provided details.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @param {string} nameFirst - The user's first name.
 * @param {string} nameLast - The user's last name.
 *
 * @returns { sessionId: string }
 */
export function adminAuthRegister(
  email: string, password: string, nameFirst: string, nameLast: string
): string {
  const userData = data.getUserData();

  // Error checking
  hf.adminAuthRegisterErrorCheck(email, password, nameFirst, nameLast);

  const newUserId = hf.getUniqueUserId();
  const newUser: User = {
    userId: newUserId,
    nameFirst,
    nameLast,
    email,
    password,
    numSuccessfulLogins: 1,
    numFailedPasswordsSinceLastLogin: 0,
    ownedQuizzes: [],
    currentSessions: []
  };
  userData.push(newUser);

  const seshId = hf.startSession(newUserId);
  return seshId;
}

/**
 * Returns a valid userId given a correct username and password.
 *
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 *
 * @returns {
 *      session: 1
 * } - An object containing the sessionId of the logged-in user.
 */
export function adminAuthLogin(email: string, password: string) {
  const userData = data.getUserData();

  const user = userData.find(u => u.email === email);
  if (!user) {
    throw new Error('Email not found');
  }
  if (user.password !== password) {
    user.numFailedPasswordsSinceLastLogin += 1;
    throw new Error('Incorrect password');
  }
  // Successful login
  const newSession = hf.startSession(user.userId);
  user.numSuccessfulLogins += 1;
  user.numFailedPasswordsSinceLastLogin = 0;

  return { session: newSession };
}

/**
 * Searches through backend data to find and return user object
 * relating to the userId
 *
 * @param {integer} userId - Internal id of the user
 *
 * @return { user:
 *   {
 *     userId: 1,
 *     name: 'Hayden Smith',
 *     email: 'hayden.smith@unsw.edu.au',
 *     numSuccessfulLogins: 3,
 *     numFailedPasswordsSinceLastLogin: 1,
 *   }
 * }; - Internal user object defined in data.md
 */
export function adminUserDetails(userId: number): {
  user: {
    userId: number;
    name: string;
    email: string;
    numSuccessfulLogins: number;
    numFailedPasswordsSinceLastLogin: number;
  }
} {
  const user = hf.findUser(userId);

  const fullName: string = user.nameFirst + ' ' + user.nameLast;
  const email: string = user.email;
  const numSuccessfulLogins: number = user.numSuccessfulLogins;
  const numFailedPasswordsSinceLastLogin: number = user.numFailedPasswordsSinceLastLogin;

  return {
    user:
    {
      userId: userId,
      name: fullName,
      email: email,
      numSuccessfulLogins: numSuccessfulLogins,
      numFailedPasswordsSinceLastLogin: numFailedPasswordsSinceLastLogin
    }
  };
}

/**
 * Inputs the admin's userID and the following properties that
 * will be updated: email, nameFirst, nameLast
 * If the update is successful, then it returns an empty object {}
 * If the update is not successful, then it will return an error object
 * with a specific error message
 *
 * @param {integer} userId - Internal id of the user
 * @param {string} email - New email of the user
 * @param {string} nameFirst - New first name of the user
 * @param {string} nameLast - New last name of the user
 *
 * @returns {object} - Empty object or error object with specific error message
 */
export function adminUserDetailsUpdate(
  userId: number,
  email: string,
  nameFirst: string,
  nameLast: string
): void {
  const NAME_REGEX = /^[a-zA-Z]+[a-zA-Z '-]*[a-zA-Z]+$/;

  // Validate userId
  hf.doUserIdCheck(userId);

  const user = hf.findUser(userId) as User;
  const usersValid = data.getUserData() as User[];

  // Check for missing fields
  if (!email || !nameFirst || !nameLast) {
    throw new Error('Missing required fields');
  }

  // Custom validation for email's local part
  const [localPart] = email.split('@');
  if (!/[A-Za-z0-9]$/.test(localPart)) {
    throw new Error('Email local part must end with alphanumeric character');
  }

  // Validate email format using validator
  if (!validator.isEmail(email)) {
    throw new Error(
      'Email does not satisfy validator requirements: ' +
      'https://www.npmjs.com/package/validator (validator.isEmail)'
    );
  }
  // Check if email is already in use
  if (usersValid.some((u) => (
    u.email.toLowerCase() === email.toLowerCase() &&
    u.userId !== userId
  ))) {
    throw new Error(
      'Email is currently used by another user (excluding the current authorised user)');
  }

  // Type checking
  if (typeof nameFirst !== 'string' || typeof nameLast !== 'string') {
    throw new Error('NameFirst and NameLast must be strings');
  }

  // Trim and clean names
  const cleanNameFirst = nameFirst.trim();
  const cleanNameLast = nameLast.trim();

  // Length validation (after trimming)
  if (cleanNameFirst.length < 2 || cleanNameFirst.length > 20) {
    throw new Error('NameFirst must be between 2-20 characters');
  }

  if (cleanNameLast.length < 2 || cleanNameLast.length > 20) {
    throw new Error('NameLast must be between 2-20 characters');
  }

  // Character validation
  if (!NAME_REGEX.test(cleanNameFirst)) {
    throw new Error('NameFirst contains invalid characters');
  }

  if (!NAME_REGEX.test(cleanNameLast)) {
    throw new Error('NameLast contains invalid characters');
  }

  // Update user details
  user.email = email;
  user.nameFirst = nameFirst;
  user.nameLast = nameLast;
}

/**
 * Returns a valid userId given a correct username and password.
 *
 * @param {number} userId - Internal id of the user
 * @param {string} oldPassword - Old user password
 * @param {string} newPassword - New user password
 *
 * @returns {object} - Empty object or error object with specific error message
 */
export function adminUserPasswordUpdate(
  userId: number,
  oldPassword: string,
  newPassword: string
): void {
  // Ensure userId is valid and must exist in the data before update
  hf.doUserIdCheck(userId);

  const userResult = hf.findUser(userId);
  const user = userResult as User;

  // Check if userResult is an error object
  if (!user) {
    throw new Error('Invalid user ID');
  }

  // 2. Check old password matches
  if (user.password !== oldPassword) {
    throw new Error('Incorrect old password');
  }

  // 3. Check new password is different
  if (oldPassword === newPassword) {
    throw new Error('New password must be different from old password');
  }

  // 4. Check password history (initialize if not exists)
  if (!user.passwordHistory) {
    user.passwordHistory = [];
  }

  if (user.passwordHistory.includes(newPassword)) {
    throw new Error('New password has been used before');
  }

  // 5. Validate new password format
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  if (!/[a-zA-Z]/.test(newPassword)) {
    throw new Error('Password must contain at least one letter');
  }

  if (!/[0-9]/.test(newPassword)) {
    throw new Error('Password must contain at least one number');
  }

  // 6. Update password
  user.passwordHistory.push(user.password);
  user.password = newPassword;
}

/**
 * Returns a valid userId given a correct username and password.
 *
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 *
 * @returns {
*      session: 1
* } - An object containing the sessionId of the logged-in user.
*/
export function adminAuthLogout(seshId: string) {
  const session = hf.findSession(seshId);
  const userId = session.userId;
  const sessionId = session.sessionId;
  const user = hf.findUser(userId);
  if (isUserType(user)) {
    const index = user.currentSessions.findIndex(currentSessions => currentSessions === sessionId);
    if (index !== -1) {
      user.currentSessions.splice(index, 1);
    }
  }
  // Remove session from activeSessions
  const sessionData = data.getActiveSessions();
  const sessionIndex =
    sessionData.findIndex(activeSession => activeSession.sessionId === sessionId);
  if (sessionIndex !== -1) {
    sessionData.splice(sessionIndex, 1);
  }
  data.saveData();

  return {};
}
