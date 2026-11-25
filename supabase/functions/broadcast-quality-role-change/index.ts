import { retiredEndpointResponse } from '../_shared/retired-endpoint.ts';

Deno.serve((req) => retiredEndpointResponse(req));
