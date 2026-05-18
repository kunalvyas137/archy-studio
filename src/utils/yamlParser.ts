import yaml from 'js-yaml';
import type { FlowNode, FlowEdge, ParseResult } from '../types';


export function parseArchyYaml(yamlString: string): ParseResult {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  let idCounter = 1;
  let edgeCounter = 1;

  const generateId = () => `node_${idCounter++}`;
  const generateEdgeId = () => `edge_${edgeCounter++}`;

  const doc = yaml.load(yamlString) as any;
  if (!doc) return { nodes, edges, rawYaml: null };

  const FLOW_TYPES = [
    'inboundCall', 
    'outboundCall', 
    'inqueueCall', 
    'secureCall', 
    'commonModule',
    'botFlow',
    'digitalBotFlow',
    'inboundEmail',
    'inboundShortMessage',
    'inboundMessage',
    'workflow',
    'surveyInvite'
  ];
  const flowTypeKey = FLOW_TYPES.find(k => doc[k]) ?? Object.keys(doc)[0] ?? 'inboundCall';
  const rootFlow = doc[flowTypeKey] ?? Object.values(doc)[0];
  if (!rootFlow) return { nodes, edges, rawYaml: doc };
  const taskRefMap: Record<string, string> = {};


  // Helper: register all path variants for a task/menu refId and name
  const registerRef = (refId: string, name: string, nodeId: string) => {
    taskRefMap[refId] = nodeId;
    taskRefMap[name] = nodeId;
    taskRefMap[`/${flowTypeKey}/tasks/task[${refId}]`] = nodeId;
    taskRefMap[`/${flowTypeKey}/tasks/task[${name}]`] = nodeId;
    taskRefMap[`/${flowTypeKey}/menus/menu[${refId}]`] = nodeId;
    taskRefMap[`/${flowTypeKey}/menus/menu[${name}]`] = nodeId;
  };

  // First pass: Create nodes for all Tasks
  if (rootFlow.tasks) {
    rootFlow.tasks.forEach((tWrapper: any) => {
      const task = tWrapper.task;
      if (!task) return;

      const taskId = generateId();
      registerRef(task.refId, task.name, taskId);

      const warnings: string[] = [];
      if (!task.actions || task.actions.length === 0) {
        warnings.push('Empty Task: No actions defined.');
      }

      nodes.push({
        id: taskId,
        type: 'taskNode',
        position: { x: 0, y: 0 },
        data: {
          label: task.name,
          type: 'Task',
          details: task,
          isTaskRoot: true,
          validationWarnings: warnings,
        },
      });

      if (task.actions && Array.isArray(task.actions)) {
        const { firstNodeId } = processActions(task.actions, taskId, nodes, edges, generateId, generateEdgeId);
        if (firstNodeId) {
          edges.push({
            id: generateEdgeId(),
            source: taskId,
            target: firstNodeId,
            type: 'smoothstep',
            animated: true,
          });
        }
      }
    });
  }

  // Handle menus if present
  if (rootFlow.menus) {
    rootFlow.menus.forEach((mWrapper: any) => {
      const menu = mWrapper.menu;
      if (!menu) return;
      const menuId = generateId();
      registerRef(menu.refId, menu.name, menuId);
      
      const warnings: string[] = [];
      if (!menu.choices || menu.choices.length === 0) {
        warnings.push('Empty Menu: No choices defined.');
      }
      
      nodes.push({
        id: menuId,
        type: 'taskNode',
        position: { x: 0, y: 0 },
        data: {
          label: menu.name,
          type: 'Menu',
          details: menu,
          isTaskRoot: true,
          validationWarnings: warnings,
        },
      });
      // Menus have choices instead of sequential actions
      if (menu.choices) {
         menu.choices.forEach((choiceWrapper:any) => {
            const choiceType = Object.keys(choiceWrapper)[0];
            const choice = choiceWrapper[choiceType];
            const choiceId = generateId();
            nodes.push({
              id: choiceId,
              type: 'actionNode',
              position: { x: 0, y: 0 },
              data: {
                label: `Choice: ${choice.dtmf || choice.name}`,
                type: choiceType,
                details: choice,
                validationWarnings: [],
              }
            });
            edges.push({
              id: `e_${menuId}_${choiceId}`,
              source: menuId,
              target: choiceId,
              label: choice.dtmf || choiceType,
              type: 'smoothstep'
            });
            
            // if choice has actions (directly or inside task.actions)
            const choiceActions = choice.actions || choice.task?.actions;
            if (choiceActions && Array.isArray(choiceActions)) {
               const { firstNodeId } = processActions(choiceActions, choiceId, nodes, edges, generateId, generateEdgeId);
               if(firstNodeId) {
                 edges.push({
                    id: generateEdgeId(),
                    source: choiceId,
                    target: firstNodeId,
                    type: 'smoothstep'
                 })
               }
            }
         });
      }
    });
  }

  // Handle startUpTaskActions (used in commonModule flow types)
  if (rootFlow.startUpTaskActions && Array.isArray(rootFlow.startUpTaskActions)) {
    const taskId = generateId();
    
    nodes.push({
      id: taskId,
      type: 'taskNode',
      position: { x: 0, y: 0 },
      data: {
        label: rootFlow.name || 'Module Start',
        type: 'Start',
        details: {},
        isTaskRoot: true,
        validationWarnings: [],
      },
    });

    const { firstNodeId } = processActions(rootFlow.startUpTaskActions, taskId, nodes, edges, generateId, generateEdgeId);
    if (firstNodeId) {
      edges.push({
        id: generateEdgeId(),
        source: taskId,
        target: firstNodeId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 3 }
      });
    }
  }

  // Second pass: Connect jumpToTask, callTask, and jumpToMenu to the actual Task/Menu nodes
  nodes.forEach(node => {
    if (node.data.type === 'jumpToTask' || node.data.type === 'callTask' || node.data.type === 'jumpToMenu') {
      const targetRef = node.data.details.targetTaskRef || node.data.details.targetMenuRef;
      let foundTarget = false;
      
      if (targetRef && taskRefMap[targetRef]) {
        foundTarget = true;
        edges.push({
          id: generateEdgeId(),
          source: node.id,
          target: taskRefMap[targetRef],
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#8b5cf6', strokeWidth: 2 }
        });
      } else {
        const foundKey = Object.keys(taskRefMap).find(k => targetRef && targetRef.includes(k));
        if (foundKey) {
            foundTarget = true;
            edges.push({
              id: generateEdgeId(),
              source: node.id,
              target: taskRefMap[foundKey],
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#8b5cf6', strokeWidth: 2 }
            });
        }
      }

      if (!foundTarget && targetRef) {
        if (!node.data.validationWarnings) node.data.validationWarnings = [];
        node.data.validationWarnings.push(`Unresolved Reference: Could not find target '${targetRef}'.`);
      }
    }
  });

  // Entry point
  if (rootFlow.startUpRef) {
      const startTaskId = taskRefMap[rootFlow.startUpRef];
      if (startTaskId) {
        const startNodeId = generateId();
        nodes.push({
          id: startNodeId,
          type: 'taskNode',
          position: {x:0, y:0},
          data: {
            label: 'START',
            type: 'Start',
            details: {},
            isTaskRoot: true,
            validationWarnings: [],
          }
        });
        edges.push({
          id: generateEdgeId(),
          source: startNodeId,
          target: startTaskId,
          type: 'smoothstep',
          style: { stroke: '#10b981', strokeWidth: 3 }
        })
      }
  }

  // Global Error Handling
  if (rootFlow.settingsErrorHandling?.errorHandling?.task?.targetTaskRef) {
      const errorTaskId = taskRefMap[rootFlow.settingsErrorHandling.errorHandling.task.targetTaskRef];
      if (errorTaskId) {
        const errorNodeId = generateId();
        nodes.push({
          id: errorNodeId,
          type: 'taskNode',
          position: {x:0, y:0},
          data: {
            label: 'GLOBAL ERROR',
            type: 'Error',
            details: {},
            isTaskRoot: true,
            validationWarnings: [],
          }
        });
        edges.push({
          id: generateEdgeId(),
          source: errorNodeId,
          target: errorTaskId,
          type: 'smoothstep',
          style: { stroke: '#ef4444', strokeWidth: 3, strokeDasharray: '5,5' }
        })
      }
  }

  // Deduplicate edges (same source+target can appear from fallthrough logic)
  const seenEdgeKeys = new Set<string>();
  const uniqueEdges = edges.filter(e => {
    const key = `${e.source}-->${e.target}`;
    if (seenEdgeKeys.has(key)) return false;
    seenEdgeKeys.add(key);
    return true;
  });

  return { nodes, edges: uniqueEdges, rawYaml: doc };
}


