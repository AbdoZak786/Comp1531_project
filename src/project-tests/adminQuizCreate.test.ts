// import { clear } from '../other';
// import { adminQuizCreate } from '../quiz';
// import { adminAuthRegister } from '../auth';

import { deleteReq, postReq, getSeshId, getBody } from '../helperFunctions';
import { isErrorObjectType } from '../types';

// A list of fake users to create a database from
const newUsers: Array<{
  email: string;
  password: string;
  nameFirst: string;
  nameLast: string;
}> = [
  {
    email: 'z1942032@ad.unsw.edu.au',
    password: 'newPassword01',
    nameFirst: 'Chuck',
    nameLast: 'Norris'
  },
  {
    email: 'z6942043@ad.unsw.edu.au',
    password: 'qwerty789',
    nameFirst: 'Brock',
    nameLast: 'Lesnar'
  },
  {
    email: 'z3942034@ad.unsw.edu.au',
    password: 'securePass1',
    nameFirst: 'Alf',
    nameLast: 'Stewart'
  },
  {
    email: 'z7942445@ad.unsw.edu.au',
    password: 'abc1234xyz',
    nameFirst: 'Mickey',
    nameLast: 'Mouse'
  }
];

const validQuizData: Array<[string, string]> = [
  ['Empty Quiz', ''],
  ['Test Quiz', 'This is a test quiz!'],
  ['Compsci1521', 'A quiz on the finals materials of comp1521!'],
  ['3lq', 'A quiz with exactly three letters in the name.'],
  ['Has exactly 30 characters init', 'What it says on the tin.'],
  ['Math2521 Finals Quiz', 'Name contains both alphabetic and numeric characters!']
];

beforeEach(() => {
  // DataStore must be cleared at start of each test
  deleteReq('/v1/clear');
});

