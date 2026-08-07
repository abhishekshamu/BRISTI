import { EventEmitter } from 'events';

export const HERO_CHANGED = 'hero-changed';

export const heroBus = new EventEmitter();
heroBus.setMaxListeners(0);
