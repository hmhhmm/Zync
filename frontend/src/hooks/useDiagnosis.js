import { useState, useCallback, useEffect, useRef } from 'react';
import { runDiagnosis } from '../api/client';
import {
  DEMO_DIAGNOSIS_REASONING,
  DEMO_DIAGNOSIS_RESULT,
} from '../demo/demoData';
import { streamText, delay } from '../demo/demoStream';

const DEMO_MODE = true;

const DEMO_REQUEST = {
  ph_readings: [5.2, 4.8, 4.1, 3.8, 3.5, 3.2],
  temperature: [25.0, 25.5, 26.0, 27.0, 25.0, 25.0],
  yield_pct: [78.0, 76.0, 70.0, 62.0, 45.0, 38.0],
  operator_notes:
    'Yield dropped sharply from Day 2. Overnight rainfall recorded on Day 2 log. ' +
    'Operator noted foamy effluent and pH instability. Equipment settings unchanged.',
};

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/tiff', 'image/webp', 'image/gif'];

export default function useDiagnosis() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingReasoning, setStreamingReasoning] = useState('');
  const [streamingOutput, setStreamingOutput] = useState('');
  const [diagnosis, setDiagnosis] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);

  const isMountedRef = useRef(true);
  const abortRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const _runDemo = useCallback(async () => {
    if (!isMountedRef.current) return;
    setIsStreaming(true);
    setStreamingReasoning('');
    setStreamingOutput('');
    setDiagnosis(null);
    setError(null);
    setIsLive(false);

    await delay(2400);

    // Stream reasoning
    let reasoningBuf = '';
    await streamText(
      DEMO_DIAGNOSIS_REASONING,
      (chunk) => {
        if (!isMountedRef.current) return;
        reasoningBuf += chunk;
        setStreamingReasoning(reasoningBuf);
      },
      { chunkSize: 5, delayMs: 18 },
    );

    await delay(600);

    // Stream output JSON
    const outputStr = JSON.stringify(DEMO_DIAGNOSIS_RESULT, null, 2);
    let outputBuf = '';
    await streamText(
      outputStr,
      (chunk) => {
        if (!isMountedRef.current) return;
        outputBuf += chunk;
        setStreamingOutput(outputBuf);
      },
      { chunkSize: 8, delayMs: 12 },
    );

    await delay(300);

    if (isMountedRef.current) {
      setDiagnosis(DEMO_DIAGNOSIS_RESULT);
      setIsLive(true);
      setIsStreaming(false);
    }
  }, []);

  const _callDiagnose = useCallback(async (request) => {
    if (DEMO_MODE) { await _runDemo(); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsStreaming(true);
    setStreamingReasoning('');
    setStreamingOutput('');
    setDiagnosis(null);
    setError(null);
    setIsLive(false);

    let reasoningBuf = '';
    let outputBuf = '';

    try {
      await runDiagnosis(request, {
        signal: controller.signal,
        onEvent: (evt) => {
          if (evt.type === 'reasoning' && evt.text) {
            reasoningBuf += evt.text;
            if (isMountedRef.current) setStreamingReasoning(reasoningBuf);
          }
          if (evt.type === 'output' && evt.text) {
            outputBuf += evt.text;
            if (isMountedRef.current) setStreamingOutput(outputBuf);
          }
          if (evt.status === 'done' && evt.diagnosis) {
            if (isMountedRef.current) {
              setDiagnosis(evt.diagnosis);
              setIsLive(true);
            }
          }
        },
      });
    } catch (err) {
      if (err.name !== 'AbortError' && isMountedRef.current) {
        setError(err.message || 'Diagnosis agent unreachable. Ensure the backend is running.');
      }
    } finally {
      if (isMountedRef.current) setIsStreaming(false);
    }
  }, [_runDemo]);

  const startDiagnosis = useCallback(
    async (file) => {
      setUploadedFile(file);
      setError(null);

      let request = { ...DEMO_REQUEST };

      if (!DEMO_MODE && file && IMAGE_TYPES.includes(file.type)) {
        try {
          const b64 = await readFileAsBase64(file);
          request = {
            ph_readings: [],
            temperature: [],
            yield_pct: [],
            operator_notes: `Uploaded log image: ${file.name}`,
            log_image_b64: b64,
          };
        } catch {
          setError('Could not read image file.');
          return;
        }
      } else if (!DEMO_MODE && file) {
        request = {
          ...DEMO_REQUEST,
          operator_notes: `${DEMO_REQUEST.operator_notes} (File: ${file.name})`,
        };
      }

      await _callDiagnose(request);
    },
    [_callDiagnose],
  );

  const runDemo = useCallback(async () => {
    setUploadedFile({
      name: 'perak_field_log_day2.jpg',
      type: 'image/jpeg',
      size: 184320,
    });
    await _callDiagnose(DEMO_REQUEST);
  }, [_callDiagnose]);

  return {
    isStreaming,
    streamingReasoning,
    streamingOutput,
    diagnosis,
    uploadedFile,
    error,
    isLive,
    startDiagnosis,
    runDemo,
  };
}
