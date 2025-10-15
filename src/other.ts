// import * as hf from './helperFunctions';
import * as data from './dataStore';
// import * as auth from './auth';
// import * as quiz from './quiz';
/**
 * Resets the application state to its initial state.
 *
 * @returns {void} - An empty object indicating success.
 */
export function clear(): object {
  const userData = data.getUserData();
  const quizData = data.getQuizData();
  const activeSessions = data.getActiveSessions();
  const allGames = data.getAllGames();
  clearTimers();
  userData.length = 0;
  quizData.length = 0;
  activeSessions.length = 0;
  allGames.activeGames.length = 0;
  allGames.inactiveGames.length = 0;
  data.saveData();
  return { };
}

function clearTimers() {
  const allGames = data.getAllGames();
  const games = [...allGames.activeGames, ...allGames.inactiveGames];
  games.forEach(game => {
    if (game.currentTimer) {
      clearTimeout(game.currentTimer);
    }
  });
}
