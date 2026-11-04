'use client';

import { useState, useEffect } from 'react';
import {
  Bot,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  getGeminiApiKey,
  setGeminiApiKey,
  removeGeminiApiKey,
  testGeminiApiKey,
  GEMINI_MODEL,
} from '@/lib/gemini';
import { toast } from '@/components/ui/use-toast';

export function GeminiSettingsCard() {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const existing = getGeminiApiKey();
    setSavedKey(existing);
    if (existing) {
      setApiKey(existing);
    }
  }, []);

  async function handleSaveAndTest() {
    if (!apiKey.trim()) {
      removeGeminiApiKey();
      setSavedKey(null);
      setApiKey('');
      setStatusMessage(null);
      toast({ title: 'Gemini API key cleared' });
      return;
    }

    setTesting(true);
    setStatusMessage(null);
    const test = await testGeminiApiKey(apiKey.trim());
    setTesting(false);

    if (test.ok) {
      setGeminiApiKey(apiKey.trim());
      setSavedKey(apiKey.trim());
      setStatusMessage(`Connected successfully to ${test.model || GEMINI_MODEL}`);
      toast({
        title: 'Gemini API Connected',
        description: `Verified connection to ${test.model || GEMINI_MODEL}. Dynamic GenAI is active across screenings!`,
      });
    } else {
      setStatusMessage(`Validation failed: ${test.error}`);
      toast({
        variant: 'destructive',
        title: 'Gemini Connection Failed',
        description: test.error || 'Please double-check your API key from Google AI Studio.',
      });
    }
  }

  function handleClear() {
    removeGeminiApiKey();
    setSavedKey(null);
    setApiKey('');
    setStatusMessage(null);
    toast({ title: 'Gemini API key cleared' });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Google Gemini AI Engine
            </CardTitle>
            <CardDescription>
              Configure your Google Gemini API key to enable dynamic endocrinologist synthesis, multimodal lab extraction, and conversational medical insights.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              savedKey
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium'
                : 'border-border text-muted-foreground'
            }
          >
            {savedKey ? '● Connected' : 'Optional'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-medium text-foreground">Gemini API Key</label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline flex items-center gap-1 font-medium"
            >
              Get Free Key from Google AI Studio <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="relative flex items-center">
            <Input
              type={showKey ? 'text' : 'password'}
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="pr-20 font-mono text-xs"
            />
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="p-1 text-muted-foreground hover:text-foreground"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Keys are saved in your local browser sandbox and sent directly to Google Gemini APIs over encrypted TLS.
          </p>
        </div>

        {statusMessage && (
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {statusMessage}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleSaveAndTest}
            disabled={testing}
            className="text-xs gap-1.5"
          >
            {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {testing ? 'Testing Key...' : 'Save & Verify Key'}
          </Button>

          {savedKey && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="text-xs text-destructive hover:bg-destructive/10 border-destructive/20"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remove Key
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
