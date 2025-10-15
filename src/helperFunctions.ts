
import * as data from './dataStore';
import request, { Options, Response } from 'sync-request-curl';
import { port, url } from './config.json';
import {
  isUserType, Session, User, Quiz, HttpError, ErrorObject, isErrorObjectType,
  isGameType, Game, GameStates, Answer, Player, GameActions,
  isGameAction,
  Colours,
  Question
} from './types';
import validator from 'validator';
import { allGamesType } from './types';

const SERVER_URL = `${url}:${port}`;
const TIMEOUT_MS = 5 * 1000;

const COLOURAMOUNT = 7;
const MAXACTIVEGAMES = 10;
const QUESTIONWAITTIME = 3;

/**
 * Does checking to see if userId is valid;
 * userId has to be:
 *    - An integer
 *    - Exists in userData
 *    - Unique in userData (non-existence counts as not unique)
 *
 * @param {any} userId
 *
 * @returns {
*    isValid: <boolean>,
*    isInteger: <boolean>,
*    exists: <boolean>,
*    isUnique: <boolean>
*  }
*/
export function checkUserId(userId: number): {
  exists: boolean, isUnique: boolean, isValid: boolean, isInteger: boolean;
} {
  const userData = data.getUserData();

  const isInteger: boolean = Number.isInteger(userId);
  const exists: boolean = userData.some(user => user.userId === userId);
  const isUnique: boolean = userData.filter(user => user.userId === userId).length === 1;
  const isValid: boolean = isInteger && exists && isUnique;
  return {
    isValid,
    isInteger,
    exists,
    isUnique
  };
}

/**
* Does error checking on userId and will throw exceptions if errors are found
*
* @param {Integer} userId
*
* @returns { void }
*/
export function doUserIdCheck(userId: number): void {
  const userIdValidity = checkUserId(userId);
  if (userIdValidity.isInteger === false) {
    throw new Error('userId is not an integer!');
  } else if (userIdValidity.exists === false) {
    throw new Error('userId does not exist!');
  } else if (userIdValidity.isUnique === false) {
    throw new Error('userId is not unique!');
  }
}

/**
* Links a userId to the reference of a user
*
* @param {Integer} userId
*
* @returns { User }
*/
export function findUser(userId: number): User {
  const userData = data.getUserData();
  doUserIdCheck(userId);

  const userRef = userData.find(user => user.userId === userId);
  if (isUserType(userRef)) return userRef;
  else throw new Error('doUserIdCheck failed in findUser');
}

/**
 * Checks desired quiz parameters against valid quiz properties and returns
 * error objects when a disallowed property is requested.
 *
 * @param {integer} userId - Internal id of the user
 * @param {string} name - Name of the to be created quiz
 * @param {string} description - Description of to be created quiz
 *
 * @returns { undefined }
 */
export function adminQuizCreateErrorChecks(
  userId: number, name: string, description: string): undefined {
  // Check for invalid userIds
  const userIdValidity = checkUserId(userId);
  if (userIdValidity.isInteger === false) {
    // const userIdNotIntegerError = new Error('userId is not an integer!');
    // console.error(userIdNotIntegerError);
    throw new Error('userId is not an integer!');
  } else if (userIdValidity.exists === false) {
    // const userIdDoesNotExistError = new Error('userId does not exist!');
    // console.error(userIdDoesNotExistError);
    throw new Error('userId does not exist!');
  } else if (userIdValidity.isUnique === false) {
    // const userIdNotUniqueError = new Error('userId is not unique!');
    // console.error(userIdNotUniqueError);
    throw new Error('userId is not unique!');
  }

  // Check for invalid characters in <name>
  if (/[^a-zA-Z0-9 ]/.test(name)) {
    // const nameContainsInvalidCharactersError = new Error('name contains invalid characters!');
    // console.error(nameContainsInvalidCharactersError);
    throw new Error('name contains invalid characters!');
  }

  // Check for invalid lengths of name
  if (name.length < 3) {
    // const nameTooShortError = new Error('name is less than 3 characters!');
    // console.error(nameTooShortError);
    throw new Error('name is less than 3 characters!');
  } else if (name.length > 30) {
    // const nameTooLongError = new Error('name is more than 30 characters!');
    // console.error(nameTooLongError);
    throw new Error('name is more than 30 characters!');
  }

  // Check for duplicate names by the same user
  const user = findUser(userId);
  if (user && (user as any).ownedQuizzes && (user as any).ownedQuizzes.some((quizId: number) => {
    const quiz = findQuiz(quizId);
    return quiz && quiz.name === name;
  })) {
    // const nameNotUniqueError = new Error('a quiz of the same name by the user exists!');
    // console.error(nameNotUniqueError);
    throw new Error('a quiz of the same name by the user exists!');
  }

  // Check for invalid lengths of description
  if (description.length > 100) {
    // const descriptionTooLongError = new Error('description is more than 100 characters!');
    // console.error(descriptionTooLongError);
    throw new Error('description is more than 100 characters!');
  }
  return undefined;
}

