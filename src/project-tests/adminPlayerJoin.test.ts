import { deleteReq, postReq, getSeshId, getBody, getReq, putReq } from '../helperFunctions';
import { GameStates } from '../types';
let seshId: string;
let quizId: number;
let gameId: number;

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
});

describe('Success Tests', () => {
  test('successfully adds a single player to the game', () => {
    const resJoin = postReq('/v1/player/join', {
      json: { gameId: gameId, playerName: 'normal fred' },
    });
    const playerId = getBody(resJoin).playerId;
    expect(typeof playerId).toBe('number');
    expect(resJoin.statusCode).toStrictEqual(200);
    // checking player status
    const playerStatusRes = getReq(`/v1/player/${playerId}`);
    const playerStatus = getBody(playerStatusRes);
    // assuming that there are 0 questions answered and at 0 question
    expect(playerStatus).toStrictEqual({
      state: GameStates.LOBBY,
      numQuestions: 1,
      atQuestion: 0
    });
  });
  test('game automatically starts when autojoin number is reached ', () => {
    let resJoin = postReq('/v1/player/join', {
      json: { gameId: gameId, playerName: 'normal fred' },
    });
    let playerId = getBody(resJoin).playerId;
    expect(typeof playerId).toBe('number');
    expect(resJoin.statusCode).toStrictEqual(200);
    // checking player status
    let playerStatusRes = getReq(`/v1/player/${playerId}`);
    let playerStatus = getBody(playerStatusRes);
    // assuming that there are 0 questions answered and at 0 question
    expect(playerStatus).toStrictEqual({
      state: GameStates.LOBBY,
      numQuestions: 1,
      atQuestion: 0
    });

    resJoin = postReq('/v1/player/join', {
      json: { gameId: gameId, playerName: 'abnormal fred' },
    });
    playerId = getBody(resJoin).playerId;
    expect(typeof playerId).toBe('number');
    expect(resJoin.statusCode).toStrictEqual(200);
    // checking player status
    playerStatusRes = getReq(`/v1/player/${playerId}`);
    playerStatus = getBody(playerStatusRes);
    // assuming that there are 0 questions answered and at 0 question
    expect(playerStatus).toStrictEqual({
      state: GameStates.LOBBY,
      numQuestions: 1,
      atQuestion: 0
    });

    resJoin = postReq('/v1/player/join', {
      json: { gameId: gameId, playerName: 'stupid fred' },
    });
    playerId = getBody(resJoin).playerId;
    expect(typeof playerId).toBe('number');
    expect(resJoin.statusCode).toStrictEqual(200);
    // checking player status
    playerStatusRes = getReq(`/v1/player/${playerId}`);
    playerStatus = getBody(playerStatusRes);
    // assuming that there are 0 questions answered and at 0 question
    // question countdown shouldev started since 3 people (autostart num) have joined
    expect(playerStatus).toStrictEqual({
      state: GameStates.QUESTION_COUNTDOWN,
      numQuestions: 1,
      atQuestion: 1
    });
  });
});

describe('Error Tests', () => {
  test.each([
    { playerName: 'h!llyBill33Gragas' },
    { playerName: 'rumpleSTI1ltcsk!N' },
    { playerName: 'ironH4NDS2*@' },
    { playerName: 'JuNG3LR(*!@&$' }
  ])("Tested $playerName's as a player name, should be invalid due to illegal characters", ({
    playerName
  }) => {
    const resJoin = postReq('/v1/player/join', {
      json: { gameId: gameId, playerName: playerName },
    });
    expect((getBody(resJoin))).toStrictEqual({ error: 'Name contains invalid characters' });
    expect(resJoin.statusCode).toStrictEqual(400);
  });
  test('playerName is not unique', () => {
    let resJoin = postReq('/v1/player/join', {
      json: { gameId: gameId, playerName: 'normal fred' },
    });
    const playerId = getBody(resJoin).playerId;
    expect(typeof playerId).toBe('number');
    expect(resJoin.statusCode).toStrictEqual(200);
    // trying again with same playerName
    resJoin = postReq('/v1/player/join', {
      json: { gameId: gameId, playerName: 'normal fred' },
    });
    expect((getBody(resJoin))).toStrictEqual({ error: 'Name is not unique' });
    expect(resJoin.statusCode).toStrictEqual(400);
  });
  test('gameId does not exist', () => {
    const tempGameId = gameId + 1;
    const resJoin = postReq('/v1/player/join', {
      json: { gameId: tempGameId, playerName: 'normal fred' },
    });
    expect((getBody(resJoin))).toStrictEqual({ error: 'gameId does not exist!' });
    expect(resJoin.statusCode).toStrictEqual(400);
  });
  // needs update game state to work
  test('game is not in a lobby state', () => {
    putReq(`/v1/admin/quiz/${quizId}/game/${gameId}`, {
      headers: { session: seshId },
      json: { action: GameStates.END }
    });
    const resJoin = postReq('/v1/player/join', {
      json: { gameId: gameId, playerName: 'normal fred' },
    });
    expect((getBody(resJoin))).toStrictEqual({ error: 'game is not in a lobby state' });
    expect(resJoin.statusCode).toStrictEqual(400);
  });
});
// needs gameStatus to work
test('if empty string is given, a valid name is created', () => {
  const regex = /^[a-zA-Z]{5}[0-9]{3}$/;

  const resJoin = postReq('/v1/player/join', {
    json: { gameId: gameId, playerName: '' },
  });
  const playerId = getBody(resJoin).playerId;
  expect(typeof playerId).toBe('number');
  expect(resJoin.statusCode).toStrictEqual(200);

  const resGameStatus = getReq(`/v1/admin/quiz/${quizId}/game/${gameId}`, {
    headers: { session: seshId }
  });
  const gameStatus = getBody(resGameStatus);

  const playerName = gameStatus.players[0].playerName;
  // player has not been created yet
  expect(regex.test(playerName)).toBe(true);
});
