import * as hf from './helperFunctions';
import * as data from './dataStore';
// import * as auth from './auth';
// import * as other from './other';
import request from 'sync-request-curl';
import { HUGGINGFACE_API_TOKEN } from './server';
import {
  ErrorObject, isErrorObjectType, isUserType,
  Quiz, User, Answer, GameActions, Game,
  HttpError, GameStates,
  Colours, GameAnswer, GameQuestion
} from './types';

const DEFAULTANSWERID = 0;

/**
 * Takes in the given parameters and creates a quiz object on the database,
 * then returns the id to the object.
 *
 * @param {number} userId - Internal id of the user
 * @param {string} name - Name of the to be created quiz
 * @param {string} description  - Description of to be created quiz
 *
 * @returns { quizId: <number> } - Object containing the id to the newly created quiz
 */
export function adminQuizCreate(
  userId: number, name: string, description: string): { quizId: number } | ErrorObject {
  const quizData = data.getQuizData();

  // Error checking
  const errorObject = hf.adminQuizCreateErrorChecks(userId, name, description);
  if (errorObject !== undefined) {
    return errorObject;
  }

  let newQuizId: number;
  // Always starts quizzes at quizId = 0
  if (quizData.length === 0) newQuizId = 0;
  // Finds the maximum quizId in the quizData array and adds 1 to find the new quiz id
  else {
    newQuizId = quizData.reduce((acc: { quizId: number }, num: { quizId: number }) => {
      return acc.quizId > num.quizId ? acc : num;
    },
    { quizId: -Infinity }
    ).quizId + 1;
  }

  const newQuizCreationTime: number = Math.floor(Date.now() / 1000);

  const newQuiz: Quiz = {
    quizId: newQuizId,
    name: name,
    timeCreated: newQuizCreationTime,
    timeLastEdited: newQuizCreationTime,
    description: description,
    createdBy: userId,
    numQuestions: 0,
    questions: [] as any[],
    timeLimit: 0,
    gameIds: { activeGameIds: [], inactiveGameIds: [] }
  };

  // Adds the new quizId to the user's list of quizzes
  const userOrErr = hf.findUser(userId);
  if (isErrorObjectType(userOrErr)) {
    return userOrErr; // or handle the error appropriately
  }
  const user: User = userOrErr;
  user.ownedQuizzes.push(newQuizId);
  quizData.push(newQuiz);

  return { quizId: newQuizId };
}

/**
 * Searches through backend data to return
 * an object containing a list of the user's quizzes.
 *
 * @param {number} userId - Internal id of the user
 * @returns {object} - Object returning a list of quizzes or an error object
 */
export function adminQuizList(userId: number): { quizzes: any[] } | ErrorObject {
  // Ensure that userId is valid (positve integer) and must exist in the data before proceeding
  try {
    hf.doUserIdCheck(userId);
  } catch (error: any) {
    return { error: 'userId is not a valid user.' };
  }

  // Fetch the list of quizzes by a user, and sort them in ascending order based on quizId
  const quizzes = hf.getQuizList(userId);
  return { quizzes };
}

/**
 * Searches through backend data to find and return user object
 * relating to the userId
 *
 * @param {integer} userId - Internal id of the user
 * @param {integer} quizId - Internal id of the quiz
 *
 * @returns {void} - Empty object
 */

export function adminQuizRemove(userId: number, quizId: number) {
  try {
    hf.doUserIdCheck(userId); // Ensure the function exists
    // This line (vvv) is causing a linting error.
    // const user = hf.findUser(userId); // Ensure user is found
    const quizData = data.getQuizData(); // Retrieve quiz data

    // Find the quiz by quizId
    const quizIndex = quizData.findIndex(q => q.quizId === quizId);
    if (quizIndex === -1) {
      return { error: 'Quiz ID does not refer to a valid quiz.' }; // If quiz not found
    }

    // Check if the user is the owner of the quiz
    if (quizData[quizIndex].createdBy !== userId) {
      return { error: 'Quiz ID does not refer to a quiz that this user owns.' }; // If not the owner
    }

    // Proceed to remove the quiz
    quizData.splice(quizIndex, 1); // Remove the quiz from the array

    // Yif - You shouldn't need this line underneath (vvv)
    // setQuizData(quizData); // Save the updated quiz data

    // console.log('Removing quiz:', { userId, quizId, currentQuizzes: quizData });
    return {}; // Return empty object for successful removal
  } catch (error) {
    return { error: error.message }; // Return error message if something fails
  }
}

