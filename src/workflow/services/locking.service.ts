import { Injectable } from '@nestjs/common';
import { Mutex } from 'async-mutex';

@Injectable()
export class LockingService {
  private mutex: Mutex;

  constructor() {
    this.mutex = new Mutex();
  }

  public async executeWithLock<T>(fn: () => Promise<T>): Promise<T> {
    return this.mutex.runExclusive(fn);
  }
}
