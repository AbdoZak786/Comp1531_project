import { adminAuthRegister, adminUserDetailsUpdate } from '../auth';
import { clear } from '../other';
import { postReq, putReq, deleteReq, getBody } from '../helperFunctions';
import * as data from '../dataStore';

beforeEach(() => {
  deleteReq('/v1/clear');
});

describe('PUT /v1/admin/user/details', () => {
  let sessionId: string;
  let userId: number;
  const testUser = {
    email: 'test@example.com',
    password: 'TestPass123',
    nameFirst: 'Test',
    nameLast: 'User',
  };

  beforeEach(() => {
    clear();
    const registerRes = postReq('/v1/admin/auth/register', { json: testUser });
    const body = getBody(registerRes);
    sessionId = body.session;
    userId = body.userId;
  });

  describe('Successful updates', () => {
    test('Successfully update all fields', () => {
      const updatedDetails = {
        email: 'updated@example.com',
        nameFirst: 'Updated',
        nameLast: 'Name'
      };

      const res = putReq('/v1/admin/user/details', {
        headers: {
          'Content-Type': 'application/json',
          session: sessionId
        },
        json: updatedDetails
      });

      expect(res.statusCode).toBe(200);
      expect(getBody(res)).toEqual({
        message: 'User details updated successfully'
      });
    });
  });

  describe('Error cases', () => {
    test('Missing required fields', () => {
      const res = putReq('/v1/admin/user/details', {
        headers: { session: sessionId },
        json: { email: 'new@example.com', nameFirst: 'New' }
      });

      expect(res.statusCode).toBe(400);
      expect(getBody(res)).toEqual({ error: 'Missing required fields' });
    });

    test('Email already in use', () => {
      const secondUser = {
        email: 'second@example.com',
        password: 'SecondPass123',
        nameFirst: 'Second',
        nameLast: 'User'
      };
      postReq('/v1/admin/auth/register', { json: secondUser });

      const res = putReq('/v1/admin/user/details', {
        headers: { session: sessionId },
        json: { email: 'second@example.com', nameFirst: 'New', nameLast: 'Name' }
      });

      expect(res.statusCode).toBe(400);
      expect(getBody(res)).toEqual({
        error: 'Email is currently used by another user (excluding the current authorised user)'
      });
    });

    test('Invalid email format', () => {
      const res = putReq('/v1/admin/user/details', {
        headers: { session: sessionId },
        json: { email: 'invalid-email', nameFirst: 'New', nameLast: 'Name' }
      });

      expect(res.statusCode).toBe(400);
      expect(getBody(res)).toHaveProperty('error');
    });

    test('Invalid name characters', () => {
      const res = putReq('/v1/admin/user/details', {
        headers: { session: sessionId },
        json: { email: 'valid@example.com', nameFirst: 'Invalid@Name', nameLast: 'Name' }
      });

      expect(res.statusCode).toBe(400);
      expect(getBody(res)).toHaveProperty('error');
    });
  });

  describe('adminUserDetailsUpdate', () => {
    let email: string;
    let password: string;
    let nameFirst: string;
    let nameLast: string;

    beforeEach(() => {
      clear();
      email = 'user@gmail.com';
      password = 'Password123';
      nameFirst = 'Fernando';
      nameLast = 'Djingga';

      adminAuthRegister(email, password, nameFirst, nameLast);
      const users = data.getUserData();
      const user = users.find((u) => u.email === email);

      if (!user) {
        throw new Error('User not found after registration');
      }
      userId = user.userId;
    });

    test('Initialization test', () => {
      expect(userId).toBeDefined();
    });

    describe('Valid input cases', () => {
      test('Update with email + nameFirst + nameLast with special characters and valid lengths',
        () => {
          const cases = [
            ['new@email.com', 'Jean-Luc', "O'Neill"],
            ['user123@example.com', 'First', 'Last'],
            ['user.name+tag@example.com', 'First', 'Last'],
            ['user@subdomain.example.com', 'First', 'Last'],
            ['user@domain-name.com', 'First', 'Last'],
            ['user@123domain.com', 'First', 'Last'],
            ['user@x.com', 'First', 'Last'],
            ['a'.repeat(64) + '@example.com', 'First', 'Last'],
            ['user@' + 'a'.repeat(63) + '.com', 'First', 'Last'],
          ];

          for (const [email, first, last] of cases) {
            expect(() => {
              adminUserDetailsUpdate(userId, email, first, last);
            }).not.toThrow();
          }
        });
    });

    describe('Invalid input cases', () => {
      test('Email already in use', () => {
        adminAuthRegister('second@example.com', 'Password123', 'Second', 'User');
        expect(() => {
          adminUserDetailsUpdate(userId, 'second@example.com', 'First', 'Last');
        }).toThrow(
          'Email is currently used by another user (excluding the current authorised user)'
        );
      });

      test('Invalid email formats', () => {
        const invalidEmails = ['invalid-email', 'user.@example.com', 'user@'];
        for (const email of invalidEmails) {
          expect(() => {
            adminUserDetailsUpdate(userId, email, 'First', 'Last');
          }).toThrow();
        }
      });

      test('Invalid name lengths and characters', () => {
        const cases = [
          ['A', 'Last', 'NameFirst must be between 2-20 characters'],
          ['First', 'B', 'NameLast must be between 2-20 characters'],
          ['A'.repeat(21), 'Last', 'NameFirst must be between 2-20 characters'],
          ['First', 'B'.repeat(21), 'NameLast must be between 2-20 characters'],
          ['Invalid@Name', 'Last', 'NameFirst contains invalid characters'],
          ['First', 'Invalid@Name', 'NameLast contains invalid characters'],
        ];

        for (const [first, last, msg] of cases) {
          expect(() => {
            adminUserDetailsUpdate(userId, 'updated@example.com', first, last);
          }).toThrow(msg);
        }
      });

      test('Missing fields', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, '', 'First', 'Last');
        }).toThrow('Missing required fields');
        expect(() => {
          adminUserDetailsUpdate(userId, 'test@example.com', '', 'Last');
        }).toThrow('Missing required fields');
        expect(() => {
          adminUserDetailsUpdate(userId, 'test@example.com', 'First', '');
        }).toThrow('Missing required fields');
      });
    });
  });

  describe('Additional Tests for adminUserDetailsUpdate', () => {
    beforeEach(() => {
      clear();
      adminAuthRegister('user@gmail.com', 'Password123', 'Fernando', 'Djingga');
      const users = data.getUserData();
      const user = users.find((u) => u.email === 'user@gmail.com');
      if (!user) {
        throw new Error('User not found after registration');
      }
      userId = user.userId;
    });

    describe('Valid input cases', () => {
      test('Update with valid email containing dots in local part', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'user.name@example.com', 'First', 'Last');
        }).not.toThrow();
      });

      test('Update with valid email containing plus sign in local part', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'user+tag@example.com', 'First', 'Last');
        }).not.toThrow();
      });

      test('Update with valid email containing hyphen in domain', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'user@domain-name.com', 'First', 'Last');
        }).not.toThrow();
      });

      test('Update with valid email containing numbers in domain', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'user@123domain.com', 'First', 'Last');
        }).not.toThrow();
      });

      test('Update with valid email containing subdomains', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'user@mail.subdomain.com', 'First', 'Last');
        }).not.toThrow();
      });

      test('Update with valid nameFirst containing spaces', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'updated@example.com', 'Jean Luc', 'Last');
        }).not.toThrow();
      });

      test('Update with valid nameLast containing apostrophes', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'updated@example.com', 'First', "O'Connor");
        }).not.toThrow();
      });

      test('Update with valid nameFirst containing hyphens', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'updated@example.com', 'Jean-Luc', 'Last');
        }).not.toThrow();
      });

      test('Update with valid nameLast containing spaces', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'updated@example.com', 'First', 'Van Der Meer');
        }).not.toThrow();
      });

      test('Update with valid email containing uppercase letters', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'USER@EXAMPLE.COM', 'First', 'Last');
        }).not.toThrow();
      });

      test('Update with valid email containing long local part', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'a'.repeat(64) + '@example.com', 'First', 'Last');
        }).not.toThrow();
      });

      test('Update with valid email containing long domain part', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'user@' + 'a'.repeat(63) + '.com', 'First', 'Last');
        }).not.toThrow();
      });

      test('Update with valid email containing multiple subdomains', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'user@sub.sub.example.com', 'First', 'Last');
        }).not.toThrow();
      });
    });

    describe('Invalid input cases', () => {
      test('Error when email is missing', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, '', 'First', 'Last');
        }).toThrow('Missing required fields');
      });

      test('Error when nameFirst is missing', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'updated@example.com', '', 'Last');
        }).toThrow('Missing required fields');
      });

      test('Error when nameLast is missing', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'updated@example.com', 'First', '');
        }).toThrow('Missing required fields');
      });

      test('Error when email is invalid', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'invalid-email', 'First', 'Last');
        }).toThrow(
          'Email does not satisfy validator requirements: ' +
          'https://www.npmjs.com/package/validator ' +
          '(validator.isEmail)'
        );
      });

      test('Error when email local part ends with non-alphanumeric character', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'user.@example.com', 'First', 'Last');
        }).toThrow('Email local part must end with alphanumeric character');
      });

      test('Error when email domain is missing', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'user@', 'First', 'Last');
        }).toThrow(
          'Email does not satisfy validator requirements: ' +
          'https://www.npmjs.com/package/validator ' +
          '(validator.isEmail)'
        );
      });

      test('Error when nameFirst is too short', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'updated@example.com', 'A', 'Last');
        }).toThrow('NameFirst must be between 2-20 characters');
      });

      test('Error when nameLast is too short', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'updated@example.com', 'First', 'B');
        }).toThrow('NameLast must be between 2-20 characters');
      });

      test('Error when nameFirst is too long', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'updated@example.com', 'A'.repeat(21), 'Last');
        }).toThrow('NameFirst must be between 2-20 characters');
      });

      test('Error when nameLast is too long', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'updated@example.com', 'First', 'B'.repeat(21));
        }).toThrow('NameLast must be between 2-20 characters');
      });

      test('Error when nameFirst contains invalid characters', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'updated@example.com', 'Invalid@Name', 'Last');
        }).toThrow('NameFirst contains invalid characters');
      });

      test('Error when nameLast contains invalid characters', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'updated@example.com', 'First', 'Invalid@Name');
        }).toThrow('NameLast contains invalid characters');
      });

      test('Error when email is already in use', () => {
        adminAuthRegister('second@example.com', 'Password123', 'Second', 'User');
        expect(() => {
          adminUserDetailsUpdate(userId, 'second@example.com', 'First', 'Last');
        }).toThrow(
          'Email is currently used by another user (excluding the current authorised user)'
        );
      });

      test('Error when email contains invalid characters', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'user@invalid_domain.com', 'First', 'Last');
        }).toThrow(
          'Email does not satisfy validator requirements: ' +
          'https://www.npmjs.com/package/validator ' +
          '(validator.isEmail)'
        );
      });

      test('Error when email contains consecutive dots', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'user..name@example.com', 'First', 'Last');
        }).toThrow(
          'Email does not satisfy validator requirements: ' +
          'https://www.npmjs.com/package/validator ' +
          '(validator.isEmail)'
        );
      });

      test('Error when email contains invalid domain', () => {
        expect(() => {
          adminUserDetailsUpdate(userId, 'user@.com', 'First', 'Last');
        }).toThrow(
          'Email does not satisfy validator requirements: ' +
          'https://www.npmjs.com/package/validator ' +
          '(validator.isEmail)'
        );
      });
    });
    test('Error when nameLast is missing', () => {
      expect(() => {
        adminUserDetailsUpdate(userId, 'updated@example.com', 'First', '');
      }).toThrow('Missing required fields');
    });

    // Add 17 more input validation tests for edge cases and invalid inputs.
  });
});
