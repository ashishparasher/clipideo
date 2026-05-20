import { describe, expect, it } from "vitest";
import { parseHighlightWords, tokenizeTitle } from "./title";

describe("title highlighting", () => {
  it("parses comma separated highlight words", () => {
    expect(parseHighlightWords("Funniest, Dog,  ")).toEqual(["funniest", "dog"]);
  });

  it("marks matching title tokens", () => {
    const tokens = tokenizeTitle("Ranking Funniest Dog Moments", "Funniest,Dog");
    expect(tokens.filter((token) => token.highlighted).map((token) => token.text)).toEqual(["Funniest", "Dog"]);
  });
});
