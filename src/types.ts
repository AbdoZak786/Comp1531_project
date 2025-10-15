// Standard return error object
export interface ErrorObject {
  error: string;
}

/**
 * Standard typeguard function against ErrorObject
 *
 * @param value - object to be tested
 *
 * @returns { boolean }
 */
export function isErrorObjectType(value: any): value is ErrorObject {
  // Returns true if all checks pass
  return (
    value &&
    typeof value === 'object' &&
    'error' in value &&
    typeof value.error === 'string'
  );
}

export class HttpError extends Error {
  constructor(public message: string, public statusCode: number) {
    super(message);
    this.name = 'HttpError';
  }
}

// Definition of a User
export interface User {
  userId: number;
  nameFirst: string;
  nameLast: string;
  email: string;
  password: string;
  passwordHistory?: string[]; // Make it optional
  numSuccessfulLogins: number;
  numFailedPasswordsSinceLastLogin: number;
  ownedQuizzes: number[];
  currentSessions: string[];
}

// Definition of a Player
export interface Player {
  playerName: string
  playerId: number;
  numQuestions: number;
  atQuestion: number;
}

export function isPlayerType(value: any): value is Player {
  return (
    value &&
    typeof value === 'object' &&
    'playerName' in value && typeof value.playerName === 'string' &&
    'playerId' in value && typeof value.playerId === 'number' &&
    'numQuestions' in value && typeof value.numQuestions === 'number' &&
    'atQuestion' in value && typeof value.atQuestion === 'number'
  );
}

/**
 * Standard typeguard function against User
 *
 * @param value - object to be tested
 *
 * @returns { boolean }
 */
export function isUserType(value: any): value is User {
  return (
    value &&
    typeof value === 'object' &&
    'userId' in value && typeof value.userId === 'number' &&
    'nameFirst' in value && typeof value.nameFirst === 'string' &&
    'nameLast' in value && typeof value.nameLast === 'string' &&
    'email' in value && typeof value.email === 'string' &&
    'password' in value && typeof value.password === 'string' &&
    'numSuccessfulLogins' in value && typeof value.numSuccessfulLogins === 'number' &&
    'numFailedPasswordsSinceLastLogin' in value &&
    typeof value.numFailedPasswordsSinceLastLogin === 'number' &&
    'ownedQuizzes' in value &&
    value.ownedQuizzes.every((quiz: any) => typeof quiz === 'number') &&
    'currentSessions' in value &&
    value.currentSessions.every((sesh: any) => typeof sesh === 'string')
  );
}

export interface allGamesType {
  activeGames: Game[];
  inactiveGames: Game[]
}

type QuestionMetaData = Omit<Question, 'timeCreated' | 'timeLastEdited'>;

export type gameMetaData = Omit<Quiz, 'createdBy' | 'gameIds' | 'questions'> & {
  questions?: QuestionMetaData[];
}

export function isGameMetaDataType(value: any): value is gameMetaData {
  return (
    value &&
    typeof value === 'object' &&
    'quizId' in value && typeof value.quizId === 'number' &&
    'name' in value && typeof value.name === 'string' &&
    'timeCreated' in value && typeof value.timeCreated === 'number' &&
    'timeLastEdited' in value && typeof value.timeLastEdited === 'number' &&
    'description' in value && typeof value.description === 'string'
  );
}

export enum Colours {
  RED = 'RED',
  BLUE = 'BLUE',
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  PURPLE = 'PURPLE',
  PINK = 'PINK',
  ORANGE = 'ORANGE'
}

export function isColoursEnum(value: any): value is Colours {
  return Object.values(Colours).includes(value);
}

export interface Answer {
  answerId: number;
  answer: string;
  correct: boolean;
  color: Colours;
}

export interface Question {
  questionId: number;
  question: string;
  timeLimit: number;
  thumbnailUrl: string;
  points: number;
  answerOptions: Answer[];
  timeCreated: number;
  timeLastEdited: number;
}

// Definition of a Quiz
export interface Quiz {
  quizId: number;
  name: string;
  timeCreated: number;
  timeLastEdited: number;
  description: string;
  createdBy: number;
  questions?: Question[];
  numQuestions: number;
  timeLimit?: number;
  thumbnailUrl?: string;
  gameIds: { activeGameIds: number[], inactiveGameIds: number[] };
}

/**
 * Standard typeguard function against Quiz
 *
 * @param value - object to be tested
 *
 * @returns  { boolean }
 */
