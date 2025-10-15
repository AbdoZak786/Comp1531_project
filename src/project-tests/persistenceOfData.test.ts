import fs from 'fs';
import path from 'path';
import { addUser, saveData } from '../dataStore';
import * as data from '../dataStore';
import { clear } from '../other';
import { User } from '../types';

const dataFilePath = path.join(process.cwd(), 'data.json');

describe('Data Persistence Testing', () => {
  beforeEach(() => {
    // Initialize and persist a cleared data
    clear();
    saveData();
  });
  // Test 1: Perform data persistence onto the memory
  test('Persist the user data to memory cache', () => {
    const user: User = {
      userId: 0,
      email: 'email@gmail.com',
      password: 'Password123',
      nameFirst: 'Fernando',
      nameLast: 'Djingga',
      numSuccessfulLogins: 1,
      numFailedPasswordsSinceLastLogin: 0,
      ownedQuizzes: [],
      currentSessions: []
    };
    addUser(user);

    // Read the persisted file from the file system
    const fileContents = fs.readFileSync(dataFilePath, 'utf8');
    const parsedData = JSON.parse(fileContents);
    expect(parsedData.userData).toEqual(expect.arrayContaining([user]));
  });
  // Test 2: Fetch data persisted from the memory
  test('Reload the persisted data after a restart', () => {
    const user: User = {
      userId: 0,
      email: 'restarted@gmail.com',
      password: 'Password124',
      nameFirst: 'Restarted',
      nameLast: 'User',
      numSuccessfulLogins: 1,
      numFailedPasswordsSinceLastLogin: 0,
      ownedQuizzes: [],
      currentSessions: []
    };
    addUser(user);

    // Reset module to restart
    jest.resetModules();

    // Reload dataStore
    expect(data.getUserData()).toEqual(expect.arrayContaining([user]));
  });
});
