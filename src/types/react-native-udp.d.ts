declare module 'react-native-udp' {
  export interface RemoteInfo {
    address: string
    port: number
    size: number
    family: string
  }

  export interface Socket {
    bind(port?: number, host?: string, callback?: () => void): void
    close(callback?: (err?: Error) => void): void
    send(data: string | Uint8Array, offset?: number, length?: number, port?: number, address?: string, callback?: (err?: Error) => void): void
    setBroadcast(flag: boolean): void
    addMembership(multicastAddress: string, multicastInterface?: string): void
    dropMembership(multicastAddress: string, multicastInterface?: string): void
    setTTL(ttl: number): void
    setMulticastTTL(ttl: number): void
    on(event: 'message', listener: (msg: Buffer, rinfo: RemoteInfo) => void): void
    on(event: 'error', listener: (err: Error) => void): void
    on(event: 'listening', listener: () => void): void
    on(event: string, listener: (...args: any[]) => void): void
    removeAllListeners(event?: string): void
  }

  export function createSocket(type: string, callback?: (err: Error, socket: Socket) => void): Socket
  export default any
}