export function isQuizType(value: any): value is Quiz {
  return (
    value &&
    typeof value === 'object' &&
    'quizId' in value && typeof value.quizId === 'number' &&
    'name' in value && typeof value.name === 'string' &&
    'timeCreated' in value && typeof value.timeCreated === 'number' &&
    'timeLastEdited' in value && typeof value.timeLastEdited === 'number' &&
    'description' in value && typeof value.description === 'string' &&
    'createdBy' in value && typeof value.createdBy === 'number' &&
    'gameIds' in value && value.gameIds.every((gid: any) => typeof gid === 'number')
  );
}

export enum GameStates {
  LOBBY = 'LOBBY',
  QUESTION_COUNTDOWN = 'QUESTION_COUNTDOWN',
  QUESTION_OPEN = 'QUESTION_OPEN',
  QUESTION_CLOSE = 'QUESTION_CLOSE',
  FINAL_RESULTS = 'FINAL_RESULTS',
  ANSWER_SHOW = 'ANSWER_SHOW',
  END = 'END'
}

export function isGameState(value: any): value is GameStates {
  return Object.values(GameStates).includes(value);
}

export enum GameActions {
  END = 'END',
  NEXT_QUESTION = 'NEXT_QUESTION',
  SKIP_COUNTDOWN = 'SKIP_COUNTDOWN',
  GO_TO_ANSWER = 'GO_TO_ANSWER',
  GO_TO_FINAL_RESULTS = 'GO_TO_FINAL_RESULTS',
}

export function isGameAction(value: any): value is GameActions {
  return Object.values(GameActions).includes(value);
}

export interface Game {
  gameId: number;
  quizId: number;
  isActive: boolean;
  autoStartNumber: number;
  state: GameStates;
  atQuestion: number;
  players: Player[];
  currentTimer?: ReturnType<typeof setTimeout> | undefined
  metadata: gameMetaData;
}

export function isGameType(value: any): value is Game {
  return (
    value &&
    typeof value === 'object' &&
    'gameId' in value && typeof value.gameId === 'number' &&
    'quizId' in value && typeof value.quizId === 'number' &&
    'isActive' in value && typeof value.isActive === 'boolean' &&
    'autoStartNumber' in value && typeof value.autoStartNumber === 'number' &&
    'state' in value && isGameState(value.state) &&
    'atQuestion' in value && typeof value.atQuestion === 'number' &&
    'players' in value && Array.isArray(value.players) &&
    value.players.every((player: any) => isPlayerType(player)) &&
    'metadata' in value && isGameMetaDataType(value.metadata)
  );
}

export type UserArray = User[];

/**
 * Standard typeguard function against UserArray
 *
 * @param value - object to be tested
 *
 * @returns  { boolean }
 */
export function isUserArrayType(value: any): value is UserArray {
  return (
    Array.isArray(value) &&
    value.every((u: any) => isUserType(u))
  );
}

export type QuizArray = Quiz[];

/**
 * Standard typeguard function against QuizArray
 *
 * @param value - object to be tested
 *
 * @returns  { boolean }
 */
export function isQuizArrayType(value: any): value is QuizArray {
  return (
    Array.isArray(value) &&
    value.every((q: any) => isQuizType(q))
  );
}

/**
 * Holds information about a currently active session
 *  - userId: The user the session is related to
 *  - sessionId: The unique id allocated to the session
  */
export interface Session {
  userId: number,
  sessionId: string,
  isAdmin?: boolean; // Optional property to indicate if the user is an admin
}

/**
 * Standard typeguard function against Session
 *
 * @param value - object to be tested
 *
 * @returns  { boolean }
 */
export function isSessionType(value: any): value is Session {
  return (
    value &&
    typeof value === 'object' &&
    'userId' in value && typeof value.userId === 'number' &&
    'sessionId' in value && typeof value.sessionId === 'string'
  );
}

export type SessionArray = Session[];

/**
 * Standard typeguard function against QuizArray
 *
 * @param value - object to be tested
 *
 * @returns  { boolean }
 */
export function isSessionArrayType(value: any): value is SessionArray {
  return (
    Array.isArray(value) &&
    value.every((s: any) => isQuizType(s))
  );
}

export interface GameAnswer {
  playerId: number;
  answerIds: number[];
  timeSubmitted: number;
}

export interface GameQuestion extends
Omit<Question, 'timeCreated' | 'timeLastEdited' | 'answerOptions'> {
  answers: GameAnswer[];
}
