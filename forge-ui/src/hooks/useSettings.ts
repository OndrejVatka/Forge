import type { Project, Tag } from '@forge/shared';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import {
  createProject,
  createTag,
  deleteTag,
  updateProject,
  type ProjectInput,
} from '../lib/api.js';

export function useCreateProject(): UseMutationResult<Project, Error, ProjectInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProject(): UseMutationResult<
  Project,
  Error,
  { id: string; input: ProjectInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => updateProject(id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useCreateTag(): UseMutationResult<Tag, Error, { name: string; color: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTag,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useDeleteTag(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTag,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['tags'] }),
  });
}
