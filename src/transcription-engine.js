const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class TranscriptionEngine {
  constructor() {
    this.ffmpeg = null;
    this.isLoaded = false;
    this.onProgress = null;
    this.FFmpeg = null;
    this.fetchFile = null;
    this.toBlobURL = null;
  }

  async initialize() {
    if (this.isLoaded) return;

    try {
      // Dynamic import of ES modules
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { fetchFile, toBlobURL } = await import('@ffmpeg/util');
      
      this.FFmpeg = FFmpeg;
      this.fetchFile = fetchFile;
      this.toBlobURL = toBlobURL;
      this.ffmpeg = new FFmpeg();

      const coreURL = path.join(__dirname, '..', 'node_modules', '@ffmpeg', 'core', 'dist', 'umd', 'ffmpeg-core.js');
      const wasmURL = path.join(__dirname, '..', 'node_modules', '@ffmpeg', 'core', 'dist', 'umd', 'ffmpeg-core.wasm');
      
      await this.ffmpeg.load({
        coreURL: await toBlobURL(coreURL, 'text/javascript'),
        wasmURL: await toBlobURL(wasmURL, 'application/wasm'),
      });

      this.isLoaded = true;
      this.log('FFmpeg initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize FFmpeg: ${error.message}`);
    }
  }

  setProgressCallback(callback) {
    this.onProgress = callback;
  }

  log(message, type = 'info') {
    if (this.onProgress) {
      this.onProgress({ type, message });
    }
  }

  async extractAudio(videoPath, audioPath) {
    try {
      const videoData = await this.fetchFile(videoPath);
      const audioFileName = path.basename(audioPath);
      
      await this.ffmpeg.writeFile('input.mp4', videoData);
      
      await this.ffmpeg.exec([
        '-i', 'input.mp4',
        '-vn',
        '-acodec', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        'output.wav'
      ]);
      
      const audioData = await this.ffmpeg.readFile('output.wav');
      await fs.writeFile(audioPath, audioData);
      
      // Clean up FFmpeg filesystem
      await this.ffmpeg.deleteFile('input.mp4');
      await this.ffmpeg.deleteFile('output.wav');
      
      return true;
    } catch (error) {
      this.log(`Error extracting audio: ${error.message}`, 'error');
      return false;
    }
  }

  async transcribeAudio(audioPath, model = 'base') {
    try {
      // For now, we'll use a simpler transcription approach
      // In a full implementation, you'd integrate with a JavaScript-based speech recognition
      // or use a local Whisper.cpp build
      
      this.log('Starting transcription...', 'info');
      
      // Simulate transcription progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        this.log(`Transcription progress: ${i}%`, 'info');
      }
      
      // For demonstration, return a placeholder transcription
      const transcript = `[Transcription of ${path.basename(audioPath)}]\n\nThis is a placeholder transcription. In a complete implementation, this would contain the actual speech-to-text results from the audio file.\n\nTo enable real transcription, you would need to:\n1. Integrate Whisper.cpp WebAssembly build\n2. Or use cloud-based speech recognition APIs\n3. Or bundle a native Whisper binary\n\nTimestamp: ${new Date().toISOString()}`;
      
      return transcript;
    } catch (error) {
      this.log(`Error transcribing audio: ${error.message}`, 'error');
      return null;
    }
  }

  async processVideo(videoPath, outputDir, model = 'base') {
    const videoName = path.parse(videoPath).name;
    const audioPath = path.join(os.tmpdir(), `${videoName}_audio.wav`);
    const transcriptPath = path.join(outputDir, `${videoName}.txt`);

    try {
      this.log(`Processing: ${path.basename(videoPath)}`, 'info');
      
      // Extract audio
      this.log('Extracting audio...', 'info');
      const audioExtracted = await this.extractAudio(videoPath, audioPath);
      
      if (!audioExtracted) {
        throw new Error('Failed to extract audio');
      }
      
      this.log('Audio extracted successfully', 'success');
      
      // Transcribe audio
      this.log(`Transcribing with ${model} model...`, 'info');
      const transcript = await this.transcribeAudio(audioPath, model);
      
      if (!transcript) {
        throw new Error('Failed to transcribe audio');
      }
      
      // Save transcript
      await fs.writeFile(transcriptPath, transcript, 'utf8');
      this.log(`Transcript saved to: ${path.basename(transcriptPath)}`, 'success');
      
      // Clean up
      try {
        await fs.unlink(audioPath);
        this.log('Temporary audio file cleaned up', 'info');
      } catch (cleanupError) {
        this.log(`Warning: Could not clean up temporary file: ${cleanupError.message}`, 'warning');
      }
      
      return transcriptPath;
      
    } catch (error) {
      // Clean up on error
      try {
        if (await fs.pathExists(audioPath)) {
          await fs.unlink(audioPath);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      throw error;
    }
  }

  async processFolder(folderPath, model = 'base') {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm', '.m4v', '.mpg', '.mpeg'];
    const files = await fs.readdir(folderPath);
    
    const videoFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return videoExtensions.includes(ext);
    });

    if (videoFiles.length === 0) {
      this.log('No video files found in folder', 'warning');
      return { processed: 0, failed: 0, results: [] };
    }

    this.log(`Found ${videoFiles.length} video files`, 'info');
    
    const results = [];
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < videoFiles.length; i++) {
      const videoFile = videoFiles[i];
      const videoPath = path.join(folderPath, videoFile);
      
      try {
        this.log(`[${i + 1}/${videoFiles.length}] Processing: ${videoFile}`, 'info');
        
        const transcriptPath = await this.processVideo(videoPath, folderPath, model);
        results.push({ file: videoFile, transcriptPath, success: true });
        processed++;
        
        this.log(`✓ Completed: ${videoFile}`, 'success');
        
      } catch (error) {
        this.log(`✗ Failed to process ${videoFile}: ${error.message}`, 'error');
        results.push({ file: videoFile, error: error.message, success: false });
        failed++;
      }
    }

    this.log(`Processing complete! Processed: ${processed}, Failed: ${failed}`, 'info');
    
    return { processed, failed, results };
  }
}

module.exports = { TranscriptionEngine };