import type { INodeProperties } from 'n8n-workflow';
import { MAX_WHATSAPP_TEMPLATE_VARIABLES } from './whatsappTemplate';

function showWhenVariableCountAtLeast(index: number): INodeProperties['displayOptions'] {
  const counts: string[] = [];
  for (let n = index; n <= MAX_WHATSAPP_TEMPLATE_VARIABLES; n++) {
    counts.push(String(n));
  }
  return {
    show: {
      resource: ['message'],
      operation: ['sendWhatsAppTemplate'],
      templateVariableCount: counts,
    },
  };
}

/** Per-slot fields var1…var20; visibility driven by templateVariableCount from loadOptions. */
export function buildWhatsAppTemplateVariableFields(): INodeProperties[] {
  const fields: INodeProperties[] = [];

  for (let i = 1; i <= MAX_WHATSAPP_TEMPLATE_VARIABLES; i++) {
    fields.push({
      displayName: `Variable {{${i}}}`,
      name: `var${i}`,
      type: 'string',
      default: '',
      placeholder: `Value for {{${i}}}`,
      description: 'Body placeholder value for this template variable',
      displayOptions: showWhenVariableCountAtLeast(i),
    });
  }

  return fields;
}
