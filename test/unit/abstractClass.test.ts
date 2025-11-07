function hello(name: string): string {
    return `Hello, ${name}!`;
}

describe("hello", () => {
    it("returns the correct greeting", () => {
        expect(hello("world")).toBe("Hello, world!");
    });
});