/**
 * Finds the relevant quiz based on userId and quizId
 * and updates the quizzes' name
 *
 * @param {string} seshId - Internal id of the user
 * @param {integer} quizId - Internal id of the quiz
 * @param {string} name - New name of the quiz
 *
 * @returns {void} - Empty object
 */
export function adminQuizNameUpdate(seshId: string, quizId: number, name: string) {
  const session = hf.findSession(seshId);
  const quiz = hf.findQuiz(quizId);
  const user = hf.findUser(session.userId);

  if (!isUserType(user)) {
    return user;
  }

  if (user === undefined) {
    throw new Error('User is invalid');
  }
  if (quiz === undefined) {
    throw new Error('Quiz is invalid');
  }
  if (!user.ownedQuizzes.includes(Number(quizId))) {
    throw new Error('QuizId does not refer to a quiz that this user owns');
  }
  if (!hf.checkValidCharacters(name)) {
    throw new Error('Name contains invalid characters');
  }
  if (name.length < 3 || name.length > 30) {
    throw new Error('Name length is invalid');
  }
  if (user.ownedQuizzes.some(quizId => hf.findQuiz(quizId).name === name)) {
    throw new Error('Name is already being used by this user');
  }
  quiz.name = name;
  return {};
}

/**
 * Finds the relevant quiz based on userId and quizId
 * and updates the quizzes' description
 *
 * @param {string} seshId - Internal id of the user
 * @param {integer} quizId - Internal id of the quiz
 * @param {string} description - New description of the quiz
 *
 * @returns {void} - Empty object
 */
export function adminQuizDescriptionUpdate(seshId: string, quizId: number, description: string) {
  const session = hf.findSession(seshId);
  const user = hf.findUser(session.userId);
  const quiz = hf.findQuiz(quizId);

  if (!isUserType(user)) {
    return user;
  }
  if (user === undefined) {
    throw new Error('User is invalid');
  }
  if (quiz === undefined) {
    throw new Error('Quiz is invalid');
  }
  if (!user.ownedQuizzes.includes(Number(quizId))) {
    throw new Error('QuizId does not refer to a quiz that this user owns');
  }
  if (description !== '' && description.length > 100) {
    throw new Error('description length is invalid');
  }
  quiz.description = description;
  return {};
}

