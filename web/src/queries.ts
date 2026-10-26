import { useMutation, useQuery } from '@tanstack/react-query';
import { askQuestion, fetchDocs } from './api';

export const docsKey = ['docs'] as const;

export const useDocs = () => useQuery({ queryKey: docsKey, queryFn: fetchDocs });

export const useAskMutation = () => useMutation({ mutationFn: askQuestion });
