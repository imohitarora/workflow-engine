import { StepStatus } from '../enums/step-status.enum';

export interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  dependencies: string[];
  config: {
    type: 'script' | 'http' | 'human';
    handler: string;
    inputMapping: Record<string, string>;
    outputMapping: Record<string, string>;
    form?: {
      title: string;
      fields: Array<{
        name: string;
        label: string;
        type: string;
        required?: boolean;
        multiline?: boolean;
        min?: number;
        max?: number;
        step?: number;
        pattern?: string;
        patternError?: string;
        showIf?: string;
        options?: Array<{
          value: string;
          label: string;
        }>;
      }>;
    };
  };
  timeout?: number;
  retryConfig?: {
    maxAttempts: number;
    backoffFactor: number;
    initialInterval: number;
  };
  condition?: {
    type: 'javascript' | 'jsonpath';
    expression: string;
  };
}
