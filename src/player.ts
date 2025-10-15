
import { GameStates, GameActions } from './types';
import {
  findGame, checkValidCharacters, findPlayerWithName,
  createAndAddPlayerToGame, findGameByPlayerId, doAction,
  findQuiz
} from './helperFunctions';
/**
 * Adds a player to a game
 * @param {number} gameId - the game which the player joins
 * @param {string} playerName - The players name
 *
 * @returns { playerId : string }
 */
export function playerJoin(gameId: number, playerName: string) {
  // throws error if invalid characters (1/4)
  if (!checkValidCharacters(playerName)) {
    throw new Error('Name contains invalid characters');
  }
  // should throw error if game doesnt exist (2/4)
  const game = findGame(gameId);
  // game is not in a valid state (3/4)
  if (game.state !== GameStates.LOBBY) {
    throw new Error('game is not in a lobby state');
  }
  // name of user is not unique (4/4)
  if (findPlayerWithName(game, playerName)) {
    throw new Error('Name is not unique');
  }
  const player = createAndAddPlayerToGame(game, playerName);
  if (game.players.length === game.autoStartNumber) {
    // game should start now
    doAction(GameActions.NEXT_QUESTION, game.gameId);
  }
  return { playerId: player.playerId };
}

/**
 * gets status of a player in a game
 * @param {number} playerId
 *
 *
 * @returns { state : GameStates,
 *            numQuestions : number,
 *            atQuestion: number }
 */
export function playerStatus (playerId: number) {
  // throws error if invalid playerId (1/4)
  const game = findGameByPlayerId(playerId);
  if (game === null) {
    throw new Error('playerId does not exist');
  }
  return {
    state: game.state,
    numQuestions: game.metadata.numQuestions,
    atQuestion: game.atQuestion
  };
}

/**
 * returns a specific question of a given player
 * @param {number} playerId
 * @param {number} questionPosition
 *
 * @returns { object }
*/
export function playerQuestionPosition (playerId: number, questionPosition: number) {
  // throws error if invalid playerId (1/4)
  const truePos = questionPosition - 1;
  const game = findGameByPlayerId(playerId);
  if (game === null) {
    throw new Error('playerId does not exist');
  }
  const quiz = findQuiz(game.quizId);
  if (questionPosition > quiz.numQuestions) {
  // console.log("question position is: ", questionPosition);
  // console.log("quizNumQuestions is: ", quiz.numQuestions);
    throw new Error('invalid question position');
  }
  if (questionPosition !== game.atQuestion) {
  // console.log(game);
    throw new Error('game is not currently on this question');
  }
  if (game.state === GameStates.LOBBY ||
      game.state === GameStates.QUESTION_COUNTDOWN ||
      game.state === GameStates.FINAL_RESULTS ||
      game.state === GameStates.END) {
    throw new Error('game is in an invalid state');
  }
  const publicAnswers = quiz.questions[questionPosition - 1]
    .answerOptions.map(({ correct, ...rest }) => rest);

  return {
    questionId: quiz.questions[truePos].questionId,
    question: quiz.questions[truePos].question,
    timeLimit: quiz.questions[truePos].timeLimit,
    thumbnailUrl: quiz.questions[truePos].thumbnailUrl,
    points: quiz.questions[truePos].points,
    answerOptions: publicAnswers,
  };
}