/**
 * Does checking to see if quizId is valid;
 * quizId has to be:
 *    - An integer
 *    - Exists in quizData
 *    - Unique in quizData (non-existence counts as not unique)
 *
 * @param {any} quizId
 *
 * @returns {
*    isValid: <boolean>,
*    isInteger: <boolean>,
*    exists: <boolean>,
*    isUnique: <boolean>
*  }
*/
export function checkQuizId(quizId: number): {
  isValid: boolean,
  isInteger: boolean,
  exists: boolean,
  isUnique: boolean
} {
  const quizData = data.getQuizData();

  const isInteger: boolean = Number.isInteger(quizId);
  const exists: boolean = quizData.some(quiz => quiz.quizId === quizId);
  const isUnique: boolean = quizData.filter(quiz => quiz.quizId === quizId).length === 1;
  const isValid: boolean = isInteger && exists && isUnique;
  return {
    isValid,
    isInteger,
    exists,
    isUnique
  };
}

/**
* Does error checking on quizId and will throw exceptions if errors are found
*
* @param {Integer} quizId
*
* @returns { void }
*/
export function doQuizIdCheck(quizId: number): void {
  const quizIdValidity = checkQuizId(quizId);
  if (quizIdValidity.isInteger === false) {
    throw new Error('quizId is not an integer!');
  } else if (quizIdValidity.exists === false) {
    throw new Error('quizId does not exist!');
  } else if (quizIdValidity.isUnique === false) {
    throw new Error('quizId is not unique!');
  }
}

/**
* Links a quizId to the reference of a quiz
*
* @param {Integer} quizId
*
* @returns { Quiz } quiz object if valid or undefined if invalid
*/
export function findQuiz(quizId: number): Quiz {
  const quizData = data.getQuizData();
  doQuizIdCheck(quizId);

  return quizData.find(quiz => quiz.quizId === quizId);
}

/**
 * Iterates through a string to check if it is only made up of alphanumeric characters and " "
 *
 * @param {string} name - the name being checked
 *
 * @returns {boolean} - true if all characters are valid, false if any invalid characters
 */

