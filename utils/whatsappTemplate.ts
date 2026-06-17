import type { WhatsAppTemplate } from '../nodes/Sinch/types';

export const MAX_WHATSAPP_TEMPLATE_VARIABLES = 20;

export type TemplateBodyVariable = {
  index: number;
  example?: string;
};

export function findBodyComponent(template: WhatsAppTemplate) {
  const components = template.details?.components || [];
  return components.find((c) => c.type === 'BODY');
}

/**
 * Body variable slots from Provisioning API template (same rules as Zapier / Workato).
 * Prefer {{N}} placeholders in body text; fall back to examples length when no placeholders.
 */
export function getTemplateBodyVariables(template: WhatsAppTemplate): TemplateBodyVariable[] {
  const body = findBodyComponent(template);
  if (!body) return [];

  const bodyText = body.text || '';
  const examples = body.examples || [];

  const indices = bodyText
    .match(/\{\{(\d+)\}\}/g)
    ?.map((m) => parseInt(m.replace(/\{\{|\}\}/g, ''), 10))
    .filter((n) => !Number.isNaN(n) && n > 0) ?? [];

  const uniqueSorted = [...new Set(indices)].sort((a, b) => a - b);

  if (uniqueSorted.length > 0) {
    return uniqueSorted.slice(0, MAX_WHATSAPP_TEMPLATE_VARIABLES).map((index) => ({
      index,
      example: examples[index - 1],
    }));
  }

  if (examples.length > 0) {
    return examples.slice(0, MAX_WHATSAPP_TEMPLATE_VARIABLES).map((example, i) => ({
      index: i + 1,
      example,
    }));
  }

  return [];
}

export function buildTemplateVariableCountOptions(
  variables: TemplateBodyVariable[],
): Array<{ name: string; value: string }> {
  const count = variables.length;

  if (count === 0) {
    return [{ name: 'No Body Variables in This Template', value: '0' }];
  }

  const labels = variables.map((v) => {
    const label = `{{${v.index}}}`;
    return v.example ? `${label} (e.g. ${v.example})` : label;
  });

  return [
    {
      name: `This template has ${count} variable(s): ${labels.join(', ')}`,
      value: String(count),
    },
  ];
}
