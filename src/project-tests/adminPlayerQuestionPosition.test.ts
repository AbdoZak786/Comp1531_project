import { deleteReq, postReq, putReq, getSeshId, getBody, getReq } from '../helperFunctions';
import { GameActions, isColoursEnum, isErrorObjectType } from '../types';
let seshId: string;
let quizId: number;
let gameId: number;
let playerId: number;
let qOneId: number;
let qTwoId: number;
let qThreeId: number;
let qFourId: number;
let tempSeshId: string;

function sendActionSpecific(
  action: GameActions,
  seshid: string,
  quizid: number,
  gameid: number
) {
  return putReq(`/v1/admin/quiz/${quizid}/game/${gameid}`, {
    json: { action },
    headers: { session: tempSeshId }
  });
}

function sendAction(action: GameActions) {
  return sendActionSpecific(action, seshId, quizId, gameId);
}

beforeEach(() => {
  deleteReq('/v1/clear');
  // Register a user through HTTP and get session id
  tempSeshId = getSeshId(
    postReq('/v1/admin/auth/register', {
      json: {
        email: 'email@gmail.com',
        password: 'Password123',
        nameFirst: 'Fernando',
        nameLast: 'Djingga'
      }
    })
  );
  console.log(tempSeshId);
  // Create a quiz through HTTP and get quizId
  const resQuiz = postReq('/v1/admin/quiz', {
    json: { name: 'Sample Quiz', description: 'A sample quiz for testing' },
    headers: { session: tempSeshId }
  });
  console.log(resQuiz);
  quizId = getBody(resQuiz).quizId;
  seshId = tempSeshId;

  // create 4 questions in the quiz
  let questionBody: {
          question: string;
          timeLimit: number;
          points: number;
          answerOptions: Array<{ answer: string; correct: boolean }>;
          thumbnailUrl: string;
        } = {
          question: 'Who is the Monarch of England?',
          timeLimit: 4,
          points: 5,
          answerOptions: [
            { answer: 'Prince Charles', correct: true },
            { answer: 'Queen Elizabeth', correct: false }
          ],
          thumbnailUrl: 'http://google.com/some/image/path.jpg'
        };
  qOneId = getBody(postReq(`/v2/admin/quiz/${quizId}/question`, {
    json: { questionBody },
    headers: { session: seshId }
  })).questionId;
  questionBody = {
    question: 'Who is the Monarch of India?',
    timeLimit: 4,
    points: 5,
    answerOptions: [
      { answer: 'Adithya', correct: true },
      { answer: 'Adithya but 5000 years ago', correct: false }
    ],
    thumbnailUrl: 'http://google.com/some/image/path.jpg'
  };
  qTwoId = getBody(postReq(`/v2/admin/quiz/${quizId}/question`, {
    json: { questionBody },
    headers: { session: seshId }
  })).questionId;
  questionBody = {
    question: 'Who is the funniest man alive?',
    timeLimit: 4,
    points: 5,
    answerOptions: [
      { answer: 'Adithya', correct: true },
      { answer: 'Yifan', correct: false }
    ],
    thumbnailUrl: 'http://google.com/some/image/path.jpg'
  };
  qThreeId = getBody(postReq(`/v2/admin/quiz/${quizId}/question`, {
    json: { questionBody },
    headers: { session: seshId }
  })).questionId;
  questionBody = {
    question: 'Who ate my food?',
    timeLimit: 4,
    points: 5,
    answerOptions: [
      { answer: 'Jeremy', correct: true },
      { answer: 'Bob', correct: false }
    ],
    thumbnailUrl: 'http://google.com/some/image/path.jpg'
  };
  qFourId = getBody(postReq(`/v2/admin/quiz/${quizId}/question`, {
    json: { questionBody },
    headers: { session: seshId }
  })).questionId;
  // create a game with the quiz
  console.log('debugging:', [qOneId, qTwoId, qThreeId, qFourId]);
  const resGame = postReq(`/v1/admin/quiz/${quizId}/game/start`, {
    json: { autoStartNum: 3 },
    headers: { session: seshId }
  });
  console.log('resgame is : ', getBody(resGame));
  gameId = getBody(resGame).gameId;
  console.log('game id is: ', gameId);
  // get a player to join the game
  const joinRes = postReq('/v1/player/join', {
    json: { gameId: gameId, playerName: 'normal fred' },
  });

  /*  playerId = getBody(postReq('/v1/player/join', {
    json: { gameId: gameId, playerName: 'normal fred'},
  })).playerId;
  */
  console.log(getBody(joinRes));
  playerId = getBody(joinRes).playerId;

  console.log('playerId is : ', playerId);
  // get 2nd player to join the game
  postReq('/v1/player/join', {
    json: { gameId: gameId, playerName: 'abnormal fred' },
  });
  // should be quiz info

  const res = getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: tempSeshId } });
  expect(res.statusCode).toBe(200);
  const result = getBody(res);
  console.log(result);
});

