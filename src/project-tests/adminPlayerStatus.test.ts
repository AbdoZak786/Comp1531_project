import { deleteReq, postReq, getSeshId, getBody, getReq } from '../helperFunctions';
import { GameStates } from '../types';
let seshId: string;
let quizId: number;
let gameId: number;
let playerId: number;

beforeEach(() => {
  deleteReq('/v1/clear');
  // Register a user through HTTP and get session id
  const tempSeshId = getSeshId(
    postReq('/v1/admin/auth/register', {
      json: {
        email: 'email@gmail.com',
        password: 'Password123',
        nameFirst: 'Fernando',
        nameLast: 'Djingga'
      }
    })
  );
  // Create a quiz through HTTP and get quizId
  const resQuiz = postReq('/v1/admin/quiz', {
    json: { name: 'Sample Quiz', description: 'A sample quiz for testing' },
    headers: { session: tempSeshId }
  });
  quizId = getBody(resQuiz).quizId;
  seshId = tempSeshId;

  // create a question in the quiz
  const questionBody: {
          question: string;
          timeLimit: number;
          points: number;
          answerOptions: Array<{ answer: string; correct: boolean }>;
        } = {
          question: 'Who is the Monarch of England?',
          timeLimit: 4,
          points: 5,
          answerOptions: [
            { answer: 'Prince Charles', correct: true },
            { answer: 'Queen Elizabeth', correct: false }
          ]
        };
  postReq(`/v1/admin/quiz/${quizId}/question`, {
    json: { questionBody },
    headers: { session: seshId }
  });

  // create a game with the quiz

  const resGame = postReq(`/v1/admin/quiz/${quizId}/game/start`, {
    json: { autoStartNum: 3 },
    headers: { session: seshId }
  });
  gameId = getBody(resGame).gameId;
  console.log(gameId);
  // get a player to join the game
  playerId = getBody(postReq('/v1/player/join', {
    json: { gameId: gameId, playerName: 'normal fred' },
  })).playerId;
});

describe('Success Tests', () => {
  test('successfully gives the status of a valid playerId', () => {
    const playerStatusRes = getReq(`/v1/player/${playerId}`);
    expect(playerStatusRes.statusCode).toStrictEqual(200);
    const playerStatus = getBody(playerStatusRes);
    // assuming that there are 0 questions answered and at 0 question
    expect(playerStatus).toStrictEqual({
      state: GameStates.LOBBY,
      numQuestions: 1,
      atQuestion: 0
    });
  });
});
describe('Error Tests', () => {
  test('cant give the status of an invalid playerId', () => {
    const playerStatusRes = getReq(`/v1/player/${playerId + 1}`);
    expect(playerStatusRes.statusCode).toStrictEqual(400);
    const playerStatus = getBody(playerStatusRes);
    // assuming that there are 0 questions answered and at 0 question
    expect(playerStatus).toStrictEqual({ error: 'playerId does not exist' });
  });
});
