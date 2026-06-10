import type { Tag } from '@forge/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { fetchTags } from '../lib/api.js';

export function useTags(): UseQueryResult<Tag[], Error> {
  return useQuery({ queryKey: ['tags'], queryFn: fetchTags });
}
