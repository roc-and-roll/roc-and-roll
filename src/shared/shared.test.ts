test("NODE_ENV is set correctly", () => {
  expect(process.env.NODE_ENV).toBe("test");
});