export function checkValidCharacters(name: string): boolean {
  const allowedChars = 'abcdefghijklmnopqrstuvwxyz 0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < name.length; i++) {
    if (!allowedChars.includes(name[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Fetches all quizzes of a user, and sorts them in order of ascending quizId
 * then returns an objects array containing only quizId and name
 * @param {number} userId
 *
 * @returns { Array }
 */
export function getQuizList(userId: number): Array<{ quizId: number; name: string }> {
  const quizzes = data.getQuizData().filter((quiz: any) => quiz.createdBy === userId);
  quizzes.sort((a: any, b: any) => a.quizId - b.quizId);
  return quizzes.map((q: any) => ({ quizId: q.quizId, name: q.name }));
}

/*
 * Checks whether new password has been used previously by the user
 *
 * @param {object} user
 * @param {string} newPassword
 * @returns {boolean}
 */
export function usedBeforePasswords(user: User, newPassword: string): boolean {
  if (!user.passwordHistory || !Array.isArray(user.passwordHistory)) return false;
  return user.passwordHistory.includes(newPassword);
}

/**
 * Does checking to see if password is valid
 * Password has to contain at least one letter and one number
 *
 * @param {string} password
 * @returns {boolean}
 */
export function doPasswordCheck(password: string): boolean {
  return /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

/**
 * Wrapper function for making a DELETE request to the server
 *
 * @param route - Route to be called
 * @param data  - Request data to be sent
 *
 * @returns { Response }
 */
export function deleteReq(route: string, data?: Options): Response {
  let res;
  if (data !== undefined) {
    if (data.timeout === undefined) data.timeout = TIMEOUT_MS;
    res = request('DELETE', SERVER_URL + route, data);
  } else {
    res = request('DELETE', SERVER_URL + route);
  }
  return res;
}

/**
 * Wrapper function for making a POST request to the server
 *
 * @param route - Route to be called
 * @param data  - Request data to be sent
 *
 * @returns { Response }
 */
export function postReq(route: string, data?: Options): Response {
  let res;
  if (data !== undefined) {
    if (data.timeout === undefined) data.timeout = TIMEOUT_MS;
    res = request('POST', SERVER_URL + route, data);
  } else {
    res = request('POST', SERVER_URL + route);
  }
  return res;
}

/**
 * Wrapper function for making a GET request to the server
 *
 * @param route - Route to be called
 * @param data  - Request data to be sent
 *
 * @returns { Response }
 */
export function getReq(route: string, data?: Options): Response {
  let res;
  if (data !== undefined) {
    if (data.timeout === undefined) data.timeout = TIMEOUT_MS;
    res = request('GET', SERVER_URL + route, data);
  } else {
    res = request('GET', SERVER_URL + route);
  }
  return res;
}

/**
 * Wrapper function for making a PUT request to the server
 *
 * @param route - Route to be called
 * @param data  - Request data to be sent
 *
 * @returns { Response }
 */
export function putReq(route: string, data?: Options): Response {
  let res;
  if (data !== undefined) {
    if (data.timeout === undefined) data.timeout = TIMEOUT_MS;
    res = request('PUT', SERVER_URL + route, data);
  } else {
    res = request('PUT', SERVER_URL + route);
  }
  return res;
}

/**
 * Given a response from a http request, type safely returns the object
 * described by the JSON reply in res.body
 *
 * @param res - Any response object given by request calls
 *
 * @returns { any }
 */
export function getBody(res: Response): any {
  if (!res.body) {
    throw new Error('Error: No response body found');
  }
  return JSON.parse(res.body.toString());
}

/**
 * Given a response from a http request, type safely returns the session id
 * as a string
 *
 * @param res - Any response object given by request calls
 *
 * @returns { String }
 */
export function getSeshId(res: Response): string {
  const body = getBody(res);

  if (body.session !== undefined) return body.session.toString() as string;
  else throw new Error('Error: no session key found');
}

/**
 * Does checking to see if seshId is valid;
 * seshId has to be:
 *    - An integer
 *    - Exists in activeSessions
 *    - Unique in activeSessions (non-existence counts as not unique)
 *
 * @param seshId - unique identifier to an active session
 *
 * @returns {
*    isValid: <boolean>,
*    isInteger: <boolean>,
*    exists: <boolean>,
*    isUnique: <boolean>
*  }
 */
export function checkSessionId(seshId: string): {
  exists: boolean,
  isUnique: boolean,
  isValid: boolean,
  isInteger: boolean;
} {
  const activeSessions = data.getActiveSessions();

  const isInteger: boolean = Number.isInteger(+seshId);
  const exists: boolean = activeSessions.some(session => session.sessionId === seshId);
  const isUnique: boolean = activeSessions.filter(
    session => session.sessionId === seshId
  ).length === 1;
  const isValid: boolean = isInteger && exists && isUnique;
  return {
    isValid,
    isInteger,
    exists,
    isUnique
  };
}

/**
 * Does error checking on seshId and will throw exceptions if errors are found
 *
 * @param seshId - unique identifier to an active session
 *
 * @returns { void }
 */
export function doSessionIdCheck(seshId: string): void {
  const sessionIdValidity = checkSessionId(seshId);
  if (sessionIdValidity.isInteger === false) {
    throw new Error('seshId is not an integer!');
  } else if (sessionIdValidity.exists === false) {
    throw new Error('seshId does not exist!');
  } else if (sessionIdValidity.isUnique === false) {
    throw new Error('seshId is not unique!');
  }
}

/**
 * Links a sessionId to the reference of an active session
 *
 * @param seshId - unique identifier to an active session
 *
 * @returns { Session }
 */
export function findSession(seshId: string): Session {
  const activeSessions = data.getActiveSessions();
  doSessionIdCheck(seshId);
  return activeSessions.find(session => session.sessionId === seshId);
}

/**
 * Returns a unique userId not found in userData
 *
 * @returns { userId: number }
 */
export function getUniqueUserId(): number {
  const userData = data.getUserData();
  let newUserId: number;

  // Always starts users at userId = 0
  if (userData.length === 0) newUserId = 0;
  // Finds the maximum userId in the userData array and adds 1 to find the new user id
  else {
    newUserId = userData.reduce((acc, num) => {
      return acc.userId > num.userId ? acc : num;
    }, { userId: -Infinity }
    ).userId + 1;
  }

  return newUserId;
}

/**
 * Finds a unique id distinct from any other id in the activeSessions array
 *
 * @returns { sessionId: string }
 */
export function getUniqueSessionId(): string {
  const activeSessions = data.getActiveSessions();
  let newSeshId: number;
  // Always starts sessions at sessionId = 0
  if (activeSessions.length === 0) newSeshId = 0;
  // Finds the maximum sessionId in the activeSessions array and
  // adds 1 to find the new session Iid
  else {
    newSeshId = Number(activeSessions.reduce((acc, num) => {
      return +acc.sessionId > +num.sessionId ? acc : num;
    }).sessionId) + 1;
  }

  return newSeshId.toString();
}

/**
 * Starts up a new session for a user by allocating a unique seshId to the user.
 * Returns the sessionId if successful.
 *
 * @param userId - unique user specifier
 *
 * @returns { sessionId: string }
 */
export function startSession(userId: number): string {
  const user = findUser(userId);
  const uniqueSeshId: string = getUniqueSessionId();
  // Add new session to specified userId
  user.currentSessions.push(uniqueSeshId);

  const activeSessions = data.getActiveSessions();
  const session: Session = { userId: user.userId, sessionId: uniqueSeshId };
  // Add session to activeSessions database
  activeSessions.push(session);

  return uniqueSeshId;
}

/**
 * Gives a random hex color to each answer option
 *
 * @param {Array} answerOptions - Array of answer option objects.
 * @returns {Array} - Array of answer options with a new 'color' property.
 */
export function randomizeColors(answerOptions: Answer[]): void {
  const rcolour = () => Math.floor(Math.random() * COLOURAMOUNT);
  const enumMap = new Map<number, Colours>([
    [0, Colours.RED],
    [1, Colours.BLUE],
    [2, Colours.GREEN],
    [3, Colours.YELLOW],
    [4, Colours.PURPLE],
    [5, Colours.PINK],
    [6, Colours.ORANGE],
  ]);
  answerOptions.forEach(a => {
    a.color = enumMap.get(rcolour());
  });
}

/**
 * Validates the question body for a quiz question
 *
 * @param {any} questionBody - Object containing question details
 * @param {number} quizId - quizId is used to check for time limit
 * @returns {string | undefined} - String error message if validation fails; otherwise, undefined
 */
export function checkQuestionBody(questionBody: any, quizId: number): string | undefined {
  if (typeof questionBody !== 'object' || questionBody === null) {
    return 'Question body is invalid.';
  }
  const question = questionBody.question;
  const timeLimit = questionBody.timeLimit;
  const points = questionBody.points;
  const answerOptions = questionBody.answerOptions;
  if (typeof question !== 'string' || question.length < 5 || question.length > 50) {
    return 'Question text must be between 5 and 50 characters long.';
  }
  if (typeof timeLimit !== 'number' || timeLimit <= 0) {
    return 'Time limit must be a positive number.';
  }
  if (typeof points !== 'number' || points < 1 || points > 10) {
    return 'Points must be between 1 and 10.';
  }
  if (!Array.isArray(answerOptions) || answerOptions.length < 2 || answerOptions.length > 6) {
    return 'There must be between 2 and 6 answer options.';
  }
  const answers = new Set<string>();
  for (let i = 0; i < answerOptions.length; i++) {
    const optionText = answerOptions[i].answer;
    if (typeof optionText !== 'string' || optionText.length < 1 || optionText.length > 30) {
      return 'Each answer option must be between 1 and 30 characters long.';
    }
    const lower = optionText.toLowerCase();
    if (answers.has(lower)) {
      return 'Duplicate answer options are not allowed.';
    }
    answers.add(lower);
  }
  let hasCorrect = false;
  for (let i = 0; i < answerOptions.length; i++) {
    if (answerOptions[i].correct === true) {
      hasCorrect = true;
      break;
    }
  }
  if (!hasCorrect) {
    return 'At least one answer option must be marked as correct.';
  }
  // Check total time limit
  const dataStore = require('./dataStore');
  const quiz = dataStore.getQuizData().find(function (q: any) {
    return q.quizId === quizId;
  });
  if (quiz && quiz.questions && Array.isArray(quiz.questions)) {
    let totalTime = 0;
    for (let i = 0; i < quiz.questions.length; i++) {
      totalTime += quiz.questions[i].timeLimit;
    }
    if (totalTime + timeLimit > 180) {
      return 'The total time limit for all questions in the quiz exceeds 3 minutes.';
    }
  }
  return undefined;
}

/**
 * Generates a new unique questionId for the given quiz
 *
 * @param {any} quiz - The quiz object used to generate a new questionId
 * @returns {number} - A new and unique questionId
 */
export function getQuestionId(quiz: any): number {
  if (!quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    return 0;
  }
  let maxId = -Infinity;
  for (let i = 0; i < quiz.questions.length; i++) {
    if (quiz.questions[i].questionId > maxId) {
      maxId = quiz.questions[i].questionId;
    }
  }
  return maxId + 1;
}

/**
 * Gets all quizzes owned by a user
 * @param userId - The user ID
 * @returns Array of quizzes
 */
export function getQuizzesByUser(userId: number): Quiz[] {
  return data.getQuizData().filter(q => q.createdBy === userId);
}

/**
 * Checks the validity of inputs given to adminAuthRegister and throws
 * the corresponding error for an invalid input.
 *
 * @param email
 * @param password
 * @param nameFirst
 * @param nameLast
 */
export function adminAuthRegisterErrorCheck(
  email: string, password: string, nameFirst: string, nameLast: string
) {
  const userData = data.getUserData();
  const MINNAMELENGTH = 2;
  const MAXNAMELENGTH = 20;
  const MINPASSLENGTH = 8;
  userData.forEach(user => {
    if (user.email === email) {
      throw new Error('error: Email address is already used by another user');
    }
  });
  if (!(validator.isEmail(email))) { // CHECK FOR VALID EMAIL ID
    throw new Error('error: Invalid Email address');
  }
  if (!(/^[A-Za-z -']*$/.test(nameFirst))) { // CHECK FOR VALID FIRST-NAME
    throw new Error('error: Invalid First-Name, use only letters,space,hyphen and apostrophe');
  }
  if (nameFirst.length < MINNAMELENGTH || nameFirst.length > MAXNAMELENGTH) {
    throw new Error('error: Ensure the First name is between 2-20 characters');
  }
  if (!(/^[A-Za-z -']*$/.test(nameLast))) { // CHECK FOR VALID LAST NAME
    throw new Error('error: Invalid Last-Name, use only letters,space,hyphen and apostrophe');
  }
  if (nameLast.length < MINNAMELENGTH || nameLast.length > MAXNAMELENGTH) {
    throw new Error('error: Ensure the Last name is between 2-20 characters');
  }
  if (password.length < MINPASSLENGTH) { // CHECK FOR PASSWORD LENGTH
    throw new Error('error: Ensure password has more 7 characters');
  }
  // CHECK IF PASSWORD DOESNT HAVE ATLEAST 1 NO OR LETTER
  if ((!(/[A-Za-z]+/.test(password))) && (!(/[0-9]+/.test(password)))) {
    throw new Error('error: The password does not have any letters or numbers');
  }
  if (!(/[A-Za-z]+/.test(password))) { // NO LETTERS
    throw new Error('error: The password does not have any letters');
  }
  if (!(/[0-9]+/.test(password))) { // NO NUMBER
    throw new Error('error: The password does not have any numbers');
  }
}

export function findUserBySeshId(seshId: string): User {
  return findUser(findSession(seshId).userId);
}

/**
 * Macro to create an ErrorObject from a string
 *
 * @param message
 *
 * @returns { ErrorObject }
 */
export function mkerr(message: string): ErrorObject {
  return { error: message };
}

export function adminQuizGameStartErrorChecks(
  quizId: number, seshId: string, autoStartNum: number
) {
  let user: User;
  try { user = findUserBySeshId(seshId); } catch (error) {
    throw new HttpError(error.message, 401);
  }

  let quiz: Quiz;
  try { quiz = findQuiz(quizId); } catch (error) {
    // Quiz does not exist
    throw new HttpError(error.message, 403);
  }
  if (quiz.createdBy !== user.userId) {
    throw new HttpError('error: Quiz does not belong to this user', 403);
  }

  if (autoStartNum > 50) throw new HttpError('error: autoStartNum cannot be greater than 50', 400);
  if (quiz.questions.length === 0) {
    throw new HttpError('error: Quiz contains no questions', 400);
  }
  console.log(quiz.gameIds.activeGameIds.length);
  if (quiz.gameIds.activeGameIds.length > MAXACTIVEGAMES - 1) {
    throw new HttpError('error: Too many active games', 400);
  }
}

// Macros for shortening test files
export const startQuiz = (seshId: string) => {
  const quizRes = postReq('/v1/admin/quiz', {
    headers: { session: seshId },
    json: { name: 'TestQuiz', description: 'Test quiz description' }
  });

  const quizIdBody = getBody(quizRes);
  expect(isErrorObjectType(quizIdBody)).toStrictEqual(false);
  expect(quizRes.statusCode).toStrictEqual(200);
  return quizIdBody.quizId;
};

export const startQuestion = (quizId: number, seshId: string) => {
  const questionRes = postReq(`/v1/admin/quiz/${quizId}/question`, {
    headers: { session: seshId },
    json: {
      questionBody: {
        question: 'Who is the Monarch of England?',
        timeLimit: 2,
        points: 5,
        answerOptions: [
          {
            answer: 'Prince Charles',
            correct: true
          },
          {
            answer: 'Queen Elizabeth',
            correct: false
          }
        ]
      }
    }
  });

  const questionId = getBody(questionRes);
  expect(isErrorObjectType(questionId)).toStrictEqual(false);
  expect(questionRes.statusCode).toStrictEqual(200);
  return questionId;
};

export const startTestGame = (quizId: number, seshId: string, autoStartNum: number) => {
  return postReq(`/v1/admin/quiz/${quizId}/game/start`, {
    headers: { session: seshId },
    json: { autoStartNum }
  });
};

export const expectResToBeError = (res: any, state: boolean, statusCode: number) => {
  expect(isErrorObjectType(getBody(res))).toStrictEqual(state);
  expect(res.statusCode).toStrictEqual(statusCode);
};

/**
 * Does checking to see if gameId is valid;
 * gameId has to be:
 *    - An integer
 *    - Exists in allGames
 *    - Unique in allGames (non-existence counts as not unique)
 *
 * @param {any} gameId
 *
 * @returns {
*    isValid: <boolean>,
*    isInteger: <boolean>,
*    exists: <boolean>,
*    isUnique: <boolean>
*  }
*/
export function checkGameId(gameId: number): {
  exists: boolean, isUnique: boolean, isValid: boolean, isInteger: boolean;
} {
  const allGames = data.getAllGames();
  const allGamesArray = [...allGames.activeGames, ...allGames.inactiveGames];

  const isInteger: boolean = Number.isInteger(gameId);

  const exists: boolean = allGamesArray.some(game => game.gameId === gameId);

  const isUnique: boolean = allGamesArray.filter(
    game => game.gameId === gameId
  ).length === 1;

  const isValid: boolean = isInteger && exists && isUnique;
  return {
    isValid,
    isInteger,
    exists,
    isUnique
  };
}

/**
* Does error checking on gameId and will throw exceptions if errors are found
*
* @param {Integer} gameId
*
* @returns { void }
*/
export function doGameIdCheck(gameId: number): void {
  const gameIdValidity = checkGameId(gameId);
  if (gameIdValidity.isInteger === false) {
    throw new Error('gameId is not an integer!');
  } else if (gameIdValidity.exists === false) {
    throw new Error('gameId does not exist!');
  } else if (gameIdValidity.isUnique === false) {
    throw new Error('gameId is not unique!');
  }
}

export function findGame(gameId: number) {
  doGameIdCheck(gameId);
  const allGames = data.getAllGames();
  const allGamesArray = [...allGames.activeGames, ...allGames.inactiveGames];

  const gameRef = allGamesArray.find(game => game.gameId === gameId);
  if (isGameType(gameRef)) return gameRef;
  else throw new Error('doGameIdCheck failed in findGame');
}

export function generateGameId(): number {
  const allGames = data.getAllGames();
  const allGamesArray = [...allGames.activeGames, ...allGames.inactiveGames];

  let newGameId: number;
  if (allGamesArray.length === 0) newGameId = 0;
  else {
    newGameId = Number(allGamesArray.reduce((acc, num) => {
      return acc.gameId > num.gameId ? acc : num;
    }).gameId) + 1;
  }

  return newGameId;
}

/**
 * Starts and appends to the quiz, a game provided with a copy of the quiz.
 * Returns the gameId to the new game.
 *
 * @param quizId
 * @returns { gameId: number }
 */
export function startGame(quizId: number, autoStartNumber: number): number {
  const quiz = findQuiz(quizId);
  const copiedQuiz = structuredClone(quiz);
  delete copiedQuiz.createdBy;
  delete copiedQuiz.gameIds;
  copiedQuiz.questions.forEach(q => {
    delete q.timeLastEdited;
    delete q.timeCreated;
  });
  const gameId: number = generateGameId();

  const game: Game = {
    gameId,
    quizId,
    isActive: true,
    autoStartNumber,
    state: GameStates.LOBBY,
    atQuestion: 0,
    players: [],
    metadata: copiedQuiz
  };

  const allGames = data.getAllGames();
  allGames.activeGames.push(game);
  quiz.gameIds.activeGameIds.push(gameId);

  return gameId;
}

// Does error checking for adminQuizGameStatus
export function adminQuizGameStatusErrorChecks(
  quizId: number, gameId: number, seshId: string
) {
  let quiz;
  try { quiz = findQuiz(quizId); } catch (error) {
    throw new HttpError(error.message, 403);
  }
  const quizGames = [...quiz.gameIds.activeGameIds, ...quiz.gameIds.inactiveGameIds];

  if (!quizGames.some(gId => gId === gameId)) {
    throw new HttpError('error: gameId does not refer to a valid game in this quiz', 400);
  }

  if (seshId === '') {
    throw new HttpError('error: empty session string', 401);
  } else {
    try { findSession(seshId); } catch (error) {
      throw new HttpError(error.message, 401);
    }
  }

  const user = findUserBySeshId(seshId);
  if (!user.ownedQuizzes.some(qId => qId === quizId)) {
    throw new HttpError('error: User does not own provided quizId', 403);
  }
}

// generate a random name
export function generateRandomName(): string {
  const letters = Array.from({ length: 5 }, () => {
    const isUpper = Math.random() < 0.5;
    const charCode = isUpper
      ? 65 + Math.floor(Math.random() * 26) // A-Z
      : 97 + Math.floor(Math.random() * 26); // a-z
    return String.fromCharCode(charCode);
  }).join('');

  const numbers = Math.floor(100 + Math.random() * 900); // Random 3-digit number (100–999)

  return `${letters}${numbers}`;
}

// find a player with their name
export function findPlayerWithName(game: Game, playerName: string) {
  return game.players.find(
    player => player.playerName === playerName
  );
}

// creates and adds player to game
export function createAndAddPlayerToGame(game: Game, playerName: string): Player {
  if (playerName === '') {
    playerName = generateRandomName();
  }
  const player: Player = {
    playerName: playerName,
    playerId: generateUniquePlayerId(game),
    numQuestions: 0,
    atQuestion: 0
  };

  game.players.push(player);
  return player;
}

export function generateUniquePlayerId(game: Game): number {
  let id: number;
  let combinedId: number;
  do {
    id = Math.floor(Math.random() * 9000) + 1000; // 4-digit random ID
    combinedId = Number(`${game.gameId}${id}`);
  } while (game.players.some(player => player.playerId === combinedId));
  return combinedId;
}

/**
 * Generate a new unique answerId for a question in a quiz
 *
 * @param quiz - Quiz object which may contain existing questions
 * @returns maximum existing answerId + 1
 */
export function getAnswerId(question: Question) {
  let maxId = 0;
  question.answerOptions.forEach(a => { a.answerId = maxId++; });
}

export function findGameByPlayerId(playerId: number): Game | null {
  const allGames: allGamesType = data.getAllGames();
  const all = [...allGames.activeGames, ...allGames.inactiveGames];
  for (const game of all) {
    if (game.players.some(p => p.playerId === playerId)) {
      return game;
    }
  }
  return null;
}

/**
 * Checks if the provided action is valid at the given state
 *
 * @param state
 * @param action
 *
 * @returns { boolean }
 */
export function isValidGameTransition(
  state: GameStates,
  action: GameActions
): boolean {
  switch (action) {
    case GameActions.END:
      switch (state) {
        case GameStates.END:
          return false;
        default:
          return true;
      }
    case GameActions.NEXT_QUESTION:
      switch (state) {
        case GameStates.LOBBY:
        case GameStates.QUESTION_CLOSE:
        case GameStates.ANSWER_SHOW:
          return true;
        default:
          return false;
      }
    case GameActions.SKIP_COUNTDOWN:
      switch (state) {
        case GameStates.QUESTION_COUNTDOWN:
          return true;
        default:
          return false;
      }
    case GameActions.GO_TO_ANSWER:
      switch (state) {
        case GameStates.QUESTION_OPEN:
        case GameStates.QUESTION_CLOSE:
          return true;
        default:
          return false;
      }
    case GameActions.GO_TO_FINAL_RESULTS:
      switch (state) {
        case GameStates.QUESTION_CLOSE:
        case GameStates.ANSWER_SHOW:
          return true;
        default:
          return false;
      }
  }
}

// Does error checking for adminQuizGameAction()
export function gameActionErrorChecks(
  quizid: number,
  gameid: number,
  seshid: string,
  action: GameActions
) {
  try { findSession(seshid); } catch (error) {
    throw new HttpError(error.message, 401);
  }

  try { findQuiz(quizid); } catch (error) {
    throw new HttpError(error.message, 403);
  }

  let user: User;
  try { user = findUserBySeshId(seshid); } catch (error) {
    throw new HttpError(error.message, 401);
  }
  if (!user.ownedQuizzes.some(qid => quizid === qid)) {
    throw new HttpError('error: user does not own this quiz', 403);
  }

  try { findGame(gameid); } catch (error) {
    throw new HttpError(error.message, 400);
  }
  if (!isGameAction(action)) throw new HttpError('error: invalid action', 400);
}

// End state transition
function gameEnd(game: Game) {
  console.log('received end action');
  if (
    game.state === GameStates.QUESTION_COUNTDOWN ||
    game.state === GameStates.QUESTION_OPEN
  ) {
    clearTimeout(game.currentTimer);
    game.currentTimer = undefined;
  }

  const activeGames = data.getAllActiveGames();
  const inactiveGames = data.getAllInactiveGames();
  game.state = GameStates.END;
  game.isActive = false;
  inactiveGames.push(game);
  const gameIndex = activeGames.findIndex(g => g.gameId === game.gameId);
  activeGames.splice(gameIndex, 1);
}

// Next_question transition
function gameNextQuestion(game: Game) {
  console.log('received next_question action');
  game.state = GameStates.QUESTION_COUNTDOWN;
  game.atQuestion++;
  game.currentTimer = setTimeout(() => {
    console.log('Autoskip');
    doAction(GameActions.SKIP_COUNTDOWN, game.gameId);
  }, QUESTIONWAITTIME * 1000);
}

// Skip_countdown transition
function gameSkipCountdown(game: Game) {
  console.log('received skip_countdown action');
  clearTimeout(game.currentTimer);
  game.currentTimer = undefined;

  game.state = GameStates.QUESTION_OPEN;
  game.currentTimer = setTimeout(() => {
    game.state = GameStates.QUESTION_CLOSE;
  }, game.metadata.questions[game.atQuestion - 1].timeLimit * 1000);
}

// Go_to_final_results transition
function gameGoToFinalResults(game: Game) {
  console.log('received go_to_final_results action');
  game.state = GameStates.FINAL_RESULTS;
}

// Go_to_answer transition
function gameGoToAnswer(game: Game) {
  console.log('received go_to_answer action');
  game.state = GameStates.ANSWER_SHOW;
}

/**
 * Sends the game to the next state as dictated by the action provided
 *
 * @param action
 * @param gameid
 */
export function doAction(action: GameActions, gameid: number) {
  const game: Game = findGame(gameid);
  if (!isValidGameTransition(game.state, action)) {
    throw new Error('error: invalid action for state');
  }

  switch (action) {
    case GameActions.END:
      gameEnd(game);
      break;
    case GameActions.NEXT_QUESTION:
      gameNextQuestion(game);
      break;
    case GameActions.SKIP_COUNTDOWN:
      gameSkipCountdown(game);
      break;
    case GameActions.GO_TO_ANSWER:
      gameGoToAnswer(game);
      break;
    case GameActions.GO_TO_FINAL_RESULTS:
      gameGoToFinalResults(game);
      break;
  }
}

export function ping(text?: string) {
  console.log('PING!', text);
}
