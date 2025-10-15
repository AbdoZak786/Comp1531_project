import express, { json, Request, Response } from 'express';
import { echo } from './newecho';
import morgan from 'morgan';
import config from './config.json';
import cors from 'cors';
import YAML from 'yaml';
import sui from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
// import process from 'process';
import * as other from './other';
import * as auth from './auth';
import * as hf from './helperFunctions';
import { isErrorObjectType, Session, HttpError } from './types';
import { loadData, saveData } from './dataStore';
import {
  adminQuizCreate,
  adminQuizList,
  adminQuizInfo,
  adminQuizQuestionCreate,
  adminQuizNameUpdate,
  adminQuizDescriptionUpdate,
  adminQuizRemove,
  adminQuizQuestionMove,
  adminQuizQuestionDelete,
  adminQuizTransfer,
  adminQuizQuestionSuggestion,
  adminQuizQuestionUpdate,
  adminQuizGameStart,
  adminQuizGameAction,
  adminQuizGameStatus,
  adminQuizThumbnailUpdate,
  adminQuizGameView,
  adminQuizGameResults
} from './quiz';
import { adminUserDetailsUpdate, adminUserPasswordUpdate } from './auth';
import { playerJoin, playerStatus, playerQuestionPosition } from './player';
import dotenv from 'dotenv';
dotenv.config({ path: './llm.env' });
// Commented to silence lint warnings (vvv)
// import request from 'sync-request-curl';
// Commented to silence lint warnings (vvv)
export const HUGGINGFACE_API_TOKEN = process.env.F15A_AVOCET_HF_API_TOKEN;

// Set up web app
const app = express();
// Use middleware that allows us to access the JSON body of requests
app.use(json());
// Use middleware that allows for access from other domains
app.use(cors());
// for logging errors (print to terminal)
app.use(morgan('dev'));
// for producing the docs that define the API
// for parsing the body of requests
const file = fs.readFileSync(path.join(process.cwd(), 'swagger.yaml'), 'utf8');
app.get('/', (req: Request, res: Response) => res.redirect('/docs'));
app.use(
  '/docs',
  sui.serve, sui.setup(YAML.parse(file),
    { swaggerOptions: { docExpansion: config.expandDocs ? 'full' : 'list' } }
  ));

const PORT: number = parseInt(process.env.PORT || config.port);
const HOST: string = process.env.IP || '127.0.0.1';

// ====================================================================
//  ================= WORK IS DONE BELOW THIS LINE ===================
// ====================================================================
app.delete('/v1/clear', (req: Request, res: Response) => {
  const result = other.clear();
  return res.json(result);
});

// Example get request
app.get('/echo', (req: Request, res: Response) => {
  const result = echo(req.query.echo as string);
  if ('error' in result) {
    res.status(400).json(result);
    return;
  }

  return res.json(result);
});

app.post('/v1/admin/auth/register', (req: Request, res: Response) => {
  const { email, password, nameFirst, nameLast } = req.body;

  console.log('received email = ', email);
  console.log('received password = ', password);
  console.log('received nameFirst = ', nameFirst);
  console.log('received nameLast = ', nameLast);

  // Create the user internally
  let seshId: string;
  try {
    seshId = auth.adminAuthRegister(email, password, nameFirst, nameLast);
  } catch (error) {
    console.log(error.message);
    res.status(400).json(hf.mkerr(error.message));
    return;
  }

  return res.json({ session: seshId });
});

app.get('/v1/admin/user/details', (req: Request, res: Response) => {
  const seshId: string | undefined = req.header('session');
  if (seshId === undefined) {
    return res.status(401).json({ error: 'bad session token' });
  }
  let session: Session;
  try {
    session =
      hf.findSession(seshId);
  } catch (error) {
    return res.status(401).json(hf.mkerr(error.message));
  }

  const userId: number = session.userId;
  let userDetails;
  try {
    userDetails =
      auth.adminUserDetails(userId);
  } catch (error) {
    return res.status(401).json(hf.mkerr(error.message));
  }

  return res.json(userDetails);
});

