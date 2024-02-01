import { useState, useRef } from 'react';

import './App.css';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef(null);
  const speechToTextRef = useRef(null);
  const socketRef = useRef(null);

  const stopRecording = () => {
    recorderRef?.current?.stop();
  };

  const deepGramwebsocketCode = ({ mediaRecorder }) => {
    try {
      const model = 'nova-2';
      const replaceTerms = [];
      const keywords = [];

      const replaceTermsString = replaceTerms.map((term) => encodeURIComponent(term)).join(',');
      const keywordsString = keywords.map((term) => encodeURIComponent(term)).join(',');
      const url = `ws://localhost:3020?model=${encodeURIComponent(model)}&interimResults=true&replace=${encodeURIComponent(replaceTermsString)}&keywords=${encodeURIComponent(keywordsString)}`;

      const socket = new WebSocket(url);
      console.log('url', url); // TODO: Remove this
      socket.onopen = () => {
        mediaRecorder.addEventListener('dataavailable', async (event) => {
          if (event.data.size > 0 && socket.readyState === 1) {
            socket.send(event.data);
          }
        });
      };

      socket.onmessage = (msg) => {
        const received = JSON.parse(msg.data) || {};
        if (received?.type === 'error' || (received?.type === 'Metadata' && received?.transaction_key === 'deprecated')) {
          setTimeout(() => {
            if (socketRef.current?.readyState === 1) {
              // this.speechToTextError.current = received;
              // this.speechToTextErrorMessage.current = received?.message;
              mediaRecorder.stop();
            }
          }, 1000);
        } else if (received?.channel?.alternatives[0]) {
          const { transcript } = received?.channel?.alternatives[0];
          if (transcript) {
            if (received.is_final) {
              console.log('final', transcript);
              if (speechToTextRef.current) {
                const text = `${speechToTextRef.current} ${transcript}`;
                speechToTextRef.current = text.replace(/[.,\-;?!']/g, '');
              } else {
                speechToTextRef.current = transcript.replace(/[.,\-;?!']/g, '');
              }
            }
          }
        }
      };

      socket.onclose = () => {
        mediaRecorder.stop();
      };

      socket.onerror = (error) => {
        console.log('error', error);
        // this.speechToTextError.current = error;
        // this.speechToTextErrorMessage.current = error?.message;
        mediaRecorder.stop();
      };

      socketRef.current = socket;
    } catch (error) {
      console.log('error', error);
    }
  }

  const deepGramTranscription = () => {
    navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    }).then((stream) => {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      // mediaRecorder.ondataavailable = onRecordingData;
      // mediaRecorder.onstop = onRecordingStopped;
      mediaRecorder.start(1000);

      recorderRef.current = mediaRecorder;
      deepGramwebsocketCode({ mediaRecorder });
    }).catch((error) => {
      console.log('error', error);
    });
  };

  const onRecordingClick = () => {
    console.log('start');
    setIsRecording(!isRecording);

    if (!isRecording) {
      deepGramTranscription();
    } else {
      stopRecording();
    }
  };

  return (
    <div className="App">
      <p> DeepGram Transcription </p>
      <button onClick={onRecordingClick}>{!isRecording ? 'Start' : 'Stop'} recording</button>
      <div>
        {isRecording && <p>Recording in progress</p>}
      </div>
    </div>
  );
}

export default App;
