import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  CheckSquare,
  Repeat,
  Play,
  Calendar,
  BarChart3,
  Plus,
  Clock,
  Zap,
  Flame,
  Pause,
  SkipForward,
  Check,
  AlertCircle,
  Trash2,
  Sparkles,
  Coffee,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  X,
  User,
  Wifi,
  WifiOff
} from 'lucide-react';

// --- FIREBASE SETUP (VERCEL ENVIRONMENT VARIABLES) ---
const getEnvVar = (viteKey) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[viteKey]) {
      return import.meta.env[viteKey];
    }
  } catch (e) {}
  return null;
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || "demo-api-key",
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || "demo.firebaseapp.com",
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || "demo-project",
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || "demo.appspot.com",
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || "000000000000",
  appId: getEnvVar('VITE_FIREBASE_APP_ID') || "1:000000000000:web:000000000000"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = getEnvVar('VITE_APP_ID') || 'to-do-list-prod';

const KanbanIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v8a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
  </svg>
);

const INITIAL_TASKS = [
  {
    title: 'Review Q3 Financial Strategy & Quarterly Goals',
    description: 'Analyze budget allocation and burn rate with finance leads.',
    status: 'in_progress',
    priority: 'high',
    energyLevel: 'high',
    estimatedTime: 45,
    dueDate: new Date().toISOString().split('T')[0],
    tags: ['Work', 'Finance'],
    createdAt: new Date().toISOString()
  },
  {
    title: 'Draft API Specification for Auth Service',
    description: 'Define REST endpoints, OAuth tokens, and payload formats.',
    status: 'pending',
    priority: 'high',
    energyLevel: 'high',
    estimatedTime: 60,
    dueDate: new Date().toISOString().split('T')[0],
    tags: ['Dev', 'Architecture'],
    createdAt: new Date().toISOString()
  }
];

const INITIAL_HABITS = [
  {
    title: 'Morning 20-Min Cardio Run',
    targetFrequencyPerWeek: 5,
    category: 'Health',
    streakCount: 6,
    history: [
      new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
      new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0]
    ],
    flexiblePause: false,
    cuePrompt: 'Right after waking up & pouring a glass of water'
  }
];

const INITIAL_ROUTINES = [
  {
    title: 'Morning Peak Startup Routine',
    totalDuration: 45,
    category: 'Morning',
    steps: [
      { id: 'step-1', title: 'Hydration & Light Stretch', durationMinutes: 5, completed: false },
      { id: 'step-2', title: 'Mindfulness & Meditation', durationMinutes: 10, completed: false },
      { id: 'step-3', title: 'Review Top 3 Goals & Daily Priorities', durationMinutes: 10, completed: false },
      { id: 'step-4', title: 'Focused Deep Work Prep & Inbox Zero', durationMinutes: 20, completed: false }
    ]
  }
];

// Permanent dark mode bluish gradient card style
const CARD_STYLE = "bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/60 border border-indigo-900/40 shadow-sm shadow-indigo-950/25 text-slate-100";

