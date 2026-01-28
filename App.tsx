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
  useWindowDimensions,
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
    "Your tools for when you need them.",
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
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;

  // Responsive layout utilities
  const responsive = {
    // Dynamic column count for grids
    menuColumns: isLargeTablet ? 5 : isTablet ? 4 : 3,
    anchorColumns: isLargeTablet ? 4 : isTablet ? 3 : 2,
    moodColumns: isLargeTablet ? 6 : isTablet ? 5 : 3,

    // Dynamic sizing (as DimensionValue)
    menuButtonWidth: (isLargeTablet ? '18%' : isTablet ? '22%' : '30%') as any,
    anchorCardWidth: (isLargeTablet ? '23%' : isTablet ? '31%' : '47%') as any,
    moodButtonWidth: (isLargeTablet ? '15%' : isTablet ? '18%' : '30%') as any,

    // Spacing
    padding: isTablet ? 32 : 24,
    gap: isTablet ? 16 : 12,

    // Font scaling
    titleSize: isLargeTablet ? 44 : isTablet ? 40 : 36,
    headingSize: isLargeTablet ? 28 : isTablet ? 26 : 22,
    bodySize: isTablet ? 18 : 16,
    smallSize: isTablet ? 16 : 14,

    // Component sizes
    daveImageSize: isLargeTablet ? 200 : isTablet ? 180 : 140,
    breathCircleSize: isLargeTablet ? 280 : isTablet ? 240 : 180,
    gameFieldHeight: isLargeTablet ? 500 : isTablet ? 400 : 300,
    gameTargetSize: isLargeTablet ? 90 : isTablet ? 75 : 60,
    anchorImageHeight: isLargeTablet ? 180 : isTablet ? 150 : 120,

    // Modal sizing (as DimensionValue)
    modalWidth: (isLargeTablet ? '50%' : isTablet ? '65%' : '85%') as any,
    anchorModalWidth: (isLargeTablet ? '60%' : isTablet ? '75%' : '90%') as any,
    anchorModalImageHeight: isLargeTablet ? 500 : isTablet ? 400 : 300,

    // Chat
    chatBubbleMaxWidth: (isTablet ? '60%' : '80%') as any,

    // Icon sizes
    menuIconSize: isLargeTablet ? 56 : isTablet ? 48 : 28,
    groundIconSize: isLargeTablet ? 70 : isTablet ? 60 : 50,
    groundCountSize: isLargeTablet ? 80 : isTablet ? 72 : 60,
  };

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

  // Onboarding state
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const daveAnim = useRef(new Animated.Value(1)).current;
  const breathAnim = useRef(new Animated.Value(1)).current;
  const drawingRef = useRef<ViewShot>(null);
  const breathTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved data
  useEffect(() => {
    loadOnboardingStatus();
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

  const loadOnboardingStatus = async () => {
    try {
      const seen = await AsyncStorage.getItem('hasSeenOnboarding');
      setHasSeenOnboarding(seen === 'true');
    } catch (e) {
      setHasSeenOnboarding(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      setHasSeenOnboarding(true);
    } catch (e) {}
  };

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

    // Set the CURRENT phase immediately so UI shows correct instruction
    setBreathPhase(phase as typeof breathPhase);
    setBreathCount(count);

    if (phase === 'in') {
      duration = t.in;
      nextPhase = t.hold > 0 ? 'hold' : 'out';
      // Circle expands as you breathe IN
      Animated.timing(breathAnim, { toValue: 1.5, duration, useNativeDriver: true }).start();
    } else if (phase === 'hold') {
      duration = t.hold;
      nextPhase = 'out';
      // Circle stays expanded during hold
    } else if (phase === 'out') {
      duration = t.out;
      nextPhase = t.hold2 > 0 ? 'hold2' : 'in';
      // Circle contracts as you breathe OUT
      Animated.timing(breathAnim, { toValue: 1, duration, useNativeDriver: true }).start();
      if (t.hold2 === 0) nextCount = count + 1;
    } else if (phase === 'hold2') {
      duration = t.hold2;
      nextPhase = 'in';
      nextCount = count + 1;
      // Circle stays contracted during hold2
    }

    // Check if we've completed all breaths
    if (nextCount >= 5 && nextPhase === 'in') {
      breathTimerRef.current = setTimeout(() => {
        stopBreathing();
        Vibration.vibrate(200);
        setDaveMessage("Well done. You did 5 breaths. 💜");
      }, duration);
      return;
    }

    // Schedule the next phase after current phase completes
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
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.homeContainer, { padding: responsive.padding }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.appTitle, { fontSize: responsive.titleSize }]}>Dave</Text>
      <Text style={[styles.appSubtitle, { fontSize: responsive.smallSize }]}>Your Mental Health Companion</Text>

      <Animated.View style={[styles.daveContainer, { transform: [{ scale: daveAnim }] }]}>
        <Image source={require('./assets/dave.png')} style={[styles.daveImage, { width: responsive.daveImageSize, height: responsive.daveImageSize }]} resizeMode="contain" />
      </Animated.View>

      <Text style={[styles.daveMessage, { fontSize: responsive.bodySize }]}>{daveMessage}</Text>

      <View style={[styles.menuGrid, { gap: responsive.gap, maxWidth: isLargeTablet ? 900 : isTablet ? 700 : '100%' }]}>
        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#E3D0EE', width: responsive.menuButtonWidth }]} onPress={() => setScreen('breathe')}>
          <Text style={[styles.menuIcon, { fontSize: responsive.menuIconSize, marginBottom: isTablet ? 12 : 8 }]}>🌬️</Text>
          <Text style={[styles.menuText, { fontSize: responsive.smallSize }]}>Breathe</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#D0E3EE', width: responsive.menuButtonWidth }]} onPress={() => setScreen('ground')}>
          <Text style={[styles.menuIcon, { fontSize: responsive.menuIconSize, marginBottom: isTablet ? 12 : 8 }]}>🖐️</Text>
          <Text style={[styles.menuText, { fontSize: responsive.smallSize }]}>Ground</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#EEE3D0', width: responsive.menuButtonWidth }]} onPress={() => setScreen('words')}>
          <Text style={[styles.menuIcon, { fontSize: responsive.menuIconSize, marginBottom: isTablet ? 12 : 8 }]}>💜</Text>
          <Text style={[styles.menuText, { fontSize: responsive.smallSize }]}>Words</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#D0EEE3', width: responsive.menuButtonWidth }]} onPress={() => setScreen('games')}>
          <Text style={[styles.menuIcon, { fontSize: responsive.menuIconSize, marginBottom: isTablet ? 12 : 8 }]}>🎯</Text>
          <Text style={[styles.menuText, { fontSize: responsive.smallSize }]}>Distract</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#EED0E3', width: responsive.menuButtonWidth }]} onPress={() => setScreen('tipp')}>
          <Text style={[styles.menuIcon, { fontSize: responsive.menuIconSize, marginBottom: isTablet ? 12 : 8 }]}>🧊</Text>
          <Text style={[styles.menuText, { fontSize: responsive.smallSize }]}>TIPP</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#FFF2E0', width: responsive.menuButtonWidth }]} onPress={() => setScreen('journal')}>
          <Text style={[styles.menuIcon, { fontSize: responsive.menuIconSize, marginBottom: isTablet ? 12 : 8 }]}>📝</Text>
          <Text style={[styles.menuText, { fontSize: responsive.smallSize }]}>Journal</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#DDFADD', width: responsive.menuButtonWidth }]} onPress={() => setScreen('draw')}>
          <Text style={[styles.menuIcon, { fontSize: responsive.menuIconSize, marginBottom: isTablet ? 12 : 8 }]}>🎨</Text>
          <Text style={[styles.menuText, { fontSize: responsive.smallSize }]}>Draw</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#DDECFA', width: responsive.menuButtonWidth }]} onPress={() => setScreen('anchors')}>
          <Text style={[styles.menuIcon, { fontSize: responsive.menuIconSize, marginBottom: isTablet ? 12 : 8 }]}>🖼️</Text>
          <Text style={[styles.menuText, { fontSize: responsive.smallSize }]}>Anchors</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#FFEDDD', width: responsive.menuButtonWidth }]} onPress={() => setScreen('safety')}>
          <Text style={[styles.menuIcon, { fontSize: responsive.menuIconSize, marginBottom: isTablet ? 12 : 8 }]}>🛡️</Text>
          <Text style={[styles.menuText, { fontSize: responsive.smallSize }]}>Safety Plan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#FFDDDD', width: responsive.menuButtonWidth }]} onPress={() => setScreen('contacts')}>
          <Text style={[styles.menuIcon, { fontSize: responsive.menuIconSize, marginBottom: isTablet ? 12 : 8 }]}>📞</Text>
          <Text style={[styles.menuText, { fontSize: responsive.smallSize }]}>Contact</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#DDDDFA', width: responsive.menuButtonWidth }]} onPress={() => setScreen('pause')}>
          <Text style={[styles.menuIcon, { fontSize: responsive.menuIconSize, marginBottom: isTablet ? 12 : 8 }]}>⏸️</Text>
          <Text style={[styles.menuText, { fontSize: responsive.smallSize }]}>Pause</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#FFDDED', width: responsive.menuButtonWidth }]} onPress={() => setScreen('shred')}>
          <Text style={[styles.menuIcon, { fontSize: responsive.menuIconSize, marginBottom: isTablet ? 12 : 8 }]}>📄</Text>
          <Text style={[styles.menuText, { fontSize: responsive.smallSize }]}>Let Go</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#FFF8DD', width: responsive.menuButtonWidth }]} onPress={() => setScreen('wins')}>
          <Text style={[styles.menuIcon, { fontSize: responsive.menuIconSize, marginBottom: isTablet ? 12 : 8 }]}>🏆</Text>
          <Text style={[styles.menuText, { fontSize: responsive.smallSize }]}>Wins</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#FFDDDD', width: responsive.menuButtonWidth }]} onPress={() => setScreen('sos')}>
          <Text style={[styles.menuIcon, { fontSize: responsive.menuIconSize, marginBottom: isTablet ? 12 : 8 }]}>🆘</Text>
          <Text style={[styles.menuText, { fontSize: responsive.smallSize }]}>SOS</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.footer, { padding: isTablet ? 24 : 20 }]}>
        <Text style={[styles.footerText, { fontSize: isTablet ? 14 : 12 }]}>🔒 Your data stays on your device</Text>
      </View>
    </ScrollView>
  );

  const renderBreathe = () => (
    <View style={[styles.screenContainer, { padding: responsive.padding }]}>
      <Text style={[styles.screenTitle, { fontSize: responsive.headingSize }]}>Breathe with Dave</Text>

      <Animated.View style={[styles.breathingDaveContainer, {
        transform: [
          { scale: breathAnim.interpolate({ inputRange: [1, 1.5], outputRange: [0.95, 1.15] }) },
          { translateY: breathAnim.interpolate({ inputRange: [1, 1.5], outputRange: [8, -8] }) }
        ],
        opacity: breathAnim.interpolate({ inputRange: [1, 1.5], outputRange: [0.9, 1] })
      }]}>
        <Image source={require('./assets/dave.png')} style={[styles.breathingDaveImage, { width: responsive.daveImageSize, height: responsive.daveImageSize }]} resizeMode="contain" />
      </Animated.View>

      <View style={[styles.breathCircle, { width: responsive.breathCircleSize, height: responsive.breathCircleSize, borderRadius: responsive.breathCircleSize / 2 }]}>
        <Text style={[styles.breathText, { fontSize: responsive.bodySize }]}>{breathInstructions[breathPhase]}</Text>
        {breathPhase !== 'ready' && <Text style={[styles.breathCount, { fontSize: responsive.smallSize }]}>{breathCount + 1} / 5</Text>}
      </View>

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
    <View style={[styles.screenContainer, { padding: responsive.padding }]}>
      <Text style={[styles.screenTitle, { fontSize: responsive.headingSize }]}>5-4-3-2-1 Grounding</Text>

      {groundStep < 5 ? (
        <View style={[styles.groundCard, { padding: isTablet ? 40 : 30, maxWidth: isTablet ? 500 : '100%', alignSelf: 'center', width: '100%' }]}>
          <Text style={[styles.groundIcon, { fontSize: responsive.groundIconSize }]}>{groundingSteps[groundStep].icon}</Text>
          <Text style={[styles.groundCount, { fontSize: responsive.groundCountSize }]}>{groundingSteps[groundStep].count}</Text>
          <Text style={[styles.groundSense, { fontSize: isTablet ? 28 : 24 }]}>{groundingSteps[groundStep].sense}</Text>
          <Text style={[styles.groundPrompt, { fontSize: responsive.bodySize }]}>{groundingSteps[groundStep].prompt}</Text>

          <TouchableOpacity
            style={[styles.groundButton, { paddingVertical: isTablet ? 18 : 15, paddingHorizontal: isTablet ? 50 : 40 }]}
            onPress={() => {
              Vibration.vibrate(100);
              setGroundStep(s => s + 1);
            }}
          >
            <Text style={[styles.groundButtonText, { fontSize: responsive.bodySize }]}>Done ✓</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.groundComplete, { padding: isTablet ? 40 : 30 }]}>
          <Text style={[styles.groundCompleteIcon, { fontSize: responsive.groundCountSize }]}>🌟</Text>
          <Text style={[styles.groundCompleteText, { fontSize: isTablet ? 32 : 28 }]}>You did it.</Text>
          <Text style={[styles.groundCompleteSubtext, { fontSize: responsive.bodySize }]}>You're here. You're present. You're okay.</Text>
          <TouchableOpacity style={[styles.groundButton, { paddingVertical: isTablet ? 18 : 15, paddingHorizontal: isTablet ? 50 : 40 }]} onPress={resetGrounding}>
            <Text style={[styles.groundButtonText, { fontSize: responsive.bodySize }]}>Do Again</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.groundProgress, { gap: isTablet ? 15 : 10, marginTop: isTablet ? 40 : 30 }]}>
        {[0,1,2,3,4].map(i => (
          <View key={i} style={[styles.groundDot, { width: isTablet ? 16 : 12, height: isTablet ? 16 : 12 }, groundStep > i && styles.groundDotFilled]} />
        ))}
      </View>

      <Text style={[styles.daveHint, { fontSize: responsive.smallSize }]}>{daveMessage}</Text>
    </View>
  );

  const renderWords = () => (
    <View style={[styles.screenContainer, { padding: responsive.padding }]}>
      <View style={styles.wordsHeader}>
        <Text style={[styles.screenTitle, { fontSize: responsive.headingSize }]}>Words for You</Text>
        <TouchableOpacity onPress={resetAffirmations}>
          <Text style={[styles.resetWordsText, { fontSize: responsive.smallSize }]}>Reset</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.affirmationCard, { padding: isTablet ? 50 : 40, maxWidth: isTablet ? 600 : '100%', alignSelf: 'center', width: '100%' }]}>
        <Text style={[styles.affirmationText, { fontSize: isTablet ? 26 : 22 }]}>{affirmations[currentAffirmation]}</Text>
        <Text style={[styles.affirmationCount, { fontSize: responsive.smallSize }]}>{currentAffirmation + 1} / {affirmations.length}</Text>
      </View>

      <View style={[styles.affirmationNav, { maxWidth: isTablet ? 600 : '100%', alignSelf: 'center', width: '100%' }]}>
        <TouchableOpacity
          style={styles.affirmationButton}
          onPress={() => setCurrentAffirmation(c => c === 0 ? affirmations.length - 1 : c - 1)}
        >
          <Text style={[styles.affirmationButtonText, { fontSize: responsive.bodySize }]}>← Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteWordButton}
          onPress={() => deleteAffirmation(currentAffirmation)}
        >
          <Text style={[styles.deleteWordText, { fontSize: isTablet ? 24 : 20 }]}>🗑️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.affirmationButton}
          onPress={() => setCurrentAffirmation(c => (c + 1) % affirmations.length)}
        >
          <Text style={[styles.affirmationButtonText, { fontSize: responsive.bodySize }]}>Next →</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.wordActions, { gap: isTablet ? 16 : 12 }]}>
        <TouchableOpacity
          style={[styles.randomButton, { padding: isTablet ? 18 : 15 }]}
          onPress={() => setCurrentAffirmation(Math.floor(Math.random() * affirmations.length))}
        >
          <Text style={[styles.randomButtonText, { fontSize: responsive.bodySize }]}>🎲 Random</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addWordButton, { padding: isTablet ? 18 : 15 }]}
          onPress={() => setShowAddWord(true)}
        >
          <Text style={[styles.addWordButtonText, { fontSize: responsive.bodySize }]}>+ Add Your Own</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.daveHint, { fontSize: responsive.smallSize }]}>{daveMessage}</Text>

      {/* Add Word Modal */}
      <Modal visible={showAddWord} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: responsive.modalWidth, padding: isTablet ? 40 : 30 }]}>
            <Text style={[styles.modalTitle, { fontSize: isTablet ? 24 : 20 }]}>Add Your Own Words</Text>
            <TextInput
              style={[styles.input, { minHeight: isTablet ? 100 : 80, fontSize: responsive.bodySize }]}
              placeholder="Write something that helps you..."
              value={newWord}
              onChangeText={setNewWord}
              multiline
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowAddWord(false); setNewWord(''); }}>
                <Text style={[styles.modalCancelText, { fontSize: responsive.bodySize }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSave, { paddingVertical: isTablet ? 18 : 15, paddingHorizontal: isTablet ? 40 : 30 }]} onPress={addAffirmation}>
                <Text style={[styles.modalSaveText, { fontSize: responsive.bodySize }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderGames = () => (
    <View style={[styles.screenContainer, { padding: responsive.padding }]}>
      <Text style={[styles.screenTitle, { fontSize: responsive.headingSize }]}>Distraction Zone</Text>

      <View style={styles.gameArea}>
        <Text style={[styles.gameScore, { fontSize: isTablet ? 28 : 24 }]}>Taps: {gameScore}</Text>
        <Text style={[styles.gameInstruction, { fontSize: responsive.bodySize }]}>Tap Dave as fast as you can!</Text>

        <View style={[styles.gameField, { height: responsive.gameFieldHeight, maxWidth: isTablet ? 700 : '100%', alignSelf: 'center', width: '100%' }]}>
          <TouchableOpacity
            style={[styles.gameTarget, { left: `${gameTarget.x}%`, top: `${gameTarget.y}%`, width: responsive.gameTargetSize, height: responsive.gameTargetSize, marginLeft: -responsive.gameTargetSize / 2, marginTop: -responsive.gameTargetSize / 2 }]}
            onPress={moveTarget}
          >
            <Image source={require('./assets/dave.png')} style={{ width: responsive.gameTargetSize, height: responsive.gameTargetSize }} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.resetGameButton, { marginTop: isTablet ? 30 : 20 }]} onPress={() => setGameScore(0)}>
          <Text style={[styles.resetGameText, { fontSize: responsive.bodySize }]}>Reset Score</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.daveHint, { fontSize: responsive.smallSize }]}>{daveMessage}</Text>
    </View>
  );

  const renderTIPP = () => (
    <ScrollView style={[styles.screenContainer, { padding: responsive.padding }]} contentContainerStyle={[styles.tippContent, { maxWidth: isTablet ? 700 : '100%', alignSelf: 'center', width: '100%' }]}>
      <Text style={[styles.screenTitle, { fontSize: responsive.headingSize }]}>TIPP Skills</Text>
      <Text style={[styles.tippSubtitle, { fontSize: responsive.smallSize }]}>For when emotions are really intense</Text>

      {tippSteps.map((step, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.tippCard, { padding: isTablet ? 24 : 20 }, tippStep === index && styles.tippCardActive]}
          onPress={() => setTippStep(tippStep === index ? -1 : index)}
        >
          <View style={styles.tippHeader}>
            <Text style={[styles.tippIcon, { fontSize: isTablet ? 36 : 30 }]}>{step.icon}</Text>
            <Text style={[styles.tippLetter, { fontSize: isTablet ? 28 : 24 }]}>{step.letter}</Text>
            <Text style={[styles.tippTitle, { fontSize: isTablet ? 20 : 18 }]}>{step.title}</Text>
          </View>
          {tippStep === index && (
            <Text style={[styles.tippInstruction, { fontSize: responsive.smallSize }]}>{step.instruction}</Text>
          )}
        </TouchableOpacity>
      ))}

      <Text style={[styles.daveHint, { fontSize: responsive.smallSize }]}>{daveMessage}</Text>
    </ScrollView>
  );

  const renderContacts = () => (
    <ScrollView style={[styles.screenContainer, { padding: responsive.padding }]} contentContainerStyle={[styles.contactsContent, { maxWidth: isTablet ? 700 : '100%', alignSelf: 'center', width: '100%' }]}>
      <Text style={[styles.screenTitle, { fontSize: responsive.headingSize }]}>Reach Out</Text>

      {/* Crisis Contacts - Mental health professionals */}
      <Text style={[styles.contactSection, { fontSize: isTablet ? 20 : 18 }]}>🆘 My Crisis Contacts</Text>
      <Text style={[styles.contactSubtext, { fontSize: responsive.smallSize }]}>Mental health crisis team, therapist, counsellor</Text>
      {personalContacts.map((contact, index) => (
        <View key={index} style={[styles.contactCard, { padding: isTablet ? 20 : 15 }]}>
          <View style={styles.contactInfo}>
            <Text style={[styles.contactName, { fontSize: responsive.bodySize }]}>{contact.name}</Text>
            <Text style={[styles.contactNumber, { fontSize: responsive.smallSize }]}>{contact.number}</Text>
          </View>
          <View style={[styles.contactActions, { gap: isTablet ? 14 : 10 }]}>
            <TouchableOpacity style={[styles.callButton, { padding: isTablet ? 14 : 10 }]} onPress={() => callNumber(contact.number)}>
              <Text style={[styles.actionIcon, { fontSize: isTablet ? 22 : 18 }]}>📞</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.textButton, { padding: isTablet ? 14 : 10 }]} onPress={() => textNumber(contact.number)}>
              <Text style={[styles.actionIcon, { fontSize: isTablet ? 22 : 18 }]}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.deleteButton, { padding: isTablet ? 14 : 10 }]} onPress={() => deleteContact(index)}>
              <Text style={[styles.actionIcon, { fontSize: isTablet ? 22 : 18 }]}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity style={[styles.addContactButton, { padding: isTablet ? 24 : 20 }]} onPress={() => setShowAddContact(true)}>
        <Text style={[styles.addContactText, { fontSize: responsive.bodySize }]}>+ Add a person</Text>
      </TouchableOpacity>

      {/* Crisis Lines */}
      <View style={styles.crisisHeader}>
        <Text style={[styles.contactSection, { fontSize: isTablet ? 20 : 18 }]}>Helplines (UK)</Text>
        <TouchableOpacity onPress={resetCrisisLines}>
          <Text style={[styles.resetCrisisText, { fontSize: responsive.smallSize }]}>Reset</Text>
        </TouchableOpacity>
      </View>
      {crisisLines.map((line, index) => (
        <View key={index} style={[styles.crisisCard, { padding: isTablet ? 20 : 15 }]}>
          <TouchableOpacity style={styles.crisisInfo} onPress={() => editCrisisLine(index)}>
            <Text style={[styles.crisisName, { fontSize: responsive.bodySize }]}>{line.name}</Text>
            <Text style={[styles.crisisDesc, { fontSize: isTablet ? 14 : 12 }]}>{line.description}</Text>
            {line.available ? <Text style={[styles.crisisAvailable, { fontSize: isTablet ? 13 : 11 }]}>{line.available}</Text> : null}
          </TouchableOpacity>
          <View style={[styles.crisisActions, { gap: isTablet ? 12 : 8 }]}>
            <TouchableOpacity
              style={[styles.crisisEditButton, { padding: isTablet ? 12 : 8 }]}
              onPress={() => editCrisisLine(index)}
            >
              <Text style={[styles.actionIcon, { fontSize: isTablet ? 22 : 18 }]}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.crisisCallButton, { padding: isTablet ? 14 : 10 }]}
              onPress={() => {
                if (line.number.includes('Text')) {
                  Linking.openURL('sms:85258&body=SHOUT');
                } else {
                  callNumber(line.number);
                }
              }}
            >
              <Text style={[styles.crisisNumber, { fontSize: isTablet ? 14 : 12 }]}>{line.number}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.crisisDeleteButton, { padding: isTablet ? 12 : 8 }]}
              onPress={() => deleteCrisisLine(index)}
            >
              <Text style={[styles.actionIcon, { fontSize: isTablet ? 22 : 18 }]}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity style={[styles.addCrisisButton, { padding: isTablet ? 24 : 20 }]} onPress={() => setShowAddCrisisLine(true)}>
        <Text style={[styles.addContactText, { fontSize: responsive.bodySize }]}>+ Add a helpline</Text>
      </TouchableOpacity>

      <Text style={[styles.daveHint, { fontSize: responsive.smallSize }]}>{daveMessage}</Text>

      {/* Add Contact Modal */}
      <Modal visible={showAddContact} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: responsive.modalWidth, padding: isTablet ? 40 : 30 }]}>
            <Text style={[styles.modalTitle, { fontSize: isTablet ? 24 : 20 }]}>Add a Person</Text>
            <TextInput
              style={[styles.input, { fontSize: responsive.bodySize }]}
              placeholder="Name"
              value={newContactName}
              onChangeText={setNewContactName}
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, { fontSize: responsive.bodySize }]}
              placeholder="Phone number"
              value={newContactNumber}
              onChangeText={setNewContactNumber}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddContact(false)}>
                <Text style={[styles.modalCancelText, { fontSize: responsive.bodySize }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSave, { paddingVertical: isTablet ? 18 : 15, paddingHorizontal: isTablet ? 40 : 30 }]} onPress={saveContact}>
                <Text style={[styles.modalSaveText, { fontSize: responsive.bodySize }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Crisis Line Modal */}
      <Modal visible={showAddCrisisLine} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: responsive.modalWidth, padding: isTablet ? 40 : 30 }]}>
            <Text style={[styles.modalTitle, { fontSize: isTablet ? 24 : 20 }]}>{editingCrisisIndex !== null ? 'Edit Helpline' : 'Add a Helpline'}</Text>
            <TextInput
              style={[styles.input, { fontSize: responsive.bodySize }]}
              placeholder="Name (e.g. Samaritans)"
              value={newCrisisName}
              onChangeText={setNewCrisisName}
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, { fontSize: responsive.bodySize }]}
              placeholder="Phone number"
              value={newCrisisNumber}
              onChangeText={setNewCrisisNumber}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, { fontSize: responsive.bodySize }]}
              placeholder="Description (e.g. For anyone)"
              value={newCrisisDesc}
              onChangeText={setNewCrisisDesc}
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, { fontSize: responsive.bodySize }]}
              placeholder="Hours (e.g. 24/7)"
              value={newCrisisAvailable}
              onChangeText={setNewCrisisAvailable}
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={clearCrisisForm}>
                <Text style={[styles.modalCancelText, { fontSize: responsive.bodySize }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSave, { paddingVertical: isTablet ? 18 : 15, paddingHorizontal: isTablet ? 40 : 30 }]} onPress={saveCrisisLine}>
                <Text style={[styles.modalSaveText, { fontSize: responsive.bodySize }]}>{editingCrisisIndex !== null ? 'Save' : 'Add'}</Text>
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
            <Text style={styles.chatWelcomeSubtext}>Whatever's on your mind, I'm here for you.</Text>
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
    <ScrollView style={[styles.screenContainer, { padding: responsive.padding }]} contentContainerStyle={[styles.journalContent, { maxWidth: isTablet ? 700 : '100%', alignSelf: 'center', width: '100%' }]}>
      <View style={styles.journalHeader}>
        <Text style={[styles.screenTitle, { fontSize: responsive.headingSize }]}>Journal</Text>
        {journalEntries.length > 0 && (
          <TouchableOpacity onPress={() => setShowJournalHistory(!showJournalHistory)}>
            <Text style={[styles.historyToggle, { fontSize: responsive.bodySize }]}>
              {showJournalHistory ? 'Write' : `History (${journalEntries.length})`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {!showJournalHistory ? (
        <>
          <Text style={[styles.journalLabel, { fontSize: responsive.bodySize }]}>How are you feeling?</Text>
          <View style={[styles.moodSelector, { gap: isTablet ? 14 : 10 }]}>
            {moods.map(mood => (
              <TouchableOpacity
                key={mood}
                style={[styles.moodButton, { width: responsive.moodButtonWidth, padding: isTablet ? 16 : 12 }, selectedMood === mood && styles.moodButtonSelected]}
                onPress={() => setSelectedMood(mood)}
              >
                <Text style={[styles.moodEmoji, { fontSize: isTablet ? 36 : 28 }]}>{mood}</Text>
                <Text style={[styles.moodLabel, { fontSize: isTablet ? 14 : 12 }]}>{moodLabels[mood]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.journalLabel, { fontSize: responsive.bodySize }]}>What's on your mind?</Text>
          <TextInput
            style={[styles.journalInput, { fontSize: responsive.bodySize, minHeight: isTablet ? 200 : 150, padding: isTablet ? 24 : 20 }]}
            placeholder="Write freely... no one else will see this."
            value={journalInput}
            onChangeText={setJournalInput}
            multiline
            textAlignVertical="top"
            placeholderTextColor="#999"
          />

          <TouchableOpacity style={[styles.saveJournalButton, { padding: isTablet ? 22 : 18 }]} onPress={saveJournalEntry}>
            <Text style={[styles.saveJournalText, { fontSize: isTablet ? 20 : 18 }]}>Save Entry</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {journalEntries.length === 0 ? (
            <Text style={[styles.noEntriesText, { fontSize: responsive.bodySize }]}>No entries yet. Start writing!</Text>
          ) : (
            journalEntries.map(entry => (
              <View key={entry.id} style={[styles.journalEntryCard, { padding: isTablet ? 24 : 20 }]}>
                <View style={styles.journalEntryHeader}>
                  <Text style={[styles.journalEntryMood, { fontSize: isTablet ? 28 : 24 }]}>{entry.mood}</Text>
                  <Text style={[styles.journalEntryDate, { fontSize: responsive.smallSize }]}>{formatDate(entry.date)}</Text>
                  <TouchableOpacity onPress={() => deleteJournalEntry(entry.id)}>
                    <Text style={[styles.deleteEntryText, { fontSize: isTablet ? 22 : 18 }]}>🗑️</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.journalEntryContent, { fontSize: responsive.bodySize }]}>{entry.content}</Text>
              </View>
            ))
          )}
        </>
      )}

      <Text style={[styles.daveHint, { fontSize: responsive.smallSize }]}>{daveMessage}</Text>
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
    <View style={[styles.drawContainer, { padding: responsive.padding }]}>
      <View style={styles.drawHeader}>
        <Text style={[styles.screenTitle, { fontSize: responsive.headingSize }]}>Draw</Text>
        <View style={[styles.drawHeaderButtons, { gap: isTablet ? 20 : 15 }]}>
          <TouchableOpacity onPress={saveDrawing} style={[styles.saveDrawButton, { paddingHorizontal: isTablet ? 16 : 12, paddingVertical: isTablet ? 10 : 6 }]}>
            <Text style={[styles.saveDrawText, { fontSize: isTablet ? 16 : 14 }]}>💾 Save</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearCanvas}>
            <Text style={[styles.clearDrawText, { fontSize: responsive.bodySize }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.colorPicker, { gap: isTablet ? 14 : 10 }]}>
        {drawColors.map(color => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorButton,
              { backgroundColor: color, width: isTablet ? 48 : 36, height: isTablet ? 48 : 36 },
              color === '#FFFFFF' && { borderColor: '#DDD', borderWidth: 2 },
              drawColor === color && styles.colorButtonSelected
            ]}
            onPress={() => setDrawColor(color)}
          />
        ))}
      </View>

      <View style={[styles.brushSizes, { gap: isTablet ? 20 : 15 }]}>
        {[2, 4, 8, 16].map(size => (
          <TouchableOpacity
            key={size}
            style={[styles.brushButton, { width: isTablet ? 56 : 44, height: isTablet ? 56 : 44 }, strokeWidth === size && styles.brushButtonSelected]}
            onPress={() => setStrokeWidth(size)}
          >
            <View style={[styles.brushPreview, { width: size * (isTablet ? 2.5 : 2), height: size * (isTablet ? 2.5 : 2), backgroundColor: drawColor }]} />
          </TouchableOpacity>
        ))}
      </View>

      <ViewShot ref={drawingRef} options={{ format: 'png', quality: 1 }} style={[styles.canvasContainer, { maxWidth: isTablet ? 800 : '100%', alignSelf: 'center', width: '100%' }]}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <PanGestureHandler
            onGestureEvent={onDrawGesture}
            onEnded={onDrawEnd}
          >
            <View style={[styles.canvas, { borderRadius: isTablet ? 24 : 20 }]}>
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

      <Text style={[styles.daveHint, { fontSize: responsive.smallSize }]}>{daveMessage}</Text>
    </View>
  );

  const renderSafetyPlan = () => (
    <KeyboardAvoidingView
      style={[styles.screenContainer, { padding: responsive.padding }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
    <ScrollView
      contentContainerStyle={[styles.safetyContent, { maxWidth: isTablet ? 700 : '100%', alignSelf: 'center', width: '100%' }]}
      keyboardShouldPersistTaps="handled"
    >
      <Image source={require('./assets/dave.png')} style={[styles.safetyDave, { width: isTablet ? 80 : 60, height: isTablet ? 80 : 60 }]} resizeMode="contain" />
      <Text style={[styles.screenTitle, { fontSize: responsive.headingSize }]}>My Safety Plan</Text>
      <Text style={[styles.safetySubtitle, { fontSize: responsive.smallSize }]}>Fill this out when you're feeling okay, so it's ready when you need it</Text>

      <Text style={[styles.safetyLabel, { fontSize: responsive.bodySize }]}>🚨 Warning signs I'm struggling:</Text>
      <TextInput
        style={[styles.safetyInput, { fontSize: responsive.bodySize, padding: isTablet ? 20 : 16, minHeight: isTablet ? 80 : 60 }]}
        placeholder="e.g., not sleeping, isolating, racing thoughts..."
        value={safetyPlan.warningSigns}
        onChangeText={(text) => updateSafetyPlan('warningSigns', text)}
        multiline
        placeholderTextColor="#999"
      />

      <Text style={[styles.safetyLabel, { fontSize: responsive.bodySize }]}>🧘 Things that help me calm down:</Text>
      <TextInput
        style={[styles.safetyInput, { fontSize: responsive.bodySize, padding: isTablet ? 20 : 16, minHeight: isTablet ? 80 : 60 }]}
        placeholder="e.g., walking, music, hot shower, talking to friend..."
        value={safetyPlan.calmingThings}
        onChangeText={(text) => updateSafetyPlan('calmingThings', text)}
        multiline
        placeholderTextColor="#999"
      />

      <Text style={[styles.safetyLabel, { fontSize: responsive.bodySize }]}>💜 My Loved Ones (family, partner, friends):</Text>
      {safetyPlan.supportPeople.map((person, index) => (
        <View key={index} style={[styles.supportPersonRow, { gap: isTablet ? 14 : 10 }]}>
          <TextInput
            style={[styles.safetyInput, styles.supportNameInput, { fontSize: responsive.bodySize, minHeight: isTablet ? 56 : 50 }]}
            placeholder="Name"
            value={person.name}
            onChangeText={(text) => updateSupportPerson(index, 'name', text)}
            placeholderTextColor="#999"
          />
          <TextInput
            style={[styles.safetyInput, styles.supportPhoneInput, { fontSize: responsive.bodySize, minHeight: isTablet ? 56 : 50 }]}
            placeholder="Phone"
            value={person.phone}
            onChangeText={(text) => updateSupportPerson(index, 'phone', text)}
            keyboardType="phone-pad"
            placeholderTextColor="#999"
          />
        </View>
      ))}
      <TouchableOpacity style={[styles.addPersonButton, { padding: isTablet ? 16 : 12 }]} onPress={addSupportPerson}>
        <Text style={[styles.addPersonText, { fontSize: responsive.smallSize }]}>+ Add another person</Text>
      </TouchableOpacity>

      <Text style={[styles.safetyLabel, { fontSize: responsive.bodySize }]}>💜 Reasons to keep going:</Text>
      <TextInput
        style={[styles.safetyInput, { fontSize: responsive.bodySize, padding: isTablet ? 20 : 16, minHeight: isTablet ? 80 : 60 }]}
        placeholder="e.g., my pet, seeing next season of my show, my friend..."
        value={safetyPlan.reasonsToLive}
        onChangeText={(text) => updateSafetyPlan('reasonsToLive', text)}
        multiline
        placeholderTextColor="#999"
      />

      <TouchableOpacity style={[styles.saveSafetyButton, { padding: isTablet ? 22 : 18 }]} onPress={saveSafetyPlan}>
        <Text style={[styles.saveSafetyText, { fontSize: isTablet ? 20 : 18 }]}>Save My Safety Plan</Text>
      </TouchableOpacity>

      <View style={[styles.safetyNote, { padding: isTablet ? 20 : 16 }]}>
        <Text style={[styles.safetyNoteText, { fontSize: responsive.smallSize }]}>💜 Your plan saves to this device. You can also screenshot it.</Text>
      </View>

      <Text style={[styles.daveHint, { fontSize: responsive.smallSize }]}>{daveMessage}</Text>
    </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderAnchors = () => (
    <View style={[styles.screenContainer, { padding: responsive.padding }]}>
      <Text style={[styles.screenTitle, { fontSize: responsive.headingSize }]}>My Anchors</Text>
      <Text style={[styles.anchorsSubtitle, { fontSize: responsive.smallSize }]}>Photos of things that ground you and make you feel better</Text>

      <ScrollView style={styles.anchorsGrid} contentContainerStyle={[styles.anchorsGridContent, { gap: responsive.gap }]}>
        {anchors.map((anchor) => (
          <TouchableOpacity
            key={anchor.id}
            style={[styles.anchorCard, { width: responsive.anchorCardWidth }]}
            onPress={() => setSelectedAnchor(anchor)}
          >
            {failedImages.has(anchor.id) ? (
              <View style={[styles.anchorImage, styles.anchorImagePlaceholder, { height: responsive.anchorImageHeight }]}>
                <Text style={[styles.anchorPlaceholderIcon, { fontSize: isTablet ? 40 : 32 }]}>📷</Text>
                <Text style={[styles.anchorPlaceholderText, { fontSize: responsive.smallSize }]}>Image unavailable</Text>
              </View>
            ) : (
              <Image
                source={{ uri: anchor.uri }}
                style={[styles.anchorImage, { height: responsive.anchorImageHeight }]}
                onError={() => setFailedImages(prev => new Set(prev).add(anchor.id))}
              />
            )}
            <Text style={[styles.anchorCaption, { fontSize: responsive.smallSize, padding: isTablet ? 14 : 10 }]} numberOfLines={1}>{anchor.caption}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={[styles.addAnchorButton, { width: responsive.anchorCardWidth, height: responsive.anchorImageHeight + 50 }]} onPress={pickAnchorImage}>
          <Text style={[styles.addAnchorIcon, { fontSize: isTablet ? 40 : 32 }]}>+</Text>
          <Text style={[styles.addAnchorText, { fontSize: responsive.smallSize }]}>Add Photo</Text>
        </TouchableOpacity>
      </ScrollView>

      <Text style={[styles.daveHint, { fontSize: responsive.smallSize }]}>{daveMessage}</Text>

      {/* View Anchor Modal */}
      <Modal visible={selectedAnchor !== null} transparent animationType="fade">
        <View style={styles.anchorModalOverlay}>
          <View style={[styles.anchorModalContent, { width: responsive.anchorModalWidth }]}>
            {selectedAnchor && (
              <>
                {failedImages.has(selectedAnchor.id) ? (
                  <View style={[styles.anchorModalImage, styles.anchorImagePlaceholder, { height: responsive.anchorModalImageHeight }]}>
                    <Text style={[styles.anchorPlaceholderIcon, { fontSize: isTablet ? 48 : 32 }]}>📷</Text>
                    <Text style={[styles.anchorPlaceholderText, { fontSize: responsive.bodySize }]}>Image unavailable</Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: selectedAnchor.uri }}
                    style={[styles.anchorModalImage, { height: responsive.anchorModalImageHeight }]}
                    resizeMode="contain"
                    onError={() => setFailedImages(prev => new Set(prev).add(selectedAnchor.id))}
                  />
                )}
                <Text style={[styles.anchorModalCaption, { fontSize: isTablet ? 22 : 18 }]}>{selectedAnchor.caption}</Text>
                <View style={[styles.anchorModalButtons, { gap: isTablet ? 20 : 16 }]}>
                  <TouchableOpacity style={[styles.anchorCloseButton, { paddingVertical: isTablet ? 16 : 12, paddingHorizontal: isTablet ? 40 : 32 }]} onPress={() => setSelectedAnchor(null)}>
                    <Text style={[styles.anchorCloseText, { fontSize: responsive.bodySize }]}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.anchorDeleteButton, { paddingVertical: isTablet ? 16 : 12, paddingHorizontal: isTablet ? 32 : 24 }]} onPress={() => deleteAnchor(selectedAnchor.id)}>
                    <Text style={[styles.anchorDeleteText, { fontSize: responsive.bodySize }]}>🗑️ Remove</Text>
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
          <View style={[styles.modalContent, { width: responsive.modalWidth, padding: isTablet ? 40 : 30 }]}>
            <Text style={[styles.modalTitle, { fontSize: isTablet ? 24 : 20 }]}>Add a caption</Text>
            <Text style={[styles.captionHint, { fontSize: responsive.smallSize }]}>What does this remind you of?</Text>
            <TextInput
              style={[styles.input, { fontSize: responsive.bodySize }]}
              placeholder="e.g., My cat, Beach holiday, Mum's garden..."
              value={newAnchorCaption}
              onChangeText={setNewAnchorCaption}
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowAddCaption(false); setNewAnchorUri(''); setNewAnchorCaption(''); }}>
                <Text style={[styles.modalCancelText, { fontSize: responsive.bodySize }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSave, { paddingVertical: isTablet ? 18 : 15, paddingHorizontal: isTablet ? 40 : 30 }]} onPress={saveAnchor}>
                <Text style={[styles.modalSaveText, { fontSize: responsive.bodySize }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderPauseNotes = () => (
    <ScrollView style={[styles.screenContainer, { padding: responsive.padding }]} contentContainerStyle={[styles.pauseContent, { maxWidth: isTablet ? 700 : '100%', alignSelf: 'center', width: '100%' }]}>
      <View style={styles.pauseHeader}>
        <Text style={[styles.screenTitle, { fontSize: responsive.headingSize }]}>Pause Notes</Text>
        <TouchableOpacity onPress={resetPauseNotes}>
          <Text style={[styles.resetPauseText, { fontSize: responsive.bodySize }]}>Reset</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.pauseSubtitle, { fontSize: responsive.smallSize }]}>Pre-written messages ready to send when you need to step back</Text>

      {pauseNotes.map((note) => (
        <View key={note.id} style={[styles.pauseCard, { padding: isTablet ? 24 : 20 }]}>
          <View style={styles.pauseCardHeader}>
            <Text style={[styles.pauseLabel, { fontSize: isTablet ? 20 : 18 }]}>{note.label}</Text>
            <View style={[styles.pauseCardActions, { gap: isTablet ? 14 : 10 }]}>
              <TouchableOpacity onPress={() => editPauseNote(note)} style={styles.pauseEditBtn}>
                <Text style={{ fontSize: isTablet ? 20 : 16 }}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deletePauseNote(note.id)} style={styles.pauseDeleteBtn}>
                <Text style={{ fontSize: isTablet ? 20 : 16 }}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[styles.pauseMessage, { fontSize: responsive.smallSize }]}>{note.message}</Text>
          <View style={[styles.pauseActions, { gap: isTablet ? 14 : 10 }]}>
            <TouchableOpacity style={[styles.copyButton, { paddingVertical: isTablet ? 14 : 10 }]} onPress={() => copyPauseNote(note.message)}>
              <Text style={[styles.copyButtonText, { fontSize: responsive.smallSize }]}>📋 Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareButton, { paddingVertical: isTablet ? 14 : 10 }]} onPress={() => sharePauseNote(note.message)}>
              <Text style={[styles.shareButtonText, { fontSize: responsive.smallSize }]}>📤 Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity style={[styles.addPauseButton, { paddingVertical: isTablet ? 18 : 15, paddingHorizontal: isTablet ? 40 : 30 }]} onPress={() => setShowAddPauseNote(true)}>
        <Text style={[styles.addPauseText, { fontSize: responsive.bodySize }]}>+ Add New Note</Text>
      </TouchableOpacity>

      <Text style={[styles.daveHint, { fontSize: responsive.smallSize }]}>{daveMessage}</Text>

      {/* Add/Edit Pause Note Modal */}
      <Modal visible={showAddPauseNote} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: responsive.modalWidth, padding: isTablet ? 40 : 30 }]}>
            <Text style={[styles.modalTitle, { fontSize: isTablet ? 24 : 20 }]}>{editingPauseNote ? 'Edit Note' : 'Add New Note'}</Text>
            <TextInput
              style={[styles.input, { fontSize: responsive.bodySize }]}
              placeholder="Label (e.g., 💼 Work, 👋 Friend)"
              value={newPauseLabel}
              onChangeText={setNewPauseLabel}
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, styles.pauseMessageInput, { fontSize: responsive.bodySize, minHeight: isTablet ? 120 : 100 }]}
              placeholder="Your message..."
              value={newPauseMessage}
              onChangeText={setNewPauseMessage}
              multiline
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={clearPauseNoteForm}>
                <Text style={[styles.modalCancelText, { fontSize: responsive.bodySize }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSave, { paddingVertical: isTablet ? 18 : 15, paddingHorizontal: isTablet ? 40 : 30 }]} onPress={savePauseNote}>
                <Text style={[styles.modalSaveText, { fontSize: responsive.bodySize }]}>{editingPauseNote ? 'Save' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  const renderShred = () => (
    <View style={[styles.screenContainer, { padding: responsive.padding }]}>
      <Text style={[styles.screenTitle, { fontSize: responsive.headingSize }]}>Let It Go</Text>
      <Text style={[styles.shredSubtitle, { fontSize: responsive.smallSize }]}>Write what's bothering you, then release it</Text>

      <Animated.View style={[styles.shredPaper, { transform: [{ scale: shredAnim }], opacity: shredAnim, padding: isTablet ? 24 : 20, minHeight: isTablet ? 260 : 200, maxWidth: isTablet ? 600 : '100%', alignSelf: 'center', width: '100%' }]}>
        <TextInput
          style={[styles.shredInput, { fontSize: responsive.bodySize, minHeight: isTablet ? 200 : 160 }]}
          placeholder="Write it out... no one will see this..."
          value={shredText}
          onChangeText={setShredText}
          multiline
          placeholderTextColor="#999"
          editable={!isShredding}
        />
      </Animated.View>

      <View style={[styles.shredButtons, { gap: isTablet ? 20 : 15 }]}>
        <TouchableOpacity
          style={[styles.shredButton, { paddingVertical: isTablet ? 18 : 15, paddingHorizontal: isTablet ? 30 : 25 }, !shredText.trim() && styles.shredButtonDisabled]}
          onPress={shredIt}
          disabled={!shredText.trim() || isShredding}
        >
          <Text style={[styles.shredButtonIcon, { fontSize: isTablet ? 28 : 24 }]}>📄✂️</Text>
          <Text style={[styles.shredButtonText, { fontSize: responsive.smallSize }]}>Shred It</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.binButton, { paddingVertical: isTablet ? 18 : 15, paddingHorizontal: isTablet ? 30 : 25 }, !shredText.trim() && styles.shredButtonDisabled]}
          onPress={binIt}
          disabled={!shredText.trim() || isShredding}
        >
          <Text style={[styles.shredButtonIcon, { fontSize: isTablet ? 28 : 24 }]}>🗑️</Text>
          <Text style={[styles.binButtonText, { fontSize: responsive.smallSize }]}>Bin It</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.daveHint, { fontSize: responsive.smallSize }]}>{daveMessage}</Text>
    </View>
  );

  const renderSOS = () => (
    <View style={[styles.sosContainer, { padding: responsive.padding }]}>
      <View style={[styles.sosHeader, { marginBottom: isTablet ? 50 : 40 }]}>
        <Text style={[styles.sosEmoji, { fontSize: isTablet ? 80 : 60 }]}>🆘</Text>
        <Text style={[styles.sosTitle, { fontSize: isTablet ? 36 : 28 }]}>I Need Help Now</Text>
        <Text style={[styles.sosSubtitle, { fontSize: responsive.bodySize }]}>You've got this. Pick one:</Text>
      </View>

      <View style={[styles.sosTools, { gap: isTablet ? 30 : 20 }]}>
        {sosTools.map(tool => (
          <TouchableOpacity
            key={tool.id}
            style={[styles.sosTool, { width: isTablet ? 140 : 100, padding: isTablet ? 30 : 25 }]}
            onPress={() => setScreen(tool.screen)}
          >
            <Text style={[styles.sosToolIcon, { fontSize: isTablet ? 50 : 40 }]}>{tool.icon}</Text>
            <Text style={[styles.sosToolLabel, { fontSize: isTablet ? 16 : 14 }]}>{tool.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.sosCallButton, { paddingVertical: isTablet ? 22 : 18, paddingHorizontal: isTablet ? 40 : 30 }]}
        onPress={() => Linking.openURL('tel:116123')}
      >
        <Text style={[styles.sosCallIcon, { fontSize: isTablet ? 28 : 24 }]}>📞</Text>
        <Text style={[styles.sosCallText, { fontSize: isTablet ? 20 : 18 }]}>Call Samaritans (116 123)</Text>
      </TouchableOpacity>

      <Text style={[styles.sosMessage, { fontSize: responsive.bodySize }]}>Dave is here. You are not alone. 💜</Text>
    </View>
  );

  const renderWins = () => (
    <ScrollView style={[styles.screenContainer, { padding: responsive.padding }]} contentContainerStyle={[styles.winsContent, { maxWidth: isTablet ? 700 : '100%', alignSelf: 'center', width: '100%' }]}>
      <Text style={[styles.screenTitle, { fontSize: responsive.headingSize }]}>🏆 Wins Jar</Text>
      <Text style={[styles.winsSubtitle, { fontSize: responsive.smallSize }]}>Celebrate your victories, big and small</Text>

      <TouchableOpacity style={[styles.addWinButton, { paddingVertical: isTablet ? 18 : 15, paddingHorizontal: isTablet ? 40 : 30 }]} onPress={() => setShowAddWin(true)}>
        <Text style={[styles.addWinText, { fontSize: responsive.bodySize }]}>+ Add a Win</Text>
      </TouchableOpacity>

      {wins.length === 0 ? (
        <View style={[styles.emptyWins, { paddingVertical: isTablet ? 50 : 40 }]}>
          <Text style={[styles.emptyWinsIcon, { fontSize: isTablet ? 60 : 50 }]}>✨</Text>
          <Text style={[styles.emptyWinsText, { fontSize: isTablet ? 20 : 18 }]}>Your wins will appear here</Text>
          <Text style={[styles.emptyWinsHint, { fontSize: responsive.smallSize }]}>Did you get out of bed? Make tea? That counts!</Text>
        </View>
      ) : (
        wins.map(win => (
          <View key={win.id} style={[styles.winCard, { padding: isTablet ? 20 : 15 }]}>
            <View style={styles.winContent}>
              <Text style={[styles.winText, { fontSize: responsive.bodySize }]}>{win.text}</Text>
              <Text style={[styles.winDate, { fontSize: responsive.smallSize }]}>{win.date}</Text>
            </View>
            <TouchableOpacity onPress={() => deleteWin(win.id)}>
              <Text style={[styles.winDelete, { fontSize: isTablet ? 22 : 18 }]}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <Text style={[styles.daveHint, { fontSize: responsive.smallSize }]}>{daveMessage}</Text>

      <Modal visible={showAddWin} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: responsive.modalWidth, padding: isTablet ? 40 : 30 }]}>
            <Text style={[styles.modalTitle, { fontSize: isTablet ? 24 : 20 }]}>Add a Win 🌟</Text>
            <TextInput
              style={[styles.input, { minHeight: isTablet ? 100 : 80, fontSize: responsive.bodySize }]}
              placeholder="What did you achieve? (Even tiny things count!)"
              value={newWin}
              onChangeText={setNewWin}
              multiline
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowAddWin(false); setNewWin(''); }}>
                <Text style={[styles.modalCancelText, { fontSize: responsive.bodySize }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSave, { paddingVertical: isTablet ? 18 : 15, paddingHorizontal: isTablet ? 40 : 30 }]} onPress={addWin}>
                <Text style={[styles.modalSaveText, { fontSize: responsive.bodySize }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  // Onboarding slides
  const onboardingSlides = [
    {
      title: "Hi, I'm Dave",
      subtitle: "Your calming companion",
      description: "I'm here to help you through tough moments. No judgement, just support.",
      icon: "💜",
    },
    {
      title: "Breathe & Ground",
      subtitle: "Calm your body",
      description: "Try box breathing when anxious, or the 5-4-3-2-1 grounding technique to come back to the present.",
      icon: "🌬️",
    },
    {
      title: "Your Safe Space",
      subtitle: "Personal tools",
      description: "Add photos that calm you to Anchors, write in your journal, or use the drawing canvas to express yourself.",
      icon: "🖼️",
    },
    {
      title: "Crisis Support",
      subtitle: "Help when you need it",
      description: "Quick access to crisis lines and your personal contacts. The SOS button is always there for tough moments.",
      icon: "🆘",
    },
    {
      title: "Ready to Start",
      subtitle: "Your data stays private",
      description: "Everything you save stays on your device. Tap below to begin your journey with Dave.",
      icon: "🔒",
    },
  ];

  const renderOnboarding = () => (
    <View style={styles.onboardingContainer}>
      <View style={styles.onboardingContent}>
        <Text style={styles.onboardingIcon}>{onboardingSlides[onboardingStep].icon}</Text>
        <Image source={require('./assets/dave.png')} style={styles.onboardingDave} />
        <Text style={styles.onboardingTitle}>{onboardingSlides[onboardingStep].title}</Text>
        <Text style={styles.onboardingSubtitle}>{onboardingSlides[onboardingStep].subtitle}</Text>
        <Text style={styles.onboardingDescription}>{onboardingSlides[onboardingStep].description}</Text>
      </View>

      <View style={styles.onboardingDots}>
        {onboardingSlides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.onboardingDot,
              index === onboardingStep && styles.onboardingDotActive,
            ]}
          />
        ))}
      </View>

      <View style={styles.onboardingButtons}>
        {onboardingStep > 0 && (
          <TouchableOpacity
            style={styles.onboardingButtonSecondary}
            onPress={() => setOnboardingStep(onboardingStep - 1)}
          >
            <Text style={styles.onboardingButtonSecondaryText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.onboardingButton, onboardingStep === 0 && { flex: 1 }]}
          onPress={() => {
            if (onboardingStep < onboardingSlides.length - 1) {
              setOnboardingStep(onboardingStep + 1);
            } else {
              completeOnboarding();
            }
          }}
        >
          <Text style={styles.onboardingButtonText}>
            {onboardingStep === onboardingSlides.length - 1 ? "Let's Go" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>

      {onboardingStep === 0 && (
        <TouchableOpacity onPress={completeOnboarding} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip intro</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Show loading while checking onboarding status
  if (hasSeenOnboarding === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Image source={require('./assets/dave.png')} style={styles.loadingDave} />
        </View>
      </SafeAreaView>
    );
  }

  // Show onboarding for first-time users
  if (!hasSeenOnboarding) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        {renderOnboarding()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {screen !== 'home' && (
        <TouchableOpacity style={[styles.backButton, { padding: isTablet ? 24 : 20, paddingTop: isTablet ? 16 : 12 }]} onPress={() => {
          setScreen('home');
          stopBreathing();
          resetGrounding();
        }}>
          <Text style={[styles.backText, { fontSize: isTablet ? 19 : 17 }]}>← Dave</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFF',
  },
  // Onboarding styles
  onboardingContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  onboardingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  onboardingIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  onboardingDave: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  onboardingTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#5D4E6D',
    textAlign: 'center',
    marginBottom: 8,
  },
  onboardingSubtitle: {
    fontSize: 18,
    color: '#8B5CF6',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  onboardingDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  onboardingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  onboardingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E0D6EB',
    marginHorizontal: 5,
  },
  onboardingDotActive: {
    backgroundColor: '#8B5CF6',
    width: 24,
  },
  onboardingButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  onboardingButton: {
    flex: 2,
    backgroundColor: '#8B5CF6',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  onboardingButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  onboardingButtonSecondary: {
    flex: 1,
    backgroundColor: '#F3E8FF',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  onboardingButtonSecondaryText: {
    color: '#8B5CF6',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    marginTop: 20,
    padding: 10,
  },
  skipText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDave: {
    width: 150,
    height: 150,
  },
  // End onboarding styles
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
    flexGrow: 1,
    alignItems: 'center',
    padding: 24,
    paddingBottom: 10,
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
    aspectRatio: 1.1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
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
    marginBottom: 8,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
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
  breathingDaveContainer: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  breathingDaveImage: {
    width: 140,
    height: 140,
  },
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
    marginBottom: 5,
  },
  contactSubtext: {
    fontSize: 14,
    color: '#8B7B9B',
    marginBottom: 15,
    fontStyle: 'italic',
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
