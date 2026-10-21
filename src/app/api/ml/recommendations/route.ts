import { NextRequest } from 'next/server';
import { getPriceRecommendations } from '@/lib/ml-service';
import { routeQuery } from '../_route';

export const GET = (request: NextRequest) => routeQuery(request, getPriceRecommendations);
