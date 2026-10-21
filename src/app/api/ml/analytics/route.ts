import { NextRequest } from 'next/server';
import { getRouteAnalytics } from '@/lib/ml-service';
import { routeQuery } from '../_route';

export const GET = (request: NextRequest) => routeQuery(request, getRouteAnalytics);
