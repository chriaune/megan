import{serviceConfig}from'./config.js';
async function request(path,options={}){const response=await fetch(`${serviceConfig.apiBaseUrl}${path}`,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});if(!response.ok)throw new Error(`API ${response.status}: ${path}`);return response.status===204?null:response.json()}
export const apiClient={get:path=>request(path),post:(path,body)=>request(path,{method:'POST',body:JSON.stringify(body)}),put:(path,body)=>request(path,{method:'PUT',body:JSON.stringify(body)})};
