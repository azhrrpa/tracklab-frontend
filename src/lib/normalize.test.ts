import { describe, expect, it } from "vitest";
import { camelizeKeys, extractItem, extractList, extractMessage, extractTotal } from "@/lib/normalize";

describe("camelizeKeys", () => {
  it("converts snake_case keys at every level", () => {
    expect(camelizeKeys({ tracker_code: "A", nested_list: [{ parent_code: "B" }] })).toEqual({
      trackerCode: "A",
      nestedList: [{ parentCode: "B" }],
    });
  });
});

describe("extractList", () => {
  it("reads the array from the API envelope { data, success, message, code }", () => {
    const body = { data: [{ id: "1", code: "REQ-CREATE" }], success: true, message: "OK", code: 200 };
    expect(extractList(body)).toEqual([{ id: "1", code: "REQ-CREATE" }]);
  });

  it("finds arrays nested one level deeper", () => {
    expect(extractList({ data: { items: [{ id: "1" }] } })).toEqual([{ id: "1" }]);
  });

  it("accepts a bare array and returns [] for anything else", () => {
    expect(extractList([{ id: "1" }])).toHaveLength(1);
    expect(extractList(null)).toEqual([]);
    expect(extractList({ data: null })).toEqual([]);
  });
});

describe("extractTotal", () => {
  it("prefers the paging header", () => {
    const headers = new Headers({ "X-Paging-TotalCount": "42" });
    expect(extractTotal({ data: [], total: 7 }, headers)).toBe(42);
  });

  it("falls back to common body fields, including nested paging objects", () => {
    expect(extractTotal({ data: [], totalData: 18 })).toBe(18);
    expect(extractTotal({ data: [], paging: { total_count: "5" } })).toBe(5);
  });

  it("returns null when the total is unknown", () => {
    expect(extractTotal({ data: [] }, new Headers())).toBeNull();
  });
});

describe("extractItem / extractMessage", () => {
  it("unwraps a single record", () => {
    expect(extractItem({ data: { id: "1", last_status: "OK" } })).toEqual({ id: "1", lastStatus: "OK" });
  });

  it("reads the message when present", () => {
    expect(extractMessage({ message: "Data created" })).toBe("Data created");
    expect(extractMessage({ message: "" })).toBeNull();
  });
});
