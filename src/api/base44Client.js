import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

export const base44 = createClient({
  appId: appId || "69c22108b8c4a14c87db9aef",
  token,
  functionsVersion,
  requiresAuth: false,
  appBaseUrl,
});
