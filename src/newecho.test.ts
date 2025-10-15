// Do not delete this file
import request from 'sync-request-curl';
import config from './config.json';

const port = config.port;
const url = config.url;

describe('HTTP tests using Jest', () => {
  test('Test successful echo', () => {
    const res = request(
      'GET',
      `${url}:${port}/echo`,
      {
        qs: {
          echo: 'Hello',
        },
        // adding a timeout will help you spot when your server hangs
        // timeout: 100
        // yif - Timeout time is set too short, curl requests sometimes fail
        timeout: 5000 // yif - new modified Timeout time.
      }
    );
    const bodyObj = JSON.parse(res.body as string);
    expect(bodyObj.value).toEqual('Hello');
  });

  test('Test invalid echo', () => {
    const res = request(
      'GET',
      `${url}:${port}/echo`,
      {
        qs: {
          echo: 'echo',
        },
        // adding a timeout will help you spot when your server hangs
        // timeout: 100
        // yif - Timeout time is set too short, curl requests sometimes fail
        timeout: 5000 // yif - new modified Timeout time.
      }
    );
    expect(res.statusCode).toStrictEqual(400);
  });
});
