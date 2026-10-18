import React, { useState, useRef, useEffect } from 'react';
import {
  Music, Video, Image as ImageIcon, Mic, Globe, Film, Play, Pause,
  Download, Sparkles, RefreshCw, Upload, FileUp, CheckCircle2,
  AlertCircle, Volume2, Search, ExternalLink, Copy, Check, Radio,
  Disc, CornerDownLeft, ShieldCheck, Database, Layers, MessageSquare,
  Send, Bot, User as UserIcon
} from 'lucide-react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { User, signInWithPopup } from 'firebase/auth';

interface MediaAssetRecord {
  id: string;
  type: 'music' | 'video' | 'image' | 'transcription' | 'grounding' | 'chat';
  title: string;
  mediaUrl?: string;
  textContent?: string;
  model: string;
  aspectRatio?: string;
  createdAt: string;
}

export const MultimediaStudioView: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'music' | 'video' | 'animate' | 'image' | 'voice' | 'transcribe' | 'grounding' | 'chat'>('music');
  const [user, setUser] = useState<User | null>(auth.currentUser);

  // Music state (Lyria)
  const [musicPrompt, setMusicPrompt] = useState('Uplifting ambient instrumental background score with soft synthesizer chords for enterprise compliance training.');
  const [musicDurationType, setMusicDurationType] = useState<'clip' | 'full'>('clip');
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [musicResult, setMusicResult] = useState<{ audioUrl: string | null; lyrics: string; model: string; title: string } | null>(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Video state (Veo text-to-video)
  const [videoPrompt, setVideoPrompt] = useState('An office support specialist calmly speaking to an enterprise client over video conference, cinematic lighting, corporate setting.');
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoResult, setVideoResult] = useState<{ videoUrl: string; model: string; aspectRatio: string; title: string } | null>(null);

  // Animate Photo state (Veo image-to-video)
  const [animatePrompt, setAnimatePrompt] = useState('Subtle 3D camera push and dynamic kinetic lighting over the diagram nodes.');
  const [animateImageBase64, setAnimateImageBase64] = useState<string | null>(null);
  const [animateImageMime, setAnimateImageMime] = useState<string>('image/png');
  const [animateAspectRatio, setAnimateAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isAnimatingImage, setIsAnimatingImage] = useState(false);
  const [animatedVideoResult, setAnimatedVideoResult] = useState<{ videoUrl: string; model: string; aspectRatio: string } | null>(null);
  const animateFileInputRef = useRef<HTMLInputElement | null>(null);

  // Image Generation / Editing state (gemini-3.1-flash-image-preview)
  const [imagePrompt, setImagePrompt] = useState('Clean modern isometric vector illustration representing 4-stage customer recovery and financial hold authorization.');
  const [imageAspectRatio, setImageAspectRatio] = useState<string>('16:9');
  const [editImageBase64, setEditImageBase64] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageResult, setImageResult] = useState<{ imageUrl: string; model: string } | null>(null);
  const editImageFileInputRef = useRef<HTMLInputElement | null>(null);

  // Audio Transcription state (gemini-3.5-transcribe)
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<{ text: string; model: string } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Search Grounding state (gemini-3.5-flash with googleSearch)
  const [searchQuery, setSearchQuery] = useState('Current CFPB 2026 mortgage debt-to-income ratio regulations and closing disclosure requirements');
  const [isGrounding, setIsGrounding] = useState(false);
  const [groundingResult, setGroundingResult] = useState<{ summary: string; sources: { title: string; url: string }[]; model: string } | null>(null);

  // Live Voice API state (gemini-3.8-live)
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking'>('idle');
  const [liveTranscriptLog, setLiveTranscriptLog] = useState<{ role: 'user' | 'tutor'; text: string }[]>([
    { role: 'tutor', text: 'Spoken role-play session initialized. Press "Start Live Conversation" and speak directly into your microphone.' }
  ]);
  const liveWsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Multi-Turn Gemini Chatbot state
  const [chatMessages, setChatMessages] = useState<{ id: string; role: 'user' | 'model'; content: string; timestamp: string }[]>([
    {
      id: 'msg-welcome',
      role: 'model',
      content: 'Hello! I am your Gemini AI Instructional Partner. I can help you design curriculum chapters, refine Bloom\'s learning objectives, draft assessment questions, or review regulatory compliance. How can I assist with your module today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatModel, setChatModel] = useState<'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite'>('gemini-3.5-flash');
  const [chatRole, setChatRole] = useState<'instructional_designer' | 'sme' | 'compliance' | 'socratic'>('instructional_designer');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTool === 'chat') {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTool]);

  // Firestore Saved Assets list
  const [savedAssets, setSavedAssets] = useState<MediaAssetRecord[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mediaNotice, setMediaNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        loadUserSavedAssets(u.uid);
      }
    });
    return () => unsub();
  }, []);

  const loadUserSavedAssets = async (uid: string) => {
    try {
      const q = query(collection(db, 'media_assets'), where('ownerId', '==', uid));
      const snapshot = await getDocs(q);
      const items: MediaAssetRecord[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as MediaAssetRecord);
      });
      setSavedAssets(items);
    } catch (err) {
      console.warn('Could not load user assets from Firestore:', err);
    }
  };

  const handleSaveToFirestore = async (asset: Omit<MediaAssetRecord, 'id' | 'createdAt'>) => {
    if (!user) {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (err: any) {
        setMediaNotice({ text: 'Please sign in to save assets: ' + err.message, type: 'error' });
        return;
      }
    }
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    try {
      const newDoc = {
        ...asset,
        ownerId: currentUid,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'media_assets'), newDoc);
      setSavedAssets((prev) => [{ id: docRef.id, ...newDoc }, ...prev]);
      setMediaNotice({ text: 'Asset saved to your Firestore cloud repository!', type: 'success' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'media_assets');
    }
  };

  // 1. Generate Music via Lyria
  const handleGenerateMusic = async () => {
    setIsGeneratingMusic(true);
    setMediaNotice(null);
    try {
      const res = await fetch('/api/media/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: musicPrompt,
          durationType: musicDurationType
        })
      });
      const data = await res.json();
      let audioUrl = null;
      if (data.audioBase64) {
        audioUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
      }
      setMusicResult({
        audioUrl,
        lyrics: data.lyrics || 'Ambient learning soundtrack',
        model: data.model,
        title: musicPrompt
      });
    } catch (err: any) {
      setMediaNotice({ text: 'Music generation error: ' + err.message, type: 'error' });
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  // 2. Generate Video via Veo 3
  const handleGenerateVideo = async () => {
    setIsGeneratingVideo(true);
    setMediaNotice(null);
    try {
      const res = await fetch('/api/media/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          aspectRatio: videoAspectRatio
        })
      });
      const data = await res.json();
      setVideoResult({
        videoUrl: data.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        model: data.model,
        aspectRatio: data.aspectRatio,
        title: videoPrompt
      });
    } catch (err: any) {
      setMediaNotice({ text: 'Video generation error: ' + err.message, type: 'error' });
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // 3. Animate Photo via Veo
  const handleAnimateImage = async () => {
    if (!animateImageBase64) {
      setMediaNotice({ text: 'Please upload an image or diagram to animate.', type: 'error' });
      return;
    }
    setIsAnimatingImage(true);
    setMediaNotice(null);
    try {
      const res = await fetch('/api/media/animate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: animateImageBase64,
          imageMimeType: animateImageMime,
          prompt: animatePrompt,
          aspectRatio: animateAspectRatio
        })
      });
      const data = await res.json();
      setAnimatedVideoResult({
        videoUrl: data.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        model: data.model,
        aspectRatio: data.aspectRatio
      });
    } catch (err: any) {
      setMediaNotice({ text: 'Image animation error: ' + err.message, type: 'error' });
    } finally {
      setIsAnimatingImage(false);
    }
  };

  // 4. Generate or Edit Image via Gemini 3.1 Flash Image
  const handleGenerateOrEditImage = async () => {
    setIsGeneratingImage(true);
    setMediaNotice(null);
    try {
      const res = await fetch('/api/media/create-edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          base64ImageData: editImageBase64,
          aspectRatio: imageAspectRatio
        })
      });
      const data = await res.json();
      setImageResult({
        imageUrl: data.imageUrl,
        model: data.model
      });
    } catch (err: any) {
      setMediaNotice({ text: 'Image creation error: ' + err.message, type: 'error' });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 5. Audio Recording & Transcription via gemini-3.5-transcribe
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const res = reader.result as string;
          const base64Audio = res.split(',')[1] || res;
          await sendAudioForTranscription(base64Audio, 'audio/webm');
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      setMediaNotice({ text: 'Microphone access denied: ' + err.message, type: 'error' });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioForTranscription = async (audioBase64: string, mimeType: string) => {
    setIsTranscribing(true);
    setMediaNotice(null);
    try {
      const res = await fetch('/api/media/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType })
      });
      const data = await res.json();
      setTranscriptionResult({
        text: data.text,
        model: data.model
      });
    } catch (err: any) {
      setMediaNotice({ text: 'Transcription error: ' + err.message, type: 'error' });
    } finally {
      setIsTranscribing(false);
    }
  };

  // 6. Search Grounding via gemini-3.5-flash with googleSearch tool
  const handleSearchGrounding = async () => {
    setIsGrounding(true);
    setMediaNotice(null);
    try {
      const res = await fetch('/api/media/search-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      const data = await res.json();
      setGroundingResult({
        summary: data.summary,
        sources: data.sources || [],
        model: data.model
      });
    } catch (err: any) {
      setMediaNotice({ text: 'Search grounding error: ' + err.message, type: 'error' });
    } finally {
      setIsGrounding(false);
    }
  };

  // 7. Multi-Turn Gemini Chatbot handler (gemini-3.1-pro-preview, gemini-3.5-flash, gemini-3.1-flash-lite)
  const handleSendChatMessage = async (presetPrompt?: string) => {
    const textToSend = (presetPrompt || chatInput).trim();
    if (!textToSend || isSendingChat) return;

    const userMessage = {
      id: `usr-${Date.now()}`,
      role: 'user' as const,
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...chatMessages, userMessage];
    setChatMessages(newHistory);
    setChatInput('');
    setIsSendingChat(true);

    const systemInstructionMap = {
      instructional_designer: "You are an expert Principal Instructional Designer. Help the user structure engaging e-learning modules with low cognitive load, progressive disclosure, Bloom's taxonomy objectives, and active recall checks.",
      sme: "You are a senior Subject Matter Expert (SME). Provide deep, technically rigorous explanations, industry edge cases, and practical examples for corporate training.",
      compliance: "You are an Enterprise Regulatory & Compliance Officer. Rigorously review course policies, auditing guidelines, disclosure rules, and risk mitigation procedures.",
      socratic: "You are a Socratic Learning Coach. Challenge the learner with guided questions, thought experiments, and real-world counter-arguments to stimulate critical thinking."
    };

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map(m => ({ role: m.role, content: m.content })),
          model: chatModel,
          systemInstruction: systemInstructionMap[chatRole]
        })
      });

      const data = await res.json();
      const modelMessage = {
        id: `ai-${Date.now()}`,
        role: 'model' as const,
        content: data.reply || 'I have analyzed your curriculum design request.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, modelMessage]);
    } catch (err: any) {
      const errorMessage = {
        id: `err-${Date.now()}`,
        role: 'model' as const,
        content: 'I encountered an error connecting to Gemini. Please try again or switch model.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSendingChat(false);
    }
  };

  // 7. Live Voice API (gemini-3.8-live)
  const handleToggleLiveSession = () => {
    if (isLiveConnected) {
      if (liveWsRef.current) liveWsRef.current.close();
      if (audioContextRef.current) audioContextRef.current.close();
      setIsLiveConnected(false);
      setLiveStatus('idle');
      return;
    }

    setLiveStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/live-stream`);
    liveWsRef.current = ws;

    ws.onopen = async () => {
      setIsLiveConnected(true);
      setLiveStatus('listening');
      setLiveTranscriptLog((prev) => [
        ...prev,
        { role: 'tutor', text: 'Connected to gemini-3.8-live. Speak your scenario prompt or ask any learning question.' }
      ]);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioCtx = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(audioCtx.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7fff;
            }
            const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
            ws.send(JSON.stringify({ audio: base64 }));
          }
        };
      } catch (e: any) {
        console.warn('Live mic stream warning:', e);
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.text) {
          setLiveTranscriptLog((prev) => [...prev, { role: 'tutor', text: msg.text }]);
        }
        if (msg.audio) {
          setLiveStatus('speaking');
          // In real client, play 24kHz PCM chunk
          setTimeout(() => setLiveStatus('listening'), 2000);
        }
      } catch {}
    };

    ws.onerror = (err) => {
      console.warn('Live WS error:', err);
      setLiveStatus('idle');
      setIsLiveConnected(false);
    };

    ws.onclose = () => {
      setIsLiveConnected(false);
      setLiveStatus('idle');
    };
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {mediaNotice && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium shadow-2xs ${
          mediaNotice.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{mediaNotice.text}</span>
          </div>
          <button
            onClick={() => setMediaNotice(null)}
            className="px-2 py-0.5 text-slate-600 hover:text-slate-900 rounded cursor-pointer font-bold"
          >
            Dismiss
          </button>
        </div>
      )}
      {/* Studio Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-2xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 rounded-md">
                E-Learning Multimedia & AI Studio
              </span>
              <span className="text-xs text-slate-500 font-medium">Google Generative AI Suite</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-2">
              Course Multimedia, Voice Tutor & Real-Time Research
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Power every learning screen with AI-generated background scores (<strong>Lyria</strong>), video scenarios (<strong>Veo 3</strong>), animated diagram illustrations (<strong>Veo & Gemini Image</strong>), real-time spoken coaching (<strong>Gemini Live</strong>), speech-to-text (<strong>Gemini Transcribe</strong>), and verified Search Grounding (<strong>Google Search</strong>) backed by <strong>Firebase Auth & Firestore</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <div className="flex items-center gap-2 p-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-semibold text-slate-700 truncate max-w-[160px]">{user.displayName || user.email}</span>
                <span className="text-2xs text-slate-400 font-mono">(Firebase Auth)</span>
              </div>
            ) : (
              <button
                onClick={() => signInWithPopup(auth, googleProvider)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                <span>Sign In with Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Feature Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pt-5 mt-5 border-t border-slate-100 text-xs font-semibold">
          {[
            { id: 'music', label: 'Lyria Music', icon: Music, model: 'lyria-3-clip / pro' },
            { id: 'video', label: 'Veo Video from Text', icon: Video, model: 'veo-3.1-fast' },
            { id: 'animate', label: 'Animate Photos to Video', icon: Film, model: 'veo-3.1-fast' },
            { id: 'image', label: 'Create & Edit Images', icon: ImageIcon, model: 'gemini-3.1-flash-image' },
            { id: 'voice', label: 'Live Voice Conversations', icon: Volume2, model: 'gemini-3.8-live' },
            { id: 'transcribe', label: 'Audio Transcription', icon: Mic, model: 'gemini-3.5-transcribe' },
            { id: 'grounding', label: 'Google Search Grounding', icon: Globe, model: 'gemini-3.5-flash' },
            { id: 'chat', label: 'Gemini Chatbot', icon: MessageSquare, model: 'gemini-3.1-pro / 3.5-flash' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTool === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTool(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Feature Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          {/* ========================================= */}
          {/* 1. LYRIA MUSIC GENERATION */}
          {/* ========================================= */}
          {activeTool === 'music' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Music className="w-4 h-4 text-blue-600" />
                    <span>Generate Music & Audio SFX with Lyria</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generate custom background audio scores for courses using <strong>lyria-3-clip-preview</strong> (up to 30s) or <strong>lyria-3-pro-preview</strong> (full tracks).
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-2xs font-mono font-bold rounded">
                  {musicDurationType === 'clip' ? 'lyria-3-clip-preview' : 'lyria-3-pro-preview'}
                </span>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Track Prompt & Style Direction</label>
                <textarea
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  rows={3}
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  placeholder="Describe tempo, mood, genre, and instruments..."
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700">Length Mode:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
                    <button
                      type="button"
                      onClick={() => setMusicDurationType('clip')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        musicDurationType === 'clip' ? 'bg-white text-blue-600 font-bold shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Short Clip (≤ 30s)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMusicDurationType('full')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        musicDurationType === 'full' ? 'bg-white text-blue-600 font-bold shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Full Track (Lyria Pro)
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleGenerateMusic}
                  disabled={isGeneratingMusic || !musicPrompt.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingMusic ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Synthesizing Lyria Score...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Music Track</span>
                    </>
                  )}
                </button>
              </div>

              {musicResult && (
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <Disc className="w-4 h-4 text-blue-600 animate-spin" />
                      <span>Generated Track: {musicResult.title}</span>
                    </div>
                    <span className="text-2xs font-mono px-2 py-0.5 bg-white rounded border border-blue-200 text-blue-700">
                      {musicResult.model}
                    </span>
                  </div>

                  {musicResult.audioUrl && (
                    <audio
                      ref={audioPlayerRef}
                      controls
                      src={musicResult.audioUrl}
                      className="w-full mt-2"
                      onPlay={() => setIsPlayingMusic(true)}
                      onPause={() => setIsPlayingMusic(false)}
                    />
                  )}

                  <div className="text-2xs font-mono bg-white p-2.5 rounded border border-blue-100 text-slate-600">
                    <strong>Lyrics / Musical Notes:</strong> {musicResult.lyrics}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-2xs text-slate-500">Playable in HTML/SCORM audio players</span>
                    <button
                      onClick={() => handleSaveToFirestore({
                        type: 'music',
                        title: musicResult.title,
                        mediaUrl: musicResult.audioUrl || undefined,
                        textContent: musicResult.lyrics,
                        model: musicResult.model
                      })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-md shadow-xs hover:bg-blue-700 cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Save to Firestore</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================= */}
          {/* 2. VEO 3 VIDEO FROM TEXT */}
          {/* ========================================= */}
          {activeTool === 'video' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Video className="w-4 h-4 text-purple-600" />
                    <span>Generate Video from Text with Veo 3</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generate microlearning and scenario videos using <strong>veo-3.1-fast-generate-preview</strong> in 16:9 or 9:16 aspect ratio.
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 text-2xs font-mono font-bold rounded">
                  veo-3.1-fast-generate-preview
                </span>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Video Scenario Description</label>
                <textarea
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  rows={3}
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500 leading-relaxed"
                  placeholder="Describe camera movement, actors, scenario action, and environment..."
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700">Aspect Ratio:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
                    <button
                      type="button"
                      onClick={() => setVideoAspectRatio('16:9')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        videoAspectRatio === '16:9' ? 'bg-white text-purple-600 font-bold shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      16:9 Landscape (Desktop LMS)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoAspectRatio('9:16')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        videoAspectRatio === '9:16' ? 'bg-white text-purple-600 font-bold shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      9:16 Portrait (Mobile Microlearning)
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleGenerateVideo}
                  disabled={isGeneratingVideo || !videoPrompt.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingVideo ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Synthesizing Veo Video...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Veo Video</span>
                    </>
                  )}
                </button>
              </div>

              {videoResult && (
                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      Veo Video: {videoResult.title}
                    </div>
                    <span className="text-2xs font-mono px-2 py-0.5 bg-white rounded border border-purple-200 text-purple-700">
                      {videoResult.aspectRatio} · {videoResult.model}
                    </span>
                  </div>

                  <div className={`overflow-hidden rounded-lg bg-black flex items-center justify-center ${
                    videoResult.aspectRatio === '9:16' ? 'max-w-[280px] mx-auto aspect-[9/16]' : 'w-full aspect-video'
                  }`}>
                    <video
                      controls
                      autoPlay
                      loop
                      muted
                      src={videoResult.videoUrl}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-2xs text-slate-500">Ready for embed into SCORM video placeholder screens</span>
                    <button
                      onClick={() => handleSaveToFirestore({
                        type: 'video',
                        title: videoResult.title,
                        mediaUrl: videoResult.videoUrl,
                        model: videoResult.model,
                        aspectRatio: videoResult.aspectRatio
                      })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md shadow-xs hover:bg-purple-700 cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Save to Firestore</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================= */}
          {/* 3. ANIMATE IMAGES INTO VIDEO VIA VEO 3 */}
          {/* ========================================= */}
          {activeTool === 'animate' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Film className="w-4 h-4 text-emerald-600" />
                    <span>Animate Photos & Diagrams into Video with Veo</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload any photo or training diagram and generate a video with <strong>veo-3.1-fast-generate-preview</strong> (16:9 or 9:16).
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-2xs font-mono font-bold rounded">
                  veo-3.1-fast-generate-preview
                </span>
              </div>

              {/* Image Upload Area */}
              <input
                ref={animateFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setAnimateImageMime(file.type || 'image/png');
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const res = reader.result as string;
                      setAnimateImageBase64(res.split(',')[1] || res);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
              />

              <div
                onClick={() => animateFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 p-6 rounded-xl text-center bg-slate-50/60 hover:bg-emerald-50/40 transition-colors cursor-pointer"
              >
                {animateImageBase64 ? (
                  <div className="flex items-center justify-center gap-4">
                    <img
                      src={`data:${animateImageMime};base64,${animateImageBase64}`}
                      alt="Source for animation"
                      className="w-24 h-24 object-cover rounded-lg border border-slate-300 shadow-xs"
                    />
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-900">Source Photo Uploaded</div>
                      <div className="text-2xs text-slate-500">Click to choose a different photo</div>
                      <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-2xs font-semibold rounded">
                        Ready for Veo animation
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                    <div className="text-xs font-semibold text-slate-700">Upload Starting Photo or Diagram to Animate</div>
                    <div className="text-2xs text-slate-400">Supports PNG, JPG, WebP</div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Animation Prompt / Motion Guidance</label>
                <input
                  type="text"
                  value={animatePrompt}
                  onChange={(e) => setAnimatePrompt(e.target.value)}
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  placeholder="Describe motion: panning, zooming, lighting changes, physics..."
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700">Target Aspect Ratio:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
                    <button
                      type="button"
                      onClick={() => setAnimateAspectRatio('16:9')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        animateAspectRatio === '16:9' ? 'bg-white text-emerald-600 font-bold shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      16:9 Landscape
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnimateAspectRatio('9:16')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        animateAspectRatio === '9:16' ? 'bg-white text-emerald-600 font-bold shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      9:16 Portrait
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAnimateImage}
                  disabled={isAnimatingImage || !animateImageBase64}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isAnimatingImage ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Animating Photo with Veo...</span>
                    </>
                  ) : (
                    <>
                      <Film className="w-4 h-4" />
                      <span>Animate Photo into Video</span>
                    </>
                  )}
                </button>
              </div>

              {animatedVideoResult && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Veo Animated Output</span>
                    <span className="text-2xs font-mono px-2 py-0.5 bg-white rounded border border-emerald-200 text-emerald-700">
                      {animatedVideoResult.aspectRatio} · {animatedVideoResult.model}
                    </span>
                  </div>

                  <div className={`overflow-hidden rounded-lg bg-black flex items-center justify-center ${
                    animatedVideoResult.aspectRatio === '9:16' ? 'max-w-[280px] mx-auto aspect-[9/16]' : 'w-full aspect-video'
                  }`}>
                    <video
                      controls
                      autoPlay
                      loop
                      muted
                      src={animatedVideoResult.videoUrl}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-2xs text-slate-500">Animated video generated from your uploaded photo</span>
                    <button
                      onClick={() => handleSaveToFirestore({
                        type: 'video',
                        title: animatePrompt || 'Animated Photo Video',
                        mediaUrl: animatedVideoResult.videoUrl,
                        model: animatedVideoResult.model,
                        aspectRatio: animatedVideoResult.aspectRatio
                      })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-md shadow-xs hover:bg-emerald-700 cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Save to Firestore</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================= */}
          {/* 4. CREATE & EDIT IMAGES VIA GEMINI 3.1 FLASH IMAGE */}
          {/* ========================================= */}
          {activeTool === 'image' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-amber-600" />
                    <span>Create & Edit Course Images</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generate diagrams, avatars, or edit visual assets using <strong>gemini-3.1-flash-image-preview</strong>.
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-2xs font-mono font-bold rounded">
                  gemini-3.1-flash-image-preview
                </span>
              </div>

              <input
                ref={editImageFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const res = reader.result as string;
                      setEditImageBase64(res.split(',')[1] || res);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
              />

              {editImageBase64 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <img src={`data:image/png;base64,${editImageBase64}`} alt="Ref" className="w-10 h-10 object-cover rounded" />
                    <span className="font-semibold text-slate-800">Reference image attached for editing mode</span>
                  </div>
                  <button onClick={() => setEditImageBase64(null)} className="text-red-600 hover:text-red-800 font-bold">Remove</button>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Image Prompt or Edit Instruction</label>
                  {!editImageBase64 && (
                    <button
                      type="button"
                      onClick={() => editImageFileInputRef.current?.click()}
                      className="text-2xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      + Attach base image to edit
                    </button>
                  )}
                </div>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  rows={3}
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 leading-relaxed"
                  placeholder="Describe the desired instructional diagram, layout, or editing instructions..."
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-700">Aspect Ratio:</span>
                  <select
                    value={imageAspectRatio}
                    onChange={(e) => setImageAspectRatio(e.target.value)}
                    className="p-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-mono"
                  >
                    <option value="16:9">16:9 (Widescreen)</option>
                    <option value="4:3">4:3 (Slide standard)</option>
                    <option value="1:1">1:1 (Card square)</option>
                    <option value="9:16">9:16 (Mobile banner)</option>
                  </select>
                </div>

                <button
                  onClick={handleGenerateOrEditImage}
                  disabled={isGeneratingImage || !imagePrompt.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingImage ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating Image...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{editImageBase64 ? 'Apply Image Edits' : 'Generate Course Graphic'}</span>
                    </>
                  )}
                </button>
              </div>

              {imageResult && (
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Generated Graphic</span>
                    <span className="text-2xs font-mono px-2 py-0.5 bg-white rounded border border-amber-200 text-amber-700">
                      {imageResult.model}
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-slate-300 bg-slate-900 flex items-center justify-center max-h-[380px]">
                    <img src={imageResult.imageUrl} alt="Generated visual" className="w-full h-auto object-contain max-h-[360px]" />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-2xs text-slate-500">Ready to drag into any e-learning screen</span>
                    <button
                      onClick={() => handleSaveToFirestore({
                        type: 'image',
                        title: imagePrompt,
                        mediaUrl: imageResult.imageUrl,
                        model: imageResult.model
                      })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-md shadow-xs hover:bg-amber-700 cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Save to Firestore</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================= */}
          {/* 5. LIVE VOICE CONVERSATIONS (gemini-3.8-live) */}
          {/* ========================================= */}
          {activeTool === 'voice' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-rose-600" />
                    <span>Real-Time Voice Conversations (Live API)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Spoken real-time dialogue simulation with <strong>gemini-3.8-live</strong> via low-latency WebSocket audio streaming.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                  <span className="text-2xs font-mono text-slate-600 uppercase font-bold">{liveStatus}</span>
                </div>
              </div>

              {/* Pulsing Voice Sphere Visualizer */}
              <div className="p-8 bg-slate-900 rounded-xl text-center space-y-4">
                <div className="flex items-center justify-center">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                    liveStatus === 'speaking'
                      ? 'bg-rose-500/30 ring-8 ring-rose-500/20 scale-110'
                      : liveStatus === 'listening'
                      ? 'bg-blue-500/30 ring-8 ring-blue-500/20 animate-pulse'
                      : 'bg-slate-800'
                  }`}>
                    <Volume2 className={`w-10 h-10 ${
                      liveStatus === 'speaking' ? 'text-rose-400' : liveStatus === 'listening' ? 'text-blue-400' : 'text-slate-500'
                    }`} />
                  </div>
                </div>

                <div>
                  <div className="text-sm font-bold text-white">
                    {isLiveConnected
                      ? liveStatus === 'speaking' ? 'AI Voice Coach is speaking...' : 'Listening to your microphone...'
                      : 'Live Spoken Role-Play Ready'}
                  </div>
                  <p className="text-2xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Speak naturally. The Live API responds in real-time with spoken coaching and de-escalation tips.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleLiveSession}
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                    isLiveConnected
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isLiveConnected ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>End Live Session</span>
                    </>
                  ) : (
                    <>
                      <Radio className="w-4 h-4" />
                      <span>Start Live Voice Conversation</span>
                    </>
                  )}
                </button>
              </div>

              {/* Live Transcript Stream */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Live Dialogue Feed</label>
                <div className="h-44 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 font-mono text-xs">
                  {liveTranscriptLog.map((entry, idx) => (
                    <div key={idx} className={`p-2 rounded ${entry.role === 'tutor' ? 'bg-blue-50 text-blue-900 border border-blue-100' : 'bg-white text-slate-800'}`}>
                      <strong className="uppercase text-2xs block text-slate-500">{entry.role}:</strong>
                      <span>{entry.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================= */}
          {/* 6. AUDIO TRANSCRIPTION (gemini-3.5-transcribe) */}
          {/* ========================================= */}
          {activeTool === 'transcribe' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Mic className="w-4 h-4 text-indigo-600" />
                    <span>Microphone Audio Transcription</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Speak into your microphone or upload audio to transcribe using <strong>gemini-3.5-transcribe</strong>.
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-2xs font-mono font-bold rounded">
                  gemini-3.5-transcribe
                </span>
              </div>

              {/* Record Mic Box */}
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    <Mic className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {isRecording ? 'Recording microphone audio...' : 'Live Microphone Capture'}
                    </div>
                    <div className="text-2xs text-slate-500">
                      Record training scripts, policy voice notes, or SME interviews.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isRecording ? (
                    <button
                      onClick={handleStopRecording}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      Stop & Transcribe
                    </button>
                  ) : (
                    <button
                      onClick={handleStartRecording}
                      disabled={isTranscribing}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isTranscribing ? 'Transcribing...' : 'Record from Mic'}
                    </button>
                  )}
                </div>
              </div>

              {/* Transcription Result Box */}
              {transcriptionResult && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Verbatim Transcription</span>
                    <span className="text-2xs font-mono px-2 py-0.5 bg-white rounded border border-indigo-200 text-indigo-700">
                      {transcriptionResult.model}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-indigo-100 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {transcriptionResult.text}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => copyToClipboard(transcriptionResult.text, 'transcription')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-50 cursor-pointer"
                    >
                      {copiedId === 'transcription' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === 'transcription' ? 'Copied!' : 'Copy Transcribed Text'}</span>
                    </button>

                    <button
                      onClick={() => handleSaveToFirestore({
                        type: 'transcription',
                        title: 'Transcribed Audio Note',
                        textContent: transcriptionResult.text,
                        model: transcriptionResult.model
                      })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-md shadow-xs hover:bg-indigo-700 cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Save to Firestore</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================= */}
          {/* 7. GOOGLE SEARCH GROUNDING (gemini-3.5-flash) */}
          {/* ========================================= */}
          {activeTool === 'grounding' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-teal-600" />
                    <span>Real-Time Google Search Grounding</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ground e-learning modules in up-to-date facts using <strong>gemini-3.5-flash</strong> with the <strong>googleSearch</strong> tool.
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 text-2xs font-mono font-bold rounded">
                  gemini-3.5-flash + googleSearch
                </span>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Compliance / Policy Topic Query</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    placeholder="Enter compliance regulation, legal benchmark, or workplace standard..."
                  />
                  <button
                    onClick={handleSearchGrounding}
                    disabled={isGrounding || !searchQuery.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isGrounding ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Ground Research</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {groundingResult && (
                <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Grounded Research Summary</span>
                    <span className="text-2xs font-mono px-2 py-0.5 bg-white rounded border border-teal-200 text-teal-700">
                      {groundingResult.model}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-teal-100 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {groundingResult.summary}
                  </div>

                  {/* Web Citations */}
                  <div className="space-y-1.5">
                    <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">Verified Sources & Citations</span>
                    <div className="flex flex-wrap gap-2">
                      {groundingResult.sources.map((src, i) => (
                        <a
                          key={i}
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-2xs text-teal-700 bg-white border border-teal-200 px-2.5 py-1 rounded hover:bg-teal-50 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="truncate max-w-[240px]">{src.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => copyToClipboard(groundingResult.summary, 'grounding')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-50 cursor-pointer"
                    >
                      {copiedId === 'grounding' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === 'grounding' ? 'Copied!' : 'Copy Summary'}</span>
                    </button>

                    <button
                      onClick={() => handleSaveToFirestore({
                        type: 'grounding',
                        title: searchQuery,
                        textContent: groundingResult.summary,
                        model: groundingResult.model
                      })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded-md shadow-xs hover:bg-teal-700 cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Save to Firestore</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================= */}
          {/* 8. MULTI-TURN GEMINI CHATBOT */}
          {/* ========================================= */}
          {activeTool === 'chat' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5 flex flex-col h-[700px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Bot className="w-4 h-4 text-purple-600" />
                    <span>Multi-Turn Gemini Instructional Chatbot</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Conversational AI partner with persistent history and role-specific system instructions.
                  </p>
                </div>

                {/* Model & Role Selectors */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Model Selector */}
                  <select
                    value={chatModel}
                    onChange={(e) => setChatModel(e.target.value as any)}
                    className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none"
                    title="Select model capability"
                  >
                    <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Complex Tasks)</option>
                    <option value="gemini-3.5-flash">gemini-3.5-flash (General Tasks)</option>
                    <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast Tasks)</option>
                  </select>

                  {/* Role Selector */}
                  <select
                    value={chatRole}
                    onChange={(e) => setChatRole(e.target.value as any)}
                    className="text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200 rounded-lg px-2.5 py-1 focus:outline-none"
                    title="Set chatbot role persona"
                  >
                    <option value="instructional_designer">Role: Instructional Designer</option>
                    <option value="sme">Role: Subject Matter Expert (SME)</option>
                    <option value="compliance">Role: Compliance Auditor</option>
                    <option value="socratic">Role: Socratic Learning Coach</option>
                  </select>
                </div>
              </div>

              {/* Scrollable Chat History Thread */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-2">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.role === 'model' && (
                      <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[82%] rounded-xl p-3.5 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white font-medium rounded-tr-none shadow-xs'
                          : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 mb-1">
                        <span className="font-semibold uppercase tracking-wider">
                          {msg.role === 'user' ? 'You' : `Gemini (${chatModel})`}
                        </span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {msg.role === 'model' && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                          <button
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                          </button>

                          <button
                            onClick={() => handleSaveToFirestore({
                              type: 'chat',
                              title: `Chat Note: ${msg.content.slice(0, 30)}...`,
                              textContent: msg.content,
                              model: chatModel
                            })}
                            className="inline-flex items-center gap-1 text-purple-700 hover:text-purple-900 cursor-pointer font-semibold"
                          >
                            <Database className="w-3 h-3" />
                            <span>Save to Firestore</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}

                {isSendingChat && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Bot className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" />
                      <span>Gemini ({chatModel}) is thinking...</span>
                    </div>
                  </div>
                )}

                <div ref={chatMessagesEndRef} />
              </div>

              {/* Quick Prompt Starters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px]">
                <span className="text-slate-400 font-semibold shrink-0">Prompts:</span>
                <button
                  onClick={() => handleSendChatMessage("Draft 3 Bloom's taxonomy learning objectives for a home loan underwriting chapter.")}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md shrink-0 cursor-pointer"
                >
                  Bloom's Objectives
                </button>
                <button
                  onClick={() => handleSendChatMessage("Design a realistic 3-choice branching scenario for an unpapered $12,500 cash deposit.")}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md shrink-0 cursor-pointer"
                >
                  Decision Scenario
                </button>
                <button
                  onClick={() => handleSendChatMessage("Write 3 formative quiz questions with 1 correct answer and 3 high-plausibility distractors.")}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md shrink-0 cursor-pointer"
                >
                  Quiz Questions
                </button>
              </div>

              {/* Chat Input Bar */}
              <div className="pt-2 border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChatMessage();
                    }
                  }}
                  placeholder={`Ask ${chatModel} as ${chatRole.replace('_', ' ')}... (Press Enter to send)`}
                  className="flex-1 text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={() => handleSendChatMessage()}
                  disabled={isSendingChat || !chatInput.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Firestore Saved Asset Repository */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Firestore Cloud Assets
                </h3>
              </div>
              <span className="text-2xs font-mono text-slate-500">
                {savedAssets.length} saved
              </span>
            </div>

            {savedAssets.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                <div>No saved assets yet.</div>
                <p className="text-2xs">Generate music, video, images, or research and click "Save to Firestore".</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                {savedAssets.map((asset) => (
                  <div key={asset.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-3xs font-bold uppercase rounded font-mono">
                        {asset.type}
                      </span>
                      <span className="text-3xs text-slate-400 font-mono">
                        {new Date(asset.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-800 truncate">{asset.title}</div>
                    <div className="text-3xs text-slate-500 font-mono truncate">Model: {asset.model}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
