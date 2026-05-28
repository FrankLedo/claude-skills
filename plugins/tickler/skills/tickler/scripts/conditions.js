'use strict';

function conditionMet(item, newState, prevState) {
  const cond = item.condition || 'any';

  if (item.type === 'github-pr') {
    if (cond === 'approved')           return newState.approvals >= 1;
    if (cond === 'merged')             return newState.merged === true;
    if (cond === 'closed')             return newState.status === 'closed' && !newState.merged;
    if (cond === 'changes-requested')  return newState.changes_requested === true;
    if (cond === 'ci-passed')          return newState.ci_status === 'success';
    if (cond === 'ci-failed')          return newState.ci_status === 'failure';
    if (cond === 'new-comment')        return prevState != null && newState.comment_count > prevState.comment_count;
    if (cond === 'any')                return prevState != null && JSON.stringify(pick(newState)) !== JSON.stringify(pick(prevState));
  }

  if (item.type === 'github-issue') {
    if (cond === 'closed')      return newState.status === 'closed';
    if (cond === 'new-comment') return prevState != null && newState.comment_count > prevState.comment_count;
    if (cond.startsWith('labeled:')) {
      const label = cond.slice('labeled:'.length);
      const hadIt = prevState ? (prevState.labels || []).includes(label) : false;
      return newState.labels.includes(label) && !hadIt;
    }
    if (cond === 'any') return prevState != null && JSON.stringify(pick(newState)) !== JSON.stringify(pick(prevState));
  }

  if (item.type === 'jira') {
    if (cond.startsWith('status:')) {
      return newState.status.toLowerCase() === cond.slice('status:'.length).toLowerCase();
    }
    if (cond === 'new-comment')  return prevState != null && newState.comment_count > prevState.comment_count;
    if (cond === 'new-subtask') {
      if (prevState == null) return false;
      const prevKeys = new Set((prevState.subtasks || []).map(st => st.key));
      return (newState.subtasks || []).some(st => !prevKeys.has(st.key));
    }
    if (cond === 'any') return prevState != null && JSON.stringify(pick(newState)) !== JSON.stringify(pick(prevState));
  }

  return false;
}

// exclude last_checked from change comparison so a re-fetch doesn't look like a change
function pick(state) {
  if (!state) return state;
  const { last_checked, ...rest } = state;
  return rest;
}

module.exports = { conditionMet, pick };
