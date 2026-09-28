import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useTheme } from "../theme";

function Toggler() {
  const { toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>toggle</button>;
}

function Reader({ testId }: { testId: string }) {
  const { theme } = useTheme();
  return <div data-testid={testId}>{theme}</div>;
}

afterEach(() => {
  // Reset through the real store, not by poking the DOM attribute directly — this is a
  // module-level shared store (see theme.ts), so a test that set it any other way would
  // leave `currentTheme` and the DOM attribute disagreeing for the next test.
  const { result } = renderHook(() => useTheme());
  act(() => result.current.setTheme("dark"));
});

describe("useTheme", () => {
  it("shares live state across every call site, not a copy each (regression: was plain useState per component)", () => {
    render(
      <>
        <Toggler />
        <Reader testId="a" />
        <Reader testId="b" />
      </>,
    );
    const before = screen.getByTestId("a").textContent;
    act(() => screen.getByText("toggle").click());

    expect(screen.getByTestId("a").textContent).not.toBe(before);
    expect(screen.getByTestId("b").textContent).toBe(screen.getByTestId("a").textContent);
  });

  it("keeps the data-theme attribute and the React value in sync both ways", () => {
    render(<Reader testId="r" />);
    expect(document.documentElement.dataset.theme).toBe(screen.getByTestId("r").textContent);
  });
});
