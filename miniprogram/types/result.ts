export type AppSuccess<T> = {
  ok: true
  value: T
}

export type AppFailure<Code extends string, Context extends object = Record<string, never>> = {
  ok: false
  code: Code
  message: string
  retryable: boolean
  context: Context
}

export type AppResult<T, Code extends string, Context extends object = Record<string, never>> =
  AppSuccess<T> | AppFailure<Code, Context>
