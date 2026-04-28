export interface Lesson {
  id: number;
  title: string;
  duration: string;
  completed: boolean;
}

export interface Module {
  id: number;
  title: string;
  icon: string;
  locked: boolean;
  lessons: Lesson[];
}

export const CURRICULUM: Module[] = [
  {
    id: 1,
    title: 'Getting Started',
    icon: '🎸',
    locked: false,
    lessons: [
      { id: 1,  title: 'Welcome to Street Guitar',   duration: '5:20',  completed: true  },
      { id: 2,  title: 'How to Hold the Guitar',     duration: '8:45',  completed: true  },
      { id: 3,  title: 'Reading Chord Diagrams',     duration: '6:30',  completed: true  },
      { id: 4,  title: 'Tuning Your Guitar',         duration: '7:15',  completed: true  },
      { id: 5,  title: 'Your First Sounds',          duration: '9:00',  completed: true  },
    ],
  },
  {
    id: 2,
    title: 'Open Chords & Basics',
    icon: '🎵',
    locked: false,
    lessons: [
      { id: 6,  title: 'The E Minor Chord',           duration: '10:30', completed: true  },
      { id: 7,  title: 'The A Minor Chord',           duration: '9:45',  completed: true  },
      { id: 8,  title: 'The D Major Chord',           duration: '11:20', completed: true  },
      { id: 9,  title: 'The G Major Chord',           duration: '12:00', completed: false },
      { id: 10, title: 'Switching Between Chords',    duration: '14:30', completed: false },
      { id: 11, title: 'The C Major Chord',           duration: '10:15', completed: false },
      { id: 12, title: 'The A Major Chord',           duration: '9:30',  completed: false },
      { id: 13, title: 'Open Chord Progressions',    duration: '15:45', completed: false },
    ],
  },
  {
    id: 3,
    title: 'Rhythm & Strumming',
    icon: '🥁',
    locked: false,
    lessons: [
      { id: 14, title: 'Understanding Rhythm',        duration: '8:00',  completed: false },
      { id: 15, title: 'Down Strumming Patterns',     duration: '11:30', completed: false },
      { id: 16, title: 'Up & Down Patterns',          duration: '13:00', completed: false },
      { id: 17, title: 'The 8th Note Strum',          duration: '12:45', completed: false },
      { id: 18, title: 'Muting Techniques',           duration: '10:20', completed: false },
      { id: 19, title: 'Applying Rhythm to Songs',    duration: '16:00', completed: false },
    ],
  },
  {
    id: 4,
    title: 'Lead Guitar Intro',
    icon: '⚡',
    locked: true,
    lessons: [
      { id: 20, title: 'The Minor Pentatonic Scale',  duration: '12:30', completed: false },
      { id: 21, title: 'Your First Licks',            duration: '14:00', completed: false },
      { id: 22, title: 'Bending Strings',             duration: '11:45', completed: false },
      { id: 23, title: 'Hammer-ons & Pull-offs',      duration: '13:20', completed: false },
      { id: 24, title: 'Vibrato Technique',           duration: '10:50', completed: false },
      { id: 25, title: 'Combining Techniques',        duration: '15:30', completed: false },
      { id: 26, title: 'Lead Over Chord Progressions',duration: '18:00', completed: false },
    ],
  },
  {
    id: 5,
    title: 'Blues Fundamentals',
    icon: '🎼',
    locked: true,
    lessons: [
      { id: 27, title: 'The Blues Scale',             duration: '11:00', completed: false },
      { id: 28, title: 'The 12-Bar Blues',            duration: '14:30', completed: false },
      { id: 29, title: 'Blues Shuffle Rhythm',        duration: '12:15', completed: false },
      { id: 30, title: 'Call & Response Phrasing',    duration: '13:45', completed: false },
      { id: 31, title: 'Classic Blues Licks',         duration: '16:20', completed: false },
      { id: 32, title: 'Blues Improvisation Basics',  duration: '18:30', completed: false },
      { id: 33, title: 'Blues in Different Keys',     duration: '15:00', completed: false },
      { id: 34, title: 'Playing a Full Blues',        duration: '20:00', completed: false },
    ],
  },
  {
    id: 6,
    title: 'Street Style Techniques',
    icon: '🔥',
    locked: true,
    lessons: [
      { id: 35, title: 'What Is Street Guitar?',      duration: '8:30',  completed: false },
      { id: 36, title: 'Percussive Strumming',        duration: '13:00', completed: false },
      { id: 37, title: 'Fingerpicking Basics',        duration: '14:30', completed: false },
      { id: 38, title: 'Hybrid Picking',              duration: '12:45', completed: false },
      { id: 39, title: 'Slide Guitar Intro',          duration: '15:20', completed: false },
      { id: 40, title: 'Open Tunings',                duration: '14:00', completed: false },
      { id: 41, title: 'Playing for an Audience',     duration: '11:30', completed: false },
      { id: 42, title: 'Street Guitar Signature Style',duration:'16:45', completed: false },
      { id: 43, title: 'Building Your Set',           duration: '18:00', completed: false },
      { id: 44, title: 'Putting It All Together',     duration: '22:00', completed: false },
    ],
  },
];

export const ALL_LESSONS = CURRICULUM.flatMap(m => m.lessons);
