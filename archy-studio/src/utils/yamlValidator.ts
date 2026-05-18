import yaml from 'js-yaml';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  ruleName: string;
  message: string;
  detail?: string;
  taskRef?: string;
}

const FLOW_TYPES = [
  'inboundCall', 'outboundCall', 'inqueueCall', 'secureCall',
  'commonModule', 'botFlow', 'digitalBotFlow', 'inboundEmail',
  'inboundShortMessage', 'inboundMessage', 'workflow', 'surveyInvite',
];

const DEPENDENCY_ACTIONS = ['transferToAcd', 'transferToNumber', 'callDataAction', 'dataTableLookup'];

let _issueCounter = 0;
function makeId() { return `issue_${_issueCounter++}`; }

/**
 * Runs a suite of linting rules on raw YAML string.
 * Returns an array of ValidationIssue — no network call, no CLI.
 */
export function validateYaml(
  yamlString: string,
  substitutions: Record<string, string> = {}
): ValidationIssue[] {
  _issueCounter = 0;
  const issues: ValidationIssue[] = [];

  let doc: any;
  try {
    doc = yaml.load(yamlString);
  } catch (e: any) {
    issues.push({
      id: makeId(),
      severity: 'error',
      ruleName: 'InvalidYAML',
      message: 'YAML parse error',
      detail: e.message,
    });
    return issues;
  }

  if (!doc || typeof doc !== 'object') {
    issues.push({ id: makeId(), severity: 'error', ruleName: 'EmptyDocument', message: 'YAML document is empty.' });
    return issues;
  }

  const flowTypeKey = FLOW_TYPES.find((k) => doc[k]) ?? Object.keys(doc)[0];
  const rootFlow = doc[flowTypeKey] ?? Object.values(doc)[0] as any;

  if (!rootFlow || typeof rootFlow !== 'object') {
    issues.push({ id: makeId(), severity: 'error', ruleName: 'NoRootFlow', message: 'Cannot find a valid flow definition.' });
    return issues;
  }

  // ── Rule: Missing startUpRef ────────────────────────────────────────────
  if (!rootFlow.startUpRef && !rootFlow.startUpTaskActions) {
    issues.push({
      id: makeId(),
      severity: 'error',
      ruleName: 'MissingStartUpRef',
      message: 'Missing entry point: no startUpRef or startUpTaskActions defined.',
      detail: 'The flow has no defined entry task. Add a startUpRef pointing to your first task.',
    });
  }

  // ── Rule: No global error handler ───────────────────────────────────────
  if (!rootFlow.settingsErrorHandling?.errorHandling?.task?.targetTaskRef) {
    issues.push({
      id: makeId(),
      severity: 'warning',
      ruleName: 'MissingGlobalErrorHandler',
      message: 'No global error handler configured.',
      detail: 'settingsErrorHandling.errorHandling.task.targetTaskRef is not set. Callers may experience silent failures.',
    });
  }

  // ── Collect all task refIds and names for reference checking ────────────
  const taskRefIds = new Set<string>();
  const taskNames = new Set<string>();

  if (rootFlow.tasks) {
    const seenRefIds = new Map<string, number>();

    rootFlow.tasks.forEach((tWrapper: any, _i: number) => {
      const task = tWrapper?.task;
      if (!task) return;

      // Rule: Duplicate refId
      const count = (seenRefIds.get(task.refId) ?? 0) + 1;
      seenRefIds.set(task.refId, count);
      if (count === 2) {
        issues.push({
          id: makeId(),
          severity: 'error',
          ruleName: 'DuplicateTaskRefId',
          message: `Duplicate task refId: "${task.refId}"`,
          detail: 'Two tasks share the same refId. Only the first will be reachable.',
          taskRef: task.refId,
        });
      }

      taskRefIds.add(task.refId);
      taskNames.add(task.name);

      // Rule: Empty task
      if (!task.actions || task.actions.length === 0) {
        issues.push({
          id: makeId(),
          severity: 'warning',
          ruleName: 'EmptyTask',
          message: `Task "${task.name}" has no actions.`,
          detail: 'Empty tasks will cause callers to experience a silent dead-end.',
          taskRef: task.name,
        });
      }

      // Recurse into actions
      if (task.actions) {
        scanActions(task.actions, task.name, issues, taskRefIds, taskNames);
      }
    });
  }

  // ── Rule: Menus ─────────────────────────────────────────────────────────
  if (rootFlow.menus) {
    rootFlow.menus.forEach((mWrapper: any) => {
      const menu = mWrapper?.menu;
      if (!menu) return;
      if (!menu.choices || menu.choices.length === 0) {
        issues.push({
          id: makeId(),
          severity: 'warning',
          ruleName: 'EmptyMenu',
          message: `Menu "${menu.name}" has no choices.`,
          detail: 'Empty menus will play no options and leave callers confused.',
          taskRef: menu.name,
        });
      }
    });
  }

  // ── Rule: Unresolved {{variables}} ─────────────────────────────────────
  const varPattern = /\{\{([^}]+)\}\}/g;
  const yamlText = yamlString;
  let match;
  const seen = new Set<string>();
  while ((match = varPattern.exec(yamlText)) !== null) {
    const varName = match[1].trim();
    if (!seen.has(varName) && !(varName in substitutions)) {
      seen.add(varName);
      issues.push({
        id: makeId(),
        severity: 'warning',
        ruleName: 'UnresolvedSubstitution',
        message: `Unresolved substitution variable: {{${varName}}}`,
        detail: 'This variable has no value in the active environment substitutions. It will be passed literally to Genesys Cloud.',
      });
    }
  }

  return issues;
}