export default function App() {
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [isCloudSyncing, setIsCloudSyncing] = useState(true);

  const [currentView, setCurrentView] = useState('today');
  const [energyFilter, setEnergyFilter] = useState('all');
  const [timeAvailableFilter, setTimeAvailableFilter] = useState('all');
  const [quickInput, setQuickInput] = useState('');

  const [activeRoutine, setActiveRoutine] = useState(null);
  const [routineStepIndex, setRoutineStepIndex] = useState(0);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    energyLevel: 'medium',
    estimatedTime: 30,
    dueDate: todayStr,
    tags: 'Work'
  });

  const [newHabit, setNewHabit] = useState({
    title: '',
    targetFrequencyPerWeek: 5,
    category: 'Health',
    cuePrompt: ''
  });

  useEffect(() => {
    signInAnonymously(auth).catch((err) => console.error('Firebase Auth Error:', err));
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setIsCloudSyncing(true);

    const tasksCol = collection(db, 'artifacts', appId, 'users', user.uid, 'tasks');
    const habitsCol = collection(db, 'artifacts', appId, 'users', user.uid, 'habits');
    const routinesCol = collection(db, 'artifacts', appId, 'users', user.uid, 'routines');

    const unsubTasks = onSnapshot(tasksCol, async (snapshot) => {
      if (snapshot.empty) {
        for (const item of INITIAL_TASKS) await addDoc(tasksCol, item);
      } else {
        setTasks(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
      setIsCloudSyncing(false);
    }, () => setIsCloudSyncing(false));

    const unsubHabits = onSnapshot(habitsCol, async (snapshot) => {
      if (snapshot.empty) {
        for (const item of INITIAL_HABITS) await addDoc(habitsCol, item);
      } else {
        setHabits(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    });

    const unsubRoutines = onSnapshot(routinesCol, async (snapshot) => {
      if (snapshot.empty) {
        for (const item of INITIAL_ROUTINES) await addDoc(routinesCol, item);
      } else {
        setRoutines(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    });

    return () => { unsubTasks(); unsubHabits(); unsubRoutines(); };
  }, [user]);

  useEffect(() => {
    if (!activeRoutine || !isTimerRunning) return;
    const interval = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) {
          if (soundEnabled) {
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = ctx.createOscillator();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(587.33, ctx.currentTime);
              osc.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.25);
            } catch (e) {}
          }
          handleNextRoutineStep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeRoutine, isTimerRunning, routineStepIndex, soundEnabled]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, emailInput, passwordInput);
      } else {
        await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
      }
      setEmailInput('');
      setPasswordInput('');
      setAuthModalOpen(false);
    } catch (err) {
      setAuthError(err.message.replace('Firebase: ', ''));
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    await signInAnonymously(auth);
  };

  const handleAddTask = async (e) => {
    if (e) e.preventDefault();
    if (!newTask.title.trim() || !user) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'), {
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      status: 'pending',
      priority: newTask.priority,
      energyLevel: newTask.energyLevel,
      estimatedTime: Number(newTask.estimatedTime) || 15,
      dueDate: newTask.dueDate || todayStr,
      tags: newTask.tags ? newTask.tags.split(',').map((t) => t.trim()) : ['General'],
      createdAt: new Date().toISOString()
    });
    setNewTask({ title: '', description: '', priority: 'medium', energyLevel: 'medium', estimatedTime: 30, dueDate: todayStr, tags: 'Work' });
    setIsTaskModalOpen(false);
  };

  const handleToggleTask = async (taskId) => {
    if (!user) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId), {
      status: task.status === 'completed' ? 'pending' : 'completed'
    });
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId), { status: newStatus });
  };

  const handleDeleteTask = async (taskId) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId));
  };

  const handleAddHabit = async (e) => {
    if (e) e.preventDefault();
    if (!newHabit.title.trim() || !user) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'habits'), {
      title: newHabit.title.trim(),
      targetFrequencyPerWeek: Number(newHabit.targetFrequencyPerWeek) || 7,
      category: newHabit.category || 'General',
      streakCount: 0,
      history: [],
      flexiblePause: false,
      cuePrompt: newHabit.cuePrompt.trim()
    });
    setNewHabit({ title: '', targetFrequencyPerWeek: 5, category: 'Health', cuePrompt: '' });
    setIsHabitModalOpen(false);
  };

  const handleToggleHabitToday = async (habitId) => {
    if (!user) return;
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const isDoneToday = habit.history.includes(todayStr);
    const updatedHistory = isDoneToday ? habit.history.filter((d) => d !== todayStr) : [...habit.history, todayStr];
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'habits', habitId), {
      history: updatedHistory,
      streakCount: updatedHistory.length
    });
  };

  const handleToggleHabitPause = async (habitId) => {
    if (!user) return;
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'habits', habitId), { flexiblePause: !habit.flexiblePause });
  };

  const handleDeleteHabit = async (habitId) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'habits', habitId));
  };

  const startRoutine = (routine) => {
    setActiveRoutine(routine);
    setRoutineStepIndex(0);
    setTimerRemaining((routine.steps[0]?.durationMinutes || 5) * 60);
    setIsTimerRunning(true);
  };

  const handleNextRoutineStep = () => {
    if (!activeRoutine) return;
    if (routineStepIndex < activeRoutine.steps.length - 1) {
      const nextIdx = routineStepIndex + 1;
      setRoutineStepIndex(nextIdx);
      setTimerRemaining((activeRoutine.steps[nextIdx]?.durationMinutes || 5) * 60);
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(false);
      setActiveRoutine(null);
    }
  };

  const handleQuickAddSubmit = async (e) => {
    e.preventDefault();
    if (!quickInput.trim() || !user) return;
    let text = quickInput;
    let priority = 'medium';
    if (text.includes('!high')) { priority = 'high'; text = text.replace('!high', ''); }
    else if (text.includes('!low')) { priority = 'low'; text = text.replace('!low', ''); }

    let energyLevel = 'medium';
    if (text.includes('@high')) { energyLevel = 'high'; text = text.replace('@high', ''); }
    else if (text.includes('@low')) { energyLevel = 'low'; text = text.replace('@low', ''); }

    const tagMatches = text.match(/#(\w+)/g);
    const tags = tagMatches ? tagMatches.map((t) => t.replace('#', '')) : ['Quick-Add'];
    text = text.replace(/#(\w+)/g, '');

    let estimatedTime = 25;
    const timeMatch = text.match(/(\d+)(m|h)/);
    if (timeMatch) {
      const num = parseInt(timeMatch[1], 10);
      estimatedTime = timeMatch[2] === 'h' ? num * 60 : num;
      text = text.replace(/(\d+)(m|h)/, '');
    }

    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'), {
      title: text.trim(),
      description: 'Quick added via Smart NLP box',
      status: 'pending',
      priority,
      energyLevel,
      estimatedTime,
      dueDate: todayStr,
      tags,
      createdAt: new Date().toISOString()
    });
    setQuickInput('');
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (energyFilter !== 'all' && t.energyLevel !== energyFilter) return false;
      if (timeAvailableFilter !== 'all' && t.estimatedTime > parseInt(timeAvailableFilter, 10)) return false;
      return true;
    });
  }, [tasks, energyFilter, timeAvailableFilter]);

  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const taskCompletionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const totalHabits = habits.length;
    const doneHabitsToday = habits.filter((h) => h.history && h.history.includes(todayStr)).length;
    const habitCompletionRate = totalHabits ? Math.round((doneHabitsToday / totalHabits) * 100) : 0;
    return { totalTasks, completedTasks, taskCompletionRate, totalHabits, doneHabitsToday, habitCompletionRate };
  }, [tasks, habits, todayStr]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="dark min-h-screen flex flex-col font-sans bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-opacity-80 border-b border-slate-800 bg-slate-900/70 px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-tr from-indigo-600 to-violet-500 text-white p-2 rounded-xl shadow-md shadow-indigo-500/20">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">
              To do list -_-
            </h1>
            <p className="text-xs text-slate-400 font-medium flex items-center">
              {isCloudSyncing ? (
                <span className="flex items-center text-amber-500"><WifiOff className="w-3 h-3 mr-1 animate-pulse" /> Syncing...</span>
              ) : (
                <span className="flex items-center text-emerald-500"><Wifi className="w-3 h-3 mr-1" /> Cloud Connected</span>
              )}
            </p>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-1 bg-slate-800/60 p-1 rounded-xl">
          {[
            { id: 'today', label: 'Today', icon: Calendar },
            { id: 'kanban', label: 'Board', icon: KanbanIcon },
            { id: 'habits', label: 'Habits', icon: Repeat },
            { id: 'routines', label: 'Routines', icon: Play },
            { id: 'analytics', label: 'Insights', icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentView === tab.id
                    ? 'bg-slate-900 text-indigo-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center space-x-2">
          {user && (
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center space-x-1.5 bg-slate-800 px-3 py-1 rounded-xl text-xs font-mono text-slate-400">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span className="truncate max-w-[120px]">{user.email ? user.email : user.uid.substring(0, 8)}</span>
              </div>
              {user.isAnonymous ? (
                <button
                  onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
                >
                  Log In
                </button>
              ) : (
                <button
                  onClick={handleSignOut}
                  className="bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-300 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                >
                  Sign Out
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-500" />}
          </button>
          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-20 md:pb-8">
        <section>
          <form
            onSubmit={handleQuickAddSubmit}
            className={`${CARD_STYLE} p-2 sm:p-2.5 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all flex items-center space-x-2`}
          >
            <div className="pl-3 text-indigo-500"><Sparkles className="w-4 h-4" /></div>
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Smart capture: e.g. Write blog post 45m !high @high #marketing"
              className="w-full bg-transparent border-none text-xs sm:text-sm focus:outline-none text-slate-100 placeholder-slate-500"
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shrink-0">
              Add Task
            </button>
          </form>
        </section>

        {currentView === 'today' && (
          <div className="space-y-6">
            <div className={`flex flex-wrap items-center justify-between gap-3 ${CARD_STYLE} p-3.5 rounded-2xl`}>
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-300">Smart Filters:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 px-2 flex items-center"><Zap className="w-3 h-3 mr-1" /> Energy:</span>
                  {['all', 'high', 'medium', 'low'].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setEnergyFilter(lvl)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize ${energyFilter === lvl ? 'bg-indigo-600/30 text-indigo-300 shadow-sm' : 'text-slate-400'}`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl">
                  <span className="text-[11px] font-medium text-slate-400 px-2 flex items-center"><Clock className="w-3 h-3 mr-1" /> Time:</span>
                  {[{ label: 'All', val: 'all' }, { label: '≤ 15m', val: '15' }, { label: '≤ 30m', val: '30' }, { label: '≤ 60m', val: '60' }].map((t) => (
                    <button
                      key={t.val}
                      onClick={() => setTimeAvailableFilter(t.val)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${timeAvailableFilter === t.val ? 'bg-indigo-600/30 text-indigo-300 shadow-sm' : 'text-slate-400'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center space-x-2">
                  <CheckSquare className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-base font-bold text-slate-100">Today's Action Items ({filteredTasks.length})</h2>
                </div>
                {filteredTasks.length === 0 ? (
                  <div className={`${CARD_STYLE} rounded-2xl p-8 text-center space-y-2`}>
                    <Coffee className="w-8 h-8 text-indigo-500 mx-auto" />
                    <p className="text-sm font-semibold text-slate-200">No tasks match your filter!</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredTasks.map((task) => (
                      <div key={task.id} className={`group ${CARD_STYLE} p-4 rounded-2xl transition-all ${task.status === 'completed' ? 'opacity-60' : ''}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start space-x-3">
                            <button
                              onClick={() => handleToggleTask(task.id)}
                              className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-indigo-700/60'}`}
                            >
                              {task.status === 'completed' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>
                            <div className="space-y-1">
                              <h3 className={`text-sm font-semibold text-slate-100 ${task.status === 'completed' ? 'line-through text-slate-500' : ''}`}>{task.title}</h3>
                              {task.description && <p className="text-xs text-slate-400">{task.description}</p>}
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-400 border border-indigo-800/40">{task.priority}</span>
                                <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">{task.energyLevel} energy</span>
                                <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">{task.estimatedTime}m</span>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteTask(task.id)} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 border border-indigo-800/50 shadow-md space-y-3">
                  <div className="flex items-center space-x-2">
                    <Play className="w-4 h-4 text-indigo-400 fill-indigo-400" />
                    <h3 className="text-sm font-bold text-white">Quick Routines</h3>
                  </div>
                  {routines.map((rt) => (
                    <div key={rt.id} className="bg-white/10 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white">{rt.title}</p>
                        <p className="text-[10px] text-indigo-300">{rt.steps?.length || 0} steps • {rt.totalDuration}m</p>
                      </div>
                      <button onClick={() => startRoutine(rt)} className="bg-indigo-500 hover:bg-indigo-400 text-white p-2 rounded-lg"><Play className="w-3.5 h-3.5 fill-white" /></button>
                    </div>
                  ))}
                </div>

                <div className={`${CARD_STYLE} rounded-2xl p-5 space-y-3`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-1.5 text-slate-100"><Flame className="w-4 h-4 text-amber-500" /> Habit Check-In</h3>
                    <button onClick={() => setIsHabitModalOpen(true)} className="text-xs text-indigo-400 font-semibold">+ Habit</button>
                  </div>
                  {habits.map((habit) => {
                    const done = habit.history?.includes(todayStr);
                    return (
                      <div key={habit.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-indigo-900/20">
                        <div>
                          <p className="text-xs font-semibold text-slate-200">{habit.title}</p>
                          <p className="text-[10px] text-amber-500">{habit.streakCount || 0} streak</p>
                        </div>
                        <button onClick={() => handleToggleHabitToday(habit.id)} className={`p-2 rounded-xl ${done ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[{ key: 'pending', title: 'Pending' }, { key: 'in_progress', title: 'In Progress' }, { key: 'completed', title: 'Completed' }].map((col) => (
              <div key={col.key} className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 space-y-3 min-h-[400px]">
                <h3 className="text-sm font-bold pb-2 border-b border-slate-800 text-slate-100">{col.title}</h3>
                {tasks.filter((t) => t.status === col.key).map((task) => (
                  <div key={task.id} className={`${CARD_STYLE} p-4 rounded-xl space-y-2`}>
                    <h4 className="text-xs font-bold text-slate-100">{task.title}</h4>
                    <div className="flex gap-1 pt-2 flex-wrap">
                      {['pending', 'in_progress', 'completed'].filter((s) => s !== col.key).map((s) => (
                        <button key={s} onClick={() => handleUpdateTaskStatus(task.id, s)} className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300 capitalize">
                          Move to {s.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {currentView === 'habits' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {habits.map((habit) => (
              <div key={habit.id} className={`${CARD_STYLE} p-5 rounded-2xl space-y-3`}>
                <div className="flex justify-between">
                  <h3 className="text-base font-bold text-slate-100">{habit.title}</h3>
                  <button onClick={() => handleDeleteHabit(habit.id)} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-amber-500 font-bold text-sm">{habit.streakCount} Day Streak</span>
                  <button onClick={() => handleToggleHabitPause(habit.id)} className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                    {habit.flexiblePause ? 'Paused (Streak Saved)' : 'Pause Habit'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {currentView === 'routines' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {routines.map((rt) => (
              <div key={rt.id} className={`${CARD_STYLE} p-5 rounded-2xl space-y-3`}>
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-100">{rt.title}</h3>
                  <button onClick={() => startRoutine(rt)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold">Start</button>
                </div>
                {rt.steps.map((st, idx) => (
                  <div key={st.id} className="flex justify-between items-center p-2 rounded-lg bg-slate-800/50">
                    <span className="text-xs text-slate-300">{idx + 1}. {st.title}</span>
                    <span className="text-[10px] text-slate-400">{st.durationMinutes}m</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {currentView === 'analytics' && (
          <div className={`${CARD_STYLE} p-6 rounded-2xl space-y-6`}>
            <h2 className="text-lg font-bold text-slate-100">Productivity Insights</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-indigo-900/30 space-y-1">
                <p className="text-xs text-slate-400">Task Completion Rate</p>
                <p className="text-2xl font-extrabold text-indigo-400">{stats.taskCompletionRate}%</p>
                <p className="text-[11px] text-slate-400">{stats.completedTasks} of {stats.totalTasks} tasks completed</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-800/60 border border-indigo-900/30 space-y-1">
                <p className="text-xs text-slate-400">Habit Adherence Today</p>
                <p className="text-2xl font-extrabold text-amber-500">{stats.habitCompletionRate}%</p>
                <p className="text-[11px] text-slate-400">{stats.doneHabitsToday} of {stats.totalHabits} habits checked in</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* NEW TASK MODAL */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${CARD_STYLE} w-full max-w-md rounded-2xl p-6 space-y-4 shadow-xl`}>
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100">Create New Task</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddTask} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="What needs to be done?"
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-800 bg-slate-800/60 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Description (Optional)</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Add details..."
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-800 bg-slate-800/60 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-800 bg-slate-800/60 text-xs text-slate-100"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Energy Level</label>
                  <select
                    value={newTask.energyLevel}
                    onChange={(e) => setNewTask({ ...newTask, energyLevel: e.target.value })}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-800 bg-slate-800/60 text-xs text-slate-100"
                  >
                    <option value="high">High Energy</option>
                    <option value="medium">Medium Energy</option>
                    <option value="low">Low Energy</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white">Save Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW HABIT MODAL */}
      {isHabitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${CARD_STYLE} w-full max-w-md rounded-2xl p-6 space-y-4 shadow-xl`}>
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100">Create New Habit</h3>
              <button onClick={() => setIsHabitModalOpen(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddHabit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400">Habit Title</label>
                <input
                  type="text"
                  required
                  value={newHabit.title}
                  onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })}
                  placeholder="e.g. Read 15 pages"
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-800 bg-slate-800/60 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Cue Prompt / Reminder</label>
                <input
                  type="text"
                  value={newHabit.cuePrompt}
                  onChange={(e) => setNewHabit({ ...newHabit, cuePrompt: e.target.value })}
                  placeholder="e.g. Right after dinner"
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-800 bg-slate-800/60 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button type="button" onClick={() => setIsHabitModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white">Save Habit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACTIVE ROUTINE OVERLAY TIMER */}
      {activeRoutine && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-800/50 w-full max-w-lg rounded-3xl p-8 text-center space-y-6 shadow-2xl text-white">
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold">Active Routine</span>
              <h2 className="text-xl font-extrabold">{activeRoutine.title}</h2>
              <p className="text-xs text-slate-400">Step {routineStepIndex + 1} of {activeRoutine.steps.length}: <span className="text-white font-semibold">{activeRoutine.steps[routineStepIndex]?.title}</span></p>
            </div>
            <div className="py-8">
              <span className="text-6xl font-mono font-black tracking-wider text-indigo-400">{formatTime(timerRemaining)}</span>
            </div>
            <div className="flex justify-center items-center space-x-4">
              <button onClick={() => setIsTimerRunning(!isTimerRunning)} className="p-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg">
                {isTimerRunning ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white" />}
              </button>
              <button onClick={handleNextRoutineStep} className="p-4 rounded-full bg-slate-800 hover:bg-slate-700 text-white shadow-lg">
                <SkipForward className="w-6 h-6" />
              </button>
              <button onClick={() => { setActiveRoutine(null); setIsTimerRunning(false); }} className="p-4 rounded-full bg-slate-800 hover:bg-rose-600 text-white shadow-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTH MODAL */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${CARD_STYLE} w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-xl`}>
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-100">{authMode === 'login' ? 'Log In to Cloud' : 'Create Account'}</h3>
              <button onClick={() => setAuthModalOpen(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            {authError && <div className="p-3 rounded-xl bg-rose-950/50 text-rose-400 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{authError}</div>}
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400">Email</label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-800 bg-slate-800/60 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Password</label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-800 bg-slate-800/60 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button type="submit" className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl text-xs font-semibold shadow-sm">
                {authMode === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            </form>
            <div className="text-center pt-2">
              <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-xs text-indigo-400 hover:underline">
                {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