/**
 * Searches through backend data to find and return user object
 * relating to the userId
 *
 * @param {number} userId - Internal id of the user who create the question
 * @param {number} quizId - Internal id of the quiz of the question
 *
 * @returns {object} - Object with detailed quiz, or an error object
*/
export function adminQuizInfo(userId: number, quizId: number): {
  quizId: number; name: string; timeCreated: number; timeLastEdited: number; description: string;
  numQuestions: number; questions: Array<any>; timeLimit: number; thumbnailUrl: string
} {
  hf.doUserIdCheck(userId);
  const quizData = data.getQuizData();
  const quizItem = quizData.find((q: Quiz) => q.quizId === quizId);

  if (!quizItem) {
    throw new Error('Quiz ID does not refer to a valid quiz.');
  }
  if (quizItem.createdBy !== userId) {
    throw new Error('Quiz ID does not refer to a quiz that this user owns.');
  }

  // Get the thumbnail
  let quizThumbnail: string;
  if (quizItem.thumbnailUrl !== undefined) {
    quizThumbnail = quizItem.thumbnailUrl;
  } else {
    quizThumbnail = '';
  }

  // Create questions array
  const questionList: any[] = [];
  let rawQuestions: any[] = [];
  if (quizItem.questions !== undefined) {
    rawQuestions = quizItem.questions;
  }

  for (let qi = 0; qi < rawQuestions.length; qi++) {
    const q = rawQuestions[qi];

    let qThumbnail: string;
    if (q.thumbnailUrl !== undefined) {
      qThumbnail = q.thumbnailUrl;
    } else {
      qThumbnail = '';
    }

    // Define answer options
    const answerList: any[] = [];

    if (q.answerOptions !== undefined) {
      for (let ai = 0; ai < q.answerOptions.length; ai++) {
        const a = q.answerOptions[ai];
        console.log('debugging: 1', a);
        answerList.push({
          answerId: a.answerId,
          answer: a.answer,
          color: a.color,
          correct: a.correct
        });
      }
      console.log('debugging: 2', answerList);
    }

    questionList.push({
      questionId: q.questionId,
      question: q.question,
      timeLimit: q.timeLimit,
      thumbnailUrl: qThumbnail,
      points: q.points,
      answerOptions: answerList
    });
  }

  // Calculate number of questions, set the time limit
  const numQuestions = questionList.length;
  let quizTimeLimit: number;
  if (quizItem.timeLimit !== undefined) {
    quizTimeLimit = quizItem.timeLimit;
  } else {
    quizTimeLimit = 0;
  }
  return {
    quizId: quizItem.quizId,
    name: quizItem.name,
    timeCreated: quizItem.timeCreated,
    timeLastEdited: quizItem.timeLastEdited,
    description: quizItem.description,
    numQuestions: numQuestions,
    questions: questionList,
    timeLimit: quizTimeLimit,
    thumbnailUrl: quizThumbnail
  };
}

/**
 * Creates a new quiz question, its options, and adds it to the quiz
 *
 * @param {number} userId - Internal id of the user who create the question
 * @param {number} quizId - Internal id of the quiz of the question
 * @param {object} questionBody - The question details
 * @returns {object} - Object with the new questionId, or an error object
 */