const TERMINATOR_TYPES = new Set([
  'disconnect',
  'jumpToTask',
  'jumpToMenu',
  'endTask'
]);

const GENERIC_BRANCH_KEYS = [
  'yes', 'no',
  'successPath', 'failurePath', 'timeoutPath',
  'found', 'notFound', 'failure',
  'loopBody'
];

function buildCaseLabel(value: any, index: number): string {
  if (!value) return `Case ${index + 1}`;
  const exp: string = value.exp || '';
  // Extract the meaningful part from Contains/equals expressions
  const containsMatch = exp.match(/Contains\([^,]+,\s*["']([^"']+)["']/);
  if (containsMatch) return containsMatch[1];
  const isNotSetMatch = exp.match(/IsNotSetOrEmpty/);
  if (isNotSetMatch) return 'Not Set / Empty';
  return exp.length > 40 ? exp.slice(0, 40) + '…' : exp || `Case ${index + 1}`;
}

function processActions(
  actions: any[],
  _parentId: string,
  nodes: FlowNode[],
  edges: FlowEdge[],
  generateId: () => string,
  generateEdgeId: () => string
): { firstNodeId: string | null; lastNodeIds: string[] } {
  if (!actions || actions.length === 0) return { firstNodeId: null, lastNodeIds: [] };

  let firstNodeId: string | null = null;
  let previousNodeIds: string[] = [];

  actions.forEach((actionWrapper, index) => {
    const actionType = Object.keys(actionWrapper)[0];
    const action = actionWrapper[actionType];
    if (!action) return;

    const actionId = generateId();
    if (index === 0) firstNodeId = actionId;

    const warnings: string[] = [];
    
    // Check for missing failure paths on dependencies
    const dependencyActions = ['transferToAcd', 'transferToNumber', 'callDataAction', 'dataTableLookup'];
    if (dependencyActions.includes(actionType)) {
      const hasFailure = action.failure || action.failurePath || action.timeout || action.timeoutPath;
      if (!hasFailure) {
        warnings.push(`Missing Fallback: ${actionType} does not have a configured failure or timeout path.`);
      }
    }

    // Create the node
    nodes.push({
      id: actionId,
      type: 'actionNode',
      position: { x: 0, y: 0 },
      data: {
        label: action.name || actionType,
        type: actionType,
        details: action,
        validationWarnings: warnings,
      },
    });

    // Connect from all previous nodes in the chain
    previousNodeIds.forEach(prevId => {
      edges.push({
        id: generateEdgeId(),
        source: prevId,
        target: actionId,
        type: 'smoothstep',
      });
    });

    // By default, this node is the next connection point
    previousNodeIds = [actionId];

    // ── Determine if this action spawns branches ──────────────────────────
    const isSwitchAction =
      actionType === 'switch' &&
      action.evaluate?.firstTrue?.cases;

    const hasGenericBranches = GENERIC_BRANCH_KEYS.some(key => action[key]?.actions && action[key].actions.length > 0);

    const hasBranches = isSwitchAction || hasGenericBranches;
    const branchEnds: string[] = [];

    // ── Process switch cases ──────────────────────────────────────────────
    if (isSwitchAction) {
      action.evaluate.firstTrue.cases.forEach((cWrapper: any, i: number) => {
        // Archy YAML wraps each case as { case: { value, actions } }
        const c = cWrapper.case ?? cWrapper; // handle both wrapped and bare
        const label = buildCaseLabel(c.value, i + 1);
        if (c.actions && c.actions.length > 0) {
          const { firstNodeId: caseFirst, lastNodeIds: caseLast } =
            processActions(c.actions, actionId, nodes, edges, generateId, generateEdgeId);
          if (caseFirst) {
            edges.push({
              id: generateEdgeId(),
              source: actionId,
              target: caseFirst,
              label,
              type: 'smoothstep',
            });
          }
          branchEnds.push(...caseLast);
        }
        // Cases with no actions are implicit fallthrough — handled by the
        // actionId fallthrough below.
      });

      // Explicit default case
      if (action.evaluate.firstTrue.default?.actions) {
        const { firstNodeId: defFirst, lastNodeIds: defLast } =
          processActions(action.evaluate.firstTrue.default.actions, actionId, nodes, edges, generateId, generateEdgeId);
        if (defFirst) {
          edges.push({
            id: generateEdgeId(),
            source: actionId,
            target: defFirst,
            label: 'default',
            type: 'smoothstep',
          });
        }
        branchEnds.push(...defLast);
      }
    }

    // ── Process generic branches (decision, data actions, loops, etc.) ────
    if (hasGenericBranches) {
      GENERIC_BRANCH_KEYS.forEach(branchKey => {
        const branchObj = action[branchKey];
        if (branchObj && branchObj.actions && branchObj.actions.length > 0) {
          const { firstNodeId: outFirst, lastNodeIds: outLast } =
            processActions(branchObj.actions, actionId, nodes, edges, generateId, generateEdgeId);
          if (outFirst) {
            edges.push({
              id: generateEdgeId(),
              source: actionId,
              target: outFirst,
              label: branchKey, // Use the key as the edge label (e.g., 'successPath', 'yes')
              type: 'smoothstep',
            });
          }
          branchEnds.push(...outLast);
        }
      });
    }

    // ── Compute next previousNodeIds ──────────────────────────────────────
    if (hasBranches) {
      // Non-terminating branch ends can continue to the next sequential action
      const continuingBranchEnds = branchEnds.filter(id => {
        const n = nodes.find(node => node.id === id);
        return !n || !TERMINATOR_TYPES.has(n.data.type);
      });

      // KEY FIX: The action node itself is ALWAYS a fallthrough source.
      // In Genesys Cloud, after a switch/outputs block, the flow always
      // proceeds to the next action if no branch terminates the call.
      // This represents the "no case matched" / "not found" path.
      previousNodeIds = [actionId, ...continuingBranchEnds];
    } else {
      // Simple (non-branching) action: stop propagating if it terminates
      if (TERMINATOR_TYPES.has(actionType)) {
        previousNodeIds = [];
      }
    }
  });

  return { firstNodeId, lastNodeIds: previousNodeIds };
}
