import { useEffect, useState } from 'react';
import { testGoogleKey } from '../utils/places.js';
import { testOpenAIKey } from '../utils/openai.js';

export default function SettingsModal({ onClose }) {
  const [googleKey, setGoogleKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [googleStatus, setGoogleStatus] = useState('');
  const [openaiStatus, setOpenaiStatus] = useState('');
  const [testingGoogle, setTestingGoogle] = useState(false);
  const [testingOpenai, setTestingOpenai] = useState(false);

  useEffect(() => {
    setGoogleKey(localStorage.getItem('wsio_google_key') || '');
    setOpenaiKey(localStorage.getItem('wsio_openai_key') || '');
  }, []);

  const save = () => {
    localStorage.setItem('wsio_google_key', googleKey.trim());
    localStorage.setItem('wsio_openai_key', openaiKey.trim());
    onClose();
  };

  const testGoogle = async () => {
    if (!googleKey.trim()) return;
    setTestingGoogle(true);
    setGoogleStatus('');
    const ok = await testGoogleKey(googleKey.trim());
    setGoogleStatus(ok ? 'Connected' : 'Invalid key or Places API is not enabled');
    setTestingGoogle(false);
  };

  const testOpenai = async () => {
    if (!openaiKey.trim()) return;
    setTestingOpenai(true);
    setOpenaiStatus('');
    const ok = await testOpenAIKey(openaiKey.trim());
    setOpenaiStatus(ok ? 'Connected' : 'Invalid key');
    setTestingOpenai(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">Settings</h2>
          <button onClick={onClose} className="text-xl leading-none text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Google Places API Key</label>
            <p className="mb-2 text-xs text-gray-400">
              Required for real restaurant discovery. This maps to <code>VITE_GOOGLE_PLACES_API_KEY</code>.
            </p>
            <input
              type="password"
              value={googleKey}
              onChange={(event) => {
                setGoogleKey(event.target.value);
                setGoogleStatus('');
              }}
              placeholder="AIza..."
              className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={testGoogle}
                disabled={testingGoogle || !googleKey.trim()}
                className="rounded-lg border border-orange-200 px-3 py-1.5 text-xs text-orange-500 transition-colors hover:bg-orange-50 disabled:opacity-40"
              >
                {testingGoogle ? 'Testing...' : 'Test connection'}
              </button>
              {googleStatus ? <span className="text-xs text-gray-600">{googleStatus}</span> : null}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">OpenAI API Key</label>
            <p className="mb-2 text-xs text-gray-400">
              Used for macro estimation and restaurant web fallback. This maps to <code>VITE_OPENAI_API_KEY</code>.
            </p>
            <input
              type="password"
              value={openaiKey}
              onChange={(event) => {
                setOpenaiKey(event.target.value);
                setOpenaiStatus('');
              }}
              placeholder="sk-..."
              className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={testOpenai}
                disabled={testingOpenai || !openaiKey.trim()}
                className="rounded-lg border border-orange-200 px-3 py-1.5 text-xs text-orange-500 transition-colors hover:bg-orange-50 disabled:opacity-40"
              >
                {testingOpenai ? 'Testing...' : 'Test connection'}
              </button>
              {openaiStatus ? <span className="text-xs text-gray-600">{openaiStatus}</span> : null}
            </div>
          </div>

          <div className="rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-600">
            <strong>Demo Mode</strong> - Without a Google Places key, the app uses simulated Bangalore restaurants to keep the full UI testable.
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={save} className="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600">
            Save keys
          </button>
        </div>
      </div>
    </div>
  );
}