// Endpoint implementation for adminQuizCreate
app.post('/v1/admin/quiz', (req: Request, res: Response) => {
  // Validate session from request header
  const seshId: string | undefined = req.header('session');
  if (!seshId) {
    return res.sendStatus(401);
  }
  let session;
  try {
    session = hf.findSession(seshId);
  } catch (err) {
    return res.sendStatus(401);
  }
  if (!session) {
    return res.sendStatus(401);
  }
  if (typeof req.body !== 'object' || req.body === null) {
    return res.sendStatus(400);
  }

  // Get the quiz data from request body
  const { name, description } = req.body;
  if (typeof name !== 'string' || typeof description !== 'string') {
    return res.sendStatus(400);
  }

  try {
    const result = adminQuizCreate(session.userId, name, description);
    return res.json(result);
  } catch (err: any) {
    return res.sendStatus(400);
  }
});
// JSON parse error handling
app.use((error: any, req: Request, res: Response, next: (...args: any[]) => void) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.sendStatus(400);
  }
  next();
});

// Endpoint implementation for adminQuizList
app.get('/v1/admin/quiz/list', (req: Request, res: Response) => {
  // Validate the session from request header
  const seshId: string | undefined = req.header('session');
  if (!seshId) {
    return res.sendStatus(401);
  }
  let session;
  try {
    session = hf.findSession(seshId);
  } catch (err) {
    return res.sendStatus(401);
  }
  if (!session) {
    return res.sendStatus(401);
  }

  // Get the quiz info for the userId from session and quiz id
  try {
    const result = adminQuizList(session.userId);
    return res.json(result);
  } catch (err: any) {
    return res.sendStatus(403);
  }
});

