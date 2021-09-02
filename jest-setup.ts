// https://github.com/testing-library/jest-dom#usage
import "@testing-library/jest-dom";
import "@testing-library/jest-dom/extend-expect";

beforeEach(() => {
  jest.useFakeTimers("modern");
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// Suppress the "ReactDOM.render is no longer supported in React 18" warning.
// This is caused because @testing-library/react does not yet support React 18's
// concurrent mode.
// TODO: Remove when we update @testing-library/react.
beforeAll(() => {
  const originalError = console.error;

  jest.spyOn(console, "error").mockImplementation((...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].startsWith(
        "Warning: ReactDOM.render is no longer supported in React 18"
      )
    ) {
      return;
    }
    return originalError.call(console, args);
  });
});

afterAll(() => {
  // @ts-expect-error TS does not know about the mock.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  console.error.mockRestore();
});