describe('adminQuizCreate success testing', () => {
  let seshId: string;
  beforeEach(() => {
    // POST /v1/admin/auth/register registers test user and returns sessionId
    const tempSeshId = getSeshId(
      postReq('/v1/admin/auth/register', { json: newUsers[0] })
    );
    if (isErrorObjectType(tempSeshId)) {
      throw new Error('Failed to register user: ' + tempSeshId.error);
    }
    seshId = tempSeshId;
  });
  test.each(validQuizData)('%s returns an integer', (quizName, quizDescription) => {
    const res = postReq('/v1/admin/quiz', {
      json: { name: quizName, description: quizDescription },
      headers: { session: seshId }
    });
    const body = getBody(res);
    expect(Number.isInteger(body.quizId)).toBe(true);
    expect(res.statusCode).toBe(200);
  });
});
describe('adminQuizCreate error testing', () => {
  let seshId: string;
  beforeEach(() => {
    const tempSeshId = getSeshId(
      postReq('/v1/admin/auth/register', { json: newUsers[0] })
    );
    if (isErrorObjectType(tempSeshId)) {
      throw new Error('Failed to register user: ' + tempSeshId.error);
    }
    seshId = tempSeshId;
  });

  describe('adminQuizCreate returns {error: <string>} on invalid input', () => {
    test.each(
      [0.42, 59.2, Math.PI, Math.E, -Math.sqrt(2)]
    )('number = %f is given', (input: number) => {
      const res = postReq('/v1/admin/quiz', {
        json: input,
        headers: { session: seshId }
      });
      expect(() => getBody(res)).toThrow();
    });

    test('no input is given', () => {
      const res = postReq('/v1/admin/quiz', {
        headers: { session: seshId }
      });
      expect(() => getBody(res)).toThrow();
    });

    test('empty array is given', () => {
      const res = postReq('/v1/admin/quiz', {
        json: [],
        headers: { session: seshId }
      });
      expect(() => getBody(res)).toThrow();
    });

    test('empty object is given', () => {
      const res = postReq('/v1/admin/quiz', {
        json: {},
        headers: { session: seshId }
      });
      expect(() => getBody(res)).toThrow();
    });

    test('array of only ints is given', () => {
      const res = postReq('/v1/admin/quiz',
        { json: [1, 4, 1, 61, -2, -59, 0], headers: { session: seshId } });
      expect(() => getBody(res)).toThrow();
    });

    test('array of only strings is given', () => {
      const res = postReq('/v1/admin/quiz', {
        json: [
          'Test string 1',
          'Test string 2',
          'Test string 3',
          'Test string 4',
          'Test string 5',
          'Test string 6'
        ],
        headers: { session: seshId }
      });
      expect(() => getBody(res)).toThrow();
    });

    test('array of ints and strings is given', () => {
      const res = postReq('/v1/admin/quiz', {
        json: [
          'Test string 1',
          'Test string 2',
          429,
          -3,
          'Test string 3',
          0,
          'Test string 4',
          -59,
          -105,
          204
        ],
        headers: { session: seshId }
      });
      expect(() => getBody(res)).toThrow();
    });

    test('object with keys is given', () => {
      const res = postReq('/v1/admin/quiz', {
        json: { intKey: 1, stringKey: 'Testing!', boolKey: true },
        headers: { session: seshId }
      });
      expect(() => getBody(res)).toThrow();
    });
  });

  describe('invalid user', () => {
    test.each(
      [10, 42, -5, 92, 4, 1, -1]
    )('when session token "%s" is invalid', (invalidToken: number | string) => {
      const res = postReq('/v1/admin/quiz', {
        json: { name: 'Test Quiz', description: 'This is a test quiz!' },
        headers: { session: invalidToken.toString() }
      });
      expect(res.statusCode).toBe(401);
      expect(() => getBody(res)).toThrow();
    });
  });

  describe('name should not contain invalid characters', () => {
    test.each([
      '\x00\x00\x00\x00', '\x0A\x0A\x0C\x0F', '\x15\x16\x17\x18',
      '\x1F\x1E\x1D\x1C', '\x0E\x0F\x10\x11', '\x00\x0C\x17\x1F',
      '!"#$@#%(&', '!)@(*&$%@', '+_)+_)[]', '|||><><#!',
      'Hello World!', '**this is bolded**', '~/names/names.txt', 'passwords.file',
      'name: doofenshmirtz', '84 * 10 = 840', 'Math Quiz!',
      'English quiz; the best type of quiz', '2 H2O => 2 H2 + O2'
    ])('quiz name "%s" is invalid', (quizName: string) => {
      const res = postReq('/v1/admin/quiz', {
        json: { name: quizName, description: 'This is a test quiz!' },
        headers: { session: seshId }
      });
      expect(() => getBody(res)).toThrow();
    });
  });

  describe('names under three characters', () => {
    test.each([
      'as', 'af', '13', '0d', '13', 'sa', 'af', '1l', 'ss', 'vo', '1p', 'qp',
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
      'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
    ])('quiz name "%s" is too short', (quizName: string) => {
      const res = postReq('/v1/admin/quiz', {
        json: { name: quizName, description: 'This is a test quiz!' },
        headers: { session: seshId }
      });
      expect(() => getBody(res)).toThrow();
    });
  });

  describe('names greater than 30 characters', () => {
    test.each([
      'abcdefghijklmnopqrstuvwxyz01234',
      'an xsluILNUAXCBY WEWXYUCI7NWADRQX3CYTWYBAEUGKCR8TVX4',
      'swfhae4crsth8dw4niuw98jawceq4dc3un78idq4fquizNa3wr',
      '4783265r892573u9572893458276u78iyhrf',
      'esw43oy7tbvwtwy7a79ev8w7ARY03adf bgvtwer07'
    ])('quiz name "%s" is too long', (quizName: string) => {
      const res = postReq('/v1/admin/quiz', {
        json: { name: quizName, description: 'This is a test quiz!' },
        headers: { session: seshId }
      });
      expect(() => getBody(res)).toThrow();
    });
  });

  describe('duplicate quiz names', () => {
    test.each(validQuizData)('duplicating %s', (quizName: string, quizDescription: string) => {
      // Create quiz then attempt duplicate with the same name
      postReq('/v1/admin/quiz', {
        json: { name: quizName, description: quizDescription },
        headers: { session: seshId }
      });
      const res = postReq('/v1/admin/quiz', {
        json: { name: quizName, description: quizDescription },
        headers: { session: seshId }
      });
      expect(() => getBody(res)).toThrow();
    });
  });

  describe('lengthy description', () => {
    test.each([
      'The FitnessGram Pacer Test is a multistage aerobic capacity test that' +
      'progressively gets more difficult as it continues. The 20 meter pacer ' +
      'test will begin in 30 seconds. Line up at the start. The running speed ' +
      'starts slowly, but gets faster each minute after you hear this signal. ' +
      '[beep] A single lap should be completed each time you hear this sound. ' +
      '[ding] Remember to run in a straight line, and run as long as possible. ' +
      'The second time you fail to complete a lap before the sound, your test ' +
      'is over. The test will begin on the word start. ' +
      'On your mark, get ready, start.',
      'After thinking about Squidward Tentacles for four months straight, ' +
      'I somehow managed to become him. I was obsessed with Squidward to the ' +
      "point of not eating. I wouldn't even shower. I wouldn't watch movies or " +
      'play video games. I completely ignored my family. ' +
      'Squidward was all I thought about. ',
      'I (27F) just found out my husband (30M) has been pretending to be a cat ' +
      "online for THREE YEARS and I don't know what to do. " +
      "Okay, so I'm literally shaking while typing this. My husband and I have " +
      "been married for five years, together for seven. He's always been " +
      'kind of... quirky? Like he talks to our cat in full sentences but I ' +
      "thought it was just cute or whatever. Y'all. This man... " +
      'this GROWN MAN... has been running a whole-ass cat roleplay account for ' +
      'THREE YEARS. He writes in first person AS A CAT. Like, "Human forgot ' +
      'to feed me today. Vengeance will be swift. "Time to knock ' +
      'glass from high place."'
    ])('description over 100 characters returns error', (quizDescription: string) => {
      const res = postReq('/v1/admin/quiz', {
        json: { name: 'Lengthy Description', description: quizDescription },
        headers: { session: seshId }
      });
      expect(() => getBody(res)).toThrow();
    });
  });
});
