export const providers=['openai','openrouter','anthropic'] as const;
export type Provider=typeof providers[number];
export type RequestPlan={provider:Provider;model:string;apiKey?:string;context:string;task:string};
export async function requestPlan(request:RequestPlan,signal?:AbortSignal):Promise<string>{
 const response=await fetch('/api/ai/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal,cache:'no-store',credentials:'same-origin'});
 if(!response.headers.get('content-type')?.includes('application/json'))throw Error('AI endpoint unavailable. Run the local development server to use BYOK.');
 const payload=await response.json();if(!response.ok)throw Error(typeof payload.error==='string'?payload.error:'Provider request failed.');
 if(typeof payload.plan!=='string'||payload.plan.length>100000)throw Error('Invalid provider response.');
 return payload.plan;
}
