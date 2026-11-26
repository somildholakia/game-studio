import {useMemo} from 'react';
import {diagnose} from '../core/diagnostics';
import type {Project} from '../core/project';
export function DiagnosticsPanel({project}:{project:Project}){
 const issues=useMemo(()=>diagnose(project),[project]);
 const errors=issues.filter(i=>i.severity==='error').length;
 return <fieldset><legend>Project diagnostics</legend><p className="hint">Structural and initial collision checks across all levels. Does not prove that a game is solvable or performant.</p>
 <p>{errors} errors · {issues.length-errors} warnings</p>
 {issues.length===0?<p>No structural issues detected.</p>:<ul>{issues.slice(0,100).map((issue,i)=><li key={i}><strong>{issue.severity==='error'?'Error':'Warning'} · {issue.level}</strong>: {issue.message}</li>)}</ul>}
 {issues.length>100&&<p>Showing the first 100 issues.</p>}</fieldset>;
}
