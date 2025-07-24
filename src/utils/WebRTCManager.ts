export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private isCallActive = false;
  
  constructor(
    private onRemoteStream: (stream: MediaStream) => void,
    private onConnectionStateChange: (state: string) => void
  ) {}

  async initializeCall(): Promise<MediaStream> {
    // Get user media
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000
      }
    });

    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local stream to peer connection
    this.localStream.getTracks().forEach(track => {
      if (this.peerConnection && this.localStream) {
        this.peerConnection.addTrack(track, this.localStream);
      }
    });

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.onRemoteStream(this.remoteStream);
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection) {
        const state = this.peerConnection.connectionState;
        this.onConnectionStateChange(state);
        
        if (state === 'connected') {
          this.isCallActive = true;
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          this.isCallActive = false;
        }
      }
    };

    return this.localStream;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    
    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async setRemoteAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    await this.peerConnection.setRemoteDescription(answer);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    await this.peerConnection.addIceCandidate(candidate);
  }

  muteAudio(muted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  getConnectionState(): string {
    return this.peerConnection?.connectionState || 'new';
  }

  isConnected(): boolean {
    return this.isCallActive;
  }

  endCall(): void {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.isCallActive = false;
    this.remoteStream = null;
  }
}

export class RingtoneManager {
  private ringtoneAudio: HTMLAudioElement | null = null;
  private unavailableAudio: HTMLAudioElement | null = null;

  constructor() {
    this.initializeRingtone();
  }

  private initializeRingtone(): void {
    // Create Teams-like ringtone using Web Audio API
    this.createTeamsRingtone();
  }

  private createTeamsRingtone(): void {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create ringtone buffer (Teams-like sound)
    const duration = 3; // 3 seconds
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const channelData = buffer.getChannelData(0);

    // Generate Teams-like ringtone pattern
    for (let i = 0; i < channelData.length; i++) {
      const time = i / sampleRate;
      let sample = 0;
      
      // Create Teams-like double tone pattern
      if (time < 0.5 || (time > 1 && time < 1.5) || time > 2) {
        sample = Math.sin(2 * Math.PI * 440 * time) * 0.3; // A4 note
        sample += Math.sin(2 * Math.PI * 523.25 * time) * 0.2; // C5 note
      }
      
      // Apply fade in/out
      const fadeTime = 0.1;
      if (time < fadeTime) {
        sample *= time / fadeTime;
      } else if (time > duration - fadeTime) {
        sample *= (duration - time) / fadeTime;
      }
      
      channelData[i] = sample;
    }

    // Convert buffer to audio element
    const wavBlob = this.bufferToWave(buffer);
    const url = URL.createObjectURL(wavBlob);
    this.ringtoneAudio = new Audio(url);
    this.ringtoneAudio.loop = true;
  }

  private bufferToWave(buffer: AudioBuffer): Blob {
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    // Convert float samples to 16-bit PCM
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  startRinging(): void {
    if (this.ringtoneAudio) {
      this.ringtoneAudio.currentTime = 0;
      this.ringtoneAudio.play().catch(console.error);
    }
  }

  stopRinging(): void {
    if (this.ringtoneAudio) {
      this.ringtoneAudio.pause();
      this.ringtoneAudio.currentTime = 0;
    }
  }

  playUnavailableMessage(base64Audio: string): void {
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      
      this.unavailableAudio = new Audio(url);
      this.unavailableAudio.play().catch(console.error);
      
      // Clean up URL after playing
      this.unavailableAudio.onended = () => {
        URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.error('Error playing unavailable message:', error);
    }
  }

  cleanup(): void {
    this.stopRinging();
    if (this.unavailableAudio) {
      this.unavailableAudio.pause();
      this.unavailableAudio = null;
    }
  }
}