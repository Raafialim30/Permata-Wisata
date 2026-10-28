import { render, screen } from "@testing-library/react";
import App from "./App";

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => [],
  });
});

test("renders the home page", () => {
  render(<App />);
  expect(
    screen.getByRole("heading", { name: "Temukan Villa Impianmu" })
  ).toBeInTheDocument();
});
