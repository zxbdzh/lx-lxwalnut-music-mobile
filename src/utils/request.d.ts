import type { Dispatch } from 'react'

declare module '@/utils/request' {
  export interface HttpResponse {
    body: any
    headers: Record<string, string>
    statusCode: number
    statusMessage: string
    url: string
    ok: boolean
    promise: Promise<HttpResponse>
    cancelHttp: () => void
  }

  export const httpFetch: (
    url: string,
    options?: Record<string, any>
  ) => HttpResponse
}

declare module 'react-native' {
  export interface TextProps {
    bold?: boolean
    weight?: string
  }
}
