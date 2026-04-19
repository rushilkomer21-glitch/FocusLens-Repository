import { render, screen } from "@testing-library/react";
import { App } from "./App";

vi.mock("./lib/supabase", () => ({
  hasSupabaseConfig: false,
  supabase: null,
}));

describe("App", () => {
  it("renders the auth guidance when Supabase is not configured", () => {
    render(<App />);
    expect(
      screen.getByText(/add supabase environment variables to enable authentication/i),
    ).toBeInTheDocument();
  });
});
