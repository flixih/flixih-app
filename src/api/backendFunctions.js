import { base44 } from './base44Client';

export const searchLeads = (params) => base44.functions.invoke('searchLeads', params);
export const generatePreview = (params) => base44.functions.invoke('generatePreview', params);
export const sendOutreach = (params) => base44.functions.invoke('sendOutreach', params);
