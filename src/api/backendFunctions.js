import { base44 } from './base44Client';

const call = async (name, params = {}) => {
  const res = await base44.functions.invoke(name, params);
  // base44 SDK returns raw axios response for functions (interceptResponses=false)
  // so we need to unwrap .data
  return res?.data ?? res;
};

export const searchLeads    = (params) => call('searchLeads', params);
export const generatePreview = (params) => call('generatePreview', params);
export const sendOutreach   = (params) => call('sendOutreach', params);
