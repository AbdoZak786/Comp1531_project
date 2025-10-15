import { deleteReq, postReq, getSeshId, getBody, getReq, putReq } from '../helperFunctions';
import { Quiz } from '../types';

beforeEach(() => {
  deleteReq('/v1/clear');
});

describe('Success Tests', () => {
  test('successfully creates a question with valid inputs', () => {
    // Register a user through HTTP and get session id
    const seshId = getSeshId(
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
      headers: { session: seshId }
    });
    const quizId = getBody(resQuiz).quizId;

    // HTTP endpoint for changing name of quiz
    const newQuizName : string = 'larryTheQuiz';
    const res = putReq(`/v1/admin/quiz/${quizId}/name`, {
      json: { name: newQuizName },
      headers: { session: seshId }
    });

    const result = getBody(res);
    expect(result).toStrictEqual({});

    const listRes = getReq('/v1/admin/quiz/list', {
      headers: { session: seshId }
    });
    // ensuring that the correct quiz got updated
    const list = getBody(listRes);
    const foundQuiz =
      list.quizzes.find((quiz: Quiz) => quiz.name === newQuizName && quiz.quizId === quizId);
    expect(foundQuiz).toBeDefined();
    expect(res.statusCode).toStrictEqual(200);
  });

  test('successfully creates multiple users with multiple quizzes, changes multiple names', () => {
    // register multiple users
    const seshId1 = getSeshId(
      postReq('/v1/admin/auth/register', {
        json: {
          email: 'email@gmail.com',
          password: 'Password123',
          nameFirst: 'Fernando',
          nameLast: 'Djingga'
        }
      })
    );
    const seshId2 = getSeshId(
      postReq('/v1/admin/auth/register', {
        json: {
          email: 'funnymail@gmail.com',
          password: 'Pass12532',
          nameFirst: 'Big',
          nameLast: 'Dawg'
        }
      })
    );
    const seshId3 = getSeshId(
      postReq('/v1/admin/auth/register', {
        json: {
          email: 'sad@gmail.com',
          password: 'Ping1251',
          nameFirst: 'Fella',
          nameLast: 'Man'
        }
      })
    );
    // creates 3 quizzes for user 1
    postReq('/v1/admin/quiz', {
      json: { name: 'Sample Quiz 1', description: 'A sample quiz for testing' },
      headers: { session: seshId1 }
    });
    // const quizId1 = getBody(resQuiz1).quizId;

    const resQuiz2 = postReq('/v1/admin/quiz', {
      json: { name: 'Sample Quiz 2', description: 'A sample quiz for testing' },
      headers: { session: seshId1 }
    });
    const quizId2 = getBody(resQuiz2).quizId;

    const resQuiz3 = postReq('/v1/admin/quiz', {
      json: { name: 'Sample Quiz 3', description: 'A sample quiz for testing' },
      headers: { session: seshId1 }
    });
    const quizId3 = getBody(resQuiz3).quizId;

    // create 2 quizzes for user 2
    postReq('/v1/admin/quiz', {
      json: { name: 'Sample Quiz 4', description: 'A sample quiz for testing' },
      headers: { session: seshId2 }
    });
    // const quizId4 = getBody(resQuiz4).quizId;

    const resQuiz5 = postReq('/v1/admin/quiz', {
      json: { name: 'Sample Quiz 5', description: 'A sample quiz for testing' },
      headers: { session: seshId2 }
    });
    const quizId5 = getBody(resQuiz5).quizId;

    // create 2 quizzes for user 3
    postReq('/v1/admin/quiz', {
      json: { name: 'Sample Quiz 6', description: 'A sample quiz for testing' },
      headers: { session: seshId3 }
    });
    // const quizId6 = getBody(resQuiz6).quizId;

    const resQuiz7 = postReq('/v1/admin/quiz', {
      json: { name: 'Sample Quiz 7', description: 'A sample quiz for testing' },
      headers: { session: seshId3 }
    });
    const quizId7 = getBody(resQuiz7).quizId;

    // change the names of 4 quizzes belonging to different users
    const res1 = putReq(`/v1/admin/quiz/${quizId2}/name`, {
      json: { name: 'Modified Quiz 2' },
      headers: { session: seshId1 }
    });
    const res2 = putReq(`/v1/admin/quiz/${quizId3}/name`, {
      json: { name: 'Modified Quiz 3' },
      headers: { session: seshId1 }
    });
    const res3 = putReq(`/v1/admin/quiz/${quizId5}/name`, {
      json: { name: 'Modified Quiz 5' },
      headers: { session: seshId2 }
    });
    const res4 = putReq(`/v1/admin/quiz/${quizId7}/name`, {
      json: { name: 'Modified Quiz 7' },
      headers: { session: seshId3 }
    });

    // check if all 4 of them belong to the right person and have the right names

    let result = getBody(res1);
    expect(result).toStrictEqual({});
    let listRes = getReq('/v1/admin/quiz/list', {
      headers: { session: seshId1 }
    });
    const list1 = getBody(listRes);
    let foundQuiz =
    list1.quizzes.find((quiz: Quiz) => quiz.name === 'Modified Quiz 2' && quiz.quizId === quizId2);
    expect(foundQuiz).toBeDefined();

    result = getBody(res2);
    expect(result).toStrictEqual({});
    listRes = getReq('/v1/admin/quiz/list', {
      headers: { session: seshId1 }
    });
    const list2 = getBody(listRes);
    foundQuiz =
    list2.quizzes.find((quiz: Quiz) => quiz.name === 'Modified Quiz 3' && quiz.quizId === quizId3);
    expect(foundQuiz).toBeDefined();

    result = getBody(res3);
    expect(result).toStrictEqual({});
    listRes = getReq('/v1/admin/quiz/list', {
      headers: { session: seshId2 }
    });
    const list3 = getBody(listRes);
    foundQuiz =
    list3.quizzes.find((quiz: Quiz) => quiz.name === 'Modified Quiz 5' && quiz.quizId === quizId5);
    expect(foundQuiz).toBeDefined();

    result = getBody(res4);
    expect(result).toStrictEqual({});
    listRes = getReq('/v1/admin/quiz/list', {
      headers: { session: seshId3 }
    });
    const list4 = getBody(listRes);
    foundQuiz =
    list4.quizzes.find((quiz: Quiz) => quiz.name === 'Modified Quiz 7' && quiz.quizId === quizId7);
    expect(foundQuiz).toBeDefined();

    expect(res1.statusCode).toStrictEqual(200);
    expect(res2.statusCode).toStrictEqual(200);
    expect(res3.statusCode).toStrictEqual(200);
    expect(res4.statusCode).toStrictEqual(200);
  });
});

