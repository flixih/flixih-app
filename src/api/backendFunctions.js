import { base44 } from './base44Client';

export const searchLeads = (params) => base44.functions.searchLeads(params);
export const generatePreview = (params) => base44.functions.generatePreview(params);
export const sendOutreach = (params) => base44.functions.sendOutreach(params);