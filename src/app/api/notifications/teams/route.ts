import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      webhookUrl: providedWebhookUrl,
      projectName,
      clientName,
      parametricDeliveryDate,
      responsibles,
      notes,
      senderName,
    } = body;

    const webhookUrl = (providedWebhookUrl || process.env.TEAMS_WEBHOOK_URL || '').trim();

    if (!webhookUrl) {
      return NextResponse.json(
        {
          error:
            'No se ha especificado una URL de Webhook de Microsoft Teams. Ingresa la URL del Webhook o utiliza la opción "Abrir Chat Teams".',
          requiresUrl: true,
        },
        { status: 400 }
      );
    }

    // ── Detección inteligente de enlaces Web de Teams (ej. https://teams.cloud.microsoft/) ──
    const isTeamsWebLink =
      webhookUrl.includes('teams.cloud.microsoft') ||
      webhookUrl.includes('teams.microsoft.com/l/') ||
      webhookUrl.includes('teams.microsoft.com/_#/');

    if (isTeamsWebLink) {
      return NextResponse.json(
        {
          error:
            'Ingresaste el enlace web de la aplicación Teams (https://teams.cloud.microsoft). Para envíos automáticos por API se requiere una URL de Webhook (o flujo Power Automate). Se te redirigirá a Teams con el mensaje preparado.',
          isTeamsWebLink: true,
        },
        { status: 422 }
      );
    }

    if (!webhookUrl.startsWith('http://') && !webhookUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: 'La URL de Webhook ingresada no es válida. Debe iniciar con http:// o https://' },
        { status: 400 }
      );
    }

    const formattedDate = parametricDeliveryDate
      ? new Date(
          parametricDeliveryDate + (parametricDeliveryDate.includes('T') ? '' : 'T12:00:00')
        ).toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'No definida';

    const sender = senderName || user.name || user.email || 'Low-Voltage Estimator';

    // ── Formato 1: Payload con Attachment Adaptive Card v1.4 (Estándar Teams) ─────
    const adaptiveCardContent = {
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'Container',
          style: 'accent',
          items: [
            {
              type: 'TextBlock',
              size: 'Medium',
              weight: 'Bolder',
              text: '📅 Registro de Fecha de Entrega Paramétricos',
              color: 'Light',
            },
            {
              type: 'TextBlock',
              text: 'Low-Voltage Estimator • Alerta de Proyecto',
              isSubtle: true,
              size: 'Small',
              color: 'Light',
            },
          ],
        },
        {
          type: 'Container',
          items: [
            {
              type: 'FactSet',
              facts: [
                { title: 'Proyecto:', value: projectName || 'Sin nombre' },
                { title: 'Cliente:', value: clientName || 'N/A' },
                { title: 'Entrega Paramétricos:', value: formattedDate },
                { title: 'Notificado por:', value: sender },
              ],
            },
          ],
        },
        {
          type: 'TextBlock',
          text: '👥 Responsables por Departamento',
          weight: 'Bolder',
          size: 'Small',
          spacing: 'Medium',
        },
        {
          type: 'Container',
          items:
            responsibles && Array.isArray(responsibles) && responsibles.length > 0
              ? responsibles.map((r: { department: string; name: string; email: string }) => ({
                  type: 'ColumnSet',
                  columns: [
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        {
                          type: 'TextBlock',
                          text: `**${r.department}:** ${r.name || 'Sin asignar'}`,
                          wrap: true,
                          size: 'Small',
                        },
                        {
                          type: 'TextBlock',
                          text: r.email ? `✉ [${r.email}](mailto:${r.email})` : '⚠️ Sin correo registrado',
                          isSubtle: true,
                          size: 'Small',
                        },
                      ],
                    },
                  ],
                }))
              : [
                  {
                    type: 'TextBlock',
                    text: 'No se han especificado responsables.',
                    isSubtle: true,
                    size: 'Small',
                  },
                ],
        },
        ...(notes
          ? [
              {
                type: 'TextBlock',
                text: `💬 **Observaciones:** ${notes}`,
                wrap: true,
                spacing: 'Medium',
                size: 'Small',
              },
            ]
          : []),
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: '📌 Abrir Low-Voltage Estimator',
          url: request.nextUrl.origin || 'http://localhost:3000',
        },
      ],
    };

    const payloadFormat1 = {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          contentUrl: null,
          content: adaptiveCardContent,
        },
      ],
    };

    // ── Formato 2: Raw Adaptive Card v1.4 (para Power Automate Teams Workflows) ─
    const payloadFormat2 = adaptiveCardContent;

    // ── Formato 3: Office 365 MessageCard Legacy (Soportado por TODOS los conectores Teams)
    const respListMarkdown =
      responsibles && Array.isArray(responsibles) && responsibles.length > 0
        ? responsibles
            .map((r: { department: string; name: string; email: string }) =>
              `* **${r.department}:** ${r.name || 'Sin asignar'}${r.email ? ` (${r.email})` : ''}`
            )
            .join('\n')
        : 'Sin responsables especificados';

    const payloadFormat3 = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: '464EB8',
      summary: `Notificación de Proyecto: ${projectName || 'Sin nombre'}`,
      title: '📅 Registro de Fecha de Entrega Paramétricos',
      sections: [
        {
          activityTitle: projectName || 'Sin nombre',
          activitySubtitle: `Cliente: ${clientName || 'N/A'} • Notificado por: ${sender}`,
          facts: [
            { name: 'Entrega Paramétricos:', value: formattedDate },
            { name: 'Proyecto:', value: projectName || 'Sin nombre' },
            { name: 'Cliente:', value: clientName || 'N/A' },
          ],
          markdown: true,
        },
        {
          title: '👥 Responsables por Departamento',
          text: respListMarkdown,
          markdown: true,
        },
        ...(notes
          ? [
              {
                title: '💬 Observaciones',
                text: notes,
                markdown: true,
              },
            ]
          : []),
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: '📌 Abrir Low-Voltage Estimator',
          targets: [{ os: 'default', uri: request.nextUrl.origin || 'http://localhost:3000' }],
        },
      ],
    };

    // ── Intentar envío en cascada para máxima compatibilidad con conectores Teams ─
    const formatsToTry = [
      { name: 'AdaptiveCard (Message Wrapper)', payload: payloadFormat1 },
      { name: 'AdaptiveCard (Raw JSON)', payload: payloadFormat2 },
      { name: 'MessageCard (Legacy / Connector Format)', payload: payloadFormat3 },
    ];

    let lastError = '';

    for (const fmt of formatsToTry) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fmt.payload),
        });

        if (response.ok) {
          return NextResponse.json({
            success: true,
            formatUsed: fmt.name,
            message: `Notificación enviada con éxito a Microsoft Teams usando ${fmt.name}`,
          });
        }

        const errText = await response.text();
        lastError = `Teams API status ${response.status}: ${errText || response.statusText}`;
        console.warn(`Teams Webhook attempt with ${fmt.name} returned status ${response.status}. Trying next format...`);
      } catch (err: any) {
        lastError = err.message || 'Error de red al conectar con Teams Webhook';
      }
    }

    return NextResponse.json(
      {
        error: `No se pudo entregar la notificación a Microsoft Teams. Asegúrate de usar una URL de Webhook de conector o Workflow. Detalle: ${lastError}`,
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error dispatching Teams notification:', error);
    return NextResponse.json(
      { error: `Falló el envío de notificación Teams: ${error?.message || 'Error interno'}` },
      { status: 500 }
    );
  }
}
