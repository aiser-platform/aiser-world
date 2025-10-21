import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Data Sources queries
export const useDataSources = () => {
  return useQuery({
    queryKey: ['dataSources'],
    queryFn: async () => {
      const response = await fetch('/api/data/sources', { credentials: 'include' })
      if (!response.ok) throw new Error('Failed to fetch data sources')
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}

export const useDataSourcesByProject = (projectId: string) => {
  return useQuery({
    queryKey: ['dataSources', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/data/sources?project_id=${projectId}`, { credentials: 'include' })
      if (!response.ok) throw new Error('Failed to fetch data sources')
      return response.json()
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

export const useCreateDataSource = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (dataSourceData: any) => {
      const response = await fetch('/api/data/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(dataSourceData),
      })
      if (!response.ok) throw new Error('Failed to create data source')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataSources'] })
    },
  })
}

export const useUpdateDataSource = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/data/sources/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update data source')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataSources'] })
    },
  })
}

export const useDeleteDataSource = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/data/sources/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to delete data source')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataSources'] })
    },
  })
}

// Projects queries
export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects', { credentials: 'include' })
      if (!response.ok) throw new Error('Failed to fetch projects')
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}

export const useOrganizations = () => {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const response = await fetch('/api/organizations', { credentials: 'include' })
      if (!response.ok) throw new Error('Failed to fetch organizations')
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}