describe('Success Tests', () => {
  test('successfully gives the correct information for question 1', () => {
    postReq('/v1/player/join', {
      json: { gameId: gameId, playerName: 'important fred' },
    });

    putReq(`/v1/admin/quiz/${quizId}/game/${gameId}`, {
      headers: { session: tempSeshId },
      json: { action: GameActions.SKIP_COUNTDOWN },
    });
    const playerStatusRes = getReq(`/v1/player/${playerId}`);
    const playerStatus = getBody(playerStatusRes);
    console.log(playerStatus);

    const playerQuestionInfoRes = getReq(`/v1/player/${playerId}/question/1`);

    expect(playerQuestionInfoRes.statusCode).toStrictEqual(200);
    const playerQuestionInfo = getBody(playerQuestionInfoRes);
    console.log(playerQuestionInfo);
    console.log(qOneId);
    expect(playerQuestionInfo).toStrictEqual({
      questionId: qOneId,
      question: 'Who is the Monarch of England?',
      timeLimit: 4,
      thumbnailUrl: 'http://google.com/some/image/path.jpg',
      points: 5,
      answerOptions: [
        { answerId: expect.any(Number), answer: 'Prince Charles', color: expect.any(String) },
        { answerId: expect.any(Number), answer: 'Queen Elizabeth', color: expect.any(String) }
      ]
    });
    expect(isColoursEnum(playerQuestionInfo.answerOptions[0].color)).toStrictEqual(true);
    expect(isColoursEnum(playerQuestionInfo.answerOptions[1].color)).toStrictEqual(true);
  });
  test('successfully gives the correct information for question 3', () => {
    postReq('/v1/player/join', {
      json: { gameId: gameId, playerName: 'important fred' },
    });
    sendAction(GameActions.SKIP_COUNTDOWN);
    sendAction(GameActions.GO_TO_ANSWER);
    sendAction(GameActions.NEXT_QUESTION);

    sendAction(GameActions.SKIP_COUNTDOWN);
    sendAction(GameActions.GO_TO_ANSWER);
    sendAction(GameActions.NEXT_QUESTION);
    sendAction(GameActions.SKIP_COUNTDOWN);
    sendAction(GameActions.GO_TO_ANSWER);

    const playerStatusRes = getReq(`/v1/player/${playerId}`);
    expect(playerStatusRes.statusCode).toStrictEqual(200);
    const playerStatus = getBody(playerStatusRes);
    console.log(playerStatus);

    const playerQuestionInfoRes = getReq(`/v1/player/${playerId}/question/3`);
    console.log(getBody(playerQuestionInfoRes));
    expect(playerQuestionInfoRes.statusCode).toStrictEqual(200);
    const playerQuestionInfo = getBody(playerQuestionInfoRes);
    expect(playerQuestionInfo).toStrictEqual({
      questionId: qThreeId,
      question: 'Who is the funniest man alive?',
      timeLimit: 4,
      thumbnailUrl: 'http://google.com/some/image/path.jpg',
      points: 5,
      answerOptions: [
        { answer: 'Adithya', answerId: expect.any(Number), color: expect.any(String) },
        { answer: 'Yifan', answerId: expect.any(Number), color: expect.any(String) }
      ]
    });
    expect(isColoursEnum(playerQuestionInfo.answerOptions[0].color)).toStrictEqual(true);
    expect(isColoursEnum(playerQuestionInfo.answerOptions[1].color)).toStrictEqual(true);
  });
});

