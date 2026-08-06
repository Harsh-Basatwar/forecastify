/**
 * VoiceService — Web Speech API Integration for Hands-Free Operations
 * Client-side only — uses browser's SpeechRecognition API
 */

export interface VoiceCommand {
  transcript: string;
  confidence: number;
  intent: string;
  params: Record<string, string | number>;
}

export class VoiceService {
  private recognition: any = null;
  private isListening = false;
  private onResult: ((command: VoiceCommand) => void) | null = null;
  private onError: ((error: string) => void) | null = null;

  /** Initialize speech recognition */
  init(options?: { lang?: string; continuous?: boolean }) {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = options?.lang || 'en-IN'; // Indian English + Hindi
    this.recognition.continuous = options?.continuous ?? false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        const transcript = result[0].transcript.trim();
        const confidence = result[0].confidence;
        const command = this.parseCommand(transcript);
        command.confidence = confidence;
        if (this.onResult) this.onResult(command);
      }
    };

    this.recognition.onerror = (event: any) => {
      if (this.onError) this.onError(event.error);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };
  }

  /** Start listening */
  startListening(onResult: (cmd: VoiceCommand) => void, onError?: (err: string) => void) {
    if (!this.recognition) this.init();
    if (!this.recognition) { onError?.('Speech recognition not available'); return; }
    this.onResult = onResult;
    this.onError = onError || null;
    this.recognition.start();
    this.isListening = true;
  }

  /** Stop listening */
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /** Check if currently listening */
  getIsListening(): boolean { return this.isListening; }

  /** Check if speech recognition is supported */
  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  /** Parse a voice transcript into a structured command */
  parseCommand(transcript: string): VoiceCommand {
    const text = transcript.toLowerCase().trim();

    // Inventory commands
    const addMatch = text.match(/(?:add|stock|receive)\s+(\d+)\s+(.+)/);
    if (addMatch) return { transcript, confidence: 0, intent: 'add_inventory', params: { quantity: parseInt(addMatch[1]), product: addMatch[2] } };

    // Payment commands
    const paymentMatch = text.match(/(?:customer|payment|paid|received?)\s+(?:₹|rs\.?|rupees?)?\s*(\d+)/);
    if (paymentMatch) return { transcript, confidence: 0, intent: 'record_payment', params: { amount: parseInt(paymentMatch[1]) } };

    // Query commands
    if (text.includes('profit') || text.includes('revenue')) return { transcript, confidence: 0, intent: 'query_profit', params: {} };
    if (text.includes('stock') && text.includes('out')) return { transcript, confidence: 0, intent: 'query_stockouts', params: {} };
    if (text.includes('expir')) return { transcript, confidence: 0, intent: 'query_expiry', params: {} };
    if (text.includes('order') || text.includes('purchase')) return { transcript, confidence: 0, intent: 'create_order', params: {} };
    if (text.includes('print') && text.includes('invoice')) return { transcript, confidence: 0, intent: 'print_invoice', params: {} };
    if (text.includes('task')) return { transcript, confidence: 0, intent: 'query_tasks', params: {} };
    if (text.includes('who') && text.includes('owe')) return { transcript, confidence: 0, intent: 'query_khata', params: {} };

    // Default: send to Jarvis
    return { transcript, confidence: 0, intent: 'jarvis_query', params: { question: transcript } };
  }
}

export const voiceService = new VoiceService();
