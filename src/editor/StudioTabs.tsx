export function StudioTabs<T extends string>({label,options,value,onChange}:{label:string;options:readonly T[];value:T;onChange:(v:T)=>void}){
 return <nav className="studio-tabs" aria-label={label}>{options.map(option=><button type="button" key={option} aria-pressed={value===option} onClick={()=>onChange(option)}>{option}</button>)}</nav>;
}
