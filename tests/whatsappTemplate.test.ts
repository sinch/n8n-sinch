import { describe, it, expect } from 'vitest';
import {
  getTemplateBodyVariables,
  buildTemplateVariableCountOptions,
  MAX_WHATSAPP_TEMPLATE_VARIABLES,
} from '../utils/whatsappTemplate';
import type { WhatsAppTemplate } from '../nodes/Sinch/types';

describe('getTemplateBodyVariables', () => {
  it('parses {{N}} placeholders from body text', () => {
    const template: WhatsAppTemplate = {
      name: 'delivery_update',
      language: 'en',
      details: {
        components: [
          {
            type: 'BODY',
            text: 'Hello {{1}}, your order ships on {{2}}.',
            examples: ['John', 'Thursday'],
          },
        ],
      },
    };

    const vars = getTemplateBodyVariables(template);
    expect(vars).toHaveLength(2);
    expect(vars[0]).toEqual({ index: 1, example: 'John' });
    expect(vars[1]).toEqual({ index: 2, example: 'Thursday' });
  });

  it('falls back to examples length when body has no placeholders', () => {
    const template: WhatsAppTemplate = {
      name: 'otp',
      language: 'en',
      details: {
        components: [
          {
            type: 'BODY',
            text: 'Your code is ready',
            examples: ['123456'],
          },
        ],
      },
    };

    const vars = getTemplateBodyVariables(template);
    expect(vars).toHaveLength(1);
    expect(vars[0].index).toBe(1);
    expect(vars[0].example).toBe('123456');
  });

  it('returns empty when template has no body variables', () => {
    const template: WhatsAppTemplate = {
      name: 'static',
      language: 'en',
      details: {
        components: [{ type: 'BODY', text: 'Thank you for your order.' }],
      },
    };

    expect(getTemplateBodyVariables(template)).toEqual([]);
  });
});

describe('buildTemplateVariableCountOptions', () => {
  it('returns single option describing variable count for UI auto-select', () => {
    const options = buildTemplateVariableCountOptions([
      { index: 1, example: 'John' },
      { index: 2, example: 'Thursday' },
    ]);

    expect(options).toHaveLength(1);
    expect(options[0].value).toBe('2');
    expect(options[0].name).toContain('2 variable');
    expect(options[0].name).toContain('{{1}}');
    expect(options[0].name).toContain('{{2}}');
  });

  it('returns zero option when no variables', () => {
    const options = buildTemplateVariableCountOptions([]);
    expect(options[0].value).toBe('0');
  });
});

describe('MAX_WHATSAPP_TEMPLATE_VARIABLES', () => {
  it('supports up to 20 slots', () => {
    expect(MAX_WHATSAPP_TEMPLATE_VARIABLES).toBe(20);
  });
});
