import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

export const base44 = createClient({
  appId: appId || "69c0a774c601a0435a0d63d0",
  token,
  functionsVersion,
  requiresAuth: false,
  appBaseUrl
});
