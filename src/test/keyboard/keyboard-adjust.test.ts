import { describe, expect, it } from "vitest";
import { calculateKeyboardState } from "@/hooks/useKeyboardAdjust";

describe("calculateKeyboardState", () => {
  it("detects a keyboard from the focused input and visual viewport", () => {
    expect(
      calculateKeyboardState({
        layoutHeight: 844,
        visualHeight: 510,
        offsetTop: 0,
        hasFocusedInput: true,
        wasVisible: false,
      }),
    ).toEqual({
      isVisible: true,
      keyboardHeight: 334,
      viewportHeight: 510,
      viewportOffsetTop: 0,
    });
  });

  it("ignores small browser chrome viewport changes", () => {
    expect(
      calculateKeyboardState({
        layoutHeight: 844,
        visualHeight: 790,
        offsetTop: 0,
        hasFocusedInput: true,
        wasVisible: false,
      }).isVisible,
    ).toBe(false);
  });

  it("keeps the keyboard state through the blur frame until the viewport restores", () => {
    expect(
      calculateKeyboardState({
        layoutHeight: 844,
        visualHeight: 510,
        offsetTop: 0,
        hasFocusedInput: false,
        wasVisible: true,
      }).keyboardHeight,
    ).toBe(334);
  });

  it("clears keyboard state when the visual viewport returns", () => {
    expect(
      calculateKeyboardState({
        layoutHeight: 844,
        visualHeight: 844,
        offsetTop: 0,
        hasFocusedInput: false,
        wasVisible: true,
      }).isVisible,
    ).toBe(false);
  });
});