import { createSign } from "node:crypto";
import { connect } from "node:http2";

interface ApnsAlert {
  title: string;
  body: string;
  path?: string;
}

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

export function createApnsProviderToken(keyId: string, teamId: string, privateKey: string): string {
  const header = base64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const claims = base64url(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }));
  const unsigned = `${header}.${claims}`;
  const signature = createSign("SHA256")
    .update(unsigned)
    .end()
    // APNs provider JWTs require the JOSE/P1363 R || S representation, not
    // OpenSSL's default ASN.1 DER encoding.
    .sign({
      key: privateKey.replace(/\\n/g, "\n"),
      dsaEncoding: "ieee-p1363",
    })
    .toString("base64url");
  return `${unsigned}.${signature}`;
}

export function apnsConfigured(): boolean {
  return Boolean(
    process.env.APNS_KEY_ID
    && process.env.APNS_TEAM_ID
    && process.env.APNS_PRIVATE_KEY
    && process.env.APNS_BUNDLE_ID
  );
}

export async function sendApnsAlert(deviceToken: string, alert: ApnsAlert): Promise<void> {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY;
  const bundleId = process.env.APNS_BUNDLE_ID;
  if (!keyId || !teamId || !privateKey || !bundleId) throw new Error("apns-not-configured");

  const host = process.env.APNS_PRODUCTION === "true"
    ? "https://api.push.apple.com"
    : "https://api.sandbox.push.apple.com";
  const client = connect(host);

  await new Promise<void>((resolve, reject) => {
    client.once("error", reject);
    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${createApnsProviderToken(keyId, teamId, privateKey)}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
    });

    let responseBody = "";
    let status = 0;
    request.setEncoding("utf8");
    request.on("response", (headers) => {
      status = Number(headers[":status"] ?? 0);
    });
    request.on("data", (chunk) => { responseBody += chunk; });
    request.on("error", reject);
    request.on("end", () => {
      if (status === 200) resolve();
      else reject(new Error(`apns-${status}:${responseBody.slice(0, 200)}`));
    });
    request.end(JSON.stringify({
      aps: { alert: { title: alert.title, body: alert.body }, sound: "default" },
      ...(alert.path ? { path: alert.path } : {}),
    }));
  }).finally(() => client.close());
}
