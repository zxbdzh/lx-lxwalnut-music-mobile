declare module 'react-native-track-player' {
  export interface Track {
    id: string;
    url: string;
    duration?: number;
    [key: string]: any;
  }
  export enum Capability {
    Play = 'Play',
    Pause = 'Pause',
    Stop = 'Stop',
    SkipToNext = 'SkipToNext',
    SkipToPrevious = 'SkipToPrevious',
    Seek = 'Seek',
    SeekTo = 'SeekTo',
    JumpBackward = 'JumpBackward',
    JumpForward = 'JumpForward',
  }
  export enum RepeatMode {
    Off = 0,
    Track = 1,
    Queue = 2,
  }
  export enum State {
    None = 'StateNone',
    Ready = 'StateReady',
    Playing = 'StatePlaying',
    Paused = 'StatePaused',
    Stopped = 'StateStopped',
    Buffering = 'StateBuffering',
    Connecting = 'StateConnecting',
    Error = 'StateError',
  }
  export namespace Event {
    enum PlaybackState {}
    enum PlaybackError {}
    enum PlaybackQueueEnded {}
    enum RemotePlay {}
    enum RemotePause {}
    enum RemoteStop {}
    enum RemoteNext {}
    enum RemotePrevious {}
    enum RemoteSeek {}
    enum RemoteJumpForward {}
    enum RemoteJumpBackward {}
    enum RemoteDuck {}
    enum PlaybackTrackChanged {}
  }
  export function add(tracks: Track[]): Promise<void>;
  export function remove(upToId: string | number): Promise<void>;
  export function removeUpToCurrentIndex(): Promise<void>;
  export function skipToNext(): Promise<void>;
  export function skipToPrevious(): Promise<void>;
  export function skip(id: string | number): Promise<void>;
  export function pause(): Promise<void>;
  export function play(): Promise<void>;
  export function stop(): Promise<void>;
  export function seekTo(seconds: number): Promise<void>;
  export function setVolume(volume: number): Promise<void>;
  export function setRate(rate: number): Promise<void>;
  export function getState(): Promise<State>;
  export function getCurrentTrack(): Promise<string>;
  export function getQueue(): Promise<Track[]>;
  export function getPlaybackState(): Promise<{ state: State }>;
  export function reset(): Promise<void>;
  export function destroy(): Promise<void>;
  export function setupPlayer(options?: any): Promise<void>;
  export function updateOptions(options: any): Promise<void>;
  export function addEventListener<K extends string>(
    type: K,
    listener: (data: any) => void
  ): { remove: () => void };
  export function addListener<K extends string>(
    type: K,
    listener: (data: any) => void
  ): { remove: () => void };
  export default any;
}
