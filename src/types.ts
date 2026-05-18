// Shared flow graph types used across parser and layout utilities

export interface FlowNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: {
    label: string;
    type: string;
    details: any;
    isTaskRoot?: boolean;
    validationWarnings?: string[];
    validationMode?: boolean;
    dimmed?: boolean;
  };
  sourcePosition?: string;
  targetPosition?: string;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
  animated?: boolean;
  style?: Record<string, any>;
}

export interface ParseResult {
  nodes: FlowNode[];
  edges: FlowEdge[];
  rawYaml: any;
}
