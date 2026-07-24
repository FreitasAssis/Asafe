import { describe, expect, it } from "vitest";
import { projectionPlayOrder } from "../src";

/** `true` = refrão, `false` = estrofe. Retorna os índices na ordem de projeção (uma volta). */
describe("projectionPlayOrder", () => {
  it("com refrão: começa no refrão e o intercala antes de cada estrofe", () => {
    // [R, E1, E2, E3] → R, E1, R, E2, R, E3  (loop volta ao R via módulo no caller)
    expect(projectionPlayOrder([true, false, false, false])).toEqual([0, 1, 0, 2, 0, 3]);
  });

  it("refrão no meio da fonte: mesma intercalação, começando pelo refrão", () => {
    // [E1, R, E2] → R, E1, R, E2
    expect(projectionPlayOrder([false, true, false])).toEqual([1, 0, 1, 2]);
  });

  it("sem refrão: só as estrofes, em ordem (o loop fica por conta do caller)", () => {
    expect(projectionPlayOrder([false, false, false])).toEqual([0, 1, 2]);
  });

  it("só refrão (sem estrofe): fica no refrão", () => {
    expect(projectionPlayOrder([true])).toEqual([0]);
  });

  it("slide único sem refrão (ex.: leitura): fica nele", () => {
    expect(projectionPlayOrder([false])).toEqual([0]);
  });

  it("vazio: vazio", () => {
    expect(projectionPlayOrder([])).toEqual([]);
  });
});