// Endpoint implementation for adminQuizInfo v1
app.get('/v1/admin/quiz/:quizid', (req: Request, res: Response) => {
  // Validate session from request header
  const seshId: string | undefined = req.header('session');
  if (!seshId) {
    return res.status(401).json({ error: 'Session is empty' });
  }
  const session = hf.findSession(seshId);
  if (!session) {
    return res.status(401).json({ error: 'Session is invalid' });
  }
  // Validate quiz id
  const quizidStr = req.params.quizid;
  if (!/^\d+$/.test(quizidStr)) {
    return res.status(400).json({ error: 'QuizId is invalid' });
  }
  const quizid = parseInt(quizidStr, 10);

  // Get the quiz info for the userId from session and quiz id
  try {
    const info = adminQuizInfo(session.userId, quizid);
    return res.json(info);
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

// Endpoint implementation for adminQuizInfo v2
app.get('/v2/admin/quiz/:quizid', (req, res) => {
  const seshId = req.header('session');
  if (!seshId) {
    return res.status(401).json({ error: 'Session is empty' });
  }
  let session;
  try {
    session = hf.findSession(seshId);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  const quizidStr = req.params.quizid;
  if (!/^\d+$/.test(quizidStr)) {
    return res.status(400).json({ error: 'QuizId is invalid' });
  }
  const quizid = parseInt(quizidStr, 10);
  let result;
  try {
    result = adminQuizInfo(session.userId, quizid);
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
  return res.status(200).json(result);
});

// Endpoint implementation for adminQuizQuestionCreate
app.post('/v1/admin/quiz/:quizid/question', (req: Request, res: Response) => {
  // Validate session from request header
  const seshId: string | undefined = req.header('session');
  if (!seshId) {
    return res.sendStatus(401);
  }
  const session = hf.findSession(seshId);
  if (!session) {
    return res.sendStatus(401);
  }
  // Validate quiz id
  const quizidStr = req.params.quizid;
  if (!/^\d+$/.test(quizidStr)) {
    return res.sendStatus(400);
  }
  const quizid = parseInt(quizidStr, 10);

  // Get question body from the request body
  const questionBody = req.body.questionBody;
  if (typeof questionBody !== 'object' || questionBody === null) {
    return res.sendStatus(400);
  }

  const result = adminQuizQuestionCreate(session.userId, quizid, questionBody);
  if ('error' in result) {
    if (
      result.error === 'Points must be between 1 and 10.' ||
      result.error === 'Each answer option must be between 1 and 30 characters long.' ||
      result.error === 'The total time limit for all questions in the quiz exceeds 3 minutes.'
    ) {
      return res.json(result);
    }
    if (
      result.error === 'Quiz not found or user does not own this quiz.' ||
      result.error === 'User does not have permission to modify this quiz.'
    ) {
      return res.sendStatus(403);
    }
    return res.sendStatus(400);
  }
  return res.json(result);
});

// Endpoint implementation for adminQuizQuestionCreate (v2)
app.post('/v2/admin/quiz/:quizid/question', (req: Request, res: Response) => {
  try {
    const sessionId = req.header('session');
    if (!sessionId) {
      throw new HttpError('Session is empty or invalid', 401);
    }
    let session;
    try {
      session = hf.findSession(sessionId);
    } catch {
      // hf.findSession throws if session not found
      throw new HttpError('Session is empty or invalid', 401);
    }
    if (!session) {
      throw new HttpError('Session is empty or invalid', 401);
    }

    // quizId must be valid number
    const quizIdStr = req.params.quizid;
    if (!/^\d+$/.test(quizIdStr)) {
      throw new HttpError('quizId must be a number', 400);
    }
    const quizId = parseInt(quizIdStr, 10);

    // questionBody must be an object
    const qBody = req.body.questionBody;
    if (!qBody || typeof qBody !== 'object') {
      throw new HttpError('Question body is invalid.', 400);
    }

    if (
      typeof qBody.thumbnailUrl !== 'string' ||
      qBody.thumbnailUrl.length === 0 ||
      !/^https?:\/\/.*\.(jpe?g|png)$/i.test(qBody.thumbnailUrl)
    ) {
      throw new HttpError(
        'Thumbnail URL must begin with http:// or https:// and end with .jpg, .jpeg, or .png', 400
      );
    }

    const result = adminQuizQuestionCreate(session.userId, quizId, qBody);
    if (isErrorObjectType(result)) {
      const err = result.error;
      if (
        err === "Quiz doesn't exist." ||
        err === 'User is not the owner of this quiz.'
      ) {
        throw new HttpError(err, 403);
      }

      throw new HttpError(err, 400);
    }
    return res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof HttpError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Endpoint implementation for adminAuthLogin
app.post('/v1/admin/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  let result: object;
  try {
    result = auth.adminAuthLogin(email, password);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  // if the thrown error is whatever start sessions error would be
  return res.status(200).json(result);
});

// Endpoint implementation for adminQuizNameUpdate
app.put('/v1/admin/quiz/:quizid/name', (req: Request, res: Response) => {
  // Validate session from request header
  const seshId: string | undefined = req.header('session');
  if (!seshId) {
    return res.status(401).json({ error: 'seshId is empty' });
  }
  const quizIdStr = req.params.quizid;
  const quizId = parseInt(quizIdStr, 10);
  const { name: newName } = req.body;
  let result;
  try {
    result = adminQuizNameUpdate(seshId, quizId, newName);
  } catch (err) {
    if (err.message === 'seshId does not exist!') {
      return res.status(401).json({ error: err.message });
    }
    if (err.message === 'quizId does not exist!' ||
      err.message === 'QuizId does not refer to a quiz that this user owns') {
      return res.status(403).json({ error: err.message });
    }
    return res.status(400).json({ error: err.message });
  }
  return res.status(200).json(result);
});

// Endpoint implementation for adminQuizDescriptionUpdate
app.put('/v1/admin/quiz/:quizid/description', (req: Request, res: Response) => {
  // Validate session from request header
  const seshId: string | undefined = req.header('session');
  const quizIdStr = req.params.quizid;
  const quizId = parseInt(quizIdStr, 10);
  const { description: newDescription } = req.body;

  if (!seshId) {
    return res.status(401).json({ error: 'seshId is empty' });
  }
  let result;
  try {
    result = adminQuizDescriptionUpdate(seshId, quizId, newDescription);
  } catch (err) {
    if (err.message === 'seshId does not exist!') {
      return res.status(401).json({ error: err.message });
    }
    if (err.message === 'quizId does not exist!' ||
      err.message === 'QuizId does not refer to a quiz that this user owns') {
      return res.status(403).json({ error: err.message });
    }
    return res.status(400).json({ error: err.message });
  }
  return res.status(200).json(result);
});

// AdminUserDetailsUpdate Endpoint implementation
app.put('/v1/admin/user/details', (req: Request, res: Response) => {
  try {
    // 1. Session Validation
    const sessionId = req.header('session');
    if (!sessionId) {
      return res.status(401).json({ error: 'Session token is missing' });
    }

    const session = hf.findSession(sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session token' });
    }

    // 2. Input Validation
    const { email, nameFirst, nameLast } = req.body;
    if (!email || !nameFirst || !nameLast) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 3. Call business logic from auth.ts
    adminUserDetailsUpdate(session.userId, email, nameFirst, nameLast);

    // 4. Success response
    return res.status(200).json({
      message: 'User details updated successfully'
    });
  } catch (error: any) {
    // Handle other errors
    if (error.message.includes('Invalid session token')) {
      return res.status(401).json({ error: error.message });
    }
    return res.status(400).json({ error: error.message });
  }
});
// Endpoint implementation for adminQuizTransfer

app.post('/v1/admin/quiz/:quizid/transfer', (req, res) => {
  try {
    const { quizid } = req.params;
    const session = req.headers.session as string;
    const { userEmail } = req.body;

    // Input validation
    if (!session) {
      throw new Error('Session ID is not valid');
    }

    if (!userEmail || typeof userEmail !== 'string') {
      throw new Error('Invalid or missing userEmail');
    }

    // Convert quizid to number
    const quizId = Number(quizid);
    if (isNaN(quizId)) {
      throw new Error('Invalid quiz ID');
    }

    // Call the adminQuizTransfer function
    adminQuizTransfer(quizId, session, { userEmail });

    // Success case
    return res.status(200).json({});
  } catch (error) {
    // Map specific error messages to appropriate status codes
    switch (error.message) {
      case 'Session ID is not valid':
        return res.status(401).json({ error: error.message });
      case 'Quiz ID does not refer to a valid quiz':
      case 'Quiz ID does not refer to a quiz that this user owns':
        return res.status(403).json({ error: error.message });
      case 'userEmail is not a real user':
      case 'Quiz name already exists for the target user':
        return res.status(400).json({ error: error.message });
      case 'userEmail is the current logged in user':
        return res.status(403).json({ error: error.message });
      case 'Invalid or missing userEmail':
      case 'Invalid quiz ID':
        return res.status(400).json({ error: error.message });
      default:
        return res.status(401).json({ error: 'Internal server error' });
    }
  }
});
// Endpoint implementation for adminQuizQuestionSuggestion
app.get('/v1/admin/quiz/:quizid/question/suggestion', (req: Request, res: Response) => {
  // Validate session from request header
  const seshId: string | undefined = req.header('session');
  if (!seshId) {
    return res.sendStatus(401);
  }
  let session;
  try {
    session = hf.findSession(seshId);
  } catch (err) {
    return res.sendStatus(401);
  }
  if (!session) {
    return res.sendStatus(401);
  }

  // Validate quiz id
  const quizidStr = req.params.quizid;
  if (!/^\d+$/.test(quizidStr)) {
    return res.sendStatus(400);
  }
  const quizId = parseInt(quizidStr, 10);

  try {
    const suggestion = adminQuizQuestionSuggestion(session.userId, quizId);
    return res.json(suggestion);
  } catch (err: any) {
    const msg = err.message.toLowerCase();
    if (msg.includes('does not refer to a valid quiz') || msg.includes('this user owns')) {
      return res.sendStatus(403);
    }
    return res.sendStatus(400);
  }
});

// Endpoint implementation for adminAuthLogout
app.post('/v1/admin/auth/logout', (req: Request, res: Response) => {
  const seshId: string | undefined = req.header('session');
  let result;
  try {
    result = auth.adminAuthLogout(seshId);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
  return res.status(200).json(result);
});

app.put('/v1/admin/quiz/:quizid/question/:questionid/move', (req: Request, res: Response) => {
  // Validate session
  const seshId: string | undefined = req.header('session');
  if (!seshId) {
    return res.status(401).json({ error: 'Session is empty or invalid' });
  }

  let session;
  try {
    session = hf.findSession(seshId);
  } catch (err) {
    return res.status(401).json({ error: 'Session is empty or invalid' });
  }
  if (!session) { // CHANGE ADD
    return res.status(401).json({ error: 'Session is empty or invalid' });
  }

  // Validate quiz ID
  const quizId = parseInt(req.params.quizid, 10);
  if (isNaN(quizId)) {
    return res.status(400).json({ error: 'Invalid quiz ID' });
  }

  // Validate question ID
  const questionId = parseInt(req.params.questionid, 10);
  if (isNaN(questionId)) {
    return res.status(400).json({ error: 'Invalid question ID' });
  }

  // Validate request body
  const { newPosition } = req.body;
  if (typeof newPosition !== 'number') {
    return res.status(400).json({ error: 'Invalid newPosition' });
  }

  const result = adminQuizQuestionMove(session.userId, quizId, questionId, newPosition);

  if ('error' in result) {
    if (result.error.includes('not an owner')) {
      return res.status(403).json(result);
    } else if (result.error.includes('does not refer to a valid question') ||
      result.error.includes('NewPosition')) {
      return res.status(400).json(result);
    } else {
      return res.status(400).json(result);
    }
  }

  return res.json(result);
});

// Endpoint implementation for adminQuizQuestionUpdate
app.put('/v1/admin/quiz/:quizid/question/:questionid', (req: Request, res: Response) => {
  try {
    // Validate session from request header
    const seshId: string | undefined = req.header('session');
    if (!seshId) {
      return res.status(401).json({ error: 'Session is empty' });
    }

    // Handle case where helper function returns undefined
    const session = hf.findSession(seshId);
    if (!session) {
      return res.status(401).json({ error: 'Session is invalid' });
    }
    // Validate quiz id
    const quizidStr = req.params.quizid;
    if (!/^\d+$/.test(quizidStr)) {
      throw new Error('QuizId is invalid');
    }
    const quizid = parseInt(quizidStr, 10);

    // Validate question id
    const questionidStr = req.params.questionid;
    if (!/^\d+$/.test(questionidStr)) {
      throw new Error('QuestionId is invalid');
    }
    const questionid = parseInt(questionidStr, 10);

    // Get question body from the request body
    const questionBody = req.body.questionBody;
    if (typeof questionBody !== 'object' || questionBody === null) {
      throw new Error('Request body is invalid');
    }

    adminQuizQuestionUpdate(
      session.userId,
      quizid,
      questionid,
      questionBody
    );

    return res.status(200).json({});
  } catch (error) {
    console.error('Error in question update:', error);

    // Handle different error cases
    if (error.message.includes('not own') || error.message.includes('not found')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes('must be') || error.message.includes('invalid')) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/v2/admin/quiz/:quizid', (req: Request, res: Response) => {
  // Get session and validate
  const sessionId = req.header('session');
  if (!sessionId) {
    console.log('in da if stmt 1');

    return res.status(401).json({ error: 'Session is empty or invalid' });
  }

  let session;
  try {
    session = hf.findSession(sessionId);
  } catch (e) {
    return res.status(401).json({ error: 'Session is empty or invalid' });
  }

  // if (!session) {
  //   console.log("in da if stmt 2");
  //   return res.status(401).json({ error: 'Session is empty or invalid' });
  // }

  // Validate quiz ID
  const quizId = parseInt(req.params.quizid);
  if (isNaN(quizId)) {
    console.log('in da if stmt 3');
    return res.status(403).json({ error: 'Invalid quiz ID' });
  }

  // Call the remove function
  try {
    console.log('in da if try 1');
    const result = adminQuizRemove(session.userId, quizId);
    return res.json(result);
  } catch (error) {
    console.log(error, 'error');

    // if (error instanceof HttpError) {
    // Map the error to the appropriate status code
    return res.status(error.statusCode).json({ error: error.message });
    // }
    // // For any unexpected errors, return 403 as per Swagger spec
    // return res.status(403).json({ error: 'Quiz ID does not refer to a valid quiz' });
  }
});

// Endpoint implementation for adminUserPasswordUpdate
app.put('/v1/admin/user/password', (req: Request, res: Response) => {
  try {
    // 1. Session Validation
    const sessionId = req.header('session');
    if (!sessionId) {
      return res.status(401).json({ error: 'Session token is missing' });
    }

    const session = hf.findSession(sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session token' });
    }

    // 2. Input Validation
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 3. Call business logic from auth.ts
    adminUserPasswordUpdate(session.userId, oldPassword, newPassword);

    // 4. Success response
    return res.status(200).json({});
  } catch (error: any) {
    // Handle errors
    if (error.message.includes('Incorrect old password')) {
      return res.status(401).json({ error: error.message });
    }
    if (error.message.includes('New password must be different') ||
      error.message.includes('New password has been used before') ||
      error.message.includes('Password must be at least') ||
      error.message.includes('Password must contain')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('Invalid user ID')) {
      return res.status(404).json({ error: error.message });
    }

    // Default error response
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Export the configured app
export default app;

app.delete('/v1/admin/quiz/:quizid/question/:questionid', (req: Request, res: Response) => {
  // Validate session
  const seshId: string | undefined = req.header('session');
  if (!seshId) {
    return res.status(401).json({ error: 'Session is empty or invalid' });
  }

  let session;
  try {
    session = hf.findSession(seshId);
  } catch (err) {
    return res.status(401).json({ error: 'Session is empty or invalid' });
  }
  if (!session) {
    return res.status(401).json({ error: 'Session is empty or invalid' });
  }

  // Validate quiz ID
  const quizId = parseInt(req.params.quizid, 10);
  if (isNaN(quizId)) {
    return res.status(400).json({ error: 'Invalid quiz ID' });
  }

  // Validate question ID
  const questionId = parseInt(req.params.questionid, 10);
  if (isNaN(questionId)) {
    return res.status(400).json({ error: 'Invalid question ID' });
  }

  // Call the delete function
  const result = adminQuizQuestionDelete(session.userId, quizId, questionId);

  if ('error' in result) {
    // appropriate status code based on error type
    if (result.error.includes('not an owner') || result.error.includes('doesn\'t exist')) {
      return res.status(403).json(result);
    } else if (result.error.includes('does not refer to a valid question')) {
      return res.status(400).json(result);
    } else {
      return res.status(400).json(result);
    }
  }

  return res.json(result);
});

// Endpoint implementation of adminQuizThumbnailUpdate
app.put('/v1/admin/quiz/:quizid/thumbnail', (req: Request, res: Response) => {
  try {
    // Validate session
    const sessionId = req.header('session');
    if (!sessionId) {
      throw new HttpError(
        'Session is empty or invalid (does not refer to valid logged in user session)',
        401
      );
    }
    let session;
    try {
      session = hf.findSession(sessionId);
    } catch {
      throw new HttpError(
        'Session is empty or invalid (does not refer to valid logged in user session)',
        401
      );
    }
    if (!session) {
      throw new HttpError(
        'Session is empty or invalid (does not refer to valid logged in user session)',
        401
      );
    }

    // Validate that quizId must be a number, thumbnailUrl must be a string
    const quizIdStr = req.params.quizid;
    if (!/^\d+$/.test(quizIdStr)) {
      throw new HttpError('quizId must be a number', 400);
    }
    const quizId = parseInt(quizIdStr, 10);
    const thumbnailUrl = req.body.thumbnailUrl;
    if (typeof thumbnailUrl !== 'string') {
      throw new HttpError('thumbnailUrl must be a string', 400);
    }

    const result = adminQuizThumbnailUpdate(session.userId, quizId, thumbnailUrl);
    if (isErrorObjectType(result)) {
      if (
        result.error === 'User is not an owner of this quiz.' ||
        result.error === 'Quiz doesn\'t exist.'
      ) {
        throw new HttpError(result.error, 403);
      }
      throw new HttpError(result.error, 400);
    }

    return res.status(200).json({});
  } catch (err: any) {
    if (err instanceof HttpError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/v1/admin/quiz/:quizid/game/start', (req: Request, res: Response) => {
  const seshId: string = req.header('session');
  const autoStartNum = req.body.autoStartNum;
  const quizId: number = +req.params.quizid;
  let gameId: number;
  try {
    gameId = adminQuizGameStart(quizId, seshId, autoStartNum);
  } catch (error) {
    return res.status(error.statusCode).json(hf.mkerr(error.message));
  }

  return res.json({ gameId: gameId });
});

// Endpoint implementation of adminQuizGameStatus
app.get('/v1/admin/quiz/:quizid/game/:gameid', (req: Request, res: Response) => {
  const seshId: string = req.header('session');
  const quizId: number = +req.params.quizid;
  const gameId: number = +req.params.gameid;

  let details;
  try {
    details = adminQuizGameStatus(quizId, gameId, seshId);
  } catch (error) {
    return res.status(error.statusCode).json(hf.mkerr(error.message));
  }

  return res.json(details);
});
// V2 Endpoint implementation for adminQuizTransfer
app.post('/v2/admin/quiz/:quizid/transfer', (req, res) => {
  try {
    const { quizid } = req.params;
    const session = req.headers.session as string;
    const { userEmail } = req.body;

    // Input validation
    if (!session) {
      throw new Error('Session ID is not valid');
    }

    if (!userEmail || typeof userEmail !== 'string') {
      throw new Error('Invalid or missing userEmail');
    }

    // Convert quizid to number
    const quizId = Number(quizid);
    if (isNaN(quizId)) {
      throw new Error('Invalid quiz ID');
    }

    // Call the adminQuizTransfer function with version 2
    adminQuizTransfer(quizId, session, { userEmail });

    // Success case
    return res.status(200).json({});
  } catch (error) {
    // Map specific error messages to appropriate status codes
    switch (error.message) {
      case 'Session ID is not valid':
        return res.status(401).json({ error: error.message });
      case 'Quiz ID does not refer to a valid quiz':
      case 'Quiz ID does not refer to a quiz that this user owns':
        return res.status(403).json({ error: error.message });
      case 'userEmail is not a real user':
      case 'Quiz name already exists for the target user':
      case 'Any game for this quiz is not in END state':
        return res.status(400).json({ error: error.message });
      case 'userEmail is the current logged in user':
        return res.status(403).json({ error: error.message });
      case 'Invalid or missing userEmail':
      case 'Invalid quiz ID':
        return res.status(400).json({ error: error.message });
      default:
        return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// endpoint implementation for player join
app.post('/v1/player/join', (req: Request, res: Response) => {
  const gameId: number = req.body.gameId;
  const playerName: string = req.body.playerName;
  let result;
  try {
    result = playerJoin(gameId, playerName);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  return res.status(200).json(result);
});

// endpoint implementation for player status
app.get('/v1/player/:playerid', (req: Request, res: Response) => {
  const playerId: number = +req.params.playerid;
  let result;
  try {
    result = playerStatus(playerId);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  return res.status(200).json(result);
});

// endpoint implementation for player question position
app.get('/v1/player/:playerid/question/:questionposition', (req: Request, res: Response) => {
  const playerId: number = +req.params.playerid;
  const questionPosition: number = +req.params.questionposition;
  console.log(questionPosition);
  let result;
  try {
    result = playerQuestionPosition(playerId, questionPosition);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  return res.status(200).json(result);
});

// Endpoint implementation of adminQuizGameAction
app.put('/v1/admin/quiz/:quizid/game/:gameid', (req: Request, res: Response) => {
  const quizid: number = +req.params.quizid;
  const gameid: number = +req.params.gameid;
  const seshid: string = req.header('session');
  const action = req.body.action;

  try {
    adminQuizGameAction(quizid, gameid, seshid, action);
  } catch (error) {
    return res.status(error.statusCode).json(hf.mkerr(error.message));
  }

  return res.json({ });
});

// Endpoint implementaton for AdminQuizGameView
app.get('/v1/admin/quiz/:quizid/games', (req: Request, res: Response) => {
  try {
    // Validate session
    const seshId = req.header('session');
    if (!seshId) {
      return res.status(401).json({ error: 'Session is empty or invalid' });
    }

    // Validate quiz ID
    const quizId = parseInt(req.params.quizid, 10);
    if (isNaN(quizId)) {
      return res.status(400).json({ error: 'Invalid quiz ID' });
    }

    // Call the adminQuizGames function
    const result = adminQuizGameView(seshId, quizId);
    return res.json(result);
  } catch (error) {
    // Handle different error cases
    if (error.message.includes('Session is empty or invalid')) {
      return res.status(401).json({ error: error.message });
    } else if (error.message.includes('not an owner') || error.message.includes('does not exist')) {
      return res.status(403).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});
app.put('/v2/admin/quiz/:quizid/question/:questionid', (req: Request, res: Response) => {
  try {
    // Validate session from request header
    const seshId: string | undefined = req.header('session');
    if (!seshId) {
      return res.status(401).json({ error: 'Session is empty' });
    }

    // Handle case where helper function returns undefined
    const session = hf.findSession(seshId);
    if (!session) {
      return res.status(401).json({ error: 'Session is invalid' });
    }
    // Validate quiz id
    const quizidStr = req.params.quizid;
    if (!/^\d+$/.test(quizidStr)) {
      throw new Error('QuizId is invalid');
    }
    const quizid = parseInt(quizidStr, 10);

    // Validate question id
    const questionidStr = req.params.questionid;
    if (!/^\d+$/.test(questionidStr)) {
      throw new Error('QuestionId is invalid');
    }
    const questionid = parseInt(questionidStr, 10);

    // Get question body from the request body
    const questionBody = req.body.questionBody;
    if (typeof questionBody !== 'object' || questionBody === null) {
      throw new Error('Request body is invalid');
    }

    adminQuizQuestionUpdate(
      session.userId,
      quizid,
      questionid,
      questionBody
    );

    return res.status(200).json({});
  } catch (error) {
    console.error('Error in question update:', error);

    // Handle different error cases
    if (error.message.includes('not own') || error.message.includes('not found')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes('must be') || error.message.includes('invalid') ||
        error.message.includes('thumbnailUrl')) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/v1/admin/quiz/:quizid/game/:gameid/results', (req: Request, res: Response) => {
  try {
    // Validate session
    const seshId = req.header('session');
    if (!seshId) {
      return res.status(401).json({ error: 'Session is empty or invalid' });
    }

    // Validate quiz ID and game ID
    const quizId = parseInt(req.params.quizid, 10);
    const gameId = parseInt(req.params.gameid, 10);
    if (isNaN(quizId) || isNaN(gameId)) {
      return res.status(400).json({ error: 'Invalid quiz ID or game ID' });
    }

    // Call the adminQuizGameResults function
    const result = adminQuizGameResults(quizId, gameId, seshId);
    return res.json(result);
  } catch (error) {
    // Handle different error cases
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    // For any other errors, return 400 as per swagger specification
    return res.status(400).json({ error: 'Invalid request' });
  }
});
// ====================================================================
//  ================= WORK IS DONE ABOVE THIS LINE ===================
// ====================================================================

app.use((req: Request, res: Response) => {
  const error = `
    Route not found - This could be because:
      0. You have defined routes below (not above) this middleware in server.ts
      1. You have not implemented the route ${req.method} ${req.path}
      2. There is a typo in either your test or server, e.g. /posts/list in one
         and, incorrectly, /post/list in the other
      3. You are using ts-node (instead of ts-node-dev) to start your server and
         have forgotten to manually restart to load the new changes
      4. You've forgotten a leading slash (/), e.g. you have posts/list instead
         of /posts/list in your server.ts or test file
  `;
  res.status(404).json({ error });
});

if (process.env.NODE_ENV !== 'test') {
  // start server
  const server = app.listen(PORT, HOST, () => {
    // DO NOT CHANGE THIS LINE
    console.log(`⚡️ Server started on port ${PORT} at ${HOST}`);
    loadData();
  });

  // For coverage, handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    server.close(() => {
      console.log('Shutting down server gracefully.');
      saveData();
      process.exit();
    });
  });
}
