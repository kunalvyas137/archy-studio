import dagre from 'dagre';
import type { FlowNode, FlowEdge } from '../types';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 280;
const nodeHeight = 120;

export const getLayoutedElements = (nodes: FlowNode[], edges: FlowEdge[], direction = 'TB') => {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 80 });

  nodes.forEach((node) => {
    const width = node.type === 'taskNode' ? 320 : nodeWidth;
    const height = node.type === 'taskNode' ? 140 : nodeHeight;
    g.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    // dagre requires both source and target to be valid nodes
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(g);

  const newNodes: FlowNode[] = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    if (!nodeWithPosition) return node; // safety guard
    const width = node.type === 'taskNode' ? 320 : nodeWidth;
    const height = node.type === 'taskNode' ? 140 : nodeHeight;
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
      sourcePosition: direction === 'TB' ? 'bottom' : 'right',
      targetPosition: direction === 'TB' ? 'top' : 'left',
    };
  });

  return { nodes: newNodes, edges };
};