describe('Quiz names are invalid', () => {
  test.each([
    { newName: 'h!llyBill33Gragas' },
    { newName: 'rumpleSTI1ltcsk!N' },
    { newName: 'ironH4NDS2*@' },
    { newName: 'JuNG3LR(*!@&$' }
  ])("Tested $newName's as a new name, should be invalid due to illegal characters", ({
    newName
  }) => {
    // generated a session
    const seshId = getSeshId(
      postReq('/v1/admin/auth/register', {
        json: {
          email: 'funnymail@gmail.com',
          password: 'Pass12532',
          nameFirst: 'Big',
          nameLast: 'Dawg'
        }
      })
    );
    // create a quiz for this session
    const resQuiz = postReq('/v1/admin/quiz', {
      json: { name: 'Sample Quiz', description: 'A sample quiz for testing' },
      headers: { session: seshId }
    });
    const quizId = getBody(resQuiz).quizId;
    const res = putReq(`/v1/admin/quiz/${quizId}/name`, {
      json: { name: newName },
      headers: { session: seshId }
    });
    expect((getBody(res))).toStrictEqual({ error: 'Name contains invalid characters' });
    expect(res.statusCode).toStrictEqual(400);

    const listRes = getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: seshId } });
    const listResult = getBody(listRes);

    // name shouldn't have changed
    expect(listResult).toStrictEqual({
      quizId: expect.any(Number),
      name: 'Sample Quiz',
      thumbnailUrl: expect.any(String),
      timeCreated: expect.any(Number),
      timeLastEdited: expect.any(Number),
      description: 'A sample quiz for testing',
      numQuestions: 0,
      questions: [],
      timeLimit: 0
    });
  });

  test.each([
    { newName: 'KLASJDGHKLSAJDGHNKALSDJGNKASJDLGNKSALMHGKSAJDGHASLDGJH AKSDHGJ' },
    { newName: 'N' },
    { newName: ' ' },
    { newName: 'SDLFKJGSDKFGJSDLKGJlkklasdjlaksdjgkasdgjnmasdkmgnasddasgasdgjasdkg' }
  ])("Tested $newName's as a new name, should be invalid due to length constraints", ({
    newName
  }) => {
    // generated a session
    const seshId = getSeshId(
      postReq('/v1/admin/auth/register', {
        json: {
          email: 'funnymail@gmail.com',
          password: 'Pass12532',
          nameFirst: 'Big',
          nameLast: 'Dawg'
        }
      })
    );
    // create a quiz for this session
    const resQuiz = postReq('/v1/admin/quiz', {
      json: { name: 'Sample Quiz', description: 'A sample quiz for testing' },
      headers: { session: seshId }
    });
    const quizId = getBody(resQuiz).quizId;

    const res = putReq(`/v1/admin/quiz/${quizId}/name`, {
      json: { name: newName },
      headers: { session: seshId }
    });
    expect((getBody(res))).toStrictEqual({ error: 'Name length is invalid' });
    expect(res.statusCode).toStrictEqual(400);

    const listRes = getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: seshId } });
    const listResult = getBody(listRes);

    // name shouldn't have changed
    expect(listResult).toStrictEqual({
      quizId: expect.any(Number),
      name: 'Sample Quiz',
      thumbnailUrl: expect.any(String),
      timeCreated: expect.any(Number),
      timeLastEdited: expect.any(Number),
      description: 'A sample quiz for testing',
      numQuestions: 0,
      questions: [],
      timeLimit: 0
    });
  });

  test(' Tests changing name to the already existing name', () => {
    // generated a session
    const seshId = getSeshId(
      postReq('/v1/admin/auth/register', {
        json: {
          email: 'funnymail@gmail.com',
          password: 'Pass12532',
          nameFirst: 'Big',
          nameLast: 'Dawg'
        }
      })
    );

    // create a quiz for this session
    const resQuiz = postReq('/v1/admin/quiz', {
      json: { name: 'Sample Quiz', description: 'A sample quiz for testing' },
      headers: { session: seshId }
    });
    const quizId = getBody(resQuiz).quizId;

    const res = putReq(`/v1/admin/quiz/${quizId}/name`, {
      json: { name: 'Sample Quiz' },
      headers: { session: seshId }
    });
    expect((getBody(res))).toStrictEqual({ error: 'Name is already being used by this user' });
    expect(res.statusCode).toStrictEqual(400);

    const listRes = getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: seshId } });
    const listResult = getBody(listRes);

    // name shouldn't have changed
    expect(listResult).toStrictEqual({
      quizId: expect.any(Number),
      name: 'Sample Quiz',
      thumbnailUrl: expect.any(String),
      timeCreated: expect.any(Number),
      timeLastEdited: expect.any(Number),
      description: 'A sample quiz for testing',
      numQuestions: 0,
      questions: [],
      timeLimit: 0
    });
  });
});

