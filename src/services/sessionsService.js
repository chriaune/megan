import{sessions}from'../data/sessions.js';import{serviceConfig}from'./config.js';import{apiClient}from'./apiClient.js';
export const sessionsService={async getAll(){return serviceConfig.mode==='api'?apiClient.get('/sessions'):sessions},async getByDate(date){const all=await this.getAll();return all.filter(item=>item.date===date)}};
