import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createApnsProviderToken } from "./apns";

describe("createApnsProviderToken", () => {
  it("creates an ES256 JWT with the raw 64-byte signature APNs expects", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
    });
    const token = createApnsProviderToken(
      "KEY123",
      "TEAM123",
      privateKey.export({ type: "pkcs8", format: "pem" }).toString()
    );
    const [header, payload, signature] = token.split(".");
    const rawSignature = Buffer.from(signature, "base64url");

    expect(JSON.parse(Buffer.from(header, "base64url").toString())).toMatchObject({
      alg: "ES256",
      kid: "KEY123",
    });
    expect(JSON.parse(Buffer.from(payload, "base64url").toString())).toMatchObject({
      iss: "TEAM123",
    });
    expect(rawSignature).toHaveLength(64);
    expect(
      createVerify("SHA256")
        .update(`${header}.${payload}`)
        .end()
        .verify({ key: publicKey, dsaEncoding: "ieee-p1363" }, rawSignature)
    ).toBe(true);
  });
});