describe(' QuizId or sessionId are false', () => {
  test('QuizId doesnt exist', () => {
    // generated a session
    const seshId = getSeshId(
      postReq('/v1/admin/auth/register', {
        json: {
          email: 'funnymail@gmail.com',
          password: 'Pass12532',
          nameFirst: 'Big',
          nameLast: 'Dawg'
        }
      })
    );
    // create a quiz for this session
    const resQuiz = postReq('/v1/admin/quiz', {
      json: { name: 'Sample Quiz', description: 'A sample quiz for testing' },
      headers: { session: seshId }
    });
    const quizId = getBody(resQuiz).quizId;
    const wrongQuizId = (+quizId + 1).toString();
    const res = putReq(`/v1/admin/quiz/${wrongQuizId}/name`, {
      json: { name: 'new name' },
      headers: { session: seshId }
    });
    expect((getBody(res))).toStrictEqual({ error: 'quizId does not exist!' });
    expect(res.statusCode).toStrictEqual(403);
    const listRes = getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: seshId } });
    const listResult = getBody(listRes);

    // name shouldn't have changed
    expect(listResult).toStrictEqual({
      quizId: expect.any(Number),
      name: 'Sample Quiz',
      thumbnailUrl: expect.any(String),
      timeCreated: expect.any(Number),
      timeLastEdited: expect.any(Number),
      description: 'A sample quiz for testing',
      numQuestions: 0,
      questions: [],
      timeLimit: 0
    });
  });
  test('sessionId doesnt exist', () => {
    // generated a session
    const seshId = getSeshId(
      postReq('/v1/admin/auth/register', {
        json: {
          email: 'funnymail@gmail.com',
          password: 'Pass12532',
          nameFirst: 'Big',
          nameLast: 'Dawg'
        }
      })
    );
    // create a quiz for this session
    const resQuiz = postReq('/v1/admin/quiz', {
      json: { name: 'Sample Quiz', description: 'A sample quiz for testing' },
      headers: { session: seshId }
    });
    const quizId = getBody(resQuiz).quizId;
    const wrongSeshId = (+seshId + 1).toString();
    const res = putReq(`/v1/admin/quiz/${quizId}/name`, {
      json: { name: 'new name' },
      headers: { session: wrongSeshId }
    });
    expect((getBody(res))).toStrictEqual({ error: 'seshId does not exist!' });
    expect(res.statusCode).toStrictEqual(401);
    const listRes = getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: seshId } });
    const listResult = getBody(listRes);

    // name shouldn't have changed
    expect(listResult).toStrictEqual({
      quizId: expect.any(Number),
      name: 'Sample Quiz',
      thumbnailUrl: expect.any(String),
      timeCreated: expect.any(Number),
      timeLastEdited: expect.any(Number),
      description: 'A sample quiz for testing',
      numQuestions: 0,
      questions: [],
      timeLimit: 0
    });
  });
  test('sessionId isnt provided', () => {
    // generated a session
    const seshId = getSeshId(
      postReq('/v1/admin/auth/register', {
        json: {
          email: 'funnymail@gmail.com',
          password: 'Pass12532',
          nameFirst: 'Big',
          nameLast: 'Dawg'
        }
      })
    );
    // create a quiz for this session
    const resQuiz = postReq('/v1/admin/quiz', {
      json: { name: 'Sample Quiz', description: 'A sample quiz for testing' },
      headers: { session: seshId }
    });
    const quizId = getBody(resQuiz).quizId;
    const res = putReq(`/v1/admin/quiz/${quizId}/name`, {
      json: { name: 'new name' },

    });
    expect((getBody(res))).toStrictEqual({ error: 'seshId is empty' });
    expect(res.statusCode).toStrictEqual(401);
    const listRes = getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: seshId } });
    const listResult = getBody(listRes);

    // name shouldn't have changed
    expect(listResult).toStrictEqual({
      quizId: expect.any(Number),
      name: 'Sample Quiz',
      thumbnailUrl: expect.any(String),
      timeCreated: expect.any(Number),
      timeLastEdited: expect.any(Number),
      description: 'A sample quiz for testing',
      numQuestions: 0,
      questions: [],
      timeLimit: 0
    });
  });
});