function scanActions(
  actions: any[],
  contextName: string,
  issues: ValidationIssue[],
  taskRefIds: Set<string>,
  taskNames: Set<string>
) {
  if (!Array.isArray(actions)) return;

  actions.forEach((actionWrapper: any) => {
    const actionType = Object.keys(actionWrapper)[0];
    const action = actionWrapper[actionType];
    if (!action) return;

    // Rule: Missing failure/timeout paths on critical actions
    if (DEPENDENCY_ACTIONS.includes(actionType)) {
      const hasFailure = action.failure || action.failurePath || action.timeout || action.timeoutPath;
      if (!hasFailure) {
        issues.push({
          id: makeId(),
          severity: 'warning',
          ruleName: 'MissingFallbackPath',
          message: `"${action.name || actionType}" in task "${contextName}" has no failure or timeout path.`,
          detail: `${actionType} can fail if the network is unavailable or the resource does not exist. Add a failurePath or timeoutPath to handle this gracefully.`,
          taskRef: contextName,
        });
      }
    }

    // Rule: transferToNumber missing number expression
    if (actionType === 'transferToNumber') {
      const hasNumber =
        action.transferTo?.numberExpression ||
        action.transferTo?.address ||
        action.number;
      if (!hasNumber) {
        issues.push({
          id: makeId(),
          severity: 'error',
          ruleName: 'MissingTransferDestination',
          message: `"${action.name || 'transferToNumber'}" in task "${contextName}" has no phone number configured.`,
          detail: 'transferTo.numberExpression or transferTo.address must be set.',
          taskRef: contextName,
        });
      }
    }

    // Rule: Unresolved jumpToTask / callTask reference
    if (actionType === 'jumpToTask' || actionType === 'callTask') {
      const ref = action.targetTaskRef;
      if (ref) {
        // Strip XPath-style path to get bare refId/name
        const bareRef = ref.replace(/.*task\[/, '').replace(/\]$/, '');
        if (!taskRefIds.has(bareRef) && !taskNames.has(bareRef)) {
          issues.push({
            id: makeId(),
            severity: 'error',
            ruleName: 'UnresolvedTaskRef',
            message: `"${action.name || actionType}" references unknown task: "${bareRef}"`,
            detail: 'The target task refId or name does not exist in this flow. Check for typos.',
            taskRef: contextName,
          });
        }
      }
    }

    // Recurse into branches
    const branchKeys = ['yes', 'no', 'successPath', 'failurePath', 'timeoutPath', 'found', 'notFound', 'failure', 'loopBody'];
    branchKeys.forEach((key) => {
      if (action[key]?.actions) {
        scanActions(action[key].actions, contextName, issues, taskRefIds, taskNames);
      }
    });

    // Recurse into switch cases
    if (actionType === 'switch' && action.evaluate?.firstTrue?.cases) {
      action.evaluate.firstTrue.cases.forEach((cWrapper: any) => {
        const c = cWrapper.case ?? cWrapper;
        if (c.actions) scanActions(c.actions, contextName, issues, taskRefIds, taskNames);
      });
      if (action.evaluate.firstTrue.default?.actions) {
        scanActions(action.evaluate.firstTrue.default.actions, contextName, issues, taskRefIds, taskNames);
      }
    }
  });
}
