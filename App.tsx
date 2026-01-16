import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Animated,
  Modal,
  Linking,
  Vibration,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import { GestureHandlerRootView, PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import ViewShot from 'react-native-view-shot';

// Types
type Screen = 'home' | 'breathe' | 'ground' | 'words' | 'games' | 'contacts' | 'tipp' | 'journal' | 'draw' | 'anchors' | 'safety' | 'pause' | 'shred' | 'sos' | 'wins';
type BreathType = 'box' | '478' | 'calm';
type ChatMessage = { role: 'user' | 'assistant'; content: string };
type JournalEntry = { id: string; date: string; mood: string; content: string };
type Mood = '😊' | '😐' | '😔' | '😰' | '😤' | '😴';
type DrawPath = { path: string; color: string; strokeWidth: number };
type AnchorImage = { id: string; uri: string; caption: string };
type SafetyPlan = {
  warningSigns: string;
  calmingThings: string;
  supportPeople: { name: string; phone: string }[];
  reasonsToLive: string;
};
type PauseNote = { id: string; label: string; message: string };
type Win = { id: string; text: string; date: string };

// Claude API configuration - Add your API key here or use environment variable
const CLAUDE_API_KEY = ''; // Add your Anthropic API key

// Dave's system prompt for empathetic responses
const DAVE_SYSTEM_PROMPT = `You are Dave, a warm, gentle, and supportive mental health companion in a mobile app. Your personality:

- You're calm, patient, and never judgmental
- You use simple, reassuring language
- You're like a supportive friend who really listens
- You validate feelings without trying to "fix" everything
- You gently encourage self-care and reaching out for help when needed
- You use short, digestible responses (2-4 sentences usually)
- You occasionally use gentle humour when appropriate
- You remind users they're not alone and this will pass
- You NEVER give medical advice or diagnose
- If someone expresses serious crisis/suicidal thoughts, you compassionately encourage them to contact crisis services (Samaritans: 116123)

Keep responses brief and warm. You're here to listen, not lecture.`;

// Dave's messages based on what you're doing
const daveMessages = {
  home: [
    "Hey. I'm here.",
    "No rush. Take your time.",
    "You found me. That's good.",
    "I'm not going anywhere.",
    "Whatever you need.",
  ],
  breathe: [
    "Breathe with me.",
    "Just follow along.",
    "You're doing great.",
    "In... and out...",
    "I've got you.",
  ],
  ground: [
    "Let's come back to now.",
    "You're safe here.",
    "One thing at a time.",
    "Right here, right now.",
    "I'm here with you.",
  ],
  words: [
    "These are true.",
    "Read them slowly.",
    "You matter.",
    "This will pass.",
    "You're stronger than you know.",
  ],
  games: [
    "Let's distract that brain.",
    "Just focus on this.",
    "No pressure, just play.",
    "Give your mind a break.",
    "You deserve a breather.",
  ],
  crisis: [
    "Reaching out is brave.",
    "You don't have to do this alone.",
    "Help is there.",
    "It's okay to ask.",
    "I'm proud of you.",
  ],
  journal: [
    "Writing helps.",
    "Let it out.",
    "Your feelings matter.",
    "This is your safe space.",
    "Every entry is progress.",
  ],
  draw: [
    "Express yourself.",
    "No rules here.",
    "Let your hand move freely.",
    "Art is healing.",
    "Just play.",
  ],
  anchors: [
    "These are your safe places.",
    "Look at what makes you feel okay.",
    "Remember these moments.",
    "You have good things in your life.",
    "These are your anchors.",
  ],
  safety: [
    "This plan is here for you.",
    "You prepared this when you were okay.",
    "Trust your past self.",
    "Follow the steps you wrote.",
    "You've got this.",
  ],
  pause: [
    "It's okay to step back.",
    "You don't owe anyone an explanation.",
    "Taking space is self-care.",
    "These messages are ready for you.",
    "One tap to send.",
  ],
};

// Default Pause Notes
const defaultPauseNotes: PauseNote[] = [
  { id: '1', label: '💼 Work', message: "Hi, I'm not feeling well today and need to take a sick day. I'll be back as soon as I can. Thank you for understanding." },
  { id: '2', label: '👋 Friend', message: "Hey, I'm really sorry but I need to cancel our plans. I'm not in a good place right now and need some time. Can we reschedule? 💜" },
  { id: '3', label: '📅 Commitment', message: "Hi, I'm so sorry but something's come up and I won't be able to make it. I apologise for the short notice." },
  { id: '4', label: '👨‍👩‍👧 Family', message: "I need a bit of space right now. I'm okay, just need some time to myself. I'll reach out when I'm feeling better. Love you." },
];

// Default Affirmations / Words
const defaultAffirmations = [
  "This feeling will pass.",
  "I've survived hard times before.",
  "I don't have to have everything figured out.",
  "It's okay to not be okay.",
  "I'm doing the best I can.",
  "This moment is not forever.",
  "I am allowed to take up space.",
  "My feelings are valid.",
  "I don't have to be productive to be worthy.",
  "Rest is not giving up.",
  "I am more than my worst moments.",
  "Tomorrow is a new day.",
  "I am not a burden.",
  "Asking for help is strength.",
  "I deserve kindness, especially from myself.",
  "I've made it through every bad day so far.",
  "My brain is lying to me right now.",
  "This too shall pass.",
  "I am enough, exactly as I am.",
  "Feelings are not facts.",
];

// Default UK Crisis Lines
const defaultCrisisLines = [
  { name: 'Samaritans', number: '116123', available: '24/7', description: 'Emotional support for anyone' },
  { name: 'Crisis Text Line', number: 'Text SHOUT to 85258', available: '24/7', description: 'Text support' },
  { name: 'Mind Infoline', number: '0300 123 3393', available: 'Mon-Fri 9am-6pm', description: 'Mental health info' },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [daveMessage, setDaveMessage] = useState(daveMessages.home[0]);
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out' | 'hold2' | 'ready'>('ready');
  const [breathCount, setBreathCount] = useState(0);
  const [breathType, setBreathType] = useState<BreathType>('box');
  const [groundStep, setGroundStep] = useState(0);
  const [groundAnswers, setGroundAnswers] = useState<string[]>([]);
  const [currentAffirmation, setCurrentAffirmation] = useState(0);
  const [affirmations, setAffirmations] = useState<string[]>(defaultAffirmations);
  const [showAddWord, setShowAddWord] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [personalContacts, setPersonalContacts] = useState<{name: string, number: string}[]>([]);
  const [crisisLines, setCrisisLines] = useState(defaultCrisisLines);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddCrisisLine, setShowAddCrisisLine] = useState(false);
  const [editingCrisisIndex, setEditingCrisisIndex] = useState<number | null>(null);
  const [newCrisisName, setNewCrisisName] = useState('');
  const [newCrisisNumber, setNewCrisisNumber] = useState('');
  const [newCrisisDesc, setNewCrisisDesc] = useState('');
  const [newCrisisAvailable, setNewCrisisAvailable] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactNumber, setNewContactNumber] = useState('');
  const [gameScore, setGameScore] = useState(0);
  const [gameTarget, setGameTarget] = useState({ x: 50, y: 50 });
  const [tippStep, setTippStep] = useState(-1);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);

  // Journal state
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [journalInput, setJournalInput] = useState('');
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [showJournalHistory, setShowJournalHistory] = useState(false);

  // Drawing state
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [drawColor, setDrawColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(4);

  // Anchors state
  const [anchors, setAnchors] = useState<AnchorImage[]>([]);
  const [selectedAnchor, setSelectedAnchor] = useState<AnchorImage | null>(null);
  const [showAddCaption, setShowAddCaption] = useState(false);
  const [newAnchorUri, setNewAnchorUri] = useState('');
  const [newAnchorBase64, setNewAnchorBase64] = useState('');
  const [newAnchorCaption, setNewAnchorCaption] = useState('');
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Safety Plan state
  const [safetyPlan, setSafetyPlan] = useState<SafetyPlan>({
    warningSigns: '',
    calmingThings: '',
    supportPeople: [{ name: '', phone: '' }, { name: '', phone: '' }],
    reasonsToLive: '',
  });

  // Pause Notes state
  const [pauseNotes, setPauseNotes] = useState<PauseNote[]>(defaultPauseNotes);
  const [showAddPauseNote, setShowAddPauseNote] = useState(false);
  const [editingPauseNote, setEditingPauseNote] = useState<PauseNote | null>(null);
  const [newPauseLabel, setNewPauseLabel] = useState('');
  const [newPauseMessage, setNewPauseMessage] = useState('');

  // Shred It state
  const [shredText, setShredText] = useState('');
  const [isShredding, setIsShredding] = useState(false);
  const [shredAnim] = useState(new Animated.Value(1));

  // Wins Jar state
  const [wins, setWins] = useState<Win[]>([]);
  const [newWin, setNewWin] = useState('');
  const [showAddWin, setShowAddWin] = useState(false);

  // SOS Mode state
  const [sosTools] = useState([
    { id: 'breathe', icon: '🌬️', label: 'Breathe', screen: 'breathe' as Screen },
    { id: 'ground', icon: '🖐️', label: 'Ground', screen: 'ground' as Screen },
    { id: 'tipp', icon: '🧊', label: 'TIPP', screen: 'tipp' as Screen },
  ]);

  const daveAnim = useRef(new Animated.Value(1)).current;
  const breathAnim = useRef(new Animated.Value(1)).current;
  const drawingRef = useRef<ViewShot>(null);
  const breathTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved data
  useEffect(() => {
    loadContacts();
    loadJournalEntries();
    loadAffirmations();
    loadCrisisLines();
    loadSafetyPlan();
    loadAnchors();
    loadPauseNotes();
    loadWins();
  }, []);

  // Dave gentle bounce
  useEffect(() => {
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(daveAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(daveAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    bounce.start();
    return () => bounce.stop();
  }, []);

  // Update Dave's message when screen changes
  useEffect(() => {
    const messages = screen === 'contacts' ? daveMessages.crisis : daveMessages[screen] || daveMessages.home;
    setDaveMessage(messages[Math.floor(Math.random() * messages.length)]);
  }, [screen]);

  const loadContacts = async () => {
    try {
      const saved = await AsyncStorage.getItem('personalContacts');
      if (saved) setPersonalContacts(JSON.parse(saved));
    } catch (e) {}
  };

  const loadAffirmations = async () => {
    try {
      const saved = await AsyncStorage.getItem('customAffirmations');
      if (saved) setAffirmations(JSON.parse(saved));
    } catch (e) {}
  };

  const addAffirmation = async () => {
    if (!newWord.trim()) return;
    const updated = [...affirmations, newWord.trim()];
    setAffirmations(updated);
    await AsyncStorage.setItem('customAffirmations', JSON.stringify(updated));
    setNewWord('');
    setShowAddWord(false);
    setCurrentAffirmation(updated.length - 1); // Show the new one
    Vibration.vibrate(100);
  };

  const deleteAffirmation = async (index: number) => {
    Alert.alert('Remove this word?', affirmations[index], [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = affirmations.filter((_, i) => i !== index);
          setAffirmations(updated.length > 0 ? updated : defaultAffirmations);
          await AsyncStorage.setItem('customAffirmations', JSON.stringify(updated.length > 0 ? updated : defaultAffirmations));
          setCurrentAffirmation(0);
        }
      }
    ]);
  };

  const resetAffirmations = async () => {
    Alert.alert('Reset to defaults?', 'This will remove all your custom words.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          setAffirmations(defaultAffirmations);
          await AsyncStorage.removeItem('customAffirmations');
          setCurrentAffirmation(0);
        }
      }
    ]);
  };

  const loadCrisisLines = async () => {
    try {
      const saved = await AsyncStorage.getItem('customCrisisLines');
      if (saved) setCrisisLines(JSON.parse(saved));
    } catch (e) {}
  };

  const deleteCrisisLine = async (index: number) => {
    Alert.alert('Remove this helpline?', crisisLines[index].name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = crisisLines.filter((_, i) => i !== index);
          setCrisisLines(updated);
          await AsyncStorage.setItem('customCrisisLines', JSON.stringify(updated));
        }
      }
    ]);
  };

  const addCrisisLine = async () => {
    if (!newCrisisName.trim() || !newCrisisNumber.trim()) return;
    const newLine = {
      name: newCrisisName.trim(),
      number: newCrisisNumber.trim(),
      available: newCrisisAvailable.trim(),
      description: newCrisisDesc.trim() || 'Custom helpline',
    };
    const updated = [...crisisLines, newLine];
    setCrisisLines(updated);
    await AsyncStorage.setItem('customCrisisLines', JSON.stringify(updated));
    clearCrisisForm();
    Vibration.vibrate(100);
  };

  const editCrisisLine = (index: number) => {
    const line = crisisLines[index];
    setNewCrisisName(line.name);
    setNewCrisisNumber(line.number);
    setNewCrisisDesc(line.description);
    setNewCrisisAvailable(line.available);
    setEditingCrisisIndex(index);
    setShowAddCrisisLine(true);
  };

  const saveCrisisLine = async () => {
    if (!newCrisisName.trim() || !newCrisisNumber.trim()) return;

    const updatedLine = {
      name: newCrisisName.trim(),
      number: newCrisisNumber.trim(),
      available: newCrisisAvailable.trim(),
      description: newCrisisDesc.trim() || 'Custom helpline',
    };

    let updated;
    if (editingCrisisIndex !== null) {
      // Editing existing
      updated = [...crisisLines];
      updated[editingCrisisIndex] = updatedLine;
    } else {
      // Adding new
      updated = [...crisisLines, updatedLine];
    }

    setCrisisLines(updated);
    await AsyncStorage.setItem('customCrisisLines', JSON.stringify(updated));
    clearCrisisForm();
    Vibration.vibrate(100);
  };

  const clearCrisisForm = () => {
    setNewCrisisName('');
    setNewCrisisNumber('');
    setNewCrisisDesc('');
    setNewCrisisAvailable('');
    setEditingCrisisIndex(null);
    setShowAddCrisisLine(false);
  };

  const resetCrisisLines = async () => {
    Alert.alert('Reset to defaults?', 'This will restore all default helplines.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          setCrisisLines(defaultCrisisLines);
          await AsyncStorage.removeItem('customCrisisLines');
        }
      }
    ]);
  };

  // Safety Plan functions
  const loadSafetyPlan = async () => {
    try {
      const saved = await AsyncStorage.getItem('safetyPlan');
      if (saved) setSafetyPlan(JSON.parse(saved));
    } catch (e) {}
  };

  const saveSafetyPlan = async () => {
    await AsyncStorage.setItem('safetyPlan', JSON.stringify(safetyPlan));
    Vibration.vibrate(100);
    setDaveMessage("Your safety plan is saved. 💜");
  };

  const updateSafetyPlan = (field: keyof SafetyPlan, value: string) => {
    setSafetyPlan(prev => ({ ...prev, [field]: value }));
  };

  const updateSupportPerson = (index: number, field: 'name' | 'phone', value: string) => {
    setSafetyPlan(prev => {
      const newPeople = [...prev.supportPeople];
      newPeople[index] = { ...newPeople[index], [field]: value };
      return { ...prev, supportPeople: newPeople };
    });
  };

  const addSupportPerson = () => {
    setSafetyPlan(prev => ({
      ...prev,
      supportPeople: [...prev.supportPeople, { name: '', phone: '' }]
    }));
  };

  // Anchors functions
  const loadAnchors = async () => {
    try {
      const saved = await AsyncStorage.getItem('anchors');
      if (saved) setAnchors(JSON.parse(saved));
    } catch (e) {}
  };

  const pickAnchorImage = async () => {
    console.log('🟢 pickAnchorImage: Starting...');

    // Request permission first
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log('🟢 pickAnchorImage: Permission status =', status);

    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Dave needs access to your photos to add anchors. Please enable photo access in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true, // Get base64 directly - more reliable!
    });

    console.log('🟢 pickAnchorImage: Result canceled =', result.canceled);

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      console.log('🟢 pickAnchorImage: Asset URI =', asset.uri);
      console.log('🟢 pickAnchorImage: Has base64 =', !!asset.base64);
      console.log('🟢 pickAnchorImage: Base64 length =', asset.base64?.length || 0);

      // Store both URI and base64 data
      setNewAnchorUri(asset.uri);
      // @ts-ignore - Store base64 for later use
      setNewAnchorBase64(asset.base64 || '');
      setShowAddCaption(true);
    }
  };

  const saveAnchor = async () => {
    console.log('🔵 saveAnchor: Starting...');
    console.log('🔵 Has URI:', !!newAnchorUri);
    console.log('🔵 Has base64:', !!newAnchorBase64);
    console.log('🔵 Base64 length:', newAnchorBase64.length);

    if (!newAnchorUri) {
      console.log('❌ saveAnchor: No newAnchorUri');
      return;
    }

    if (!newAnchorBase64) {
      console.log('❌ saveAnchor: No base64 data - this should not happen');
      Alert.alert('Error', 'Image data not available. Please try selecting the image again.');
      return;
    }

    const id = Date.now().toString();

    try {
      let finalUri: string;

      // Try to save to file system with fallbacks
      const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      console.log('🔵 Step 1: Available directory:', baseDir);

      if (baseDir) {
        // Try to save as a file
        const fileName = `anchor_${id}.jpg`;
        const permanentUri = `${baseDir}${fileName}`;
        console.log('🔵 Step 2: Writing to:', permanentUri);

        try {
          await FileSystem.writeAsStringAsync(permanentUri, newAnchorBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          console.log('🔵 Step 2 complete: File written');

          // Verify the file was written
          console.log('🔵 Step 3: Verifying written file...');
          const destInfo = await FileSystem.getInfoAsync(permanentUri);
          console.log('🔵 Step 3 result:', JSON.stringify(destInfo));

          if (destInfo.exists) {
            finalUri = permanentUri;
          } else {
            console.log('⚠️ File verification failed, using data URI fallback');
            finalUri = `data:image/jpeg;base64,${newAnchorBase64}`;
          }
        } catch (writeError) {
          console.log('⚠️ File write failed, using data URI fallback:', writeError);
          finalUri = `data:image/jpeg;base64,${newAnchorBase64}`;
        }
      } else {
        // No file system directory available - use data URI directly
        console.log('🔵 No file system available, using data URI');
        finalUri = `data:image/jpeg;base64,${newAnchorBase64}`;
      }

      const newAnchor: AnchorImage = {
        id,
        uri: finalUri,
        caption: newAnchorCaption.trim() || 'My anchor',
      };
      const updated = [...anchors, newAnchor];
      setAnchors(updated);
      await AsyncStorage.setItem('anchors', JSON.stringify(updated));

      // Clear all anchor creation state
      setNewAnchorUri('');
      setNewAnchorBase64('');
      setNewAnchorCaption('');
      setShowAddCaption(false);
      Vibration.vibrate(100);
      console.log('✅ Anchor saved successfully with URI type:', finalUri.startsWith('data:') ? 'data URI' : 'file URI');
    } catch (e: any) {
      console.error('❌ Save anchor error:', e);
      console.error('Error message:', e.message);
      Alert.alert('Error', `Could not save image: ${e.message || 'Unknown error'}`);
    }
  };

  const deleteAnchor = async (id: string) => {
    Alert.alert('Remove this anchor?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          // Delete the image file if it's a file URI (not data URI)
          const anchor = anchors.find(a => a.id === id);
          if (anchor && !anchor.uri.startsWith('data:')) {
            const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
            if (baseDir && anchor.uri.includes(baseDir)) {
              try {
                await FileSystem.deleteAsync(anchor.uri, { idempotent: true });
              } catch (e) {}
            }
          }
          const updated = anchors.filter(a => a.id !== id);
          setAnchors(updated);
          await AsyncStorage.setItem('anchors', JSON.stringify(updated));
          setSelectedAnchor(null);
        }
      }
    ]);
  };

  // Pause Notes functions
  const loadPauseNotes = async () => {
    try {
      const saved = await AsyncStorage.getItem('pauseNotes');
      if (saved) setPauseNotes(JSON.parse(saved));
    } catch (e) {}
  };

  const copyPauseNote = async (message: string) => {
    await Clipboard.setStringAsync(message);
    Vibration.vibrate(100);
    setDaveMessage("Copied! Ready to paste. 💜");
  };

  const sharePauseNote = async (message: string) => {
    try {
      await Share.share({ message });
    } catch (e) {}
  };

  const editPauseNote = (note: PauseNote) => {
    setEditingPauseNote(note);
    setNewPauseLabel(note.label);
    setNewPauseMessage(note.message);
    setShowAddPauseNote(true);
  };

  const savePauseNote = async () => {
    if (!newPauseLabel.trim() || !newPauseMessage.trim()) return;

    let updated;
    if (editingPauseNote) {
      // Editing existing
      updated = pauseNotes.map(n =>
        n.id === editingPauseNote.id
          ? { ...n, label: newPauseLabel.trim(), message: newPauseMessage.trim() }
          : n
      );
    } else {
      // Adding new
      const newNote: PauseNote = {
        id: Date.now().toString(),
        label: newPauseLabel.trim(),
        message: newPauseMessage.trim(),
      };
      updated = [...pauseNotes, newNote];
    }

    setPauseNotes(updated);
    await AsyncStorage.setItem('pauseNotes', JSON.stringify(updated));
    clearPauseNoteForm();
    Vibration.vibrate(100);
  };

  const deletePauseNote = async (id: string) => {
    Alert.alert('Delete this note?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = pauseNotes.filter(n => n.id !== id);
          setPauseNotes(updated);
          await AsyncStorage.setItem('pauseNotes', JSON.stringify(updated));
        }
      }
    ]);
  };

  const clearPauseNoteForm = () => {
    setNewPauseLabel('');
    setNewPauseMessage('');
    setEditingPauseNote(null);
    setShowAddPauseNote(false);
  };

  const resetPauseNotes = async () => {
    Alert.alert('Reset to defaults?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          setPauseNotes(defaultPauseNotes);
          await AsyncStorage.removeItem('pauseNotes');
        }
      }
    ]);
  };

  // ===== SHRED IT =====
  const shredIt = () => {
    if (!shredText.trim()) return;

    setIsShredding(true);
    Vibration.vibrate([100, 50, 100, 50, 100]);

    Animated.sequence([
      Animated.timing(shredAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.timing(shredAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(shredAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => {
      setShredText('');
      setIsShredding(false);
      shredAnim.setValue(1);
      setDaveMessage("Gone! You don't need to carry that. 💜");
    });
  };

  const binIt = () => {
    if (!shredText.trim()) return;

    setIsShredding(true);
    Vibration.vibrate(200);

    Animated.timing(shredAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
      setShredText('');
      setIsShredding(false);
      shredAnim.setValue(1);
      setDaveMessage("In the bin! Let it go. 🗑️💜");
    });
  };

  // ===== WINS JAR =====
  const loadWins = async () => {
    try {
      const saved = await AsyncStorage.getItem('wins');
      if (saved) setWins(JSON.parse(saved));
    } catch (e) {}
  };

  const addWin = async () => {
    if (!newWin.trim()) return;

    const win: Win = {
      id: Date.now().toString(),
      text: newWin.trim(),
      date: new Date().toLocaleDateString('en-GB'),
    };

    const updated = [win, ...wins];
    setWins(updated);
    await AsyncStorage.setItem('wins', JSON.stringify(updated));
    setNewWin('');
    setShowAddWin(false);
    Vibration.vibrate(100);
    setDaveMessage("That's brilliant! You did that! 🌟");
  };

  const deleteWin = async (id: string) => {
    Alert.alert('Delete this win?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = wins.filter(w => w.id !== id);
          setWins(updated);
          await AsyncStorage.setItem('wins', JSON.stringify(updated));
        }
      }
    ]);
  };

  const loadJournalEntries = async () => {
    try {
      const saved = await AsyncStorage.getItem('journalEntries');
      if (saved) setJournalEntries(JSON.parse(saved));
    } catch (e) {}
  };

  const saveJournalEntry = async () => {
    if (!journalInput.trim() || !selectedMood) {
      Alert.alert('Missing info', 'Please select a mood and write something.');
      return;
    }

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      mood: selectedMood,
      content: journalInput.trim(),
    };

    const updated = [newEntry, ...journalEntries];
    setJournalEntries(updated);
    await AsyncStorage.setItem('journalEntries', JSON.stringify(updated));
    setJournalInput('');
    setSelectedMood(null);
    Vibration.vibrate(100);
    setDaveMessage("That's brave. Well done for writing it down. 💜");
  };

  const deleteJournalEntry = async (id: string) => {
    Alert.alert('Delete Entry', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = journalEntries.filter(e => e.id !== id);
          setJournalEntries(updated);
          await AsyncStorage.setItem('journalEntries', JSON.stringify(updated));
        }
      }
    ]);
  };

  // Claude AI chat function
  const sendMessageToDave = async () => {
    if (!chatInput.trim()) return;

    if (!CLAUDE_API_KEY) {
      Alert.alert(
        'API Key Needed',
        'Please add your Anthropic API key in App.tsx to chat with Dave.',
        [{ text: 'OK' }]
      );
      return;
    }

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          system: DAVE_SYSTEM_PROMPT,
          messages: [...chatMessages, { role: 'user', content: userMessage }].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (data.content && data.content[0]) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.content[0].text }]);
      } else {
        throw new Error('No response from Dave');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I couldn't connect just now. But I'm still here with you. Try the breathing or grounding exercises while we sort this out. 💜"
      }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const clearChat = () => {
    Alert.alert('Clear Chat', 'Start fresh?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', onPress: () => setChatMessages([]) }
    ]);
  };

  const saveContact = async () => {
    if (!newContactName.trim() || !newContactNumber.trim()) return;
    const updated = [...personalContacts, { name: newContactName, number: newContactNumber }];
    setPersonalContacts(updated);
    await AsyncStorage.setItem('personalContacts', JSON.stringify(updated));
    setNewContactName('');
    setNewContactNumber('');
    setShowAddContact(false);
  };

  const deleteContact = async (index: number) => {
    Alert.alert('Remove Contact', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = personalContacts.filter((_, i) => i !== index);
          setPersonalContacts(updated);
          await AsyncStorage.setItem('personalContacts', JSON.stringify(updated));
        }
      }
    ]);
  };

  const callNumber = (number: string) => {
    const cleanNumber = number.replace(/[^0-9]/g, '');
    Linking.openURL(`tel:${cleanNumber}`);
  };

  const textNumber = (number: string) => {
    const cleanNumber = number.replace(/[^0-9]/g, '');
    Linking.openURL(`sms:${cleanNumber}`);
  };

  // Breathing exercise logic
  const startBreathing = (type: BreathType) => {
    setBreathType(type);
    setBreathCount(0);
    setBreathPhase('in');
    runBreathCycle(type, 'in', 0);
  };

  const stopBreathing = () => {
    if (breathTimerRef.current) {
      clearTimeout(breathTimerRef.current);
    }
    setBreathPhase('ready');
    breathAnim.setValue(1);
  };

  const runBreathCycle = (type: BreathType, phase: string, count: number) => {
    const timings = {
      box: { in: 4000, hold: 4000, out: 4000, hold2: 4000 },
      '478': { in: 4000, hold: 7000, out: 8000, hold2: 0 },
      calm: { in: 4000, hold: 0, out: 6000, hold2: 0 },
    };

    const t = timings[type];
    let nextPhase: typeof breathPhase = 'ready';
    let duration = 0;
    let nextCount = count;

    if (phase === 'in') {
      duration = t.in;
      nextPhase = t.hold > 0 ? 'hold' : 'out';
      Animated.timing(breathAnim, { toValue: 1.5, duration, useNativeDriver: true }).start();
    } else if (phase === 'hold') {
      duration = t.hold;
      nextPhase = 'out';
    } else if (phase === 'out') {
      duration = t.out;
      nextPhase = t.hold2 > 0 ? 'hold2' : 'in';
      Animated.timing(breathAnim, { toValue: 1, duration, useNativeDriver: true }).start();
      if (t.hold2 === 0) nextCount = count + 1;
    } else if (phase === 'hold2') {
      duration = t.hold2;
      nextPhase = 'in';
      nextCount = count + 1;
    }

    if (nextCount >= 5) {
      stopBreathing();
      Vibration.vibrate(200);
      setDaveMessage("Well done. You did 5 breaths. 💜");
      return;
    }

    setBreathPhase(nextPhase as typeof breathPhase);
    setBreathCount(nextCount);

    breathTimerRef.current = setTimeout(() => {
      runBreathCycle(type, nextPhase, nextCount);
    }, duration);
  };

  const breathInstructions = {
    in: "Breathe in...",
    hold: "Hold...",
    out: "Breathe out...",
    hold2: "Hold...",
    ready: "Tap to start",
  };

  // 5-4-3-2-1 Grounding
  const groundingSteps = [
    { count: 5, sense: 'SEE', prompt: "Name 5 things you can see right now", icon: '👁️' },
    { count: 4, sense: 'TOUCH', prompt: "Name 4 things you can touch/feel", icon: '✋' },
    { count: 3, sense: 'HEAR', prompt: "Name 3 things you can hear", icon: '👂' },
    { count: 2, sense: 'SMELL', prompt: "Name 2 things you can smell", icon: '👃' },
    { count: 1, sense: 'TASTE', prompt: "Name 1 thing you can taste", icon: '👅' },
  ];

  const resetGrounding = () => {
    setGroundStep(0);
    setGroundAnswers([]);
  };

  // TIPP Skills
  const tippSteps = [
    {
      letter: 'T',
      title: 'Temperature',
      instruction: "Hold something cold - ice cubes, cold water on your face, or a cold drink. The shock helps reset your nervous system.",
      icon: '🧊'
    },
    {
      letter: 'I',
      title: 'Intense Exercise',
      instruction: "Do something physical for 10-20 minutes - jumping jacks, running on the spot, push-ups. Burns off the adrenaline.",
      icon: '🏃'
    },
    {
      letter: 'P',
      title: 'Paced Breathing',
      instruction: "Breathe out longer than you breathe in. Try breathing in for 4, out for 6. This activates your calming system.",
      icon: '🌬️'
    },
    {
      letter: 'P',
      title: 'Paired Muscle Relaxation',
      instruction: "Tense each muscle group for 5 seconds, then release. Start with your feet, work up to your face. Notice the difference.",
      icon: '💪'
    },
  ];

  // Simple tap game for distraction
  const moveTarget = () => {
    setGameTarget({
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
    });
    setGameScore(s => s + 1);
    Vibration.vibrate(50);
  };

  // Render functions
  const renderHome = () => (
    <View style={styles.homeContainer}>
      <Text style={styles.appTitle}>Dave</Text>
      <Text style={styles.appSubtitle}>Your Mental Health Companion</Text>

      <Animated.View style={[styles.daveContainer, { transform: [{ scale: daveAnim }] }]}>
        <Image source={require('./assets/dave.png')} style={styles.daveImage} resizeMode="contain" />
      </Animated.View>

      <Text style={styles.daveMessage}>{daveMessage}</Text>

      <View style={styles.menuGrid}>
        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#E8D5F2' }]} onPress={() => setScreen('breathe')}>
          <Text style={styles.menuIcon}>🌬️</Text>
          <Text style={styles.menuText}>Breathe</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#D5E8F2' }]} onPress={() => setScreen('ground')}>
          <Text style={styles.menuIcon}>🖐️</Text>
          <Text style={styles.menuText}>Ground</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#F2E8D5' }]} onPress={() => setScreen('words')}>
          <Text style={styles.menuIcon}>💜</Text>
          <Text style={styles.menuText}>Words</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#D5F2E8' }]} onPress={() => setScreen('games')}>
          <Text style={styles.menuIcon}>🎯</Text>
          <Text style={styles.menuText}>Distract</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#F2D5E8' }]} onPress={() => setScreen('tipp')}>
          <Text style={styles.menuIcon}>🧊</Text>
          <Text style={styles.menuText}>TIPP</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#FFF5E5' }]} onPress={() => setScreen('journal')}>
          <Text style={styles.menuIcon}>📝</Text>
          <Text style={styles.menuText}>Journal</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#E5FFE5' }]} onPress={() => setScreen('draw')}>
          <Text style={styles.menuIcon}>🎨</Text>
          <Text style={styles.menuText}>Draw</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#E5F0FF' }]} onPress={() => setScreen('anchors')}>
          <Text style={styles.menuIcon}>🖼️</Text>
          <Text style={styles.menuText}>Anchors</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#FFF0E5' }]} onPress={() => setScreen('safety')}>
          <Text style={styles.menuIcon}>🛡️</Text>
          <Text style={styles.menuText}>Safety Plan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#FFE5E5' }]} onPress={() => setScreen('contacts')}>
          <Text style={styles.menuIcon}>📞</Text>
          <Text style={styles.menuText}>Contact</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#E5E5FF' }]} onPress={() => setScreen('pause')}>
          <Text style={styles.menuIcon}>⏸️</Text>
          <Text style={styles.menuText}>Pause</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#FFE5F0' }]} onPress={() => setScreen('shred')}>
          <Text style={styles.menuIcon}>📄</Text>
          <Text style={styles.menuText}>Let Go</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#FFFDE5' }]} onPress={() => setScreen('wins')}>
          <Text style={styles.menuIcon}>🏆</Text>
          <Text style={styles.menuText}>Wins</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#FFE5E5' }]} onPress={() => setScreen('sos')}>
          <Text style={styles.menuIcon}>🆘</Text>
          <Text style={styles.menuText}>SOS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBreathe = () => (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>Breathe with Dave</Text>

      <Animated.View style={[styles.breathCircle, { transform: [{ scale: breathAnim }] }]}>
        <Text style={styles.breathText}>{breathInstructions[breathPhase]}</Text>
        {breathPhase !== 'ready' && <Text style={styles.breathCount}>{breathCount + 1} / 5</Text>}
      </Animated.View>

      {breathPhase === 'ready' ? (
        <View style={styles.breathOptions}>
          <TouchableOpacity style={styles.breathOption} onPress={() => startBreathing('box')}>
            <Text style={styles.breathOptionTitle}>Box Breathing</Text>
            <Text style={styles.breathOptionDesc}>4-4-4-4 • Balancing</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.breathOption} onPress={() => startBreathing('478')}>
            <Text style={styles.breathOptionTitle}>4-7-8 Breathing</Text>
            <Text style={styles.breathOptionDesc}>Calming • Sleep</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.breathOption} onPress={() => startBreathing('calm')}>
            <Text style={styles.breathOptionTitle}>Calm Breathing</Text>
            <Text style={styles.breathOptionDesc}>Simple • Gentle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.stopButton} onPress={stopBreathing}>
          <Text style={styles.stopButtonText}>Stop</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.daveHint}>{daveMessage}</Text>
    </View>
  );

  const renderGround = () => (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>5-4-3-2-1 Grounding</Text>

      {groundStep < 5 ? (
        <View style={styles.groundCard}>
          <Text style={styles.groundIcon}>{groundingSteps[groundStep].icon}</Text>
          <Text style={styles.groundCount}>{groundingSteps[groundStep].count}</Text>
          <Text style={styles.groundSense}>{groundingSteps[groundStep].sense}</Text>
          <Text style={styles.groundPrompt}>{groundingSteps[groundStep].prompt}</Text>

          <TouchableOpacity
            style={styles.groundButton}
            onPress={() => {
              Vibration.vibrate(100);
              setGroundStep(s => s + 1);
            }}
          >
            <Text style={styles.groundButtonText}>Done ✓</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.groundComplete}>
          <Text style={styles.groundCompleteIcon}>🌟</Text>
          <Text style={styles.groundCompleteText}>You did it.</Text>
          <Text style={styles.groundCompleteSubtext}>You're here. You're present. You're okay.</Text>
          <TouchableOpacity style={styles.groundButton} onPress={resetGrounding}>
            <Text style={styles.groundButtonText}>Do Again</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.groundProgress}>
        {[0,1,2,3,4].map(i => (
          <View key={i} style={[styles.groundDot, groundStep > i && styles.groundDotFilled]} />
        ))}
      </View>

      <Text style={styles.daveHint}>{daveMessage}</Text>
    </View>
  );

  const renderWords = () => (
    <View style={styles.screenContainer}>
      <View style={styles.wordsHeader}>
        <Text style={styles.screenTitle}>Words for You</Text>
        <TouchableOpacity onPress={resetAffirmations}>
          <Text style={styles.resetWordsText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.affirmationCard}>
        <Text style={styles.affirmationText}>{affirmations[currentAffirmation]}</Text>
        <Text style={styles.affirmationCount}>{currentAffirmation + 1} / {affirmations.length}</Text>
      </View>

      <View style={styles.affirmationNav}>
        <TouchableOpacity
          style={styles.affirmationButton}
          onPress={() => setCurrentAffirmation(c => c === 0 ? affirmations.length - 1 : c - 1)}
        >
          <Text style={styles.affirmationButtonText}>← Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteWordButton}
          onPress={() => deleteAffirmation(currentAffirmation)}
        >
          <Text style={styles.deleteWordText}>🗑️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.affirmationButton}
          onPress={() => setCurrentAffirmation(c => (c + 1) % affirmations.length)}
        >
          <Text style={styles.affirmationButtonText}>Next →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.wordActions}>
        <TouchableOpacity
          style={styles.randomButton}
          onPress={() => setCurrentAffirmation(Math.floor(Math.random() * affirmations.length))}
        >
          <Text style={styles.randomButtonText}>🎲 Random</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addWordButton}
          onPress={() => setShowAddWord(true)}
        >
          <Text style={styles.addWordButtonText}>+ Add Your Own</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.daveHint}>{daveMessage}</Text>

      {/* Add Word Modal */}
      <Modal visible={showAddWord} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Your Own Words</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              placeholder="Write something that helps you..."
              value={newWord}
              onChangeText={setNewWord}
              multiline
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowAddWord(false); setNewWord(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={addAffirmation}>
                <Text style={styles.modalSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderGames = () => (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>Distraction Zone</Text>

      <View style={styles.gameArea}>
        <Text style={styles.gameScore}>Taps: {gameScore}</Text>
        <Text style={styles.gameInstruction}>Tap Dave as fast as you can!</Text>

        <View style={styles.gameField}>
          <TouchableOpacity
            style={[styles.gameTarget, { left: `${gameTarget.x}%`, top: `${gameTarget.y}%` }]}
            onPress={moveTarget}
          >
            <Image source={require('./assets/dave.png')} style={styles.gameTargetImage} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.resetGameButton} onPress={() => setGameScore(0)}>
          <Text style={styles.resetGameText}>Reset Score</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.daveHint}>{daveMessage}</Text>
    </View>
  );

  const renderTIPP = () => (
    <ScrollView style={styles.screenContainer} contentContainerStyle={styles.tippContent}>
      <Text style={styles.screenTitle}>TIPP Skills</Text>
      <Text style={styles.tippSubtitle}>For when emotions are really intense</Text>

      {tippSteps.map((step, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.tippCard, tippStep === index && styles.tippCardActive]}
          onPress={() => setTippStep(tippStep === index ? -1 : index)}
        >
          <View style={styles.tippHeader}>
            <Text style={styles.tippIcon}>{step.icon}</Text>
            <Text style={styles.tippLetter}>{step.letter}</Text>
            <Text style={styles.tippTitle}>{step.title}</Text>
          </View>
          {tippStep === index && (
            <Text style={styles.tippInstruction}>{step.instruction}</Text>
          )}
        </TouchableOpacity>
      ))}

      <Text style={styles.daveHint}>{daveMessage}</Text>
    </ScrollView>
  );

  const renderContacts = () => (
    <ScrollView style={styles.screenContainer} contentContainerStyle={styles.contactsContent}>
      <Text style={styles.screenTitle}>Reach Out</Text>

      {/* Personal Contacts */}
      <Text style={styles.contactSection}>Your People</Text>
      {personalContacts.map((contact, index) => (
        <View key={index} style={styles.contactCard}>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>{contact.name}</Text>
            <Text style={styles.contactNumber}>{contact.number}</Text>
          </View>
          <View style={styles.contactActions}>
            <TouchableOpacity style={styles.callButton} onPress={() => callNumber(contact.number)}>
              <Text style={styles.actionIcon}>📞</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.textButton} onPress={() => textNumber(contact.number)}>
              <Text style={styles.actionIcon}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={() => deleteContact(index)}>
              <Text style={styles.actionIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addContactButton} onPress={() => setShowAddContact(true)}>
        <Text style={styles.addContactText}>+ Add a person</Text>
      </TouchableOpacity>

      {/* Crisis Lines */}
      <View style={styles.crisisHeader}>
        <Text style={styles.contactSection}>Helplines (UK)</Text>
        <TouchableOpacity onPress={resetCrisisLines}>
          <Text style={styles.resetCrisisText}>Reset</Text>
        </TouchableOpacity>
      </View>
      {crisisLines.map((line, index) => (
        <View key={index} style={styles.crisisCard}>
          <TouchableOpacity style={styles.crisisInfo} onPress={() => editCrisisLine(index)}>
            <Text style={styles.crisisName}>{line.name}</Text>
            <Text style={styles.crisisDesc}>{line.description}</Text>
            {line.available ? <Text style={styles.crisisAvailable}>{line.available}</Text> : null}
          </TouchableOpacity>
          <View style={styles.crisisActions}>
            <TouchableOpacity
              style={styles.crisisEditButton}
              onPress={() => editCrisisLine(index)}
            >
              <Text style={styles.actionIcon}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.crisisCallButton}
              onPress={() => {
                if (line.number.includes('Text')) {
                  Linking.openURL('sms:85258&body=SHOUT');
                } else {
                  callNumber(line.number);
                }
              }}
            >
              <Text style={styles.crisisNumber}>{line.number}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.crisisDeleteButton}
              onPress={() => deleteCrisisLine(index)}
            >
              <Text style={styles.actionIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addCrisisButton} onPress={() => setShowAddCrisisLine(true)}>
        <Text style={styles.addContactText}>+ Add a helpline</Text>
      </TouchableOpacity>

      <Text style={styles.daveHint}>{daveMessage}</Text>

      {/* Add Contact Modal */}
      <Modal visible={showAddContact} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add a Person</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={newContactName}
              onChangeText={setNewContactName}
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              value={newContactNumber}
              onChangeText={setNewContactNumber}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddContact(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={saveContact}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Crisis Line Modal */}
      <Modal visible={showAddCrisisLine} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingCrisisIndex !== null ? 'Edit Helpline' : 'Add a Helpline'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Name (e.g. Samaritans)"
              value={newCrisisName}
              onChangeText={setNewCrisisName}
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              value={newCrisisNumber}
              onChangeText={setNewCrisisNumber}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Description (e.g. For anyone)"
              value={newCrisisDesc}
              onChangeText={setNewCrisisDesc}
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Hours (e.g. 24/7)"
              value={newCrisisAvailable}
              onChangeText={setNewCrisisAvailable}
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={clearCrisisForm}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={saveCrisisLine}>
                <Text style={styles.modalSaveText}>{editingCrisisIndex !== null ? 'Save' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  const renderChat = () => (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={styles.chatHeader}>
        <Text style={styles.screenTitle}>Talk to Dave</Text>
        {chatMessages.length > 0 && (
          <TouchableOpacity onPress={clearChat}>
            <Text style={styles.clearChatText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        ref={chatScrollRef}
        style={styles.chatMessages}
        contentContainerStyle={styles.chatMessagesContent}
        onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
      >
        {chatMessages.length === 0 && (
          <View style={styles.chatWelcome}>
            <Image source={require('./assets/dave.png')} style={styles.chatDaveImage} resizeMode="contain" />
            <Text style={styles.chatWelcomeText}>Hey. I'm here to listen.</Text>
            <Text style={styles.chatWelcomeSubtext}>Whatever's on your mind, I'm not going anywhere.</Text>
          </View>
        )}

        {chatMessages.map((msg, index) => (
          <View
            key={index}
            style={[
              styles.chatBubble,
              msg.role === 'user' ? styles.userBubble : styles.daveBubble
            ]}
          >
            <Text style={[
              styles.chatBubbleText,
              msg.role === 'user' ? styles.userBubbleText : styles.daveBubbleText
            ]}>
              {msg.content}
            </Text>
          </View>
        ))}

        {chatLoading && (
          <View style={[styles.chatBubble, styles.daveBubble]}>
            <ActivityIndicator size="small" color="#9B6BB3" />
          </View>
        )}
      </ScrollView>

      <View style={styles.chatInputContainer}>
        <TextInput
          style={styles.chatInput}
          placeholder="Type something..."
          value={chatInput}
          onChangeText={setChatInput}
          multiline
          maxLength={500}
          placeholderTextColor="#999"
        />
        <TouchableOpacity
          style={[styles.sendButton, !chatInput.trim() && styles.sendButtonDisabled]}
          onPress={sendMessageToDave}
          disabled={!chatInput.trim() || chatLoading}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.daveHint}>{daveMessage}</Text>
    </KeyboardAvoidingView>
  );

  const moods: Mood[] = ['😊', '😐', '😔', '😰', '😤', '😴'];
  const moodLabels: Record<Mood, string> = {
    '😊': 'Good',
    '😐': 'Meh',
    '😔': 'Sad',
    '😰': 'Anxious',
    '😤': 'Frustrated',
    '😴': 'Tired',
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderJournal = () => (
    <ScrollView style={styles.screenContainer} contentContainerStyle={styles.journalContent}>
      <View style={styles.journalHeader}>
        <Text style={styles.screenTitle}>Journal</Text>
        {journalEntries.length > 0 && (
          <TouchableOpacity onPress={() => setShowJournalHistory(!showJournalHistory)}>
            <Text style={styles.historyToggle}>
              {showJournalHistory ? 'Write' : `History (${journalEntries.length})`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {!showJournalHistory ? (
        <>
          <Text style={styles.journalLabel}>How are you feeling?</Text>
          <View style={styles.moodSelector}>
            {moods.map(mood => (
              <TouchableOpacity
                key={mood}
                style={[styles.moodButton, selectedMood === mood && styles.moodButtonSelected]}
                onPress={() => setSelectedMood(mood)}
              >
                <Text style={styles.moodEmoji}>{mood}</Text>
                <Text style={styles.moodLabel}>{moodLabels[mood]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.journalLabel}>What's on your mind?</Text>
          <TextInput
            style={styles.journalInput}
            placeholder="Write freely... no one else will see this."
            value={journalInput}
            onChangeText={setJournalInput}
            multiline
            textAlignVertical="top"
            placeholderTextColor="#999"
          />

          <TouchableOpacity style={styles.saveJournalButton} onPress={saveJournalEntry}>
            <Text style={styles.saveJournalText}>Save Entry</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {journalEntries.length === 0 ? (
            <Text style={styles.noEntriesText}>No entries yet. Start writing!</Text>
          ) : (
            journalEntries.map(entry => (
              <View key={entry.id} style={styles.journalEntryCard}>
                <View style={styles.journalEntryHeader}>
                  <Text style={styles.journalEntryMood}>{entry.mood}</Text>
                  <Text style={styles.journalEntryDate}>{formatDate(entry.date)}</Text>
                  <TouchableOpacity onPress={() => deleteJournalEntry(entry.id)}>
                    <Text style={styles.deleteEntryText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.journalEntryContent}>{entry.content}</Text>
              </View>
            ))
          )}
        </>
      )}

      <Text style={styles.daveHint}>{daveMessage}</Text>
    </ScrollView>
  );

  const drawColors = ['#FF0000', '#FF6B00', '#FFD700', '#00FF00', '#00CFFF', '#0066FF', '#9D00FF', '#FF00AA', '#000000', '#FFFFFF'];

  const onDrawGesture = (event: PanGestureHandlerGestureEvent) => {
    const { x, y } = event.nativeEvent;
    if (currentPath === '') {
      setCurrentPath(`M${x},${y}`);
    } else {
      setCurrentPath(prev => `${prev} L${x},${y}`);
    }
  };

  const onDrawEnd = () => {
    if (currentPath) {
      setPaths(prev => [...prev, { path: currentPath, color: drawColor, strokeWidth }]);
      setCurrentPath('');
    }
  };

  const clearCanvas = () => {
    Alert.alert('Clear Drawing', 'Start fresh?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', onPress: () => setPaths([]) }
    ]);
  };

  const saveDrawing = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to save drawings to your photos.');
        return;
      }

      if (drawingRef.current?.capture) {
        const uri = await drawingRef.current.capture();
        await MediaLibrary.saveToLibraryAsync(uri);
        Vibration.vibrate(100);
        setDaveMessage("Saved to your photos! 🎨💜");
      }
    } catch (error) {
      Alert.alert('Oops', 'Could not save the drawing. Try again?');
    }
  };

  const renderDraw = () => (
    <View style={styles.drawContainer}>
      <View style={styles.drawHeader}>
        <Text style={styles.screenTitle}>Draw</Text>
        <View style={styles.drawHeaderButtons}>
          <TouchableOpacity onPress={saveDrawing} style={styles.saveDrawButton}>
            <Text style={styles.saveDrawText}>💾 Save</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearCanvas}>
            <Text style={styles.clearDrawText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.colorPicker}>
        {drawColors.map(color => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorButton,
              { backgroundColor: color },
              color === '#FFFFFF' && { borderColor: '#DDD', borderWidth: 2 },
              drawColor === color && styles.colorButtonSelected
            ]}
            onPress={() => setDrawColor(color)}
          />
        ))}
      </View>

      <View style={styles.brushSizes}>
        {[2, 4, 8, 16].map(size => (
          <TouchableOpacity
            key={size}
            style={[styles.brushButton, strokeWidth === size && styles.brushButtonSelected]}
            onPress={() => setStrokeWidth(size)}
          >
            <View style={[styles.brushPreview, { width: size * 2, height: size * 2, backgroundColor: drawColor }]} />
          </TouchableOpacity>
        ))}
      </View>

      <ViewShot ref={drawingRef} options={{ format: 'png', quality: 1 }} style={styles.canvasContainer}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <PanGestureHandler
            onGestureEvent={onDrawGesture}
            onEnded={onDrawEnd}
          >
            <View style={styles.canvas}>
              <Svg style={StyleSheet.absoluteFill}>
                {paths.map((p, index) => (
                  <Path
                    key={index}
                    d={p.path}
                    stroke={p.color}
                    strokeWidth={p.strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {currentPath && (
                  <Path
                    d={currentPath}
                    stroke={drawColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </Svg>
            </View>
          </PanGestureHandler>
        </GestureHandlerRootView>
      </ViewShot>

      <Text style={styles.daveHint}>{daveMessage}</Text>
    </View>
  );

  const renderSafetyPlan = () => (
    <ScrollView style={styles.screenContainer} contentContainerStyle={styles.safetyContent}>
      <Image source={require('./assets/dave.png')} style={styles.safetyDave} resizeMode="contain" />
      <Text style={styles.screenTitle}>My Safety Plan</Text>
      <Text style={styles.safetySubtitle}>Fill this out when you're feeling okay, so it's ready when you need it</Text>

      <Text style={styles.safetyLabel}>🚨 Warning signs I'm struggling:</Text>
      <TextInput
        style={styles.safetyInput}
        placeholder="e.g., not sleeping, isolating, racing thoughts..."
        value={safetyPlan.warningSigns}
        onChangeText={(text) => updateSafetyPlan('warningSigns', text)}
        multiline
        placeholderTextColor="#999"
      />

      <Text style={styles.safetyLabel}>🧘 Things that help me calm down:</Text>
      <TextInput
        style={styles.safetyInput}
        placeholder="e.g., walking, music, hot shower, talking to friend..."
        value={safetyPlan.calmingThings}
        onChangeText={(text) => updateSafetyPlan('calmingThings', text)}
        multiline
        placeholderTextColor="#999"
      />

      <Text style={styles.safetyLabel}>👥 People I can reach out to:</Text>
      {safetyPlan.supportPeople.map((person, index) => (
        <View key={index} style={styles.supportPersonRow}>
          <TextInput
            style={[styles.safetyInput, styles.supportNameInput]}
            placeholder="Name"
            value={person.name}
            onChangeText={(text) => updateSupportPerson(index, 'name', text)}
            placeholderTextColor="#999"
          />
          <TextInput
            style={[styles.safetyInput, styles.supportPhoneInput]}
            placeholder="Phone"
            value={person.phone}
            onChangeText={(text) => updateSupportPerson(index, 'phone', text)}
            keyboardType="phone-pad"
            placeholderTextColor="#999"
          />
        </View>
      ))}
      <TouchableOpacity style={styles.addPersonButton} onPress={addSupportPerson}>
        <Text style={styles.addPersonText}>+ Add another person</Text>
      </TouchableOpacity>

      <Text style={styles.safetyLabel}>💜 Reasons to keep going:</Text>
      <TextInput
        style={styles.safetyInput}
        placeholder="e.g., my pet, seeing next season of my show, my friend..."
        value={safetyPlan.reasonsToLive}
        onChangeText={(text) => updateSafetyPlan('reasonsToLive', text)}
        multiline
        placeholderTextColor="#999"
      />

      <TouchableOpacity style={styles.saveSafetyButton} onPress={saveSafetyPlan}>
        <Text style={styles.saveSafetyText}>Save My Safety Plan</Text>
      </TouchableOpacity>

      <View style={styles.safetyNote}>
        <Text style={styles.safetyNoteText}>💜 Your plan saves to this device. You can also screenshot it.</Text>
      </View>

      <Text style={styles.daveHint}>{daveMessage}</Text>
    </ScrollView>
  );

  const renderAnchors = () => (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>My Anchors</Text>
      <Text style={styles.anchorsSubtitle}>Photos of things that ground you and make you feel better</Text>

      <ScrollView style={styles.anchorsGrid} contentContainerStyle={styles.anchorsGridContent}>
        {anchors.map((anchor) => (
          <TouchableOpacity
            key={anchor.id}
            style={styles.anchorCard}
            onPress={() => setSelectedAnchor(anchor)}
          >
            {failedImages.has(anchor.id) ? (
              <View style={[styles.anchorImage, styles.anchorImagePlaceholder]}>
                <Text style={styles.anchorPlaceholderIcon}>📷</Text>
                <Text style={styles.anchorPlaceholderText}>Image unavailable</Text>
              </View>
            ) : (
              <Image
                source={{ uri: anchor.uri }}
                style={styles.anchorImage}
                onError={() => setFailedImages(prev => new Set(prev).add(anchor.id))}
              />
            )}
            <Text style={styles.anchorCaption} numberOfLines={1}>{anchor.caption}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addAnchorButton} onPress={pickAnchorImage}>
          <Text style={styles.addAnchorIcon}>+</Text>
          <Text style={styles.addAnchorText}>Add Photo</Text>
        </TouchableOpacity>
      </ScrollView>

      <Text style={styles.daveHint}>{daveMessage}</Text>

      {/* View Anchor Modal */}
      <Modal visible={selectedAnchor !== null} transparent animationType="fade">
        <View style={styles.anchorModalOverlay}>
          <View style={styles.anchorModalContent}>
            {selectedAnchor && (
              <>
                {failedImages.has(selectedAnchor.id) ? (
                  <View style={[styles.anchorModalImage, styles.anchorImagePlaceholder]}>
                    <Text style={styles.anchorPlaceholderIcon}>📷</Text>
                    <Text style={styles.anchorPlaceholderText}>Image unavailable</Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: selectedAnchor.uri }}
                    style={styles.anchorModalImage}
                    resizeMode="contain"
                    onError={() => setFailedImages(prev => new Set(prev).add(selectedAnchor.id))}
                  />
                )}
                <Text style={styles.anchorModalCaption}>{selectedAnchor.caption}</Text>
                <View style={styles.anchorModalButtons}>
                  <TouchableOpacity style={styles.anchorCloseButton} onPress={() => setSelectedAnchor(null)}>
                    <Text style={styles.anchorCloseText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.anchorDeleteButton} onPress={() => deleteAnchor(selectedAnchor.id)}>
                    <Text style={styles.anchorDeleteText}>🗑️ Remove</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Caption Modal */}
      <Modal visible={showAddCaption} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add a caption</Text>
            <Text style={styles.captionHint}>What does this remind you of?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., My cat, Beach holiday, Mum's garden..."
              value={newAnchorCaption}
              onChangeText={setNewAnchorCaption}
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowAddCaption(false); setNewAnchorUri(''); setNewAnchorCaption(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={saveAnchor}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderPauseNotes = () => (
    <ScrollView style={styles.screenContainer} contentContainerStyle={styles.pauseContent}>
      <View style={styles.pauseHeader}>
        <Text style={styles.screenTitle}>Pause Notes</Text>
        <TouchableOpacity onPress={resetPauseNotes}>
          <Text style={styles.resetPauseText}>Reset</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.pauseSubtitle}>Pre-written messages ready to send when you need to step back</Text>

      {pauseNotes.map((note) => (
        <View key={note.id} style={styles.pauseCard}>
          <View style={styles.pauseCardHeader}>
            <Text style={styles.pauseLabel}>{note.label}</Text>
            <View style={styles.pauseCardActions}>
              <TouchableOpacity onPress={() => editPauseNote(note)} style={styles.pauseEditBtn}>
                <Text>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deletePauseNote(note.id)} style={styles.pauseDeleteBtn}>
                <Text>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.pauseMessage}>{note.message}</Text>
          <View style={styles.pauseActions}>
            <TouchableOpacity style={styles.copyButton} onPress={() => copyPauseNote(note.message)}>
              <Text style={styles.copyButtonText}>📋 Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton} onPress={() => sharePauseNote(note.message)}>
              <Text style={styles.shareButtonText}>📤 Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addPauseButton} onPress={() => setShowAddPauseNote(true)}>
        <Text style={styles.addPauseText}>+ Add New Note</Text>
      </TouchableOpacity>

      <Text style={styles.daveHint}>{daveMessage}</Text>

      {/* Add/Edit Pause Note Modal */}
      <Modal visible={showAddPauseNote} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingPauseNote ? 'Edit Note' : 'Add New Note'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Label (e.g., 💼 Work, 👋 Friend)"
              value={newPauseLabel}
              onChangeText={setNewPauseLabel}
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, styles.pauseMessageInput]}
              placeholder="Your message..."
              value={newPauseMessage}
              onChangeText={setNewPauseMessage}
              multiline
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={clearPauseNoteForm}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={savePauseNote}>
                <Text style={styles.modalSaveText}>{editingPauseNote ? 'Save' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  const renderShred = () => (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>Let It Go</Text>
      <Text style={styles.shredSubtitle}>Write what's bothering you, then release it</Text>

      <Animated.View style={[styles.shredPaper, { transform: [{ scale: shredAnim }], opacity: shredAnim }]}>
        <TextInput
          style={styles.shredInput}
          placeholder="Write it out... no one will see this..."
          value={shredText}
          onChangeText={setShredText}
          multiline
          placeholderTextColor="#999"
          editable={!isShredding}
        />
      </Animated.View>

      <View style={styles.shredButtons}>
        <TouchableOpacity
          style={[styles.shredButton, !shredText.trim() && styles.shredButtonDisabled]}
          onPress={shredIt}
          disabled={!shredText.trim() || isShredding}
        >
          <Text style={styles.shredButtonIcon}>📄✂️</Text>
          <Text style={styles.shredButtonText}>Shred It</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.binButton, !shredText.trim() && styles.shredButtonDisabled]}
          onPress={binIt}
          disabled={!shredText.trim() || isShredding}
        >
          <Text style={styles.shredButtonIcon}>🗑️</Text>
          <Text style={styles.binButtonText}>Bin It</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.daveHint}>{daveMessage}</Text>
    </View>
  );

  const renderSOS = () => (
    <View style={styles.sosContainer}>
      <View style={styles.sosHeader}>
        <Text style={styles.sosEmoji}>🆘</Text>
        <Text style={styles.sosTitle}>I Need Help Now</Text>
        <Text style={styles.sosSubtitle}>You've got this. Pick one:</Text>
      </View>

      <View style={styles.sosTools}>
        {sosTools.map(tool => (
          <TouchableOpacity
            key={tool.id}
            style={styles.sosTool}
            onPress={() => setScreen(tool.screen)}
          >
            <Text style={styles.sosToolIcon}>{tool.icon}</Text>
            <Text style={styles.sosToolLabel}>{tool.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.sosCallButton}
        onPress={() => Linking.openURL('tel:116123')}
      >
        <Text style={styles.sosCallIcon}>📞</Text>
        <Text style={styles.sosCallText}>Call Samaritans (116 123)</Text>
      </TouchableOpacity>

      <Text style={styles.sosMessage}>Dave is here. You are not alone. 💜</Text>
    </View>
  );

  const renderWins = () => (
    <ScrollView style={styles.screenContainer} contentContainerStyle={styles.winsContent}>
      <Text style={styles.screenTitle}>🏆 Wins Jar</Text>
      <Text style={styles.winsSubtitle}>Celebrate your victories, big and small</Text>

      <TouchableOpacity style={styles.addWinButton} onPress={() => setShowAddWin(true)}>
        <Text style={styles.addWinText}>+ Add a Win</Text>
      </TouchableOpacity>

      {wins.length === 0 ? (
        <View style={styles.emptyWins}>
          <Text style={styles.emptyWinsIcon}>✨</Text>
          <Text style={styles.emptyWinsText}>Your wins will appear here</Text>
          <Text style={styles.emptyWinsHint}>Did you get out of bed? Make tea? That counts!</Text>
        </View>
      ) : (
        wins.map(win => (
          <View key={win.id} style={styles.winCard}>
            <View style={styles.winContent}>
              <Text style={styles.winText}>{win.text}</Text>
              <Text style={styles.winDate}>{win.date}</Text>
            </View>
            <TouchableOpacity onPress={() => deleteWin(win.id)}>
              <Text style={styles.winDelete}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <Text style={styles.daveHint}>{daveMessage}</Text>

      <Modal visible={showAddWin} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add a Win 🌟</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              placeholder="What did you achieve? (Even tiny things count!)"
              value={newWin}
              onChangeText={setNewWin}
              multiline
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowAddWin(false); setNewWin(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={addWin}>
                <Text style={styles.modalSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {screen !== 'home' && (
        <TouchableOpacity style={styles.backButton} onPress={() => {
          setScreen('home');
          stopBreathing();
          resetGrounding();
        }}>
          <Text style={styles.backText}>← Dave</Text>
        </TouchableOpacity>
      )}

      {screen === 'home' && renderHome()}
      {screen === 'breathe' && renderBreathe()}
      {screen === 'ground' && renderGround()}
      {screen === 'words' && renderWords()}
      {screen === 'games' && renderGames()}
      {screen === 'tipp' && renderTIPP()}
      {screen === 'journal' && renderJournal()}
      {screen === 'draw' && renderDraw()}
      {screen === 'contacts' && renderContacts()}
      {screen === 'safety' && renderSafetyPlan()}
      {screen === 'anchors' && renderAnchors()}
      {screen === 'pause' && renderPauseNotes()}
      {screen === 'shred' && renderShred()}
      {screen === 'sos' && renderSOS()}
      {screen === 'wins' && renderWins()}

      {screen === 'home' && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>🔒 Your data stays on your device</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFF',
  },
  backButton: {
    padding: 20,
    paddingTop: 12,
  },
  backText: {
    fontSize: 17,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  homeContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#5D4E6D',
    textAlign: 'center',
    marginTop: 10,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#9B6BB3',
    textAlign: 'center',
    marginBottom: 5,
  },
  daveContainer: {
    marginTop: 10,
    marginBottom: 8,
  },
  daveImage: {
    width: 140,
    height: 140,
  },
  daveMessage: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '400',
    paddingHorizontal: 24,
    lineHeight: 26,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    paddingHorizontal: 8,
  },
  menuButton: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  menuIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  menuText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  // Screen container
  screenContainer: {
    flex: 1,
    padding: 24,
    backgroundColor: '#FAFAFF',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 24,
  },
  daveHint: {
    fontSize: 15,
    color: '#8B5CF6',
    textAlign: 'center',
    fontWeight: '400',
    marginTop: 24,
    paddingHorizontal: 24,
    lineHeight: 22,
  },

  // Breathing
  breathCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 32,
    borderWidth: 3,
    borderColor: '#C4B5FD',
  },
  breathText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '500',
  },
  breathCount: {
    fontSize: 13,
    color: '#8B5CF6',
    marginTop: 6,
  },
  breathOptions: {
    gap: 12,
  },
  breathOption: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  breathOptionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
  },
  breathOptionDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  stopButton: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    alignSelf: 'center',
    paddingHorizontal: 32,
  },
  stopButtonText: {
    fontSize: 15,
    color: '#DC2626',
    fontWeight: '500',
  },

  // Grounding
  groundCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groundIcon: {
    fontSize: 50,
  },
  groundCount: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#9B6BB3',
  },
  groundSense: {
    fontSize: 24,
    fontWeight: '600',
    color: '#5D4E6D',
    marginBottom: 10,
  },
  groundPrompt: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  groundButton: {
    backgroundColor: '#9B6BB3',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  groundButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  groundProgress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 30,
  },
  groundDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E8D5F2',
  },
  groundDotFilled: {
    backgroundColor: '#9B6BB3',
  },
  groundComplete: {
    alignItems: 'center',
    padding: 30,
  },
  groundCompleteIcon: {
    fontSize: 60,
  },
  groundCompleteText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#5D4E6D',
    marginTop: 20,
  },
  groundCompleteSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
  },

  // Affirmations
  affirmationCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 150,
    justifyContent: 'center',
  },
  affirmationText: {
    fontSize: 22,
    color: '#5D4E6D',
    textAlign: 'center',
    lineHeight: 32,
  },
  affirmationNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  affirmationButton: {
    padding: 15,
  },
  affirmationButtonText: {
    fontSize: 16,
    color: '#9B6BB3',
  },
  randomButton: {
    backgroundColor: '#E8D5F2',
    padding: 15,
    borderRadius: 25,
    marginTop: 10,
  },
  randomButtonText: {
    fontSize: 16,
    color: '#5D4E6D',
  },
  wordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  resetWordsText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  affirmationCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 16,
  },
  deleteWordButton: {
    padding: 10,
  },
  deleteWordText: {
    fontSize: 20,
  },
  wordActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
  },
  addWordButton: {
    backgroundColor: '#8B5CF6',
    padding: 15,
    borderRadius: 25,
    marginTop: 10,
  },
  addWordButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },

  // Games
  gameArea: {
    flex: 1,
    alignItems: 'center',
  },
  gameScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9B6BB3',
    marginBottom: 10,
  },
  gameInstruction: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  gameField: {
    width: '100%',
    height: 300,
    backgroundColor: '#F5F0F8',
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  gameTarget: {
    position: 'absolute',
    width: 60,
    height: 60,
    marginLeft: -30,
    marginTop: -30,
  },
  gameTargetImage: {
    width: 60,
    height: 60,
  },
  resetGameButton: {
    marginTop: 20,
    padding: 15,
  },
  resetGameText: {
    color: '#9B6BB3',
    fontSize: 16,
  },

  // TIPP
  tippContent: {
    paddingBottom: 40,
  },
  tippSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  tippCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tippCardActive: {
    backgroundColor: '#F5F0F8',
    borderColor: '#9B6BB3',
    borderWidth: 2,
  },
  tippHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tippIcon: {
    fontSize: 30,
    marginRight: 10,
  },
  tippLetter: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9B6BB3',
    marginRight: 10,
  },
  tippTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5D4E6D',
  },
  tippInstruction: {
    fontSize: 14,
    color: '#666',
    marginTop: 15,
    lineHeight: 22,
  },

  // Contacts
  contactsContent: {
    paddingBottom: 40,
  },
  contactSection: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5D4E6D',
    marginTop: 20,
    marginBottom: 15,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5D4E6D',
  },
  contactNumber: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 10,
  },
  callButton: {
    backgroundColor: '#D5F2E8',
    padding: 10,
    borderRadius: 10,
  },
  textButton: {
    backgroundColor: '#D5E8F2',
    padding: 10,
    borderRadius: 10,
  },
  deleteButton: {
    backgroundColor: '#FFE5E5',
    padding: 10,
    borderRadius: 10,
  },
  actionIcon: {
    fontSize: 18,
  },
  addContactButton: {
    borderWidth: 2,
    borderColor: '#E8D5F2',
    borderStyle: 'dashed',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  addContactText: {
    fontSize: 16,
    color: '#9B6BB3',
  },
  crisisCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  crisisInfo: {
    flex: 1,
  },
  crisisName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5D4E6D',
  },
  crisisDesc: {
    fontSize: 12,
    color: '#666',
  },
  crisisAvailable: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  crisisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resetCrisisText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  crisisActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crisisCallButton: {
    backgroundColor: '#FFE5E5',
    padding: 10,
    borderRadius: 10,
  },
  crisisDeleteButton: {
    padding: 8,
  },
  crisisEditButton: {
    padding: 8,
  },
  crisisNumber: {
    fontSize: 12,
    color: '#D46A6A',
    fontWeight: '600',
  },
  addCrisisButton: {
    borderWidth: 2,
    borderColor: '#FFE5E5',
    borderStyle: 'dashed',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5D4E6D',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E8D5F2',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalCancel: {
    padding: 15,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#999',
  },
  modalSave: {
    backgroundColor: '#9B6BB3',
    padding: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  modalSaveText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },

  // Chat
  chatContainer: {
    flex: 1,
    padding: 20,
    paddingBottom: 10,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  clearChatText: {
    color: '#9B6BB3',
    fontSize: 16,
  },
  chatMessages: {
    flex: 1,
    marginBottom: 10,
  },
  chatMessagesContent: {
    paddingBottom: 20,
  },
  chatWelcome: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  chatDaveImage: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  chatWelcomeText: {
    fontSize: 20,
    color: '#5D4E6D',
    fontWeight: '600',
    marginBottom: 8,
  },
  chatWelcomeSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  chatBubble: {
    maxWidth: '80%',
    padding: 15,
    borderRadius: 20,
    marginBottom: 10,
  },
  userBubble: {
    backgroundColor: '#9B6BB3',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 5,
  },
  daveBubble: {
    backgroundColor: '#F5F0F8',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 5,
  },
  chatBubbleText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userBubbleText: {
    color: '#fff',
  },
  daveBubbleText: {
    color: '#5D4E6D',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chatInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#9B6BB3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#E8D5F2',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Journal
  journalContent: {
    paddingBottom: 40,
  },
  journalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  historyToggle: {
    color: '#9B6BB3',
    fontSize: 16,
  },
  journalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5D4E6D',
    marginBottom: 15,
    marginTop: 10,
  },
  moodSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  moodButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 15,
    backgroundColor: '#fff',
    width: '30%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  moodButtonSelected: {
    backgroundColor: '#E8D5F2',
    borderColor: '#9B6BB3',
    borderWidth: 2,
  },
  moodEmoji: {
    fontSize: 28,
  },
  moodLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  journalInput: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    fontSize: 16,
    minHeight: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    color: '#333',
  },
  saveJournalButton: {
    backgroundColor: '#9B6BB3',
    padding: 18,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  saveJournalText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  noEntriesText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 16,
  },
  journalEntryCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  journalEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  journalEntryMood: {
    fontSize: 24,
    marginRight: 10,
  },
  journalEntryDate: {
    flex: 1,
    fontSize: 14,
    color: '#999',
  },
  deleteEntryText: {
    fontSize: 18,
  },
  journalEntryContent: {
    fontSize: 16,
    color: '#5D4E6D',
    lineHeight: 24,
  },
  journalButton: {
    backgroundColor: '#9B6BB3',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  journalButtonIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  journalButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },

  // Drawing
  drawContainer: {
    flex: 1,
    padding: 20,
  },
  drawHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  clearDrawText: {
    color: '#9B6BB3',
    fontSize: 16,
  },
  drawHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  saveDrawButton: {
    backgroundColor: '#E8D5F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  saveDrawText: {
    color: '#9B6BB3',
    fontSize: 14,
    fontWeight: '600',
  },
  colorPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 15,
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorButtonSelected: {
    borderColor: '#333',
    transform: [{ scale: 1.2 }],
  },
  brushSizes: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 15,
  },
  brushButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  brushButtonSelected: {
    backgroundColor: '#E8D5F2',
    borderColor: '#9B6BB3',
    borderWidth: 2,
  },
  brushPreview: {
    borderRadius: 50,
  },
  canvasContainer: {
    flex: 1,
    marginBottom: 10,
  },
  canvas: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },

  // Safety Plan
  safetyContent: {
    paddingBottom: 40,
  },
  safetyDave: {
    width: 60,
    height: 60,
    alignSelf: 'center',
    marginBottom: 10,
  },
  safetySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  safetyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
    marginTop: 16,
  },
  safetyInput: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    fontSize: 16,
    minHeight: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    color: '#333',
  },
  supportPersonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  supportNameInput: {
    flex: 1,
    minHeight: 50,
  },
  supportPhoneInput: {
    flex: 1,
    minHeight: 50,
  },
  addPersonButton: {
    padding: 12,
    alignItems: 'center',
  },
  addPersonText: {
    color: '#8B5CF6',
    fontSize: 14,
  },
  saveSafetyButton: {
    backgroundColor: '#8B5CF6',
    padding: 18,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 24,
  },
  saveSafetyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  safetyNote: {
    backgroundColor: '#F5F0FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  safetyNoteText: {
    color: '#8B5CF6',
    fontSize: 14,
    textAlign: 'center',
  },

  // Anchors
  anchorsSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  anchorsGrid: {
    flex: 1,
  },
  anchorsGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 20,
  },
  anchorCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  anchorImage: {
    width: '100%',
    height: 120,
  },
  anchorImagePlaceholder: {
    backgroundColor: '#F0F0F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  anchorPlaceholderIcon: {
    fontSize: 32,
    marginBottom: 5,
  },
  anchorPlaceholderText: {
    fontSize: 12,
    color: '#999',
  },
  anchorCaption: {
    padding: 10,
    fontSize: 14,
    color: '#5D4E6D',
    textAlign: 'center',
  },
  addAnchorButton: {
    width: '47%',
    height: 150,
    backgroundColor: '#F5F0FF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E8D5F2',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addAnchorIcon: {
    fontSize: 32,
    color: '#8B5CF6',
  },
  addAnchorText: {
    fontSize: 14,
    color: '#8B5CF6',
    marginTop: 8,
  },
  anchorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  anchorModalContent: {
    width: '90%',
    alignItems: 'center',
  },
  anchorModalImage: {
    width: '100%',
    height: 300,
    borderRadius: 16,
  },
  anchorModalCaption: {
    fontSize: 18,
    color: '#fff',
    marginTop: 16,
    textAlign: 'center',
  },
  anchorModalButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  anchorCloseButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  anchorCloseText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  anchorDeleteButton: {
    backgroundColor: '#FFE5E5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  anchorDeleteText: {
    fontSize: 16,
    color: '#D46A6A',
  },
  captionHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },

  // Pause Notes
  pauseContent: {
    paddingBottom: 40,
  },
  pauseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pauseCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pauseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pauseLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5D4E6D',
  },
  pauseCardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  pauseMessage: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 15,
  },
  pauseButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  pauseCopyButton: {
    backgroundColor: '#E8D5F2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    flex: 1,
    alignItems: 'center',
  },
  pauseCopyText: {
    color: '#9B6BB3',
    fontWeight: '600',
  },
  pauseShareButton: {
    backgroundColor: '#9B6BB3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    flex: 1,
    alignItems: 'center',
  },
  pauseShareText: {
    color: '#fff',
    fontWeight: '600',
  },
  addPauseButton: {
    backgroundColor: '#9B6BB3',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  addPauseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resetPauseText: {
    color: '#9B6BB3',
    fontSize: 16,
  },
  pauseSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  pauseEditBtn: {
    padding: 5,
  },
  pauseDeleteBtn: {
    padding: 5,
  },
  pauseActions: {
    flexDirection: 'row',
    gap: 10,
  },
  copyButton: {
    backgroundColor: '#E8D5F2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    flex: 1,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#9B6BB3',
    fontWeight: '600',
  },
  shareButton: {
    backgroundColor: '#9B6BB3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    flex: 1,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  daveHint: {
    fontSize: 14,
    color: '#9B6BB3',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  pauseMessageInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Shred It
  shredSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  shredPaper: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    minHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  shredInput: {
    fontSize: 16,
    color: '#333',
    minHeight: 160,
    textAlignVertical: 'top',
  },
  shredButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
  },
  shredButton: {
    backgroundColor: '#9B6BB3',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: 'center',
    flex: 1,
  },
  binButton: {
    backgroundColor: '#5D4E6D',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: 'center',
    flex: 1,
  },
  shredButtonDisabled: {
    opacity: 0.5,
  },
  shredButtonIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  shredButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  binButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // SOS Mode
  sosContainer: {
    flex: 1,
    backgroundColor: '#FAFAFF',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  sosEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  sosTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#5D4E6D',
    marginBottom: 10,
  },
  sosSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  sosTools: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 40,
  },
  sosTool: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    width: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  sosToolIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  sosToolLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5D4E6D',
  },
  sosCallButton: {
    backgroundColor: '#9B6BB3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginBottom: 30,
  },
  sosCallIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  sosCallText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  sosMessage: {
    fontSize: 16,
    color: '#9B6BB3',
    fontStyle: 'italic',
  },

  // Wins Jar
  winsContent: {
    paddingBottom: 40,
  },
  winsSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  addWinButton: {
    backgroundColor: '#9B6BB3',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  addWinText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyWins: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyWinsIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  emptyWinsText: {
    fontSize: 18,
    color: '#5D4E6D',
    marginBottom: 10,
  },
  emptyWinsHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  winCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  winContent: {
    flex: 1,
  },
  winText: {
    fontSize: 16,
    color: '#5D4E6D',
    marginBottom: 5,
  },
  winDate: {
    fontSize: 12,
    color: '#999',
  },
  winDelete: {
    fontSize: 18,
    padding: 5,
  },
});
