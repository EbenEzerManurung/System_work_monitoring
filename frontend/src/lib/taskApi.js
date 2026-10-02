import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

/* ==================== QUERY KEYS ==================== */
export const taskKeys = {
  all: ['tasks'],
  backlog: ['tasks', 'backlog'],
  bySprint: (id) => ['tasks', 'sprint', id],
  detail: (id) => ['tasks', id]
}

export const sprintKeys = {
  all: ['sprints'],
  detail: (id) => ['sprints', id]
}

export const userKeys = {
  all: ['users'],
  detail: (id) => ['users', id]
}

export const departmentKeys = {
  all: ['departments'],
  detail: (id) => ['departments', id]
}

/* ==================== TASKS ==================== */

// ⭐ staleTime DIHAPUS → selalu refetch on mount
export function useTasks() {
  return useQuery({
    queryKey: taskKeys.all,
    queryFn: () => api.get('/tasks').then((r) => r.data.data || []),
    refetchOnMount: 'always'  // ⭐ paksa refetch setiap kali page mount
  })
}

export function useBacklogTasks() {
  return useQuery({
    queryKey: taskKeys.backlog,
    queryFn: () => api.get('/tasks/backlog').then((r) => r.data.data || []),
    refetchOnMount: 'always'
  })
}

export function useSprintTasks(sprintId) {
  return useQuery({
    queryKey: taskKeys.bySprint(sprintId),
    queryFn: () => api.get(`/tasks/sprint/${sprintId}`).then((r) => r.data.data || []),
    enabled: !!sprintId,
    refetchOnMount: 'always'
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.post('/tasks', body).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all })
      qc.invalidateQueries({ queryKey: taskKeys.backlog })
    }
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/tasks/${id}`, body).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all })
      qc.invalidateQueries({ queryKey: taskKeys.backlog })
    }
  })
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => api.patch(`/tasks/${id}/status`, { status }).then((r) => r.data),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: taskKeys.all })
      const prev = qc.getQueryData(taskKeys.all)
      if (prev) {
        qc.setQueryData(taskKeys.all, (old) =>
          (old || []).map((t) => (t.id === id ? { ...t, status } : t))
        )
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(taskKeys.all, ctx.prev) },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all })
      qc.invalidateQueries({ queryKey: taskKeys.backlog })
    }
  })
}

export function useUpdateTaskProgress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, progress_level }) =>
      api.patch(`/tasks/${id}/progress`, { progress_level }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all })
      qc.invalidateQueries({ queryKey: taskKeys.backlog })
    }
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all })
      qc.invalidateQueries({ queryKey: taskKeys.backlog })
    }
  })
}

/* ==================== SPRINTS ==================== */

// ⭐ staleTime DIHAPUS → selalu refetch on mount
export function useSprints() {
  return useQuery({
    queryKey: sprintKeys.all,
    queryFn: () => api.get('/sprints').then((r) => r.data.data || []),
    refetchOnMount: 'always'
  })
}

export function useCreateSprint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.post('/sprints', body).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: sprintKeys.all })
  })
}

export function useUpdateSprint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/sprints/${id}`, body).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: sprintKeys.all })
  })
}

export function useDeleteSprint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/sprints/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: sprintKeys.all })
  })
}

// ⭐ useStartSprint — invalidate SEMUA key terkait
export function useStartSprint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/sprints/${id}/start`).then((r) => r.data),
    onSuccess: (_data, sprintId) => {
      qc.invalidateQueries({ queryKey: sprintKeys.all })
      qc.invalidateQueries({ queryKey: sprintKeys.detail(sprintId) })
      qc.invalidateQueries({ queryKey: taskKeys.all })
      qc.invalidateQueries({ queryKey: taskKeys.backlog })
      qc.invalidateQueries({ queryKey: taskKeys.bySprint(sprintId) })
    }
  })
}

// ⭐ useCompleteSprint — invalidate SEMUA key terkait
export function useCompleteSprint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/sprints/${id}/complete`).then((r) => r.data),
    onSuccess: (_data, sprintId) => {
      qc.invalidateQueries({ queryKey: sprintKeys.all })
      qc.invalidateQueries({ queryKey: sprintKeys.detail(sprintId) })
      qc.invalidateQueries({ queryKey: taskKeys.all })
      qc.invalidateQueries({ queryKey: taskKeys.backlog })
      qc.invalidateQueries({ queryKey: taskKeys.bySprint(sprintId) })
    }
  })
}

export function useAssignTasksToSprint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sprintId, taskIds }) =>
      api.post(`/sprints/${sprintId}/assign`, { task_ids: taskIds }).then((r) => r.data),
    onSuccess: (_data, { sprintId }) => {
      qc.invalidateQueries({ queryKey: sprintKeys.all })
      qc.invalidateQueries({ queryKey: sprintKeys.detail(sprintId) })
      qc.invalidateQueries({ queryKey: taskKeys.all })
      qc.invalidateQueries({ queryKey: taskKeys.backlog })
      qc.invalidateQueries({ queryKey: taskKeys.bySprint(sprintId) })
    }
  })
}

export function useRemoveTaskFromSprint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskId) => api.delete(`/sprints/tasks/${taskId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sprintKeys.all })
      qc.invalidateQueries({ queryKey: taskKeys.all })
      qc.invalidateQueries({ queryKey: taskKeys.backlog })
    }
  })
}

export function useSyncSprintPoints() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/sprints/sync').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sprintKeys.all })
      qc.invalidateQueries({ queryKey: taskKeys.all })
    }
  })
}

/* ==================== USERS ==================== */

export function useUsers() {
  return useQuery({
    queryKey: userKeys.all,
    queryFn: () => api.get('/users').then((r) => r.data.data || []),
    staleTime: 60_000
  })
}

export function useUser(id) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => api.get(`/users/${id}`).then((r) => r.data.data),
    enabled: !!id,
    staleTime: 60_000
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.post('/users', body).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all })
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/users/${id}`, body).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all })
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all })
  })
}

/* ==================== DEPARTMENTS ==================== */

export function useDepartments() {
  return useQuery({
    queryKey: departmentKeys.all,
    queryFn: () => api.get('/departments').then((r) => r.data.data || []),
    staleTime: 60_000
  })
}

export function useCreateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.post('/departments', body).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: departmentKeys.all })
  })
}

export function useUpdateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/departments/${id}`, body).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: departmentKeys.all })
  })
}

export function useDeleteDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/departments/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: departmentKeys.all })
  })
}