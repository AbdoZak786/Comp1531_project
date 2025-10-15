import * as types from './types';
import * as fs from 'fs';
import * as path from 'path';

// Path to the data file
const dataFilePath = path.join(process.cwd(), 'data.json');

const userData: types.UserArray = [];
const quizData: types.QuizArray = [];
const activeSessions: types.SessionArray = [];
const allGames: { activeGames: types.Game[]; inactiveGames: types.Game[] } = {
  activeGames: [],
  inactiveGames: []
};

// Use getUserData() to access the user data
export function getUserData(): types.UserArray {
  return userData;
}

// Use getQuizData() to access the quiz data
export function getQuizData(): types.QuizArray {
  return quizData;
}

export function getActiveSessions(): types.SessionArray {
  return activeSessions;
}

export function getAllGames(): types.allGamesType {
  return allGames;
}

export function getAllActiveGames(): types.Game[] {
  return allGames.activeGames;
}

export function getAllInactiveGames(): types.Game[] {
  return allGames.inactiveGames;
}

// Adds the user object as a data to be persisted
export function addUser(user: types.User) {
  userData.push(user);
  saveData();
}

// Load persisted data from the JSON file into memory arrays
export function loadData() {
  console.log('⏳ Loading data.json...');

  try {
    if (fs.existsSync(dataFilePath)) {
      const fileContents = fs.readFileSync(dataFilePath, 'utf8');
      const parsedData = JSON.parse(fileContents);
      // Clear current arrays and load persisted data
      userData.splice(0, userData.length, ...parsedData.userData);
      quizData.splice(0, quizData.length, ...parsedData.quizData);
      activeSessions.splice(0, activeSessions.length, ...parsedData.activeSessions);
    }
  } catch (err) {
    console.error('❌ Error loading data:', err);
  }

  console.log('✅ Loading complete!');
}

// Save the data to the JSON file
export function saveData(): void {
  console.log('⏳ Saving to data.json');
  const dataToPersist = {
    userData,
    quizData,
    activeSessions,
  };
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(dataToPersist, null, 2), 'utf8');
  } catch (err) {
    console.error('❌ Error saving data:', err);
  }
  console.log('✅ Saving complete!');
}
