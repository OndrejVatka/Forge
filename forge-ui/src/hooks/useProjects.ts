import type { Project } from '@forge/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { fetchProjects } from '../lib/api.js';

export function useProjects(): UseQueryResult<Project[], Error> {
  return useQuery({ queryKey: ['projects'], queryFn: fetchProjects });
}
