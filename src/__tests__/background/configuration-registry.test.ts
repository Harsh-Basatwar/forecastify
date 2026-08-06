import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { configurationRegistry } from "../../lib/background/config";

describe("ConfigurationRegistry", () => {
  test("should get and set dynamic runtime configuration settings", () => {
    configurationRegistry.set("TEST_FEATURE_FLAG", true, "FEATURE_FLAGS", "Test flag");
    const val = configurationRegistry.get("TEST_FEATURE_FLAG");
    assert.equal(val, true);
  });
});