describe('Error Tests', () => {
  test('cant findQuestion of an invalid playerId', () => {
    postReq('/v1/player/join', {
      json: { gameId: gameId, playerName: 'important fred' },
    });
    const playerQuestionInfoRes = getReq(`/v1/player/${playerId + 1}/question/3`);
    expect(playerQuestionInfoRes.statusCode).toStrictEqual(400);
    const playerStatus = getBody(playerQuestionInfoRes);
    expect(playerStatus).toStrictEqual({ error: 'playerId does not exist' });
  });
  test('cant findQuestion of an invalid question position', () => {
    postReq('/v1/player/join', {
      json: { gameId: gameId, playerName: 'important fred' },
    });
    const playerQuestionInfoRes = getReq(`/v1/player/${playerId}/question/5`);
    expect(playerQuestionInfoRes.statusCode).toStrictEqual(400);
    const playerStatus = getBody(playerQuestionInfoRes);
    expect(playerStatus).toStrictEqual({ error: 'invalid question position' });
  });
  test('cant findQuestion of an non current question position', () => {
    postReq('/v1/player/join', {
      json: { gameId: gameId, playerName: 'important fred' },
    });
    const playerQuestionInfoRes = getReq(`/v1/player/${playerId}/question/2`);
    expect(playerQuestionInfoRes.statusCode).toStrictEqual(400);
    const playerStatus = getBody(playerQuestionInfoRes);
    expect(playerStatus).toStrictEqual({ error: 'game is not currently on this question' });
  });
  test('cant findQuestion of an END gamestate ', () => {
    postReq('/v1/player/join', {
      json: { gameId: gameId, playerName: 'important fred' },
    });

    sendAction(GameActions.END);

    const playerQuestionInfoRes = getReq(`/v1/player/${playerId}/question/1`);
    expect(playerQuestionInfoRes.statusCode).toStrictEqual(400);
    const playerStatus = getBody(playerQuestionInfoRes);
    expect(playerStatus).toStrictEqual({ error: 'game is in an invalid state' });
  });
  test('cant findQuestion of an FINAL_RESULTS gamestate ', () => {
    postReq('/v1/player/join', {
      json: { gameId: gameId, playerName: 'important fred' },
    });

    sendAction(GameActions.SKIP_COUNTDOWN);
    sendAction(GameActions.GO_TO_ANSWER);
    sendAction(GameActions.GO_TO_FINAL_RESULTS);

    const playerQuestionInfoRes = getReq(`/v1/player/${playerId}/question/1`);
    expect(playerQuestionInfoRes.statusCode).toStrictEqual(400);
    const playerStatus = getBody(playerQuestionInfoRes);
    expect(playerStatus).toStrictEqual({ error: 'game is in an invalid state' });
  });
  // should be in lobby because theres only 2 people (it hasnt autostarted)
  // lobby cant be tested because when ur in lobby ur on question 0 which isnt a valid question
  test('cant findQuestion of an LOBBY gamestate ', () => {
    const playerQuestionInfoRes = getReq(`/v1/player/${playerId}/question/1`);
    expect(playerQuestionInfoRes.statusCode).toStrictEqual(400);
    const playerStatus = getBody(playerQuestionInfoRes);
    expect(isErrorObjectType(playerStatus)).toStrictEqual(true);
  });
  test('cant findQuestion of an QUESTION_COUNTDOWN gamestate ', () => {
    postReq('/v1/player/join', {
      json: { gameId: gameId, playerName: 'important fred' },
    });
    const playerQuestionInfoRes = getReq(`/v1/player/${playerId}/question/1`);
    expect(playerQuestionInfoRes.statusCode).toStrictEqual(400);
    const playerStatus = getBody(playerQuestionInfoRes);
    expect(playerStatus).toStrictEqual({ error: 'game is in an invalid state' });
  });
});