export function adminQuizQuestionCreate(
  userId: number, quizId: number,
  questionBody: {
    question: string, timeLimit: number, points: number;
    answerOptions: Array<{ answer: string; correct: boolean }>;
    thumbnailUrl?: string;
  }
): { questionId: number } | ErrorObject {
  try {
    hf.doUserIdCheck(userId);
    const quizData = data.getQuizData();
    const quiz = quizData.find(function (q: {
      quizId: number; createdBy: number; questions?: any[]
    }) {
      return q.quizId === quizId;
    });
    if (!quiz) {
      return { error: 'Quiz doesn\'t exist.' };
    }
    if (quiz.createdBy !== userId) {
      return { error: 'User is not the owner of this quiz.' };
    }

    // Validate the question body
    const err = hf.checkQuestionBody(questionBody, quizId);
    if (err !== undefined) {
      return { error: err };
    }

    // Define questionId and answerId, randomize colours
    const newQuestionId = hf.getQuestionId(quiz);
    const newAnswerOptions: Answer[] = questionBody.answerOptions.map(opt => {
      const object = {
        answerId: DEFAULTANSWERID,
        answer: opt.answer,
        correct: opt.correct,
        color: Colours.RED
      };
      return object;
    });

    hf.randomizeColors(newAnswerOptions);
    let thumbn: string;

    const now = Math.floor(Date.now() / 1000);
    const newQuestion = {
      questionId: newQuestionId,
      question: questionBody.question,
      timeLimit: questionBody.timeLimit,
      points: questionBody.points,
      answerOptions: newAnswerOptions,
      timeCreated: now,
      timeLastEdited: now,
      thumbnailUrl: thumbn
    };

    hf.getAnswerId(newQuestion);
    if (typeof questionBody.thumbnailUrl === 'string') {
      newQuestion.thumbnailUrl = questionBody.thumbnailUrl;
    }
    if (!quiz.questions) {
      quiz.questions = [];
    }
    quiz.questions.push(newQuestion);
    quiz.numQuestions++;
    return { questionId: newQuestionId };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Transfer ownership of a quiz to a different user based on their email
 *
 * @param {number} quizid - The ID of the quiz to transfer
 * @param {string} session - The session ID of the current user
 * @param {object} body - The request body containing the new owner's email
 * @param {string} body.userEmail - The email of the user to transfer the quiz to
 *
 * @returns {object | ErrorObject} - Empty object on success, error object on failure
 */
export function adminQuizTransfer(
  quizid: number,
  session: string,
  body: { userEmail: string }): void {
  // Check if session is valid
  const sessionInfo = hf.findSession(session);
  if (!sessionInfo) {
    throw new Error('Session ID is not valid');
  }

  const userId = sessionInfo.userId;

  // Check if quiz exists and is owned by the user
  const quiz = hf.findQuiz(quizid);
  if (!quiz) {
    throw new Error('Quiz ID does not refer to a valid quiz');
  }

  if (quiz.createdBy !== userId) {
    throw new Error('Quiz ID does not refer to a quiz that this user owns');
  }

  // Check if the target user exists
  const userData = data.getUserData();
  const targetUser = userData.find(user => user.email === body.userEmail);
  if (!targetUser) {
    throw new Error('userEmail is not a real user');
  }

  // Check if the target user is the same as the current owner
  if (targetUser.userId === userId) {
    throw new Error('userEmail is the current logged in user');
  }

  // Check if the target user already has a quiz with the same name
  const targetUserQuizzes = hf.getQuizzesByUser(targetUser.userId);
  if (targetUserQuizzes.some(q => q.name === quiz.name)) {
    throw new Error('Quiz name already exists for the target user');
  }

  // Remove quiz from current owner's ownedQuizzes
  const currentOwner = hf.findUser(userId);
  currentOwner.ownedQuizzes = currentOwner.ownedQuizzes.filter(id => id !== quizid);

  // Add quiz to new owner's ownedQuizzes
  targetUser.ownedQuizzes.push(quizid);

  // Update quiz's createdBy field
  quiz.createdBy = targetUser.userId;
}
/**
 * Generates a quiz question suggestion using the Hugging Face LLM API.
 *
 * @param {number} userId - Internal ID of the user requesting a suggestion
 * @param {number} quizId - Internal ID of the quiz where the question is suggested
 * @returns {object} - Object of suggested question or empty object
 */
export function adminQuizQuestionSuggestion(userId: number, quizId: number) {
  const quizData = data.getQuizData();
  const quiz = quizData.find((q: any) => q.quizId === quizId);
  if (!quiz) {
    throw new Error('Quiz ID does not refer to a valid quiz.');
  }
  if (quiz.createdBy !== userId) {
    throw new Error('Quiz ID does not refer to a quiz owned by the user.');
  }

  // LLM API Model, Token, Prompt
  const googleGemma2 = 'https://api-inference.huggingface.co/models/google/gemma-2-2b-it';

  // LLM Prompt
  const prompt =
    `Generate a quiz question suggestion for the 
  quiz title "${quiz.name}" and the description "${quiz.description}"
  as one singular question. Do not provide any options or answer, just provide the question.`;

  // Call API
  let suggestion: string;
  try {
    const response = request('POST', googleGemma2, {
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      json: { inputs: prompt },
      timeout: 20000
    });
    const body = JSON.parse(response.body.toString());

    if (body.error) {
      throw new Error(body.error);
    }

    if (typeof body === 'string') {
      suggestion = body;
    } else if (Array.isArray(body) && body.length > 0) {
      if (typeof body[0] === 'object' && body[0].generated_text) {
        suggestion = body[0].generated_text;
      } else if (typeof body[0] === 'string') {
        suggestion = body[0];
      } else {
        throw new Error('No valid generated_text in LLM response.');
      }
    } else if (body.generated_text) {
      suggestion = body.generated_text;
    } else {
      throw new Error('There is no valid suggestion returned from the LLM API.');
    }
  } catch (err: any) {
    throw new Error(err.message);
  }
  return { question: suggestion };
}

/**
 * Updates an existing quiz question with new details.
 *
 * @param {number} userId - Internal id of the user who created the question
 * @param {number} quizId - Internal id of the quiz of the question
 * @param {number} questionId - Internal id of the question to be updated
 * @param {object} questionBody - The new question details
 * @returns {object} - Empty object or an error object
 */
export function adminQuizQuestionUpdate(
  userId: number,
  quizId: number,
  questionId: number,
  questionBody: {
    question: string,
    timeLimit: number,
    points: number;
    answerOptions: Array<{ answer: string; correct: boolean }>;
    thumbnailUrl?: string;
  }
): void {
  // Get quiz data
  const quizData = data.getQuizData();
  const quizIndex = quizData.findIndex((q: any) => q.quizId === quizId);

  // Check quiz exists and user owns it
  if (quizIndex === -1) {
    throw new Error('Quiz not found');
  }
  const quiz = quizData[quizIndex];
  if (quiz.createdBy !== userId) {
    throw new Error('User does not own this quiz');
  }

  // Check quiz has questions (using type assertion)
  const quizWithQuestions = quiz as any;
  if (!quizWithQuestions.questions || quizWithQuestions.questions.length === 0) {
    throw new Error('Quiz has no questions');
  }

  // Find the question
  const questionIndex = quizWithQuestions.questions.findIndex(
    (q: any) => q.questionId === questionId
  );
  if (questionIndex === -1) {
    throw new Error('Question not found in quiz');
  }

  // Validate question body
  if (typeof questionBody.question !== 'string' || questionBody.question.length < 5 ||
    questionBody.question.length > 50) {
    throw new Error('Question must be between 5-50 characters');
  }
  if (typeof questionBody.timeLimit !== 'number' || questionBody.timeLimit <= 0) {
    throw new Error('Time limit must be positive');
  }
  if (typeof questionBody.points !== 'number' || questionBody.points < 1 ||
    questionBody.points > 10) {
    throw new Error('Points must be between 1-10');
  }
  if (!Array.isArray(questionBody.answerOptions) || questionBody.answerOptions.length < 2 ||
    questionBody.answerOptions.length > 6) {
    throw new Error('Must have 2-6 answer options');
  }

  // Validate at least one correct answer
  if (!questionBody.answerOptions.some(option => option.correct)) {
    throw new Error('At least one answer must be correct');
  }

  // Validate thumbnailUrl if provided
  if (questionBody.thumbnailUrl !== undefined) {
    if (questionBody.thumbnailUrl === '') {
      throw new Error('The thumbnailUrl is an empty string');
    }

    if (!/^https?:\/\//i.test(questionBody.thumbnailUrl)) {
      throw new Error('The thumbnailUrl does not begin with \'http://\' or \'https://\'');
    }

    if (!/\.(jpg|jpeg|png)$/i.test(questionBody.thumbnailUrl)) {
      throw new Error(
        'The thumbnailUrl does not end with one of the following filetypes ' +
        '(case insensitive): jpg, jpeg, png'
      );
    }
  }

  // Update the question (using type assertion)
  const question = quizWithQuestions.questions[questionIndex];
  quizWithQuestions.questions[questionIndex] = {
    ...question,
    question: questionBody.question,
    timeLimit: questionBody.timeLimit,
    points: questionBody.points,
    answerOptions: questionBody.answerOptions.map(option => ({
      answer: option.answer,
      correct: option.correct,
      color: question.answerOptions.find((o: any) =>
        o.answer === option.answer
      )?.color || `#${Math.floor(Math.random() * 16777215).toString(16)}`
    })),
    timeLastEdited: Math.floor(Date.now() / 1000),
    thumbnailUrl: questionBody.thumbnailUrl !== undefined
      ? questionBody.thumbnailUrl
      : question.thumbnailUrl
  };

  // Save changes
  data.saveData();
}
/**
 * Moves a question from one position to another in a quiz
 *
 * @param {number} userId - The ID of the user making the request
 * @param {number} quizId - The ID of the quiz containing the question
 * @param {number} questionId - The ID of the question to move
 * @param {number} newPosition - The new position to move the question to
 *
 * @returns {object} - Empty object on success, error object on failure
 */
export function adminQuizQuestionMove(
  userId: number,
  quizId: number,
  questionId: number,
  newPosition: number
): object | ErrorObject {
  try {
    hf.doUserIdCheck(userId);

    const quizData = data.getQuizData();
    const quiz = quizData.find(q => q.quizId === quizId);

    // Check if quiz exists and user is owner
    if (!quiz) {
      return { error: 'Quiz ID does not refer to a valid quiz' };
    }
    if (quiz.createdBy !== userId) {
      return { error: 'Valid session, but user not an owner of this quiz or quiz doesn\'t exist' };
    }

    // Check if question exists in quiz
    if (!quiz.questions || !Array.isArray(quiz.questions)) {
      return { error: 'Question Id does not refer to a valid question within this quiz' };
    }

    const currentQuestionIndex = quiz.questions.findIndex(q => q.questionId === questionId);
    if (currentQuestionIndex === -1) {
      return { error: 'Question Id does not refer to a valid question within this quiz' };
    }

    // Validate new position
    if (newPosition < 0 || newPosition >= quiz.questions.length) {
      return { error: 'NewPosition is less than 0, greater than the number of questions' };
    }

    if (newPosition === currentQuestionIndex) {
      return { error: 'NewPosition is the position of the current question' };
    }

    // Move the question
    const [questionToMove] = quiz.questions.splice(currentQuestionIndex, 1);
    quiz.questions.splice(newPosition, 0, questionToMove);

    // Update last edited time
    quiz.timeLastEdited = Math.floor(Date.now() / 1000);

    return {};
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Deletes a question from a quiz
 *
 * @param {number} userId - The ID of the user making the request
 * @param {number} quizId - The ID of the quiz containing the question
 * @param {number} questionId - The ID of the question to delete
 *
 * @returns {object} - Empty object on success, error object on failure
 */
export function adminQuizQuestionDelete(
  userId: number,
  quizId: number,
  questionId: number
): object | ErrorObject {
  try {
    hf.doUserIdCheck(userId);

    // Get quiz data
    const quizData = data.getQuizData();
    const quiz = quizData.find(q => q.quizId === quizId);

    // Check if quiz exists and user is owner
    if (!quiz) {
      return { error: 'Valid session, but user not an owner of this quiz or quiz doesn\'t exist' };
    }
    if (quiz.createdBy !== userId) {
      return { error: 'Valid session, but user not an owner of this quiz or quiz doesn\'t exist' };
    }

    // Check if question exists in quiz
    if (!quiz.questions || !Array.isArray(quiz.questions)) {
      return { error: 'Question Id does not refer to a valid question within this quiz' };
    }

    const questionIndex = quiz.questions.findIndex(q => q.questionId === questionId);
    if (questionIndex === -1) {
      return { error: 'Question Id does not refer to a valid question within this quiz' };
    }

    // Remove the question
    quiz.questions.splice(questionIndex, 1);

    // Update last edited time
    quiz.timeLastEdited = Math.floor(Date.now() / 1000);

    return {};
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Initialises a new game instance for the provided quiz
 *
 * @param quizId - Associated quizId of the game
 * @param seshId - Associated session token of the game
 * @param autoStartNum - Number of players before autostarting the game
 *
 * @returns { gameId: number }
 */
export function adminQuizGameStart(
  quizId: number, seshId: string, autoStartNum: number
): number {
  hf.adminQuizGameStartErrorChecks(quizId, seshId, autoStartNum);

  return hf.startGame(quizId, autoStartNum);
}

/**
 * Changes the current state of the game according to the action received
 *
 * @param quizid
 * @param gameid
 * @param seshid
 * @param action
 *
 * @returns { }
 */
export function adminQuizGameAction(
  quizid: number,
  gameid: number,
  seshid: string,
  action: GameActions
) {
  hf.gameActionErrorChecks(quizid, gameid, seshid, action);
  try {
    hf.doAction(action, gameid);
  } catch (error) {
    throw new HttpError(error.message, 400);
  }

  return { };
}

/**
 * Returns the current details of the game
 *
 * @param quizId
 * @param gameId
 * @param seshId
 *
 * @returns {
 *   state: GameStates;
 *   atQuestion: number;
 *   players: Player[];
 *   metadata: gameMetaData;
 * }
 */
export function adminQuizGameStatus(
  quizId: number, gameId: number, seshId: string
): Omit<Game, 'gameId' | 'quizId' | 'isActive' | 'autoStartNumber'> {
  hf.adminQuizGameStatusErrorChecks(quizId, gameId, seshId);

  let game: Game;
  try { game = hf.findGame(gameId); } catch (error) {
    throw new HttpError(error.message, 400);
  }

  return {
    state: game.state,
    atQuestion: game.atQuestion,
    players: game.players,
    metadata: game.metadata
  };
}

/**
 * Updates the thumbnail URL for a quiz and update timeLastEdited.
 *
 * @param userId       - Internal user ID performing the update
 * @param quizId       - Internal quiz ID
 * @param thumbnailUrl - New thumbnail URL
 * @returns {} - Empty on success, or Error object on failure
 */
export function adminQuizThumbnailUpdate(
  userId: number,
  quizId: number,
  thumbnailUrl: string
): object | ErrorObject {
  try {
    hf.doUserIdCheck(userId);
  } catch (e: any) {
    return {
      error:
        'Session is empty or invalid (does not refer to valid logged in user session)'
    };
  }

  // Find the quiz and verify owner
  const allQuizzes = data.getQuizData();
  const quiz = allQuizzes.find(q => q.quizId === quizId);
  if (!quiz) {
    return { error: 'Quiz doesn\'t exist.' };
  }
  if (quiz.createdBy !== userId) {
    return { error: 'User is not an owner of this quiz.' };
  }

  // Validate the thumbnail format
  if (
    typeof thumbnailUrl !== 'string' ||
    !/^https?:\/\/.+\.(jpe?g|png)$/i.test(thumbnailUrl)
  ) {
    return {
      error:
        'Thumbnail URL must begin with http:// or https:// and end with .jpg, .jpeg, or .png'
    };
  }

  quiz.thumbnailUrl = thumbnailUrl;
  quiz.timeLastEdited = Math.floor(Date.now() / 1000);
  return {};
}

/**
 * View active and inactive quiz games for a specific quiz
 * Retrieves active and inactive game ids (sorted in ascending order) for a quiz
 *
 * @param {string} session - session ID from header
 * @param {number} quizId - quiz ID from path
 *
 * @returns {object} - object containing arrays of active and inactive game IDs
 * @throws {HttpError} - throws error with status code if checks fail
 */
export function adminQuizGameView
(session: string, quizId: number): { activeGames: number[], inactiveGames: number[] } {
  try {
    // Check if session is valid
    const user = hf.findUserBySeshId(session);

    // Check if quiz exists and belongs to user
    const quiz = hf.findQuiz(quizId);
    if (quiz.createdBy !== user.userId) {
      throw new HttpError(
        'Valid session is provided, but user is not an owner of this quiz or quiz doesn\'t exist',
        403);
    }

    // Get all games from data store
    const allGames = data.getAllGames();

    // Filter games by quizId and active status
    const activeGames = allGames.activeGames
      .filter(game => game.quizId === quizId)
      .map(game => game.gameId)
      .sort((a, b) => a - b);

    const inactiveGames = allGames.inactiveGames
      .filter(game => game.quizId === quizId)
      .map(game => game.gameId)
      .sort((a, b) => a - b);

    return {
      activeGames,
      inactiveGames
    };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    // Handle specific error cases
    if (error.message.includes('seshId')) {
      throw new HttpError(
        'Session is empty or invalid (does not refer to valid logged in user session)', 401);
    } else if (error.message.includes('quizId')) {
      throw new HttpError(
        'Valid session is provided, but user is not an owner of this quiz or quiz doesn\'t exist',
        403);
    }

    // For any other unexpected errors
    throw new HttpError('An unexpected error occurred', 500);
  }
}

export function adminQuizGameResults(
  quizId: number,
  gameId: number,
  seshId: string
): {
  usersRankedByScore: Array<{ playerName: string; score: number }>;
  questionResults: Array<{
    questionId: number;
    playersCorrect: string[];
    averageAnswerTime: number;
    percentCorrect: number;
  }>;
} {
  // Check session validity
  const session = hf.findSession(seshId);
  if (!session) {
    throw new HttpError('Session is empty or invalid', 401);
  }

  // Check quiz ownership
  const quiz = hf.findQuiz(quizId);
  if (!quiz) {
    throw new HttpError('Quiz ID does not refer to a valid quiz', 403);
  }

  const user = hf.findUser(session.userId);
  if (!user || !user.ownedQuizzes.includes(quizId)) {
    throw new HttpError('Valid session is provided, but user is not an owner of this quiz', 403);
  }

  // Find the game
  const allGames = data.getAllGames();
  const game = [...allGames.activeGames, ...allGames.inactiveGames]
    .find((g: Game) => g.gameId === gameId && g.quizId === quizId);
  if (!game) {
    throw new HttpError('Game ID does not refer to a valid game within this quiz', 400);
  }

  // Check if game is in FINAL_RESULTS state
  if (game.state !== GameStates.FINAL_RESULTS) {
    throw new HttpError('Game is not in FINAL_RESULTS state', 400);
  }

  // Calculate player scores
  const playerScores: { [playerName: string]: number } = {};
  const questionResults: Array<{
    questionId: number;
    playersCorrect: string[];
    averageAnswerTime: number;
    percentCorrect: number;
  }> = [];

  // Process each question
  for (const question of quiz.questions || []) {
    const gameQuestion = (game.metadata.questions || [])
      .find(q => q.questionId === question.questionId) as unknown as GameQuestion;

    if (!gameQuestion || !gameQuestion.answers) {
      continue;
    }

    // Sort answers by time to determine order of correct answers
    const correctAnswers = gameQuestion.answers
      .filter((a: GameAnswer) => {
        const playerAnswer = a.answerIds;
        const correctAnswerIds = question.answerOptions
          .filter(opt => opt.correct)
          .map(opt => opt.answerId);
        return JSON.stringify(playerAnswer.sort()) === JSON.stringify(correctAnswerIds.sort());
      })
      .sort((a: GameAnswer, b: GameAnswer) => a.timeSubmitted - b.timeSubmitted);

    // Calculate scores for each player
    correctAnswers.forEach((answer: GameAnswer) => {
      const player = game.players.find(p => p.playerId === answer.playerId);
      if (player) {
        const score = Math.round(question.points * (1 / (correctAnswers.indexOf(answer) + 1)));
        playerScores[player.playerName] = (playerScores[player.playerName] || 0) + score;
      }
    });

    // Calculate question statistics
    const totalPlayers = game.players.length;
    const correctPlayers = correctAnswers.length;
    const averageTime = correctAnswers.length > 0
      ? Math.round(correctAnswers.reduce((sum: number, a: GameAnswer) =>
        sum + a.timeSubmitted, 0) / correctAnswers.length)
      : 0;

    questionResults.push({
      questionId: question.questionId,
      playersCorrect: correctAnswers.map((a: GameAnswer) => {
        const player = game.players.find(p => p.playerId === a.playerId);
        return player ? player.playerName : '';
      }).filter((name: string) => name !== ''),
      averageAnswerTime: averageTime,
      percentCorrect: Math.round((correctPlayers / totalPlayers) * 100)
    });
  }

  // Rank players by score
  const rankedPlayers = Object.entries(playerScores)
    .map(([playerName, score]) => ({ playerName, score }))
    .sort((a, b) => b.score - a.score);

  // Handle ties in ranking
  let currentRank = 1;
  let currentScore = rankedPlayers[0]?.score;
  let skipCount = 0;

  const finalRankedPlayers = rankedPlayers.map((player, index) => {
    if (player.score < currentScore) {
      currentRank += skipCount + 1;
      currentScore = player.score;
      skipCount = 0;
    } else {
      skipCount++;
    }
    return { ...player, rank: currentRank };
  });

  return {
    usersRankedByScore: finalRankedPlayers.map(({ playerName, score }) => ({ playerName, score })),
    questionResults
  };
}
