import { mount, unmountAll, Console } from '../src/index.ts';
import { $ } from 'bun';
import { afterAll, mock, describe, it, expect } from 'bun:test';

afterAll(async () => {
  await unmountAll();
});

describe('shmock', () => {
  it('should call the mock function when command called', async () => {
    const fooMock = await mount('foo', mock());

    await $`foo`.quiet();

    expect(fooMock).toHaveBeenCalled();
  });
  it('should pass arguments to the mock function', async () => {
    const fooMock = await mount('foo', mock());

    await $`foo one two three`.quiet();

    // The first argument is always the Console object
    expect(fooMock).toHaveBeenCalledWith(expect.any(Console), 'one', 'two', 'three');
  });
  it('should exit with returned value', async () => {
    await mount('foo', mock().mockReturnValue(1));

    expect(async () => {
      await $`foo`.throws(true);
    }).toThrow();
  });
  it("should print console.log'ed values to stdout", async () => {
    const fooMock = await mount('foo', mock((console) => {
      console.log('Hello, World!');
    }));
    expect((await $`foo`.text()).trim()).toBe('Hello, World!');
  });
});
