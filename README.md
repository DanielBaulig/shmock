# shmock
Easy testing of code calling into shell programs.

Shmock makes it easy to mock out shell programs. That way you can easily test
your code calling into these shell programs without having to actually run them.

Shmock was built and designed with Bun and Bun Shell in mind, but should work
with other JS runtimes supporting node:net and node:fs/promises, too.

NOTE: As of the time of writing, a bug in Bun prevents us from changing Bun
Shell's PATH environment variable at runtime. This means, for Shmock to find
it's shell program mocks, you will have to manually provide the location to your
bun test invocation. E.g. `PATH=.shmocks:$PATH bun test`

## Usage

```javascript
import { $ } from 'bun';
import { describe, test, mock } from 'bun:test';
import { mount, unmountAll, Console } from 'shmock';

describe('Code using shell programs', () => {
  test('my code calling a shell program', async () => {
    const progMock = await mount('prog', mock((console, ...args) => {
      if (!args.length) {
        console.error('No arguments provided');
        return 1;
      }
      console.log('You provided the following arguments to prog', args);
    }));
    expect(async () => await $`prog`.quiet().throws(true)).toThrow();
    const output = await $`prog one two`.text();
    expect(progMock).toHaveBeenCalledWith(expect.any(Console), 'one', 'two');
    expect(output.trim()).toMatch('You provided the following arguments to
prog');
  });
});

afterAll(async () => {
  // Cleanup after shmock when tests finish.
  await unmountAll();
});
```

