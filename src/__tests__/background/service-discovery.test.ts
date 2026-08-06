import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { serviceDiscovery } from "../../lib/background/discovery";

describe("ServiceDiscovery", () => {
  test("should return registered platform services", () => {
    const services = serviceDiscovery.getServices();
    assert.ok(services.length > 0);
    assert.ok(services[0].capabilities);
  });
});
