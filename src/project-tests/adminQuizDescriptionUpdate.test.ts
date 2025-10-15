import { deleteReq, postReq, getSeshId, getBody, getReq, putReq } from '../helperFunctions';

beforeEach(() => {
  deleteReq('/v1/clear');
});

describe('Success Tests', () => {
  test('successfully creates a quiz with valid inputs', () => {
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
    const newDescriptionName : string = '';
    const res = putReq(`/v1/admin/quiz/${quizId}/description`, {
      json: { description: newDescriptionName },
      headers: { session: seshId }
    });

    const result = getBody(res);
    expect(result).toStrictEqual({});

    const listRes = getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: seshId } });
    const listResult = getBody(listRes);

    // description shouldn't have changed
    expect(listResult).toStrictEqual({
      quizId: expect.any(Number),
      name: 'Sample Quiz',
      thumbnailUrl: expect.any(String),
      timeCreated: expect.any(Number),
      timeLastEdited: expect.any(Number),
      description: '',
      numQuestions: 0,
      questions: [],
      timeLimit: 0
    });
    expect(res.statusCode).toStrictEqual(200);
  });

  test('successfully creates many users with many quizzes, changes many descriptions', () => {
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

    const resQuiz7 = postReq('/v1/admin/quiz', {
      json: { name: 'Sample Quiz 7', description: 'A sample quiz for testing' },
      headers: { session: seshId3 }
    });
    const quizId7 = getBody(resQuiz7).quizId;

    // change the descriptions of 4 quizzes belonging to different users
    const res1 = putReq(`/v1/admin/quiz/${quizId2}/description`, {
      json: { description: 'Modified Quiz 2' },
      headers: { session: seshId1 }
    });
    const res2 = putReq(`/v1/admin/quiz/${quizId3}/description`, {
      json: { description: 'Modified Quiz 3' },
      headers: { session: seshId1 }
    });
    const res3 = putReq(`/v1/admin/quiz/${quizId5}/description`, {
      json: { description: 'Modified Quiz 5' },
      headers: { session: seshId2 }
    });
    const res4 = putReq(`/v1/admin/quiz/${quizId7}/description`, {
      json: { description: 'Modified Quiz 7' },
      headers: { session: seshId3 }
    });

    // check if all 4 of them belong to the right person and have the right names

    let result = getBody(res1);
    expect(result).toStrictEqual({});

    let listRes = getReq(`/v1/admin/quiz/${quizId2}`, { headers: { session: seshId1 } });
    let listResult = getBody(listRes);
    // description shouldn't have changed
    expect(listResult).toStrictEqual({
      quizId: expect.any(Number),
      name: 'Sample Quiz 2',
      thumbnailUrl: expect.any(String),
      timeCreated: expect.any(Number),
      timeLastEdited: expect.any(Number),
      description: 'Modified Quiz 2',
      numQuestions: 0,
      questions: [],
      timeLimit: 0
    });

    result = getBody(res2);
    expect(result).toStrictEqual({});
    listRes = getReq('/v1/admin/quiz/list', {
      headers: { session: seshId1 }
    });

    listRes = getReq(`/v1/admin/quiz/${quizId3}`, { headers: { session: seshId1 } });
    listResult = getBody(listRes);
    // description shouldn't have changed
    expect(listResult).toStrictEqual({
      quizId: expect.any(Number),
      name: 'Sample Quiz 3',
      thumbnailUrl: expect.any(String),
      timeCreated: expect.any(Number),
      timeLastEdited: expect.any(Number),
      description: 'Modified Quiz 3',
      numQuestions: 0,
      questions: [],
      timeLimit: 0
    });

    result = getBody(res3);
    expect(result).toStrictEqual({});
    listRes = getReq('/v1/admin/quiz/list', {
      headers: { session: seshId2 }
    });

    listRes = getReq(`/v1/admin/quiz/${quizId5}`, { headers: { session: seshId2 } });
    listResult = getBody(listRes);
    // description shouldn't have changed
    expect(listResult).toStrictEqual({
      quizId: expect.any(Number),
      name: 'Sample Quiz 5',
      thumbnailUrl: expect.any(String),
      timeCreated: expect.any(Number),
      timeLastEdited: expect.any(Number),
      description: 'Modified Quiz 5',
      numQuestions: 0,
      questions: [],
      timeLimit: 0
    });

    result = getBody(res4);
    expect(result).toStrictEqual({});
    listRes = getReq('/v1/admin/quiz/list', {
      headers: { session: seshId3 }
    });

    listRes = getReq(`/v1/admin/quiz/${quizId7}`, { headers: { session: seshId3 } });
    listResult = getBody(listRes);
    // description shouldn't have changed
    expect(listResult).toStrictEqual({
      quizId: expect.any(Number),
      name: 'Sample Quiz 7',
      thumbnailUrl: expect.any(String),
      timeCreated: expect.any(Number),
      timeLastEdited: expect.any(Number),
      description: 'Modified Quiz 7',
      numQuestions: 0,
      questions: [],
      timeLimit: 0
    });

    expect(res1.statusCode).toStrictEqual(200);
    expect(res2.statusCode).toStrictEqual(200);
    expect(res3.statusCode).toStrictEqual(200);
    expect(res4.statusCode).toStrictEqual(200);
  });
});

describe('Error cases with descriptions of invalid length', () => {
  test.each([
    {
      newDescription:
      'newQUizNAmenewQUizNAmenewQUizNAmenewQUizNAmenewQUizN' +
      'AmenewQUizNAmenewQUizNAmenewQUizNAmenewQUizNAmenewQUizNAmenewQUiz' +
      'NAmenewQUizNAmenewQUizNAmenewQUizNAme'
    },
    {
      newDescription:
      'asdljgalsd;kjgl;askdjg;lasdjkg;lsakjaoisdugoiasdugas' +
      'asdljgalsd;kjgl;askdjg;lasdjkg;lsakjaoisdugoiasdugas' +
      'asdljgalsd;kjgl;askdjg;lasdjkg;lsakjaoisdugoiasdugas'
    },
    {
      newDescription:
      'ironH4NDS2*@' + 'ironH4NDS2*@' + 'ironH4NDS2*@' + 'ironH4NDS2*@' +
      'ironH4NDS2*@' + 'ironH4NDS2*@' + 'ironH4NDS2*@' + 'ironH4NDS2*@' + 'ironH4NDS2*@' +
      'ironH4NDS2*@' + 'ironH4NDS2*@' + 'ironH4NDS2*@' + 'ironH4NDS2*@' + 'ironH4NDS2*@'
    },

  ])('$newDescription has an invalid length and is not an empty description', ({
    newDescription
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
    const res = putReq(`/v1/admin/quiz/${quizId}/description`, {
      json: { description: newDescription },
      headers: { session: seshId }
    });
    expect((getBody(res))).toStrictEqual({ error: 'description length is invalid' });
    expect(res.statusCode).toStrictEqual(400);

    const listRes = getReq(`/v1/admin/quiz/${quizId}`, { headers: { session: seshId } });
    const listResult = getBody(listRes);

    // description shouldn't have changed
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
    const res = putReq(`/v1/admin/quiz/${wrongQuizId}/description`, {
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
    const res = putReq(`/v1/admin/quiz/${quizId}/description`, {
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
    const res = putReq(`/v1/admin/quiz/${quizId}/description`, {
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
