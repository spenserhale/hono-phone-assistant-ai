
interface MediaMark {
  mark: string,
  media: string,
}

export class MediaQueue {
  private queue: MediaMark[];
  private active: string | null;

  constructor() {
    this.queue = [];
    this.active = null;
  }

  push(media: string): string {
    const mark = crypto.randomUUID();

    this.queue.push({mark, media});

    return mark;
  }

  shift(): MediaMark | null {
    if (this.active) {
      return null;
    }

    const item = this.queue.shift();
    if (item) {
      this.active = item.mark;
      return item;
    }

    return null;
  }

  remove(mark: string) {
    if (this.active === mark) {
      this.active = null;
    }

    this.queue = this.queue.filter(item => {
      return item.mark !== mark;
    });
  }

  clear() {
    this.queue = [];
    this.active = null;
  }
}