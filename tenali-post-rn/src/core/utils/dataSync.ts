export type DataSyncTopic =
  | 'all'
  | 'exams'
  | 'mcq'
  | 'liveTests'
  | 'notes'
  | 'videos'
  | 'announcements'
  | 'settings';

type Listener = (topic: DataSyncTopic) => void;

class DataSyncBus {
  private _listeners = new Set<Listener>();
  private _version = 0;

  get version(): number {
    return this._version;
  }

  emit(topic: DataSyncTopic = 'all'): void {
    this._version++;
    for (const listener of this._listeners) {
      try {
        listener(topic);
      } catch {
        // ignore subscriber errors
      }
    }
  }

  subscribe(listener: Listener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }
}

export const DataSync = new DataSyncBus();
