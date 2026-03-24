import { base44 } from './base44Client';

// invoke() returns raw axios response {data: ...} since interceptResponses=false
// so we unwrap .data to get the actual payload
const call = async (name, params) => {
  const res = await base44.functions.invoke(name, params);
  return res?.data ?? res;
};

export const searchLeads    = (params) => call('searchLeads', params);
export const generatePreview = (params) => call('generatePreview', params);
export const sendOutreach   = (params) => call('sendOutreach', params);
