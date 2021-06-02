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
