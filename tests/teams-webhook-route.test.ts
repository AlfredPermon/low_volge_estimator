import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import Module from "node:module";

/**
 * Pruebas del flujo "Centro de Notificaciones → Enviar a Teams".
 * Regresión: URLs de Seguimiento/Trigger de Workflows (flowapi.microsoft.com)
 * responden 200 con un GIF 1x1 de tracking → antes se reportaba éxito falso
 * y la notificación NUNCA llegaba a Teams.
 */

// ── Mocks de módulos vía loader hook ────────────────────────────────────────
const load = (Module as any)._load as (...args: any[]) => any;
(Module as any)._load = function (request: string, ...rest: any[]) {
  if (request === "@/lib/auth") {
    return { getSessionUser: () => Promise.resolve({ name: "Tester", email: "t@x.com" }) };
  }
  if (request === "node:dns/promises") {
    return { lookup: () => Promise.resolve([{ address: "93.184.216.34", family: 4 }]) };
  }
  return load(request, ...rest);
};

// Import perezoso (una sola vez) para evitar top-level await con tsx/cjs
let POST_FN: any = null;
async function getPOST() {
  if (!POST_FN) {
    const mod = await import("@/app/api/notifications/teams/route");
    POST_FN = mod.POST;
  }
  return POST_FN;
}

function makeRequest(body: unknown) {
  const req = new Request("http://localhost:3000/api/notifications/teams", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
  // NextRequest.nextUrl no existe en un Request estándar → se simula
  req.nextUrl = new URL("http://localhost:3000/api/notifications/teams");
  return req;
}

const basePayload = {
  projectName: "Proyecto Prueba",
  clientName: "Cliente X",
  parametricDeliveryDate: "2026-11-05",
  responsibles: [{ department: "Tecnologías de Seguridad", name: "Juan", email: "j@x.com" }],
  notes: "nota de prueba",
};

let originalFetch: typeof globalThis.fetch;
beforeEach(() => {
  originalFetch = globalThis.fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("API /notifications/teams — detección de falso éxito", () => {
  it("rechaza URL de tracking de Workflow (flowapi.microsoft.com) con 422 sin hacer fetch", async () => {
    let fetchCalled = false;
    globalThis.fetch = ((..._args: any[]) => {
      fetchCalled = true;
      return Promise.resolve(new Response("", { status: 200 }));
    }) as any;

    const res = await (await getPOST())(
      makeRequest({
        ...basePayload,
        webhookUrl:
          "https://flowapi.microsoft.com/default/7e9c0b1a-1111-2222-3333-444455556666/prod/providers/Office365TeamsCustomWW/workflows/triggerTracking",
      })
    );

    assert.strictEqual(res.status, 422);
    const data = await res.json();
    assert.ok(data.error.includes("Seguimiento/Trigger"), "error debe explicar el motivo");
    assert.strictEqual(fetchCalled, false, "no debe intentarse el envío");
  });

  it("NO reporta éxito cuando el endpoint responde 200 con GIF 1x1 (pixel de tracking)", async () => {
    const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    globalThis.fetch = ((..._args: any[]) =>
      Promise.resolve(
        new Response(gif, {
          status: 200,
          headers: { "content-type": "image/gif" },
        })
      )) as any;

    const res = await (await getPOST())(
      makeRequest({
        ...basePayload,
        // URL pública válida pero que simula comportamiento de tracking
        webhookUrl: "https://example.com/tracking-endpoint?token=abc",
      })
    );

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(!data.success, "no debe marcarse como éxito");
    assert.ok(data.error.includes("No se pudo entregar"));
  });

  it("reporta éxito con Webhook legítimo (200, cuerpo vacío como Teams Connector)", async () => {
    globalThis.fetch = ((..._args: any[]) =>
      Promise.resolve(new Response("1", { status: 200 }))) as any;

    const res = await (await getPOST())(
      makeRequest({
        ...basePayload,
        webhookUrl:
          "https://fakecompany.webhook.office.com/webhookb2/11111111-2222-3333-4444-555555555555@66666666-7777-8888-9999-aaaaaaaaaaaa/IncomingWebhook/bbbbbbbb/cccccccc",
      })
    );

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.formatUsed);
  });

  it("reporta éxito con Power Automate HTTP Request (202 + JSON)", async () => {
    globalThis.fetch = ((..._args: any[]) =>
      Promise.resolve(
        new Response(JSON.stringify({ status: "accepted" }), {
          status: 202,
          headers: { "content-type": "application/json" },
        })
      )) as any;

    const res = await (await getPOST())(
      makeRequest({
        ...basePayload,
        webhookUrl:
          "https://prod-20.westus.logic.azure.com:443/workflows/11111111-2222-3333-4444-555555555555/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&md5=%2F&sig=abc&sv=1.0",
      })
    );

    // OJO: esta URL contiene /workflows/ en la ruta → es el trigger HTTP-POST
    // legítimo de Power Automate (SÍ ejecuta el flujo). Verifica que NO sea
    // bloqueada por la detección de tracking (que solo aplica a flowapi y
    // powerautomate.microsoft.com hosts de seguimiento).
    const data = await res.json();
    if (res.status === 422) {
      assert.fail(
        "El trigger HTTP-POST de Power Automate (logic.azure.com) no debe confundirse con tracking"
      );
    }
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
  });

  it("rechaza enlace web de Teams (teams.cloud.microsoft) con 422", async () => {
    const res = await (await getPOST())(
      makeRequest({ ...basePayload, webhookUrl: "https://teams.cloud.microsoft/l/chat/0/0" })
    );
    assert.strictEqual(res.status, 422);
    const data = await res.json();
    assert.strictEqual(data.isTeamsWebLink, true);
  });

  it("rechaza URL vacía con 400 requiresUrl", async () => {
    const res = await (await getPOST())(makeRequest({ ...basePayload, webhookUrl: "" }));
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.requiresUrl, true);
  });
});
